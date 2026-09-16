// Screen transitions stay separate from puzzle state: entering never discards a round.
export function setupTitleScreen({soundscape,stats,prepareGame,prepareTitle,onScene}) {
  const $=s=>document.querySelector(s),title=$('#title-screen'),game=$('#game-screen'),button=$('#investigate-button');
  let phase='title';
  function setPhase(next){phase=next;onScene(next);}
  function refresh(){
    const {found,best,resumable}=stats();
    $('#title-found').textContent=found+' / 100';
    $('#title-best').textContent=best.toLocaleString('ja-JP');
    $('#title-resume').textContent=resumable?'前回の盤面から調査を再開します。':'ブロックをそろえて、100の謎を解き明かそう。';
  }
  function showTitle(focus=true){
    if(phase==='entering')return;
    setPhase('title');prepareTitle();refresh();
    game.hidden=true;game.inert=true;game.classList.remove('arriving');
    title.hidden=false;title.inert=false;title.classList.remove('entering');
    button.disabled=false;$('#investigate-label').textContent='調査START';
    soundscape.enterTitle();window.scrollTo({top:0,behavior:'instant'});
    if(focus)$('#title-heading').focus({preventScroll:true});
  }
  function launch(){
    if(phase!=='title')return;
    setPhase('entering');button.disabled=true;$('#investigate-label').textContent='調査に出発…';
    // Unlock both audio engines inside the click, before any animation delay.
    soundscape.startInvestigation();prepareGame();title.inert=true;title.classList.add('entering');
    setTimeout(()=>{
      title.hidden=true;game.hidden=false;game.inert=false;game.classList.add('arriving');
      setPhase('game');window.scrollTo({top:0,behavior:'instant'});$('#game-title').focus({preventScroll:true});
    },window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650);
  }
  button.addEventListener('click',launch);
  $('#title-return').addEventListener('click',()=>showTitle());
  $('.brand').addEventListener('click',e=>{e.preventDefault();showTitle();});
  showTitle(false);
  return {showTitle};
}
