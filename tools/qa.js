const { chromium } = require('playwright');
const S = s => `[data-screen="${s}"]`;
const SCREENS = ['intro','capture','behavior','weigh','protect','pause','yours','prompts','onething','summary'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const page = await b.newPage({ viewport:{width:375,height:812} });
  const errs=[]; page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
  await page.goto('file:///home/claude/bedrock-microsite.html');

  console.log('=== PASS 1: FUNCTIONAL / EDGE CASES ===');
  // empty input guard
  await page.click(`${S('intro')} [data-go="capture"]`);
  await page.click('#addBelief');
  await page.waitForTimeout(200);
  console.log('  empty add blocked with message:', (await page.locator('#liveNote').count()) ? (await page.locator('#liveNote').innerText()).length > 0 : false);
  // advancing with zero beliefs blocked
  await page.click(`${S('capture')} [data-go="behavior"]`);
  console.log('  next blocked with 0 beliefs:', await page.locator(S('capture')).isVisible());
  // long + unusual input
  const LONG = 'A'.repeat(1200);
  await page.fill('#beliefInput', LONG); await page.click('#addBelief');
  await page.fill('#beliefInput', 'Quotes "x" & <b>bold</b> — emoji 🔥 apostrophe’s'); await page.click('#addBelief');
  console.log('  long+unusual accepted:', await page.locator('#beliefList .belief-item').count() === 2);
  console.log('  no html injected in list:', await page.locator('#beliefList b').count() === 0);
  const ovCap = await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth+1);
  console.log('  375px overflow after long input:', ovCap ? 'YES' : 'none');
  // refresh mid-flow
  await page.click(`${S('capture')} [data-go="behavior"]`);
  await page.reload(); await page.waitForTimeout(600);
  console.log('  state restored to behavior after reload:', await page.locator(S('behavior')).isVisible());

  console.log('\n=== PASS 4: SEMANTICS / A11Y ===');
  // heading hierarchy per screen
  for (const s of SCREENS) {
    const hs = await page.evaluate(sc => {
      const el = document.querySelector(`[data-screen="${sc}"]`);
      return Array.from(el.querySelectorAll('h1,h2,h3,h4')).map(h=>h.tagName);
    }, s);
    const bad = hs.some((h,i)=> i>0 && (+h[1]) - (+hs[i-1][1]) > 1);
    if (bad || (hs[0] && hs[0] !== 'H2')) console.log(`  ${s}: heading order ${hs.join('>')}`);
  }
  console.log('  heading hierarchy: checked above (blank = clean)');
  // landmarks
  console.log('  landmarks main/nav/header/footer:', await page.evaluate(()=>['main','nav','header','footer'].map(t=>!!document.querySelector(t)).every(Boolean)));
  console.log('  h1 count:', await page.locator('h1').count());
  // buttons vs links
  const wrong = await page.evaluate(()=>{
    const linksActingAsButtons = Array.from(document.querySelectorAll('a')).filter(a=>!a.getAttribute('href')).length;
    const btnsWithHref = Array.from(document.querySelectorAll('button[href]')).length;
    return { linksActingAsButtons, btnsWithHref };
  });
  console.log('  semantic button/link misuse:', JSON.stringify(wrong));
  // label association for every input across screens
  const labelIssues = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.screen').forEach(sc => {
      sc.querySelectorAll('input,textarea,select').forEach(el => {
        const id = el.id;
        const lbl = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
        const aria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
        if (!lbl && !aria) out.push({ screen: sc.dataset.screen, id: id || '(no id)', tag: el.tagName });
      });
    });
    return out;
  });
  console.log('  inputs without label:', labelIssues.length ? JSON.stringify(labelIssues.slice(0,5)) : 'none');
  // invalid ids (spaces / chars that break for/id + querySelector)
  const badIds = await page.evaluate(() => Array.from(document.querySelectorAll('[id]')).map(e=>e.id).filter(i=>/\s/.test(i)));
  console.log('  ids containing whitespace (invalid HTML):', badIds.length ? badIds.length + ' e.g. ' + JSON.stringify(badIds[0].slice(0,60)) : 'none');
  await b.close();
  console.log('\njs/console errors:', errs.length ? errs : 'none');
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
