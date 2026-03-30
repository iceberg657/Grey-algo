import MetaApi from 'metaapi.cloud-sdk';

export class MetaApiService {
    private metaApi: MetaApi;
    private token: string;
    private connection: any;

    constructor(token: string) {
        this.token = token;
        this.metaApi = new MetaApi(this.token);
    }

    async connect(accountId: string) {
        this.connection = this.metaApi.metatraderAccountApi.getAccount(accountId);
        await this.connection.waitConnected();
        console.log(`Connected to account: ${accountId}`);
    }

    async getAccountEquity() {
        if (!this.connection) {
            throw new Error('Not connected to MetaAPI');
        }
        const accountInformation = await this.connection.getAccountInformation();
        return accountInformation.equity;
    }

    // Calculate lot size for 0.5% risk
    calculateLotSize(accountBalance: number, stopLossPips: number, pipValue: number): number {
        const riskAmount = accountBalance * 0.005; // 0.5% risk
        const lotSize = riskAmount / (stopLossPips * pipValue);
        return Math.round(lotSize * 100) / 100; // Round to 2 decimal places
    }

    async placeTrade(symbol: string, type: 'buy' | 'sell', lotSize: number, stopLoss: number, takeProfit: number) {
        const order = {
            symbol,
            type: type === 'buy' ? 'ORDER_TYPE_BUY' : 'ORDER_TYPE_SELL',
            units: lotSize * 100000, // Assuming standard lot = 100k units
            stopLoss,
            takeProfit,
            comment: 'GreyAlpha AI Trade'
        };
        return await this.connection.createMarketOrder(order);
    }

    async closeAllTrades() {
        const positions = await this.connection.getPositions();
        for (const position of positions) {
            await this.connection.closePosition(position.id);
        }
        console.log('All trades closed by killswitch.');
    }
}
