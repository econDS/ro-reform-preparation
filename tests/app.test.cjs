const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const R=require('../calculator.js');
function boot(saved, options={}){
 const elements=new Map(),events={},store=new Map(saved?[['reform-workshop.v1',saved]]:[]);
 function element(id){if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',addEventListener:(event,fn)=>{events[id+':'+event]=fn;}});return elements.get(id);}
 const document={getElementById:element,querySelectorAll:()=>[],addEventListener:(event,fn)=>{events[event]=fn;},...options.document};
 const context=vm.createContext({window:{Reform:R,prompt:options.prompt},navigator:options.navigator||{},document,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},Intl,setTimeout:fn=>fn(),clearTimeout:()=>{}});
 vm.runInContext(fs.readFileSync(require.resolve('../app.js'),'utf8'),context);
 function input(dataset,value){events.input({target:{dataset,value,validity:{valid:true},matches:()=>true,classList:{toggle:()=>{}},setAttribute:()=>{}}});}
 return {element,store,events,input};
}
test('UI initializes with a complete calculation and matching HTML element IDs',()=>{
 const app=boot();assert.equal(app.element('total').textContent,'114,473,000');
 assert.match(app.element('route-comparison-cards').innerHTML,/วิธีที่แนะนำ/);
 assert.match(app.element('route-comparison-cards').innerHTML,/แลกเองผ่าน Shadowdecon/);
 assert.match(app.element('route-comparison-cards').innerHTML,/ซื้อหินจากตลาดเลย/);
 // The recommended mixed plan beats both single-route options at default prices.
 assert.match(app.element('route-comparison-cards').innerHTML,/route-best[^]*วิธีที่แนะนำ/);
 assert.match(app.element('route-comparison-verdict').textContent,/วิธีที่แนะนำถูกกว่า แลกเองผ่าน Shadowdecon 10,827,000 z · ซื้อหินจากตลาดเลย 35,527,000 z/);
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 for(const [,id] of source.matchAll(/\$\('([^']+)'\)/g))assert.ok(html.includes(`id="${id}"`),id);
});
test('wide areas use full item names and the long default-price note is hidden',()=>{
 const app=boot();
 assert.match(app.element('price-fields').innerHTML,/>Weapon Enhancement Ore \(Low Grade\)</);
 assert.match(app.element('shopping-list').innerHTML,/>Accessory Enhancement Stone \(Low Grade\)</);
 assert.match(app.element('inventory-fields').innerHTML,/>Low<\/button>/);
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.doesNotMatch(html,/ราคาเริ่มต้นจากภาพ:/);
});
test('Zelunium is a bulk Reform material with no grade chain of its own',()=>{
 const app=boot();
 const prices=app.element('price-fields').innerHTML;
 assert.match(prices,/data-price="zelunium"/);
 assert.match(prices,/data-price="zeluniumOre"/);
 // Zelunium has no Low/Medium/High/Supreme tiers, unlike Enhancement Stones.
 assert.deepEqual(R.materialKeys.filter(k=>/^zelunium/.test(k)),['zeluniumOre','zelunium']);
 assert.deepEqual(R.BULK.map(b=>b.key),['shadow','zelunium']);
 // The inventory offers exactly the finished stone and its rough piece.
 const inv=app.element('inventory-fields').innerHTML;
 assert.match(inv,/data-inventory="zelunium"/);
 assert.match(inv,/data-inventory="zeluniumOre"/);
 assert.doesNotMatch(inv,/data-inventory="zeluniumStone/);
 // The old short keys stay rejected so stale saved state cannot resurrect them.
 const stale=R.sanitize({prices:{zel:100,zelOre:10},inventory:{zel:5,zelOre:6}});
 assert.equal('zel' in stale.prices,false);
 assert.equal('zelOre' in stale.inventory,false);
});
test('price and inventory inputs persist and survive a new page load',()=>{
 const initial=R.defaults();initial.mode='shadow';
 const app=boot(JSON.stringify(initial));app.input({price:'shadow'},'10000');app.input({inventory:'shadow'},'100');
 assert.equal(app.element('total').textContent,'100,000,000');
 const reloaded=boot(app.store.get('reform-workshop.v1'));
 assert.equal(reloaded.element('total').textContent,'100,000,000');
 assert.match(reloaded.element('inventory-fields').innerHTML,/data-inventory="shadow"[^>]*value="100"/);
});
test('price inputs accept comma separators and save numeric values',()=>{
 const app=boot();app.input({price:'shadow'},'1,234,567');
 assert.equal(JSON.parse(app.store.get('reform-workshop.v1')).prices.shadow,1234567);
 assert.equal(app.element('total').textContent,'114,473,000');
});
test('bulk Reform materials appear first in the price list',()=>{
 const app=boot();
 const html=app.element('price-fields').innerHTML;
 const rough=html.indexOf('data-price="shadowOre"');
 const direct=html.indexOf('data-price="shadow"');
 const firstEnhancementItem=html.indexOf('data-price="weaponOreLow"');
 assert.ok(rough>=0 && rough<direct && direct<firstEnhancementItem);
});
test('reset prices restores every default without clearing inventory',()=>{
 const app=boot();app.input({price:'shadow'},'12345');app.input({price:'armorStone1'},'99999');app.input({inventory:'shadow'},'7');
 app.events['reset-prices:click']();
 assert.match(app.element('price-fields').innerHTML,/data-price="shadow" value="19000"/);
 assert.match(app.element('price-fields').innerHTML,/data-price="armorStone1" value="127000"/);
 const saved=JSON.parse(app.store.get('reform-workshop.v1'));
 assert.equal(saved.inventory.shadow,7);
 assert.equal(saved.prices.shadow,19000);
 assert.equal(app.element('save-status').textContent,'✓ คืนราคาเริ่มต้นและบันทึกแล้ว');
});
test('medium ore default is migrated once without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="weaponOreMedium" value="18890"/);
 const s=R.defaults();s.prices.weaponOreMedium=22222;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="weaponOreMedium" value="22222"/);
});
test('armor low ore default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorOreLow" value="8889"/);
 const s=R.defaults();s.prices.armorOreLow=9999;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorOreLow" value="9999"/);
});
test('armor medium ore default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorOreMedium" value="23000"/);
 const s=R.defaults();s.prices.armorOreMedium=23450;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorOreMedium" value="23450"/);
});
test('accessory low ore default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryOreLow" value="7800"/);
 const s=R.defaults();s.prices.accessoryOreLow=7880;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryOreLow" value="7880"/);
});
test('accessory medium ore default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryOreMedium" value="21990"/);
 const s=R.defaults();s.prices.accessoryOreMedium=22490;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryOreMedium" value="22490"/);
});
test('accessory low Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryStone0" value="34990"/);
 const s=R.defaults();s.prices.accessoryStone0=35000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryStone0" value="35000"/);
});
test('weapon low Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="weaponStone0" value="33750"/);
 const s=R.defaults();s.prices.weaponStone0=33800;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="weaponStone0" value="33800"/);
});
test('weapon medium Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="weaponStone1" value="110000"/);
 const s=R.defaults();s.prices.weaponStone1=117500;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="weaponStone1" value="117500"/);
});
test('weapon high Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="weaponStone2" value="358888"/);
 const s=R.defaults();s.prices.weaponStone2=359000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="weaponStone2" value="359000"/);
});
test('weapon Supreme Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="weaponStone3" value="1290000"/);
 const s=R.defaults();s.prices.weaponStone3=1500000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="weaponStone3" value="1500000"/);
});
test('armor low Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorStone0" value="39990"/);
 const s=R.defaults();s.prices.armorStone0=44890;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorStone0" value="44890"/);
});
test('armor Medium Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorStone1" value="127000"/);
 const s=R.defaults();s.prices.armorStone1=129000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorStone1" value="129000"/);
});
test('armor high Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorStone2" value="409999"/);
 const s=R.defaults();s.prices.armorStone2=1294890;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorStone2" value="1294890"/);
});
test('armor Supreme Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="armorStone3" value="1600000"/);
 const s=R.defaults();s.prices.armorStone3=1700000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="armorStone3" value="1700000"/);
});
test('accessory medium Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryStone1" value="117500"/);
 const s=R.defaults();s.prices.accessoryStone1=117890;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryStone1" value="117890"/);
});
test('accessory high Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryStone2" value="399000"/);
 const s=R.defaults();s.prices.accessoryStone2=399999;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryStone2" value="399999"/);
});
test('accessory Supreme Stone default is migrated without replacing a custom price',()=>{
 const defaults=boot();
 assert.match(defaults.element('price-fields').innerHTML,/data-price="accessoryStone3" value="1500000"/);
 const s=R.defaults();s.prices.accessoryStone3=1600000;
 const custom=boot(JSON.stringify(s));
 assert.match(custom.element('price-fields').innerHTML,/data-price="accessoryStone3" value="1600000"/);
});
test('rough Shadowdecon migrates the old default while preserving other prices',()=>{
 const old=R.defaults();old.prices.shadowOre=1500;
 const migrated=boot(JSON.stringify(old));
 assert.match(migrated.element('price-fields').innerHTML,/data-price="shadowOre" value="950"/);
 const custom=R.defaults();custom.prices.shadowOre=1400;
 const preserved=boot(JSON.stringify(custom));
 assert.match(preserved.element('price-fields').innerHTML,/data-price="shadowOre" value="1400"/);
});
test('malformed storage falls back to working defaults',()=>{
 const app=boot('{broken');assert.equal(app.element('total').textContent,'114,473,000');
 assert.match(app.element('save-status').textContent,/บันทึกไม่ได้/);
});
test('saved zero medium ore price uses owned low ore and buys remaining Low Stones',()=>{
 const s=R.defaults();s.prices.accessoryOreMedium=0;s.prices.accessoryStone0='';s.inventory.accessoryOreLow=1000;
 const app=boot(JSON.stringify(s));
 assert.equal(app.element('total').textContent,'109,475,000');
 assert.match(app.element('shadow-total').innerHTML,/^0 /);
 assert.match(app.element('stock-plan').innerHTML,/Accessory Enhancement Ore \(Low Grade\)/);
 assert.match(app.element('stock-plan').innerHTML,/1,000 ชิ้น/);
 assert.match(app.element('recipe-steps').innerHTML.replace(/<[^>]*>/g,''),/Low Ore 1,000/);
 assert.match(app.element('recipe-steps').innerHTML.replace(/<[^>]*>/g,''),/Low Stone 200/);
 assert.match(app.element('shopping-list').innerHTML,/Accessory Enhancement Stone \(Low Grade\)/);
 assert.doesNotMatch(app.element('shopping-list').innerHTML,/Accessory Enhancement Ore \(Medium Grade\)/);
});
function clickCopy(app,key){return app.events.click({target:{closest:selector=>selector==='[data-copy-item]'?{dataset:{copyItem:key}}:null},preventDefault:()=>{}});}
test('item clicks copy complete names without quantity or price',async()=>{
 const copied=[];
 const app=boot(null,{navigator:{clipboard:{writeText:async text=>copied.push(text)}}});
 await clickCopy(app,'accessoryOreLow');
 await clickCopy(app,'weaponStone3');
 await clickCopy(app,'shadowOre');
 assert.deepEqual(copied,['Accessory Enhancement Ore (Low Grade)','Weapon Enhancement Stone (Supreme Grade)','Rough Shadowdecon']);
 assert.equal(app.element('copy-notice').textContent,'คัดลอกแล้ว: Rough Shadowdecon');
 assert.match(app.element('price-fields').innerHTML,/data-copy-item="accessoryOreLow"/);
});
test('clipboard permission failure falls back to selection copy and restores focus',async()=>{
 let removed=false,focused=false,copied;
 const field={select(){},setSelectionRange(){},remove(){removed=true;}};
 const app=boot(null,{navigator:{clipboard:{writeText:async()=>{throw Error('Denied');}}},document:{
  activeElement:{focus(){focused=true;}},createElement:()=>field,body:{appendChild(){}},execCommand:cmd=>{assert.equal(cmd,'copy');copied=field.value;return true;}
 }});
 await clickCopy(app,'armorStone2');
 assert.equal(copied,'Armor Enhancement Stone (High Grade)');assert.ok(removed);assert.ok(focused);
});
test('if both copy methods fail, show manual copy text instead of claiming success',async()=>{
 let offered;
 const app=boot(null,{prompt:(_message,text)=>{offered=text;},document:{createElement:()=>({select(){},setSelectionRange(){},remove(){}}),body:{appendChild(){}},execCommand:()=>false}});
 await clickCopy(app,'shadow');
 assert.equal(offered,'Shadowdecon');assert.doesNotMatch(app.element('copy-notice').textContent,/คัดลอกแล้ว/);
});

