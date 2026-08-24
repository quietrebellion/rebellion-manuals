const { chromium } = require('playwright');
const S = s => `[data-screen="${s}"]`;
const SCREENS = ['intro','capture','behavior','weigh','protect','pause','yours','prompts','onething','summary'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const page = await b.newPage({ viewport:{width:375,height:812} });
  await page.goto('file:///home/claude/bedrock-microsite.html');

  console.log('=== PASS 5: META / TECHNICAL ===');
  const meta = await page.evaluate(()=>{
    const g = s => { const e=document.querySelector(s); return e ? (e.getAttribute('content')||e.textContent) : null; };
    return {
      title: document.title,
      desc: g('meta[name="description"]'),
      viewport: g('meta[name="viewport"]'),
      ogTitle: g('meta[property="og:title"]'),
      ogDesc: g('meta[property="og:description"]'),
      ogImg: g('meta[property="og:image"]'),
      ogUrl: g('meta[property="og:url"]'),
      twCard: g('meta[name="twitter:card"]'),
      themeColor: g('meta[name="theme-color"]'),
      favicon: !!document.querySelector('link[rel="icon"]'),
      lang: document.documentElement.lang,
      canonical: g('link[rel="canonical"]'),
      externalReqs: Array.from(document.querySelectorAll('link[href^="http"],script[src^="http"],img[src^="http"]')).map(e=>e.href||e.src),
      inlineScripts: document.querySelectorAll('script:not([src])').length,
      atLatest: document.documentElement.innerHTML.includes('@latest')
    };
  });
  console.log(JSON.stringify(meta,null,2));

  console.log('\n=== PASS 3: UX / DENSITY ===');
  // seed a full session
  await page.click(`${S('intro')} [data-go="capture"]`);
  for (const t of ['If I slow down it all falls apart','I have to be the one who holds it together','Rest has to be earned']) {
    await page.fill('#beliefInput', t); await page.click('#addBelief');
  }
  const rows = [];
  for (const s of SCREENS) {
    await page.evaluate(n=>{ document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active', el.dataset.screen===n)); }, s);
    await page.waitForTimeout(80);
    const m = await page.evaluate(()=>{
      const a = document.querySelector('.screen.active');
      const txt = (a.innerText||'').trim();
      const words = txt.split(/\s+/).filter(Boolean).length;
      const h = a.getBoundingClientRect().height;
      const btns = Array.from(a.querySelectorAll('button,a')).filter(e=>e.offsetParent).map(e=>({t:e.textContent.trim().slice(0,28), h:Math.round(e.getBoundingClientRect().height), w:Math.round(e.getBoundingClientRect().width)}));
      const small = btns.filter(x=>x.h<44 || x.w<44);
      const h2 = a.querySelector('h2');
      return { words, height: Math.round(h), heading: h2?h2.textContent.trim():'(none)', btns: btns.length, small };
    });
    rows.push({ screen: s, ...m });
  }
  rows.forEach(r=>console.log(`  ${r.screen.padEnd(9)} words:${String(r.words).padStart(4)}  h:${String(r.height).padStart(5)}px  ctrls:${r.btns}  small:${r.small.length ? JSON.stringify(r.small) : '0'}  "${r.heading}"`));

  console.log('\n  headings that only label vs earn:');
  rows.forEach(r=>console.log(`    ${r.screen}: ${r.heading}`));

  await b.close();
})();
