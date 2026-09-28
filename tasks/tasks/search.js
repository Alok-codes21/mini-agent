// tasks/search.js - web search task
// Live info ke liye internet pe search karta hai aur AI se chhota jawab banata hai.
// Backend: Tavily (free tier: 1000 searches/mahina, card nahi chahiye) - TAVILY_API_KEY .env mein.
// Agar Tavily key nahi hai (ya fail ho jaye) toh DuckDuckGo fallback chalta hai - key ki zarurat nahi.

const TAVILY_KEY = process.env.TAVILY_API_KEY;
const GROQ_KEY = process.env.GROQ_API_KEY;

async function tavilySearch(query) {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TAVILY_KEY}`,
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_depth: 'basic',
      include_answer: false,
    }),
  });
  if (!res.ok) throw new Error(`Tavily error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    title: r.title || '',
    url: r.url || '',
    snippet: (r.content || '').slice(0, 300),
  }));
}

// DuckDuckGo fallback - key nahi chahiye, par datacenter se kabhi kabhi block ho sakta hai
async function ddgSearch(query) {
  const res = await fetch('https://lite.duckduckgo.com/lite/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    },
    body: `q=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`DuckDuckGo error ${res.status}`);
  const html = await res.text();

  const results = [];
  const blocks = html.split('class="result-link"').slice(1);
  for (const b of blocks.slice(0, 5)) {
    const m = b.match(/href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!m) continue;
    let url = m[1];
    const title = m[2].replace(/<[^>]+>/g, '').trim();
    const sm = b.match(/class="result-snippet"[^>]*>([\s\S]*?)<\/td>/);
    const snippet = sm ? sm[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
    // DDG redirect link se asli url nikalo
    const um = url.match(/uddg=([^&]+)/);
    if (um) url = decodeURIComponent(um[1]);
    results.push({ title, url, snippet });
  }
  return results;
}

// Results ko Groq se chhota sa grounded jawab banao
async function summarize(query, results) {
  if (!GROQ_KEY || GROQ_KEY.includes('yahan')) return null;
  const context = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\n${r.url}`)
    .join('\n\n');
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content:
            'Tu ek search assistant hai. Diye gaye search results se user ke sawaal ka seedha, chhota jawab de (Hinglish ya English, jaise user bolega waise). Sirf results mein jo hai wahi bol - apne se kuch mat bana. Agar results mein jawab nahi hai toh saaf bol de. 3-4 line max.',
        },
        { role: 'user', content: `Sawaal: ${query}\n\nSearch results:\n${context}` },
      ],
      max_tokens: 400,
    }),
  });
  if (!res.ok) throw new Error(`Groq error ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content.trim();
}

export default {
  description: 'Internet pe live search karke jawab deta hai (news, prices, koi bhi sawaal)',
  example: 'India ka latest cricket score kya hai',
  needsConfirm: false,

  async run(query) {
    let results;
    if (TAVILY_KEY && !TAVILY_KEY.includes('yahan')) {
      try {
        results = await tavilySearch(query);
      } catch (err) {
        console.error('Tavily fail, DuckDuckGo try kar raha:', err.message);
        results = await ddgSearch(query);
      }
    } else {
      results = await ddgSearch(query);
    }

    if (!results.length) return `😕 "${query}" ke liye kuch nahi mila.`;

    let answer = null;
    try {
      answer = await summarize(query, results);
    } catch (err) {
      console.error('Summarize fail:', err.message);
    }

    const sources = results
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
      .join('\n');

    if (answer) return `🔎 "${query}"\n\n${answer}\n\n📚 Sources:\n${sources}`;

    // Groq na chale toh raw results hi bhej do
    return `🔎 "${query}"\n\n${results
      .slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   ${r.url}`)
      .join('\n\n')}`;
  },
};
