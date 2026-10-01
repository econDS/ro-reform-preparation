'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const R = require('../calculator.js');

function capture() {
  const elements = new Map(), events = {}, store = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {
      value:'', textContent:'', innerHTML:'',
      addEventListener:(event, fn) => { events[id + ':' + event] = fn; }
    });
    return elements.get(id);
  }
  const context = vm.createContext({
    window:{Reform:R}, navigator:{},
    document:{getElementById:element, querySelectorAll:() => [], addEventListener:(event, fn) => { events[event] = fn; }},
    localStorage:{getItem:key => store.get(key), setItem:(key,value) => store.set(key,value)},
    Intl, setTimeout:fn => fn(), clearTimeout:() => {}
  });
  vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'), context);
  events['quickstart-toggle:click']();
  const defaults = R.defaults();
  const weapon = R.defaults();
  Object.assign(weapon,{type:'weapon',grade:1,quantity:12});
  Object.assign(weapon.inventory,{weaponStone1:2,weaponOreMedium:15,shadow:4});
  const reform = R.defaults();
  Object.assign(reform,{type:'armor',grade:2,quantity:5,mode:'shadow'});
  Object.assign(reform.inventory,{armorStone0:3,shadow:10,shadowOre:35,zeluniumOre:40});
  Object.assign(reform.reform,{shadow:6,zelunium:4});
  return {
    baseCommit:'4bc1653fec1901a4121b86342f1ad0cc4ef55313',
    publishingRoot:'.', publishingPath:'/ro-reform-preparation/',
    publicUrl:'https://econds.github.io/ro-reform-preparation/',
    theme:'prefers-color-scheme; no theme switch or theme storage key',
    share:{stateSerialization:false,queryFormat:null,hashAnchors:['#main','#calculator','#materials','#recipe','#results']},
    exportImport:{implemented:false},
    storageKeys:[...store.keys()].sort(),
    initialDisplayedTotal:element('total').textContent,
    preservedSourceSha256:Object.fromEntries(['app.js','calculator.js','styles.css'].map(file => [file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')])),
    cases:[['default-accessory-supreme-100',defaults],['weapon-medium-12-with-stock',weapon],['armor-high-5-shadow-and-reform',reform]].map(([name,input]) => ({name,input,output:R.calculate(input)}))
  };
}
if (require.main === module) process.stdout.write(JSON.stringify(capture(),null,2) + '\n');
module.exports = {capture};
