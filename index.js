// index.js - bot ka entry point
// Telegram pe messages sunta hai, brain (AI) ko bhejta hai, tasks chalata hai.

import http from 'http';
import { think } from './brain.js';
import { addMessage, getHistory } from './memory.js';
import { tasks, runTask } from './tasks/index.js';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ALLOWED_ID = String(process.env.ALLOWED_TELEGRAM_ID || '');

if (!TOKEN || TOKEN.includes('yahan')) {
  console.error('❌ TELEGRAM_BOT_TOKEN set nahi hai. .env file check karo (README dekho).');
  process.exit(1);
}
if (!ALLOWED_ID || ALLOWED_ID === '123456789') {
  console.error('❌ ALLOWED_TELEGRAM_ID set nahi hai. Telegram pe @userinfobot se apna ID lo aur .env mein daalo.');
  process.exit(1);
}

const API = `https://api.telegram.org/bot${TOKEN}`;
let offset = 0;

// Mode: default long-polling (laptop). Agar WEBHOOK_URL ya RENDER_EXTERNAL_URL set hai
// (jaise Render pe), toh webhook mode - Telegram khud updates POST karega.
const WEBHOOK_URL = (process.env.WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
const PORT = process.env.PORT || 3000;

// pendingConfirm: koi risky task confirm ka wait kar raha hai
let pendingConfirm = null;

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram error: ${JSON.stringify(data)}`);
  return data.result;
}

async function send(chatId, text) {
  // Telegram message limit 4096 chars hota hai
  for (let i = 0; i < text.length; i += 4000) {
    await tg('sendMessage', { chat_id: chatId, text: text.slice(i, i + 4000) });
  }
}

const HELP = `Yo! Main tera personal agent hu 🤖

Bas normal message kar - main AI se baat karunga.

Commands:
/help - yeh list
/tasks - saare tasks dikha
/task <naam> <input> - koi task chala (jaise: /task readsite https://example.com)
/cancel - pending confirm cancel

Naya task add karna hai? tasks/ folder mein file banao, README mein likha hai kaise.`;

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const userId = String(msg.from.id);
  const text = (msg.text || '').trim();
  if (!text) return;

  // 🔒 Sirf tu - baaki sab ko block
  if (userId !== ALLOWED_ID) {
    console.log(`Blocked message from unknown user ${userId}`);
    return;
  }

  try {
    // Confirmation ka jawab aa raha hai?
    if (pendingConfirm) {
      const yes = /^(haan|ha|yes|y|ok|kar|theek)$/i.test(text);
      const no = /^(nahi|no|n|cancel|rakh)$/i.test(text);
      if (yes) {
        const t = pendingConfirm;
        pendingConfirm = null;
        await send(chatId, '⏳ Theek hai, kar raha hu...');
        const result = await runTask(t.name, t.input);
        await send(chatId, result);
      } else if (no || text === '/cancel') {
        pendingConfirm = null;
        await send(chatId, '👍 Cancel kar diya.');
      } else {
        await send(chatId, 'Pehle iska jawab de: haan ya nahi? (ya /cancel)');
      }
      return;
    }

    if (text === '/start' || text === '/help') return send(chatId, HELP);
    if (text === '/cancel') return send(chatId, 'Kuch pending nahi hai.');

    if (text === '/tasks') {
      const list = Object.entries(tasks)
        .map(([name, t]) => `• ${name} - ${t.description}${t.needsConfirm ? ' (confirm maangega)' : ''}`)
        .join('\n');
      return send(chatId, `Tasks:\n${list}`);
    }

    if (text.startsWith('/task ')) {
      const parts = text.slice(6).trim().split(/\s+/);
      const name = parts[0];
      const input = parts.slice(1).join(' ');
      if (!tasks[name]) return send(chatId, `❌ "${name}" task nahi mila. /tasks se list dekh.`);
      if (!input) return send(chatId, `❌ Input bhi de. Example: /task ${name} ${tasks[name].example}`);
      if (tasks[name].needsConfirm) {
        pendingConfirm = { name, input };
        return send(chatId, `⚠️ Task "${name}" yeh karega: ${tasks[name].description}\nInput: ${input}\n\nChala du? (haan/nahi)`);
      }
      await send(chatId, '⏳ Chala raha hu...');
      const result = await runTask(name, input);
      return send(chatId, result);
    }

    // Natural language shortcut: "youtube pe lofi dhundh" -> yt task
    // (simple keyword routing; aage chal ke AI ko khud task choose karne dena - function calling)
    if (/youtube/i.test(text)) {
      const q = text
        .replace(/youtube|pe|par|dhundh(o|na|ke)?|search|karo|kar|dikha(o|na)?|bata(o|na)?|de|do|mujhe|meri?|liye|pls|please/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (q) {
        await send(chatId, '⏳ YouTube pe dhundh raha hu...');
        const result = await runTask('yt', q);
        return send(chatId, result);
      }
    }

    // Normal baat-cheet: AI brain
    addMessage('user', text);
    const reply = await think(getHistory());
    addMessage('assistant', reply);
    await send(chatId, reply);
  } catch (err) {
    console.error(err);
    await send(chatId, `😅 Kuch gadbad ho gayi: ${err.message}`);
  }
}

async function poll() {
  try {
    const updates = await tg('getUpdates', { offset, timeout: 30 });
    for (const u of updates) {
      offset = u.update_id + 1;
      if (u.message) await handleMessage(u.message);
    }
  } catch (err) {
    console.error('Poll error:', err.message);
    await new Promise((r) => setTimeout(r, 3000));
  }
  poll();
}

async function startWebhook() {
  const hookPath = `/tg/${TOKEN}`;
  const server = http.createServer(async (req, res) => {
    if (req.method === 'GET') {
      res.writeHead(200).end('ok'); // health check / Render isko ping karta hai
      return;
    }
    if (req.method === 'POST' && req.url === hookPath) {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', async () => {
        res.writeHead(200).end(); // pehle 200 do, phir kaam (Telegram ko wait nahi karwana)
        try {
          const update = JSON.parse(body);
          if (update.message) await handleMessage(update.message);
        } catch (err) {
          console.error('Update error:', err.message);
        }
      });
      return;
    }
    res.writeHead(404).end();
  });
  server.listen(PORT, async () => {
    try {
      await tg('setWebhook', { url: `${WEBHOOK_URL}${hookPath}`, drop_pending_updates: false });
      console.log(`🤖 Agent webhook mode mein start: ${WEBHOOK_URL}${hookPath}`);
    } catch (err) {
      console.error('setWebhook fail (server phir bhi chal raha):', err.message);
    }
  });
}

if (WEBHOOK_URL) {
  startWebhook();
} else {
  console.log('🤖 Agent start ho gaya! Telegram pe message kar.');
  poll();
}
