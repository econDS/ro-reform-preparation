'use strict';
const R = window.Reform;
const STORAGE_KEY = 'reform-workshop.v1';
let state = R.defaults();
let storageAvailable = true;
let quickstartHidden = false;
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if(saved) state = R.sanitize(JSON.parse(saved));
  quickstartHidden = localStorage.getItem(STORAGE_KEY+'.quickstart-hidden') === '1';
  // One-time default backfills. Each entry runs once per browser and only for
  // a price the user never set, so custom and cleared prices survive.
  // [flag suffix, price key, new default, extra stale value it also replaces]
  const MIGRATIONS = [
    ['.default-weaponOreLow-8000','weaponOreLow',8000],
    ['.default-weaponOreMedium-18890','weaponOreMedium',18890],
    ['.default-armorOreLow-8889','armorOreLow',8889],
    ['.default-armorOreMedium-23000','armorOreMedium',23000],
    ['.default-accessoryOreLow-7800','accessoryOreLow',7800],
    ['.default-accessoryOreMedium-21990','accessoryOreMedium',21990],
    ['.default-shadowOre-950','shadowOre',950,1500],
    ['.remove-zelunium'],
    ['.default-accessoryStone0-34990','accessoryStone0',34990],
    ['.default-weaponStone0-33750','weaponStone0',33750],
    ['.default-weaponStone1-110000','weaponStone1',110000],
    ['.default-weaponStone2-358888','weaponStone2',358888],
    ['.default-weaponStone3-1290000','weaponStone3',1290000],
    ['.default-armorStone0-39990','armorStone0',39990],
    ['.default-armorStone1-127000','armorStone1',127000],
    ['.default-armorStone2-409999','armorStone2',409999],
    ['.default-armorStone3-1600000','armorStone3',1600000],
    ['.default-accessoryStone1-117500','accessoryStone1',117500],
    ['.default-accessoryStone2-399000','accessoryStone2',399000],
    ['.default-accessoryStone3-1500000','accessoryStone3',1500000],
  ];
  let migrated = false;
  for(const [suffix,key,value,stale] of MIGRATIONS) {
    const flag = STORAGE_KEY + suffix;
    if(localStorage.getItem(flag)) continue;
    if(key && (state.prices[key] === '' || (stale != null && state.prices[key] === stale))) state.prices[key] = value;
    localStorage.setItem(flag,'1');
    migrated = true;
  }
  if(migrated) localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
} catch { storageAvailable = false; }
// The built-in target and empty inventory look like a real result to a new
// visitor. Label them as an example until the user changes something. Compared
// by value because the price migrations above already write a saved state.
const DEFAULTS = R.defaults();
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
let showingExample = state.type === DEFAULTS.type && state.grade === DEFAULTS.grade && state.quantity === DEFAULTS.quantity
  && same(state.inventory,DEFAULTS.inventory) && same(state.reform,DEFAULTS.reform);
