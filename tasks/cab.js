// tasks/cab.js - live cab/auto/bike fare checker
// Rapido ke guest route page se ASLI price ranges laata hai (login nahi chahiye).
// Koi API key nahi. Agar price na mile toh saaf bolta hai - kabhi andha number nahi banata (anti-hallucination rule).

import { chromium } from 'playwright';

// Text mein se origin/destination nikalo: "from X to Y" ya "X se Y tak"
function extractRoute(text) {
  let t = text
    .replace(/(cheapest|sasta|sasti|cab|taxi|auto|ola|uber|rapido|fare|fares|kiraya|book|find|dhundh(o|na)?|bata(o|na)?|dikha(o|na)?|kitna|kitne|lagi|lagega|please|pls|mujhe|chahiye|karo|kar|de|do|ka|ki|ke)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  let m = t.match(/from\s+(.+?)\s+to\s+(.+)/i);
  if (m) return { from: m[1].trim(), to: m[2].trim() };
  m = t.match(/(.+?)\s+se\s+(.+?)\s+tak/i);
  if (m) return { from: m[1].trim(), to: m[2].trim() };
  m = t.match(/(.+?)\s+to\s+(.+)/i);
  if (m && m[1].trim().length > 2) return { from: m[1].trim(), to: m[2].trim() };
  return null;
}

export default {
  description: 'Do jagah ke beech live cab/auto/bike fare batata hai (Rapido se real prices)',
  example: 'from ghaziabad to noida',
  needsConfirm: false,

  async run(text) {
    const route = extractRoute(text);
    if (!route) {
      return '🤔 Route samajh nahi aaya. Aise likh: "cab from <jagah> to <jagah>" - jaise: cab from ghaziabad to noida';
    }

    const url = `https://m.rapido.bike/unup-home/seo/${encodeURIComponent(route.from)}/${encodeURIComponent(route.to)}?version=v3`;

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();
      await page.goto(url, { timeout: 45000, waitUntil: 'domcontentloaded' });

      // Prices JS se load hote hain - ₹ text ya service list ka wait karo
      try {
        await page.waitForFunction(() => document.body.innerText.includes('₹'), { timeout: 25000 });
      } catch {
        return `😕 Rapido pe "${route.from}" se "${route.to}" ka live fare nahi mil paya. Jagah ke naam thode aur clear karke try kar (area + city likh). Main kabhi apne se fare nahi banata.`;
      }
      await page.waitForTimeout(2000); // saare services render ho jayein

      const lines = (await page.evaluate(() => document.body.innerText))
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      // Pattern: service ka naam, agli line mein "₹ x - ₹ y"
      const services = [];
      for (let i = 0; i < lines.length - 1; i++) {
        const priceLine = lines[i + 1];
        if (/^[A-Za-z][A-Za-z ]{1,20}$/.test(lines[i]) && priceLine.includes('₹')) {
          const nums = priceLine.match(/₹\s*([\d,]+)/g);
          if (nums && nums.length) {
            const amounts = nums.map((n) => n.replace(/[^\d]/g, ''));
            services.push({ name: lines[i], range: amounts.join(' - ') });
          }
        }
      }

      if (!services.length) {
        return `😕 Rapido pe "${route.from}" se "${route.to}" ka live fare nahi mil paya. Jagah ke naam thode aur clear karke try kar (area + city likh). Main kabhi apne se fare nahi banata.`;
      }

      // Sabse sasta (sabse chhota min price) mark karo
      const cheapest = services.reduce((a, b) =>
        parseInt(a.range.split(' ')[0], 10) <= parseInt(b.range.split(' ')[0], 10) ? a : b
      );

      const list = services
        .map((s) => `• ${s.name}: ₹${s.range}${s === cheapest ? '  ✅ sabse sasta' : ''}`)
        .join('\n');

      return `🚕 Live fares (Rapido): ${route.from} → ${route.to}\n\n${list}\n\nYeh Rapido ki abhi ki real pricing hai - Ola/Uber alag charge kar sakte hain. Exact fare app pe book karte waqt dikhta hai.`;
    } finally {
      await browser.close();
    }
  },
};
