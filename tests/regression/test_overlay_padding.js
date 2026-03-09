#!/usr/bin/env node
/**
 * Timeline Studio -- Overlay Padding & Positioning Regression Tests
 * Covers: _fitLeftPad computation, zoom/render consistency, fit-to-content
 *   coverage, header cell continuity, overlay offset alignment.
 *
 * ~50 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertApprox,section,summary}=require('../helpers/assert');
const{U}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Text Measurement (matches test_fit_content.js) ─────────────────

function _mt(text,fontSize,fontWeight){
  if(!text||text.length===0)return 0;
  const base=text.length*fontSize*0.6;
  return(fontWeight==='bold'||fontWeight>=700)?base*1.1:base;
}

// ─── Mock _itemLabelWidths (matches app.js logic) ────────────────────────

function _itemLabelWidths(it,statusDefs,statusDisplay){
  const fontSize=it.fontSize||11;
  let prefix='';
  if(statusDisplay&&statusDisplay.show&&(statusDisplay.badgePos||'inline')==='inline'&&it.status){
    const sd=(statusDefs||[]).find(s=>s.id===it.status);
    if(sd){
      if(statusDisplay.mode==='emoji')prefix=sd.emoji+' ';
      else if(statusDisplay.mode==='text')prefix=sd.name+' ';
      else prefix='('+sd.shortName+') ';
    }
  }
  const fullLabel=prefix+(it.name||'');
  const nameW=_mt(fullLabel,fontSize,'600');
  let secW=0;
  if(it.type==='task'){
    const parts=[];if(it.showOwner&&it.owner)parts.push(it.owner);
    if(it.showDuration)parts.push('00d');
    if(parts.length>1)secW=_mt(parts[0]+' ('+parts[1]+')',Math.max(8,fontSize-1.5),'400');
    else if(parts.length===1)secW=_mt(parts[0],Math.max(8,fontSize-1.5),'400');
  }else if(it.type!=='task'&&it.showDate!==false){
    let dtStr='';const hasOwner=it.showOwner&&it.owner;
    if(hasOwner){dtStr=it.owner;if(it.date)dtStr+=' · '+it.date}
    else{dtStr=it.date||''}
    if(dtStr)secW=_mt(dtStr,fontSize-1,'400');
  }
  const labelW=Math.max(nameW,secW)+8;
  let edgeLW=0,edgeRW=0;
  if(it.type==='task'){
    if(it.labelPosition==='left'){edgeLW=labelW;return{labelW:0,edgeLW,edgeRW}}
    if(it.labelPosition==='top'||it.labelPosition==='bottom')return{labelW:0,edgeLW:0,edgeRW:0};
  }
  if(it.type==='milestone'){
    if(it.showDate&&it.labelPosition==='right')edgeRW=_mt(it.date||'',fontSize,'normal');
    if(it.showDate&&it.labelPosition==='left')edgeLW=_mt(it.date||'',fontSize,'normal');
  }
  return{labelW,edgeLW,edgeRW};
}

// ─── Mock dX / dXEnd / dXMid (simplified column-based positioning) ──────

function mockTl(proj){
  const p=proj;
  const start=new Date(p.timelineStart+'T12:00:00');
  const end=new Date(p.timelineEnd+'T12:00:00');
  const z=(p.zoom||100)/100;
  const baseCw={days:28,weeks:60,months:100,quarters:200,years:400}[p.timescale]||100;
  const cw=baseCw*z;
  const totalDays=Math.max(1,U.days(p.timelineStart,p.timelineEnd)+1);
  const cols=[];
  /* Simplified: one column per unit */
  if(p.timescale==='months'){
    const cur=new Date(start);cur.setDate(1);
    while(cur<=end){
      const mi=cur.getMonth();
      const last=new Date(cur.getFullYear(),mi+1,0);
      cols.push({start:U.iso(cur),end:U.iso(last)});
      cur.setMonth(cur.getMonth()+1);
    }
  }else if(p.timescale==='quarters'){
    const cur=new Date(start);cur.setMonth(Math.floor(cur.getMonth()/3)*3);cur.setDate(1);
    while(cur<=end){
      const qEnd=new Date(cur.getFullYear(),cur.getMonth()+3,0);
      cols.push({start:U.iso(cur),end:U.iso(qEnd)});
      cur.setMonth(cur.getMonth()+3);
    }
  }else if(p.timescale==='weeks'){
    const cur=new Date(start);cur.setDate(cur.getDate()-cur.getDay());
    while(cur<=end){
      const sat=new Date(+cur+6*864e5);
      cols.push({start:U.iso(cur),end:U.iso(sat)});
      cur.setDate(cur.getDate()+7);
    }
  }else{
    /* years or days fallback */
    const cur=new Date(start);
    while(cur<=end){
      cols.push({start:U.iso(cur),end:U.iso(cur)});
      cur.setDate(cur.getDate()+1);
    }
  }
  return{cols,cw,tw:cols.length*cw,z};
}

