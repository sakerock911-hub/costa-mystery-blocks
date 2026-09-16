// Original synthetic UFO/cryptid effects plus the authored occult radio loop.
export function setupSoundscape({prefs,save,notify}) {
  const $=s=>document.querySelector(s), music=$('#bgm'), button=$('#music-button'), titleMusic=$('#title-bgm');
  let context,master,requested=false,suspendedByPage=false,loading=false,scene=titleMusic?'title':'game',generation=0,needsGesture=false,loadFailed=false;
  let discoveryBuffer=null,discoverySource=null,discoveryGain=null,discoveryTicket=0;
  const tracks=[music,titleMusic].filter(Boolean),current=()=>scene==='title'?titleMusic:music;
  function engine() {
    if(!context) {
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return null;
      context=new Audio();master=context.createGain();master.gain.value=.48;
      const limiter=context.createDynamicsCompressor();limiter.threshold.value=-12;limiter.knee.value=12;limiter.ratio.value=5;
      master.connect(limiter);limiter.connect(context.destination);
      void loadDiscovery();
    }
    if(context.state==='suspended')void context.resume().catch(()=>{});
    return context;
  }
  function loadDiscovery() {
    if(!discoveryBuffer){
      const c=context;
      discoveryBuffer=fetch(new URL('./assets/uma-discovery-laugh.mp3',import.meta.url))
        .then(response=>{if(!response.ok)throw Error('Discovery audio unavailable');return response.arrayBuffer();})
        .then(bytes=>c.decodeAudioData(bytes))
        .catch(()=>{discoveryBuffer=null;return null;});
    }
    return discoveryBuffer;
  }
  function stopDiscovery() {
    discoveryTicket++;
    if(!discoverySource)return;
    const source=discoverySource,gain=discoveryGain;
    discoverySource=null;discoveryGain=null;
    source.onended=null;
    try{source.stop();}catch{}
    source.disconnect();gain.disconnect();
  }
  async function playDiscovery() {
    stopDiscovery();const ticket=discoveryTicket;
    try {
      const buffer=await loadDiscovery();
      if(!buffer||ticket!==discoveryTicket||!prefs.sound||document.hidden||scene!=='game')return;
      const source=context.createBufferSource(),gain=context.createGain();
      source.buffer=buffer;gain.gain.value=.68;
      source.connect(gain);gain.connect(master);
      source.onended=()=>{source.disconnect();gain.disconnect();if(discoverySource===source){discoverySource=null;discoveryGain=null;}};
      discoverySource=source;discoveryGain=gain;source.start();
    } catch {stopDiscovery();}
  }
  function tone({at=0,duration=.25,from=500,to=180,level=.12,type='sine',wobble=0,wobbleHz=18,cutoff=5000}) {
    const c=context,t=c.currentTime+at,o=c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();
    o.type=type;o.frequency.setValueAtTime(from,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+duration);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(level,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    filter.type='lowpass';filter.frequency.value=cutoff;o.connect(filter);filter.connect(g);g.connect(master);
    const nodes=[o,g,filter];
    if(wobble){const lfo=c.createOscillator(),depth=c.createGain();lfo.frequency.value=wobbleHz;depth.gain.value=wobble;lfo.connect(depth);depth.connect(o.frequency);lfo.start(t);lfo.stop(t+duration+.03);nodes.push(lfo,depth);}
    o.onended=()=>nodes.forEach(n=>n.disconnect());o.start(t);o.stop(t+duration+.035);
  }
  function breath({at=0,duration=.25,frequency=900,to=300,level=.075,q=3}) {
    const c=context,t=c.currentTime+at,buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.setValueAtTime(frequency,t);filter.frequency.exponentialRampToValueAtTime(to,t+duration);filter.Q.value=q;
    gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(level,t+.015);gain.gain.exponentialRampToValueAtTime(.0001,t+duration);
    source.connect(filter);filter.connect(gain);gain.connect(master);source.onended=()=>[source,filter,gain].forEach(n=>n.disconnect());source.start(t);
  }
  function effect(kind,color='mint',lines=1) {
    if(!prefs.sound)return;
    try {
      if(!engine())return;
      if(kind==='place') {
        if(color==='red') { // Moth wing flutter and an alien insect trill.
          breath({duration:.19,frequency:1750,to:800,level:.15,q:1.8});tone({duration:.16,from:620,to:260,wobble:110,wobbleHz:54,level:.065});
        } else if(color==='yellow') { // A heavy cryptid footprint with a guttural tail.
          tone({duration:.23,from:110,to:39,level:.24,type:'triangle',cutoff:420});breath({duration:.14,frequency:320,to:140,level:.2,q:1});
        } else if(color==='purple') { // A short, oddly vocal telepathic syllable.
          tone({duration:.24,from:230,to:120,wobble:48,wobbleHz:28,level:.13,type:'triangle',cutoff:1600});tone({duration:.18,from:670,to:430,level:.045,wobble:30,wobbleHz:13});
        } else { // Saucer landing chirp.
          tone({duration:.23,from:940,to:150,wobble:80,wobbleHz:24,level:.10});tone({duration:.14,from:94,to:46,level:.1,type:'triangle'});
        }
      } else if(kind==='clear') {
        // A crisp burst, a rising chime and a short sparkling tail.
        // Extra lines add higher notes and a brief chord; the master gain stays unchanged.
        const strength=Math.max(1,Math.min(3,Math.trunc(lines)||1));
        const notes=[659.25,783.99,1046.5,1318.51,1567.98,2093].slice(0,3+strength);
        tone({duration:.17,from:175,to:55,level:.20,type:'triangle',cutoff:950});
        tone({duration:.11,from:880,to:240,level:.085,type:'triangle',cutoff:2600});
        breath({duration:.14,frequency:2400,to:700,level:.11,q:.8});
        breath({at:.025,duration:.24,frequency:550,to:3000,level:.075,q:1.2});
        notes.forEach((frequency,i)=>{
          const at=.025+i*.055;
          tone({at,duration:.24,from:frequency,to:frequency,level:.105,type:'triangle',cutoff:4800});
          tone({at,duration:.16,from:frequency*2,to:frequency*2.003,level:.026,cutoff:6000});
        });
        const finish=.025+(notes.length-1)*.055;
        tone({at:finish+.10,duration:.22,from:notes.at(-1),to:notes.at(-1),level:.036});
        if(strength>1){
          for(const frequency of [1046.5,1567.98])tone({at:finish+.035,duration:.30,from:frequency,to:frequency,level:.038});
        }
      } else if(kind==='start') { // A lock-on signal, engine surge and departure into the unknown.
        tone({duration:.72,from:58,to:235,level:.2,type:'triangle',wobble:15,wobbleHz:9,cutoff:800});
        breath({at:.08,duration:.73,frequency:210,to:3100,level:.12,q:5});
        for(const [at,from,to]of [[0,510,480],[.14,740,710],[.31,980,2200]])tone({at,duration:.33,from,to,level:.09,wobble:36,wobbleHz:25});
      } else if(kind==='clue') {
        tone({duration:.18,from:430,to:850,level:.09,wobble:25,wobbleHz:29});
        tone({at:.11,duration:.35,from:1100,to:540,level:.055,wobble:60,wobbleHz:9});
      } else if(kind==='discover') {
        void playDiscovery();
      } else {
        tone({duration:.18,from:180,to:73,level:.07,type:'triangle',wobble:30,wobbleHz:38});
      }
    } catch { /* Audio support must never interrupt a move. */ }
  }
  function renderEffects() {
    $('#sound-button').innerHTML=`<svg aria-hidden="true"><use href="#i-${prefs.sound?'sound':'muted'}"/></svg>`;
    $('#sound-button').setAttribute('aria-pressed',String(prefs.sound));
    $('#sound-button').setAttribute('aria-label',`UFO・UMAの効果音を${prefs.sound?'オフ':'オン'}にする`);
    $('#sound-button').title=`効果音 ${prefs.sound?'ON':'OFF'}`;
  }
  function renderMusic() {
    const active=scene==='game'&&!music.paused&&!music.ended;
    button.textContent=scene==='game'&&loading?'受信中…':active?'BGMを停止':'BGMを再生';
    button.setAttribute('aria-pressed',String(active));
    $('#radio-led').classList.toggle('active',active);
    $('#music-status').textContent=active?'怪電波、受信中。':scene==='game'&&suspendedByPage?'画面に戻ると再開します。':'未確認周波数、受信待機。';
    if(titleMusic){
      const on=scene==='title'&&!titleMusic.paused&&!titleMusic.ended;
      $('#title-music-button').textContent=scene==='title'&&loading?'受信中…':on?'BGMを停止':'BGMを再生';
      $('#title-music-button').setAttribute('aria-pressed',String(on));
      $('#title-sound').checked=prefs.launchSound!==false;
      $('#title-music-status').textContent=loadFailed&&scene==='title'?'音源を読み込めませんでした。BGM再生でもう一度お試しください。':on?'謎の周波数を受信中。何かが、こちらを見ている。':needsGesture?'音を出すには「BGMを再生」をタップ。調査STARTでも音が入ります。':prefs.launchSound===false?'サウンドOFF。静かに調査へ出発します。':'音が出ないときは「BGMを再生」をタップ。';
    }
  }
  function applyVolume(){
    for(const track of tracks){track.volume=prefs.musicVolume/100;track.muted=prefs.musicVolume===0;}
    $('#music-volume').value=prefs.musicVolume;
    if(titleMusic)$('#title-volume').value=prefs.musicVolume;
  }
  async function playMusic(quiet=false) {
    const track=current(),ticket=++generation;
    if(!track||document.hidden){suspendedByPage=requested;return;}
    loading=true;needsGesture=false;loadFailed=false;renderMusic();
    try {
      await track.play();
      // A previous scene's play promise may settle after another track has started.
      if(track!==current()||!requested||document.hidden)track.pause();
    } catch(error) {
      if(ticket===generation){requested=false;needsGesture=error?.name==='NotAllowedError'||quiet;
        if(!quiet){loadFailed=!needsGesture;if(scene==='game')notify('BGMを再生できませんでした。もう一度「BGMを再生」を押してください。');}
      }
    } finally {if(ticket===generation)loading=false;renderMusic();}
  }
  function stopMusic(){generation++;requested=false;loading=false;suspendedByPage=false;needsGesture=false;for(const track of tracks)track.pause();renderMusic();}
  function switchScene(next,wantsMusic){
    stopDiscovery();
    generation++;loading=false;requested=false;needsGesture=false;loadFailed=false;suspendedByPage=false;
    for(const track of tracks)track.pause();scene=next;requested=wantsMusic;renderMusic();
  }
  function enterTitle(){
    if(!titleMusic)return;
    switchScene('title',prefs.launchSound!==false);
    if(requested)void playMusic(true);
  }
  function startInvestigation(){
    const enabled=prefs.launchSound!==false;
    switchScene('game',enabled);
    if(titleMusic)titleMusic.currentTime=0;
    prefs.sound=enabled;save();renderEffects();
    if(enabled){effect('start');void playMusic();}
  }
  button.addEventListener('click',()=>{
    if(scene!=='game')return;
    if(requested)stopMusic();else{requested=true;suspendedByPage=false;void playMusic();}
  });
  function volumeInput(e){prefs.musicVolume=Math.max(0,Math.min(100,Number(e.target.value)||0));applyVolume();save();}
  $('#music-volume').addEventListener('input',volumeInput);
  $('#sound-button').addEventListener('click',()=>{prefs.sound=!prefs.sound;save();renderEffects();if(prefs.sound)effect('place','mint');else stopDiscovery();});
  if(titleMusic){
    $('#title-volume').addEventListener('input',volumeInput);
    $('#title-sound').addEventListener('change',e=>{
      prefs.launchSound=e.target.checked;save();
      if(!prefs.launchSound)stopMusic();else{requested=true;void playMusic();}
      renderMusic();
    });
    $('#title-music-button').addEventListener('click',()=>{
      if(scene!=='title')return;
      if(requested)stopMusic();else{prefs.launchSound=true;save();requested=true;void playMusic();}
    });
  }
  for(const track of tracks){
    track.addEventListener('play',renderMusic);track.addEventListener('pause',renderMusic);
    track.addEventListener('error',()=>{
      if(track!==current())return;
      generation++;requested=false;loading=false;needsGesture=false;loadFailed=true;renderMusic();
      if(scene==='game')notify('BGMを読み込めませんでした。ページを再読み込みしてください。');
    });
  }
  function suspend(){stopDiscovery();generation++;loading=false;suspendedByPage=requested;for(const track of tracks)track.pause();if(context?.state==='running')void context.suspend().catch(()=>{});renderMusic();}
  function resume(){if(suspendedByPage&&requested){suspendedByPage=false;void playMusic(scene==='title');}renderMusic();}
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();else resume();});
  window.addEventListener('pagehide',suspend);
  window.addEventListener('pageshow',e=>{if(e.persisted)resume();});
  applyVolume();renderEffects();renderMusic();
  return {effect,enterTitle,startInvestigation,stopDiscovery};
}
