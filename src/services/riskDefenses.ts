export interface NewsEvent {
  id: string;
  currency: string; // e.g., 'USD', 'EUR'
  impact: 'Low' | 'Medium' | 'High';
  time: Date; // The exact time of the news release
  title: string;
}

export class NewsFilter {
  private upcomingNews: NewsEvent[] = [];
  private readonly RESTRICTED_MINUTES_BEFORE = 15;
  private readonly RESTRICTED_MINUTES_AFTER = 15;

  constructor() {
    // In a live environment, this would fetch from an API like ForexFactory or Investing.com
    // For now, we initialize with an empty array or mock data.
    this.upcomingNews = [];
  }

  /**
   * Updates the internal calendar with fresh news data.
   */
  updateCalendar(events: NewsEvent[]) {
    this.upcomingNews = events;
  }

  /**
   * Checks if a specific symbol is safe to trade right now based on the news calendar.
   * Example: If symbol is 'EURUSD', it checks for 'EUR' and 'USD' high-impact news.
   */
  isSafeToTrade(symbol: string): { safe: boolean; reason?: string } {
    const now = new Date();
    
    // Extract currencies from symbol (e.g., 'EURUSD' -> ['EUR', 'USD'])
    // Note: This is a simple extraction. Indices like 'US30' would map to 'USD'.
    const currencies = this.extractCurrencies(symbol);

    for (const event of this.upcomingNews) {
      if (event.impact !== 'High') continue; // We only care about Red Folder news
      if (!currencies.includes(event.currency)) continue; // Not relevant to our pair

      // Calculate the danger window
      const dangerStart = new Date(event.time.getTime() - this.RESTRICTED_MINUTES_BEFORE * 60000);
      const dangerEnd = new Date(event.time.getTime() + this.RESTRICTED_MINUTES_AFTER * 60000);

      if (now >= dangerStart && now <= dangerEnd) {
        return {
          safe: false,
          reason: `High impact news (${event.title}) for ${event.currency} at ${event.time.toISOString()}.`
        };
      }
    }

    return { safe: true };
  }

  private extractCurrencies(symbol: string): string[] {
    if (symbol.includes('US30') || symbol.includes('NAS100')) return ['USD'];
    if (symbol.length === 6) {
      return [symbol.substring(0, 3), symbol.substring(3, 6)]; // e.g., EUR, USD
    }
    return ['USD']; // Default fallback
  }
}

export class SpreadDefender {
  /**
   * Checks if the current spread is within our acceptable limits.
   * Prop firms often widen spreads to trigger stop losses. This protects us.
   * 
   * @param ask Current Ask price
   * @param bid Current Bid price
   * @param maxSpreadPips Maximum allowed spread in pips
   * @param pipMultiplier The multiplier to convert price difference to pips (e.g., 10000 for EURUSD, 100 for USDJPY)
   */
  static isSpreadSafe(ask: number, bid: number, maxSpreadPips: number, pipMultiplier: number): { safe: boolean; currentSpread: number } {
    const rawSpread = ask - bid;
    const spreadInPips = rawSpread * pipMultiplier;

    if (spreadInPips > maxSpreadPips) {
      console.warn(`🛡️ SPREAD DEFENDER: Spread is too high! Current: ${spreadInPips.toFixed(1)} pips | Max Allowed: ${maxSpreadPips} pips`);
      return { safe: false, currentSpread: spreadInPips };
    }

    return { safe: true, currentSpread: spreadInPips };
  }
}
