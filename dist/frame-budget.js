// Rendering quality can adapt; sensor delivery and gesture analysis never wait.
export class FrameBudget {
 constructor(dpr=1){this.maxRatio=Math.min(1.5,Math.max(1,dpr));this.ratio=this.maxRatio;this.mode='auto';this.reset();}
 reset(){this.last=0;this.started=0;this.frames=[];this.cpu=0;this.healthy=0;this.fps=0;this.p90=0;this.cpuMs=0;}
 setMode(mode){this.mode=['auto','low','high'].includes(mode)?mode:'auto';this.ratio=this.mode==='low'?1:this.maxRatio;this.reset();return this.ratio;}
 sample(now,cpuMs,visible=true){
  if(!visible){this.reset();return null;}
  const delta=this.last?now-this.last:0;this.last=now;
  if(delta<=0||delta>250){this.frames=[];this.cpu=0;this.started=now;return null;}
  this.started||=now;this.frames.push(delta);this.cpu+=Math.max(0,cpuMs);
  if(now-this.started<1500||this.frames.length<20)return null;
  const sorted=[...this.frames].sort((a,b)=>a-b);this.p90=sorted[Math.floor(sorted.length*.9)];this.fps=Math.round(1000/(this.frames.reduce((s,x)=>s+x,0)/this.frames.length));this.cpuMs=this.cpu/this.frames.length;
  const old=this.ratio;
  if(this.mode==='auto'){
   if(this.p90>24||this.cpuMs>12){this.ratio=Math.max(.8,this.ratio-.2);this.healthy=0;}
   else if(this.p90<18&&this.cpuMs<8){if(++this.healthy>=6){this.ratio=Math.min(this.maxRatio,this.ratio+.1);this.healthy=0;}}
   else this.healthy=0;
  }
  this.ratio=Math.round(this.ratio*10)/10;this.frames=[];this.cpu=0;this.started=now;
  return {fps:this.fps,p90:this.p90,cpuMs:this.cpuMs,ratio:this.ratio,changed:old!==this.ratio};
 }
}

// Native text setters trigger DOM work even when the content is identical.
export function writeText(node,value){const text=String(value);if(node.textContent!==text)node.textContent=text;}
