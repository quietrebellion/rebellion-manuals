const { chromium } = require('playwright');
const S = s => `[data-screen="${s}"]`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(()=>chromium.launch());
  const errs=[];
  const page = await b.newPage({ viewport:{width:375,height:812} });
  page.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  page.on('console',m=>{ if(m.type()==='error') errs.push('CONSOLE '+m.text()); });
  await page.goto('file:///home/claude/bedrock-microsite.html');

  console.log('=== FIX 4: skip link reachable ===');
  const active = await page.evaluate(()=>document.activeElement.tagName+'/'+(document.activeElement.className||''));
  console.log('  activeElement at boot:', active);
  await page.keyboard.press('Tab');
  const first = await page.evaluate(()=>({t:document.activeElement.tagName, txt:(document.activeElement.textContent||'').trim().slice(0,40), href:document.activeElement.getAttribute('href')}));
  console.log('  first Tab stop:', JSON.stringify(first));
  console.log('  -> skip link is first:', first.href === '#app' || /skip/i.test(first.txt));

  // activate skip link, confirm it moves focus into main
  await page.keyboard.press('Enter');
  await page.waitForTimeout(200);
  console.log('  after activating skip:', await page.evaluate(()=>document.activeElement.tagName+' '+(document.activeElement.id||'')));

  console.log('\n=== focus still moves on screen change ===');
  await page.click(`${S('intro')} [data-go="capture"]`);
  await page.waitForTimeout(200);
  console.log('  focus after go(capture):', await page.evaluate(()=>document.activeElement.tagName+' :: '+(document.activeElement.textContent||'').trim().slice(0,40)));

  console.log('\n=== FIX 1: no em dashes in behaviorEcho ===');
  await page.fill('#beliefInput','If I slow down it all falls apart'); await page.click('#addBelief');
  await page.click(`${S('capture')} [data-go="behavior"]`);
  await page.waitForTimeout(200);
  const sel = await page.locator('#behaviorList select').first();
  await sel.selectOption({ index: 1 }).catch(()=>{});
  await page.locator('#behaviorList textarea').first().fill('Saying yes to a 6pm meeting I did not want');
  await page.waitForTimeout(300);
  const echo = await page.locator('#behaviorEcho').innerText().catch(()=>'(none)');
  console.log('  echo text:', JSON.stringify(echo));
  console.log('  em dash present:', /[—–]/.test(echo) ? 'YES (FAIL)' : 'none');

  console.log('\n=== FIX 2: ghost button touch target ===');
  await page.click(`${S('behavior')} [data-go="weigh"]`);
  await page.click(`${S('weigh')} [data-go="protect"]`);
  await page.click(`${S('protect')} [data-go="pause"]`);
  await page.waitForTimeout(200);
  const ghosts = await page.evaluate(()=>Array.from(document.querySelectorAll('.screen.active .btn-ghost, .btn-ghost')).filter(e=>e.offsetParent).map(e=>({t:e.textContent.trim().slice(0,20), h:Math.round(e.getBoundingClientRect().height)})));
  console.log('  visible ghost buttons:', JSON.stringify(ghosts));
  console.log('  all >= 44px:', ghosts.every(g=>g.h>=44));

  console.log('\n=== FIX 3: overflow ===');
  const longStr = 'x'.repeat(300);
  await page.evaluate(()=>{ const el=document.querySelector('#beliefList, body'); });
  const ov375 = await page.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth+1);
  console.log('  375px overflow:', ov375 ? 'YES' : 'none');

  // long unbroken string test on capture screen
  const p2 = await b.newPage({ viewport:{width:375,height:812} });
  await p2.goto('file:///home/claude/bedrock-microsite.html');
  await p2.click(`${S('intro')} [data-go="capture"]`);
  await p2.fill('#beliefInput', 'x'.repeat(300)); await p2.click('#addBelief');
  await p2.waitForTimeout(300);
  console.log('  375px overflow w/ 300-char unbroken:', await p2.evaluate(()=>document.documentElement.scrollWidth > window.innerWidth+1) ? 'YES (FAIL)' : 'none');

  // 200% zoom
  const p3 = await b.newPage({ viewport:{width:375,height:812}, deviceScaleFactor:1 });
  await p3.goto('file:///home/claude/bedrock-microsite.html');
  await p3.addStyleTag({ content:'html{font-size:200%}' });
  await p3.waitForTimeout(300);
  const ovZoom = await p3.evaluate(()=>{
    const bad=[]; const W=window.innerWidth;
    document.querySelectorAll('*').forEach(e=>{ const r=e.getBoundingClientRect(); if(r.width>0 && r.right>W+1) bad.push(e.tagName+'.'+(e.className||'')+' '+Math.round(r.right)); });
    return { over: document.documentElement.scrollWidth>W+1, W, bad: bad.slice(0,6) };
  });
  console.log('  200% zoom overflow:', JSON.stringify(ovZoom));

  console.log('\n=== console errors ===');
  console.log(errs.length ? errs.join('\n') : '  none');
  await b.close();
})();