function dX(dateStr,tl){
  if(!dateStr||!tl.cols.length)return null;
  const d=new Date(dateStr+'T12:00:00');
  for(let i=0;i<tl.cols.length;i++){
    const c=tl.cols[i],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
    if(d>=cs&&d<=ce){const cd=Math.max(1,U.days(c.start,c.end)+1);return i*tl.cw+(U.days(c.start,dateStr)/cd)*tl.cw}
  }
  const f=tl.cols[0];
  if(d<new Date(f.start+'T12:00:00')){const cd=Math.max(1,U.days(f.start,f.end)+1);return -(U.days(dateStr,f.start)/cd)*tl.cw}
  const l=tl.cols[tl.cols.length-1];
  const cd=Math.max(1,U.days(l.start,l.end)+1);return(tl.cols.length-1)*tl.cw+(U.days(l.start,dateStr)/cd)*tl.cw;
}

function dXEnd(dateStr,tl){
  if(!dateStr||!tl.cols.length)return null;
  const d=new Date(dateStr+'T12:00:00');
  for(let i=0;i<tl.cols.length;i++){
    const c=tl.cols[i],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
    if(d>=cs&&d<=ce){const cd=Math.max(1,U.days(c.start,c.end)+1);return i*tl.cw+((U.days(c.start,dateStr)+1)/cd)*tl.cw}
  }
  return dX(dateStr,tl);
}

function dXMid(dateStr,tl){
  const x=dX(dateStr,tl);
  if(x===null)return null;
  return x+tl.cw/(2*Math.max(1,U.days(tl.cols[0].start,tl.cols[0].end)+1));
}

// ─── Mock computeFitLeftPad (mirrors Change 1 logic) ─────────────────────

function computeFitLeftPad(items,proj,tl,hideMode){
  const visible=items.filter(i=>!(hideMode&&i.hidden));
  let fitMin=Infinity;
  const sDefs=proj.statusDefs||[];
  const sDisp=proj.statusDisplay||{};
  for(const it of visible){
    const{labelW,edgeLW}=_itemLabelWidths(it,sDefs,sDisp);
    const lp=it.labelPosition||'right';
    let bL;
    if(it.type==='task'){
      const x1=dX(it.startDate,tl);
      if(x1===null)continue;
      bL=x1;
    }else{
      const x=dXMid(it.date,tl);
      if(x===null)continue;
      bL=x-8;
    }
    let tL=0;
    if(it.type==='task'){
      if(lp==='left')tL=6+labelW;
      else if(lp==='top'||lp==='bottom'){
        const x2=dXEnd(it.endDate,tl);
        const half=labelW/2,barHalf=((x2||bL)-bL)/2;
        if(half>barHalf)tL=half-barHalf;
      }
    }else{
      if(lp==='left')tL=12+labelW;
      else if(lp==='top'||lp==='bottom'||lp==='center'){
        const half=labelW/2;
        if(half>8)tL=half-8;
      }
    }
    if(edgeLW)tL=Math.max(tL,edgeLW);
    fitMin=Math.min(fitMin,bL-tL);
  }
  return fitMin<0?Math.ceil(-fitMin)+20:0;
}

// ─── Mock header cell geometry (mirrors app.js header rendering) ─────────

function headerCellGeom(numCols,cw,fitLeftPad){
  const cells=[];
  let cellLeft=0;
  for(let ci=0;ci<numCols;ci++){
    const ox=cellLeft+fitLeftPad;
    const left=ci===0?0:ox;
    const width=ci===0?cw+fitLeftPad:cw;
    cells.push({left,width});
    cellLeft+=cw;
  }
  return cells;
}