test('exchange steps name their sources and skip the fee column when free',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,mode:'auto',
  prices:{shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}}));
 const steps=app.element('recipe-steps').innerHTML.replace(/<[^>]*>/g,' ');
 assert.match(steps,/แลก Shadowdecon → Low Stone/);
 assert.match(steps,/มีอยู่แล้ว 2 · ซื้อเพิ่ม 3/);
 // Every step reads "แลก INPUT → OUTPUT" so input and output are never confused.
 assert.doesNotMatch(app.element('recipe-steps').innerHTML,/แลก Medium Stone <\/|>แลก High Stone </);
 const free=boot(JSON.stringify({type:'weapon',grade:0,quantity:1,mode:'shadow',
  prices:{shadowOre:850},inventory:{shadowOre:20}}));
 // Combining Rough Shadowdecon costs no NPC fee, so no "0 z" fee row is shown.
 assert.match(free.element('recipe-steps').innerHTML,/recipe-fee-free/);
 assert.match(free.element('recipe-steps').innerHTML,/ไม่มีค่าแลก/);
});
test('a price of zero is shown as a no-buy field instead of being blanked out',()=>{
 const toggles=[];
 const app=boot();
 const el={dataset:{price:'weaponOreLow'},value:'0',validity:{valid:true},matches:()=>true,
  classList:{toggle:(cls,on)=>toggles.push([cls,on])},setAttribute:()=>{},
  closest:()=>({classList:{toggle:(cls,on)=>toggles.push(['row:'+cls,on])}})};
 app.events.input({target:el});
 assert.equal(el.value,'0');
 assert.deepEqual(JSON.parse(app.store.get('reform-workshop.v1')).prices.weaponOreLow,'');
 assert.ok(toggles.some(([cls,on])=>cls==='price-off'&&on===true));
 assert.ok(toggles.some(([cls,on])=>cls==='row:price-row-off'&&on===true));
});
test('clearing the inventory can be undone',()=>{
 const app=boot(JSON.stringify({type:'weapon',inventory:{weaponOreLow:7,shadow:3}}));
 assert.equal(JSON.parse(app.store.get('reform-workshop.v1')).inventory.weaponOreLow,7);
 app.events['clear-inventory:click']();
 assert.equal(JSON.parse(app.store.get('reform-workshop.v1')).inventory.weaponOreLow,0);
 assert.equal(app.element('undo-inventory').hidden,false);
 app.events['undo-inventory:click']();
 const restored=JSON.parse(app.store.get('reform-workshop.v1')).inventory;
 assert.equal(restored.weaponOreLow,7);
 assert.equal(restored.shadow,3);
 assert.equal(app.element('undo-inventory').hidden,true);
});

