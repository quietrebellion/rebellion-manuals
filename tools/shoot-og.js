const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  for (const [src, out] of [['og-card.html','og-bedrock.png'], ['og-hub.html','og-hub.png']]) {
    const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await p.goto('file:///home/claude/' + src);
    await p.waitForTimeout(700);
    await p.screenshot({ path: '/home/claude/' + out });
    await p.close();
  }
  await b.close();
})();
