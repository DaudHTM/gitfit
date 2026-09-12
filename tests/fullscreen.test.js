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

test('Play can enter directly and returning to lobby cancels a late native entry',()=>{
 const listeners={},classes={toggle(){}};let exits=0,requests=0;
 globalThis.document={fullscreenElement:null,body:{classList:classes},addEventListener(name,fn){listeners[name]=fn;},exitFullscreen(){exits++;document.fullscreenElement=null;return Promise.resolve();}};
 globalThis.window={addEventListener(){}};
 const surface={classList:classes,requestFullscreen(){requests++;return new Promise(()=>{});}},button={setAttribute(){}};
 const full=setupFullscreen(surface,button,()=>{});full.enter();full.enter();assert.equal(requests,1);assert.equal(full.active(),true);
 full.exit();assert.equal(full.active(),false);
 document.fullscreenElement=surface;listeners.fullscreenchange();assert.equal(exits,1);assert.equal(full.active(),false);
 delete globalThis.document;delete globalThis.window;
});

test('Escape exits the embedded fullscreen fallback and pauses the round',()=>{
 const events={},classes={toggle(){}};let paused=0;
 globalThis.document={fullscreenElement:null,body:{classList:classes},addEventListener(){}};
 globalThis.window={addEventListener(name,fn){events[name]=fn;}};
 const full=setupFullscreen({classList:classes},{setAttribute(){}},()=>paused++);full.enter();events.keydown({key:'Escape'});assert.equal(full.active(),false);assert.equal(paused,1);
 delete globalThis.document;delete globalThis.window;
});
