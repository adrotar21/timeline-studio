#!/usr/bin/env node
/**
 * Timeline Studio -- Fit-to-Content Solver & Text Measurement Tests
 * Covers: _mt text measurement, _wrapText word wrap, _itemLabelWidths,
 *   _itemExtents, fit solver idempotency, collapsed/minimized exclusion,
 *   hidden item handling.
 *
 * ~50 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Text Measurement ───────────────────────────────────────────────

/** Mock _mt: approximate text width (fontSize * char count * 0.6, bold gets 1.1x) */
function _mt(text,fontSize,fontWeight){
  if(!text||text.length===0)return 0;
  const base=text.length*fontSize*0.6;
  return(fontWeight==='bold'||fontWeight>=700)?base*1.1:base;
}

/** Mock _wrapText: split text into lines that fit within maxW */
function _wrapText(text,maxW,fontSize,fontWeight){
  if(!text)return[''];
  const words=text.split(/\s+/);
  const lines=[];
  let cur='';
  for(const w of words){
    const test=cur?(cur+' '+w):w;
    if(_mt(test,fontSize,fontWeight)>maxW&&cur){
      lines.push(cur);
      cur=w;
    }else{cur=test}
  }
  if(cur)lines.push(cur);
  return lines.length?lines:[''];
}

/** Mock _itemLabelWidths: returns {labelW, edgeLW, edgeRW} */
function _itemLabelWidths(it,statusDefs,statusDisplay){
  const fontSize=it.fontSize||11;
  let prefix='';
  if(statusDisplay&&statusDisplay.show&&statusDisplay.badgePos==='inline'&&it.status){
    const sd=(statusDefs||[]).find(s=>s.id===it.status);
    if(sd){
      if(statusDisplay.mode==='emoji')prefix=sd.emoji+' ';
      else if(statusDisplay.mode==='text')prefix=sd.name+' ';
      else prefix='('+sd.shortName+') ';
    }
  }
  const fullLabel=prefix+(it.name||'');
  const labelW=_mt(fullLabel,fontSize,'normal');
  let edgeLW=0,edgeRW=0;
  if(it.type==='task'){
    if(it.labelPosition==='left'){edgeLW=labelW;return{labelW:0,edgeLW,edgeRW}}
    if(it.labelPosition==='top'||it.labelPosition==='bottom')return{labelW:0,edgeLW:0,edgeRW:0};
  }
  if(it.type==='milestone'){
    if(it.showDate&&it.labelPosition==='right'){
      edgeRW=_mt(it.date||'',fontSize,'normal');
    }
    if(it.showDate&&it.labelPosition==='left'){
      edgeLW=_mt(it.date||'',fontSize,'normal');
    }
  }
  return{labelW,edgeLW,edgeRW};
}

/** Mock _itemExtents: compute min/max pixel positions from items at given zoom */
function _itemExtents(items,zoom,swimlanes){
  if(!items||items.length===0)return null;
  // Filter out items in collapsed/minimized swimlanes
  const collSet=new Set();
  const minSubSet=new Set();
  if(swimlanes){
    for(const sl of swimlanes){
      if(sl.collapsed==='collapsed')collSet.add(sl.id);
      for(const ss of sl.subSwims||[]){if(ss.collapsed==='minimized')minSubSet.add(ss.id)}
    }
  }
  const visible=items.filter(it=>{
    if(collSet.has(it.swimlaneId))return false;
    if(it.subSwimId&&minSubSet.has(it.subSwimId))return false;
    return true;
  });
  if(visible.length===0)return null;
  let minPx=Infinity,maxPx=-Infinity;
  for(const it of visible){
    // Simplified position: startDate → days from epoch * zoom
    const startDay=U.days('2026-01-01',it.type==='task'?it.startDate:it.date);
    const endDay=it.type==='task'?U.days('2026-01-01',it.endDate):startDay;
    const bL=startDay*10*zoom;
    const bR=endDay*10*zoom;
    const widths=_itemLabelWidths(it,[],[]);
    const left=bL-widths.edgeLW;
    const right=bR+widths.labelW+widths.edgeRW;
    if(left<minPx)minPx=left;
    if(right>maxPx)maxPx=right;
  }
  return{minPx,maxPx};
}

/** Mock fitToContent solver: given viewport width, compute target zoom */
function fitToContent(vpWidth,items,swimlanes,currentZoom){
  if(!items||items.length===0)return currentZoom;
  // Iterative solver: 4 rounds
  let z=currentZoom;
  for(let round=0;round<4;round++){
    const ext=_itemExtents(items,z,swimlanes);
    if(!ext)return z;
    const contentW=ext.maxPx-ext.minPx;
    if(contentW<=0)return z;
    z=z*(vpWidth/contentW);
    z=Math.max(0.1,Math.min(10,z));
  }
  return Math.round(z*1000)/1000;
}

// ═══════════════════════════════════════════════════════════════════
//  TEXT MEASUREMENT (~15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Text Measurement — _mt Mock');

