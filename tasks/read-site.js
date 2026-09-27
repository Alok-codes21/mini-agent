// tasks/read-site.js - example task
// Kisi bhi website ko khol ke uska title aur content padh ke laata hai.
// Isi pattern pe apne tasks bana: input lo, browser chalao, result text mein do.

import { chromium } from 'playwright';

export default {
  description: 'Ek website khol ke title aur main content padh ke laata hai',
  example: 'https://example.com',
  needsConfirm: false, // true karoge toh bot pehle puchega "chala du?"

  async run(url) {
    if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();
      await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });

      const title = await page.title();
      const text = await page.evaluate(() => document.body.innerText.slice(0, 1500));

      // Login wali site ke liye: storageState use karo (scripts/login.js dekho)
      // const context = await browser.newContext({ storageState: 'auth/twitter.json' });

      return `✅ ${url}\n\n📌 Title: ${title}\n\n📄 Content:\n${text}`;
    } finally {
      await browser.close();
    }
  },
};
