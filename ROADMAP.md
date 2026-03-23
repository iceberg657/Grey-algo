# GreyAlpha Project Roadmap & Ideas

## 🚀 Prop Firm & Growth Command Center (Saved Idea)

**Target Audience:** Newbie traders and Prop Firm challenge participants.
**Core Objective:** Turn GreyAlpha into a "Neural Co-Pilot" for passing challenges and growing accounts with institutional discipline.

### 1. Newbie-Friendly Execution Dashboard
- **Simplified UI:** Big "BUY/SELL" buttons with high-confidence signals.
- **Automated Lot Sizing:** App calculates the exact lot size based on account balance and drawdown limits.
- **"Drawdown Guard":** Hard-lock on trading if daily drawdown limits are approached.

### 2. The Cloud Bridge (MetaApi Integration)
- **No EA Required:** Uses MetaApi.cloud to connect directly to MT4/MT5 via the cloud.
- **Real-Time Sync:** Live Balance, Equity, and Floating P/L visible in the GreyAlpha dashboard.
- **One-Click Execution:** Trades triggered in the web app are pushed to the broker in <100ms.

### 3. Prop-Grade Features
- **Sniper Filter:** Only show signals with >85% confidence and >1:3 RR.
- **Signal Frequency:** Quality-over-quantity approach (2-5 high-confluence signals per day per asset).
- **Challenge Progress:** Visual bars for Target Progress and Drawdown Buffer.
- **Psychological Circuit Breaker:** Prevents revenge trading by locking the app after a loss streak.

### 4. Reliability & Offline Strategy
- **Web Push Notifications:** Real-time alerts even when the app/browser is closed.
- **Server-Side SL/TP:** Once executed, trades are managed by the broker's server, ensuring safety even if the user is offline.
- **Optional Auto-Pilot:** Pre-approve 95%+ confidence signals for automatic execution during sleep/offline hours.

### 5. Implementation Notes
- **SDK:** `metaapi-cloud-sdk` (npm).
- **Auth:** Encrypted storage of MT4/MT5 credentials.
- **Backend:** Node.js proxy to handle MetaApi requests securely.

---
*Saved on: 2026-03-23*
