const fs = require('fs');
const content = fs.readFileSync('components/SniperLiveTrade.tsx', 'utf8');

const modified = content.replace(
    `const [dailyRegime, setDailyRegime] = useState<DailyRegime | null>(null);`,
    `const [dailyRegime, setDailyRegime] = useState<DailyRegime | null>(null);
  
  // Get last analyzed asset
  const lastAnalyzedAsset = React.useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].signal?.asset) {
            return messages[i].signal.asset.replace('/', '').replace('-', '');
        }
    }
    return null;
  }, [messages]);`
);
fs.writeFileSync('components/SniperLiveTrade.tsx', modified);
