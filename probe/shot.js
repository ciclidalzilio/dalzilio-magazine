const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const log = [];
  for (const [name, vp] of [['pc',{width:1500,height:1000}],['mobile',{width:390,height:844}]]) {
    const p = await b.newPage({ viewport: vp });
    const r = await p.goto(url, { waitUntil:'networkidle', timeout: 90000 }).catch(e=>null);
    log.push(name + ' status ' + (r && r.status()));
    for (const sel of ['#shopify-pc__banner__btn-accept','button:has-text("Accetta")']) { try { await p.locator(sel).first().click({timeout:1500}); } catch(e){} }
    await p.waitForTimeout(2500);
    log.push(name + ' premium: ' + await p.locator('.dz.dz-premium').count() + ' led: ' + await p.locator('.dz-led').count());
    await p.screenshot({ path: 'probe/prem-' + name + '-top.png' });
    await p.evaluate(() => window.scrollBy(0, 700)); await p.waitForTimeout(800);
    await p.screenshot({ path: 'probe/prem-' + name + '-mid.png' });
    await p.close();
  }
  fs.writeFileSync('probe/result.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
  await b.close();
})().catch(e => { fs.writeFileSync('probe/result.txt', 'ERR ' + e.message); console.log('ERR', e.message); });