const $ = id => document.getElementById(id);
const fmt = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
const z = n => n == null ? 'ยังไม่ได้ใส่ราคา' : `${fmt(n)} z`;
const cap = t => t[0].toUpperCase()+t.slice(1);
const ITEM_IDS = {
  weaponStone0:1000430,weaponStone1:1000431,weaponStone2:1000432,weaponStone3:1000433,
  armorStone0:1000434,armorStone1:1000435,armorStone2:1000436,armorStone3:1000437,
  accessoryStone0:1000438,accessoryStone1:1000439,accessoryStone2:1000440,accessoryStone3:1000441,
  weaponOreLow:1000419,weaponOreMedium:1000420,armorOreLow:1000423,armorOreMedium:1000424,
  accessoryOreLow:1000426,accessoryOreMedium:1000427,shadowOre:25728,shadow:25729,zeluniumOre:25730,zelunium:25731
};
// Adjacent text provides the item name; empty alt avoids duplicate announcements.
function icon(key, extra = '') {
  // No verified Divine Pride item id yet for some materials; show a neutral
  // placeholder rather than a guessed id that would render the wrong item.
  if(!Object.hasOwn(ITEM_IDS,key)) return `<span class="item-icon item-icon-blank ${extra}" aria-hidden="true">◆</span>`;
  return `<img class="item-icon ${extra}" src="assets/items/${ITEM_IDS[key]}.png" width="24" height="24" alt="" decoding="async">`;
}
// Thai classifiers chosen from what the item actually looks like in game:
// Enhancement Stone is a cut oval gem in a metal setting -> เม็ด
// Enhancement Ore is a raw crystal shard -> ชิ้น
// Rough Shadowdecon is one elongated pointed crystal -> แท่ง
// Shadowdecon is a cluster of those crystals -> ก้อน
// Zelunium and Rough Zelunium are both rounded nuggets -> ก้อน
function unit(key) {
  if(key === 'shadowOre') return 'แท่ง';
  if(key === 'shadow' || key === 'zelunium' || key === 'zeluniumOre') return 'ก้อน';
  if(/Stone\d$/.test(key)) return 'เม็ด';
  return 'ชิ้น';
}
function name(key) {
  const names = {shadow:'Shadowdecon',shadowOre:'Rough Shadowdecon',zelunium:'Zelunium',zeluniumOre:'Rough Zelunium'};
  if(names[key]) return names[key];
  for(const t of R.TYPES) {
    if(key.startsWith(t+'Stone')) return `${cap(t)} Stone · ${R.GRADES[Number(key.at(-1))]}`;
    if(key.startsWith(t+'Ore')) return `${cap(t)} Ore · ${key.slice((t+'Ore').length)}`;
  }
  return key;
}
function fullName(key) {
  const bulkNames={shadow:'Shadowdecon',shadowOre:'Rough Shadowdecon',zelunium:'Zelunium',zeluniumOre:'Rough Zelunium'};
  if(bulkNames[key])return bulkNames[key];
  for(const t of R.TYPES){
    if(key.startsWith(t+'Stone'))return `${cap(t)} Enhancement Stone (${R.GRADES[Number(key.at(-1))]} Grade)`;
    if(key.startsWith(t+'Ore'))return `${cap(t)} Enhancement Ore (${key.slice((t+'Ore').length)} Grade)`;
  }
  return name(key);
}
function copyName(key, label=fullName(key)) {
  return `<button type="button" class="copy-item" data-copy-item="${key}" title="คัดลอก: ${fullName(key)}" aria-label="คัดลอกชื่อ ${fullName(key)}">${label}</button>`;
}
let copyNoticeTimer;
function copyNotice(message) {
  const notice=$('copy-notice');
  clearTimeout(copyNoticeTimer);notice.textContent=message;notice.hidden=false;
  copyNoticeTimer=setTimeout(()=>{notice.hidden=true;},3500);
}
async function copyItemName(key) {
  if(!R.inventoryKeys.includes(key))return;
  await copyPlainText(fullName(key));
}
// Same clipboard path as item names, but for any literal string (the /navi
// commands), including the execCommand fallback for file:// pages.
async function copyPlainText(text) {
  let copied=false;
  try { if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);copied=true;} } catch {}
  if(!copied){
    const previous=document.activeElement;
    const field=document.createElement('textarea');
    field.value=text;field.readOnly=true;field.className='clipboard-fallback';
    document.body.appendChild(field);
    try {field.select();field.setSelectionRange(0,text.length);copied=document.execCommand('copy');} catch {}
    finally {field.remove();previous?.focus({preventScroll:true});}
  }
  if(copied)copyNotice(`คัดลอกแล้ว: ${text}`);
  else {window.prompt('คัดลอกอัตโนมัติไม่ได้ คัดลอกข้อความด้านล่างแทน',text);copyNotice('เลือกข้อความแล้วกด Ctrl+C เพื่อคัดลอก');}
}
function save() {
  if(showingExample){showingExample=false;$('example-banner').hidden=true;}
  try { localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); storageAvailable=true; }
  catch { storageAvailable=false; }
  $('save-status').textContent=storageAvailable?'✓ บันทึกอัตโนมัติแล้ว':'บันทึกไม่ได้ · ข้อมูลอาจหายเมื่อปิดหรือโหลดหน้าใหม่';
}
function invField(key,label) { return `<div><span class="inventory-item-label">${icon(key)}${copyName(key,label)}</span><input type="number" min="0" max="1000000000" step="1" inputmode="numeric" data-inventory="${key}" aria-label="มี ${fullName(key)}" value="${state.inventory[key]}"></div>`; }
function drawInventory() {
  const t=state.type;
  $('inventory-fields').innerHTML=`<div class="inventory-group-label">${cap(t).toUpperCase()} ENHANCEMENT STONE</div><div class="inventory-grid">${R.GRADES.map((g,i)=>invField(`${t}Stone${i}`,g)).join('')}</div><div class="inventory-group-label">${cap(t).toUpperCase()} ENHANCEMENT ORE</div><div class="inventory-grid two">${invField(t+'OreLow','Low Grade')}${invField(t+'OreMedium','Medium Grade')}</div><div class="inventory-group-label">SHADOWDECON / ZELUNIUM</div><div class="inventory-grid two">${invField('shadow','Shadowdecon')}${invField('shadowOre','Rough Shadowdecon')}${invField('zelunium','Zelunium')}${invField('zeluniumOre','Rough Zelunium')}</div>`;
}
// Re-format the field without losing the caret: count the digits left of the
// caret, then put the caret back after that many digits in the grouped value.
// Without this, backspacing over a separator jumps the caret to the end.
function setPriceValue(el, raw) {
  const grouped = raw === '' ? '' : fmt(Number(raw));
  if(el.value === grouped) return;
  const focused = document.activeElement === el;
  const caret = focused ? el.selectionStart ?? el.value.length : 0;
  const digitsBefore = el.value.slice(0,caret).replace(/\D/g,'').length;
  el.value = grouped;
  if(!focused) return;
  let seen = 0, next = grouped.length;
  for(let i=0;i<grouped.length;i++){
    if(seen === digitsBefore){next = i;break;}
    if(/\d/.test(grouped[i])) seen++;
    if(seen === digitsBefore){next = i+1;break;}
  }
  el.setSelectionRange(next,next);
}
// A price of 0 or blank means "do not buy this item". Show that as a state on
// the field instead of silently swallowing the character the user typed.
function markNoBuy(el) {
  const off = state.prices[el.dataset.price] === '';
  el.classList?.toggle('price-off',off);
  el.closest?.('.price-row')?.classList?.toggle('price-row-off',off);
}
// The price table used to be one flat list of 20 rows, of which 12 belong to
// types the current calculation never touches. Group it the same way the
// inventory panel is grouped, and fold the other types away.
function priceGroups() {
  const t=state.type, others=R.TYPES.filter(x=>x!==t);
  const set=x=>[`${x}OreLow`,`${x}OreMedium`,...R.GRADES.map((_,i)=>`${x}Stone${i}`)];
  return [
    {label:'SHADOWDECON / ZELUNIUM',note:'ใช้ร่วมทุกประเภท · สูตร Reform ใช้ตรง ๆ',keys:['shadowOre','shadow','zeluniumOre','zelunium']},
    {label:`${cap(t).toUpperCase()} ENHANCEMENT`,note:'ประเภทที่กำลังคำนวณอยู่',keys:set(t)},
    {label:'ราคาของประเภทอื่น',note:others.map(cap).join(' · '),folded:true,keys:others.flatMap(set)}
  ];
}
function priceRow(k) {
  return `<div class="price-row" data-price-row="${k}"><div class="item-label">${icon(k)}<span>${copyName(k)}</span><span class="price-plan-tag" hidden></span></div><input id="price-${k}" type="text" inputmode="numeric" autocomplete="off" placeholder="ไม่ซื้อ" aria-label="ราคาต่อ${unit(k)} ${fullName(k)}" data-price="${k}" value="${state.prices[k]}"></div>`;
}
function drawPrices() {
  $('price-fields').innerHTML=priceGroups().map(g=>{
    const head=`<span class="price-group-label">${g.label}</span><small>${g.note}</small>`;
    const rows=g.keys.map(priceRow).join('');
    return g.folded
      ? `<details class="price-group price-group-folded"><summary><span class="price-group-head">${head}</span><span aria-hidden="true">＋</span></summary>${rows}</details>`
      : `<section class="price-group"><div class="price-group-head">${head}</div>${rows}</section>`;
  }).join('');
  document.querySelectorAll('[data-price]').forEach(el=>{el.value=state.prices[el.dataset.price]===''?'':fmt(state.prices[el.dataset.price]);markNoBuy(el);});
}
// Flag the rows the current plan actually spends money on, so it is obvious
// which prices are worth double-checking before trusting the total.
function markPlanRows(plan) {
  for(const row of document.querySelectorAll('[data-price-row]')) {
    const n=plan.buy[row.dataset.priceRow]||0;
    const tag=row.querySelector('.price-plan-tag');
    row.classList.toggle('price-row-planned',n>0);
    if(!tag)continue;
    tag.hidden=!n;
    if(n)tag.textContent=`แผนนี้ซื้อ ${fmt(n)}`;
  }
}
function compareBlock(key) {
  const c=R.comparison(state,key), name=fullName(c.key), roughName=fullName(c.ore);
  const verdict=c.direct==null||c.combined==null?`ใส่ราคาทั้ง ${name} และ ${roughName} เพื่อเทียบสองทางนี้`
    :c.direct===c.combined?'สองทางราคาเท่ากัน · เลือกตามความสะดวก'
    :`${c.direct<c.combined?'✓ ซื้อก้อนใหญ่คุ้มกว่า':'✓ ซื้อ Rough มารวมเองคุ้มกว่า'} · ประหยัด ${z(Math.abs(c.direct-c.combined))} / ${unit(c.key)}`;
  const ratio=c.direct!=null&&c.combined!=null&&c.direct>0?c.combined/c.direct:null;
  // A wide gap is worth calling out: recipes take these 500-1,500 at a time.
  const loud=ratio!=null&&(ratio>=2||ratio<=0.5);
  return `<div class="compare-block"><div class="compare-block-head">${icon(c.key)}<b>${copyName(c.key,name)}</b></div>`
    +`<div class="comparison-row"><span class="item-label"><span>ซื้อก้อนใหญ่ <small>1 ${unit(c.key)}</small></span></span><strong>${z(c.direct)}</strong></div>`
    +`<div class="comparison-row"><span class="item-label"><span>รวมจาก ${copyName(c.ore,roughName)} <small>20 ${unit(c.ore)} → 1 ${unit(c.key)}</small></span></span><strong>${z(c.combined)}</strong></div>`
    +`<div class="compare-verdict${loud?' compare-verdict-loud':''}">${verdict}${loud?`<br><b>ต่างกัน ${(ratio>1?ratio:1/ratio).toFixed(1)} เท่า</b>`:''}</div>`
    +`<p class="field-hint">${c.breakEven==null?'ใส่ราคาก้อนใหญ่ก่อน เพื่อหาจุดคุ้มทุน':`ถ้า ${roughName} ถูกกว่า ${z(c.breakEven)} ต่อ${unit(c.ore)} การรวมเองถึงจะคุ้มกว่า`}</p></div>`;
}
function renderCompare() {
  $('compare-blocks').innerHTML=R.BULK.map(b=>compareBlock(b.key)).join('');
}
// Ore Researcher opens three separate exchange menus and each one carries a
// different set of recipes. The step tells you which menu to pick, using the
// wording that actually shows in the Thai client. `no` is the line's position
// in that dialog, for players who navigate the NPC by number.
const NPC_MENUS = {
  refine:{npc:'Ore Researcher',no:1,th:'สกัดแร่',en:'Gemstone Refining'},
  exchange:{npc:'Ore Researcher',no:2,th:'แลกเปลี่ยนแร่ระดับสูง',en:'Gemstone Exchange'},
  buy:{npc:'Ore Researcher',no:3,th:'ซื้อแร่เพิ่มเติม',en:'Purchase additional gemstone'},
  combine:{npc:'NPC หลอมรวมแร่',hint:'ในห้องอัปเกรดอาวุธ · มี 7 เมือง ดูพิกัดในหัวข้อด้านล่าง'}
};
function npcLine(key) {
  const m=NPC_MENUS[key];
  if(!m)return key;
  if(!m.th)return m.hint?`${m.npc} · <span class="npc-menu-en">${m.hint}</span>`:m.npc;
  return `${m.npc} · <span class="npc-menu-no">ข้อ ${m.no}</span> <b>${m.th}</b> <span class="npc-menu-en">(${m.en})</span>`;
}
const ROUTE_LABELS = {plan:'วิธีที่แนะนำ',shadow:'แลกเองผ่าน Shadowdecon',market:'ซื้อหินจากตลาดเลย'};
// `amount` is the stone-only cost: Reform materials are identical in all three
// routes, so including them would hide the difference being compared.
function routeCard(id, amount, cheapest, body) {
  const best = cheapest === id;
  return `<div class="route-option${best?' route-best':''}"><h3>${ROUTE_LABELS[id]}${best?'<span class="route-badge">ถูกที่สุด</span>':''}</h3><strong class="route-price">${z(amount)}</strong>${body}</div>`;
}
let lastTotal;
// Brief visual cue when the total moves; the text itself is already final, so this is purely cosmetic.
function cueTotalChange(totalEl, card, total) {
  const prev=lastTotal;lastTotal=total;
  if(prev===undefined||prev===total||!totalEl.classList||!card.classList)return;
  totalEl.classList.remove('roll-up','roll-down');card.classList.remove('flash');
  void totalEl.offsetWidth;
  if(total!=null&&prev!=null)totalEl.classList.add(total>prev?'roll-up':'roll-down');
  card.classList.add('flash');
}
function renderResults() {
  const plan=R.calculate(state);
  const routes=R.routeComparison(state,plan), craft=routes.craft, market=routes.market, cheapest=routes.cheapest;
  const planBody=`<p>ค่าซื้อวัตถุดิบเพิ่ม ${z(plan.materialCost-(plan.reformCost||0))}<br>ค่าแลก NPC ${z(plan.fees)}</p><p>${state.mode==='shadow'?'โหมด Shadowdecon · ไม่ใช้ Enhancement Ore':'เลือกทางที่ถูกที่สุดให้ทีละเม็ด · ใช้ของที่มีก่อน แล้วซื้อเฉพาะที่ยังคุ้ม'}</p><small>ยอดเดียวกับ “เงินที่ต้องเตรียมเพิ่ม” ด้านบน · <a href="#recipe">ดูขั้นตอนแลก ↓</a></small>`;
  const craftBody=`<p>ค่าซื้อวัตถุดิบเพิ่ม ${z(craft.materialCost-(craft.reformCost||0))}<br>ค่าแลก NPC ${z(craft.fees)}</p><p>ใช้ Shadowdecon ทั้งหมด ${fmt(craft.shadowRequired)} ก้อน<br>มีอยู่แล้ว ${fmt(craft.used.shadow||0)} · ต้องหาเพิ่ม ${fmt(craft.shadowAdditional)} ก้อน</p><small>ถ้าใช้ทางนี้ล้วน ๆ ไม่แตะ Enhancement Ore เลย${craft.shadowAdditional?` · ที่ขาดมาจากซื้อก้อนใหญ่ ${fmt(craft.buy.shadow||0)} และรวมจาก Rough ${fmt(craft.steps.combineShadow)} ก้อน`:''}</small>`;
  const marketBody=`<p>${copyName(market.key)}</p><p>มีอยู่แล้ว ${fmt(market.owned)} เม็ด<br>ซื้อเพิ่ม ${fmt(market.quantity)} เม็ด · ไม่ต้องแลกกับ NPC</p><small>จ่ายครั้งเดียวจบ ไม่ต้องเดินหา NPC · Shadowdecon และหินระดับล่างที่มีอยู่ไม่ถูกใช้</small>`;
  $('route-comparison-cards').innerHTML=routeCard('plan',plan.stoneTotal,cheapest,planBody)+routeCard('shadow',craft.stoneTotal,cheapest,craftBody)+routeCard('market',market.total,cheapest,marketBody);
  const mine=plan.stoneTotal;
  const others=[['shadow',craft.stoneTotal],['market',market.total]].filter(([,v])=>v!=null&&mine!=null&&v>mine);
  $('route-comparison-verdict').textContent=cheapest==null?'ยังเทียบไม่ได้ · ใส่ราคาหินที่ต้องการ หรือวัตถุดิบที่ยังว่างในตารางราคา'
    :cheapest!=='plan'?`${ROUTE_LABELS[cheapest]} ถูกที่สุด`
    :others.length?`วิธีที่แนะนำถูกกว่า ${others.map(([k,v])=>`${ROUTE_LABELS[k]} ${z(v-mine)}`).join(' · ')}`
    :'ทุกทางจ่ายเท่ากัน · เลือกตามความสะดวก';
  // Say out loud that the compared numbers exclude the Reform bulk materials.
  $('route-reform-note').hidden=!routes.reformCost;
  if(routes.reformCost)$('route-reform-note').textContent=`ทั้ง 3 ทางต้องใช้ Shadowdecon / Zelunium ของสูตรเท่ากัน (${z(routes.reformCost)}) จึงไม่นับรวมในตัวเลขที่เทียบกันนี้`;
  const baseline=R.calculate(state,true);
  $('target-name').innerHTML=`<span class="target-item-icon">${icon(state.type+'Stone'+state.grade)}</span><span>${copyName(state.type+'Stone'+state.grade,fullName(state.type+'Stone'+state.grade))} × ${fmt(state.quantity)}</span>`;
  $('total').textContent=plan.total==null?'รอใส่ราคา':fmt(plan.total);
  cueTotalChange($('total'),$('results'),plan.total);
  $('sticky-total-value').textContent=plan.total==null?'รอใส่ราคา':`${fmt(plan.total)} z`;
  $('unit-cost').textContent=plan.total==null?'ใส่ราคาวัตถุดิบที่ยังขาดในตารางด้านล่าง':state.quantity?`เฉลี่ย ${z(plan.total/state.quantity)} ต่อ 1 เม็ด`:'ใส่จำนวนหินที่ต้องการเพื่อเริ่มคำนวณ';
  $('material-cost').textContent=plan.total==null?`${z(plan.materialCost)} + รอใส่ราคา`:z(plan.materialCost);
  $('npc-cost').textContent=z(plan.fees);
  const saved=baseline.total!=null&&plan.total!=null?baseline.total-plan.total:0;
  $('savings').textContent=saved>0?`↘ ประหยัดไป ${z(saved)} เพราะใช้ของที่มีอยู่แล้ว · ถ้าไม่มีอะไรเลยต้องจ่าย ${z(baseline.total)}`:plan.total==null?'ⓘ ยังรวมยอดไม่ได้ · มีวัตถุดิบที่ต้องซื้อแต่ยังไม่ได้ใส่ราคา':'ⓘ ยอดนี้รวมค่าแลกทุกขั้นแล้ว · ของที่มีอยู่แล้วคิดเป็น 0 z ไม่นับราคาที่เคยซื้อมา';
  // Break the Shadowdecon numbers down by source. "0 ที่ต้องหาเพิ่ม" on its own
  // reads like the plan ignored the Rough Shadowdecon sitting in the inventory,
  // so say plainly that stock already covers it and how much is left over.
  const shadowFromStock=plan.used.shadow||0, shadowFromRough=plan.steps.combineShadow, shadowBought=plan.buy.shadow||0;
  const roughLeft=Math.max(0,state.inventory.shadowOre-(plan.used.shadowOre||0));
  const reformCost=plan.reformCost||0;
  $('reform-cost-row').hidden=!reformCost;
  $('reform-cost').textContent=z(reformCost);
  $('shadow-total').innerHTML=`${fmt(plan.shadowRequired)} <em>ก้อน</em>`;
  // Reform and the stone route draw on the same Shadowdecon, so show the split
  // rather than one number that looks like it was spent twice.
  const split=plan.shadowForReform&&plan.shadowForStones;
  $('shadow-split').hidden=!split;
  if(split)$('shadow-split').innerHTML=`<div><span>ใช้ใน Reform โดยตรง</span><b>${fmt(plan.shadowForReform)}</b></div><div><span>แลกเป็น Low Stone</span><b>${fmt(plan.shadowForStones)}</b></div>`;
  $('shadow-detail-total').textContent=plan.shadowRequired===0?'แผนนี้ไม่ได้ใช้ Shadowdecon'
    :[shadowFromStock&&`ใช้ของที่มี ${fmt(shadowFromStock)}`,shadowFromRough&&`รวมจาก Rough ${fmt(shadowFromRough)}`,shadowBought&&`ซื้อใหม่ ${fmt(shadowBought)}`]
      .filter(Boolean).join(' · ')+' ก้อน · แลกเป็น Low Stone';
  $('shadow-additional').innerHTML=`${fmt(plan.shadowAdditional)} <em>ก้อน</em>`;
  $('shadow-detail').textContent=plan.shadowRequired===0?'ไม่ต้องเตรียม Shadowdecon สำหรับแผนนี้'
    :plan.shadowAdditional===0?`ของที่มีพอแล้ว · ใช้ ${fmt(shadowFromStock+shadowFromRough)} จาก ${fmt(state.inventory.shadow)} ก้อน`+(roughLeft?` · เก็บ Rough ${fmt(roughLeft)} แท่งไว้ได้`:'')
    :[shadowFromRough&&`รวมจาก Rough ${fmt(shadowFromRough)} ก้อน (ใช้ที่มี ${fmt(plan.used.shadowOre||0)}${plan.buy.shadowOre?` + ซื้อเพิ่ม ${fmt(plan.buy.shadowOre)}`:''} แท่ง)`,
      shadowBought&&`ซื้อก้อนใหญ่ ${fmt(shadowBought)} ก้อน`].filter(Boolean).join(' · ');
  const ownedRows=Object.entries(plan.used).filter(([,n])=>n>0);
  $('stock-plan').innerHTML=ownedRows.length?`<div class="stock-plan-heading">✓ แผนนี้ใช้ของที่มีอยู่แล้ว <a href="#recipe">ดูขั้นตอนแลก ↓</a></div>${ownedRows.map(([k,n])=>`<div class="stock-plan-row"><span class="item-label">${icon(k)}${copyName(k)}</span><strong>${fmt(n)} ${unit(k)}</strong></div>`).join('')}`:'';
  $('stock-plan').hidden=!ownedRows.length;
  const rows=Object.entries(plan.buy).filter(([,v])=>v>0);
  $('shopping-count').textContent=`${rows.length} รายการ`;
  $('shopping-list').innerHTML=rows.length?rows.map(([k,n])=>`<div class="shopping-row"><span class="item-glyph" aria-hidden="true">${icon(k)}</span><div class="shopping-item"><b>${copyName(k)}</b><small>${state.prices[k]===''?'ยังไม่ได้ใส่ราคา':`${z(state.prices[k])} / ${unit(k)}`}</small></div><div class="shopping-amount"><strong>${fmt(n)} ${unit(k)}</strong><small>${state.prices[k]===''?'ยังไม่รวมในยอด':z(n*state.prices[k])}</small></div></div>`).join(''):'<div class="empty-message">✓ ของที่มีพอแล้ว ไม่ต้องซื้ออะไรเพิ่ม'+(plan.fees?' · เตรียมแค่เงินค่าแลก NPC':'')+'</div>';
  const configs=[
    ['combineShadow','รวม Rough Shadowdecon → Shadowdecon',20,'Rough Shadowdecon',1,'Shadowdecon',0,'combine'],
    ['combineZelunium','รวม Rough Zelunium → Zelunium',20,'Rough Zelunium',1,'Zelunium',0,'combine'],
    ['lowOre','แลก Low Ore → Low Stone',5,'Low Ore',1,'Low Stone',10000,'refine'],
    ['shadow','แลก Shadowdecon → Low Stone',1,'Shadowdecon',1,'Low Stone',20000,'buy'],
    ['mediumOre','แลก Medium Ore → Medium Stone',5,'Medium Ore',1,'Medium Stone',20000,'refine'],
    ['lowUpgrade','แลก Low Stone → Medium Stone',3,'Low Stone',1,'Medium Stone',10000,'exchange'],
    ['highUpgrade','แลก Medium Stone → High Stone',3,'Medium Stone',1,'High Stone',20000,'exchange'],
    ['supremeUpgrade','แลก High Stone → Supreme Stone',3,'High Stone',1,'Supreme Stone',50000,'exchange']
  ];
  let order=0;
  const recipeItems={combineShadow:['shadowOre','shadow'],combineZelunium:['zeluniumOre','zelunium'],lowOre:[state.type+'OreLow',state.type+'Stone0'],shadow:['shadow',state.type+'Stone0'],mediumOre:[state.type+'OreMedium',state.type+'Stone1'],lowUpgrade:[state.type+'Stone0',state.type+'Stone1'],highUpgrade:[state.type+'Stone1',state.type+'Stone2'],supremeUpgrade:[state.type+'Stone2',state.type+'Stone3']};
  // Spell out where each step's input comes from, so a number like "Medium Ore 5"
  // is not mistaken for five items the user still has to buy.
  const sourceNote=(key,total)=>{
    const {owned,bought,earlier}=R.stepSources(plan,recipeItems[key][0],total);
    const parts=[];
    if(owned)parts.push(`มีอยู่แล้ว ${fmt(owned)}`);
    if(bought)parts.push(`ซื้อเพิ่ม ${fmt(bought)}`);
    if(earlier)parts.push(`จากขั้นก่อนหน้า ${fmt(earlier)}`);
    return parts.length>1?`<span class="recipe-sources">${parts.join(' · ')}</span>`:'';
  };
  $('recipe-steps').innerHTML=configs.filter(([key])=>plan.steps[key]>0).map(([key,title,a,source,b,target,fee,npc])=>{
    const n=plan.steps[key], input=a*n;
    const feeCell=fee?`<div class="recipe-fee">${z(n*fee)}<small>${fmt(n)} ชุด × ${z(fee)}</small></div>`:`<div class="recipe-fee recipe-fee-free">ไม่มีค่าแลก<small>${fmt(n)} ชุด</small></div>`;
    return `<div class="recipe-step"><span class="recipe-order">${++order}</span><div class="recipe-title">${title} <small><span class="recipe-materials"><span>${icon(recipeItems[key][0])}${copyName(recipeItems[key][0],source)} ${fmt(input)}</span><span aria-hidden="true">→</span><span>${icon(recipeItems[key][1])}${copyName(recipeItems[key][1],target)} ${fmt(b*n)}</span></span>${sourceNote(key,input)}${npcLine(npc)}</small></div>${feeCell}</div>`;
  }).join('')||'<div class="empty-message">'+(state.quantity?(rows.length?'✓ ไม่ต้องแลกกับ NPC เลย · ซื้อหินตามรายการด้านบนได้เลย':'✓ มีหินครบแล้ว ไม่ต้องทำอะไรเพิ่ม'):'ใส่จำนวนหินที่ต้องการก่อน แล้วขั้นตอนจะขึ้นตรงนี้')+'</div>';
  markPlanRows(plan);
  // Default prices are a snapshot, not the live market. Point at the ones this
  // plan actually spends money on so the user knows what to double-check.
  const defaultPrices=DEFAULTS.prices;
  const staleRows=rows.filter(([k])=>state.prices[k]!==''&&state.prices[k]===defaultPrices[k]);
  $('price-warning').hidden=!staleRows.length;
  if(staleRows.length)$('price-warning').textContent=`⚠ ยังใช้ราคาเริ่มต้นอยู่ ${staleRows.length} รายการ · เช็กราคาตลาดจริงก่อน ↓`;
  const stockRows=Object.keys(state.inventory).filter(k=>state.inventory[k]>0 && (k.startsWith(state.type)||k.startsWith('shadow')||k.startsWith('zelunium')));
  $('inventory-summary').innerHTML=stockRows.length?'<div class="stock-row"><span>วัตถุดิบ</span><span>ใช้</span><span>คงเหลือ</span></div>'+stockRows.map(k=>`<div class="stock-row"><span>${copyName(k)}</span><span>${fmt(plan.used[k]||0)}</span><span>${fmt(plan.remaining[k]||0)}</span></div>`).join(''):'<p class="field-hint">ยังไม่ได้ใส่ของที่มี</p>';
  $('route-hint').textContent=state.mode==='shadow'?'ใช้หินที่มี + Shadowdecon และ Rough Shadowdecon เท่านั้น · ไม่แตะ Enhancement Ore':'หักของที่มีออกก่อน แล้วเทียบทุกทางทีละเม็ด เลือกทางที่จ่ายเพิ่มน้อยที่สุด';
  renderCompare();
}
function syncControls() {
  document.querySelectorAll('[data-type]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.type===state.type));
    b.querySelector('.item-icon').src=`assets/items/${ITEM_IDS[b.dataset.type+'Stone'+state.grade]}.png`;
  });
  document.querySelectorAll('.stone-ladder li').forEach(li=>{
    const g=Number(li.dataset.grade);
    li.querySelector('img').src=`assets/items/${ITEM_IDS[state.type+'Stone'+g]}.png`;
    li.classList.toggle('is-target',g===state.grade);
    li.classList.toggle('is-path',g<state.grade);
  });
  for(const key of ['grade','quantity','mode']) $(key).value=state[key];
  for(const b of R.BULK) $('reform-'+b.demand).value=state.reform[b.demand];
}
document.addEventListener('click',async e=>{
  const copyButton=e.target.closest('[data-copy-item]');
  if(copyButton){e.preventDefault();await copyItemName(copyButton.dataset.copyItem);return;}
  const copyTextButton=e.target.closest('[data-copy-text]');
  if(copyTextButton){e.preventDefault();await copyPlainText(copyTextButton.dataset.copyText);return;}
  const button=e.target.closest('[data-type]');
  if(button){state.type=button.dataset.type;syncControls();drawInventory();drawPrices();save();renderResults();}
});
let pending;
document.addEventListener('input',e=>{
  const el=e.target;
  if(!el.matches('input'))return;
  if(el.dataset.price){
    const raw=String(el.value).replaceAll(',','').trim();
    const numeric=Number(raw);
    const valid=raw===''||(/^\d+(?:\.\d*)?$/.test(raw)&&Number.isFinite(numeric)&&numeric<=1000000000000);
    el.classList.toggle('input-invalid',!valid);el.setAttribute('aria-invalid',String(!valid));
    if(!valid){$('save-status').textContent='ใส่ราคาเป็นตัวเลข ไม่เกิน 1,000,000,000,000';return;}
    state.prices[el.dataset.price]=numeric>0?numeric:'';
    setPriceValue(el,raw);
    markNoBuy(el);
    save();clearTimeout(pending);pending=setTimeout(renderResults,90);return;
  }
  const valid=el.validity.valid;
  el.classList.toggle('input-invalid',!valid);el.setAttribute('aria-invalid',String(!valid));
  if(!valid){$('save-status').textContent='ใส่ตัวเลขให้อยู่ในช่วงที่กำหนด';return;}
  if(el.dataset.reform)state.reform[el.dataset.reform]=Number(el.value);
  else if(el.dataset.inventory)state.inventory[el.dataset.inventory]=Number(el.value);
  else if(el.id==='quantity')state.quantity=Number(el.value);
  else return;
  save(); clearTimeout(pending);pending=setTimeout(renderResults,90);
});
for(const key of ['grade','mode']) $(key).addEventListener('change',()=>{state[key]=key==='grade'?Number($(key).value):$(key).value;if(key==='grade')syncControls();save();renderResults();});
// Clearing wipes numbers the user typed by hand, so keep one snapshot to undo.
let inventoryUndo=null;
$('clear-inventory').addEventListener('click',()=>{
  inventoryUndo={...state.inventory};
  for(const k of Object.keys(state.inventory))if(k.startsWith(state.type)||k.startsWith('shadow')||k.startsWith('zelunium'))state.inventory[k]=0;
  $('undo-inventory').hidden=false;
  drawInventory();save();renderResults();
  $('save-status').textContent='ล้างจำนวนแล้ว · กด “เลิกทำ” เพื่อคืนค่า';
});
$('undo-inventory').addEventListener('click',()=>{
  if(!inventoryUndo)return;
  state.inventory=inventoryUndo;inventoryUndo=null;
  $('undo-inventory').hidden=true;
  drawInventory();save();renderResults();
  $('save-status').textContent='✓ คืนจำนวนให้แล้ว';
});
$('reset-prices').addEventListener('click',()=>{state.prices={...R.defaults().prices};drawPrices();save();$('save-status').textContent='✓ คืนราคาเริ่มต้นและบันทึกแล้ว';renderResults();});
document.querySelectorAll('.nav-item').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n===a));}));
// Only reveal the sticky summary once the real total card has scrolled away.
// A rAF-throttled scroll listener is used instead of IntersectionObserver so the
// state is also correct after a resize or a jump straight to an anchor.
const stickyBar=$('sticky-total'), totalCard=$('results');
let stickyQueued=false;
function updateSticky() {
  stickyQueued=false;
  if(!stickyBar||!totalCard)return;
  const show=totalCard.getBoundingClientRect().bottom<0;
  if(stickyBar.dataset.visible===String(show))return;
  stickyBar.dataset.visible=String(show);
  stickyBar.setAttribute('aria-hidden',String(!show));
}
function queueSticky() { if(!stickyQueued){stickyQueued=true;requestAnimationFrame(updateSticky);} }
if(stickyBar&&totalCard&&typeof addEventListener==='function') {
  addEventListener('scroll',queueSticky,{passive:true});
  addEventListener('resize',queueSticky,{passive:true});
  updateSticky();
}
function setQuickstart(hidden) {
  quickstartHidden=hidden;
  $('quickstart').classList?.toggle('quickstart-collapsed',hidden);
  $('quickstart-body').hidden=hidden;
  $('quickstart-toggle').textContent=hidden?'แสดงวิธีใช้':'ซ่อน';
  $('quickstart-toggle').setAttribute?.('aria-expanded',String(!hidden));
}
$('quickstart-toggle').addEventListener('click',()=>{
  setQuickstart(!quickstartHidden);
  try{localStorage.setItem(STORAGE_KEY+'.quickstart-hidden',quickstartHidden?'1':'0');}catch{}
});
setQuickstart(quickstartHidden);
$('example-banner').hidden=!showingExample;
syncControls();drawInventory();drawPrices();renderResults();
if(!storageAvailable)$('save-status').textContent='บันทึกไม่ได้ · ข้อมูลอาจหายเมื่อปิดหรือโหลดหน้าใหม่';
