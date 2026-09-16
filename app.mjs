import {createBlockDrag} from './drag.mjs';
import {setupTitleScreen} from './title.mjs';
import {CATEGORIES} from './catalog.mjs';
import {normalizeProgress,newSession,advanceSession,exportProgress,importProgress} from './progress.mjs';
import {setupSoundscape} from './audio.mjs';
import {SYMBOLS,MOTIFS,FILES,initialBoard,initialPieces,canPlace,findMoves,getFullLines,placePiece,generatePieces,hasAnyMove} from './engine.mjs';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)], format=n=>n.toLocaleString('ja-JP');
const STORAGE='costa-mystery-blocks-v1';
let saved=normalizeProgress(null),storageWorks=true;
try{saved=normalizeProgress(JSON.parse(localStorage.getItem(STORAGE)||'null'));}catch{storageWorks=false;}
let pendingImport=null,guidePage=0,guideCategory='all',guideStatus='all',guideSearch='',discoveryQueue=[];
let scene='title',state,selected=-1,hover=null,focusIndex=0,busy=false,toastTimer,celebrateTimer,gameId=0;
const cells=[],boardEl=$('#board'),tray=$('#tray'),ghost=$('#drag-ghost');
function save(){if(state)saved.round=state;try{localStorage.setItem(STORAGE,JSON.stringify(saved));storageWorks=true;}catch{storageWorks=false;}const note=$('.local-note');if(note){note.textContent=storageWorks?'図鑑と途中の盤面は、このブラウザに自動保存。':'保存できない環境です。「記録を保存」で控えを残してください。';note.classList.toggle('storage-warning',!storageWorks);}}
function fileNumber(i){return String(i+1).padStart(3,'0');}
function artMarkup(f){const [x,y,w,h]=f.artRect;return `<svg class="archive-viewport" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><svg viewBox="${x} ${y} ${w} ${h}" overflow="hidden"><image href="${f.art}" width="${f.artWidth}" height="${f.artHeight}"/></svg></svg>`;}
function found(f){return saved.research>=f.at;}
function icon(id,cls=''){return `<svg class="${cls}" aria-hidden="true"><use href="#i-${id}"/></svg>`;}
function setupBoard(){for(let i=0;i<64;i++){const b=document.createElement('button');b.className='cell';b.type='button';b.setAttribute('role','gridcell');b.setAttribute('aria-rowindex',Math.floor(i/8)+1);b.setAttribute('aria-colindex',i%8+1);b.dataset.index=i;b.tabIndex=i===0?0:-1;
 b.addEventListener('click',()=>{if(blockDrag.active)return;focusIndex=i;if(selected<0){message('下のブロックを選んでから、置く場所をタップ。');return;}void place(selected,Math.floor(i/8),i%8);});
 b.addEventListener('pointerenter',()=>{if(blockDrag.active||selected<0)return;hover={row:Math.floor(i/8),col:i%8};renderBoard();});
 b.addEventListener('focus',()=>{focusIndex=i;if(!blockDrag.active&&selected>=0){hover={row:Math.floor(i/8),col:i%8};renderBoard();}});cells.push(b);boardEl.append(b);}
 boardEl.addEventListener('pointerleave',()=>{if(!blockDrag.active){hover=null;renderBoard();}});
}
function startGame(restore=false){gameId++;clearTimeout(celebrateTimer);clearTimeout(toastTimer);discoveryQueue=[];$$('dialog[open]').forEach(d=>d.close());$('#toast').classList.remove('visible');state=restore&&saved.round?saved.round:newSession(saved.best);selected=-1;hover=null;focusIndex=0;busy=false;cancelDrag();$('#board-celebration').classList.remove('show');$('#particles').replaceChildren();render();save();message(state.over?'前回の調査は終了しました。「やり直す」で次の探検へ。':restore&&state.score?'前回の盤面から調査を再開しました。':'光る「？」を覆って、手がかりを見つけよう。');$('#costa-speech').innerHTML='小さな手がかりも、<br><strong>見逃さないでね！</strong>';}
function renderBoard(displayBoard=state.board,clearing=[],placed=[]){const preview=new Set(),invalid=new Set(),full=new Set(),p=state.pieces[selected];
 if(!busy&&p&&hover){const valid=canPlace(state.board,p,hover.row,hover.col);for(const[r,c]of p.cells){const rr=r+hover.row,cc=c+hover.col;if(rr>=0&&rr<8&&cc>=0&&cc<8)(valid?preview:invalid).add(rr*8+cc);}if(valid){const temp=[...state.board];preview.forEach(i=>temp[i]=p.color);getFullLines(temp).indices.forEach(i=>full.add(i));}}
 cells.forEach((b,i)=>{const color=preview.has(i)?p.color:displayBoard[i];
  const classes='cell'+(color?' tile '+color:'')+(preview.has(i)?' preview':'')+(invalid.has(i)?' invalid':'')+(full.has(i)?' will-clear':'')+(clearing.includes(i)?' clearing':'')+(placed.includes(i)?' just-placed':'')+(i===state.clueIndex&&!displayBoard[i]?' clue':'');
  if(b.className!==classes)b.className=classes;
  const symbol=color?SYMBOLS[color]:'';if(b.dataset.symbol!==symbol)b.dataset.symbol=symbol;
  const tabIndex=i===focusIndex?0:-1;if(b.tabIndex!==tabIndex)b.tabIndex=tabIndex;
  const label=`${Math.floor(i/8)+1}行${i%8+1}列、${displayBoard[i]?MOTIFS[displayBoard[i]]+'ブロックあり':'空き'}${i===state.clueIndex?'、怪異反応。ここを覆うと調査ポイント獲得':''}`;
  if(b.getAttribute('aria-label')!==label)b.setAttribute('aria-label',label);
  const ariaSelected=preview.has(i)?'true':'false';if(b.getAttribute('aria-selected')!==ariaSelected)b.setAttribute('aria-selected',ariaSelected);
 });
}
function shapeElement(p){const shape=document.createElement('span');shape.className='piece-shape';shape.style.gridTemplateColumns=`repeat(${p.width},1fr)`;if(Math.max(p.width,p.height)>=4)shape.style.setProperty('--piece-cell',Math.max(p.width,p.height)>=5?'15px':'18px');shape.setAttribute('aria-hidden','true');for(let r=0;r<p.height;r++)for(let c=0;c<p.width;c++){const tile=document.createElement('span'),on=p.cells.some(([pr,pc])=>pr===r&&pc===c);tile.className='mini-tile '+(on?'tile '+p.color:'blank');tile.dataset.symbol=on?SYMBOLS[p.color]:'';shape.append(tile);}return shape;}
function renderTray(){tray.replaceChildren();state.pieces.forEach((p,i)=>{const b=document.createElement('button');b.type='button';const can=p&&findMoves(state.board,p).length>0;b.className='piece-slot'+(!p?' used':'')+(i===selected?' selected':'')+(p&&!can?' unplaceable':'');b.disabled=!p||state.over||busy;b.setAttribute('aria-pressed',String(i===selected));b.setAttribute('aria-label',p?`ブロック${i+1}、${MOTIFS[p.color]}、縦${p.height}横${p.width}、${p.cells.length}マス${can?'':'、今は置けません'}`:`ブロック${i+1}、配置済み`);b.dataset.slot=i;if(p){b.innerHTML=`<span class="slot-number">${i+1}</span>`;b.append(shapeElement(p));b.addEventListener('pointerdown',e=>beginDrag(e,i,b));b.addEventListener('click',e=>{if(e.detail===0)selectPiece(i);});}tray.append(b);});}
function renderStats(){$('#score').textContent=format(state.score);$('#best').textContent=format(saved.best);$('#research-total').textContent=format(saved.research);}
function render(){renderBoard();renderTray();renderStats();renderCollection();}
function selectPiece(i){if(scene!=='game'||busy||state.over||!state.pieces[i])return false;if(blockDrag.active)cancelDrag();selected=i;hover=null;renderBoard();$$('.piece-slot').forEach((b,j)=>{b.classList.toggle('selected',j===i);b.setAttribute('aria-pressed',String(j===i));});const available=findMoves(state.board,state.pieces[i]).length;message(available?'置きたい場所をタップ。ドラッグでも置けます。':'このブロックは今は置けません。ほかを試そう。',available?'':'error');return true;}
function renderCollection(){
 const count=FILES.filter(found).length;$('#collection-count').textContent=count;$('#collection-total').textContent='/ '+FILES.length;
 const nextIndex=FILES.findIndex(f=>!found(f)),index=nextIndex<0?FILES.length-1:nextIndex,next=nextIndex<0?null:FILES[index],f=FILES[index];
 $('#case-number').textContent=next?'FILE '+fileNumber(index):'COMPLETE';$('#mission-art').className='mission-art archive-art';$('#mission-art').innerHTML=artMarkup(f);$('#mission-art').setAttribute('aria-label',f.name+'のイメージ');$('#mission-tag').textContent=next?f.type:'ALL FOUND';$('#mission-name').textContent=next?f.name:'100の謎を解き明かした！';$('#mission-copy').textContent=next?'反応マスの「？」をブロックで覆って手がかりを採取。ライン消去でも調査が進むよ。':'コス太の図鑑が完成！発見した調査記録を読み返そう。';
 const previous=index?FILES[index-1].at:0,goal=next?f.at-previous:1,current=next?saved.research-previous:1;
 $('#mission-goal').innerHTML=next?`あと <b>${f.at-saved.research}</b> ptで発見`:'図鑑コンプリート！';$('#mission-fraction').textContent=`${current} / ${goal}`;$('#mission-progress').setAttribute('aria-valuemax',goal);$('#mission-progress').setAttribute('aria-valuenow',current);$('#mission-progress-fill').style.width=`${Math.min(100,current/goal*100)}%`;$('#mobile-mission-name').textContent=next?f.name:'図鑑完成！';$('#mobile-mission-goal').textContent=next?`あと${f.at-saved.research}pt`:'100 / 100';
 const start=Math.max(0,Math.min(FILES.length-4,count-2));$('#collection-grid').innerHTML=FILES.slice(start,start+4).map((f,j)=>{const i=start+j,unlocked=found(f);return `<button class="collection-card ${unlocked?'':'locked'}" data-file="${i}" aria-label="${unlocked?f.name:'未発見のミステリー'}、図鑑をひらく"><span class="collection-image archive-art">${artMarkup(f)}</span>${unlocked?'<span class="unlocked-badge">発見</span>':icon('lock','lock-icon')}<span class="collection-meta"><span class="file-id">FILE ${fileNumber(i)}</span><span class="collection-title">${unlocked?f.name:'？？？'}</span></span></button>`;}).join('');$$('[data-file]').forEach(b=>b.addEventListener('click',()=>openGuide(Number(b.dataset.file))));
 $('#guide-button').innerHTML=`図鑑OPEN${icon('book')}`;$('#archive-completion').style.width=count+'%';$('#archive-completion-text').textContent=`調査達成率 ${count}%`;
}
function message(text,cls=''){$('#move-message').textContent=text;$('#move-message').className='move-message '+cls;}
function toast(text){clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').classList.add('visible');toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4300);}
function celebrate(result){const el=$('#board-celebration');el.innerHTML=`${result.combo>1?'COMBO!':result.lines.count>1?'GREAT!':'NICE!'}<small>+${format(result.points)}</small>`;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(celebrateTimer);celebrateTimer=setTimeout(()=>el.classList.remove('show'),750);$('.costa').classList.remove('happy');void $('.costa').offsetWidth;$('.costa').classList.add('happy');$('#costa-speech').innerHTML=result.combo>1?'いい調子！<br><strong>そのままいこう！</strong>':'ナイス発見！<br><strong>謎に近づいたね！</strong>';
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches){const wrap=$('#particles');for(let n=0;n<20;n++){const s=document.createElement('i');s.className='spark';const a=Math.random()*Math.PI*2,dist=65+Math.random()*200;s.style.setProperty('--x',`${Math.cos(a)*dist}px`);s.style.setProperty('--y',`${Math.sin(a)*dist}px`);s.style.setProperty('--spark-color',['#7fe1bf','#f6d475','#e66074','#a493ed'][n%4]);wrap.append(s);setTimeout(()=>s.remove(),800);}}
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function place(slot,row,col){
 if(scene!=='game'||busy||state.over||$('dialog[open]'))return{ok:false,reason:'今は配置できません'};
 if(blockDrag.active)cancelDrag();
 const p=state.pieces[slot],step=advanceSession(state,slot,row,col);if(!step){message('そこには置けません。空いている場所を探そう。','error');sound('invalid');return{ok:false,reason:'盤外またはブロックと重なっています'};}
 const currentGame=gameId,oldResearch=saved.research,{result,clueFound,researchGained}=step;
 busy=true;selected=-1;hover=null;state=step.session;saved.totalLines+=result.lines.count;saved.research+=researchGained;saved.clues+=Number(clueFound);saved.best=Math.max(saved.best,state.score);save();renderStats();renderTray();renderBoard(result.placed,result.lines.indices,result.occupied);sound(result.lines.count?'clear':clueFound?'clue':'place',p.color,result.lines.count);
 if(clueFound){$('#costa-speech').innerHTML='ここに反応あり！<br><strong>手がかりを採取！</strong>';$('#research-strip').classList.remove('clue-caught');void $('#research-strip').offsetWidth;$('#research-strip').classList.add('clue-caught');}
 if(result.lines.count){celebrate(result);message(`${result.lines.count}ライン消去${clueFound?' ＋ 手がかり発見':''}！ 調査 +${researchGained}pt`,'combo');}else if(clueFound){message('手がかり発見！ 調査 +3pt ／ スコア +50','combo');}else message('次の反応を探そう。縦・横をそろえて消すと調査+1pt。');
 await wait(result.lines.count?350:150);if(currentGame!==gameId)return{ok:false,reason:'ゲームがリセットされました'};busy=false;render();
 const discoveries=FILES.map((f,i)=>({f,i})).filter(({f})=>oldResearch<f.at&&saved.research>=f.at);discoveryQueue.push(...discoveries.map(d=>d.i));
 if(discoveries.length){showNextDiscovery();}else if(state.over)showGameOver();
 return{ok:true,points:result.points,lines:result.lines.count,research:researchGained,clueFound,score:state.score,gameOver:state.over};
}
function showGameOver(){message('調査終了！「やり直す」で新しい探検へ。');$('#final-score').textContent=format(state.score);$('#final-best').textContent=state.score>state.startingBest?'自己ベスト更新！':`自己ベスト ${format(saved.best)}`;$('#final-lines').textContent=`${state.roundLines}ライン・手がかり${state.roundClues}個 ／ 図鑑 ${FILES.filter(found).length} / 100`;openDialog('#gameover-dialog');}
function showNextDiscovery(){if(scene!=='game'||busy||$('dialog[open]'))return;if(!discoveryQueue.length){if(state.over)showGameOver();return;}const i=discoveryQueue.shift(),f=FILES[i];$('#discovery-art').innerHTML=artMarkup(f);$('#discovery-art').setAttribute('aria-label',f.name);$('#discovery-number').textContent=`FILE ${fileNumber(i)} · ${f.type} · ${f.rarity}`;$('#discovery-name').textContent=f.name;$('#discovery-note').textContent=f.description;$('#discovery-count').textContent=FILES.filter(found).length===100?'100種すべてを記録した！':`${FILES.filter(found).length} / 100種を記録`;if(openDialog('#discovery-dialog'))sound('discover');}
function openDialog(id){if(scene!=='game'||busy)return false;cancelDrag();hover=null;renderBoard();const d=$(id);if(d.open)return false;d.showModal();return true;}
function renderGuide(){
 const list=FILES.map((f,i)=>({f,i})).filter(({f})=>(guideCategory==='all'||f.type===guideCategory)&&(guideStatus==='all'||(guideStatus==='found'?found(f):!found(f)))&&(!guideSearch||found(f)&&f.name.toLowerCase().includes(guideSearch)));
 const pages=Math.max(1,Math.ceil(list.length/12));guidePage=Math.min(guidePage,pages-1);$('#guide-summary').textContent=`${FILES.filter(found).length} / 100種を発見 · 累計調査 ${format(saved.research)}pt`;
 $('#guide-entries').innerHTML=list.slice(guidePage*12,guidePage*12+12).map(({f,i})=>{const unlocked=found(f);return `<article class="guide-entry ${unlocked?'':'locked'}" id="guide-entry-${i}"><div class="guide-entry-art archive-art" role="img" aria-label="${unlocked?f.name:'未発見のシルエット'}">${artMarkup(f)}</div><div class="guide-entry-text"><span class="file-id">FILE ${fileNumber(i)} / ${f.type}</span><h3>${unlocked?f.name:'未確認'}</h3><span class="rarity">${f.rarity}</span><p>${unlocked?f.description:'この先に、まだ記録されていない謎が待っている。'}</p><span class="unlock-at">${unlocked?'✓ コス太の調査記録':`あと${f.at-saved.research}ptで発見`}</span></div></article>`;}).join('')||'<p class="guide-empty">該当する記録はありません。条件を変えて探してみよう。</p>';
 $('#guide-page').textContent=`${guidePage+1} / ${pages}ページ · ${list.length}件`;$('#guide-prev').disabled=guidePage===0;$('#guide-next').disabled=guidePage===pages-1;
}
function openGuide(fileIndex){guideCategory='all';guideStatus='all';guideSearch='';$('#guide-category').value='all';$('#guide-status').value='all';$('#guide-search').value='';guidePage=Number.isInteger(fileIndex)?Math.floor(fileIndex/12):0;renderGuide();openDialog('#guide-dialog');if(Number.isInteger(fileIndex))setTimeout(()=>$('#guide-entry-'+fileIndex)?.scrollIntoView({block:'nearest'}),0);}
const blockDrag=createBlockDrag({
 ghost,
 getPiece:slot=>scene==='game'&&!busy&&!state.over&&!$('dialog[open]')?state.pieces[slot]:null,
 measure:()=>{
  const first=cells[0].getBoundingClientRect(),nextCol=cells[1].getBoundingClientRect(),nextRow=cells[8].getBoundingClientRect();
  return {left:first.left,top:first.top,cellWidth:first.width,cellHeight:first.height,pitchX:nextCol.left-first.left,pitchY:nextRow.top-first.top};
 },
 select:selectPiece,makeShape:shapeElement,
 preview:target=>{hover=target;if(state)renderBoard();},
 drop:(slot,row,col)=>{void place(slot,row,col);}
});
function beginDrag(e,slot,button){blockDrag.begin(e,slot,button);}
function cancelDrag(){blockDrag.cancel();hover=null;}
document.addEventListener('keydown',e=>{if(scene!=='game'||$('dialog[open]'))return;if(['1','2','3'].includes(e.key)){e.preventDefault();if(selectPiece(Number(e.key)-1))cells[focusIndex].focus();return;}if(e.key==='Escape'){selected=-1;hover=null;cancelDrag();renderTray();renderBoard();message('ブロックを選んで、盤面をタップ。');return;}if(!boardEl.contains(document.activeElement))return;let row=Math.floor(focusIndex/8),col=focusIndex%8;if(e.key==='ArrowLeft')col=Math.max(0,col-1);else if(e.key==='ArrowRight')col=Math.min(7,col+1);else if(e.key==='ArrowUp')row=Math.max(0,row-1);else if(e.key==='ArrowDown')row=Math.min(7,row+1);else return;e.preventDefault();focusIndex=row*8+col;cells[focusIndex].focus();renderBoard();});
const soundscape=setupSoundscape({prefs:saved,save,notify:toast});
function sound(type,color,lines){soundscape.effect(type,color,lines);}
$('#help-button').addEventListener('click',()=>openDialog('#help-dialog'));$('#guide-button').addEventListener('click',()=>openGuide());$('#footer-guide').addEventListener('click',()=>openGuide());$('#restart-button').addEventListener('click',()=>{if(busy)return;if(state.score>0&&!state.over)openDialog('#restart-dialog');else startGame();});$('#confirm-restart').addEventListener('click',()=>startGame());$('#play-again').addEventListener('click',()=>startGame());$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$$('dialog').forEach(d=>{d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}});});
$('#guide-category').innerHTML='<option value="all">すべての種類</option>'+CATEGORIES.map(c=>`<option>${c}</option>`).join('');
$('#guide-category').addEventListener('change',e=>{guideCategory=e.target.value;guidePage=0;renderGuide();});$('#guide-status').addEventListener('change',e=>{guideStatus=e.target.value;guidePage=0;renderGuide();});$('#guide-search').addEventListener('input',e=>{guideSearch=e.target.value.trim().toLowerCase();guidePage=0;renderGuide();});
for(const [id,delta]of [['#guide-prev',-1],['#guide-next',1]])$(id).addEventListener('click',()=>{guidePage+=delta;renderGuide();$('#guide-dialog').scrollTop=0;});
$('#discovery-next').addEventListener('click',()=>$('#discovery-dialog').close());$('#discovery-dialog').addEventListener('close',()=>{soundscape.stopDiscovery();if(discoveryQueue.length||state.over)queueMicrotask(()=>{if(scene==='game'&&!$('dialog[open]'))showNextDiscovery();});});
$('#record-button').addEventListener('click',()=>{if(busy)return;$('#record-summary').textContent=`図鑑 ${FILES.filter(found).length}/100種 · 調査 ${format(saved.research)}pt · 自己ベスト ${format(saved.best)}`;openDialog('#record-dialog');});
$('#export-save').addEventListener('click',()=>{save();const blob=new Blob([exportProgress(saved)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='costa-mystery-save-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('セーブデータを書き出しました。大切に保管してね。');});
$('#import-save').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('ファイルが大きすぎます。');pendingImport=importProgress(await file.text());$('#import-summary').textContent=`読み込む記録：図鑑 ${FILES.filter(f=>pendingImport.research>=f.at).length}/100種・自己ベスト ${format(pendingImport.best)}`;$('#record-dialog').close();openDialog('#import-dialog');}catch(error){toast(error.message);}finally{e.target.value='';}});
$('#confirm-import').addEventListener('click',()=>{if(!pendingImport)return;const prefs={sound:saved.sound,musicVolume:saved.musicVolume,launchSound:saved.launchSound};Object.assign(saved,pendingImport,prefs);pendingImport=null;startGame(true);toast('調査記録を引き継ぎました。');});
window.addEventListener('pagehide',()=>{cancelDrag();save();});document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelDrag();save();}});
// Move the existing live panels so progress stays in sync at every screen size.
const mobileLayout=window.matchMedia('(max-width:620px)');
function positionResearchPanels(){
 const mission=$('.mobile-mission'),research=$('#research-strip');
 if(mobileLayout.matches)$('#guide-button').after(mission,research);
 else {$('#board-frame').before(mission);$('#guide-button').after(research);}
}
mobileLayout.addEventListener('change',positionResearchPanels);
positionResearchPanels();
setupBoard();startGame(true);
$('#title-ufo').innerHTML=artMarkup(FILES[0]);$('#title-uma').innerHTML=artMarkup(FILES[5]);
setupTitleScreen({soundscape,
 stats:()=>({found:FILES.filter(found).length,best:saved.best,resumable:!state.over&&state.score>0}),
 prepareGame:()=>{if(state.over)startGame();},
 prepareTitle:()=>{gameId++;busy=false;discoveryQueue=[];save();cancelDrag();selected=-1;hover=null;$$('dialog[open]').forEach(d=>d.close());clearTimeout(celebrateTimer);$('#board-celebration').classList.remove('show');$('#particles').replaceChildren();render();},
 onScene:next=>{scene=next;}
});

