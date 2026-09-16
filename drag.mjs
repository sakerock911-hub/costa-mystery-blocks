// Pointer tracking is frame-scheduled; puzzle rules remain in the game engine.
export function dragPosition(point,piece,geometry,pointerType,previous=null){
  const {left,top,cellWidth,cellHeight,pitchX,pitchY}=geometry;
  const width=(piece.width-1)*pitchX+cellWidth,height=(piece.height-1)*pitchY+cellHeight;
  const clearance=pointerType==='touch'?Math.max(24,Math.min(34,cellHeight*.7)):0;
  const x=point.x-width/2,y=point.y-(pointerType==='touch'?height+clearance:height/2);
  // A small dead band prevents a resting finger from flickering between cells.
  const snap=(value,last)=>Number.isInteger(last)&&Math.abs(value-last)<=.58?last:Math.round(value);
  return {x,y,row:snap((y-top)/pitchY,previous?.row),col:snap((x-left)/pitchX,previous?.col)};
}

export function createBlockDrag({view=window,ghost,getPiece,measure,select,makeShape,preview,drop}){
  let current=null,frame=null,geometryDirty=false;
  const point=e=>({x:e.clientX,y:e.clientY});
  function cancelFrame(){if(frame!==null){view.cancelAnimationFrame(frame);frame=null;}}
  function schedule(){if(frame===null)frame=view.requestAnimationFrame(paint);}
  function paint(){
    frame=null;
    if(!current?.moved)return;
    const d=current;
    if(geometryDirty){d.geometry=measure();geometryDirty=false;d.sized=false;}
    const g=d.geometry,pos=dragPosition(d.point,d.piece,g,d.pointerType,d.target);
    if(!d.shown){
      ghost.replaceChildren(makeShape(d.piece));
      ghost.classList.add('is-dragging');d.button.classList.add('drag-source');
      ghost.style.display='block';d.shown=true;
    }
    if(!d.sized){
      ghost.style.setProperty('--drag-cell',g.cellWidth+'px');
      ghost.style.setProperty('--drag-cell-height',g.cellHeight+'px');
      ghost.firstChild.style.columnGap=(g.pitchX-g.cellWidth)+'px';
      ghost.firstChild.style.rowGap=(g.pitchY-g.cellHeight)+'px';
      d.sized=true;
    }
    ghost.style.transform=`translate3d(${pos.x}px,${pos.y}px,0)`;
    if(!d.target||d.target.row!==pos.row||d.target.col!==pos.col){
      d.target={row:pos.row,col:pos.col};preview(d.target);
    }
  }
  function cancel(){
    cancelFrame();
    const d=current;current=null;geometryDirty=false;
    ghost.style.display='none';ghost.classList.remove('is-dragging');ghost.replaceChildren();
    if(!d)return;
    d.button.classList.remove('drag-source');
    d.button.removeEventListener('lostpointercapture',lostCapture);
    try{if(d.button.hasPointerCapture(d.pointerId))d.button.releasePointerCapture(d.pointerId);}catch{}
    preview(null);
  }
  function begin(e,slot,button){
    if(current||e.isPrimary===false||e.button!==0)return false;
    const piece=getPiece(slot);if(!piece)return false;
    // Read layout once, before selection changes the board or the tray.
    const geometry=measure();
    if(!geometry.cellWidth||!geometry.cellHeight||!select(slot))return false;
    e.preventDefault();button.focus({preventScroll:true});
    current={slot,piece,button,pointerId:e.pointerId,pointerType:e.pointerType,start:point(e),point:point(e),geometry,moved:false,target:null,shown:false,sized:false};
    button.addEventListener('lostpointercapture',lostCapture);
    try{button.setPointerCapture(e.pointerId);}catch{}
    return true;
  }
  function move(e){
    if(!current||e.pointerId!==current.pointerId)return;
    current.point=point(e);
    if(!current.moved&&Math.hypot(e.clientX-current.start.x,e.clientY-current.start.y)<6)return;
    current.moved=true;e.preventDefault();schedule();
  }
  function up(e){
    if(!current||e.pointerId!==current.pointerId)return;
    current.point=point(e);
    current.moved ||= Math.hypot(e.clientX-current.start.x,e.clientY-current.start.y)>=6;
    cancelFrame();
    // The release can precede the next frame, or contain the final movement.
    if(current.moved){e.preventDefault();paint();}
    const completed=current;cancel();
    if(completed.moved&&completed.target)drop(completed.slot,completed.target.row,completed.target.col);
  }
  function pointerCancel(e){if(current&&e.pointerId===current.pointerId)cancel();}
  function lostCapture(e){if(current&&e.pointerId===current.pointerId)cancel();}
  function scrolled(){if(current){geometryDirty=true;if(current.moved)schedule();}}
  view.addEventListener('pointermove',move,{passive:false});
  view.addEventListener('pointerup',up);
  view.addEventListener('pointercancel',pointerCancel);
  view.addEventListener('blur',cancel);
  view.addEventListener('resize',cancel);
  view.addEventListener('scroll',scrolled,true);
  view.visualViewport?.addEventListener('resize',cancel);
  view.visualViewport?.addEventListener('scroll',scrolled);
  return {
    begin,cancel,get active(){return current;},
    destroy(){
      cancel();
      view.removeEventListener('pointermove',move);
      view.removeEventListener('pointerup',up);
      view.removeEventListener('pointercancel',pointerCancel);
      view.removeEventListener('blur',cancel);
      view.removeEventListener('resize',cancel);
      view.removeEventListener('scroll',scrolled,true);
      view.visualViewport?.removeEventListener('resize',cancel);
      view.visualViewport?.removeEventListener('scroll',scrolled);
    }
  };
}
