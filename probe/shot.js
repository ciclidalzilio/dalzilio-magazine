const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const log = [];
  for (const [name, vp] of [['pc',{width:1400,height:1000}],['mobile',{width:390,height:844}]]) {
    const p = await b.newPage({ viewport: vp });
    const r = await p.goto(url, { waitUntil:'networkidle', timeout: 90000 }).catch(e=>null);
    log.push(name + ' status ' + (r && r.status()) + ' final ' + p.url());
    const rel = p.locator('.dzs-rel');
    const n = await rel.count();
    log.push(name + ' sezioni correlati: ' + n);
    if (n) {
      const titles = await p.locator('.dzs-rel .prod h3').allInnerTexts();
      const prices = await p.locator('.dzs-rel .prod .price').allInnerTexts();
      log.push(name + ' card: ' + titles.map((t,i)=>t+' '+prices[i]).join(' | '));
      await p.waitForTimeout(2500);
      await rel.first().scrollIntoViewIfNeeded();
      await p.waitForTimeout(1500);
      await rel.first().screenshot({ path: 'probe/rel-' + name + '.png' });
    } else {
      log.push(name + ' body: ' + (await p.locator('body').innerText()).slice(0,300).replace(/\s+/g,' '));
    }
    await p.close();
  }
  fs.writeFileSync('probe/result.txt', log.join('\n') + '\n');
  console.log(log.join('\n'));
  await b.close();
})().catch(e => { fs.writeFileSync('probe/result.txt', 'ERR ' + e.message); console.log('ERR', e.message); });
