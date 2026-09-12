import test from 'node:test';
import assert from 'node:assert/strict';
import {ActivityTracker} from '../dist/activity.js';
const opts={playing:true,live:true,fresh:true,visible:true,weight:70,met:4.5};
test('integrates chosen MET and weight over active live time',()=>{const a=new ActivityTracker();for(let i=0;i<3600;i++)a.update(.1,opts);assert.ok(Math.abs(a.kcal-31.5)<1e-8);assert.ok(Math.abs(a.seconds-360)<1e-8);});
test('pause, practice, disconnected and hidden time cannot accrue calories',()=>{const a=new ActivityTracker();for(const flag of ['playing','live','fresh','visible'])a.update(.1,{...opts,[flag]:false});a.update(10,opts);a.update(.1,{...opts,weight:NaN});assert.equal(a.kcal,0);});
test('settings apply prospectively and reset clears totals',()=>{const a=new ActivityTracker();a.update(.1,opts);const previous=a.kcal;a.update(.1,{...opts,weight:140});assert.equal(a.kcal,previous*3);a.reset();assert.equal(a.seconds,0);assert.equal(a.kcal,0);});
