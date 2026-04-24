#!/usr/bin/env node
/**
 * Timeline Studio — My Views (Saved Swimlane Configs) Tests
 * Covers: sparse capture, apply with drift, return-to-prev toggle,
 *   overwrite/update (modified field), delete clears _lastAppliedViewId,
 *   migration v2→v3, _packProj roundtrip.
 *
 * ~30 tests — replicates app.js algorithms as pure functions (standard mock-engine pattern).
 */
const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');

// ─── Pure-function replicas of app.js My Views algorithm ──────────────────

function captureSlSnapshot(proj,opts){
  const dense=!!(opts&&opts.dense);
  const slStates={};
  for(const sl of proj.swimlanes){
    const entry={};
    if(sl.collapsed&&sl.collapsed!=='expanded')entry.c=sl.collapsed;
    else if(dense)entry.c='expanded';
    const subs={};
    for(const ss of (sl.subSwimlanes||[])){
      if(ss.collapsed&&ss.collapsed!=='expanded')subs[ss.id]=ss.collapsed;
      else if(dense)subs[ss.id]='expanded';
    }
    if(Object.keys(subs).length||dense)entry.subs=subs;
    /* Always record the key so apply() can distinguish known-expanded vs new-since-save */
    slStates[sl.id]=entry;
  }
  return {slStates};
}

function applySnapshot(proj,snap){
  if(!snap||!snap.slStates)return{added:0,missing:0};
  for(const sl of proj.swimlanes){
    const e=snap.slStates[sl.id];
    if(e){
      sl.collapsed=e.c||'expanded';
      const subEntries=e.subs||{};
      for(const ss of (sl.subSwimlanes||[])){
        ss.collapsed=subEntries[ss.id]||'expanded';
      }
    }
  }
  const currentIds=new Set(proj.swimlanes.map(s=>s.id));
  const added=proj.swimlanes.filter(s=>!snap.slStates[s.id]).length;
  const missing=Object.keys(snap.slStates).filter(id=>!currentIds.has(id)).length;
  return {added,missing};
}

function migrateViews(p){
  if(!Array.isArray(p.views))p.views=[];
  p.views.forEach(v=>{
    if(!v.id)v.id='id_'+Math.random().toString(36).slice(2,9);
    if(typeof v.name!=='string'||!v.name)v.name='Untitled view';
    if(typeof v.created!=='number')v.created=Date.now();
    if(!v.slStates||typeof v.slStates!=='object')v.slStates={};
  });
  if(!p.version||p.version<3)p.version=3;
  return p;
}

function packViews(p){
  const out=JSON.parse(JSON.stringify(p));
  if(Array.isArray(out.views)&&!out.views.length)delete out.views;
  return out;
}

// ─── Test data builder ─────────────────────────────────────────────────────