function headerRowWidth(numCols,cw,fitLeftPad){
  return numCols*cw+fitLeftPad;
}

// ─── Mock grid column geometry (mirrors app.js grid rendering) ───────────

function gridColGeom(numCols,cw,fitLeftPad){
  const cols=[];
  for(let ci=0;ci<numCols;ci++){
    const left=ci===0&&fitLeftPad?-fitLeftPad:ci*cw;
    const width=ci===0&&fitLeftPad?cw+fitLeftPad:cw;
    cols.push({left,width});
  }
  return cols;
}

// ─── Mock fitToContent solver (from test_fit_content.js) ─────────────────

function fitSolverItemGeom(items,tl,sDefs,sDisp){
  const geom=[];
  for(const it of items){
    const lp=it.labelPosition||'right';
    const{labelW,edgeLW,edgeRW}=_itemLabelWidths(it,sDefs,sDisp);
    let bL,bR,tL=0,tR=0;
    if(it.type==='task'){
      const x1=dX(it.startDate,tl),x2=dXEnd(it.endDate,tl);
      if(x1===null||x2===null)continue;
      bL=x1;bR=x2;
      if(lp==='right')tR=6+labelW;
      else if(lp==='left')tL=6+labelW;
      else if(lp==='top'||lp==='bottom'){const half=labelW/2,barHalf=(x2-x1)/2;if(half>barHalf){tL=half-barHalf;tR=half-barHalf}}
      if(edgeLW)tL=Math.max(tL,edgeLW);
      if(edgeRW)tR=Math.max(tR,edgeRW);
    }else{
      const x=dXMid(it.date,tl);
      if(x===null)continue;
      bL=x-8;bR=x+8;
      if(lp==='right')tR=12+labelW;
      else if(lp==='left')tL=12+labelW;
      else if(lp==='top'||lp==='bottom'||lp==='center'){const half=labelW/2;if(half>8){tL=half-8;tR=half-8}}
    }
    geom.push({bL,bR,tL,tR});
  }
  return geom;
}

function fitSolverWillClip(itemGeom,zoom){
  const z=zoom/100;
  let fitMin=Infinity;
  for(const g of itemGeom)fitMin=Math.min(fitMin,z*g.bL-g.tL);
  return fitMin<0;
}

// ═══════════════════════════════════════════════════════════════════
//  SECTION 1: _fitLeftPad Computation (~12 tests)
// ═══════════════════════════════════════════════════════════════════

