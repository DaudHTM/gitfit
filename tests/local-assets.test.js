import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const dist=new URL('../dist/',import.meta.url);
test('startup engine and fonts resolve locally, including the Three.js core dependency',()=>{
 const html=readFileSync(new URL('index.html',dist),'utf8');const map=JSON.parse(html.match(/<script type="importmap">(.*?)<\/script>/s)[1]);
 assert.ok(Object.values(map.imports).every(url=>url.startsWith('./')));
 const engine=new URL(map.imports.three,dist),source=readFileSync(engine,'utf8');
 const dependencies=[...source.matchAll(/from\s*["'](\.[^"']+)["']/g)].map(m=>m[1]);assert.ok(dependencies.length>0);
 for(const dependency of dependencies)assert.ok(existsSync(new URL(dependency,engine)));
 const css=readFileSync(new URL('style.css',dist),'utf8');assert.doesNotMatch(css,/@import|url\(['"]?https?:/);
 const fonts=[...css.matchAll(/url\(['"]([^'"]+\.woff2)['"]\)/g)].map(m=>m[1]);assert.equal(fonts.length,2);
 for(const font of fonts)assert.equal(readFileSync(new URL(font,dist)).subarray(0,4).toString(),'wOF2');
 for(const license of ['vendor/three/LICENSE','vendor/fonts/dm-sans-LICENSE','vendor/fonts/space-grotesk-LICENSE'])assert.ok(existsSync(new URL(license,dist)));
});
