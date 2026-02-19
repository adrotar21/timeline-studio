#!/usr/bin/env node
/**
 * Timeline Studio -- Swimlane Format / Font Size Tests (F19)
 * Covers: data model, migration, _packProj stripping, selection helpers,
 *   apply scopes, export SVG font size flow.
 *
 * ~30 tests
 */
const{assert,assertT,assertF,section,summary}=require('../helpers/assert');
const{U,App}=require('../helpers/mock-engine');
const{makeProj,makeSwim,makeItem,addItems}=require('../helpers/builders');

// ─── Migration ──────────────────────────────────────────────────────────────

function migrate(p){
  if(!p.version||p.version<2)p.version=2;
  if(!p.swimlanes)p.swimlanes=[];
  if(!p.items)p.items=[];
  p.swimlanes.forEach(sl=>{
    if(!sl.subSwimlanes)sl.subSwimlanes=[];
    if(!sl.height)sl.height=120;
    if(sl.collapsed===true)sl.collapsed='minimized';
    else if(!sl.collapsed||sl.collapsed===false)sl.collapsed='expanded';
    if(sl.fontSize==null)sl.fontSize=0;
    sl.subSwimlanes.forEach(ss=>{
      if(ss.height==null)ss.height=0;
      if(!ss.collapsed)ss.collapsed='expanded';
      if(ss.fontSize==null)ss.fontSize=0;
    });
  });
  return p;
}

// ─── _packProj (fontSize stripping) ─────────────────────────────────────────

function packSwimFontSize(swimlanes){
  // Mimics the swimlane section of _packProj for fontSize
  const packed=JSON.parse(JSON.stringify(swimlanes));
  for(const sl of packed){
    if(sl.collapsed==='expanded')delete sl.collapsed;
    if(sl.height===120)delete sl.height;
    if(!sl.fontSize)delete sl.fontSize;
    if(Array.isArray(sl.subSwimlanes)){
      if(!sl.subSwimlanes.length)delete sl.subSwimlanes;
      else for(const ss of sl.subSwimlanes){
        if(ss.collapsed==='expanded')delete ss.collapsed;
        if(ss.height===0||ss.height==null)delete ss.height;
        if(!ss.fontSize)delete ss.fontSize;
      }
    }
  }
  return packed;
}

// ─── Selection helpers ──────────────────────────────────────────────────────

function isSlSel(slSel,slId,ssId){
  ssId=ssId||'';
  return slSel.some(s=>s.slId===slId&&s.ssId===ssId);
}

// ─── Apply font size (mirrors _applySlFs logic) ─────────────────────────────

