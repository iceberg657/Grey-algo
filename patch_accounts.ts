import fs from 'fs';
let content = fs.readFileSync('backend/ctrader/accounts.ts', 'utf8');
content = content.replace(/catch \(e: any\) \{/g, 'catch (e: any) {\n        console.error("ACCOUNTS ENDPOINT ERROR:", e);');
fs.writeFileSync('backend/ctrader/accounts.ts', content);
