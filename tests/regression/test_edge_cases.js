#!/usr/bin/env node
/**
 * Timeline Studio -- Edge Case Regression Tests
 *
 * Documents and validates edge case behaviors:
 * 1. Pinned items in scheduled chains (scheduler/propagation skip, CPM topology-based float)
 * 2. Scheduling pass convergence (1 topo-sorted pass always sufficient)
 * 3. Zero-duration tasks (endDate=startDate, depEnd=startDate+1, float=1 BUG)
 * 4. Float >= 0 invariant & violation independence
 * 5. FF/SF dependency types in float calculation
 * 6. Load-state consistency (derived values recomputed on demand)
 */

const{assert,assertT,assertF,assertGte,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ── Helpers ──────────────────────────────────────────────────────

// Initialize default proj (cal mode, no weekend scheduling for simpler date math)
App.proj={version:2,schedulingMode:'manual',scheduleAroundNonWorking:false,
  holidays:[],items:[],showFloat:false};

function initProj(items,opts={}){
  App.proj={
    version:2,schedulingMode:opts.mode||'manual',
    scheduleAroundNonWorking:opts.schedAround||false,
    holidays:opts.holidays||[],
    items:items,showFloat:false,
  };
  for(const it of items){
    if(it.type==='task')it.endDate=App._calcEndDate(it);
  }
  if(opts.mode==='scheduled')App.runSchedule();
}

function mkTask(id,name,start,dur,opts={}){
  const durMode=opts.durMode||'cal';
  const endDate=App._calcEndDate({startDate:start,duration:dur,durMode});
  return {id,name,type:'task',startDate:start,endDate,duration:dur,durMode,
    deps:opts.deps||[],pinned:opts.pinned||false,hidden:false,swimlaneId:'sw1',
    subSwimId:'',subRow:0,color:'#4a9eda',showDate:true,showDuration:true,
    showOwner:false,durationFmt:'days',owner:'',notes:'',progress:0}
}

function mkMilestone(id,name,date,opts={}){
  return {id,name,type:'milestone',date,deps:opts.deps||[],pinned:opts.pinned||false,
    hidden:false,swimlaneId:'sw1',subSwimId:'',subRow:0,color:'#4a9eda',
    showDate:true,showDuration:false,showOwner:false,owner:'',notes:'',progress:0}
}

// ===================================================================
//  SECTION 1: Pinned Items in Chains
// ===================================================================

section('P1: Scheduler skips pinned items');
{
  // A(5d Jan 5-9) -> B(5d pinned Jan 19-23) -> C(3d)
  // B is pinned 10 days late; scheduler skips B and schedules C after B.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-19',5,
    {pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','TaskC','2026-01-01',3,
    {deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  assert('P1: B stays pinned at Jan 19',B.startDate,'2026-01-19');
  assert('P1: C scheduled after B (Jan 24)',C.startDate,'2026-01-24');
}

section('P2: Violation detected when pinned item overlaps predecessor');
{
  // A(10d Jan 5-14) -> B(5d pinned Jan 8). B starts before A ends -> violation.
  const A=mkTask('a','TaskA','2026-01-05',10);
  const B=mkTask('b','TaskB','2026-01-08',5,
    {pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  assert('P2: B stays pinned at Jan 8',B.startDate,'2026-01-08');
  const violated=App.getViolatedDepIds();
  assertT('P2: B is violated',violated.has('b'));
  assertF('P2: A is NOT violated',violated.has('a'));
}

section('P3: Float uses CPM topology, not actual pinned position');
{
  // Same as P2: A(10d)->B(pinned Jan 8). Both get float=0 from topology.
  const A=mkTask('a','TaskA','2026-01-05',10);
  const B=mkTask('b','TaskB','2026-01-08',5,
    {pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('P3: A float=0 (topology)',A._float,0);
  assert('P3: B float=0 (topology)',B._float,0);
}

section('P4: Unpinning allows scheduler to correct position');
{
  // A(10d Jan 5-14) -> B(5d pinned Jan 8). Unpin B -> B moves to Jan 15.
  const A=mkTask('a','TaskA','2026-01-05',10);
  const B=mkTask('b','TaskB','2026-01-08',5,
    {pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  assert('P4: B pinned at Jan 8 initially',B.startDate,'2026-01-08');
  B.pinned=false;
  App.runSchedule();
  assert('P4: B moves to Jan 15 after unpin',B.startDate,'2026-01-15');
}

section('P5: propagateFrom respects pinned items');
{
  // A(5d Jan 5-9) -> B(5d pinned Jan 19) -> C(3d)
  // Change B.duration to 8 -> C cascades, B stays pinned.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-19',5,
    {pinned:true,deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','TaskC','2026-01-01',3,
    {deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  assert('P5: C at Jan 24 initially',C.startDate,'2026-01-24');
  B.duration=8;
  B.endDate=App._calcEndDate(B); // Jan 19 + 7 = Jan 26
  const n=App.propagateFrom(['b']);

  assert('P5: B stays pinned at Jan 19',B.startDate,'2026-01-19');
  assert('P5: B endDate updated to Jan 26',B.endDate,'2026-01-26');
  assert('P5: C cascaded to Jan 27',C.startDate,'2026-01-27');
  assert('P5: 1 item updated by propagation',n,1);

}

// ===================================================================
//  SECTION 2: Scheduling Pass Convergence
// ===================================================================

section('S1: 6-item linear chain converges in 1 pass');
{
  const A=mkTask('a','A','2026-01-05',5);
  const B=mkTask('b','B','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-01',4,{deps:[{id:'b',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-01',2,{deps:[{id:'c',type:'FS',lag:0}]});
  const E=mkTask('e','E','2026-01-01',6,{deps:[{id:'d',type:'FS',lag:0}]});
  const F=mkTask('f','F','2026-01-01',3,{deps:[{id:'e',type:'FS',lag:0}]});
  initProj([A,B,C,D,E,F],{mode:'scheduled',schedAround:false});

  const changes=App._runSchedulePass(true);
  assert('S1: 0 changes after schedule',changes.length,0);
}

section('S2: 10-item chain converges in 1 pass');
{
  const items=[mkTask('t1','T1','2026-01-05',3)];
  for(let i=2;i<=10;i++){
    items.push(mkTask('t'+i,'T'+i,'2026-01-01',3,
      {deps:[{id:'t'+(i-1),type:'FS',lag:0}]}));
  }
  initProj(items,{mode:'scheduled',schedAround:false});

  const changes=App._runSchedulePass(true);
  assert('S2: 0 changes after schedule',changes.length,0);
  // T1(3d Jan 5-7), T2(3d Jan 8-10), ... each 3d step.
  // T10 starts at Jan 5 + 9*3 = Jan 5 + 27 = Feb 1
  assert('S2: T10 at correct position',items[9].startDate,'2026-02-01');
}

section('S3: Diamond DAG converges in 1 pass');
{
  // A(5d) -> B(10d) -> D    and    A -> C(5d) -> D
  // D should be after the longer branch (B).
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Long','2026-01-01',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','Short','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','Join','2026-01-01',4,
    {deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled',schedAround:false});

  const changes=App._runSchedulePass(true);
  assert('S3: 0 changes after schedule',changes.length,0);
  assert('S3: D after longer branch B (Jan 20)',D.startDate,'2026-01-20');
}

section('S4: Fan-out converges in 1 pass');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','B','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-01',4,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','D','2026-01-01',2,{deps:[{id:'a',type:'FS',lag:0}]});
  const E=mkTask('e','E','2026-01-01',6,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B,C,D,E],{mode:'scheduled',schedAround:false});

  const changes=App._runSchedulePass(true);
  assert('S4: 0 changes after schedule',changes.length,0);
  assert('S4: B starts after A (Jan 10)',B.startDate,'2026-01-10');
  assert('S4: C starts after A (Jan 10)',C.startDate,'2026-01-10');
  assert('S4: D starts after A (Jan 10)',D.startDate,'2026-01-10');
  assert('S4: E starts after A (Jan 10)',E.startDate,'2026-01-10');
}

// ===================================================================
//  SECTION 3: Zero-Duration Tasks
// ===================================================================

section('Z1: Zero-duration endDate equals startDate in both modes');
{
  const calTask=mkTask('zc','ZeroCal','2026-01-05',0,{durMode:'cal'});
  assert('Z1: cal mode endDate=startDate',calTask.endDate,'2026-01-05');

  // Work mode: _addWorkingDays(start, 0) short-circuits (dur<=0) to addDays(start,0)
  App.proj.scheduleAroundNonWorking=true;
  const workEnd=App._calcEndDate({startDate:'2026-01-05',duration:0,durMode:'work'});
  assert('Z1: work mode endDate=startDate',workEnd,'2026-01-05');
  App.proj.scheduleAroundNonWorking=false;
}

section('Z2: Zero-duration predecessor depEnd = startDate+1');
{
  const Z=mkTask('z','ZeroTask','2026-01-05',0);
  const N=mkTask('n','Normal','2026-01-01',5,{deps:[{id:'z',type:'FS',lag:0}]});
  initProj([Z,N],{mode:'scheduled',schedAround:false});

  assert('Z2: depEnd(ZeroTask)=Jan 6',App._depEnd(Z),'2026-01-06');
  assert('Z2: Normal starts at Jan 6',N.startDate,'2026-01-06');
}

section('Z3: Chain 0d->0d->5d cascading');
{
  const A=mkTask('a','Zero1','2026-01-05',0);
  const B=mkTask('b','Zero2','2026-01-01',0,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','Normal','2026-01-01',5,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  assert('Z3: A stays at Jan 5',A.startDate,'2026-01-05');
  assert('Z3: B at Jan 6 (depEnd of A)',B.startDate,'2026-01-06');
  assert('Z3: C at Jan 7 (depEnd of B)',C.startDate,'2026-01-07');
}

section('Z4: Zero-duration float BUG -- forward/backward asymmetry');
{
  // BUG: Forward pass: dur = 0||(days(s,e)+1) = 0||1 = 1 (JS falsy 0).
  // Backward pass: dur = 0||0 = 0. Asymmetry gives float=1 (should be 0).
  // Fix: use `it.duration != null ? it.duration : (fallback)` in forward pass.
  const A=mkTask('a','ZeroTask','2026-01-05',0);
  const B=mkTask('b','Normal','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('Z4: A float=1 (BUG, should be 0)',A._float,1);
  assert('Z4: B float=0',B._float,0);
}

section('Z5: Zero-duration task and milestone produce identical depEnd');
{
  const T=mkTask('t','ZeroTask','2026-01-15',0);
  const M=mkMilestone('m','Milestone','2026-01-15');
  initProj([T,M],{schedAround:false});

  assert('Z5: depEnd(ZeroTask)=Jan 16',App._depEnd(T),'2026-01-16');
  assert('Z5: depEnd(Milestone)=Jan 16',App._depEnd(M),'2026-01-16');
  assert('Z5: both depEnd identical',App._depEnd(T),App._depEnd(M));
}

// ===================================================================
//  SECTION 4: Float >= 0 & Violation Independence
// ===================================================================

section('V1: Single chain -- all float=0, all >= 0');
{
  const A=mkTask('a','A','2026-01-05',5);
  const B=mkTask('b','B','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-01',4,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('V1: A float=0',A._float,0);
  assert('V1: B float=0',B._float,0);
  assert('V1: C float=0',C._float,0);
  assertT('V1: all floats >= 0',[A,B,C].every(i=>i._float>=0));
}

section('V2: Diamond -- short branch has positive float, all >= 0');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Long','2026-01-01',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','Short','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','Join','2026-01-01',4,
    {deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('V2: Root float=0',A._float,0);
  assert('V2: Long float=0',B._float,0);
  assertT('V2: Short has positive float',C._float>0);
  assert('V2: Join float=0',D._float,0);
  assertT('V2: all floats >= 0',[A,B,C,D].every(i=>i._float>=0));
}

section('V3: Violation independent from float');
{
  // Manual mode: B starts before A ends (violation), but float uses topology.
  const A=mkTask('a','TaskA','2026-01-05',5); // Jan 5-9
  const B=mkTask('b','TaskB','2026-01-07',3,  // Jan 7 < depEnd(A)=Jan 10
    {deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',schedAround:false});

  App.calculateFloat();
  assert('V3: A float=0 (topology)',A._float,0);
  assert('V3: B float=0 (topology)',B._float,0);

  const violated=App.getViolatedDepIds();
  assertT('V3: B is violated (actual position)',violated.has('b'));
  assertF('V3: A is NOT violated',violated.has('a'));
}

section('V4: No violation when correctly positioned');
{
  const A=mkTask('a','TaskA','2026-01-05',5); // Jan 5-9
  const B=mkTask('b','TaskB','2026-01-10',3,  // Jan 10 = depEnd(A) -> correct
    {deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',schedAround:false});

  App.calculateFloat();
  assert('V4: A float=0',A._float,0);
  assert('V4: B float=0',B._float,0);

  const violated=App.getViolatedDepIds();
  assert('V4: no violations',violated.size,0);
}

// ===================================================================
//  SECTION 5: FF/SF Float Calculation
// ===================================================================

section('FF1: Finish-to-Finish single chain -- both float=0');
{
  // A(5d Jan 5-9) -> B(5d, FF). B's end aligns with A's end.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-01',5,{deps:[{id:'a',type:'FF',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  // FF with equal durations: B starts same day as A, ends same day.
  assert('FF1: B ends same day as A',B.endDate,A.endDate);

  App.calculateFloat();
  assert('FF1: A float=0',A._float,0);
  assert('FF1: B float=0',B._float,0);
}

section('FF2: Finish-to-Finish with lag=2');
{
  // A(5d Jan 5-9). FF+2: B must end 2 days after A.
  // _depEnd(A)=Jan 10, reqEnd=Jan 12, B.start=Jan 12-5=Jan 7, B.end=Jan 11.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-01',5,{deps:[{id:'a',type:'FF',lag:2}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  assert('FF2: B starts Jan 7',B.startDate,'2026-01-07');
  assert('FF2: B ends Jan 11',B.endDate,'2026-01-11');

  App.calculateFloat();
  assert('FF2: A float=0',A._float,0);
  assert('FF2: B float=0',B._float,0);
}

section('SF1: Start-to-Finish -- SF is very permissive');
{
  // A(5d Jan 5-9) -> B(5d, SF). SF: B.finish >= A.start.
  // B can start as early as Dec 31 (Jan 5 - 5 days). B has large positive float.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-01',5,{deps:[{id:'a',type:'SF',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  assert('SF1: B starts Dec 31 (very early)',B.startDate,'2025-12-31');

  App.calculateFloat();
  assert('SF1: A float=0 (chain terminus)',A._float,0);
  assertT('SF1: B has positive float (SF permissive)',B._float>0);
  assertGte('SF1: B float >= 0',B._float,0);
}

section('SF2: SF + FS branching -- FS dominates');
{
  // A(5d Jan 5-9) -> B(5d, SF) and A -> C(3d, FS)
  // FS constrains: A and C critical. SF permissive: B has slack.
  const A=mkTask('a','TaskA','2026-01-05',5);
  const B=mkTask('b','TaskB','2026-01-01',5,{deps:[{id:'a',type:'SF',lag:0}]});
  const C=mkTask('c','TaskC','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('SF2: A float=0',A._float,0);
  assert('SF2: C float=0 (FS constrains)',C._float,0);
  assertT('SF2: B has slack (SF permissive)',B._float>0);
}

section('FF3: Diamond with FS deps -- baseline comparison');
{
  // A(5d) -> B_long(8d) -> D(4d)  and  A -> B_short(3d) -> D
  // Long branch is critical, short has slack.
  const A=mkTask('a','Root','2026-01-05',5);
  const Bl=mkTask('bl','Long','2026-01-01',8,{deps:[{id:'a',type:'FS',lag:0}]});
  const Bs=mkTask('bs','Short','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','Join','2026-01-01',4,
    {deps:[{id:'bl',type:'FS',lag:0},{id:'bs',type:'FS',lag:0}]});
  initProj([A,Bl,Bs,D],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('FF3: Root float=0',A._float,0);
  assert('FF3: Long float=0',Bl._float,0);
  assertT('FF3: Short has positive float',Bs._float>0);
  assert('FF3: Join float=0',D._float,0);
}

// ===================================================================
//  SECTION 6: Load-State Consistency
// ===================================================================

section('L1: _float deleted and recalculated correctly');
{
  const A=mkTask('a','A','2026-01-05',5);
  const B=mkTask('b','B','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','C','2026-01-01',4,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:false});

  App.calculateFloat();
  assert('L1: A float=0 initially',A._float,0);
  assert('L1: B float=0 initially',B._float,0);

  // Simulate save: delete _float (as _packProj does)
  delete A._float; delete B._float; delete C._float;
  assertT('L1: _float deleted',A._float===undefined);

  // Recalculate from scratch
  App.calculateFloat();
  assert('L1: A float=0 restored',A._float,0);
  assert('L1: B float=0 restored',B._float,0);
  assert('L1: C float=0 restored',C._float,0);
}

section('L2: Manual mode -- calculateFloat freshens stale endDates');
{
  const A=mkTask('a','TaskA','2026-01-05',5); // endDate=Jan 9
  const B=mkTask('b','TaskB','2026-01-10',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',schedAround:false});

  A.endDate='2026-01-15'; // STALE -- correct is Jan 9
  App.calculateFloat();

  assert('L2: A.endDate freshened to Jan 9',A.endDate,'2026-01-09');
  assert('L2: A float=0',A._float,0);
  assert('L2: B float=0',B._float,0);
}

section('L3: Scheduled mode -- runSchedule freshens stale endDates');
{
  const A=mkTask('a','TaskA','2026-01-05',5); // endDate=Jan 9
  const B=mkTask('b','TaskB','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  A.endDate='2026-01-20'; // STALE
  App.runSchedule();

  assert('L3: A.endDate freshened to Jan 9',A.endDate,'2026-01-09');
  assert('L3: B correctly positioned at Jan 10',B.startDate,'2026-01-10');
}

// --- Summary --------------------------------------------------------
const{failed}=summary();
process.exit(failed?1:0);
