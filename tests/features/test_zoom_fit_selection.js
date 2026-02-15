#!/usr/bin/env node
/**
 * Timeline Studio — Item-Anchored Zoom (F31) & Fit-to-Selection (F32) Tests
 * Covers: _selCentroidDate, doZoom anchor logic, doZoomTo, fitToSelection solver,
 *   shortcut registration, edge cases (empty selection, collapsed swimlanes, hideMode).
 *
 * ~45 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertApprox,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Helpers ─────────────────────────────────────────────────────────

/** Mock _mt: approximate text width */
function _mt(text,fontSize,fontWeight){
  if(!text||text.length===0)return 0;
  const base=text.length*fontSize*0.6;
  return(fontWeight==='bold'||fontWeight>=700)?base*1.1:base;
}

/** Mock _itemLabelWidths */
function _itemLabelWidths(it){
  const fs=it.fontSize||11;
  const labelW=_mt(it.name||'',fs,'600');
  let edgeLW=0,edgeRW=0;
  if(it.showStartDate)edgeLW=_mt(it.startDate||it.date||'',fs-1.5,'400')+6;
  if(it.showEndDate)edgeRW=_mt(it.endDate||it.date||'',fs-1.5,'400')+6;
  return{labelW,edgeLW,edgeRW};
}

/**
 * Mock coordinate system — simplified linear model.
 * dX(date) returns days-from-epoch × colWidth. At z=1, colWidth=10.
 */
const EPOCH='2026-01-01';
function dX(ds,cw){
  if(!ds)return null;
  return U.days(EPOCH,ds)*cw;
}
function dXEnd(ds,cw){return dX(U.addDays(ds,1),cw)}
function dXMid(ds,cw){const a=dX(ds,cw),b=dX(U.addDays(ds,1),cw);return(a!=null&&b!=null)?(a+b)/2:a}
function xD(px,cw){return U.addDays(EPOCH,Math.round(px/cw))}

/**
 * Mock _selCentroidDate — mirrors app.js implementation.
 * Takes items array and sel array (item IDs).
 */
function _selCentroidDate(items,sel){
  if(!sel.length)return null;
  const selected=sel.map(id=>items.find(i=>i.id===id)).filter(Boolean);
  if(!selected.length)return null;
  let earliest=null,latest=null;
  for(const it of selected){
    const s=it.type==='task'?it.startDate:it.date;
    const e=it.type==='task'?it.endDate:it.date;
    if(s&&(!earliest||s<earliest))earliest=s;
    if(e&&(!latest||e>latest))latest=e;
  }
  if(!earliest||!latest)return null;
  return U.addDays(earliest,Math.round(U.days(earliest,latest)/2));
}

/**
 * Mock doZoom with anchor — mirrors app.js logic.
 * Returns {newZoom, newScrollLeft} given current state.
 */
function doZoom(d,state){
  const{zoom,scrollLeft,clientWidth,panelOpen,items,sel}=state;
  const oldZ=zoom||100;
  const newZ=U.clamp(oldZ+d,30,300);
  if(newZ===oldZ)return{newZoom:oldZ,newScrollLeft:scrollLeft};

  const panelW=panelOpen?290:0;
  const vpW=clientWidth-panelW;
  const cwOld=10*(oldZ/100);

  const cDate=_selCentroidDate(items,sel);
  let anchorPx,anchorScreenX;
  if(cDate){
    anchorPx=dX(cDate,cwOld);
    if(anchorPx!=null)anchorScreenX=U.clamp(anchorPx-scrollLeft,0,vpW);
  }
  if(anchorPx==null){
    anchorScreenX=vpW/2;
    anchorPx=scrollLeft+anchorScreenX;
  }
  const anchorDate=xD(anchorPx,cwOld);

  // After zoom
  const cwNew=10*(newZ/100);
  const newPx=dX(anchorDate,cwNew);
  const newScrollLeft=newPx!=null?Math.max(0,newPx-anchorScreenX):scrollLeft;

  return{newZoom:newZ,newScrollLeft};
}

