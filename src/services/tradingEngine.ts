import MetaApi from 'metaapi.cloud-sdk';

// Mock connection for local testing without incurring MetaAPI cloud costs
class MockMetaApiConnection {
  private balance = 10000;
  private equity = 10000;
  private positions: any[] = [];

  async getAccountInformation() {
    return { balance: this.balance, equity: this.equity };
  }

  async getPositions() {
    return this.positions;
  }

  async closePosition(id: string) {
    this.positions = this.positions.filter(p => p.id !== id);
    console.log(`[MOCK] Closed position ${id}`);
  }

  // Helper to simulate a bad trade for testing the killswitch
  simulateDrawdown(percentage: number) {
    const lossAmount = this.balance * (percentage / 100);
    this.equity = this.balance - lossAmount;
    console.log(`[MOCK] Simulated drawdown of ${percentage}%. New equity: $${this.equity}`);
  }
}

export class PropFirmProtector {
  private api: MetaApi | null = null;
  private accountId: string;
  private connection: any = null;
  private useMock: boolean;

  // Strict Prop Firm Rules
  private readonly MAX_DAILY_DRAWDOWN_PCT = 3.5; // 3.5% Killswitch (Protects the 5% hard rule)
  private readonly RISK_PER_TRADE_PCT = 0.5; // 0.5% risk per trade

  constructor(token: string, accountId: string, useMock: boolean = false) {
    this.useMock = useMock;
    if (!useMock) {
      this.api = new MetaApi(token);
    }
    this.accountId = accountId;
  }

  /**
   * Connects to the MT5 account via MetaAPI (or uses Mock for testing)
   */
  async connect() {
    if (this.useMock) {
      console.log('⚠️ Using MOCK MetaAPI Connection for testing.');
      this.connection = new MockMetaApiConnection();
      return true;
    }

    try {
      if (!this.api) throw new Error('API not initialized');
      const account = await this.api.metatraderAccountApi.getAccount(this.accountId);
      
      // Wait until account is deployed and connected
      await account.waitConnected();
      
      this.connection = account.getRPCConnection();
      await this.connection.connect();
      
      console.log('✅ Connected to MT5 Prop Firm Account successfully.');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to MT5:', error);
      return false;
    }
  }

  /**
   * The Killswitch: Checks if daily drawdown is breached.
   * If breached, it closes all open positions immediately.
   */
  async checkDailyDrawdown() {
    if (!this.connection) throw new Error('Not connected to MT5');

    try {
      const accountInfo = await this.connection.getAccountInformation();
      const equity = accountInfo.equity;
      const balance = accountInfo.balance;

      // Calculate current daily drawdown percentage
      const drawdownPct = ((balance - equity) / balance) * 100;

      console.log(`📊 Current Equity: $${equity.toFixed(2)} | Drawdown: ${drawdownPct.toFixed(2)}%`);

      if (drawdownPct >= this.MAX_DAILY_DRAWDOWN_PCT) {
        console.warn('🚨 KILLSWITCH ACTIVATED: Daily Drawdown Limit Reached. Closing all trades.');
        await this.closeAllPositions();
        return true; // Killswitch activated
      }

      return false; // Safe to trade
    } catch (error) {
      console.error('Error checking drawdown:', error);
      return false;
    }
  }

  /**
   * Emergency function to close all open positions
   */
  private async closeAllPositions() {
    if (!this.connection) return;
    try {
      const positions = await this.connection.getPositions();
      if (!Array.isArray(positions)) {
        console.log('No active positions found or invalid response.');
        return;
      }
      for (const position of positions) {
        console.log(`Closing position ${position.id}...`);
        await this.connection.closePosition(position.id);
      }
      console.log('✅ All positions closed successfully.');
    } catch (error) {
      console.error('❌ Failed to close positions:', error);
    }
  }

  /**
   * Calculates the exact lot size based on 0.5% risk and the stop loss distance.
   */
  async calculateLotSize(_symbol: string, stopLossPips: number) {
    if (!this.connection) throw new Error('Not connected to MT5');

    const accountInfo = await this.connection.getAccountInformation();
    const riskAmount = accountInfo.balance * (this.RISK_PER_TRADE_PCT / 100);

    // Note: A full implementation requires tick value calculation per symbol.
    // This is a simplified placeholder for the execution logic.
    const pipValue = 10; // Assuming standard lot pip value for major pairs
    let lotSize = riskAmount / (stopLossPips * pipValue);

    // Round to 2 decimal places (standard MT5 lot step)
    lotSize = Math.round(lotSize * 100) / 100;
    
    // Ensure minimum lot size
    return Math.max(lotSize, 0.01);
  }
}
