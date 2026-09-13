import {FlightDynamics,FLIGHT} from './motion.js?v=results-pass2';

export function flightGate(index,z=-12){
 const centers=[2.6,3.2,2.3,3.7,2.8,2.1,3.3,2.5];
 const height=Math.max(1.8,2.4-Math.floor(index/5)*.1);
 return {id:index,z,bottom:centers[index%centers.length]-height/2,top:centers[index%centers.length]+height/2,passed:false};
}
// Evaluate the entire time spent inside the obstacle slab, including a fast
// frame crossing both faces. Merely reaching the gap's front does not score.
export function flightGateHit(gate,oldZ,newZ,oldY,newY){
 const half=FLIGHT.gateDepth/2+FLIGHT.radius,dz=newZ-oldZ;
 if(newZ<FLIGHT.birdZ-half||oldZ>FLIGHT.birdZ+half)return false;
 const clamp=v=>Math.max(0,Math.min(1,v));
 const enter=dz?clamp((FLIGHT.birdZ-half-oldZ)/dz):0,exit=dz?clamp((FLIGHT.birdZ+half-oldZ)/dz):1;
 const a=oldY+(newY-oldY)*enter,b=oldY+(newY-oldY)*exit;
 return Math.min(a,b)-FLIGHT.radius<=gate.bottom||Math.max(a,b)+FLIGHT.radius>=gate.top;
}

export class FlightCourse {
 constructor(){this.flight=new FlightDynamics();this.reset();}
 reset(){this.flight.reset();this.time=0;this.distance=0;this.score=0;this.passed=0;this.over=false;this.index=0;this.gates=[];for(let i=0;i<3;i++)this.gates.push(flightGate(this.index++,-12-i*FLIGHT.spacing));}
 step(dt){
  const events=[];if(this.over||dt<=0||dt>.25)return events;
  const oldY=this.flight.y;this.time+=dt;this.distance+=FLIGHT.speed*dt;
  if(this.flight.step(dt)){this.over=true;events.push({type:'crash',reason:this.flight.y<1?'ground':'ceiling'});return events;}
  for(const gate of this.gates){
   const oldZ=gate.z;gate.z+=FLIGHT.speed*dt;
   if(!gate.passed&&flightGateHit(gate,oldZ,gate.z,oldY,this.flight.y)){this.over=true;events.push({type:'crash',reason:'obstacle'});break;}
   if(!gate.passed&&gate.z>FLIGHT.birdZ+FLIGHT.gateDepth/2+FLIGHT.radius){gate.passed=true;this.passed++;this.score+=100;events.push({type:'clear',gate,score:this.score});}
  }
  this.gates=this.gates.filter(g=>g.z<3);
  if(!this.over&&this.gates.at(-1).z>-26)this.gates.push(flightGate(this.index++,this.gates.at(-1).z-FLIGHT.spacing));
  return events;
 }
}