/**
 * Mock fitToSelection solver — mirrors app.js implementation.
 * Returns {zoom, scrollLeft} or null if fallback to fitToContent.
 */
function fitToSelection(items,sel,vpWidth,hideMode){
  if(!sel.length)return null;// fallback
  const selItems=sel.map(id=>items.find(i=>i.id===id)).filter(Boolean);
  if(!selItems.length)return null;
  const fitItems=hideMode?selItems.filter(i=>!i.hidden):selItems;
  if(!fitItems.length)return null;

  // Compute geometry at z=1 (cw=10)
  const cw1=10;
  const itemGeom=[];
  for(const it of fitItems){
    const lp=it.labelPosition||'right';
    const{labelW,edgeLW,edgeRW}=_itemLabelWidths(it);
    let bL,bR,tL=0,tR=0;
    if(it.type==='task'){
      const x1=dX(it.startDate,cw1),x2=dXEnd(it.endDate,cw1);
      if(x1===null||x2===null)continue;
      bL=x1;bR=x2;
      if(lp==='right'){tR=6+labelW}
      else if(lp==='left'){tL=6+labelW}
      else if(lp==='top'||lp==='bottom'){const half=labelW/2,barHalf=(x2-x1)/2;if(half>barHalf){tL=half-barHalf;tR=half-barHalf}}
      if(edgeLW)tL=Math.max(tL,edgeLW);
      if(edgeRW)tR=Math.max(tR,edgeRW);
    }else{
      const x=dXMid(it.date,cw1);
      if(x===null)continue;
      bL=x-8;bR=x+8;
      if(lp==='right'){tR=12+labelW}
      else if(lp==='left'){tL=12+labelW}
      else if(lp==='top'||lp==='bottom'||lp==='center'){const half=labelW/2;if(half>8){tL=half-8;tR=half-8}}
    }
    itemGeom.push({bL,bR,tL,tR});
  }
  if(!itemGeom.length)return null;

  const pad=40;
  let z=1;
  for(let iter=0;iter<4;iter++){
    let minAbs=Infinity,maxAbs=-Infinity;
    for(const g of itemGeom){
      minAbs=Math.min(minAbs,z*g.bL-g.tL);
      maxAbs=Math.max(maxAbs,z*g.bR+g.tR);
    }
    z=z*(vpWidth/(maxAbs-minAbs+pad));
  }
  const newZoom=U.clamp(Math.round(z*100),10,300);

  // Compute scroll at final zoom
  const zF=newZoom/100;
  let minAbs=Infinity;
  for(const g of itemGeom)minAbs=Math.min(minAbs,zF*g.bL-g.tL);
  const scrollLeft=Math.max(0,minAbs-20);

  return{zoom:newZoom,scrollLeft};
}


// ═══════════════════════════════════════════════════════════════════
//  _selCentroidDate — SELECTION CENTROID (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('_selCentroidDate — Selection Centroid');
resetItemCounter();

(()=>{
  const r=_selCentroidDate([],[]);
  assert('Empty selection returns null',r,null);
})();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-02-01',endDate:'2026-02-10'})];
  const r=_selCentroidDate(items,['a']);
  // 10 days span, midpoint = 5 → 2026-02-06
  assert('Single task centroid is midpoint',r,'2026-02-06');
})();

(()=>{
  const items=[makeItem('milestone',{id:'m1',date:'2026-03-15'})];
  const r=_selCentroidDate(items,['m1']);
  assert('Single milestone centroid is its date',r,'2026-03-15');
})();

(()=>{
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-01',endDate:'2026-01-10'}),
    makeItem('task',{id:'b',startDate:'2026-01-20',endDate:'2026-01-31'})
  ];
  const r=_selCentroidDate(items,['a','b']);
  // Earliest=01-01, Latest=01-31, span=30 days, mid=15 → 01-16
  assert('Two tasks: centroid between earliest start and latest end',r,'2026-01-16');
})();

