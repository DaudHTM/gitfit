import test from 'node:test';import assert from 'node:assert/strict';
import {setupFullscreen} from '../dist/fullscreen.js';
test('fullscreen remains usable when embedded browser never resolves native request',()=>{
 const classes=()=>({values:new Set(),toggle(name,on){if(on)this.values.add(name);else this.values.delete(name);}});
 globalThis.document={fullscreenElement:null,body:{classList:classes()},addEventListener(){}};globalThis.window={addEventListener(){}};
 const surface={classList:classes(),requestFullscreen:()=>new Promise(()=>{})},button={textContent:'',setAttribute(){}};
 const fullscreen=setupFullscreen(surface,button,()=>{});button.onclick();assert.equal(fullscreen.active(),true);assert.equal(button.textContent,'Exit fullscreen');assert.ok(document.body.classList.values.has('expanded-game'));
 button.onclick();assert.equal(fullscreen.active(),false);assert.equal(button.textContent,'Fullscreen ⛶');assert.equal(document.body.classList.values.has('expanded-game'),false);
 delete globalThis.document;delete globalThis.window;
});
