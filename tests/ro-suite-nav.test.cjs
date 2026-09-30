'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {capture} = require('../scripts/capture-ro-suite-baseline.cjs');
const baseline = require('./fixtures/ro-suite-nav-baseline.json');
const root = path.resolve(__dirname,'..');
const assetPath = path.join(root,'assets/ro-suite/1.2.0');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const expected = {
  'nav.js':'d75be916445feb4febeaada437841a1b3be68db16a00673198c78fd6f6c8dc5f',
  'catalog.snapshot.json':'800bb9c9d2b52a7fbae58e436b05529e69820fee3627d199da545a6f5e28f7dd'
};

test('release bytes match both approved SHA-256 values and immutable lock',() => {
  const lock = JSON.parse(fs.readFileSync(path.join(assetPath,'nav.lock.json'),'utf8'));
  assert.equal(lock.bundleVersion,'1.2.0');
  for (const [file,digest] of Object.entries(expected)) {
    assert.equal(sha256(fs.readFileSync(path.join(assetPath,file))),digest,file);
    assert.equal(lock.files[file].sha256,digest,file);
  }
  assert.equal(sha256(fs.readFileSync(path.join(assetPath,'nav.lock.json'))),'3b0350135ba5f455b38799c7940492938a209e8e0a6570a5126cb40c36127358');
});

test('nav is local, immediately after skip link, and preserves original header',() => {
  assert.match(html,/<body>\s*<a class="skip" href="#main">ข้ามไปเครื่องคำนวณ<\/a>\s*<ro-suite-nav tool-id="reform-workshop" portal-url="https:\/\/econds\.github\.io\/ro_tools_portal\/">\s*<nav aria-label="เครื่องมือ RO">\s*<a href="https:\/\/econds\.github\.io\/ro_tools_portal\/">กลับ RO Tools Portal<\/a>\s*<\/nav>\s*<\/ro-suite-nav>\s*<script type="module" src="\.\/assets\/ro-suite\/1\.2\.0\/nav\.js"><\/script>\s*<header class="site-header">/);
  assert.equal((html.match(/<ro-suite-nav\b/g)||[]).length,1);
  const original = html.replace(/<ro-suite-nav[^]*?<\/ro-suite-nav>\r?\n<script type="module" src="\.\/assets\/ro-suite\/1\.2\.0\/nav\.js"><\/script>\r?\n/,'');
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