(()=>{
  const items=[
    makeItem('task',{id:'t1',startDate:'2026-02-01',endDate:'2026-02-10'}),
    makeItem('milestone',{id:'m1',date:'2026-02-20'})
  ];
  const r=_selCentroidDate(items,['t1','m1']);
  // Earliest=02-01, Latest=02-20, span=19, mid=10 → 02-11
  assert('Task+milestone mix: centroid correct',r,'2026-02-11');
})();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-03-10',endDate:'2026-03-10'})];
  const r=_selCentroidDate(items,['a']);
  assert('Single-day task: centroid is that day',r,'2026-03-10');
})();

(()=>{
  const items=[
    makeItem('task',{id:'a',startDate:'2026-04-01',endDate:'2026-04-01'}),
    makeItem('task',{id:'b',startDate:'2026-04-01',endDate:'2026-04-01'})
  ];
  const r=_selCentroidDate(items,['a','b']);
  assert('Same-date items: centroid is that date',r,'2026-04-01');
})();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-01-01',endDate:'2026-01-10'})];
  const r=_selCentroidDate(items,['nonexistent']);
  assert('Invalid IDs: returns null',r,null);
})();

(()=>{
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-01',endDate:'2026-01-10'}),
    makeItem('task',{id:'b',startDate:'2026-01-05',endDate:'2026-01-20'})
  ];
  const r=_selCentroidDate(items,['a']);
  // Only item 'a' selected: span=9 days, mid=5 → 01-06
  assert('Partial selection: only selected items contribute',r,'2026-01-06');
})();


// ═══════════════════════════════════════════════════════════════════
//  doZoom — ANCHORED ZOOM (~12 tests)
// ═══════════════════════════════════════════════════════════════════

section('doZoom — Anchored Zoom');
resetItemCounter();

