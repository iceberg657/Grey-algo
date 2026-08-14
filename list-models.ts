import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.example' });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY || process.env.VITE_API_KEY_1;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();
    console.log(data.models?.map(m => m.name).join('\n'));
}
run();
