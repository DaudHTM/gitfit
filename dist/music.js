// Original, deterministic scores. Steps are eighth notes; no media downloads.
export const MUSIC_THEMES={
 zombies:{bpm:100,root:38,scale:[0,3,5,7,10],chords:[0,5,3,7],lead:'triangle',air:180},
 sword:{bpm:84,root:38,scale:[0,2,3,7,10],chords:[0,7,5,3],lead:'triangle',air:260},
 saber:{bpm:120,root:42,scale:[0,3,5,7,10],chords:[0,5,3,7],lead:'sawtooth',air:950},
 bird:{bpm:76,root:48,scale:[0,2,4,7,9],chords:[0,5,7,0],lead:'sine',air:650},
 shield:{bpm:92,root:40,scale:[0,3,5,7,10],chords:[0,3,7,5],lead:'sine',air:450},
 spell:{bpm:104,root:45,scale:[0,2,3,7,10],chords:[0,7,3,5],lead:'sine',air:320},
 targets:{bpm:108,root:45,scale:[0,2,4,7,9],chords:[0,5,7,5],lead:'triangle',air:420}
};
export const noteFrequency=midi=>440*2**((midi-69)/12);
export function musicEvents(mode,step,playing=true,intensity=.35){
 const t=MUSIC_THEMES[mode]||MUSIC_THEMES.zombies,beat=step%8,bar=Math.floor(step/8),chord=t.chords[Math.floor(bar/2)%4],eighth=30/t.bpm,events=[];
 const note=(midi,duration,gain,type='triangle',pan=0)=>events.push({kind:'note',frequency:noteFrequency(midi),duration,gain,type,pan});
 // Slow, open voicings keep the lobby spacious. Percussion arrives in gameplay.
 if(beat===0)for(const [i,interval] of [0,7,mode==='bird'||mode==='targets'?16:15].entries())note(t.root+12+chord+interval,eighth*7.7,.025/(1+i*.35),'sine',(i-1)*.4);
 if(!playing){if(beat===2||beat===6)note(t.root+24+chord+t.scale[(bar+beat)%5],eighth*2,.025,'sine',beat===2?-.35:.35);return events;}
 if(beat%2===0)note(t.root+chord+(beat===6?7:0),eighth*.85,mode==='bird'?.035:.075,mode==='saber'?'sawtooth':'triangle');
 const melody=[0,2,4,1,3,4,2,1];if(mode==='bird'?beat%2===0:beat%2===1||intensity>.7){const n=melody[(step+Math.floor(bar/4))%8];note(t.root+24+chord+t.scale[n],eighth*(mode==='bird'?1.8:.7),mode==='saber'?.023:.038,t.lead,Math.sin(step*.8)*.4);}
 if(mode!=='bird'){
  if(beat===0||beat===4||(intensity>.7&&beat===7))events.push({kind:'kick',gain:.14+intensity*.06});
  if(beat===2||beat===6)events.push({kind:'snare',gain:mode==='sword'?.04:.065});
  if(mode!=='sword'||beat%2)events.push({kind:'hat',gain:beat%2?.026:.012});
 }else if(beat===0||beat===4)events.push({kind:'kick',gain:.035});
 return events;
}
