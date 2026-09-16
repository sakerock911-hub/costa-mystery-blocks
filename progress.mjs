import {COLORS,initialBoard,initialPieces,makePiece,findMoves,hasAnyMove,placePiece,generatePieces,getFullLines} from './engine.mjs';
const validNumber=n=>Number.isSafeInteger(n)&&n>=0&&n<=1_000_000_000;
const safe=n=>validNumber(n)?n:0;
export const defaults=()=>({best:0,totalLines:0,research:0,clues:0,sound:false,launchSound:true,musicVolume:32,round:null});
export function chooseClue(board,pieces,rng=Math.random){
 const reachable=new Set();for(const piece of pieces){if(!piece)continue;for(const {row,col} of findMoves(board,piece))for(const [r,c]of piece.cells)reachable.add((r+row)*8+c+col);}
 const choices=[...reachable];return choices.length?choices[Math.min(choices.length-1,Math.floor(rng()*choices.length))]:null;
}
export function newSession(best=0){return{board:initialBoard(),pieces:initialPieces(),score:0,combo:0,roundLines:0,roundClues:0,over:false,startingBest:best,clueIndex:61};}
export function validateRound(raw){
 if(!raw||!Array.isArray(raw.board)||raw.board.length!==64||!raw.board.every(c=>c===null||COLORS.includes(c))||!Array.isArray(raw.pieces)||raw.pieces.length!==3)return null;
 if(!['score','combo','roundLines','startingBest'].every(k=>validNumber(raw[k])))return null;
 const pieces=[];for(const p of raw.pieces){if(p===null){pieces.push(null);continue;}if(!p||!COLORS.includes(p.color)||!Array.isArray(p.cells)||p.cells.length<1||p.cells.length>9||!p.cells.every(c=>Array.isArray(c)&&c.length===2&&c.every(n=>Number.isInteger(n)&&n>=0&&n<=4))||new Set(p.cells.map(c=>c.join(','))).size!==p.cells.length)return null;
 if(Math.min(...p.cells.map(c=>c[0]))!==0||Math.min(...p.cells.map(c=>c[1]))!==0)return null;pieces.push(makePiece(p.cells,p.color));}
 if(pieces.every(p=>!p)||getFullLines(raw.board).count)return null;
 const board=[...raw.board],over=!hasAnyMove(board,pieces),clueIndex=Number.isInteger(raw.clueIndex)&&raw.clueIndex>=0&&raw.clueIndex<64&&!board[raw.clueIndex]?raw.clueIndex:null;
 return{board,pieces,score:raw.score,combo:raw.combo,roundLines:raw.roundLines,roundClues:safe(raw.roundClues),startingBest:raw.startingBest,over,clueIndex:over?null:clueIndex??chooseClue(board,pieces)};
}
export function normalizeProgress(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return defaults();
 const totalLines=safe(raw.totalLines),round=validateRound(raw.round);
 return{best:Math.max(safe(raw.best),round?.score??0),totalLines,research:Math.max(safe(raw.research),totalLines),clues:safe(raw.clues),sound:raw.sound===true,launchSound:raw.launchSound!==false,musicVolume:Number.isFinite(raw.musicVolume)?Math.max(0,Math.min(100,raw.musicVolume)):32,round};
}
export function advanceSession(state,slot,row,col,rng=Math.random){
 if(state.over||!Number.isInteger(slot)||slot<0||slot>2)return null;
 const p=state.pieces[slot],result=placePiece(state.board,p,row,col,state.combo);if(!result)return null;
 const clueFound=state.clueIndex!==null&&result.occupied.includes(state.clueIndex),bonus=clueFound?50:0;
 let pieces=state.pieces.map((p,i)=>i===slot?null:p);if(pieces.every(p=>!p))pieces=generatePieces(result.board,rng);
 const over=!hasAnyMove(result.board,pieces),session={...state,board:result.board,pieces,score:state.score+result.points+bonus,combo:result.combo,roundLines:state.roundLines+result.lines.count,roundClues:(state.roundClues||0)+Number(clueFound),over};
 const reachable=pieces.some(p=>p&&findMoves(session.board,p).some(({row,col})=>p.cells.some(([r,c])=>(r+row)*8+c+col===state.clueIndex)));
 session.clueIndex=over?null:clueFound||!reachable?chooseClue(session.board,pieces,rng):state.clueIndex;
 return{session,result:{...result,points:result.points+bonus},clueFound,researchGained:result.lines.count+(clueFound?3:0)};
}
export function exportProgress(progress){return JSON.stringify({schema:'costa-mystery-blocks',version:2,progress},null,2);}
export function importProgress(text){
 if(typeof text!=='string'||text.length>100000)throw Error('ファイルを確認してください。');
 let data;try{data=JSON.parse(text);}catch{throw Error('セーブファイルを読み取れませんでした。');}
 const p=data?.progress;if(data?.schema!=='costa-mystery-blocks'||data.version!==2||!p||!['best','totalLines','research','clues'].every(k=>validNumber(p[k]))||(p.round!==null&&!validateRound(p.round)))throw Error('このゲームのセーブファイルを選んでください。');
 return normalizeProgress(p);
}