function makeProjFor(){
  return{
    version:3,
    swimlanes:[
      {id:'sw1',name:'A',collapsed:'expanded',subSwimlanes:[{id:'ss1a',collapsed:'expanded'},{id:'ss1b',collapsed:'expanded'}]},
      {id:'sw2',name:'B',collapsed:'minimized',subSwimlanes:[]},
      {id:'sw3',name:'C',collapsed:'collapsed',subSwimlanes:[{id:'ss3a',collapsed:'minimized'}]},
      {id:'sw4',name:'D',collapsed:'expanded',subSwimlanes:[]},
    ],
    views:[],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────

section('Capture — ID tracking with sparse overrides');

{
  const p=makeProjFor();
  const snap=captureSlSnapshot(p);
  /* Every current swimlane gets a key; expanded entries are empty objects */
  assertT('sw1 key present (even when expanded)','sw1' in snap.slStates);
  assertT('sw4 key present (even when expanded)','sw4' in snap.slStates);
  assertF('sw1 entry has no c (implicit expanded)',!!(snap.slStates.sw1.c));
  assert('sw2 collapse captured',snap.slStates.sw2.c,'minimized');
  assert('sw3 collapse captured',snap.slStates.sw3.c,'collapsed');
  assert('sw3 sub minimized captured',snap.slStates.sw3.subs.ss3a,'minimized');
  assert('all 4 swimlanes tracked',Object.keys(snap.slStates).length,4);
}

{
  const p={version:3,swimlanes:[{id:'a',collapsed:'expanded',subSwimlanes:[]}],views:[]};
  const snap=captureSlSnapshot(p);
  assert('all-expanded still records known IDs',Object.keys(snap.slStates).length,1);
  assertF('entry is empty (no c, no subs)',!!(snap.slStates.a.c)||!!(snap.slStates.a.subs));
}

{
  const p={version:3,swimlanes:[{id:'a',collapsed:'expanded',subSwimlanes:[{id:'s1',collapsed:'minimized'},{id:'s2',collapsed:'expanded'}]}],views:[]};
  const snap=captureSlSnapshot(p);
  assert('parent expanded but sub minimized → subs entry present',snap.slStates.a.subs.s1,'minimized');
  assertF('parent c omitted when expanded',!!(snap.slStates.a.c));
}

section('Apply with drift');

{
  /* Apply a snapshot that exactly matches current proj (restores after mutation) */
  const p=makeProjFor();
  const snap=captureSlSnapshot(p);
  /* Mutate: collapse all */
  p.swimlanes.forEach(sl=>{sl.collapsed='collapsed';(sl.subSwimlanes||[]).forEach(ss=>ss.collapsed='minimized')});
  const {added,missing}=applySnapshot(p,snap);
  assert('no missing ids',missing,0);
  /* All 4 swimlanes were known at capture time → none are "added" */
  assert('zero added — all IDs tracked',added,0);
  assert('sw1 restored to expanded (empty entry → default)',p.swimlanes.find(s=>s.id==='sw1').collapsed,'expanded');
  assert('sw2 restored to minimized',p.swimlanes.find(s=>s.id==='sw2').collapsed,'minimized');
  assert('sw3 restored to collapsed',p.swimlanes.find(s=>s.id==='sw3').collapsed,'collapsed');
  assert('sw3 sub restored to minimized',p.swimlanes.find(s=>s.id==='sw3').subSwimlanes[0].collapsed,'minimized');
  assert('sw4 restored to expanded (empty entry)',p.swimlanes.find(s=>s.id==='sw4').collapsed,'expanded');
}

{
  /* All-expanded saved view still restores state after mutation */
  const p=makeProjFor();
  p.swimlanes.forEach(sl=>{sl.collapsed='expanded';(sl.subSwimlanes||[]).forEach(ss=>ss.collapsed='expanded')});
  const snap=captureSlSnapshot(p);
  p.swimlanes.forEach(sl=>sl.collapsed='collapsed');
  applySnapshot(p,snap);
  assert('sw1 re-expanded after apply',p.swimlanes[0].collapsed,'expanded');
  assert('sw2 re-expanded',p.swimlanes[1].collapsed,'expanded');
  assert('sw3 re-expanded',p.swimlanes[2].collapsed,'expanded');
  assert('sw4 re-expanded',p.swimlanes[3].collapsed,'expanded');
}

{
  /* Snapshot references a deleted swimlane → silent skip, missing=1 */
  const p=makeProjFor();
  const snap={slStates:{sw_ghost:{c:'minimized'},sw2:{c:'collapsed'}}};
  const {missing}=applySnapshot(p,snap);
  assert('one missing id (sw_ghost)',missing,1);
  assert('sw2 still applied correctly',p.swimlanes.find(s=>s.id==='sw2').collapsed,'collapsed');
}

{
  /* Apply: new swimlane (not in saved snap keys) → left alone */
  const p={version:3,swimlanes:[{id:'a',collapsed:'minimized',subSwimlanes:[]},{id:'b_new',collapsed:'collapsed',subSwimlanes:[]}],views:[]};
  const snap={slStates:{a:{c:'collapsed'}}};
  const {added}=applySnapshot(p,snap);
  assert('a applied',p.swimlanes[0].collapsed,'collapsed');
  assert('b_new untouched (truly new since save)',p.swimlanes[1].collapsed,'collapsed');
  assert('added count reflects new swimlane',added,1);
}

{
  /* Known swimlane with empty entry → reset to expanded */
  const p={version:3,swimlanes:[{id:'a',collapsed:'collapsed',subSwimlanes:[]},{id:'b',collapsed:'minimized',subSwimlanes:[]}],views:[]};
  const snap={slStates:{a:{},b:{}}}; /* both were known-expanded at save */
  applySnapshot(p,snap);
  assert('a reset to expanded (empty entry)',p.swimlanes[0].collapsed,'expanded');
  assert('b reset to expanded (empty entry)',p.swimlanes[1].collapsed,'expanded');
}

{
  /* Swimlane in snap resets subs not in subs map */
  const p={version:3,swimlanes:[{id:'a',collapsed:'expanded',subSwimlanes:[{id:'s1',collapsed:'minimized'},{id:'s2',collapsed:'minimized'}]}],views:[]};
  const snap={slStates:{a:{subs:{s1:'minimized'}}}};
  applySnapshot(p,snap);
  assert('s1 kept minimized',p.swimlanes[0].subSwimlanes[0].collapsed,'minimized');
  assert('s2 reset to expanded (absent from subs map)',p.swimlanes[0].subSwimlanes[1].collapsed,'expanded');
}

section('Return-to-previous toggle');

{
  /* _prevView uses DENSE capture so oscillation fully restores even expanded lanes */
  const p=makeProjFor();
  /* Step 1: in state A, capture dense snapshot BEFORE mutation (simulates expand/collapse/apply flow) */
  let prevView=captureSlSnapshot(p,{dense:true});
  /* Step 2: Mutate to state B — all collapsed */
  p.swimlanes.forEach(sl=>sl.collapsed='collapsed');
  /* Step 3: Return-to-prev: capture current (dense) as new prev, apply stored prev (=A) */
  let cur=captureSlSnapshot(p,{dense:true});
  applySnapshot(p,prevView);
  prevView=cur;
  assert('back to A — sw1 expanded (dense restores)',p.swimlanes[0].collapsed,'expanded');
  assert('back to A — sw2 minimized',p.swimlanes.find(s=>s.id==='sw2').collapsed,'minimized');
  assert('back to A — sw4 expanded',p.swimlanes[3].collapsed,'expanded');
  /* Step 4: Return-to-prev again: should go back to B */
  cur=captureSlSnapshot(p,{dense:true});
  applySnapshot(p,prevView);
  prevView=cur;
  assert('oscillated to B — sw1 collapsed',p.swimlanes[0].collapsed,'collapsed');
  assert('oscillated to B — sw4 collapsed',p.swimlanes[3].collapsed,'collapsed');
  /* Step 5: Third toggle → back to A */
  cur=captureSlSnapshot(p,{dense:true});
  applySnapshot(p,prevView);
  assert('third swap back to A — sw1 expanded',p.swimlanes[0].collapsed,'expanded');
}

{
  /* Dense capture includes all swimlanes */
  const p=makeProjFor();
  const dense=captureSlSnapshot(p,{dense:true});
  assert('dense captures all 4 swimlanes',Object.keys(dense.slStates).length,4);
  assert('dense captures expanded as c=expanded',dense.slStates.sw1.c,'expanded');
  assert('dense captures expanded sub',dense.slStates.sw1.subs.ss1a,'expanded');
}

section('Overwrite / update preserves created, sets modified');

{
  const now=1_700_000_000_000;
  const v={id:'v1',name:'X',created:now,slStates:{sw1:{c:'minimized'}}};
  /* Simulate overwriteView: replace slStates, set modified */
  const newSnap={slStates:{sw2:{c:'collapsed'}}};
  v.slStates=newSnap.slStates;
  v.modified=now+1000;
  assert('created preserved',v.created,now);
  assert('modified set',v.modified,now+1000);
  assert('slStates replaced — sw2',v.slStates.sw2.c,'collapsed');
  assertF('old slStates.sw1 cleared',!!(v.slStates.sw1));
}

section('Delete clears _lastAppliedViewId when matching');

{
  let views=[{id:'v1',name:'A',slStates:{},created:1}];
  let lastApplied='v1';
  views=views.filter(x=>x.id!=='v1');
  if(lastApplied==='v1')lastApplied=null;
  assert('view removed',views.length,0);
  assert('lastApplied cleared',lastApplied,null);
}

{
  let views=[{id:'v1',name:'A',slStates:{},created:1},{id:'v2',name:'B',slStates:{},created:2}];
  let lastApplied='v1';
  views=views.filter(x=>x.id!=='v2');
  if(lastApplied==='v2')lastApplied=null;
  assert('one view remains',views.length,1);
  assert('lastApplied untouched (non-matching delete)',lastApplied,'v1');
}

section('Migration v2 → v3');

{
  const p={version:2,swimlanes:[{id:'a',collapsed:'expanded'}],items:[]};
  migrateViews(p);
  assert('version bumped to 3',p.version,3);
  assertT('views initialized as array',Array.isArray(p.views));
  assert('empty views array',p.views.length,0);
}

{
  /* v3 project unchanged on re-migrate (idempotent) */
  const p={version:3,swimlanes:[],views:[{id:'v1',name:'Keep',created:123,slStates:{}}]};
  migrateViews(p);
  assert('stays v3',p.version,3);
  assert('view kept',p.views.length,1);
  assert('view name preserved',p.views[0].name,'Keep');
}

{
  /* Missing fields filled in during migrate */
  const p={version:2,swimlanes:[],views:[{slStates:null}]};
  migrateViews(p);
  const v=p.views[0];
  assertT('id filled',!!v.id);
  assertT('name filled',typeof v.name==='string'&&v.name.length>0);
  assertT('created filled',typeof v.created==='number');
  assertT('slStates filled',v.slStates&&typeof v.slStates==='object');
}

section('_packProj roundtrip');

{
  const p={version:3,swimlanes:[],views:[]};
  const packed=packViews(p);
  assertF('empty views stripped','views' in packed);
}

{
  const p={version:3,swimlanes:[],views:[{id:'v1',name:'Keep',created:123,slStates:{sw1:{c:'minimized'}}}]};
  const packed=packViews(p);
  assert('views preserved when non-empty',packed.views.length,1);
  assert('slStates.sw1 preserved',packed.views[0].slStates.sw1.c,'minimized');
}

{
  /* modified field survives JSON roundtrip */
  const p={version:3,swimlanes:[],views:[{id:'v1',name:'Updated',created:100,modified:200,slStates:{sw1:{c:'collapsed'}}}]};
  const packed=packViews(p);
  const restored=JSON.parse(JSON.stringify(packed));
  assert('modified survives JSON roundtrip',restored.views[0].modified,200);
  assert('created survives JSON roundtrip',restored.views[0].created,100);
}

section('Capture → apply full identity');

{
  const p=makeProjFor();
  const snap=captureSlSnapshot(p);
  p.swimlanes.forEach(sl=>{sl.collapsed='minimized';(sl.subSwimlanes||[]).forEach(ss=>ss.collapsed='minimized')});
  applySnapshot(p,snap);
  /* All IDs were known at capture → every lane restored to its saved state */
  assert('sw1 restored to expanded',p.swimlanes.find(s=>s.id==='sw1').collapsed,'expanded');
  assert('sw2 restored',p.swimlanes.find(s=>s.id==='sw2').collapsed,'minimized');
  assert('sw3 restored',p.swimlanes.find(s=>s.id==='sw3').collapsed,'collapsed');
  assert('sw3 sub restored',p.swimlanes.find(s=>s.id==='sw3').subSwimlanes[0].collapsed,'minimized');
  assert('sw4 restored to expanded',p.swimlanes.find(s=>s.id==='sw4').collapsed,'expanded');
}

{
  /* Round-trip of a sub-only customization */
  const p={version:3,swimlanes:[{id:'a',collapsed:'expanded',subSwimlanes:[{id:'s1',collapsed:'minimized'},{id:'s2',collapsed:'expanded'}]}],views:[]};
  const snap=captureSlSnapshot(p);
  p.swimlanes[0].subSwimlanes.forEach(ss=>ss.collapsed='expanded');
  applySnapshot(p,snap);
  assert('s1 minimized restored',p.swimlanes[0].subSwimlanes[0].collapsed,'minimized');
  assert('s2 stays expanded',p.swimlanes[0].subSwimlanes[1].collapsed,'expanded');
}

section('Max views cap (20)');

{
  const MAX=20;
  const views=[];
  for(let i=0;i<MAX;i++)views.push({id:'v'+i,name:'View '+i,created:i,slStates:{}});
  assert('filled to cap',views.length,MAX);
  const canPush=views.length<MAX;
  assertF('cannot push when at cap',canPush);
}

summary();
