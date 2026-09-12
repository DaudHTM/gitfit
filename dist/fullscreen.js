export function setupFullscreen(surface,button,onPause){
 let expanded=false,wanted=false;
 const active=()=>document.fullscreenElement===surface||expanded;
 function reflect(){button.textContent=active()?'Exit fullscreen':'Fullscreen ⛶';button.setAttribute('aria-pressed',String(active()));surface.classList.toggle('immersive',active());document.body.classList.toggle('expanded-game',expanded);}
 function toggle(){
  if(active()){wanted=false;expanded=false;if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});reflect();return;}
  // Expand immediately: some embedded browsers leave native fullscreen pending.
  wanted=true;expanded=true;reflect();
  try{surface.requestFullscreen?.().catch(()=>{});}catch{/* The expanded view remains available. */}
 }
 button.onclick=toggle;
 document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===surface){expanded=false;if(!wanted)document.exitFullscreen().catch(()=>{});}else if(!expanded)wanted=false;reflect();});
 window.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded){wanted=false;expanded=false;reflect();onPause();}});
 reflect();return {active};
}
