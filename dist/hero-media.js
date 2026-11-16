/* One local playlist works on the hosted site and in the standalone ZIP. */
(async () => {
  const host=document.querySelector('.hero-water');
  const controls=document.getElementById('hero-media-controls');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let data;
  try {
    const embedded=document.getElementById('hero-media-data');
    if(embedded)data=JSON.parse(embedded.textContent);
    else {const response=await fetch('hero-media.json');if(!response.ok)return;data=await response.json();}
  }catch{return;}
  if(!Array.isArray(data)||!host||!controls)return;
  data=data.filter(item=>['image','video'].includes(item.type)&&/^assets\/[a-zA-Z0-9_./-]+$/.test(item.src)&&!item.src.includes('..'));
  if(!data.length)return;
  let active=0,timer=0,paused=false,visible=true,sound=false,requested=0;
  const failed=new Set(),loading=new Set();
  const backup=host.querySelector('img');
  if(backup){backup.className='hero-media-backup';backup.alt='';backup.setAttribute('aria-hidden','true');}
  const elements=data.map((item,index)=>{
    const element=document.createElement(item.type==='video'?'video':'img');
    element.className='hero-media-slide'+(index===0?' is-active':'');
    element.style.setProperty('--media-focus',item.focus||'center');
    element.setAttribute('aria-hidden',String(index!==0));
    if(item.type==='video'){
      element.muted=true;element.defaultMuted=true;element.playsInline=true;
      element.setAttribute('muted','');element.setAttribute('playsinline','');
      element.preload=index===0?'auto':'metadata';
      if(item.poster)element.poster=item.poster;
      element.setAttribute('aria-label',item.alt||'Видео FLASH SWIM');
      element.addEventListener('loadedmetadata',()=>{if(index===active)schedule();});
      element.addEventListener('ended',()=>{if(index===active&&!paused&&visible&&!document.hidden&&!reduced.matches)show(active+1);});
    }else{element.alt=item.alt||'Фото FLASH SWIM';element.decoding='async';}
    element.addEventListener('error',()=>recover(index));
    element.src=item.src;host.append(element);return element;
  });
  controls.innerHTML='<button class="media-switch media-prev" type="button" aria-label="Предыдущий материал">←</button><span class="media-counter"></span><button class="media-switch media-next" type="button" aria-label="Следующий материал">→</button><button class="media-switch media-pause" type="button" aria-label="Приостановить смену фото и видео" aria-pressed="false">Пауза</button><button class="media-switch media-sound" type="button" aria-label="Включить звук видео" aria-pressed="false">Звук выкл.</button><span class="hero-media-caption"></span>';
  controls.hidden=false;
  const pauseButton=controls.querySelector('.media-pause'),soundButton=controls.querySelector('.media-sound');
  controls.querySelector('.media-prev').disabled=data.length<2;
  controls.querySelector('.media-next').disabled=data.length<2;
  function updateSound(){
    soundButton.disabled=elements[active].tagName!=='VIDEO';
    soundButton.textContent=sound?'Звук вкл.':'Звук выкл.';
    soundButton.setAttribute('aria-pressed',String(sound));
    soundButton.setAttribute('aria-label',sound?'Выключить звук видео':'Включить звук видео');
  }
  function playVideo(element,index){
    element.muted=!sound;
    element.play().catch(error=>{
      if(error?.name==='AbortError'||index!==active||paused||!visible||document.hidden)return;
      if(sound){sound=false;updateSound();element.muted=true;element.play().catch(()=>recover(index));}
      else recover(index);
    });
  }
  function schedule(){
    clearTimeout(timer);timer=0;
    if(paused||!visible||document.hidden||reduced.matches)return;
    const element=elements[active];
    if(element.tagName==='VIDEO'){
      playVideo(element,active);
      const remaining=Number.isFinite(element.duration)&&element.duration>0
        ? Math.max(0,element.duration-element.currentTime)*1000+800
        : Math.max(7000,Number(data[active].duration)||22000);
      timer=setTimeout(()=>show(active+1),remaining);
    }else timer=setTimeout(()=>show(active+1),Math.max(4000,Number(data[active].duration)||7000));
  }
  function show(index){
    let next=((index%data.length)+data.length)%data.length;
    for(let count=0;failed.has(next)&&count<data.length;count++)next=(next+1)%data.length;
    if(failed.has(next)){clearTimeout(timer);controls.hidden=true;return;}
    requested=next;
    const nextElement=elements[next];
    if(nextElement.tagName==='IMG'&&(!nextElement.complete||!nextElement.naturalWidth)){
      if(!loading.has(next)){
        loading.add(next);
        nextElement.addEventListener('load',()=>{loading.delete(next);if(requested===next)show(next);},{once:true});
      }
      schedule();return;
    }
    elements.forEach((element,elementIndex)=>{
      const current=elementIndex===next;
      element.classList.toggle('is-active',current);
      element.setAttribute('aria-hidden',String(!current));
      if(element.tagName==='VIDEO'){
        element.pause();
        if(current){try{element.currentTime=0;}catch{}}
      }
    });
    active=next;
    controls.querySelector('.media-counter').innerHTML=`<strong>${active+1}</strong> / ${data.length}`;
    controls.querySelector('.hero-media-caption').textContent=data[active].caption||'';
    updateSound();schedule();
  }
  function recover(index){
    failed.add(index);
    if(index!==active)return;
    const photo=data.findIndex((item,i)=>item.type==='image'&&!failed.has(i)&&elements[i].complete&&elements[i].naturalWidth>0);
    show(photo>=0?photo:index+1);
  }
  controls.querySelector('.media-prev').addEventListener('click',()=>show(active-1));
  controls.querySelector('.media-next').addEventListener('click',()=>show(active+1));
  pauseButton.addEventListener('click',()=>{
    paused=!paused;
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.setAttribute('aria-label',paused?'Продолжить смену фото и видео':'Приостановить смену фото и видео');
    pauseButton.textContent=paused?'Продолжить':'Пауза';
    if(paused&&elements[active].tagName==='VIDEO')elements[active].pause();
    schedule();
  });
  soundButton.addEventListener('click',()=>{if(elements[active].tagName==='VIDEO'){sound=!sound;elements[active].muted=!sound;updateSound();}});
  function visibilityChanged(){
    if(!visible||document.hidden){clearTimeout(timer);timer=0;if(elements[active].tagName==='VIDEO')elements[active].pause();}
    else schedule();
  }
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visibilityChanged();},{threshold:.1}).observe(host);
  document.addEventListener('visibilitychange',visibilityChanged);
  reduced.addEventListener('change',()=>{if(reduced.matches&&elements[active].tagName==='VIDEO')elements[active].pause();schedule();});
  show(0);
})();
