const fs = require('fs');
let content = fs.readFileSync('components/AdminPanel.tsx', 'utf8');

const replacement = `{users.map(user => (
    <tr key={user.uid} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
        <td className="p-6">
            <div className="flex flex-col">
                <span className="text-sm font-bold">{user.email}</span>
                <span className="text-[10px] opacity-40 font-mono">{user.uid}</span>
            </div>
        </td>
        <td className="p-6">
            <span className="font-mono text-sm">{user.analysisCount || 0}</span>
        </td>
        <td className="p-6">
            <select 
                value={user.access?.autoTrade || 'locked'}
                onChange={(e) => handleUpdateUserAccess(user.uid, 'autoTrade', e.target.value as any)}
                className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
            >
                <option value="locked">LOCKED</option>
                <option value="pending">PENDING</option>
                <option value="granted">GRANTED</option>
            </select>
        </td>
        <td className="p-6">
            <select 
                value={user.access?.products || 'locked'}
                onChange={(e) => handleUpdateUserAccess(user.uid, 'products', e.target.value as any)}
                className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
            >
                <option value="locked">LOCKED</option>
                <option value="pending">PENDING</option>
                <option value="granted">GRANTED</option>
            </select>
        </td>
        <td className="p-6">
            <select 
                value={user.access?.sniperLiveTrade || 'locked'}
                onChange={(e) => handleUpdateUserAccess(user.uid, 'sniperLiveTrade', e.target.value as any)}
                className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
            >
                <option value="locked">LOCKED</option>
                <option value="pending">PENDING</option>
                <option value="granted">GRANTED</option>
            </select>
        </td>
        <td className="p-6">
            <select 
                value={user.access?.advancedStreaming || 'locked'}
                onChange={(e) => handleUpdateUserAccess(user.uid, 'advancedStreaming', e.target.value as any)}
                className="bg-slate-100 dark:bg-white/5 border-none rounded-lg text-[10px] font-bold p-2 focus:ring-2 focus:ring-green-500/50"
            >
                <option value="locked">LOCKED</option>
                <option value="pending">PENDING</option>
                <option value="granted">GRANTED</option>
            </select>
        </td>
        <td className="p-6">
            <span className={\`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest \${
                user.isRevoked 
                    ? 'bg-red-500/10 text-red-500' 
                    : 'bg-green-500/10 text-green-500'
            }\`}>
                {user.isRevoked ? 'REVOKED' : 'ACTIVE'}
            </span>
        </td>
        <td className="p-6">
            <button 
                onClick={() => handleRevokeUser(user.uid, !user.isRevoked)}
                className={\`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all \${
                    user.isRevoked 
                        ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20' 
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500/20'
                }\`}
            >
                {user.isRevoked ? 'RESTORE' : 'REVOKE'}
            </button>
        </td>
    </tr>
))}`;

content = content.replace(/\{users\.map\(user => \([\s\S]*?\)\)\}/m, replacement);
fs.writeFileSync('components/AdminPanel.tsx', content);
