const fs = require('fs');
let content = fs.readFileSync('components/AnalysisPage.tsx', 'utf8');

const search = `    const [isUpdating, setIsUpdating] = useState(false);`;
const replacement = `    const [isUpdating, setIsUpdating] = useState(false);
    const [userSettings, setUserSettings] = useState<any>(null);

    React.useEffect(() => {
        const stored = localStorage.getItem('greyquant_user_settings');
        if (stored) {
            setUserSettings(JSON.parse(stored));
        }
    }, []);`;

content = content.replace(search, replacement);

const targetPanel = `{/* Analysis Content */}`;
const panelReplacement = `{/* Advanced Streaming Panel */}
                {userSettings?.streamingMode === 'Advanced' && data?.asset && (
                  <div className="mb-4">
                     <CTraderAdvancedData symbol={data.asset.replace('/', '').replace('-', '')} />
                  </div>
                )}

                {/* Analysis Content */}`;

content = content.replace(targetPanel, panelReplacement);
fs.writeFileSync('components/AnalysisPage.tsx', content);
