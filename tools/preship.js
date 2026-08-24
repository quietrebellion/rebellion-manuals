const { chromium } = require('playwright');
const fs = require('fs');
const AXE = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const URL = 'file:///home/claude/bedrock-microsite.html';
const S = s => `[data-screen="${s}"]`;
const SCREENS = ['intro','capture','behavior','weigh','protect','pause','yours','prompts','onething','summary'];

async function fill(page) {
  await page.click(`${S('intro')} [data-go="capture"]`);
  for (const t of ['I have to be available or it all falls apart','People eventually leave']) {
    await page.fill('#beliefInput', t); await page.click('#addBelief');
  }
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('bedrock-manual-v1')).beliefs.map(x => x.id));
  await page.click(`${S('capture')} [data-go="behavior"]`);
  await page.fill(`#w-${ids[0]}`, 'I answer messages at dinner');
  await page.selectOption(`#s-${ids[0]}`, 'Personal');
  await page.click(`${S('behavior')} [data-go="weigh"]`);
  await page.fill(`#ben-${ids[0]}`, 'A reputation for being reliable');
  await page.fill(`#cost-${ids[0]}`, 'Six years of late evenings');
  await page.click(`${S('weigh')} [data-go="protect"]`);
  await page.fill(`#prot-${ids[0]}`, 'Being seen as replaceable');
  await page.fill(`#fear-${ids[0]}`, 'They would find out things run fine without me');
  await page.click(`${S('protect')} [data-go="pause"]`);
  await page.click(`${S('pause')} [data-go="yours"]`);
  await page.fill(`#t-${ids[0]}`, 'A manager who rewarded all-nighters');
  await page.fill(`#f-${ids[0]}`, 'Them');
  await page.click(`${S('yours')} [data-mark="Handed to me"]`);
  await page.click(`${S('yours')} [data-go="prompts"]`);
  await page.click(`${S('prompts')} [data-go="onething"]`);
  await page.selectOption('#otBelief', { index: 1 });
  await page.fill('#otWho', 'Sam'); await page.fill('#otWhen', 'Thursday on our walk');
  await page.click(`${S('onething')} [data-go="summary"]`);
  await page.selectOption('#rfOld', { index: 1 });
  await page.fill('#rfNew', 'Things hold without me');
  await page.fill('#rfTest', 'One Saturday with Slack off');
  return ids;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());

  // ---------- 1. MOBILE ----------
  console.log('=== MOBILE 390x844 ===');
  let page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const overflow = await page.evaluate(() => ({
    docW: document.documentElement.scrollWidth, winW: window.innerWidth,
    wide: Array.from(document.querySelectorAll('*')).filter(e => e.getBoundingClientRect().width > window.innerWidth + 1)
      .map(e => e.tagName + '.' + (e.className || '')).slice(0, 6)
  }));
  console.log('horizontal overflow:', overflow.docW > overflow.winW + 1 ? 'YES ' + JSON.stringify(overflow) : 'none');
  await fill(page);
  // tap target sizes on summary
  const small = await page.evaluate(() => Array.from(document.querySelectorAll('[data-screen="summary"] button, [data-screen="summary"] a'))
    .filter(e => e.offsetParent !== null)
    .map(e => ({ t: e.textContent.trim().slice(0,28), h: Math.round(e.getBoundingClientRect().height) }))
    .filter(x => x.h < 44));
  console.log('summary controls under 44px tall:', small.length ? JSON.stringify(small) : 'none');
  await page.screenshot({ path: 'm-intro.png' });
  await page.click(`${S('summary')} [data-go="onething"]`);
  await page.click(`${S('onething')} [data-go="summary"]`);
  await page.screenshot({ path: 'm-summary.png', fullPage: true });
  console.log('mobile js errors:', errs.length ? errs : 'none');
  await page.close();

  // ---------- 2. AXE on every screen, desktop ----------
  console.log('\n=== AXE (WCAG 2 A/AA) ===');
  page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await fill(page);
  await page.addScriptTag({ content: AXE });
  for (const s of SCREENS) {
    await page.evaluate(sc => {
      document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.dataset.screen === sc));
      document.querySelectorAll('details').forEach(d => d.open = true);
    }, s);
    await page.waitForTimeout(600);
    const r = await page.evaluate(async () => {
      const res = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa'] } });
      return res.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length,
        sample: v.nodes[0] ? (v.nodes[0].target + ' :: ' + (v.nodes[0].failureSummary||'').split('\n')[1] || '') : '' }));
    });
    console.log(`  ${s}: ${r.length ? JSON.stringify(r) : 'clean'}`);
  }

  // ---------- 3. ICS ----------
  console.log('\n=== CALENDAR FILE ===');
  await page.evaluate(() => {
    document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.dataset.screen === 'summary'));
  });
  const ics = await page.evaluate(() => {
    let captured = null;
    const origCreate = URL.createObjectURL;
    URL.createObjectURL = (blob) => { captured = blob; return 'blob:stub'; };
    document.querySelector('#calBtn').click();
    URL.createObjectURL = origCreate;
    return captured ? captured.text() : null;
  });
  console.log(ics ? ics.split('\r\n').map(l => '  ' + l).join('\n') : '  could not capture');
  if (ics) {
    for (const req of ['BEGIN:VCALENDAR','VERSION:2.0','PRODID','BEGIN:VEVENT','UID:','DTSTAMP','DTSTART','SUMMARY','END:VEVENT','END:VCALENDAR']) {
      if (!ics.includes(req)) console.log('  MISSING REQUIRED FIELD:', req);
    }
  }

  // ---------- 4. PDF ----------
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'preship.pdf', format: 'Letter', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  console.log('\nPDF written');

  // ---------- 5. OLD localStorage FORMAT ----------
  console.log('\n=== BACK-COMPAT: old float ids ===');
  const p2 = await browser.newPage();
  const e2 = []; p2.on('pageerror', e => e2.push(e.message));
  await p2.goto(URL, { waitUntil: 'domcontentloaded' });
  await p2.evaluate(() => {
    localStorage.setItem('bedrock-manual-v1', JSON.stringify({
      beliefs: [{ id: 1785377213522.6003, text: 'Legacy belief with float id', chain: [], where: 'somewhere', sort: 'Personal', benefit: '', cost: '', taught: '', whoFor: '', mark: 'Handed to me' }],
      prompts: {}, oneThing: { belief: '', who: '', when: '' }, reframe: { old: '', next: '', test: '' }, screen: 'behavior'
    }));
  });
  await p2.reload({ waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(800);
  console.log('legacy state renders:', (await p2.locator('#behaviorEcho').innerText()).includes('Legacy belief with float id'));
  console.log('legacy where field editable:', await p2.locator('[data-field="where"]').count() === 1);
  await p2.fill('[data-field="where"]', 'edited fine');
  console.log('legacy edit saved:', (await p2.evaluate(() => JSON.parse(localStorage.getItem('bedrock-manual-v1')).beliefs[0].where)) === 'edited fine');
  console.log('legacy js errors:', e2.length ? e2 : 'none');

  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
