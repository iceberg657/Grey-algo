import fs from 'fs';
let content = fs.readFileSync('components/SignalDisplay.tsx', 'utf8');
content = content.replace(/bg-white\/30/g, 'bg-white/60')
                 .replace(/border-white\/40/g, 'border-gray-200')
                 .replace(/bg-white\/20/g, 'bg-white/60')
                 .replace(/border-white\/30/g, 'border-gray-200');
fs.writeFileSync('components/SignalDisplay.tsx', content);
console.log('Done');
