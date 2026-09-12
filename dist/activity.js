// Gross energy estimate, not a measurement. Preferences never change past totals.
export class ActivityTracker {
 constructor(){this.seconds=0;this.kcal=0;}
 update(dt,{playing,live,fresh,visible,weight,met}){
  if(!playing||!live||!fresh||!visible||!Number.isFinite(dt)||dt<=0||dt>.25||!Number.isFinite(weight)||weight<20||weight>300||![2.5,4.5,6.5].includes(met))return;
  this.seconds+=dt;this.kcal+=weight*met*dt/3600;
 }
 reset(){this.seconds=0;this.kcal=0;}
}
export {createSound} from './sound.js';