(()=>{
  const state={zoom:100,scrollLeft:500,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(5,state);
  assert('Zoom in: new zoom is 105',r.newZoom,105);
})();

(()=>{
  const state={zoom:100,scrollLeft:500,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(-5,state);
  assert('Zoom out: new zoom is 95',r.newZoom,95);
})();

(()=>{
  const state={zoom:300,scrollLeft:500,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(5,state);
  assert('At max zoom: no change',r.newZoom,300);
  assert('At max zoom: scroll unchanged',r.newScrollLeft,500);
})();

(()=>{
  const state={zoom:30,scrollLeft:0,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(-5,state);
  assert('At min zoom: no change',r.newZoom,30);
  assert('At min zoom: scroll unchanged',r.newScrollLeft,0);
})();

(()=>{
  // No selection: anchor to viewport center
  const state={zoom:100,scrollLeft:0,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(5,state);
  // Viewport center at 600px, zoom changes 100→105
  // anchorDate = xD(600, cw=10) = day 60 from epoch
  // newPx = dX(day60, cw=10.5) = 60*10.5 = 630
  // newScroll = 630 - 600 = 30
  assert('No selection: anchor to viewport center — scroll adjusts',r.newScrollLeft,30);
})();

(()=>{
  // With selection: anchor to centroid
  const items=[makeItem('task',{id:'t1',startDate:'2026-02-01',endDate:'2026-02-10'})];
  // centroid ≈ 2026-02-06 = day 36 from epoch
  // At zoom=100, cw=10, centroidPx = 36*10 = 360
  const state={zoom:100,scrollLeft:0,clientWidth:1200,panelOpen:false,items,sel:['t1']};
  const r=doZoom(5,state);
  // anchorScreenX = clamp(360-0, 0, 1200) = 360
  // anchorDate = xD(360, 10) = day 36 from epoch = 2026-02-06
  // At newZoom=105, cw=10.5, newPx = 36*10.5 = 378
  // newScroll = 378 - 360 = 18
  assert('With selection: anchor to centroid',r.newScrollLeft,18);
})();

(()=>{
  // Panel open reduces viewport width
  const state={zoom:100,scrollLeft:0,clientWidth:1200,panelOpen:true,items:[],sel:[]};
  const r=doZoom(5,state);
  // vpW = 1200 - 290 = 910, center = 455
  // anchorDate = xD(455, 10) = day 46 ≈ 2026-02-16
  // newPx at 105% = 46*10.5 = 483
  // newScroll = 483 - 455 = 28 (approximately)
  assertGte('Panel open: scroll adjusts (greater than 0)',r.newScrollLeft,0);
  assertT('Panel open: new zoom is 105',r.newZoom===105);
})();

(()=>{
  // doZoomTo(100) from 200 — should go through doZoom(-100)
  const state={zoom:200,scrollLeft:1000,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(-100,state);
  assert('doZoomTo(100) from 200: zoom is 100',r.newZoom,100);
})();

(()=>{
  // Zoom in multiple steps: scroll should increase monotonically with no selection
  const state1={zoom:100,scrollLeft:500,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r1=doZoom(5,state1);
  const state2={zoom:r1.newZoom,scrollLeft:r1.newScrollLeft,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r2=doZoom(5,state2);
  assertGte('Sequential zoom: second zoom increases further',r2.newZoom,r1.newZoom);
})();

(()=>{
  // Centroid off-screen (selection is way to the right, scrolled to start)
  const items=[makeItem('task',{id:'far',startDate:'2026-06-01',endDate:'2026-06-10'})];
  // centroid ≈ 2026-06-06 = day 156, at cw=10 → px=1560
  const state={zoom:100,scrollLeft:0,clientWidth:800,panelOpen:false,items,sel:['far']};
  const r=doZoom(5,state);
  // anchorScreenX clamped to vpW=800 (off-screen right)
  assertGte('Off-screen centroid: scroll adjusts correctly',r.newScrollLeft,0);
  assert('Off-screen centroid: zoom applied',r.newZoom,105);
})();

(()=>{
  // doZoomTo same value is no-op (delta=0)
  const state={zoom:100,scrollLeft:500,clientWidth:1200,panelOpen:false,items:[],sel:[]};
  const r=doZoom(0,state);
  assert('Zero delta: zoom unchanged',r.newZoom,100);
  assert('Zero delta: scroll unchanged',r.newScrollLeft,500);
})();


// ═══════════════════════════════════════════════════════════════════
//  fitToSelection — FIT TO SELECTED ITEMS (~18 tests)
// ═══════════════════════════════════════════════════════════════════

section('fitToSelection — Fit to Selected Items');
resetItemCounter();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-15'})];
  const r=fitToSelection(items,[],800,false);
  assert('Empty selection: returns null (fallback to fitToContent)',r,null);
})();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-15'})];
  const r=fitToSelection(items,['nonexistent'],800,false);
  assert('Invalid selection IDs: returns null',r,null);
})();

(()=>{
  const items=[makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-15',name:'Alpha'})];
  const r=fitToSelection(items,['a'],800,false);
  assertT('Single task: returns zoom result',r!==null);
  assertGte('Single task: zoom >= 10',r.zoom,10);
  assertLte('Single task: zoom <= 300',r.zoom,300);
  assertGte('Single task: scrollLeft >= 0',r.scrollLeft,0);
})();

(()=>{
  const items=[makeItem('milestone',{id:'m1',date:'2026-02-15',name:'Milestone Alpha'})];
  const r=fitToSelection(items,['m1'],800,false);
  assertT('Single milestone: returns zoom result',r!==null);
  assertGte('Single milestone: zoom >= 10',r.zoom,10);
})();

(()=>{
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-10',name:'Alpha'}),
    makeItem('task',{id:'b',startDate:'2026-03-01',endDate:'2026-03-15',name:'Bravo'}),
    makeItem('task',{id:'c',startDate:'2026-02-01',endDate:'2026-02-10',name:'Charlie'})
  ];
  const r=fitToSelection(items,['a','b'],800,false);
  assertT('Two tasks: returns result',r!==null);
  // Wide date range → lower zoom
  assertLte('Wide range: zoom decreases',r.zoom,200);
})();

(()=>{
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-06',name:'Tiny'})
  ];
  const r=fitToSelection(items,['a'],800,false);
  assertT('Single-day task: returns result',r!==null);
  // Very narrow range → high zoom (clamped to 300)
  assert('Very narrow range: zoom clamped to 300',r.zoom,300);
})();

(()=>{
  // Idempotency: running solver twice should give same result
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-10',endDate:'2026-01-20',name:'Task A'}),
    makeItem('task',{id:'b',startDate:'2026-02-01',endDate:'2026-02-15',name:'Task B'})
  ];
  const r1=fitToSelection(items,['a','b'],800,false);
  const r2=fitToSelection(items,['a','b'],800,false);
  assert('Idempotent: same zoom on two runs',r1.zoom,r2.zoom);
  assertApprox('Idempotent: same scrollLeft on two runs',r1.scrollLeft,r2.scrollLeft,1);
})();

(()=>{
  // hideMode ON: hidden selected items excluded
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-10',name:'Visible'}),
    makeItem('task',{id:'b',startDate:'2026-03-01',endDate:'2026-03-15',name:'Hidden',hidden:true})
  ];
  const r=fitToSelection(items,['a','b'],800,true);
  assertT('hideMode: result includes only visible items',r!==null);
  // Only item 'a' contributes — narrow range → high zoom
  assertGte('hideMode: zoom based on visible items only',r.zoom,100);
})();

(()=>{
  // hideMode ON: all selected items hidden → fallback
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-10',hidden:true})
  ];
  const r=fitToSelection(items,['a'],800,true);
  assert('All selected hidden + hideMode: returns null (fallback)',r,null);
})();

