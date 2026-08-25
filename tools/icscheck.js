const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }).catch(() => chromium.launch());
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/bedrock-microsite.html');
  await p.click('[data-screen="intro"] [data-go="capture"]');
  await p.fill('#beliefInput', 'I have to be available; always, no matter what, or it falls apart');
  await p.click('#addBelief');
  // Screen order, in full. 'protect' was added after this script was first written and
  // the old hop from weigh straight to pause no longer resolves.
  const FLOW = ['capture','behavior','weigh','protect','pause','yours','prompts','onething','summary'];
  for (let i = 1; i < FLOW.length; i++) {
    await p.click(`[data-screen="${FLOW[i - 1]}"] [data-go="${FLOW[i]}"]`);
  }
  const ics = await p.evaluate(() => {
    let cap = null; const o = URL.createObjectURL;
    URL.createObjectURL = blob => { cap = blob; return 'blob:stub'; };
    document.querySelector('#calBtn').click();
    URL.createObjectURL = o;
    return cap ? cap.text() : null;
  });
  console.log('--- ICS ---'); console.log(ics.split('\r\n').map(l=>'  '+l).join('\n'));
  const req = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID','CALSCALE','BEGIN:VEVENT','UID:','DTSTAMP:','DTSTART','DTEND','SUMMARY:','END:VEVENT','END:VCALENDAR'];
  const missing = req.filter(r => !ics.includes(r));
  console.log('missing required:', missing.length ? missing : 'none');
  console.log('CRLF line endings:', ics.includes('\r\n') && !/[^\r]\n/.test(ics));
  const long = ics.split('\r\n').filter(l => l.length > 75);
  console.log('lines over 75 octets:', long.length ? long.map(l=>l.length) : 'none');
  console.log('DTSTAMP format valid:', /DTSTAMP:\d{8}T\d{6}Z/.test(ics));
  console.log('30 days out:', /DTSTART;VALUE=DATE:\d{8}/.test(ics));
  console.log('wording matches email 3:', ics.includes('did you notice this month'));
  console.log('links to manual:', ics.includes('manuals.rebellioncollective.com/bedrock'));
  console.log('js errors:', errs.length ? errs : 'none');
  await b.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
