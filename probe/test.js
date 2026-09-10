const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const arw = process.argv[2];
  const b = await chromium.launch({ args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage'] });
  const p = await b.newPage({ viewport:{width:1300,height:1000} });
  const log = [];
  p.on('console', m => log.push('console: ' + m.text().slice(0,300)));
  p.on('pageerror', e => log.push('pageerror: ' + e.message.slice(0,300)));
  await p.goto('file://' + process.cwd() + '/probe/convertitore-arw.html');
  const t0 = Date.now();
  await p.setInputFiles('#file', arw);
  let txt = '';
  for (let i = 0; i < 60; i++) {
    await p.waitForTimeout(3000);
    txt = (await p.locator('#rows').innerText()).replace(/\s+/g, ' ');
    if (!/sviluppo|in coda/.test(txt)) break;
  }
  log.push('elapsed ' + ((Date.now()-t0)/1000).toFixed(1) + 's');
  log.push('row: ' + txt);
  log.push('status: ' + await p.locator('#status').innerText());
  const src = await p.locator('#rows img.th').first().getAttribute('src');
  if (src && src.startsWith('blob:')) {
    const b64 = await p.evaluate(async s => { const r = await fetch(s); const buf = await r.arrayBuffer(); let str=''; const u=new Uint8Array(buf); for (let i=0;i<u.length;i++) str+=String.fromCharCode(u[i]); return btoa(str); }, src);
    fs.writeFileSync('probe/thumb.jpg', Buffer.from(b64, 'base64'));
  }
  await p.screenshot({ path: 'probe/shot.png' });
  fs.writeFileSync('probe/result.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
  await b.close();
})().catch(e => { fs.writeFileSync('probe/result.txt', 'ERR ' + e.message); console.log('ERR', e.message); });
