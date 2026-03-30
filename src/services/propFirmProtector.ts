import { MetaApiService } from './metaApiService';

export class PropFirmProtector {
    private metaApiService: MetaApiService;
    private initialEquity: number | null = null;
    private drawdownLimit = 0.035; // 3.5%

    constructor(metaApiService: MetaApiService) {
        this.metaApiService = metaApiService;
    }

    async monitor() {
        const currentEquity = await this.metaApiService.getAccountEquity();
        
        if (this.initialEquity === null) {
            this.initialEquity = currentEquity;
        }

        const drawdown = (this.initialEquity! - currentEquity) / this.initialEquity!;

        if (drawdown >= this.drawdownLimit) {
            console.warn('Drawdown limit reached! Triggering killswitch.');
            await this.metaApiService.closeAllTrades();
            // In a real scenario, we would also lock the account here
            return true; // Killswitch triggered
        }

        return false;
    }
}