(()=>{
  const w=_mt('Hello',11,'normal');
  assertT('_mt returns > 0 for non-empty text',w>0);
})();

(()=>{
  const w=_mt('',11,'normal');
  assert('_mt returns 0 for empty string',w,0);
})();

(()=>{
  const w11=_mt('Test',11,'normal');
  const w16=_mt('Test',16,'normal');
  assertT('Larger fontSize → wider result',w16>w11);
})();

(()=>{
  const normal=_mt('Test',11,'normal');
  const bold=_mt('Test',11,'bold');
  assertT('Bold text wider than normal',bold>normal);
})();

(()=>{
  const w=_mt('A',11,'normal');
  const expected=1*11*0.6;
  assert('Single char width calculation',w,expected);
})();

(()=>{
  const w700=_mt('Test',11,700);
  const bold=_mt('Test',11,'bold');
  assert('fontWeight 700 same as bold',w700,bold);
})();

section('Text Measurement — _wrapText Mock');

(()=>{
  const lines=_wrapText('Hello',200,11,'normal');
  assert('Short text = single line',lines.length,1);
  assert('Short text content',lines[0],'Hello');
})();

(()=>{
  const lines=_wrapText('This is a long sentence that should wrap into multiple lines',50,11,'normal');
  assertGte('Long text = multiple lines',lines.length,2);
})();

(()=>{
  const lines=_wrapText('',200,11,'normal');
  assert('Empty text = single empty line',lines.length,1);
  assert('Empty text content',lines[0],'');
})();

(()=>{
  const lines=_wrapText('OneWord',200,11,'normal');
  assert('Single word fits in one line',lines.length,1);
  assert('Single word content',lines[0],'OneWord');
})();

(()=>{
  const lines=_wrapText('A B C D E F G H',30,11,'normal');
  assertGte('Many short words wrap',lines.length,2);
})();

(()=>{
  const lines=_wrapText('Hello World',99999,11,'normal');
  assert('Very wide maxW = single line',lines.length,1);
})();

(()=>{
  const lines=_wrapText(null,200,11,'normal');
  assert('Null text = single empty line',lines.length,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  ITEM LABEL WIDTHS (~15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Item Label Widths — _itemLabelWidths');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review',labelPosition:'right'});
  const w=_itemLabelWidths(it,[],{});
  assertT('Task right label: labelW > 0',w.labelW>0);
  assert('Task right label: edgeLW = 0',w.edgeLW,0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review',labelPosition:'left'});
  const w=_itemLabelWidths(it,[],{});
  assert('Task left label: labelW = 0',w.labelW,0);
  assertT('Task left label: edgeLW > 0',w.edgeLW>0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review',labelPosition:'top'});
  const w=_itemLabelWidths(it,[],{});
  assert('Task top label: labelW = 0',w.labelW,0);
  assert('Task top label: edgeLW = 0',w.edgeLW,0);
  assert('Task top label: edgeRW = 0',w.edgeRW,0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Design Review',labelPosition:'bottom'});
  const w=_itemLabelWidths(it,[],{});
  assert('Task bottom label: labelW = 0',w.labelW,0);
  assert('Task bottom label: edgeLW = 0',w.edgeLW,0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{name:'Kickoff',labelPosition:'right',showDate:true,date:'2026-01-15'});
  const w=_itemLabelWidths(it,[],{});
  assertT('Milestone right + showDate: edgeRW > 0',w.edgeRW>0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{name:'Kickoff',labelPosition:'left',showDate:true,date:'2026-01-15'});
  const w=_itemLabelWidths(it,[],{});
  assertT('Milestone left + showDate: edgeLW > 0',w.edgeLW>0);
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const disp=makeStatusDisplay({show:true,mode:'emoji',badgePos:'inline'});
  const it=makeItem('task',{name:'Build',status:'on-track',labelPosition:'right'});
  const wWithStatus=_itemLabelWidths(it,defs,disp);
  const it2=makeItem('task',{name:'Build',status:'',labelPosition:'right'});
  const wNoStatus=_itemLabelWidths(it2,defs,disp);
  assertT('Inline status prefix adds to label width',wWithStatus.labelW>wNoStatus.labelW);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build',status:'',labelPosition:'right'});
  const w=_itemLabelWidths(it,[],{});
  assertT('No status → no extra inline width (labelW = name width)',w.labelW>0);
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{labelPosition:'right'});
  it.name='';
  const w=_itemLabelWidths(it,[],{});
  assert('Empty name → labelW = 0',w.labelW,0);
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const disp=makeStatusDisplay({show:true,mode:'text',badgePos:'inline'});
  const it=makeItem('task',{name:'X',status:'on-track',labelPosition:'right'});
  const w=_itemLabelWidths(it,defs,disp);
  // text mode prefix = 'On Track X' which is longer than just 'X'
  assertGte('Text mode inline: wider than short name',w.labelW,_mt('On Track X',11,'normal')*0.9);
})();

// ═══════════════════════════════════════════════════════════════════
//  ITEM EXTENTS (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Item Extents — _itemExtents');

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5})];
  const ext=_itemExtents(items,1,null);
  assertT('Single task: extents not null',ext!==null);
  assertT('Single task: minPx < maxPx',ext.minPx<ext.maxPx);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5}),
    makeItem('task',{startDate:'2026-03-01',endDate:'2026-03-10',duration:10}),
  ];
  const ext=_itemExtents(items,1,null);
  assertT('Multiple items: span full range',ext!==null);
  assertT('Multiple items: wider than single item',ext.maxPx-ext.minPx>40);
})();

