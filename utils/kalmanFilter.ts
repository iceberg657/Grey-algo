export class KalmanFilter {
    private f: number; // State transition
    private q: number; // Process noise
    private h: number; // Observation geometry
    private r: number; // Measurement noise
    private x: number; // Estimate
    private p: number; // Estimate error

    constructor(r: number = 0.01, q: number = 0.001, f: number = 1, h: number = 1) {
        this.r = r;
        this.q = q;
        this.f = f;
        this.h = h;
        this.x = 0; // State estimate initialized later
        this.p = 1; // Error covariance initialized
    }

    public filter(measurement: number, isFirst: boolean = false): number {
        if (isFirst) {
            this.x = measurement;
        }

        // PREDICT
        const x_prior = this.f * this.x;
        const p_prior = this.f * this.p * this.f + this.q;

        // UPDATE
        const y = measurement - this.h * x_prior;
        const s = this.h * p_prior * this.h + this.r;
        const k = p_prior * this.h / s; // Kalman gain

        this.x = x_prior + k * y;
        this.p = (1 - k * this.h) * p_prior;

        return this.x;
    }

    public getEstimate(): number {
        return this.x;
    }
}
