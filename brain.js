// brain.js - AI ka dimaag
// Pehle Groq (free) try karta hai, fail ho toh Gemini fallback.

const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;

const SYSTEM_PROMPT = `Tu ek personal AI assistant hai. Tera owner ek Indian college student hai jo Node.js seekh raha hai.
Simple, seedhi baat kar - Hinglish ya English, jaise user bolega waise. Chhote jawab de, bakwaas mat kar.
Kabhi kisi ka password ya API key maangne pe bolk: ".env file mein daal, chat mein nahi".`;

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

export async function think(history) {
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
