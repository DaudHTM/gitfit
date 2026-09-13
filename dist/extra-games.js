import * as T from 'three';
import {createBird} from './equipment.js';
import {FlapTracker,FLIGHT} from './motion.js';
import {createGuardGame} from './guard-game.js';
import {FlightCourse} from './flight-logic.js';
export function createExtraGames(scene,mesh,geo,feedback,sound,camera){
 const group=new T.Group();scene.add(group);const guard=createGuardGame(group,camera,feedback,sound);
 const raptor=createBird(),bird=raptor.root,body=raptor.body,wings=raptor.wings;group.add(bird);
 const flaps=new FlapTracker(),course=new FlightCourse(),flight=course.flight,gateMeshes=new Map(),position=new T.Vector3();
 let mode='zombies',clock=0,actionAt=-10,wingStroke=0,viewBehind=false;
 function reset(m){mode=m;clock=0;actionAt=-10;wingStroke=0;flaps.reset();course.reset();guard.reset(m==='shield');for(const root of gateMeshes.values())group.remove(root);gateMeshes.clear();if(m==='bird')syncGates();group.visible=m!=='zombies';bird.visible=m==='bird';}
 function syncGates(){
  const visible=new Set(course.gates.map(g=>g.id));
  for(const [id,root] of gateMeshes)if(!visible.has(id)){group.remove(root);gateMeshes.delete(id);}
  for(const gate of course.gates){
   let root=gateMeshes.get(gate.id);
   if(!root){root=new T.Group();group.add(root);gateMeshes.set(gate.id,root);
    const stone=gate.id%2?'#427d81':'#507f73',rim='#d6b87b';
    mesh(geo.box,stone,root,[0,(gate.bottom-1)/2,0],[7,gate.bottom+1,FLIGHT.gateDepth]);
    mesh(geo.box,stone,root,[0,(gate.top+8)/2,0],[7,8-gate.top,FLIGHT.gateDepth]);
    // Both visible inner lips stay outside the tested gap, so the edges agree.
    for(const [edge,side] of [[gate.bottom,-1],[gate.top,1]]){
     mesh(geo.box,rim,root,[0,edge+side*.10,0],[7.25,.20,FLIGHT.gateDepth+.04]);
     mesh(geo.box,'#edffe7',root,[0,edge+side*.025,.53],[7.25,.035,.025]);
     for(const x of [-3.2,-1.6,0,1.6,3.2])mesh(geo.box,'#315e60',root,[x,edge+side*.52,.515],[.035,.6,.025]);
    }
   }
   root.position.z=gate.z;
  }
 }
 function tickFlight(dt,practice,action,samples){
  if(practice&&action&&clock-actionAt>.2){actionAt=clock;const power=Number(document.getElementById('strikeEffort').value);course.flap({lift:1.7+power*.45,started:true,strength:power});wingStroke=1;sound.play('flap',{power:.6+power*.25});}
  if(!practice)for(const sample of samples){const f=flaps.sample(sample.p,sample.time);if(f){course.flap(f);wingStroke=Math.min(1,f.strength/2.5);if(f.started)sound.play('flap',{power:Math.min(1.4,.5+f.strength/3)});}}
  const events=course.step(dt);position.set(0,flight.y,FLIGHT.birdZ);bird.position.copy(position);body.visible=viewBehind;bird.rotation.z=0;bird.rotation.x=-T.MathUtils.clamp(flight.vy*.035,-.1,.1);
  const recovery=T.MathUtils.clamp((samples.at(-1)?.p[1]||1)-1,-.5,.5);wingStroke*=Math.exp(-dt*6);wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.1-wingStroke*.85+recovery*.2));
  for(const e of events)if(e.type==='crash')feedback(e.reason==='ground'?'GROUND HIT':e.reason==='ceiling'?'TOO HIGH':'OBSTACLE HIT',{kind:'hurt',point:position,power:.85});else feedback('GAP +100',{kind:'ring',point:new T.Vector3(0,(e.gate.bottom+e.gate.top)/2,FLIGHT.birdZ),power:.8});
  syncGates();return {score:course.score,hp:course.over?0:1,combo:course.passed,seconds:Math.floor(course.time),distance:Math.floor(course.distance),over:course.over,bird:position.clone(),speed:course.started?flight.speed:0,waiting:!course.started,opponent:!course.started?{name:'FLAP DOWN',cue:practice?'Space or Flap to launch':'Launch when ready',fraction:1,color:'#b9eee0'}:null,detail:!course.started?'First flap starts the flight':'Flap to climb · Coast to descend'};
 }

 function tick(dt,fist,q,practice,action,samples=[]){if(!group.visible)return null;clock+=dt;return mode==='bird'?tickFlight(dt,practice,action,samples):guard.tick(dt,fist,practice,samples);}
 function preview(now){if(mode!=='bird')return;group.visible=true;bird.position.set(.3,2.3,-3);body.visible=true;bird.rotation.z=Math.sin(now*.0005)*.08;wings.forEach((w,i)=>w.rotation.z=(i?1:-1)*(.12+Math.sin(now*.002)*.22));}
 reset('zombies');return {reset,tick,group,preview,nudgeShield:(x,y)=>guard.nudge(x,y),get waitingForFlap(){return mode==='bird'&&!course.started;},setView(behind){viewBehind=behind;body.visible=behind;},suspend(){guard.suspend();actionAt=-10;flaps.reset();}};
}