test('Shadowdecon cards say where the stones come from, not just a bare zero',()=>{
 const stock={type:'weapon',grade:2,quantity:2,mode:'auto',
  prices:{shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000}};
 // Plenty in stock: explain that stock covers it and that the Rough is untouched.
 const enough=boot(JSON.stringify({...stock,inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}}));
 assert.equal(enough.element('shadow-detail-total').textContent,'ใช้ของที่มี 15 ก้อน · แลกเป็น Low Stone');
 assert.equal(enough.element('shadow-detail').textContent,'ของที่มีพอแล้ว · ใช้ 15 จาก 38 ก้อน · เก็บ Rough 135 แท่งไว้ได้');
 // Short on finished stones: name both the Rough combine and the purchase.
 const short=boot(JSON.stringify({...stock,inventory:{weaponOreMedium:2,shadow:0,shadowOre:135}}));
 assert.equal(short.element('shadow-detail-total').textContent,'รวมจาก Rough 7 · ซื้อใหม่ 2 ก้อน · แลกเป็น Low Stone');
 assert.equal(short.element('shadow-detail').textContent,'รวมจาก Rough 7 ก้อน (ใช้ที่มี 135 + ซื้อเพิ่ม 5 แท่ง) · ซื้อก้อนใหญ่ 2 ก้อน');
 // A plan that never touches Shadowdecon says so instead of showing "0 ก้อน" alone.
 const none=boot(JSON.stringify({...stock,inventory:{}}));
 assert.equal(none.element('shadow-detail-total').textContent,'แผนนี้ไม่ได้ใช้ Shadowdecon');
 assert.equal(none.element('shadow-detail').textContent,'ไม่ต้องเตรียม Shadowdecon สำหรับแผนนี้');
});

