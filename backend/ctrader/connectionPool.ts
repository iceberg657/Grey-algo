import { CTrader, CTraderConnection } from 'ctrader-ts';

interface PoolEntry {
    client: CTrader;
    key: string;
    lastActive: number;
    environment: 'live' | 'demo';
    pingTimer?: NodeJS.Timeout;
    connectingPromise?: Promise<CTrader>;
    activeStreamsCount: number;
}

const pool = new Map<string, PoolEntry>();
const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes idle cleanup
const PING_INTERVAL_MS = 5000;    // 5 seconds heartbeat (ProtoHeartbeatEvent)
const TLS_TIMEOUT_MS = 8000;      // 8 seconds for TLS handshake
const AUTH_TIMEOUT_MS = 15000;    // 15 seconds for App & Account Auth

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMsg: string): Promise<T> {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`${errorMsg} (${timeoutMs}ms)`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId));
}

/**
 * Connects a raw CTraderConnection instance with an explicit TLS timeout guard
 */
export async function connectConnectionWithTimeout(connection: CTraderConnection, timeoutMs: number = TLS_TIMEOUT_MS): Promise<void> {
    try {
        await withTimeout(connection.connect(), timeoutMs, 'cTrader TLS/Socket connection timeout');
    } catch (err) {
        try { connection.disconnect(); } catch (_) {}
        throw err;
    }
}

/**
 * Connects to cTrader Open API with phased timeouts
 */
export async function connectWithPhasedTimeouts(config: any): Promise<CTrader> {
    const host = config.environment === 'live' ? 'live.ctraderapi.com' : 'demo.ctraderapi.com';
    
    let currentAccessToken = config.accessToken;
    const client = new CTrader({
        host,
        port: 5035,
        accountId: config.accountId,
        onReconnect: async () => {
            await client.raw.auth.authenticateApp(config.clientId, config.clientSecret);
            try {
                await client.raw.auth.authenticateAccount(config.accountId, currentAccessToken);
            } catch (err) {
                throw err;
            }
            await client.raw.market.restoreSubscriptions();
        },
    });

    // Phase 1: Socket / TLS Handshake
    await withTimeout(
        client.connection.connect(), 
        TLS_TIMEOUT_MS, 
        `cTrader TLS/Socket connection timeout to ${host}`
    );

    // Phase 2: App & Account Auth
    try {
        await withTimeout(
            client.raw.auth.authenticateApp(config.clientId, config.clientSecret), 
            AUTH_TIMEOUT_MS, 
            'cTrader App Auth timeout'
        );
        await withTimeout(
            client.raw.auth.authenticateAccount(config.accountId, currentAccessToken), 
            AUTH_TIMEOUT_MS, 
            'cTrader Account Auth timeout'
        );
    } catch (err) {
        client.connection.disconnect();
        throw err;
    }

    return client;
}

/**
 * Retrieves an active pooled cTrader client or creates a new resilient connection
 */
export async function getPooledClient(params: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    accountId: number;
    environment: 'live' | 'demo';
}): Promise<{ client: CTrader; release: () => void; poolKey: string }> {
    const key = `${params.clientId}:${params.accountId}:${params.environment}`;
    let entry = pool.get(key);

    // Helper to check socket health
    const isClientHealthy = (c: CTrader): boolean => {
        try {
            const conn = c.connection as any;
            if (!conn) return false;
            if (conn.socket && conn.socket.destroyed) return false;
            return true;
        } catch (_) {
            return false;
        }
    };

    if (entry && entry.client && isClientHealthy(entry.client)) {
        entry.lastActive = Date.now();
        return {
            client: entry.client,
            release: () => {
                if (entry) entry.lastActive = Date.now();
            },
            poolKey: key
        };
    }

    // If connection is in progress, wait for it
    if (entry && entry.connectingPromise) {
        try {
            const client = await entry.connectingPromise;
            return {
                client,
                release: () => {
                    if (entry) entry.lastActive = Date.now();
                },
                poolKey: key
            };
        } catch (e) {
            pool.delete(key);
            // Fallthrough to attempt a fresh connection below
        }
    }

    // Clean up stale entry if present
    if (entry) {
        cleanupPoolEntry(key);
    }

    // Establish a new pooled connection
    const connectingPromise = (async (): Promise<CTrader> => {
        console.log(`[cTrader Pool] Establishing new persistent client for account ${params.accountId} (${params.environment})...`);
        
        const client = await connectWithPhasedTimeouts({
            clientId: params.clientId,
            clientSecret: params.clientSecret,
            accessToken: params.accessToken,
            accountId: params.accountId,
            environment: params.environment
        });

        // Start Keep-Alive Ping Timer (5s ProtoHeartbeatEvent)
        const pingTimer = setInterval(() => {
            const currentEntry = pool.get(key);
            if (!currentEntry) {
                clearInterval(pingTimer);
                return;
            }

            // Idle check
            if (Date.now() - currentEntry.lastActive > IDLE_TIMEOUT_MS && currentEntry.activeStreamsCount <= 0) {
                console.log(`[cTrader Pool] Client ${key} idle for >5 minutes. Cleaning up connection.`);
                cleanupPoolEntry(key);
                return;
            }

            // Ping heartbeat (ProtoHeartbeatEvent = PayloadType 51)
            try {
                if (isClientHealthy(client)) {
                    // Send application-layer heartbeat
                    client.connection.send(51);
                } else {
                    console.warn(`[cTrader Pool] Socket dead detected for ${key}. Cleaning up.`);
                    cleanupPoolEntry(key);
                }
            } catch (pingErr) {
                console.warn(`[cTrader Pool] Heartbeat failed for ${key}, removing stale connection:`, pingErr);
                cleanupPoolEntry(key);
            }
        }, PING_INTERVAL_MS);

        const newEntry: PoolEntry = {
            client,
            key,
            lastActive: Date.now(),
            environment: params.environment,
            pingTimer,
            activeStreamsCount: 0
        };

        pool.set(key, newEntry);
        console.log(`[cTrader Pool] Successfully pooled client for ${key}.`);
        return client;
    })();

    // Store temporary connecting state
    pool.set(key, {
        client: null as any,
        key,
        lastActive: Date.now(),
        environment: params.environment,
        connectingPromise,
        activeStreamsCount: 0
    });

    try {
        const client = await connectingPromise;
        const currentEntry = pool.get(key);
        if (currentEntry) {
            delete currentEntry.connectingPromise;
        }
        return {
            client,
            release: () => {
                const e = pool.get(key);
                if (e) e.lastActive = Date.now();
            },
            poolKey: key
        };
    } catch (err) {
        pool.delete(key);
        throw err;
    }
}

export function incrementStreamCount(key: string) {
    const entry = pool.get(key);
    if (entry) {
        entry.activeStreamsCount = (entry.activeStreamsCount || 0) + 1;
        entry.lastActive = Date.now();
    }
}

export function decrementStreamCount(key: string) {
    const entry = pool.get(key);
    if (entry) {
        entry.activeStreamsCount = Math.max(0, (entry.activeStreamsCount || 0) - 1);
        entry.lastActive = Date.now();
    }
}

function cleanupPoolEntry(key: string) {
    const entry = pool.get(key);
    if (entry) {
        if (entry.pingTimer) clearInterval(entry.pingTimer);
        if (entry.client) {
            try {
                entry.client.connection.disconnect();
            } catch (_) {}
        }
        pool.delete(key);
    }
}
