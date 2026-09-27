// scripts/login.js - ek baar khud login karo, session save ho jayega
//
// Chalane ka tarika:  node scripts/login.js twitter https://x.com/login
// Browser khulega (visible) -> tu khud login kar (password/OTP sab tera) ->
// wapas terminal mein aa ke ENTER daba -> session auth/twitter.json mein save.
//
// Phir tasks mein use kar:
//   const context = await browser.newContext({ storageState: 'auth/twitter.json' });
// Ab site tujhe logged-in samjhegi. Kabhi password code mein mat likhna!

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import readline from 'readline';

const [name, url] = process.argv.slice(2);
if (!name || !url) {
  console.log('Usage: node scripts/login.js <naam> <login-url>');
  console.log('Example: node scripts/login.js twitter https://x.com/login');
  process.exit(1);
}

mkdirSync('auth', { recursive: true });

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext();
const page = await context.newPage();
await page.goto(url);

console.log(`\n👉 Browser mein ${name} pe login kar le (password, OTP, sab).`);
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
await new Promise((resolve) => rl.question('✅ Login ho gaya? ENTER daba: ', resolve));
rl.close();

await context.storageState({ path: `auth/${name}.json` });
await browser.close();
console.log(`\n🎉 Session save ho gaya: auth/${name}.json`);
console.log('Is file ko kisi ko mat dena - isme tera login hai!');
