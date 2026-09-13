// Sensor trajectories stay in the calibrated body frame. Only their collision
// and rendering coordinates turn, so camera motion cannot generate a punch.
const angles=[0,-.34,.30,-.19,.39,-.38,.17];
export const approachAngle=index=>angles[Math.abs(Math.floor(index))%angles.length];
export function turnHeading(from,to,dt){
 if(!Number.isFinite(dt)||dt<=0)return from;
 const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
 return from+delta*(1-Math.exp(-Math.min(dt,.1)*7));
}
export function boxingPoint([x,y,z],yaw){const c=Math.cos(yaw),s=Math.sin(yaw);return [x*c+z*s,y,z*c-x*s];}
export function boxingSweep(sweep,yaw){return {...sweep,a:boxingPoint(sweep.a,yaw),b:boxingPoint(sweep.b,yaw),path:sweep.path?.map(p=>boxingPoint(p,yaw))};}
export function engagedOpponent(enemies,current){return current?.hp>0&&!current.dead&&enemies.includes(current)?current:enemies.reduce((best,e)=>e.hp>0&&!e.dead&&(!best||e.distance<best.distance)?e:best,null);}