test('the price table groups by stone type and folds the inactive types away',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,
  prices:{shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}}));
 const html=app.element('price-fields').innerHTML;
 const groups=[...html.matchAll(/class="price-group-label">([^<]+)</g)].map(m=>m[1]);
 assert.deepEqual(groups,['SHADOWDECON / ZELUNIUM','WEAPON ENHANCEMENT','ราคาของประเภทอื่น']);
 // Shared materials first, then the active type, then everything else folded.
 const order=[...html.matchAll(/data-price-row="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(order.slice(0,10),['shadowOre','shadow','zeluniumOre','zelunium',
  'weaponOreLow','weaponOreMedium','weaponStone0','weaponStone1','weaponStone2','weaponStone3']);
 assert.equal(order.length,R.materialKeys.length);
 assert.deepEqual([...order].sort(),[...R.materialKeys].sort());
 // Only the other types sit inside the <details>, so nothing needed now is hidden.
 const folded=html.slice(html.indexOf('price-group-folded'));
 assert.doesNotMatch(folded,/data-price-row="weapon|data-price-row="shadow|data-price-row="zelunium/);
 assert.match(folded,/data-price-row="armorStone0"/);
 assert.match(folded,/data-price-row="accessoryStone3"/);
});
test('switching stone type regroups the price table and keeps every price',()=>{
 const clicks={};
 const app=boot(JSON.stringify({type:'weapon',prices:{weaponStone2:358000,armorStone2:409999}}),
  {document:{querySelectorAll:sel=>sel==='[data-type]'?[{dataset:{type:'weapon'},setAttribute(){},querySelector:()=>({})}]:[]}});
 app.events.click({target:{closest:sel=>sel==='[data-type]'?{dataset:{type:'armor'}}:null},preventDefault(){}});
 const html=app.element('price-fields').innerHTML;
 assert.match(html,/class="price-group-label">ARMOR ENHANCEMENT</);
 // The weapon prices are still there, just moved into the folded section.
 assert.match(html,/data-price="weaponStone2" value="358000"/);
 assert.match(html,/data-price="armorStone2" value="409999"/);
 assert.equal(JSON.parse(app.store.get('reform-workshop.v1')).prices.weaponStone2,358000);
});