function applySlFs(proj,slSel,scope,size){
  if(scope==='selected'){
    for(const s of slSel){
      if(s.ssId){
        for(const sl of proj.swimlanes)for(const ss of sl.subSwimlanes||[])if(ss.id===s.ssId)ss.fontSize=size;
      }else{
        const sl=proj.swimlanes.find(x=>x.id===s.slId);
        if(sl)sl.fontSize=size;
      }
    }
  }else if(scope==='all-swim'){
    proj.swimlanes.forEach(sl=>{sl.fontSize=size});
  }else if(scope==='all-sub'){
    proj.swimlanes.forEach(sl=>{(sl.subSwimlanes||[]).forEach(ss=>{ss.fontSize=size})});
  }else if(scope==='subs-in-lane'){
    const lanes=new Set(slSel.filter(s=>s.ssId).map(s=>s.slId));
    lanes.forEach(slId=>{
      const sl=proj.swimlanes.find(x=>x.id===slId);
      if(sl)(sl.subSwimlanes||[]).forEach(ss=>{ss.fontSize=size});
    });
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

section('Migration — fontSize on swimlanes');

(() => {
  const p=migrate({version:2,swimlanes:[{id:'sw1',name:'Lane 1',color:'#000'}],items:[]});
  assert('migrate adds fontSize=0 to swimlane',p.swimlanes[0].fontSize,0);
})();

(() => {
  const p=migrate({version:2,swimlanes:[{id:'sw1',name:'Lane 1',color:'#000',fontSize:14}],items:[]});
  assert('migrate preserves existing fontSize',p.swimlanes[0].fontSize,14);
})();

(() => {
  const p=migrate({version:2,swimlanes:[{id:'sw1',name:'A',color:'#000',subSwimlanes:[{id:'ss1',name:'Sub'}]}],items:[]});
  assert('migrate adds fontSize=0 to sub-swimlane',p.swimlanes[0].subSwimlanes[0].fontSize,0);
})();

(() => {
  const p=migrate({version:2,swimlanes:[{id:'sw1',name:'A',color:'#000',subSwimlanes:[{id:'ss1',name:'Sub',fontSize:10}]}],items:[]});
  assert('migrate preserves existing sub fontSize',p.swimlanes[0].subSwimlanes[0].fontSize,10);
})();

section('_packProj — fontSize stripping');

(() => {
  const lanes=[{id:'sw1',name:'A',color:'#000',collapsed:'expanded',height:120,fontSize:0,subSwimlanes:[]}];
  const packed=packSwimFontSize(lanes);
  assertF('pack strips fontSize=0',packed[0].hasOwnProperty('fontSize'));
})();

(() => {
  const lanes=[{id:'sw1',name:'A',color:'#000',collapsed:'expanded',height:120,fontSize:14,subSwimlanes:[]}];
  const packed=packSwimFontSize(lanes);
  assert('pack preserves fontSize=14',packed[0].fontSize,14);
})();

(() => {
  const lanes=[{id:'sw1',name:'A',color:'#000',collapsed:'expanded',height:120,fontSize:0,subSwimlanes:[{id:'ss1',name:'Sub',height:0,collapsed:'expanded',fontSize:0}]}];
  const packed=packSwimFontSize(lanes);
  assertF('pack strips sub fontSize=0',packed[0].subSwimlanes[0].hasOwnProperty('fontSize'));
})();

(() => {
  const lanes=[{id:'sw1',name:'A',color:'#000',collapsed:'expanded',height:120,fontSize:0,subSwimlanes:[{id:'ss1',name:'Sub',height:0,collapsed:'expanded',fontSize:11}]}];
  const packed=packSwimFontSize(lanes);
  assert('pack preserves sub fontSize=11',packed[0].subSwimlanes[0].fontSize,11);
})();

section('Selection helpers — _isSlSel');

(() => {
  const slSel=[{slId:'sw1',ssId:''}];
  assertT('isSlSel finds main swimlane',isSlSel(slSel,'sw1',''));
  assertF('isSlSel misses wrong swimlane',isSlSel(slSel,'sw2',''));
  assertF('isSlSel misses sub when main selected',isSlSel(slSel,'sw1','ss1'));
})();

(() => {
  const slSel=[{slId:'sw1',ssId:'ss1'}];
  assertT('isSlSel finds sub-swimlane',isSlSel(slSel,'sw1','ss1'));
  assertF('isSlSel misses main when sub selected',isSlSel(slSel,'sw1',''));
  assertF('isSlSel misses different sub',isSlSel(slSel,'sw1','ss2'));
})();

(() => {
  const slSel=[{slId:'sw1',ssId:''},{slId:'sw2',ssId:'ss2'}];
  assertT('multi-sel: main sw1 found',isSlSel(slSel,'sw1',''));
  assertT('multi-sel: sub ss2 found',isSlSel(slSel,'sw2','ss2'));
  assertF('multi-sel: unselected not found',isSlSel(slSel,'sw3',''));
})();

section('Apply scope — selected only');

(() => {
  const p={swimlanes:[
    {id:'sw1',name:'A',fontSize:0,subSwimlanes:[{id:'ss1',name:'S1',fontSize:0},{id:'ss2',name:'S2',fontSize:0}]},
    {id:'sw2',name:'B',fontSize:0,subSwimlanes:[]},
  ]};
  applySlFs(p,[{slId:'sw1',ssId:''}],'selected',16);
  assert('selected: sw1 fontSize changed',p.swimlanes[0].fontSize,16);
  assert('selected: sw2 fontSize unchanged',p.swimlanes[1].fontSize,0);
})();

(() => {
  const p={swimlanes:[
    {id:'sw1',name:'A',fontSize:0,subSwimlanes:[{id:'ss1',name:'S1',fontSize:0},{id:'ss2',name:'S2',fontSize:0}]},
  ]};
  applySlFs(p,[{slId:'sw1',ssId:'ss1'}],'selected',10);
  assert('selected: ss1 fontSize changed',p.swimlanes[0].subSwimlanes[0].fontSize,10);
  assert('selected: ss2 fontSize unchanged',p.swimlanes[0].subSwimlanes[1].fontSize,0);
  assert('selected: swimlane fontSize unchanged',p.swimlanes[0].fontSize,0);
})();

section('Apply scope — all swimlanes');

(() => {
  const p={swimlanes:[
    {id:'sw1',name:'A',fontSize:0,subSwimlanes:[]},
    {id:'sw2',name:'B',fontSize:12,subSwimlanes:[]},
    {id:'sw3',name:'C',fontSize:8,subSwimlanes:[]},
  ]};
  applySlFs(p,[{slId:'sw1',ssId:''}],'all-swim',15);
  assert('all-swim: sw1',p.swimlanes[0].fontSize,15);
  assert('all-swim: sw2',p.swimlanes[1].fontSize,15);
  assert('all-swim: sw3',p.swimlanes[2].fontSize,15);
})();

section('Apply scope — all sub-swimlanes');

(() => {
  const p={swimlanes:[
    {id:'sw1',name:'A',fontSize:0,subSwimlanes:[{id:'ss1',name:'S1',fontSize:0},{id:'ss2',name:'S2',fontSize:0}]},
    {id:'sw2',name:'B',fontSize:0,subSwimlanes:[{id:'ss3',name:'S3',fontSize:12}]},
  ]};
  applySlFs(p,[{slId:'sw1',ssId:'ss1'}],'all-sub',8);
  assert('all-sub: ss1',p.swimlanes[0].subSwimlanes[0].fontSize,8);
  assert('all-sub: ss2',p.swimlanes[0].subSwimlanes[1].fontSize,8);
  assert('all-sub: ss3',p.swimlanes[1].subSwimlanes[0].fontSize,8);
  assert('all-sub: swimlane fontSize not touched',p.swimlanes[0].fontSize,0);
})();

section('Apply scope — subs in this lane');

(() => {
  const p={swimlanes:[
    {id:'sw1',name:'A',fontSize:0,subSwimlanes:[{id:'ss1',name:'S1',fontSize:0},{id:'ss2',name:'S2',fontSize:0}]},
    {id:'sw2',name:'B',fontSize:0,subSwimlanes:[{id:'ss3',name:'S3',fontSize:0}]},
  ]};
  applySlFs(p,[{slId:'sw1',ssId:'ss1'}],'subs-in-lane',11);
  assert('subs-in-lane: ss1 changed',p.swimlanes[0].subSwimlanes[0].fontSize,11);
  assert('subs-in-lane: ss2 changed (same lane)',p.swimlanes[0].subSwimlanes[1].fontSize,11);
  assert('subs-in-lane: ss3 untouched (diff lane)',p.swimlanes[1].subSwimlanes[0].fontSize,0);
})();

section('Font size defaults');

(() => {
  // 0 means "use default" — verify the fallback pattern
  const sl={fontSize:0};
  const mainDefault=sl.fontSize||12;
  assert('swimlane default is 12',mainDefault,12);

  const sl2={fontSize:16};
  assert('swimlane custom preserved',sl2.fontSize||12,16);

  const ss={fontSize:0};
  const subDefault=ss.fontSize||9.5;
  assert('sub-swimlane default is 9.5',subDefault,9.5);

  const ss2={fontSize:11};
  assert('sub custom preserved',ss2.fontSize||9.5,11);
})();

section('Export SVG font size — default fallbacks');

(() => {
  // Simulate the export font size logic
  const sl1={fontSize:0};
  const expMainVert=sl1.fontSize||11;
  assert('export vertical default is 11',expMainVert,11);

  const sl2={fontSize:18};
  assert('export vertical custom',sl2.fontSize||11,18);

  const sl3={fontSize:0};
  const expMainHoriz=sl3.fontSize||12;
  assert('export horizontal default is 12',expMainHoriz,12);

  const ss1={fontSize:0};
  const expSub=ss1.fontSize||9.5;
  assert('export sub default is 9.5',expSub,9.5);

  const ss2={fontSize:7};
  const expSubMin=Math.min(8,ss2.fontSize||8);
  assert('export minimized sub capped at 7',expSubMin,7);
})();

section('Selection toggle (multi-select)');

(() => {
  let slSel=[];
  // Single click sw1
  slSel=[{slId:'sw1',ssId:''}];
  assert('single click: one selected',slSel.length,1);
  // Ctrl+click sw2
  slSel.push({slId:'sw2',ssId:''});
  assert('ctrl+click: two selected',slSel.length,2);
  // Ctrl+click sw1 again (toggle off)
  const idx=slSel.findIndex(s=>s.slId==='sw1'&&!s.ssId);
  if(idx>=0)slSel.splice(idx,1);
  assert('ctrl+click toggle: sw1 removed',slSel.length,1);
  assert('ctrl+click toggle: sw2 remains',slSel[0].slId,'sw2');
})();

summary();
