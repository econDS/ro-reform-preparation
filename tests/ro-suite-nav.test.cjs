'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {capture} = require('../scripts/capture-ro-suite-baseline.cjs');
const baseline = require('./fixtures/ro-suite-nav-baseline.json');
const root = path.resolve(__dirname,'..');
const assetPath = path.join(root,'assets/ro-suite/1.3.0');
const html = require('../qa/nav-1.4.0/normalize.cjs')(fs.readFileSync(path.join(root,'index.html'),'utf8'));
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expected = {
  'nav.js':'e0a75bce3f8ba21d73aff8aa28af1c624d977f1e8e3de483c6dd40785b3b84d2',
  'catalog.snapshot.json':'a198338ddcb7857094ef950fb1315c532840cf53ac8e7a69b331d8cb4a87dd5d'
};

test('release bytes match both approved SHA-256 values and immutable lock',() => {
  const lock = JSON.parse(fs.readFileSync(path.join(assetPath,'nav.lock.json'),'utf8'));
  assert.equal(lock.bundleVersion,'1.3.0');
  for (const [file,digest] of Object.entries(expected)) {
    assert.equal(sha256(fs.readFileSync(path.join(assetPath,file))),digest,file);
    assert.equal(lock.files[file].sha256,digest,file);
  }
  assert.equal(sha256(fs.readFileSync(path.join(assetPath,'nav.lock.json'))),'7ac31d27c493071ad164326022854a637c5015ae7989ff8c2a4c129b021c59c3');
});

test('nav is local, immediately after skip link, and preserves original header',() => {
  assert.match(html,/<body>\s*<a class="skip" href="#main">ข้ามไปเครื่องคำนวณ<\/a>\s*<ro-suite-nav tool-id="reform-workshop" portal-url="https:\/\/econds\.github\.io\/ro_tools_portal\/">\s*<nav aria-label="เครื่องมือ RO">\s*<a href="https:\/\/econds\.github\.io\/ro_tools_portal\/">กลับ RO Tools Portal<\/a>\s*<\/nav>\s*<\/ro-suite-nav>\s*<script type="module" src="\.\/assets\/ro-suite\/1\.3\.0\/nav\.js"><\/script>\s*<header class="site-header">/);
  assert.equal((html.match(/<ro-suite-nav\b/g)||[]).length,1);
  const fallbackStyle = '  <style>\r\n    ro-suite-nav > nav > a { display: inline-flex; align-items: center; min-height: 44px; padding: 8px 12px; }\r\n  </style>\r\n';
  assert.ok(html.includes(fallbackStyle), 'Only the light-DOM fallback gets a 44px touch target');
  const original = require('../qa/first-run/normalize.cjs')(html).replace(/<ro-suite-nav[^]*?<\/ro-suite-nav>\r?\n<script type="module" src="\.\/assets\/ro-suite\/1\.3\.0\/nav\.js"><\/script>\r?\n/,'').replace(fallbackStyle,'');
  assert.equal(sha256(original),'3a62cb06d545fd805d7f90e980d82e322cb19cfd996fad3c229860e96e1c43b2');
  assert.doesNotMatch(html,/<ro-suite-nav[^>]*\b(?:catalog-url|theme)=/);
  assert.doesNotMatch(html,/<script[^>]*src="(?:https?:|\/\/)[^"]*nav\.js/);
  const catalog = JSON.parse(fs.readFileSync(path.join(assetPath,'catalog.snapshot.json'),'utf8'));
  const current = catalog.tools.find(tool => tool.id === 'reform-workshop');
  assert.deepEqual(current.identity,{accent:'#9a5b12',icon:'anvil'});
  assert.equal(current.canonicalUrl,baseline.publicUrl);
});

test('calculations, storage keys, application code, theme, URL and data formats match pre-edit baseline',() => {
  assert.deepEqual(capture(),baseline);
  const app = fs.readFileSync(path.join(root,'app.js'),'utf8');
  const nav = fs.readFileSync(path.join(assetPath,'nav.js'),'utf8');
  assert.doesNotMatch(nav,/localStorage|sessionStorage/);
  assert.doesNotMatch(app,/localStorage\.clear\(/);
  assert.doesNotMatch(app,/location\.(hash|search)|URLSearchParams|history\.(pushState|replaceState)/);
  for (const anchor of baseline.share.hashAnchors) assert.ok(html.includes(`href="${anchor}"`),anchor);
  assert.match(fs.readFileSync(path.join(root,'styles.css'),'utf8'),/@media\(prefers-color-scheme:dark\)/);
});