test('in-game commands and NPC names are copyable verbatim',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.ok(html.includes('data-copy-text="/navi itemmall 16/48"'));
 // /navi reaches the first room only; the second room has to be walked.
 assert.match(html,/ในห้องที่สองใช้ <code>\/navi<\/code> หรือค้นหา NPC ไม่ได้ ต้องเดินหาเอง/);
 assert.doesNotMatch(html,/Cash Item Guide/);
 // Copying goes through the same clipboard path as item names.
 const copied=[];
 const app=boot(undefined,{navigator:{clipboard:{writeText:async t=>{copied.push(t);}}}});
 app.events.click({target:{closest:sel=>sel==='[data-copy-text]'?{dataset:{copyText:'/navi itemmall 16/48'}}:null},preventDefault(){}});
 return new Promise(r=>setImmediate(()=>{
  assert.deepEqual(copied,['/navi itemmall 16/48']);
  assert.equal(app.element('copy-notice').textContent,'คัดลอกแล้ว: /navi itemmall 16/48');
  r();
 }));
});

test('each exchange step names the Ore Researcher menu it belongs to',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,
  prices:{shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}}));
 const steps=app.element('recipe-steps').innerHTML.split('<div class="recipe-step">').slice(1);
 const menuOf=html=>{const m=html.match(/npc-menu-no">ข้อ (\d)<\/span> <b>([^<]+)<\/b>/);return m?`${m[1]} ${m[2]}`:undefined;};
 const titleOf=html=>(html.match(/class="recipe-title">([^<]+)</)||[])[1].trim();
 // Shadowdecon and ore refining both make stones but live in different menus,
 // so the menu name has to follow the step, not the tier it produces.
 assert.deepEqual(steps.map(h=>[titleOf(h),menuOf(h)]),[
  ['แลก Shadowdecon → Low Stone','3 ซื้อแร่เพิ่มเติม'],
  ['แลก Medium Ore → Medium Stone','1 สกัดแร่'],
  ['แลก Low Stone → Medium Stone','2 แลกเปลี่ยนแร่ระดับสูง'],
  ['แลก Medium Stone → High Stone','2 แลกเปลี่ยนแร่ระดับสูง']]);
 // The English label stays as a secondary hint for non-Thai clients.
 assert.match(steps[1],/npc-menu-en">\(Gemstone Refining\)/);
 // A batch of exchanges is one trade with a quantity, not N separate trades.
 assert.match(steps[0],/15 ชุด × 20,000 z/);
 // Combining Rough Shadowdecon is a different NPC and has no menu to pick.
 const rough=boot(JSON.stringify({type:'weapon',grade:0,quantity:1,mode:'shadow',
  prices:{shadowOre:850},inventory:{shadowOre:20}}));
 const combine=rough.element('recipe-steps').innerHTML.split('<div class="recipe-step">')[1];
 assert.match(combine,/NPC หลอมรวมแร่/);
 assert.doesNotMatch(combine,/npc-menu-no/);
});

test('the Rough Shadowdecon combine NPC is listed for every town with copyable /navi',()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 const npcs=[['Alberta','Satana','alberta_in 24/63'],['Prontera','Polinn Polath','prt_in 64/57'],
  ['Morroc','Marik Meloy','morocc_in 64/37'],['Payon','Jihu Jeyorr','payon 142/179'],
  ['Juno','Dimille Maar','yuno_in01 164/31'],['Einbroch','Galan Gweniha','ein_in01 30/88'],
  ['Lighthalzen','Nemill Newton','lhz_in02 275/23']];
 for(const [town,name,coords] of npcs) {
  assert.ok(html.includes(`>${town}<`),town);
  assert.ok(html.includes(`<b>${name}</b>`),name);
  assert.ok(html.includes(`data-copy-text="/navi ${coords}"`),coords);
 }
 assert.equal([...html.matchAll(/class="npc-town"/g)].length,npcs.length);
 // The same NPC combines Rough Zelunium, so that step points here too.
 assert.match(html,/Rough Zelunium/);
});