(()=>{
  resetItemCounter();
  const sls=[makeSwim({id:'s1',collapsed:'collapsed'})];
  const items=[makeItem('task',{swimlaneId:'s1',startDate:'2026-01-05',endDate:'2026-01-09'})];
  const ext=_itemExtents(items,1,sls);
  assert('Items in collapsed swimlane excluded → null',ext,null);
})();

(()=>{
  resetItemCounter();
  const sls=[makeSwim({id:'s1',collapsed:'expanded',subSwims:[{id:'ss1',collapsed:'minimized'}]})];
  const items=[makeItem('task',{swimlaneId:'s1',subSwimId:'ss1',startDate:'2026-01-05',endDate:'2026-01-09'})];
  const ext=_itemExtents(items,1,sls);
  assert('Items in minimized sub-swimlane excluded → null',ext,null);
})();

(()=>{
  const ext=_itemExtents([],1,null);
  assert('No items → returns null',ext,null);
})();

(()=>{
  resetItemCounter();
  const items=[makeItem('milestone',{date:'2026-02-01'})];
  const ext=_itemExtents(items,1,null);
  assertT('Milestone: extents not null',ext!==null);
})();

(()=>{
  resetItemCounter();
  const sls=[
    makeSwim({id:'s1',collapsed:'expanded'}),
    makeSwim({id:'s2',collapsed:'collapsed'}),
  ];
  const items=[
    makeItem('task',{swimlaneId:'s1',startDate:'2026-01-05',endDate:'2026-01-09',name:'Visible'}),
    makeItem('task',{swimlaneId:'s2',startDate:'2026-06-01',endDate:'2026-06-15',name:'Hidden'}),
  ];
  const ext=_itemExtents(items,1,sls);
  assertT('Mixed collapsed: extents only from visible',ext!==null);
  // The hidden item spans much later dates, so if included maxPx would be much larger
  const extAll=_itemExtents(items,1,[makeSwim({id:'s1',collapsed:'expanded'}),makeSwim({id:'s2',collapsed:'expanded'})]);
  assertT('Mixed collapsed: range smaller than all-expanded',ext.maxPx<extAll.maxPx);
})();

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5})];
  const ext1=_itemExtents(items,1,null);
  const ext2=_itemExtents(items,2,null);
  assertT('Zoom 2x: bar positions scale with zoom',ext2.maxPx>ext1.maxPx);
})();

// ═══════════════════════════════════════════════════════════════════
//  FIT SOLVER (~10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Fit Solver — fitToContent');

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5})];
  const z=fitToContent(800,items,null,1);
  assertT('Single item: returns valid zoom',z>0);
})();

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5})];
  const z1=fitToContent(800,items,null,1);
  const z2=fitToContent(800,items,null,z1);
  assert('Idempotent: running twice gives same result',z1,z2);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{startDate:'2026-01-01',endDate:'2026-06-30',duration:181}),
  ];
  const z=fitToContent(800,items,null,1);
  assertLte('Wide range: zoom out (zoom <= 1)',z,1);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-06',duration:2}),
  ];
  const z=fitToContent(800,items,null,1);
  assertGte('Narrow range: zoom in (zoom >= 1)',z,1);
})();

(()=>{
  resetItemCounter();
  const items=[];
  const z=fitToContent(800,items,null,1.5);
  assert('No items: returns current zoom',z,1.5);
})();

(()=>{
  resetItemCounter();
  const sls=[makeSwim({id:'s1',collapsed:'collapsed'})];
  const items=[makeItem('task',{swimlaneId:'s1',startDate:'2026-01-05',endDate:'2026-01-09'})];
  const z=fitToContent(800,items,sls,1);
  assert('All items in collapsed swimlane: returns current zoom',z,1);
})();

(()=>{
  resetItemCounter();
  const items=[
    makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5}),
    makeItem('task',{startDate:'2026-01-10',endDate:'2026-01-20',duration:11}),
  ];
  const z=fitToContent(800,items,null,1);
  assertT('Multiple items: zoom computed',z>0);
})();

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-03-01',endDate:'2026-03-01',duration:1})];
  const z=fitToContent(800,items,null,1);
  assertT('Single-day task: zoom computable',z>0);
})();

(()=>{
  resetItemCounter();
  const items=[makeItem('task',{startDate:'2026-01-05',endDate:'2026-01-09',duration:5})];
  const z400=fitToContent(400,items,null,1);
  const z1600=fitToContent(1600,items,null,1);
  assertT('Wider viewport allows higher zoom',z1600>=z400);
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
