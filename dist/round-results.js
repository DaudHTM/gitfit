const games=new Set(['zombies','bird','saber','sword','spell','shield','targets']);
const number=n=>Number.isFinite(n)?Math.max(0,n):0;
export class RoundRecords{
 constructor(storage){this.storage=storage;this.data={};try{const saved=JSON.parse(storage?.getItem('armature-records-v2')||'{}');for(const [key,value] of Object.entries(saved||{}))if(/^(zombies|bird|saber|sword|spell|shield|targets):(live|practice):(quick|standard)$/.test(key)&&Number.isSafeInteger(value)&&value>=0)this.data[key]=value;}catch{}}
 key(mode,input,limit){if(!games.has(mode)||!['live','practice'].includes(input))throw Error('Unknown round');return `${mode}:${input}:${limit===45?'quick':'standard'}`;}
 best(mode,input,limit){return this.data[this.key(mode,input,limit)]||0;}
 save(mode,input,limit,score){const key=this.key(mode,input,limit),previous=this.data[key]||0,value=Number.isSafeInteger(score)&&score>=0?score:0;if(value>previous){this.data[key]=value;try{this.storage?.setItem('armature-records-v2',JSON.stringify(this.data));}catch{}}return {best:this.data[key]||0,isNew:value>previous};}
}

export function roundChallenge(mode,s={}){
 const challenges={zombies:['Defeat 5 zombies',s.kills,5],bird:['Clear 5 gaps',s.combo,5],saber:['Chain 8 slices',s.bestCombo,8],sword:['Finish 3 duels',s.finishes,3],spell:['Shatter 5 wards',s.defeated,5],shield:['Chain 8 blocks',s.bestCombo,8],targets:['Hit 12 targets',s.hits,12]};
 const [label,value,goal]=challenges[mode]||['',0,1],current=Math.min(goal,number(value)),short={zombies:'Zombies',bird:'Gaps',saber:'Slice chain',sword:'Duels',spell:'Wards',shield:'Block chain',targets:'Targets'}[mode]||'';return {label,short,current,goal,complete:current>=goal};
}
export function resultMetrics(mode,s={}){
 const n=key=>Math.floor(number(s[key])),seconds=`${n('elapsed')}s`;
 const metrics={
  zombies:[['Knockouts',n('kills')],['Hits landed',n('hits')],['Best chain',n('bestCombo')]],
  bird:[['Gaps cleared',n('combo')],['Distance',`${n('distance')} m`],['Flight time',seconds]],
  saber:[['Slices',n('totalHits')],['Best chain',n('bestCombo')],['Health',`${n('hp')} / 5`]],
  sword:[['Parries',n('parries')],['Finishes',n('finishes')],['Best chain',n('bestCombo')]],
  spell:[['Shattered',n('defeated')],['Matched',`${n('accuracy')}%`],['Best chain',n('bestCombo')]],
  shield:[['Blocks',n('totalHits')],['Perfect',n('perfects')],['Best chain',n('bestCombo')]],
  targets:[['Targets hit',n('hits')],['Bullseyes',n('bullseyes')],['Round time',seconds]]
 };return metrics[mode]||[];
}
