const fs = require('fs');
let content = fs.readFileSync('components/TradeNotificationPage.tsx', 'utf8');

const search = `    const [deletingId, setDeletingId] = useState<string | null>(null);`;
const replacement = `    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [userSettings, setUserSettings] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            setUserSettings(JSON.parse(stored));
        }
    }, []);`;

content = content.replace(search, replacement);

const targetPanel = `{/* Content Area */}`;
const panelReplacement = `{/* Advanced Streaming Panel */}
                {userSettings?.streamingMode === 'Advanced' && config.assets && config.assets.length > 0 && (
                  <div className="mb-4">
                     <CTraderAdvancedData symbol={config.assets[0].replace('/', '').replace('-', '')} />
                  </div>
                )}

                {/* Content Area */}`;

content = content.replace(targetPanel, panelReplacement);
fs.writeFileSync('components/TradeNotificationPage.tsx', content);
