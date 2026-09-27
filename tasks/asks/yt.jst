// tasks/yt.js - YouTube search (login ki zarurat nahi)
// Top 5 videos laata hai: title, channel, views, link.

import { chromium } from 'playwright';

export default {
  description: 'YouTube pe search karke top 5 videos laata hai',
  example: 'lofi hip hop',
  needsConfirm: false,

  async run(query) {
    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    try {
      const page = await browser.newPage();
      await page.goto(
        'https://www.youtube.com/results?search_query=' + encodeURIComponent(query),
        { timeout: 30000, waitUntil: 'domcontentloaded' }
      );

      // Kuch regions mein Google consent page aata hai - reject karke aage badho
      if (page.url().includes('consent.youtube.com')) {
        const reject = page.getByRole('button', { name: /reject/i });
        if (await reject.isVisible().catch(() => false)) await reject.click();
      }

      await page.waitForSelector('ytd-video-renderer', { timeout: 15000 });

      const videos = await page.$$eval('ytd-video-renderer', (els) =>
        els.slice(0, 5).map((el) => {
          const a = el.querySelector('a#video-title');
          const channel = el.querySelector('ytd-channel-name a');
          const meta = [...el.querySelectorAll('#metadata-line span')].map((s) =>
            s.textContent.trim()
          );
          let href = a?.getAttribute('href') || '';
          if (href.startsWith('/')) href = 'https://www.youtube.com' + href;
          return {
            title: a?.textContent.trim() || '(no title)',
            channel: channel?.textContent.trim() || '',
            views: meta[0] || '',
            url: href,
          };
        })
      );

      if (!videos.length) return `😕 "${query}" ke liye kuch nahi mila.`;

      const lines = videos.map(
        (v, i) => `${i + 1}. ${v.title}\n   ${v.channel}${v.views ? ' · ' + v.views : ''}\n   ${v.url}`
      );
      return `🎬 YouTube: "${query}"\n\n${lines.join('\n\n')}`;
    } finally {
      await browser.close();
    }
  },
};