// Optional browser-native tools share all state and actions with the visible game.
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController();const read=()=>({scene,board:[...state.board],pieces:state.pieces.map(p=>p?{...p,legalPlacements:findMoves(state.board,p)}:null),score:state.score,gameOver:state.over,busy,totalLines:saved.totalLines,research:saved.research,clueIndex:state.clueIndex,discovered:FILES.filter(found).map(f=>f.name)});const toolDefs=[
 {name:'read_puzzle_state',title:'パズルの状態を読む',description:'Read current board, pieces, legal placements, score and discoveries. Rows, columns and piece slots are zero-indexed.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>read()},
 {name:'place_puzzle_block',title:'ブロックを置く',description:'Place a tray block using its zero-indexed slot and top-left row and column. Advances the game using the same placement rules as the visible board.',inputSchema:{type:'object',properties:{slot:{type:'integer',minimum:0,maximum:2},row:{type:'integer',minimum:0,maximum:7},col:{type:'integer',minimum:0,maximum:7}},required:['slot','row','col'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:async input=>{if(!input||Object.keys(input).some(k=>!['slot','row','col'].includes(k))||!['slot','row','col'].every(k=>Number.isInteger(input[k]))||input.slot<0||input.slot>2||input.row<0||input.row>7||input.col<0||input.col>7)return{ok:false,reason:'Invalid slot, row or col'};const result=await place(input.slot,input.row,input.col);return{...result,state:read()};}}
 ];for(const tool of toolDefs){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}}window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});}
