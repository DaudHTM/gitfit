import test from 'node:test';import assert from 'node:assert/strict';
import {RoundRecords,roundChallenge,resultMetrics} from '../dist/round-results.js';
const fixture=()=>{const data=new Map([['armature-bests','{"sword":9999}']]);return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),data};};
test('records separate real input, practice and duration, and preserve existing mixed records',()=>{
 const storage=fixture(),r=new RoundRecords(storage);assert.equal(r.best('sword','live',45),0);
 assert.equal(r.save('sword','practice',45,1500).isNew,true);assert.equal(r.best('sword','live',45),0);assert.equal(r.best('sword','practice',0),0);
 r.save('sword','live',45,225);assert.equal(r.save('sword','live',45,100).best,225);assert.equal(r.save('sword','live',45,225).isNew,false);
 assert.equal(new RoundRecords(storage).best('sword','practice',45),1500);assert.equal(storage.data.get('armature-bests'),'{"sword":9999}');
});
test('blocked or corrupt local storage cannot stop a round',()=>{
 const r=new RoundRecords({getItem(){throw Error('unavailable');},setItem(){throw Error('unavailable');}});assert.equal(r.save('bird','live',45,100).best,100);
 for(const value of ['null','{broken','{"sword:live:quick":"9999"}','{"sword:live:quick":-1}'])assert.equal(new RoundRecords({getItem:()=>value}).best('sword','live',45),0);
 assert.equal(r.save('bird','live',45,NaN).best,100);
});
test('every game has a measurable challenge, capped at completion',()=>{
 const stats={kills:9,combo:9,bestCombo:9,finishes:9,defeated:9,hits:15};
 for(const mode of ['zombies','bird','saber','sword','spell','shield','targets']){const empty=roundChallenge(mode),full=roundChallenge(mode,stats);assert.equal(empty.complete,false);assert.ok(empty.label);assert.equal(full.complete,true);assert.equal(full.current,full.goal);}
 assert.equal(roundChallenge('sword',{parries:30,finishes:2}).complete,false);
 assert.equal(roundChallenge('saber',{combo:0,bestCombo:8}).complete,true);
});
test('round results use each game’s actual counters with consistent units',()=>{
 assert.deepEqual(resultMetrics('spell',{defeated:18,accuracy:100,bestCombo:34}),[['Shattered',18],['Matched','100%'],['Best chain',34]]);
 assert.deepEqual(resultMetrics('bird',{combo:5,distance:54,elapsed:13.6}),[['Gaps cleared',5],['Distance','54 m'],['Flight time','13s']]);
 assert.deepEqual(resultMetrics('sword',{parries:4,finishes:3,bestCombo:3}),[['Parries',4],['Finishes',3],['Best chain',3]]);
});
