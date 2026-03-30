import MetaApi from 'metaapi.cloud-sdk';

class LiveTradingEngine {
  private api: any = null;
  private connection: any = null;
  private isRunning = false;
  private accountInfo: any = null;

  async start(token: string, accountId: string) {
    if (this.isRunning) {
      return { success: true, message: 'Engine is already running.' };
    }

    try {
      console.log('Initializing MetaAPI connection...');
      this.api = new MetaApi(token);
      
      const account = await this.api.metatraderAccountApi.getAccount(accountId);
      
      console.log('Deploying account (if not already deployed)...');
      await account.deploy();
      
      console.log('Waiting for API server to connect to broker...');
      await account.waitConnected();
      
      console.log('Connecting to RPC...');
      this.connection = account.getRPCConnection();
      await this.connection.connect();
      
      console.log('Waiting for synchronization...');
      await this.connection.waitSynchronized();
      
      console.log('Successfully connected and synchronized!');
      this.isRunning = true;
      
      // Fetch initial account info
      this.accountInfo = await this.connection.getAccountInformation();
      
      return { success: true, message: 'Connected to FTMO Demo successfully.', accountInfo: this.accountInfo };
    } catch (err: any) {
      console.error('MetaAPI Connection Error:', err);
      this.isRunning = false;
      return { success: false, error: err.message || 'Failed to connect to MetaAPI.' };
    }
  }

  async getStatus() {
    if (!this.isRunning || !this.connection) {
      return { isRunning: false };
    }
    
    try {
      // Refresh account info
      this.accountInfo = await this.connection.getAccountInformation();
      return { 
        isRunning: true, 
        accountInfo: this.accountInfo 
      };
    } catch (err) {
      console.error('Error fetching status:', err);
      return { isRunning: false, error: 'Connection lost' };
    }
  }

  async stop() {
    this.isRunning = false;
    if (this.connection) {
      try {
        await this.connection.close();
      } catch (e) {
        console.error('Error closing connection:', e);
      }
      this.connection = null;
    }
    return { success: true, message: 'Engine stopped.' };
  }
}

export const tradingEngine = new LiveTradingEngine();
