(function (root) {
  'use strict';
  const TYPES = ['weapon', 'armor', 'accessory'];
  const GRADES = ['Low', 'Medium', 'High', 'Supreme'];
  const number = value => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : 0;
  const price = value => value === '' || value == null || !Number.isFinite(Number(value)) || Number(value) <= 0 ? Infinity : Number(value);
  const count = value => Math.floor(number(value));
  const materialKeys = ['shadowOre', 'shadow', 'zeluniumOre', 'zelunium'].concat(
    TYPES.flatMap(t => [`${t}OreLow`, `${t}OreMedium`]),
    ['weaponStone0', 'weaponStone1', 'weaponStone2', 'weaponStone3', 'armorStone0', 'armorStone1', 'armorStone2', 'armorStone3', 'accessoryStone0', 'accessoryStone1', 'accessoryStone2', 'accessoryStone3']
  );
  const inventoryKeys = TYPES.flatMap(t => GRADES.map((_, i) => `${t}Stone${i}`).concat([`${t}OreLow`, `${t}OreMedium`])).concat(['shadowOre', 'shadow', 'zeluniumOre', 'zelunium']);
  // Materials a Reform recipe consumes directly, on top of the Enhancement
  // Stones. They have no upgrade chain: you either own them, buy them, or
  // combine 20 rough pieces into one.
  const BULK = [
    {key:'shadow', ore:'shadowOre', demand:'shadow'},
    {key:'zelunium', ore:'zeluniumOre', demand:'zelunium'}
  ];
  function defaults() {
    return {type: 'accessory', grade: 3, quantity: 100, mode: 'auto',
      prices: Object.fromEntries(materialKeys.map(k => [k,
        k === 'weaponOreLow' ? 8000 :
        k === 'weaponOreMedium' ? 18890 :
        k === 'armorOreLow' ? 8889 :
        k === 'armorOreMedium' ? 23000 :
        k === 'accessoryOreLow' ? 7800 :
        k === 'accessoryOreMedium' ? 21990 :
        k === 'weaponStone0' ? 33750 :
        k === 'weaponStone1' ? 110000 :
        k === 'weaponStone2' ? 358888 :
        k === 'weaponStone3' ? 1290000 :
        k === 'armorStone0' ? 39990 :
        k === 'armorStone1' ? 127000 :
        k === 'armorStone2' ? 409999 :
        k === 'armorStone3' ? 1600000 :
        k === 'accessoryStone0' ? 34990 :
        k === 'accessoryStone1' ? 117500 :
        k === 'accessoryStone2' ? 399000 :
        k === 'accessoryStone3' ? 1500000 :
        k === 'shadow' ? 19000 :
        k === 'shadowOre' ? 950 :
        k === 'zelunium' ? 2495 :
        k === 'zeluniumOre' ? 800 : ''])),
      reform: {shadow: 0, zelunium: 0},
      inventory: Object.fromEntries(inventoryKeys.map(k => [k, 0]))};
  }
  function sanitize(raw) {
    const d = defaults();
    if (!raw || typeof raw !== 'object') return d;
    if (TYPES.includes(raw.type)) d.type = raw.type;
    if ([0,1,2,3].includes(Number(raw.grade))) d.grade = Number(raw.grade);
    d.quantity = Math.min(10000, Math.max(0, count(raw.quantity ?? 100)));
    d.mode = raw.mode === 'shadow' ? 'shadow' : 'auto';
    for (const k of materialKeys) d.prices[k] = price(raw.prices?.[k] ?? d.prices[k]) === Infinity ? '' : Math.min(1e12, number(raw.prices?.[k] ?? d.prices[k]));
    for (const k of inventoryKeys) d.inventory[k] = Math.min(1e9, count(raw.inventory?.[k]));
    for (const b of BULK) d.reform[b.demand] = Math.min(1e6, count(raw.reform?.[b.demand]));
    return d;
  }
  // Each source has a nondecreasing marginal cost. Merge those streams to
  // minimize cash spending, including partial ore bundles and existing stock.
  function calculate(input, empty = false) {
    const s = sanitize(input), t = s.type, inv = empty ? {} : s.inventory;
    const stock = k => count(inv[k]);
    const p = k => price(s.prices[k]);
    const steps = {shadow:0, lowOre:0, mediumOre:0, lowUpgrade:0, highUpgrade:0, supremeUpgrade:0, combineShadow:0, combineZelunium:0};
    // Prefix sums are cumulative and nondecreasing, so the cost of the next
    // three stones is one subtraction instead of re-summing a sliced window.
    const window3 = (prefix, from) => {
      const hi = prefix[from+3];
      return hi === undefined || hi === Infinity ? Infinity : hi - prefix[from];
    };
    const used = {}, buy = {};
    const add = (obj, key, n) => { if (n) obj[key] = (obj[key] || 0) + n; };
    let fees = 0, materialCost = 0;
    // Draws stock down across successive calls, so the same ore pool can serve
    // the Reform demand first and the stone route with whatever is left.
    const left = {};
    function consume(k, n) {
      if (left[k] === undefined) left[k] = stock(k);
      const owned = Math.min(left[k], n); left[k] -= owned;
      add(used,k,owned); add(buy,k,n-owned); return n-owned;
    }
    const maxHigh = s.grade === 3 ? s.quantity*3 : s.grade === 2 ? s.quantity : 0;
    const maxMedium = s.grade >= 2 ? maxHigh*3 : s.grade === 1 ? s.quantity : 0;
    const maxLow = s.grade === 0 ? s.quantity : maxMedium*3;
    // Hoist key strings and stock lookups: the tier loops run up to 27x the
    // target quantity, so per-iteration template literals dominated the cost.
    const kStone0=`${t}Stone0`, kStone1=`${t}Stone1`, kStone2=`${t}Stone2`, kStone3=`${t}Stone3`;
    const kOreLow=`${t}OreLow`, kOreMedium=`${t}OreMedium`;
    const nStone0=stock(kStone0), nStone1=stock(kStone1), nStone2=stock(kStone2);
    const nOreLow=stock(kOreLow), nOreMedium=stock(kOreMedium);
    const nShadow=stock('shadow'), nShadowOre=stock('shadowOre');
    const shadowOnly=s.mode==='shadow';
    const pStone0=shadowOnly?Infinity:p(kStone0), pStone1=shadowOnly?Infinity:p(kStone1);
    const pStone2=shadowOnly?Infinity:p(kStone2);
    const pOreLow=p(kOreLow), pOreMedium=p(kOreMedium);
    const pShadow=p('shadow'), pShadowOre=p('shadowOre');
    let lowOreN = 0, shadowN = 0, roughN = 0, directN = 0;
    const lowChoices = [], lowPrefix = [0];
    let shadowCost=0, shadowSource='';
    function nextShadow() {
      if (shadowN < nShadow) { shadowCost=20000; shadowSource='shadowOwned'; return; }
      const roughMissing = Math.max(0, 20*(roughN+1)-nShadowOre) - Math.max(0, 20*roughN-nShadowOre);
      const roughCost = roughMissing === 0 ? 0 : roughMissing * pShadowOre;
      if (roughCost < pShadow) { shadowCost=20000+roughCost; shadowSource='rough'; }
      else { shadowCost=20000+pShadow; shadowSource='direct'; }
    }
    // Reform consumes Shadowdecon directly and that demand cannot be skipped, so
    // it claims the cheapest units first. The stone route then prices its own
    // Shadowdecon against whatever is left, which is what makes the two demands
    // add up instead of both spending the same stock.
    let reformShadowOwned = 0, reformShadowRough = 0, reformShadowDirect = 0;
    for (let i=0; i<s.reform.shadow; i++) {
      nextShadow();
      shadowN++;
      if (shadowSource === 'shadowOwned') reformShadowOwned++;
      else if (shadowSource === 'rough') { roughN++; reformShadowRough++; }
      else reformShadowDirect++;
    }
    for (let i=0; i<maxLow; i++) {
      if (i < nStone0) { lowChoices.push('owned'); lowPrefix.push(lowPrefix[i]); continue; }
      const missing = Math.max(0,5*(lowOreN+1)-nOreLow)-Math.max(0,5*lowOreN-nOreLow);
      const oreCost = shadowOnly ? Infinity : 10000 + (missing === 0 ? 0 : missing*pOreLow);
      const marketCost = pStone0;
      nextShadow();
      if (marketCost < oreCost && marketCost < shadowCost) { lowChoices.push('marketLow'); lowPrefix.push(lowPrefix[i]+marketCost); }
      else if (oreCost < shadowCost) { lowOreN++; lowChoices.push('ore'); lowPrefix.push(lowPrefix[i]+oreCost); }
      else { shadowN++; if (shadowSource==='rough') roughN++; if(shadowSource==='direct') directN++; lowChoices.push(shadowSource); lowPrefix.push(lowPrefix[i]+shadowCost); }
    }
    const mediumChoices=[], mediumPrefix=[0];
    let buildLowCount=0, buildMediumOres=0;
    for (let i=0; i<maxMedium; i++) {
      if(i<nStone1){mediumChoices.push('ownedMedium');mediumPrefix.push(mediumPrefix[i]);continue;}
      const missing = Math.max(0,5*(buildMediumOres+1)-nOreMedium)-Math.max(0,5*buildMediumOres-nOreMedium);
      const oreCost = shadowOnly ? Infinity : 20000+(missing===0 ? 0 : missing*pOreMedium);
      const marketCost = pStone1;
      const upgradeCost = 10000 + window3(lowPrefix, buildLowCount);
      if (marketCost < oreCost && marketCost < upgradeCost) {mediumChoices.push('marketMedium');mediumPrefix.push(mediumPrefix[i]+marketCost);}
      else if (oreCost < upgradeCost) {buildMediumOres++;mediumChoices.push('mediumOre');mediumPrefix.push(mediumPrefix[i]+oreCost);}
      else {buildLowCount+=3;mediumChoices.push('lowUpgrade');mediumPrefix.push(mediumPrefix[i]+upgradeCost);}
    }
    const highChoices=[],highPrefix=[0];
    let buildMediumCount=0;
    for(let i=0;i<maxHigh;i++){
      if(i<nStone2){highChoices.push('ownedHigh');highPrefix.push(highPrefix[i]);continue;}
      const marketCost=pStone2;
      const upgradeCost=20000+window3(mediumPrefix, buildMediumCount);
      if(marketCost<upgradeCost){highChoices.push('marketHigh');highPrefix.push(highPrefix[i]+marketCost);}
      else{buildMediumCount+=3;highChoices.push('highUpgrade');highPrefix.push(highPrefix[i]+upgradeCost);}
    }
    let highCount=s.grade===2?s.quantity:0,ownedSupreme=0,boughtSupreme=0;
    if(s.grade===3)for(let i=0;i<s.quantity;i++){
      if(i<stock(kStone3)){ownedSupreme++;continue;}
      const marketCost=shadowOnly?Infinity:p(kStone3);
      const upgradeCost=50000+window3(highPrefix, highCount);
      if(marketCost<upgradeCost)boughtSupreme++;
      else{highCount+=3;steps.supremeUpgrade++;}
    }
    add(used,kStone3,ownedSupreme);add(buy,kStone3,boughtSupreme);
    let mediumCount=s.grade===1?s.quantity:0, ownedHigh=0, boughtHigh=0;
    for(let i=0;i<highCount;i++){
      const c=highChoices[i];
      if(c==='ownedHigh')ownedHigh++;else if(c==='marketHigh')boughtHigh++;else{steps.highUpgrade++;mediumCount+=3;}
    }
    add(used,kStone2,ownedHigh);add(buy,kStone2,boughtHigh);
    let ownedMedium=0,boughtMedium=0,mediumOres=0,lowCount=s.grade===0?s.quantity:0;
    for(let i=0;i<mediumCount;i++){
      const c=mediumChoices[i];
      if(c==='ownedMedium')ownedMedium++;else if(c==='marketMedium')boughtMedium++;else if(c==='mediumOre')mediumOres++;else{steps.lowUpgrade++;lowCount+=3;}
    }
    add(used,kStone1,ownedMedium);add(buy,kStone1,boughtMedium);
    let ownedLow=0, boughtLow=0, oreLow=0, ownedShadow=0, rough=0, direct=0;
    for (let i=0;i<lowCount;i++) {
      const c=lowChoices[i];
      if(c==='owned') ownedLow++; else if(c==='marketLow') boughtLow++; else if(c==='ore') oreLow++; else if(c==='rough') rough++; else if(c==='direct') direct++; else ownedShadow++;
    }
    add(used,kStone0,ownedLow);
    add(buy,kStone0,boughtLow);
    let zelOwned=0, zelRough=0, zelDirect=0, zelRoughN=0;
    const nZel=stock('zelunium'), nZelOre=stock('zeluniumOre');
    const pZel=p('zelunium'), pZelOre=p('zeluniumOre');
    for (let i=0; i<s.reform.zelunium; i++) {
      if (i < nZel) { zelOwned++; continue; }
      const missing = Math.max(0,20*(zelRoughN+1)-nZelOre)-Math.max(0,20*zelRoughN-nZelOre);
      const roughCost = missing === 0 ? 0 : missing*pZelOre;
      if (roughCost < pZel) { zelRoughN++; zelRough++; } else zelDirect++;
    }
    steps.lowOre=oreLow; steps.mediumOre=mediumOres; steps.shadow=ownedShadow+rough+direct; steps.combineShadow=rough+reformShadowRough;
    steps.combineZelunium=zelRough;
    consume(kOreLow,oreLow*5); consume(kOreMedium,mediumOres*5);
    // Reform first, then the stone route, so the free ore lands on the demand
    // that cannot be traded away.
    add(used,'shadow',reformShadowOwned); add(buy,'shadow',reformShadowDirect);
    const reformOreBought = consume('shadowOre',reformShadowRough*20);
    add(used,'zelunium',zelOwned); add(buy,'zelunium',zelDirect);
    const zelOreBought = consume('zeluniumOre',zelRough*20);
    add(used,'shadow',ownedShadow); consume('shadowOre',rough*20); add(buy,'shadow',direct);
    // Reform materials cost the same whichever stone route is chosen, so keep
    // them separable from the totals the route comparison puts side by side.
    const reformCost = (reformShadowDirect ? reformShadowDirect*pShadow : 0)
      + (reformOreBought ? reformOreBought*pShadowOre : 0)
      + (zelDirect ? zelDirect*pZel : 0)
      + (zelOreBought ? zelOreBought*pZelOre : 0);
    fees += oreLow*10000 + mediumOres*20000 + steps.shadow*20000 + steps.lowUpgrade*10000 + steps.highUpgrade*20000 + steps.supremeUpgrade*50000;
    const missingPrices = [];
    for (const [key,n] of Object.entries(buy)) { if(p(key)===Infinity) missingPrices.push(key); else materialCost+=n*p(key); }
    const reformTotal = Number.isFinite(reformCost) ? reformCost : null;
    return {steps, used, buy, fees, materialCost, total:missingPrices.length ? null : fees+materialCost,
      reformCost:reformTotal,
      stoneTotal:missingPrices.length||reformTotal==null ? null : fees+materialCost-reformTotal,
      reform:{shadow:s.reform.shadow, zelunium:s.reform.zelunium,
        shadowOwned:reformShadowOwned, shadowCombined:reformShadowRough, shadowBought:reformShadowDirect,
        zeluniumOwned:zelOwned, zeluniumCombined:zelRough, zeluniumBought:zelDirect},
      missingPrices, shadowRequired:steps.shadow+s.reform.shadow, shadowForStones:steps.shadow,
      shadowForReform:s.reform.shadow, shadowAdditional:rough+direct+reformShadowRough+reformShadowDirect,
      remaining:Object.fromEntries(Object.entries(inv).map(([k,n])=>[k,Math.max(0,n-(used[k]||0))]))};
  }
  // Buying a finished stone versus combining 20 rough pieces. Same shape for
  // Shadowdecon and Zelunium, which use the identical 20:1 recipe and NPC.
  function comparison(input, key = 'shadow') {
    const s = sanitize(input);
    const bulk = BULK.find(b => b.key === key) || BULK[0];
    const direct=price(s.prices[bulk.key]), ore=price(s.prices[bulk.ore]);
    return {key:bulk.key, ore:bulk.ore,
      direct:Number.isFinite(direct)?direct:null, combined:Number.isFinite(ore)?ore*20:null,
      breakEven:Number.isFinite(direct)?direct/20:null};
  }
  // Three routes the UI compares side by side. `best` is the plan the app
  // actually recommends, so it is computed once here and reused by the caller
  // instead of running the optimizer a second time.
  function routeComparison(input, best) {
    const s=sanitize(input), key=`${s.type}Stone${s.grade}`;
    const owned=Math.min(s.quantity,s.inventory[key]), quantity=s.quantity-owned;
    const unitPrice=price(s.prices[key]);
    // Reform materials are identical in every route, so the cards compare the
    // stone cost only; folding a 1.2M Zelunium bill into all three would bury
    // the difference the player is actually choosing between.
    const marketStone=quantity===0?0:Number.isFinite(unitPrice)?quantity*unitPrice:null;
    const bare={...s, reform:{shadow:0, zelunium:0}};
    const marketReform=calculate({...bare, quantity:0, reform:s.reform});
    const market={key,owned,quantity,total:marketStone,
      materialCost:marketStone,fees:0,reformCost:marketReform.reformCost};
    const craft=s.mode==='shadow'&&best?best:calculate({...s,mode:'shadow'});
    const plan=best||calculate(s);
    const routes={shadow:craft.stoneTotal,market:market.total,plan:plan.stoneTotal};
    const priced=Object.entries(routes).filter(([,v])=>v!=null);
    const cheapest=priced.length?priced.reduce((a,b)=>b[1]<a[1]?b:a)[0]:null;
    return {craft,market,plan,cheapest,reformCost:plan.reformCost,
      difference:craft.stoneTotal==null||market.total==null?null:market.total-craft.stoneTotal};
  }
  // Per exchange step: how much of the input comes from stock, the market, and
  // earlier steps. The three always sum to the step's total input.
  function stepSources(plan, inputKey, total) {
    const owned=Math.min(total, plan.used[inputKey]||0);
    const bought=Math.min(total-owned, plan.buy[inputKey]||0);
    return {owned, bought, earlier:total-owned-bought};
  }
  const api={TYPES,GRADES,BULK,materialKeys,inventoryKeys,defaults,sanitize,calculate,comparison,routeComparison,stepSources};
  if(typeof module!=='undefined' && module.exports) module.exports=api;
  root.Reform=api;
})(typeof globalThis!=='undefined'?globalThis:this);
