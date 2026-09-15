const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const url = process.argv[2];
  const b = await chromium.launch({ args:['--no-sandbox'] });
  const ctx = await b.newContext({ locale:'it-IT', userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36', viewport:{width:1400,height:1000} });
  const p = await ctx.newPage();
  const found = new Set(); const reqs = new Set(); const log = [];
  p.on('request', r => { const u = r.url(); if (/widencdn\.net\/img\/dorelrl\//.test(u)) found.add(u); else if (!/\.(png|jpg|jpeg|webp|gif|svg|css|woff2?|ttf|js|ico)(\?|$)/i.test(u)) reqs.add(r.method()+' '+u.slice(0,220)); });
  await p.goto(url, { waitUntil:'domcontentloaded', timeout: 60000 }).catch(e=>log.push('goto '+e.message.slice(0,100)));
  await p.waitForTimeout(8000);
  for (const sel of ['#onetrust-accept-btn-handler','button:has-text("Accetta")','button:has-text("Accept")']) { try { await p.locator(sel).first().click({timeout:1500}); log.push('cookie ok '+sel); break; } catch(e){} }
  async function collect(tag){
    const urls = await p.evaluate(() => { const s=new Set();
      document.querySelectorAll('img,source').forEach(el=>{ for (const a of ['src','srcset','data-src','data-srcset']) { const v=el.getAttribute(a); if(v) v.split(',').forEach(x=>{const u=x.trim().split(' ')[0]; if(/widencdn/.test(u)) s.add(u);}); } });
      performance.getEntriesByType('resource').forEach(e=>{ if(/widencdn/.test(e.name)) s.add(e.name); });
      const h=document.documentElement.outerHTML.replace(/\\\//g,'/'); for (const m of h.matchAll(/https?:\/\/embed\.widencdn\.net\/img\/dorelrl\/[^"'\s\\)]+/g)) s.add(m[0]);
      return [...s]; });
    urls.forEach(u=>found.add(u)); log.push(tag+': '+urls.length+' nel DOM, totale '+found.size);
  }
  await collect('iniziale');
  for (let y=0;y<6000;y+=800){ await p.mouse.wheel(0,800); await p.waitForTimeout(200); }
  await p.evaluate(()=>window.scrollTo(0,0)); await p.waitForTimeout(800); await collect('dopo scroll');
  // struttura dei selettori colore e galleria
  const info = await p.evaluate(() => { const out=[]; document.querySelectorAll('[class*=color], [class*=swatch], [class*=colour]').forEach(el=>{ if(out.length<25) out.push(el.tagName+'.'+String(el.className).slice(0,60)+' | '+(el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent.trim().slice(0,30))); }); return out; });
  log.push('elementi colore: '+info.join(' || '));
  const ginfo = await p.evaluate(() => { const out=[]; document.querySelectorAll('[class*=gallery], [class*=carousel], [class*=slider], [class*=thumb]').forEach(el=>{ if(out.length<20) out.push(el.tagName+'.'+String(el.className).slice(0,70)+' imgs='+el.querySelectorAll('img').length); }); return out; });
  log.push('elementi galleria: '+ginfo.join(' || '));
  for (const c of ['Tiger Shark','Black','Fire Orange']) {
    const cands = p.locator(`[aria-label*="${c}" i], [title*="${c}" i], [data-color-name*="${c}" i], [data-color*="${c}" i]`);
    const n = await cands.count(); log.push('colore '+c+' candidati '+n);
    if (n) { try { await cands.first().click({timeout:3000, force:true}); await p.waitForTimeout(3000); await collect('click '+c); } catch(e){ log.push('click fail '+c+' '+e.message.slice(0,80)); } }
  }
  fs.writeFileSync('probe/urls-all.txt', [...found].join('\n')+'\n');
  fs.writeFileSync('probe/req-log.txt', [...reqs].join('\n')+'\n');
  fs.writeFileSync('probe/gal-log.txt', log.join('\n')+'\n');
  console.log(log.join('\n'));
  await b.close();
})().catch(e=>{ fs.writeFileSync('probe/gal-log.txt','ERR '+e.message); console.log('ERR',e.message); process.exit(0); });
