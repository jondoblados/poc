document.addEventListener('DOMContentLoaded',function(){
  const button=document.querySelector('.hugo-menu-toggle');
  const nav=document.getElementById('site-nav');
  if(!button||!nav)return;
  function close(){button.setAttribute('aria-expanded','false');nav.classList.remove('open');}
  button.addEventListener('click',function(){const open=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(open));nav.classList.toggle('open',open);});
  nav.addEventListener('click',function(event){if(event.target.closest('a'))close();});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&nav.classList.contains('open')){close();button.focus();}});
});
