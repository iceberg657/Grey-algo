import * as dotenv from 'dotenv';
dotenv.config({ path: './.env.example' });

async function run() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY_1 || process.env.API_KEY || process.env.VITE_API_KEY_1;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{text: "Hello"}] }] })
    });
    console.log(res.status);
    console.log(await res.text());
}
run();
