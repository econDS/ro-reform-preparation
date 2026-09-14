const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../calculator.js');
test('two-way comparison deducts stock and includes all crafting fees',()=>{
 const s=R.defaults();s.inventory.shadow=100;
 const r=R.routeComparison(s);
 assert.equal(r.craft.shadowAdditional,2600);assert.equal(r.craft.total,123400000);
 assert.equal(r.market.total,150000000);assert.equal(r.difference,26600000);
 s.inventory.accessoryStone3=100;s.prices.accessoryStone3='';
 const complete=R.routeComparison(s);assert.equal(complete.market.total,0);assert.equal(complete.craft.total,0);
 s.inventory.accessoryStone3=0;
 assert.equal(R.routeComparison(s).difference,null);
 s.prices.accessoryStone3=100000;
 assert.ok(R.routeComparison(s).difference<0);
});
test('100 Supreme from scratch: verified Shadowdecon example',()=>{
 const s=R.defaults();s.mode='shadow';
 const r=R.calculate(s);
 assert.equal(r.total,125300000);assert.equal(r.fees,74000000);assert.equal(r.buy.shadow,2700);
 assert.deepEqual([r.steps.lowUpgrade,r.steps.highUpgrade,r.steps.supremeUpgrade],[900,300,100]);
});
test('rough becomes cheaper and includes partially owned bundles',()=>{
 const s=R.defaults();s.grade=0;s.quantity=2;s.prices.shadowOre=500;s.inventory.shadowOre=21;
 const r=R.calculate(s);assert.equal(r.buy.shadowOre,19);assert.equal(r.steps.combineShadow,2);assert.equal(r.total,49500);
});
test('a partially owned bundle may beat buying a complete stone',()=>{
 const s=R.defaults();s.grade=0;s.quantity=1;s.inventory.shadowOre=19;
 const r=R.calculate(s);assert.equal(r.buy.shadowOre,1);assert.equal(r.total,20950);
});
test('inventory is deducted at every grade and never consumed twice',()=>{
 const s=R.defaults();s.mode='shadow';Object.assign(s.inventory,{accessoryStone3:10,accessoryStone2:20,accessoryStone1:30,accessoryStone0:40,shadow:50});
 const r=R.calculate(s);assert.equal(r.steps.supremeUpgrade,90);assert.equal(r.steps.highUpgrade,250);assert.equal(r.steps.lowUpgrade,720);assert.equal(r.shadowRequired,2120);assert.equal(r.buy.shadow,2070);assert.equal(r.total,98430000);
});
test('medium ore avoids all lower exchanges',()=>{
 const s=R.defaults();s.prices.accessoryOreMedium=1000;
 const r=R.calculate(s);assert.equal(r.buy.accessoryOreMedium,4500);assert.equal(r.shadowRequired,0);assert.equal(r.total,33500000);
});
test('zero and blank prices disable purchases while owned ore remains usable',()=>{
 const s=R.defaults();s.grade=0;s.quantity=1;s.prices.accessoryOreLow=0;s.prices.accessoryStone0='';
 assert.equal(R.calculate(s).total,39000);
 s.prices.accessoryOreLow='';s.prices.shadow='';s.prices.shadowOre='';
 assert.equal(R.calculate(s).total,null);
 s.inventory.accessoryOreLow=5;assert.equal(R.calculate(s).total,10000);
});
test('shadow-only mode ignores enhancement ore and preserves it',()=>{
 const s=R.defaults();s.mode='shadow';s.inventory.accessoryOreMedium=5000;s.prices.accessoryOreMedium=0;
 const r=R.calculate(s);assert.equal(r.total,125300000);assert.equal(r.remaining.accessoryOreMedium,5000);
});
test('target stock, excess ore, zero demand, separate item types',()=>{
 const s=R.defaults();s.inventory.accessoryStone3=110;
 let r=R.calculate(s);assert.equal(r.total,0);assert.equal(r.remaining.accessoryStone3,10);
 s.type='weapon';assert.equal(R.calculate(s).total,110000000);
 s.quantity=0;assert.equal(R.calculate(s).total,0);
});
test('removed Zelunium fields from old storage are discarded',()=>{
 const s=R.sanitize({...R.defaults(),prices:{...R.defaults().prices,zel:100,zelOre:10},inventory:{...R.defaults().inventory,zel:5,zelOre:6}});
 assert.equal('zel' in s.prices,false);assert.equal('zelOre' in s.inventory,false);
 assert.equal(R.calculate(s).total,114473000);
});
test('sanitize corrupted, negative and huge saved data',()=>{
 const s=R.sanitize({type:'bad',quantity:-5,prices:{shadow:-1},inventory:{shadow:Infinity}});
 assert.equal(s.type,'accessory');assert.equal(s.quantity,0);assert.equal(s.prices.shadow,'');assert.equal(s.inventory.shadow,0);
 assert.equal(R.sanitize({quantity:1e15}).quantity,10000);
});
test('weapon medium ore default follows the supplied market screenshot',()=>{
 const s=R.defaults();
 assert.equal(s.prices.weaponOreLow,8000);
 assert.equal(s.prices.weaponOreMedium,18890);
 assert.equal(s.prices.weaponStone0,33750);
 assert.equal(s.prices.weaponStone1,110000);
 assert.equal(s.prices.weaponStone2,358888);
 assert.equal(s.prices.weaponStone3,1290000);
 assert.equal(s.prices.armorStone0,39990);
 assert.equal(s.prices.armorStone1,127000);
 assert.equal(s.prices.armorStone2,409999);
 assert.equal(s.prices.armorStone3,1600000);
 assert.equal(s.prices.armorOreLow,8889);
 assert.equal(s.prices.armorOreMedium,23000);
 assert.equal(s.prices.accessoryOreLow,7800);
 assert.equal(s.prices.accessoryOreMedium,21990);
 assert.equal(s.prices.accessoryStone0,34990);
 assert.equal(s.prices.accessoryStone1,117500);
 assert.equal(s.prices.accessoryStone2,399000);
 assert.equal(s.prices.accessoryStone3,1500000);
 assert.equal(s.prices.shadowOre,950);
});
test('auto mode buys Weapon Low Stone directly at the supplied market price',()=>{
 const s=R.defaults();s.type='weapon';s.grade=0;s.quantity=1;
 const r=R.calculate(s);
 assert.equal(r.buy.weaponStone0,1);assert.equal(r.total,33750);
});
test('auto mode buys Weapon Medium Stone directly at the supplied market price',()=>{
 const s=R.defaults();s.type='weapon';s.grade=1;s.quantity=1;
 const r=R.calculate(s);
 assert.equal(r.buy.weaponStone1,1);assert.equal(r.total,110000);
});
test('auto mode buys Weapon High Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.type='weapon';s.grade=2;s.quantity=1;
 for(const k of ['weaponStone0','weaponStone1','weaponOreLow','weaponOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.weaponStone2,1);assert.equal(r.total,358888);
});
test('auto mode buys Weapon Supreme Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.type='weapon';s.grade=3;s.quantity=1;
 for(const k of ['weaponStone0','weaponStone1','weaponStone2','weaponOreLow','weaponOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.weaponStone3,1);assert.equal(r.total,1290000);
});
test('auto mode buys Armor Low Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.type='armor';s.grade=0;s.quantity=1;s.prices.shadow='';s.prices.shadowOre='';
 const r=R.calculate(s);
 assert.equal(r.buy.armorStone0,1);assert.equal(r.total,39990);
});
test('a user-entered Armor Medium price joins comparison',()=>{
 const s=R.defaults();s.type='armor';s.grade=1;s.quantity=1;s.prices.armorStone1=100000;
 const r=R.calculate(s);
 assert.equal(r.buy.armorStone1,1);assert.equal(r.total,100000);
});
test('auto mode buys Armor High Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.type='armor';s.grade=2;s.quantity=1;
 for(const k of ['armorStone0','armorStone1','armorOreLow','armorOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.armorStone2,1);assert.equal(r.total,409999);
});
test('auto mode buys Armor Supreme Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.type='armor';s.grade=3;s.quantity=1;
 for(const k of ['armorStone0','armorStone1','armorStone2','armorOreLow','armorOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.armorStone3,1);assert.equal(r.total,1600000);
});
test('auto mode buys Accessory Medium Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.grade=1;s.quantity=1;s.prices.accessoryStone0=40000;
 const r=R.calculate(s);
 assert.equal(r.buy.accessoryStone1,1);assert.equal(r.fees,0);assert.equal(r.total,117500);
});
test('auto mode buys Accessory High Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.grade=2;s.quantity=1;
 for(const k of ['accessoryStone0','accessoryStone1','accessoryOreLow','accessoryOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.accessoryStone2,1);assert.equal(r.fees,0);assert.equal(r.total,399000);
});
test('auto mode buys Accessory Supreme Stone directly when it is cheapest',()=>{
 const s=R.defaults();s.grade=3;s.quantity=1;
 for(const k of ['accessoryStone0','accessoryStone1','accessoryStone2','accessoryOreLow','accessoryOreMedium','shadow','shadowOre'])s.prices[k]='';
 const r=R.calculate(s);
 assert.equal(r.buy.accessoryStone3,1);assert.equal(r.fees,0);assert.equal(r.total,1500000);
});
test('auto mode buys Accessory Low Stone directly when it is cheapest',()=>{
 const r=R.calculate(R.defaults());
 assert.equal(r.buy.accessoryStone0,2700);assert.equal(r.shadowRequired,0);
 assert.equal(r.materialCost,94473000);assert.equal(r.fees,20000000);assert.equal(r.total,114473000);
});
// Independent exhaustive solver checks mixed inventory and alternative routes.
function brute(s){
 const inv=s.inventory,p=s.prices,n=s.quantity;let best=Infinity;
 const need=Math.max(0,n-inv.accessoryStone1);
 for(let m=0;m<=need;m++){
  const medCost=20000*m+Math.max(0,5*m-inv.accessoryOreMedium)*p.accessoryOreMedium;
  const lowNeed=Math.max(0,3*(need-m)-inv.accessoryStone0);
  for(let l=0;l<=lowNeed;l++){
   const lowCost=l*10000+Math.max(0,5*l-inv.accessoryOreLow)*p.accessoryOreLow;
   const shadows=lowNeed-l,remaining=Math.max(0,shadows-inv.shadow);
   for(let rough=0;rough<=remaining;rough++){
    const cost=medCost+(need-m)*10000+lowCost+shadows*20000+Math.max(0,rough*20-inv.shadowOre)*p.shadowOre+(remaining-rough)*p.shadow;
    best=Math.min(best,cost);
   }
  }
 }
 return best;
}
test('mixed route optimizer matches exhaustive search in 150 randomized cases',()=>{
 let seed=42;const rand=n=>{seed=(seed*1664525+1013904223)>>>0;return seed%n;};
 for(let i=0;i<150;i++){
 const s=R.defaults();s.grade=1;s.quantity=1+rand(5);
  s.prices.accessoryStone0='';s.prices.accessoryStone1='';
  for(const k of ['accessoryOreLow','accessoryOreMedium','shadow','shadowOre'])s.prices[k]=1+rand(50000);
  for(const k of ['accessoryStone0','accessoryStone1','accessoryOreLow','accessoryOreMedium','shadow','shadowOre'])s.inventory[k]=rand(k.includes('Ore')?30:5);
  assert.equal(R.calculate(s).total,brute(s),JSON.stringify(s));
 }
});

test('three-way comparison names the cheapest route and reuses a supplied plan',()=>{
 const s=R.defaults();
 const plan=R.calculate(s);
 const r=R.routeComparison(s,plan);
 assert.equal(r.plan,plan);
 // The mixed plan beats both single-route options at the default prices.
 assert.equal(r.cheapest,'plan');
 assert.ok(r.plan.total<r.craft.total&&r.plan.total<r.market.total);
 // Buying the target outright wins once it is priced below every crafting route.
 s.prices.accessoryStone3=1;
 assert.equal(R.routeComparison(s).cheapest,'market');
 // Shadowdecon mode makes the craft route and the recommended plan identical.
 const shadow={...R.defaults(),mode:'shadow'};
 const shadowPlan=R.calculate(shadow);
 assert.equal(R.routeComparison(shadow,shadowPlan).craft,shadowPlan);
 // Nothing is comparable when no route can be priced.
 const blank=R.defaults();
 for(const k of R.materialKeys) blank.prices[k]='';
 assert.equal(R.routeComparison(blank).cheapest,null);
});
test('step sources split an exchange input into stock, purchases and earlier steps',()=>{
 const s=R.defaults();s.type='weapon';s.grade=2;s.quantity=2;
 s.prices.shadow=11450;s.prices.shadowOre=850;s.prices.weaponOreMedium=15500;
 s.inventory.weaponOreMedium=2;s.inventory.shadow=38;s.inventory.shadowOre=135;
 const plan=R.calculate(s);
 assert.deepEqual(R.stepSources(plan,'weaponOreMedium',5),{owned:2,bought:3,earlier:0});
 assert.deepEqual(R.stepSources(plan,'shadow',15),{owned:15,bought:0,earlier:0});
 // Medium Stones for the High Stone step all come out of earlier exchanges.
 assert.deepEqual(R.stepSources(plan,'weaponStone1',6),{owned:0,bought:0,earlier:6});
 // The three parts always add up to the step's total input.
 for(const [key,total] of [['weaponOreMedium',5],['shadow',15],['weaponStone0',15]]){
  const {owned,bought,earlier}=R.stepSources(plan,key,total);
  assert.equal(owned+bought+earlier,total);
 }
});

test('Reform demand claims Shadowdecon before the stone route sees it',()=>{
 const base={...R.defaults(),type:'weapon',grade:2,quantity:2,
  prices:{...R.defaults().prices,shadowOre:850,shadow:11450,weaponOreMedium:15500,weaponStone2:358000},
  inventory:{...R.defaults().inventory,weaponOreMedium:2,shadow:38,shadowOre:135}};
 // With no Reform demand the 38 owned stones make Low Stones as before.
 const none=R.calculate({...base,reform:{shadow:0,zelunium:0}});
 assert.equal(none.total,456500);
 assert.equal(none.shadowForStones,15);
 assert.equal(none.shadowForReform,0);
 // A small demand is served from stock and the surplus still feeds the stones.
 const some=R.calculate({...base,reform:{shadow:10,zelunium:0}});
 assert.equal(some.shadowForReform,10);
 assert.equal(some.shadowForStones,15);
 assert.equal(some.shadowRequired,25);
 assert.equal(some.total,456500);
 assert.equal(some.reformCost,0);
 // A demand bigger than stock leaves nothing free, so the stone route drops
 // Shadowdecon entirely and switches to Medium Ore.
 const heavy=R.calculate({...base,reform:{shadow:500,zelunium:0}});
 assert.equal(heavy.shadowForStones,0);
 assert.equal(heavy.steps.mediumOre,6);
 // Same stones are never spent twice: owned + combined + bought covers both.
 assert.equal((heavy.used.shadow||0)+heavy.steps.combineShadow+(heavy.buy.shadow||0),heavy.shadowRequired);
 assert.equal(heavy.reformCost,455*11450+5*850);
 assert.equal(heavy.total,heavy.stoneTotal+heavy.reformCost);
});
test('Zelunium is bought outright when combining rough is the pricier route',()=>{
 const base={...R.defaults(),type:'weapon',grade:0,quantity:0,
  prices:{...R.defaults().prices,zelunium:2495,zeluniumOre:800}};
 // 20 rough at 800 costs 16,000 against 2,495 for the finished stone.
 const buy=R.calculate({...base,reform:{shadow:0,zelunium:500}});
 assert.equal(buy.steps.combineZelunium,0);
 assert.equal(buy.buy.zelunium,500);
 assert.equal(buy.reformCost,500*2495);
 // Rough already in stock is free, so it is combined before anything is bought.
 const stocked=R.calculate({...base,reform:{shadow:0,zelunium:40},
  inventory:{...base.inventory,zelunium:15,zeluniumOre:500}});
 assert.equal(stocked.steps.combineZelunium,25);
 assert.equal(stocked.used.zelunium,15);
 assert.equal(stocked.used.zeluniumOre,500);
 assert.equal(stocked.reformCost,0);
 // Below the break-even price combining wins instead.
 const cheap=R.calculate({...base,reform:{shadow:0,zelunium:10},
  prices:{...base.prices,zeluniumOre:100}});
 assert.equal(cheap.steps.combineZelunium,10);
 assert.equal(cheap.reformCost,10*20*100);
 assert.equal(R.comparison(base,'zelunium').breakEven,124.75);
});
test('route comparison excludes Reform materials so the stone choice stays visible',()=>{
 const s={...R.defaults(),type:'weapon',grade:2,quantity:2,reform:{shadow:500,zelunium:500},
  prices:{...R.defaults().prices,shadowOre:850,shadow:11450,zelunium:2495,zeluniumOre:800,
   weaponOreMedium:15500,weaponStone2:358000},
  inventory:{...R.defaults().inventory,weaponOreMedium:2,shadow:38,shadowOre:135}};
 const plan=R.calculate(s), r=R.routeComparison(s,plan);
 // Every route pays the same Reform bill, so it is reported once and separately.
 assert.equal(r.reformCost,plan.reformCost);
 assert.equal(r.market.reformCost,plan.reformCost);
 assert.ok(plan.reformCost>6000000);
 // The compared numbers are stone-only and still close enough to be meaningful.
 assert.equal(r.plan.stoneTotal,594000);
 assert.equal(r.craft.stoneTotal,666100);
 assert.equal(r.market.total,716000);
 assert.equal(r.cheapest,'plan');
});
