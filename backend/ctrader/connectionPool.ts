import { connect, CTraderConnection, CTrader } from 'ctrader-ts';

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
const PING_INTERVAL_MS = 20 * 1000;    // 20 seconds heartbeat to keep TCP socket alive
const CONNECT_TIMEOUT_MS = 8000;       // 8 seconds connection timeout guard

/**
 * Connects to cTrader Open API with an explicit timeout guard
 */
export async function connectWithTimeout(config: any, timeoutMs: number = CONNECT_TIMEOUT_MS): Promise<CTrader> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`cTrader connection timeout (${timeoutMs / 1000}s) to ${config.environment || 'demo'} server. Check API credentials or network state.`));
        }, timeoutMs);
    });

    try {
        const client = await Promise.race([
            connect(config),
            timeoutPromise
        ]);
        clearTimeout(timeoutId!);
        return client;
    } catch (err) {
        clearTimeout(timeoutId!);
        throw err;
    }
}

/**
 * Connects a raw CTraderConnection instance with an explicit timeout guard
 */
export async function connectConnectionWithTimeout(connection: CTraderConnection, timeoutMs: number = 6000): Promise<void> {
    let timeoutId: NodeJS.Timeout;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`cTrader raw connection timeout (${timeoutMs / 1000}s)`));
        }, timeoutMs);
    });

    try {
        await Promise.race([
            connection.connect(),
            timeoutPromise
        ]);
        clearTimeout(timeoutId!);
    } catch (err) {
        clearTimeout(timeoutId!);
        try { connection.disconnect(); } catch (_) {}
        throw err;
    }
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
        
        const client = await connectWithTimeout({
            clientId: params.clientId,
            clientSecret: params.clientSecret,
            accessToken: params.accessToken,
            accountId: params.accountId,
            environment: params.environment
        }, CONNECT_TIMEOUT_MS);

        // Start Keep-Alive Ping Timer to prevent idle socket drop
        const pingTimer = setInterval(async () => {
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

            // Ping heartbeat
            try {
                if (isClientHealthy(client)) {
                    // Send a lightweight symbols or account ping
                    await client.account.getAccountsByToken(params.accessToken);
                } else {
                    console.warn(`[cTrader Pool] Socket dead detected during ping for ${key}. Cleaning up.`);
                    cleanupPoolEntry(key);
                }
            } catch (pingErr) {
                console.warn(`[cTrader Pool] Ping failed for ${key}, removing stale connection:`, pingErr);
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
                entry.client.disconnect();
            } catch (_) {}
        }
        pool.delete(key);
    }
}