test('the Reform material fields drive the plan and are saved',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,
  prices:{shadowOre:850,shadow:11450,zelunium:2495,zeluniumOre:800,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}}));
 app.input({reform:'zelunium'},'500');
 assert.equal(JSON.parse(app.store.get('reform-workshop.v1')).reform.zelunium,500);
 // The Zelunium bill lands in the total and is called out as a separate line.
 assert.equal(app.element('total').textContent,'1,704,000');
 assert.equal(app.element('reform-cost').textContent,'1,247,500 z');
 assert.equal(app.element('reform-cost-row').hidden,false);
 // ...but never inside the route comparison, which stays stone-only.
 assert.match(app.element('route-comparison-cards').innerHTML,/route-price">456,500 z/);
 assert.equal(app.element('route-reform-note').hidden,false);
 assert.match(app.element('route-reform-note').textContent,/1,247,500 z/);
});
test('Shadowdecon split is shown only when both demands draw on it',()=>{
 const withPrices={type:'weapon',grade:2,quantity:2,
  prices:{shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135}};
 const both=boot(JSON.stringify({...withPrices,reform:{shadow:10,zelunium:0}}));
 assert.equal(both.element('shadow-total').innerHTML,'25 <em>ก้อน</em>');
 assert.equal(both.element('shadow-split').hidden,false);
 assert.match(both.element('shadow-split').innerHTML,/ใช้ใน Reform โดยตรง<\/span><b>10<\/b>/);
 assert.match(both.element('shadow-split').innerHTML,/แลกเป็น Low Stone<\/span><b>15<\/b>/);
 // Only one demand: no split to draw.
 const stonesOnly=boot(JSON.stringify({...withPrices,reform:{shadow:0,zelunium:0}}));
 assert.equal(stonesOnly.element('shadow-split').hidden,true);
});
test('combining Rough Zelunium is its own free step at the same NPC',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:0,quantity:0,reform:{shadow:0,zelunium:40},
  prices:{zelunium:2495,zeluniumOre:800},inventory:{zelunium:15,zeluniumOre:500}}));
 const step=app.element('recipe-steps').innerHTML.split('<div class="recipe-step">')[1];
 assert.match(step,/รวม Rough Zelunium → Zelunium/);
 assert.match(step,/Rough Zelunium<\/button> 500/);
 assert.match(step,/Zelunium<\/button> 25/);
 assert.match(step,/ไม่มีค่าแลก/);
 assert.match(step,/NPC หลอมรวมแร่/);
 // Everything came from stock, so there is nothing left to buy.
 assert.equal(app.element('total').textContent,'0');
});

