document.querySelectorAll('[data-team-carousel]').forEach(function(section){
  const track=section.querySelector('.team-carousel-track');
  const controls=section.querySelector('.team-carousel-controls');
  if(!track||!controls)return;
  controls.hidden=false;
  const move=function(direction){
    const max=track.scrollWidth-track.clientWidth;
    const atEnd=direction>0&&track.scrollLeft>=max-2;
    const atStart=direction<0&&track.scrollLeft<=2;
    const left=atEnd?0:atStart?max:Math.max(0,Math.min(max,track.scrollLeft+direction*track.clientWidth));
    track.scrollTo({left:left,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
  };
  controls.querySelectorAll('button').forEach(function(button){button.addEventListener('click',function(){move(Number(button.dataset.direction));});});
  track.addEventListener('keydown',function(event){
    if(event.target!==track)return;
    if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();move(event.key==='ArrowRight'?1:-1);}
  });
});