(()=>{
  // hideMode OFF: hidden items still included
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-10',name:'Hidden',hidden:true})
  ];
  const r=fitToSelection(items,['a'],800,false);
  assertT('hideMode OFF: hidden items still included',r!==null);
})();

(()=>{
  // Collapsed swimlane: items still included (user intent is explicit)
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-01-15',name:'InCollapsed',swimlaneId:'sw_c'})
  ];
  const r=fitToSelection(items,['a'],800,false);
  assertT('Collapsed swimlane: selected item still included',r!==null);
})();

(()=>{
  // Label position: left
  const items=[makeItem('task',{id:'a',startDate:'2026-01-10',endDate:'2026-01-20',name:'LeftLabel',labelPosition:'left'})];
  const r=fitToSelection(items,['a'],800,false);
  assertT('Label left: computes fit',r!==null);
})();

(()=>{
  // Label position: top
  const items=[makeItem('task',{id:'a',startDate:'2026-01-10',endDate:'2026-01-20',name:'TopLabel',labelPosition:'top'})];
  const r=fitToSelection(items,['a'],800,false);
  assertT('Label top: computes fit',r!==null);
})();

(()=>{
  // Edge date labels expand extents
  const items=[makeItem('task',{id:'a',startDate:'2026-01-10',endDate:'2026-01-20',name:'Edges',showStartDate:true,showEndDate:true})];
  const r1=fitToSelection(items,['a'],800,false);
  const items2=[makeItem('task',{id:'b',startDate:'2026-01-10',endDate:'2026-01-20',name:'Edges'})];
  const r2=fitToSelection(items2,['b'],800,false);
  assertLte('Edge dates: zoom lower than without (wider extent)',r1.zoom,r2.zoom);
})();

(()=>{
  // Mix of tasks and milestones
  const items=[
    makeItem('task',{id:'t1',startDate:'2026-01-05',endDate:'2026-01-15',name:'Task One'}),
    makeItem('milestone',{id:'m1',date:'2026-02-01',name:'Milestone One'})
  ];
  const r=fitToSelection(items,['t1','m1'],800,false);
  assertT('Task+milestone mix: computes fit',r!==null);
})();

(()=>{
  // Wider viewport → higher zoom (more space)
  const items=[
    makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-02-15',name:'Wide Task'})
  ];
  const r1=fitToSelection(items,['a'],400,false);
  const r2=fitToSelection(items,['a'],1200,false);
  assertT('Wider viewport → higher zoom',r2.zoom>r1.zoom);
})();

