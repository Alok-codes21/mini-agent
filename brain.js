// brain.js - AI ka dimaag
// Pehle Groq (free) try karta hai, fail ho toh Gemini fallback.

const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Tu ek personal AI assistant hai. Tera owner ek Indian college student hai jo Node.js seekh raha hai.
Simple, seedhi baat kar - Hinglish ya English, jaise user bolega waise. Chhote jawab de, bakwaas mat kar.
Kabhi kisi ka password ya API key maangne pe bolk: ".env file mein daal, chat mein nahi".

FORMAT RULE - Telegram LaTeX render nahi karta. Kabhi LaTeX mat likh (\\( \\), \\[ \\], $...$, \\frac, \\sqrt, \\omega, ^{ } waghera BILKUL nahi). Math plain text/Unicode mein likh: F = -kx, F = ke·q₁q₂/r², ω = √(g/l), x², v₀, Δt, θ, π, ×, ÷, ≤. Formula ko seedhi line mein likh.

LIVE DATA RULE - Prices, fares, rates, scores, news, weather ya koi bhi current/live info tu apne se kabhi MAT bana. Bot in sawaalon ke liye khud internet search chalata hai (user ko 'search' likhne ki zarurat nahi). Agar fir bhi tere paas aisa sawaal aa jaye jiska live data tujhe nahi pata, toh bol ki main abhi ise live check karta hu aur number mat bata; user ko 'search' command likhne ko mat bol. Cab/auto ka kiraya Rapido se live check hota hai ('cab from <jagah> to <jagah>'). General advice dena theek hai, par bina search kiye koi number quote karna mana hai.`;

async function thinkGroq(history) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b', // free tier pe chalta hai; 'llama-3.3-70b-versatile' bhi try kar sakta hai
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
      max_tokens: 800,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

async function thinkGemini(history) {
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates[0].content.parts[0].text.trim();
}

import { latexToUnicode } from './latex.js';

export async function think(history) {
  return latexToUnicode(await thinkRaw(history));
}

async function thinkRaw(history) {
  if (GROQ_KEY && !GROQ_KEY.includes('yahan')) {
    try {
      return await thinkGroq(history);
    } catch (err) {
      console.error('Groq fail:', err.message);
    }
  }
  if (GEMINI_KEY) {
    try {
      return await thinkGemini(history);
    } catch (err) {
      console.error('Gemini fail:', err.message);
    }
  }
  return '❌ Koi AI key kaam nahi kar rahi. .env mein GROQ_API_KEY check kar (https://console.groq.com/keys).';
}

// Kya is sawaal ke liye live internet search chahiye? Haan toh search query lautata hai, nahi toh null.
const LIVE_HINT = /\b(aaj|abhi|kal|today|tonight|now|current(ly)?|latest|recent|live|breaking|news|khabar|khabre|khabren|score|match|weather|mausam|temperature|price|prices|rate|rates|bhav|kimat|keemat|cost|kitne ka|kitna|stock|share price|nifty|sensex|bitcoin|crypto|gold|silver|petrol|diesel|exchange rate|result|results|schedule|release date|trending|who won|winner|kab hai|kab hoga|available|in stock|open now|timing|timings)\b/i;

async function classifyGroq(text) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content:
            'Tu ek router hai. User ka message padh aur decide kar ki jawab ke liye real-time/fresh internet data chahiye ya nahi (prices, rates, news, current events, scores, weather, product availability, kisi ke baare mein recent info, "aaj/abhi/latest" wale sawaal). Concepts, coding help, maths, general baat-cheet, advice, ya purani/stable facts ke liye internet NAHI chahiye. Sirf ek line de: agar chahiye toh "SEARCH: <chhoti web search query>", warna "NO".',
        },
        { role: 'user', content: text },
      ],
      max_tokens: 300,
    }),
  });
  if (!res.ok) throw new Error(`Groq router error ${res.status}`);
  const data = await res.json();
  return (data.choices[0].message.content || '').trim();
}

export async function liveSearchQuery(text) {
  if (GROQ_KEY && !GROQ_KEY.includes('yahan')) {
    try {
      const out = await classifyGroq(text);
      const m = out.match(/^SEARCH:\s*(.+)$/im);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '') || text;
      if (/^NO\b/i.test(out)) return null;
    } catch (err) {
      console.error('Router fail, keyword check:', err.message);
    }
  }
  return LIVE_HINT.test(text) ? text : null;
}
