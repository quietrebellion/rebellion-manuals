const { chromium } = require('playwright');
const S = s => `[data-screen="${s}"]`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const page = await b.newPage();
  const errs = []; page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
  const go = (f, t) => page.click(`${S(f)} [data-go="${t}"]`);
  await page.goto('file:///home/claude/bedrock-microsite.html');
  await go('intro','capture');
  await page.fill('#beliefInput','I have to be available'); await page.click('#addBelief');
  await page.fill('#beliefInput','People eventually leave'); await page.click('#addBelief');
  const ids = await page.evaluate(() => JSON.parse(localStorage.getItem('bedrock-manual-v1')).beliefs.map(x=>x.id));
  await go('capture','behavior');
  await page.fill(`#w-${ids[0]}`,'I answer at dinner'); await page.selectOption(`#s-${ids[0]}`,'Personal');
  await go('behavior','weigh');
  await page.fill(`#ben-${ids[0]}`,'Reputation for reliability');
  await page.fill(`#cost-${ids[0]}`,'Six years of late evenings');
  console.log('weigh next goes to protect:', await page.locator(`${S('weigh')} [data-go="protect"]`).count() === 1);
  console.log('protection clause removed from step 4:', !(await page.locator(S('weigh')).innerText()).includes('if it still needs that protection'));
  await go('weigh','protect');
  console.log('protect screen visible:', await page.locator(S('protect')).isVisible());
  console.log('one card per belief:', await page.locator('#protectList .belief-item').count() === 2);
  console.log('beliefs numbered:', (await page.locator('#protectList').innerText()).includes('1. I have to be available'));
  await page.fill(`#prot-${ids[0]}`,'Being seen as replaceable');
  await page.fill(`#fear-${ids[0]}`,'They would find out things run fine without me');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bedrock-manual-v1')).beliefs[0]);
  console.log('protected saved:', saved.protected === 'Being seen as replaceable');
  console.log('fear saved:', saved.fear === 'They would find out things run fine without me');
  // progress + labels
  console.log('step label:', await page.locator('#stepLabel').innerText());
  await go('protect','pause');
  console.log('pause back goes to protect:', await page.locator(`${S('pause')} [data-go="protect"]`).count() === 1);
  await go('pause','yours');
  console.log('yours kicker is step six:', (await page.locator(S('yours')).innerText()).toLowerCase().includes('step six'));
  await page.click(`${S('yours')} [data-mark="Handed to me"]`);
  await go('yours','prompts'); await go('prompts','onething');
  await page.selectOption('#otBelief',{index:1}); await page.fill('#otWho','Sam'); await page.fill('#otWhen','Thursday');
  await go('onething','summary');
  // reframe fear echo
  console.log('fear box hidden before choosing:', !(await page.locator('#rfFear').isVisible()));
  await page.selectOption('#rfOld',{index:1});
  await page.waitForTimeout(200);
  const fearBox = await page.locator('#rfFear').innerText();
  console.log('fear echoed in reframe:', fearBox.includes('They would find out things run fine without me'));
  console.log('fear box prompts targeting:', fearBox.includes('Point the test at that'));
  // summary export
  const sum = await page.locator('#summaryOut').innerText();
  console.log('summary has protection:', sum.includes('What it protected me from: Being seen as replaceable'));
  console.log('summary has fear:', sum.includes('afraid would happen without it: They would find out'));
  // full back chain incl new screen
  const order = ['summary','onething','prompts','yours','pause','protect','weigh','behavior','capture','intro'];
  let ok = true;
  for (let i=1;i<order.length;i++) if (await page.locator(`${S(order[i-1])} [data-go="${order[i]}"]`).count() === 0) { ok=false; console.log('  missing:',order[i-1],'->',order[i]); }
  console.log('full back chain:', ok);
  // belief with no fear -> box hides
  await page.selectOption('#rfOld',{index:0});
  await page.waitForTimeout(150);
  console.log('fear box hides when none:', !(await page.locator('#rfFear').isVisible()));
  console.log('js errors:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