test('every material in the model has a verified item icon on disk',()=>{
 const app=boot();
 const source=fs.readFileSync(require.resolve('../app.js'),'utf8');
 const ids=Object.fromEntries([...source.matchAll(/(\w+):(\d{4,7})\b/g)].map(m=>[m[1],m[2]]));
 for(const key of R.inventoryKeys) {
  assert.ok(ids[key],`no item id for ${key}`);
  assert.ok(fs.existsSync(require.resolve(`../assets/items/${ids[key]}.png`)),`missing icon ${ids[key]}.png`);
 }
 // Zelunium ids come from irowiki's Item Reform page, next to Shadowdecon's.
 assert.equal(ids.shadowOre,'25728');
 assert.equal(ids.shadow,'25729');
 assert.equal(ids.zeluniumOre,'25730');
 assert.equal(ids.zelunium,'25731');
 // With every id known, no material falls back to the placeholder glyph.
 assert.doesNotMatch(app.element('price-fields').innerHTML,/item-icon-blank/);
 assert.doesNotMatch(app.element('inventory-fields').innerHTML,/item-icon-blank/);
});

test('each material keeps one Thai classifier everywhere it is counted',()=>{
 const app=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,reform:{shadow:120,zelunium:500},
  prices:{shadowOre:850,shadow:11450,zelunium:2495,zeluniumOre:800,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{weaponOreMedium:2,shadow:38,shadowOre:135,zelunium:15,zeluniumOre:500}}));
 // Pull every "<key> ... <n> <classifier>" pairing out of both lists.
 const pairs=html=>[...html.matchAll(/data-copy-item="(\w+)"[^]*?<strong>[\d,]+ (\S+?)<\/strong>/g)]
   .map(m=>[m[1],m[2]]);
 const seen=new Map();
 for(const list of ['shopping-list','stock-plan'])
  for(const [key,cls] of pairs(app.element(list).innerHTML)) {
   if(seen.has(key)) assert.equal(seen.get(key),cls,`${key} counted two ways`);
   seen.set(key,cls);
  }
 assert.deepEqual(Object.fromEntries(seen),{
  weaponOreMedium:'ชิ้น', shadow:'ก้อน', shadowOre:'แท่ง', zelunium:'ก้อน', zeluniumOre:'ก้อน'});
 // Prices use the same classifier as the amount right beside them.
 assert.match(app.element('shopping-list').innerHTML,/11,450 z \/ ก้อน/);
 assert.match(app.element('shopping-list').innerHTML,/850 z \/ แท่ง/);
 // Enhancement Stones are cut gems, so เม็ด — the same word the target field uses.
 const stones=boot(JSON.stringify({type:'weapon',grade:2,quantity:2,prices:{weaponStone2:1}}));
 assert.deepEqual(pairs(stones.element('shopping-list').innerHTML),[['weaponStone2','เม็ด']]);
 assert.match(stones.element('shopping-list').innerHTML,/1 z \/ เม็ด/);
 // Headings that cover every material at once must not name one classifier.
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
 assert.match(html,/ราคา \/ หน่วย \(z\)/);
 assert.match(html,/ใส่ราคาต่อหน่วย \(z\)/);
 assert.doesNotMatch(html,/ราคาต่อชิ้น|ราคา \/ ชิ้น/);
});