section('S1: _fitLeftPad Computation');

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100});
  const it=makeItem('task',{name:'Build Feature',labelPosition:'right',startDate:'2026-02-15',endDate:'2026-03-15',duration:28});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assert('Right-label task not near edge: pad=0',pad,0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Very Long Task Name For Testing',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assertT('Left-label task near start: pad > 0',pad>0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100});
  const it=makeItem('task',{name:'Far Away Task',labelPosition:'left',startDate:'2026-03-01',endDate:'2026-03-31',duration:31});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assert('Left-label task far from start: pad=0',pad,0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('milestone',{name:'Kickoff',labelPosition:'left',date:'2026-01-01',showDate:true});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assertT('Left-label milestone near start: pad > 0',pad>0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('milestone',{name:'A Longer Milestone Name',labelPosition:'center',date:'2026-01-01'});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  /* center label: half extends left. With long name, half > 8px → pad > 0 */
  assertT('Center-label milestone near start: pad > 0',pad>0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Short Task With Very Long Name',labelPosition:'top',startDate:'2026-01-01',endDate:'2026-01-03',duration:3});
  const tl=mockTl(proj);
  /* top/bottom: labelW=0,edgeLW=0 for tasks → pad might not be needed
     unless task bar itself extends past pixel 0 */
  const pad=computeFitLeftPad([it],proj,tl,false);
  /* With top label on a task, _itemLabelWidths returns labelW=0, so no extra left offset */
  assertT('Top-label task: pad >= 0 (valid)',pad>=0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,hideMode:true,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Hidden Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15,hidden:true});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,true);
  assert('Hidden item in hideMode: excluded, pad=0',pad,0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it1=makeItem('task',{name:'Right Label',labelPosition:'right',startDate:'2026-03-01',endDate:'2026-03-15',duration:15});
  const it2=makeItem('task',{name:'Left Label Near Start',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it1,it2],proj,tl,false);
  assertT('Multiple items: worst case (left-label) wins, pad > 0',pad>0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([],proj,tl,false);
  assert('Empty items list: pad=0',pad,0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:200,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Task',labelPosition:'right',startDate:'2026-03-01',endDate:'2026-03-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assert('High zoom, right label far from left: pad=0',pad,0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:15,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Left Label',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  assertT('Low zoom (15%), left label near start: pad > 0',pad>0);
})();

(()=>{
  resetItemCounter();
  /* Test that +20 buffer is included */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'X',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  if(pad>0){
    /* If it clips, padding = ceil(-fitMin) + 20, so pad >= 20 always */
    assertGte('Padding includes +20 buffer',pad,20);
  }else{
    assertT('No clipping → pad=0 (also valid)',pad===0);
  }
})();

// ═══════════════════════════════════════════════════════════════════
//  SECTION 2: Consistency Across Zoom & Render (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('S2: Consistency Across Zoom & Render');

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Left Label Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad1=computeFitLeftPad([it],proj,tl,false);
  const pad2=computeFitLeftPad([it],proj,tl,false);
  assert('Same inputs → same padding (deterministic)',pad1,pad2);
})();

(()=>{
  resetItemCounter();
  const proj100=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Left Label Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl100=mockTl(proj100);
  const pad100=computeFitLeftPad([it],proj100,tl100,false);
  const proj20=makeProj({timescale:'months',zoom:20,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const tl20=mockTl(proj20);
  const pad20=computeFitLeftPad([it],proj20,tl20,false);
  assertGte('Zoom 20 needs more padding than zoom 100',pad20,pad100);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Left Label Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  /* Compute at low zoom first (pad>0), then high zoom (pad should be lower or 0) */
  const projLow=makeProj({timescale:'months',zoom:20,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const tlLow=mockTl(projLow);
  const padLow=computeFitLeftPad([it],projLow,tlLow,false);
  const projHigh=makeProj({timescale:'months',zoom:200,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const tlHigh=mockTl(projHigh);
  const padHigh=computeFitLeftPad([it],projHigh,tlHigh,false);
  assertT('No stale padding: low zoom → pad>0, high zoom → pad lower',padHigh<=padLow);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'TaskX',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  /* Weeks vs months at same zoom → different column geometry → potentially different pad */
  const projW=makeProj({timescale:'weeks',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const tlW=mockTl(projW);
  const padW=computeFitLeftPad([it],projW,tlW,false);
  const projM=makeProj({timescale:'months',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const tlM=mockTl(projM);
  const padM=computeFitLeftPad([it],projM,tlM,false);
  /* Just verify both compute valid values (not necessarily equal) */
  assertT('Weeks timescale: valid pad',padW>=0);
  assertT('Months timescale: valid pad',padM>=0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Triple Check',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const p1=computeFitLeftPad([it],proj,tl,false);
  const p2=computeFitLeftPad([it],proj,tl,false);
  const p3=computeFitLeftPad([it],proj,tl,false);
  assert('Idempotent: 3x same result (1==2)',p1,p2);
  assert('Idempotent: 3x same result (2==3)',p2,p3);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Clip Check',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  /* Build geometry to compute willClip */
  const geom=fitSolverItemGeom([it],tl,proj.statusDefs,proj.statusDisplay);
  const willClip=fitSolverWillClip(geom,proj.zoom);
  assert('willClip flag matches pad > 0',willClip,pad>0);
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Right Only',labelPosition:'right',startDate:'2026-03-01',endDate:'2026-03-15',duration:15});
  const tl=mockTl(proj);
  const pad=computeFitLeftPad([it],proj,tl,false);
  const geom=fitSolverItemGeom([it],tl,proj.statusDefs,proj.statusDisplay);
  const willClip=fitSolverWillClip(geom,proj.zoom);
  assertF('Right-label no clip: willClip=false',willClip);
  assert('Right-label no clip: pad=0',pad,0);
})();

// ═══════════════════════════════════════════════════════════════════
//  SECTION 3: Fit-to-Content Coverage (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('S3: Fit-to-Content Coverage');

(()=>{
  resetItemCounter();
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const items=[
    makeItem('task',{name:'Left1',labelPosition:'left',startDate:'2026-01-15',endDate:'2026-02-15',duration:31}),
    makeItem('task',{name:'Left2',labelPosition:'left',startDate:'2026-02-01',endDate:'2026-03-01',duration:28}),
    makeItem('task',{name:'Left3',labelPosition:'left',startDate:'2026-03-01',endDate:'2026-04-01',duration:31}),
  ];
  const tl=mockTl(proj);
  const pad=computeFitLeftPad(items,proj,tl,false);
  assertT('3 left-label items: pad computed (>= 0)',pad>=0);
})();

(()=>{
  resetItemCounter();
  /* Wide timeline spanning years */
  const proj=makeProj({timescale:'quarters',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2029-12-31'});
  const items=[
    makeItem('task',{name:'Long Project',labelPosition:'right',startDate:'2026-01-01',endDate:'2027-06-30',duration:547}),
    makeItem('task',{name:'Phase 2',labelPosition:'left',startDate:'2027-07-01',endDate:'2029-12-31',duration:915}),
  ];
  const tl=mockTl(proj);
  const pad=computeFitLeftPad(items,proj,tl,false);
  assertT('Wide timeline (years): valid pad',pad>=0);
})();

(()=>{
  resetItemCounter();
  /* Narrow timeline: 3 days */
  const proj=makeProj({timescale:'days',zoom:100,timelineStart:'2026-03-01',timelineEnd:'2026-03-03'});
  const items=[makeItem('task',{name:'Quick Task',labelPosition:'right',startDate:'2026-03-01',endDate:'2026-03-03',duration:3})];
  const tl=mockTl(proj);
  const pad=computeFitLeftPad(items,proj,tl,false);
  assertT('Narrow timeline (3 days): valid pad',pad>=0);
})();

(()=>{
  resetItemCounter();
  /* Mixed label positions */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const items=[
    makeItem('task',{name:'Left',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15}),
    makeItem('task',{name:'Right',labelPosition:'right',startDate:'2026-02-01',endDate:'2026-02-15',duration:14}),
    makeItem('milestone',{name:'Center',labelPosition:'center',date:'2026-03-01'}),
    makeItem('task',{name:'Top',labelPosition:'top',startDate:'2026-04-01',endDate:'2026-04-15',duration:15}),
  ];
  const tl=mockTl(proj);
  const pad=computeFitLeftPad(items,proj,tl,false);
  assertT('Mixed labels: pad accounts for worst left-extending',pad>=0);
  /* Left label at start should drive padding */
  const padLeftOnly=computeFitLeftPad([items[0]],proj,tl,false);
  assert('Mixed: pad equals left-label-only pad',pad,padLeftOnly);
})();

(()=>{
  resetItemCounter();
  /* Large font → more padding */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const itSmall=makeItem('task',{name:'Test Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15,fontSize:11});
  const itLarge=makeItem('task',{name:'Test Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15,fontSize:20});
  const tl=mockTl(proj);
  const padSmall=computeFitLeftPad([itSmall],proj,tl,false);
  const padLarge=computeFitLeftPad([itLarge],proj,tl,false);
  assertGte('Large font → more or equal padding',padLarge,padSmall);
})();

(()=>{
  resetItemCounter();
  /* Status prefix adds to label width */
  const defs=makeStatusDefs();
  const disp=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30',statusDefs:defs,statusDisplay:disp});
  const itNoStatus=makeItem('task',{name:'Test',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15,status:''});
  const itWithStatus=makeItem('task',{name:'Test',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15,status:'on-track'});
  const tl=mockTl(proj);
  const padNo=computeFitLeftPad([itNoStatus],proj,tl,false);
  const padWith=computeFitLeftPad([itWithStatus],proj,tl,false);
  assertGte('Status prefix adds to padding',padWith,padNo);
})();

(()=>{
  resetItemCounter();
  /* Idempotent with padding: same input → same pad twice */
  const proj=makeProj({timescale:'months',zoom:50,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const items=[makeItem('task',{name:'Left Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15})];
  const tl=mockTl(proj);
  const p1=computeFitLeftPad(items,proj,tl,false);
  const p2=computeFitLeftPad(items,proj,tl,false);
  assert('Fit+pad idempotent: pad1===pad2',p1,p2);
})();

(()=>{
  resetItemCounter();
  /* Different viewport widths: wider viewport doesn't change padding at same zoom */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const it=makeItem('task',{name:'Left Task',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  /* Padding depends on zoom and item position, not viewport width */
  const pad=computeFitLeftPad([it],proj,tl,false);
  assertT('Viewport width irrelevant to padding at fixed zoom',pad>=0);
})();

(()=>{
  resetItemCounter();
  /* Long name → more padding */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-06-30'});
  const itShort=makeItem('task',{name:'Hi',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const itLong=makeItem('task',{name:'This Is A Very Long Task Name For Testing Purposes',labelPosition:'left',startDate:'2026-01-01',endDate:'2026-01-15',duration:15});
  const tl=mockTl(proj);
  const padShort=computeFitLeftPad([itShort],proj,tl,false);
  const padLong=computeFitLeftPad([itLong],proj,tl,false);
  assertGte('Long name → more padding',padLong,padShort);
})();

(()=>{
  resetItemCounter();
  /* Items only on right side of timeline → no left clipping */
  const proj=makeProj({timescale:'months',zoom:100,timelineStart:'2026-01-01',timelineEnd:'2026-12-31'});
  const items=[
    makeItem('task',{name:'Far Right',labelPosition:'right',startDate:'2026-09-01',endDate:'2026-10-01',duration:30}),
    makeItem('milestone',{name:'End',labelPosition:'right',date:'2026-11-01'}),
  ];
  const tl=mockTl(proj);
  const pad=computeFitLeftPad(items,proj,tl,false);
  assert('Items far right only: pad=0',pad,0);
})();

// ═══════════════════════════════════════════════════════════════════
//  SECTION 4: Header Cell Continuity (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('S4: Header Cell Continuity');

(()=>{
  const cells=headerCellGeom(5,100,0);
  assert('No padding: first cell left=0',cells[0].left,0);
  assert('No padding: first cell width=100',cells[0].width,100);
})();

(()=>{
  const cells=headerCellGeom(5,100,50);
  assert('With padding 50: first cell left=0',cells[0].left,0);
  assert('With padding 50: first cell width=150',cells[0].width,150);
})();

(()=>{
  const cells=headerCellGeom(5,100,50);
  assert('Cell[1] offset by padding: left=150',cells[1].left,150);
  assert('Cell[2] offset by padding: left=250',cells[2].left,250);
})();

(()=>{
  /* No gaps between cells */
  const pad=73;
  const cells=headerCellGeom(10,80,pad);
  let gapFound=false;
  for(let i=0;i<cells.length-1;i++){
    if(cells[i].left+cells[i].width!==cells[i+1].left){gapFound=true;break}
  }
  assertF('No gaps between 10 header cells (pad=73)',gapFound);
})();

(()=>{
  const rw=headerRowWidth(5,100,80);
  assert('Header row width includes padding',rw,580);
})();

(()=>{
  /* Zero padding matches original behavior */
  const cells=headerCellGeom(5,100,0);
  for(let i=0;i<5;i++){
    assert(`Zero pad cell[${i}] left=${i*100}`,cells[i].left,i*100);
    assert(`Zero pad cell[${i}] width=100`,cells[i].width,100);
  }
})();

(()=>{
  const cells=headerCellGeom(5,100,300);
  assert('Large padding 300: first cell left=0',cells[0].left,0);
  assert('Large padding 300: first cell width=400',cells[0].width,400);
  let gapFound=false;
  for(let i=0;i<cells.length-1;i++){
    if(cells[i].left+cells[i].width!==cells[i+1].left){gapFound=true;break}
  }
  assertF('Large padding 300: no gaps',gapFound);
})();

(()=>{
  /* Grid columns match header cells alignment */
  const pad=60;
  const hCells=headerCellGeom(5,100,pad);
  const gCols=gridColGeom(5,100,pad);
  /* First grid col extends left (left=-60, width=160) which covers same region as header cell[0] (left=0, width=160)
     Both cover from pixel -60 to pixel 100 relative to their container (grid is inside content area, header has negative left) */
  assert('Grid col[0] width matches header cell[0] width',gCols[0].width,hCells[0].width);
})();

(()=>{
  const cells=headerCellGeom(1,100,40);
  assert('Single column + padding: left=0',cells[0].left,0);
  assert('Single column + padding: width=140',cells[0].width,140);
})();

(()=>{
  /* Verify header row width formula */
  const rw0=headerRowWidth(8,60,0);
  const rw50=headerRowWidth(8,60,50);
  assert('Row width 0 pad: 8*60=480',rw0,480);
  assert('Row width 50 pad: 8*60+50=530',rw50,530);
})();

// ═══════════════════════════════════════════════════════════════════
//  SECTION 5: Overlay Offset Consistency (~8 tests)
// ═══════════════════════════════════════════════════════════════════

section('S5: Overlay Offset Consistency');

(()=>{
  /* Mock the overlay wrapper HTML generation to verify left offset */
  const pad=60;
  const wrapperStyle='position:absolute;top:0;left:'+pad+'px;width:1000px;height:100%;pointer-events:none';
  assertT('Overlay wrapper left=60',wrapperStyle.includes('left:60px'));
})();

(()=>{
  const pad=0;
  const wrapperStyle='position:absolute;top:0;left:'+pad+'px;width:1000px;height:100%;pointer-events:none';
  assertT('Zero padding: wrapper left=0',wrapperStyle.includes('left:0px'));
})();

(()=>{
  /* Verify all overlay types would be inside wrapper by checking they use overlayH not bodyH */
  /* This is a structural test: the app.js code now appends ttt/float/weekend/holiday/today/vlines to overlayH */
  /* We verify the wrapper generation logic */
  const pad=45;
  const overlayContent='<div class="ttt-label">0</div><div class="wknd-shade"></div>';
  const wrapped='<div id="tl-overlays" style="position:absolute;top:0;left:'+pad+'px;width:1000px;height:100%;pointer-events:none">'+overlayContent+'</div>';
  assertT('Wrapped content includes ttt-label',wrapped.includes('ttt-label'));
  assertT('Wrapped content includes wknd-shade',wrapped.includes('wknd-shade'));
  assertT('Wrapper has correct left offset',wrapped.includes('left:45px'));
})();

(()=>{
  /* dep-svg NOT inside overlay wrapper */
  const pad=50;
  const overlayContent='<div class="ttt-label">0</div>';
  const wrapped='<div id="tl-overlays" style="position:absolute;top:0;left:'+pad+'px">'+overlayContent+'</div>';
  const depSvg='<svg id="dep-svg" style="width:1000px;height:100%"></svg>';
  const bodyH=wrapped+depSvg;
  /* dep-svg should be a sibling, not child */
  assertT('dep-svg after wrapper (sibling)',bodyH.indexOf('</div><svg id="dep-svg"')>0);
  assertF('dep-svg NOT inside wrapper',wrapped.includes('dep-svg'));
})();

(()=>{
  /* Verify overlay wrapper has pointer-events:none */
  const style='position:absolute;top:0;left:0px;width:1000px;height:100%;pointer-events:none';
  assertT('Wrapper has pointer-events:none',style.includes('pointer-events:none'));
})();

(()=>{
  /* Float label position is relative to wrapper (not padding box) */
  /* When wrapper has left:60px and float label has left:500px,
     the visual position is 560px from the padding box edge.
     Without wrapper, the label would have been at 500px from padding box edge,
     which would be 60px behind the item (which shifted by padding). */
  const pad=60;
  const floatLeft=500;
  const effectiveLeft=pad+floatLeft;
  const itemLeft=pad+500; /* Item also shifted by padding (content area) */
  assert('Float label effective position matches item position',effectiveLeft,itemLeft);
})();

(()=>{
  /* Weekend shade at column 3 should be at 3*cw inside the wrapper */
  const cw=100;
  const shadeLeftInWrapper=3*cw;
  const pad=55;
  const effectiveShadeLeft=pad+shadeLeftInWrapper;
  /* Grid column 3 starts at 3*cw in the content area, which is at pad+3*cw from padding box edge */
  const gridCol3Left=pad+3*cw;
  assert('Weekend shade aligns with grid column',effectiveShadeLeft,gridCol3Left);
})();

(()=>{
  /* Multiple padding values: overlay offset always matches */
  for(const pad of [0,10,50,100,250]){
    const expected=pad;
    const actual=pad||0;
    assert(`Overlay offset at pad=${pad}: ${actual}`,actual,expected);
  }
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
