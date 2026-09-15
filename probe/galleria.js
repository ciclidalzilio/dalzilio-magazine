const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const ctx = await b.newContext({ locale:'it-IT', userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36', viewport:{width:1400,height:1000} });
  const p = await ctx.newPage();
  const found = new Set(); const log = [];
  p.on('response', async r => { const u = r.url(); if (/widencdn\.net\/img\/dorelrl\//.test(u)) found.add(u);
    try { const ct = r.headers()['content-type']||''; if (/json|javascript|html/.test(ct) && !/widencdn/.test(u)) { const t = await r.text(); for (const m of t.matchAll(/https?:\\?\/\\?\/embed\.widencdn\.net\\?\/img\\?\/dorelrl\\?\/[^"'\s\\]+/g)) found.add(m[0].replace(/\\\//g,'/')); } } catch(e){} });
  await p.goto(url, { waitUntil:'networkidle', timeout: 90000 }).catch(e=>log.push('goto '+e.message));
  for (const sel of ['#onetrust-accept-btn-handler','button:has-text("Accetta")','button:has-text("Accept")']) { try { await p.locator(sel).first().click({timeout:2000}); log.push('cookie ok '+sel); break; } catch(e){} }
  async function collect(tag){
    const urls = await p.evaluate(() => { const s=new Set(); document.querySelectorAll('img,source,[style]').forEach(el=>{ for (const a of ['src','srcset','data-src','data-srcset']) { const v=el.getAttribute&&el.getAttribute(a); if(v) v.split(',').forEach(x=>{const u=x.trim().split(' ')[0]; if(/widencdn/.test(u)) s.add(u);}); } const st=el.getAttribute&&el.getAttribute('style'); if(st){ const m=st.match(/url\(["']?([^"')]+)/); if(m&&/widencdn/.test(m[1])) s.add(m[1]); } }); return [...s]; });
    urls.forEach(u=>found.add(u)); log.push(tag+': '+urls.length+' nel DOM, totale '+found.size);
  }
  await p.waitForTimeout(3000); await collect('iniziale');
  // scorri la pagina per far caricare le lazy
  for (let y=0;y<8000;y+=700){ await p.mouse.wheel(0,700); await p.waitForTimeout(250); }
  await p.mouse.wheel(0,-9000); await p.waitForTimeout(1000); await collect('dopo scroll');
  // clic sui colori
  const colori = ['Tiger Shark','Black','Fire Orange'];
  for (const c of colori) {
    const cands = p.locator(`[aria-label*="${c}" i], [title*="${c}" i], [data-color-name*="${c}" i], label:has-text("${c}"), button:has-text("${c}")`);
    const n = await cands.count(); log.push('colore '+c+' candidati '+n);
    for (let i=0;i<Math.min(n,3);i++){ try { await cands.nth(i).click({timeout:3000}); await p.waitForTimeout(2500); await collect('click '+c+' #'+i); } catch(e){ log.push('click fail '+c+' '+e.message.slice(0,80)); } }
    // thumbnails della galleria
    const th = p.locator('.pdp-gallery img, [class*=gallery] img, [class*=thumb] img, [class*=carousel] img');
    const tn = await th.count(); log.push('thumb '+tn);
    for (let i=0;i<Math.min(tn,14);i++){ try { await th.nth(i).click({timeout:1500}); await p.waitForTimeout(600); } catch(e){} }
    await collect('galleria '+c);
  }
  // html della pagina: cerco nomi file con suffissi diversi
  const html = await p.content();
  const names = new Set(); for (const m of html.matchAll(/C2[0-9]_C65134U[A-Za-z0-9_\-]+/g)) names.add(m[0]); log.push('nomi in html: '+[...names].join(' '));
  fs.writeFileSync('probe/urls-all.txt', [...found].join('\n')+'\n');
  fs.writeFileSync('probe/gal-log.txt', log.join('\n')+'\n');
  console.log(log.join('\n')); console.log([...found].join('\n'));
  await b.close();
})().catch(e=>{ fs.writeFileSync('probe/gal-log.txt','ERR '+e.message); console.log('ERR',e.message); });