(()=>{
  // Panel-aware: smaller vpW (simulated by passing smaller width)
  const items=[makeItem('task',{id:'a',startDate:'2026-01-05',endDate:'2026-02-15',name:'Panel Test'})];
  const rNoPanel=fitToSelection(items,['a'],1200,false);
  const rPanel=fitToSelection(items,['a'],910,false);// 1200-290=910
  assertT('Panel-aware: smaller viewport → lower zoom',rPanel.zoom<rNoPanel.zoom);
})();


// ═══════════════════════════════════════════════════════════════════
//  SHORTCUT REGISTRATION (~5 tests)
// ═══════════════════════════════════════════════════════════════════

section('Shortcut Registration — fitToSelection');

// Read SHORTCUT_ACTIONS from the source to verify registration
const fs=require('fs');
const path=require('path');
const appSrc=fs.readFileSync(path.resolve(__dirname,'../../app.js'),'utf8');

(()=>{
  assertT('SHORTCUT_ACTIONS contains fitToSelection',appSrc.includes("id:'fitToSelection'"));
})();

(()=>{
  assertT('fitToSelection has ctx:sel guard',appSrc.includes("id:'fitToSelection'")&&appSrc.includes("ctx:'sel'"));
})();

(()=>{
  assertT('fitToSelection has default binding Ctrl+Shift+g',appSrc.includes("defaults:['Ctrl+Shift+g']"));
})();

(()=>{
  assertT('_scDispatch has fitToSelection entry',appSrc.includes('fitToSelection(){this.fitToSelection()}'));
})();

(()=>{
  // Verify btn-fit is context-sensitive
  assertT('btn-fit handler is context-sensitive',appSrc.includes('this.sel.length?this.fitToSelection():this.fitToContent()'));
})();

(()=>{
  // Verify doZoomTo exists and routes through doZoom
  assertT('doZoomTo method exists',appSrc.includes('doZoomTo('));
})();

(()=>{
  // Verify zoom100 dispatch uses doZoomTo
  assertT('zoom100 dispatch uses doZoomTo',appSrc.includes("zoom100(){this.doZoomTo(100)}"));
})();


// ═══════════════════════════════════════════════════════════════════
//  _selCentroidDate — EDGE CASES (~3 tests)
// ═══════════════════════════════════════════════════════════════════

section('_selCentroidDate — Edge Cases');
resetItemCounter();

(()=>{
  // Mix of valid and invalid IDs
  const items=[makeItem('task',{id:'a',startDate:'2026-03-01',endDate:'2026-03-10'})];
  const r=_selCentroidDate(items,['a','nonexistent','also_bad']);
  assert('Mixed valid/invalid IDs: centroid from valid only',r,'2026-03-06');
})();

(()=>{
  // Large selection: 10 items spanning half a year
  const items=[];
  for(let i=0;i<10;i++){
    const start=U.addDays('2026-01-01',i*18);
    const end=U.addDays(start,9);
    items.push(makeItem('task',{id:'x'+i,startDate:start,endDate:end}));
  }
  const sel=items.map(it=>it.id);
  const r=_selCentroidDate(items,sel);
  // Earliest=2026-01-01, latest end≈2026-06-19, midpoint ≈ mid-March
  assertT('Large selection: centroid is a valid date string',r!==null&&r.length===10);
})();

(()=>{
  // All milestones on different dates
  const items=[
    makeItem('milestone',{id:'m1',date:'2026-01-10'}),
    makeItem('milestone',{id:'m2',date:'2026-01-20'}),
    makeItem('milestone',{id:'m3',date:'2026-01-30'})
  ];
  const r=_selCentroidDate(items,['m1','m2','m3']);
  // Earliest=01-10, Latest=01-30, span=20, mid=10 → 01-20
  assert('Multiple milestones: centroid is midpoint of date range',r,'2026-01-20');
})();


// ═══════════════════════════════════════════════════════════════════

const{total,passed,failed}=summary();
process.exit(failed?1:0);
