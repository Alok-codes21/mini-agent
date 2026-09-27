# 🤖 Mini Agent - Apna Personal AI Assistant

Telegram pe baat karta hai, AI se jawab deta hai (Groq, free), aur browser mein kaam kar sakta hai (Playwright). Sab kuch tere laptop pe chalta hai - tera data tere paas.

## Kya kya karta hai

- 💬 Telegram pe normal baat-cheet (AI brain: Groq, backup: Gemini)
- 🌐 Browser tasks - jaise koi website khol ke padhna (`/task readsite <url>`)
- 🔐 Login wali sites - ek baar khud login kar, session save ho jata hai
- ✅ Risky kaam se pehle tujhse confirm maangta hai
- 🔒 Sirf TERA Telegram ID allowed hai - koi aur use nahi kar sakta
- 🧠 Last 20 baatein yaad rakhta hai (memory.json)

## Setup (10 minute)

### Step 1: Telegram bot banao
1. Telegram pe **@BotFather** kholo
2. `/newbot` bhejo, naam aur username do
3. Jo **token** mile, kahin save kar lo

### Step 2: Apna Telegram ID nikalo
1. Telegram pe **@userinfobot** kholo
2. Start karo - tera **user ID** (ek number) dega

### Step 3: Groq API key banao (free)
1. https://console.groq.com/keys pe jao (Google se sign in)
2. "Create API Key" - copy kar lo
3. (Optional backup) Gemini key: https://aistudio.google.com/apikey

### Step 4: Project chalao
```bash
npm install
npx playwright install chromium
cp .env.example .env
```
Ab `.env` file kholo aur 3 cheezein daalo:
- `TELEGRAM_BOT_TOKEN` (Step 1)
- `ALLOWED_TELEGRAM_ID` (Step 2)
- `GROQ_API_KEY` (Step 3)

Phir:
```bash
npm start
```
Telegram pe apne bot ko message karo - jawab aana chahiye! 🎉

## Use kaise kare

| Command | Kya karta hai |
|---|---|
| koi bhi message | AI se baat |
| `/help` | help |
| `/tasks` | saare tasks ki list |
| `/task readsite https://example.com` | website khol ke padhega |
| `/task yt lofi hip hop` | YouTube top 5 videos |
| `youtube pe lofi dhundh` | bina command ke bhi YouTube search |

## Login wali sites ke liye

Ek baar khud login kar lo, phir agent logged-in hi rahega:
```bash
node scripts/login.js twitter https://x.com/login
```
Browser khulega → tu login kar (password tera, code mein kabhi nahi) → ENTER → session `auth/twitter.json` mein save. Ab apne task mein:
```js
const context = await browser.newContext({ storageState: 'auth/twitter.json' });
```

## Naya task kaise add kare

`tasks/read-site.js` copy karke nayi file banao. Har task mein bas 4 cheezein:
```js
export default {
  description: 'yeh task kya karta hai',
  example: 'example input',
  needsConfirm: true,   // risky kaam hai toh true - bot pehle puchega
  async run(input) {
    // ... yahan apna code (playwright, API call, jo bhi)
    return 'result ka text'; // yeh Telegram pe jayega
  },
};
```
Phir `tasks/index.js` mein import karke `tasks` object mein daal do. Bas!

**⚠️ Rule:** Paise, message bhejna, ya koi permanent kaam - sab mein `needsConfirm: true` rakhna.

## Safety rules (zaroor padh)

- `.env` aur `auth/` folder **kabhi kisi ko mat dena, GitHub pe mat daalna** (`.gitignore` mein already hai)
- API keys kabhi code mein mat likhna - hamesha `.env`
- whatsapp-web.js jaisi unofficial cheezein mat jodna - number ban ho sakta hai

## Aage kya badha sakta hai

- 🧠 Memory ko MongoDB se replace kar (memory.js hi badalna hai)
- 📅 Google Calendar/Gmail APIs jod ke naye tasks bana
- 💬 WhatsApp Cloud API pe shift kar (official, alag number chahiye)
- 🤖 AI ko khud task choose karne de (function calling) - abhi ke liye /task se chala

Problem aaye toh error message dhyan se padh - zyada tar wahi bata deta hai kya missing hai.
