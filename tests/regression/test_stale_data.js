#!/usr/bin/env node
/**
 * Timeline Studio -- Stale Data Regression Tests
 *
 * Validates that the engine correctly handles stale derived values (endDate,
 * _float) when settings or item properties change after initial computation.
 *
 * The original bug: a root task's endDate was computed under old settings
 * (e.g. before weekends were enabled) and never refreshed, causing
 * calculateFloat() to produce wrong float values. The fix added defensive
 * endDate freshening in calculateFloat(), runSchedule(), and broadened
 * _recalcNonWorkingDays() to recalc ALL tasks.
 *
 * These tests deliberately create stale state then verify the engine
 * produces correct results despite the stale input.
 */

const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U,App,resetApp,HOLIDAYS_MLK,HOLIDAYS_XMAS}=require('../helpers/mock-engine');
const{makeProj,makeItem,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ── Helpers ──────────────────────────────────────────────────────

// Initialize default proj so mkTask can call _calcEndDate
App.proj={version:2,schedulingMode:'manual',scheduleAroundNonWorking:true,
  holidays:[],items:[],showFloat:false};

function initProj(items,opts={}){
  App.proj={
    version:2,schedulingMode:opts.mode||'manual',
    scheduleAroundNonWorking:opts.schedAround!==false,
    holidays:opts.holidays||[],
    items:items,showFloat:false,
  };
  for(const it of items){
    if(it.type==='task')it.endDate=App._calcEndDate(it);
  }
  if(opts.mode==='scheduled')App.runSchedule();
}

function mkTask(id,name,start,dur,opts={}){
  const durMode=opts.durMode||'work';
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
//  SECTION 1: Stale Root Item endDate (The Original Bug)
// ===================================================================

section('T1: Root task with manually-set stale endDate');
{
  // A(5d work Mon Jan 5 → Fri Jan 9) → B(5d work)
  // Corrupt A.endDate to Jan 7 (2 days early).
  // calculateFloat() must freshen it back to Jan 9 and produce float=0.
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{schedAround:true});

  A.endDate='2026-01-07'; // STALE — correct is Jan 9
  App.calculateFloat();

  assert('T1: A.endDate freshened','2026-01-09',A.endDate);
  assert('T1: A float=0',0,A._float);
  assert('T1: B float=0',0,B._float);
}

section('T2: durMode changed cal→work without endDate refresh');
{
  // A(10d cal Mon Jan 5, endDate=Jan 14) → B(5d work)
  // Change A.durMode to 'work' but don't recalc endDate.
  // Work-mode 10d from Jan 5 = Jan 16 (skips Jan 10-11 weekend).
  const A=mkTask('a','Root','2026-01-05',10,{durMode:'cal'});
  const B=mkTask('b','Succ','2026-01-15',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{schedAround:true});

  assert('T2: A starts as cal endDate','2026-01-14',A.endDate);
  A.durMode='work'; // STALE — endDate still Jan 14, should be Jan 16
  App.calculateFloat();

  assert('T2: A.endDate freshened to work-mode','2026-01-16',A.endDate);
  assert('T2: A float=0',0,A._float);
  assert('T2: B float=0',0,B._float);
}

section('T3: Stale root in 4-item chain');
{
  // A→B→C→D, all 3d work. Corrupt A.endDate 2 days early.
  // All items should still have float=0 after calculateFloat freshens.
  const A=mkTask('a','T1','2026-01-05',3);           // Mon-Wed → Jan 7
  const B=mkTask('b','T2','2026-01-08',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','T3','2026-01-13',3,{deps:[{id:'b',type:'FS',lag:0}]});
  const D=mkTask('d','T4','2026-01-16',3,{deps:[{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{schedAround:true});

  A.endDate='2026-01-05'; // STALE — correct is Jan 7
  App.calculateFloat();

  assert('T3: A.endDate freshened','2026-01-07',A.endDate);
  assert('T3: A float=0',0,A._float);
  assert('T3: B float=0',0,B._float);
  assert('T3: C float=0',0,C._float);
  assert('T3: D float=0',0,D._float);
}

section('T4: schedAround toggled ON without endDate refresh');
{
  // A(7d work, schedAround=false → endDate=Jan 11 via cal path)
  // Toggle schedAround=true. 7 work days from Jan 5 = Jan 13 (skips weekend).
  // calculateFloat() must freshen endDate.
  const A=mkTask('a','Root','2026-01-05',7);
  const B=mkTask('b','Succ','2026-01-14',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{schedAround:false});

  assert('T4: A starts with cal endDate','2026-01-11',A.endDate);
  App.proj.scheduleAroundNonWorking=true; // STALE — endDate still Jan 11
  App.calculateFloat();

  assert('T4: A.endDate freshened to work-mode','2026-01-13',A.endDate);
  assert('T4: A float=0',0,A._float);
  assert('T4: B float=0',0,B._float);
}

// ===================================================================
//  SECTION 2: Settings Changes Mid-Lifecycle
// ===================================================================

section('T5: Toggle scheduleAroundNonWorking ON after items exist');
{
  // A(10d work) → B(5d work). schedAround=false → endDates use cal path.
  // Toggle ON → _recalcNonWorkingDays should shift endDates forward.
  const A=mkTask('a','Root','2026-01-05',10);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:false});

  const origAEnd=A.endDate; // Jan 14 (cal path)
  assert('T5: A cal endDate','2026-01-14',origAEnd);

  App.proj.scheduleAroundNonWorking=true;
  App._recalcNonWorkingDays();

  assertT('T5: A.endDate shifted forward',A.endDate>origAEnd);
  assert('T5: A.endDate now work-mode','2026-01-16',A.endDate);
  assertT('T5: B.startDate after A',B.startDate>=A.endDate);
}

section('T6: Toggle schedAround OFF then back ON — round-trip');
{
  const A=mkTask('a','Root','2026-01-05',10);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  const origAEnd=A.endDate, origBStart=B.startDate, origBEnd=B.endDate;

  App.proj.scheduleAroundNonWorking=false;
  App._recalcNonWorkingDays();
  assertNeq('T6: OFF — A.endDate changed',A.endDate,origAEnd);

  App.proj.scheduleAroundNonWorking=true;
  App._recalcNonWorkingDays();
  assert('T6: ON — A.endDate restored',origAEnd,A.endDate);
  assert('T6: ON — B.startDate restored',origBStart,B.startDate);
  assert('T6: ON — B.endDate restored',origBEnd,B.endDate);
}

section('T7: Add holiday mid-task-span extends endDate');
{
  // A starts Thu Jan 15, 5d work. Without holidays: end=Jan 21.
  // Add MLK Day (Jan 19) → end should shift to Jan 22.
  const A=mkTask('a','Spans MLK','2026-01-15',5);
  initProj([A],{schedAround:true,holidays:[]});
  assert('T7: no-holiday endDate','2026-01-21',A.endDate);

  App.proj.holidays=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
  App._recalcNonWorkingDays();

  assert('T7: endDate extended past holiday','2026-01-22',A.endDate);
}

section('T8: Remove holiday shrinks endDate back');
{
  const MLK=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
  const A=mkTask('a','Spans MLK','2026-01-15',5);
  initProj([A],{schedAround:true,holidays:MLK});
  assert('T8: with-holiday endDate','2026-01-22',A.endDate);

  App.proj.holidays=[];
  App._recalcNonWorkingDays();

  assert('T8: endDate shrunk back','2026-01-21',A.endDate);
}

section('T9: Toggle individual holiday schedAround flag');
{
  // Custom 2-day holiday Thu-Fri Jan 22-23. Task starts Mon Jan 19, 5d work.
  // With holiday: skips Jan 22-23 + weekend → end Jan 27.
  // Without (schedAround=false on holiday): end Jan 23.
  const HOL=[{name:'Custom',start:'2026-01-22',end:'2026-01-23',schedAround:true}];
  const A=mkTask('a','Spans Holiday','2026-01-19',5);
  initProj([A],{schedAround:true,holidays:HOL});
  const withHol=A.endDate;

  // Disable individual holiday
  App.proj.holidays[0].schedAround=false;
  App._recalcNonWorkingDays();
  const noHol=A.endDate;
  assertT('T9: OFF — endDate earlier',noHol<withHol);
  assert('T9: OFF — endDate ignores holiday','2026-01-23',noHol);

  // Re-enable
  App.proj.holidays[0].schedAround=true;
  App._recalcNonWorkingDays();
  assert('T9: ON — endDate restored',withHol,A.endDate);
}

// ===================================================================
//  SECTION 3: durMode Changes
// ===================================================================

section('T10: durMode cal→work extends endDate');
{
  // A: 14d cal from Mon Jan 5. Cal endDate = Jan 18 (Sun).
  // Switch to work: 14 work days = Jan 22 (Thu, skips 2 weekends).
  const A=mkTask('a','CalTask','2026-01-05',14,{durMode:'cal'});
  initProj([A],{schedAround:true});
  assert('T10: cal endDate','2026-01-18',A.endDate);

  A.durMode='work'; // STALE endDate
  App._recalcNonWorkingDays();

  assert('T10: work endDate','2026-01-22',A.endDate);
}

section('T11: durMode work→cal shrinks endDate');
{
  const A=mkTask('a','WorkTask','2026-01-05',14);
  initProj([A],{schedAround:true});
  assert('T11: work endDate','2026-01-22',A.endDate);

  A.durMode='cal';
  App._recalcNonWorkingDays();

  assert('T11: cal endDate','2026-01-18',A.endDate);
}

section('T12: Root durMode change in auto-scheduled chain cascades');
{
  // A(root 10d cal) → B(5d work) → C(3d work). Scheduled mode.
  // Change A.durMode to 'work'. runSchedule should freshen A, cascade B and C.
  const A=mkTask('a','Root','2026-01-05',10,{durMode:'cal'});
  const B=mkTask('b','Mid','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','End','2026-01-01',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:true});

  const origBStart=B.startDate, origCStart=C.startDate;

  A.durMode='work'; // STALE endDate — cal Jan 14 → should be work Jan 16
  App.runSchedule();

  assert('T12: A.endDate freshened','2026-01-16',A.endDate);
  assertT('T12: B shifted later',B.startDate>origBStart);
  assertT('T12: C shifted later',C.startDate>origCStart);
}

section('T13: Mixed durMode chain — float correct');
{
  // A(10d cal) → B(10d work). Single chain, both should be float=0.
  const A=mkTask('a','CalRoot','2026-01-05',10,{durMode:'cal'});
  const B=mkTask('b','WorkSucc','2026-01-15',10,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{schedAround:true});

  App.calculateFloat();

  assert('T13: A float=0',0,A._float);
  assert('T13: B float=0',0,B._float);
  assert('T13: A cal endDate','2026-01-14',A.endDate);
}

// ===================================================================
//  SECTION 4: Scheduling Mode Transitions
// ===================================================================

section('T14: Manual→scheduled with corrupt endDate');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'manual',schedAround:true});

  A.endDate='2026-01-07'; // STALE
  App.proj.schedulingMode='scheduled';
  App.runSchedule();

  assert('T14: A.endDate freshened','2026-01-09',A.endDate);
  assert('T14: B positioned after A','2026-01-12',B.startDate);
  assertT('T14: no overlap',B.startDate>A.endDate);
}

section('T15: Scheduled→manual preserves dates and float');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Mid','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','End','2026-01-01',5,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:true});

  const posA=A.startDate, posB=B.startDate, posC=C.startDate;

  App.proj.schedulingMode='manual';
  App.calculateFloat();

  assert('T15: A.startDate preserved',posA,A.startDate);
  assert('T15: B.startDate preserved',posB,B.startDate);
  assert('T15: C.startDate preserved',posC,C.startDate);
  assert('T15: all float=0',0,A._float);
}

section('T16: Toggle scheduled↔manual round-trip — no drift');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  const origAStart=A.startDate, origBStart=B.startDate, origBEnd=B.endDate;

  App.proj.schedulingMode='manual';
  App.proj.schedulingMode='scheduled';
  App.runSchedule();

  assert('T16: A.startDate stable',origAStart,A.startDate);
  assert('T16: B.startDate stable',origBStart,B.startDate);
  assert('T16: B.endDate stable',origBEnd,B.endDate);
}

// ===================================================================
//  SECTION 5: Dependency Changes in Auto-Scheduled Mode
// ===================================================================

section('T17: Change dep type FS→SS repositions successor');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  assertT('T17: B starts after A (FS)',B.startDate>A.endDate);

  B.deps[0].type='SS';
  App.runSchedule();

  assert('T17: B.startDate = A.startDate (SS)',A.startDate,B.startDate);
}

section('T18: Change dep type SS→FF repositions successor');
{
  // A(5d) → B(3d, SS). After schedule B starts with A.
  // Change to FF → B should end with A.
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-01',3,{deps:[{id:'a',type:'SS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  assert('T18: SS — B starts with A',A.startDate,B.startDate);

  B.deps[0].type='FF';
  App.runSchedule();

  // FF: B's end should align with A's end. B is 3d, A ends Jan 9.
  assert('T18: FF — B.endDate = A.endDate',A.endDate,B.endDate);
  assertT('T18: FF — B starts after A starts',B.startDate>=A.startDate);
}

section('T19: Add dep to independent task moves it');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Independent','2026-01-05',5);
  initProj([A,B],{mode:'scheduled',schedAround:true});

  assert('T19: B starts same as A initially','2026-01-05',B.startDate);

  B.deps=[{id:'a',type:'FS',lag:0}];
  App.runSchedule();

  assertT('T19: B moved after A',B.startDate>A.endDate);
}

section('T20: Remove dep — item stays in place');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  const bPos=B.startDate;
  B.deps=[];
  App.runSchedule();

  assert('T20: B stays in place',bPos,B.startDate);
}

section('T21: Change lag shifts dependent');
{
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Succ','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true});

  const origBStart=B.startDate;
  B.deps[0].lag=3;
  App.runSchedule();

  assertT('T21: B shifted forward',B.startDate>origBStart);
}

// ===================================================================
//  SECTION 6: Holiday Edge Cases with Scheduling
// ===================================================================

section('T22: Holiday on predecessor endDate');
{
  // A ends on what would be MLK Day (Jan 19). Work mode skips it.
  // A: start Tue Jan 13, 5d work. Without holiday: end Jan 19. With: end Jan 20.
  const MLK=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
  const A=mkTask('a','PreHoliday','2026-01-13',5);
  const B=mkTask('b','PostHoliday','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true,holidays:MLK});

  assert('T22: A.endDate skips MLK','2026-01-20',A.endDate);
  assertT('T22: B starts after A',B.startDate>A.endDate);
}

section('T23: Successor would start on holiday — skips it');
{
  // A ends Fri Jan 16. depEnd=Sat Jan 17 → skipNonWorking → Mon Jan 19 (MLK) → Tue Jan 20.
  const MLK=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
  const A=mkTask('a','EndsFri','2026-01-12',5);
  const B=mkTask('b','StartsAfterMLK','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true,holidays:MLK});

  assert('T23: A ends Fri','2026-01-16',A.endDate);
  assert('T23: B skips weekend+MLK','2026-01-20',B.startDate);
}

section('T24: Consecutive holidays (Thu-Fri) + weekend');
{
  // Custom holidays Thu Jan 22 + Fri Jan 23. A ends Wed Jan 21.
  // B's depEnd=Jan 22 (Thu=holiday) → skip Thu, Fri (holiday), Sat, Sun → Mon Jan 26.
  const HOL=[{name:'Custom',start:'2026-01-22',end:'2026-01-23',schedAround:true}];
  const A=mkTask('a','BeforeHols','2026-01-19',3);
  const B=mkTask('b','AfterHols','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B],{mode:'scheduled',schedAround:true,holidays:HOL});

  assert('T24: A ends Wed','2026-01-21',A.endDate);
  assert('T24: B skips hols+weekend','2026-01-26',B.startDate);
}

section('T25: Holiday with schedAround=false treated as working day');
{
  // MLK Day exists but schedAround=false → treated as working day.
  // 5d work from Thu Jan 15: 15(1) 16(2) skip wknd 19(3) 20(4) 21(5) = Jan 21.
  // Same as no holiday at all.
  const MLK_OFF=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:false}];
  const A=mkTask('a','SpansMLK','2026-01-15',5);
  initProj([A],{schedAround:true,holidays:MLK_OFF});

  assert('T25: holiday ignored, same as no-holiday','2026-01-21',A.endDate);

  // Now enable it
  App.proj.holidays[0].schedAround=true;
  App._recalcNonWorkingDays();
  assert('T25: enabled — endDate shifts','2026-01-22',A.endDate);
}

// ===================================================================
//  SECTION 7: Propagation and Chain Updates
// ===================================================================

section('T26: propagateFrom after root duration change');
{
  // A(5d)→B(5d)→C(5d). Change A.duration=10, recalc A.endDate, propagate.
  // B and C should cascade downstream.
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Mid','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','End','2026-01-19',5,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{schedAround:true});

  const origBStart=B.startDate, origCStart=C.startDate;
  A.duration=10;
  A.endDate=App._calcEndDate(A); // Simulate UI handler recalc
  App.propagateFrom(['a']);

  assertT('T26: B moved later',B.startDate>origBStart);
  assertT('T26: C moved later',C.startDate>origCStart);
  assert('T26: A.endDate correct for 10d','2026-01-16',A.endDate);
}

section('T27: propagateFrom with mixed SS/FS deps');
{
  // A(5d)→B(SS, 5d)→C(FS, 5d). Change A.duration=10.
  // B start unchanged (SS only cares about start). C unchanged (B didn't move).
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','SS-Succ','2026-01-05',5,{deps:[{id:'a',type:'SS',lag:0}]});
  const C=mkTask('c','FS-End','2026-01-12',5,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{schedAround:true});

  A.duration=10;
  A.endDate=App._calcEndDate(A);
  App.propagateFrom(['a']);

  assert('T27: B.startDate unchanged (SS)','2026-01-05',B.startDate);
  assert('T27: C.startDate unchanged','2026-01-12',C.startDate);
  assert('T27: A.endDate extended','2026-01-16',A.endDate);
}

section('T28: propagateFrom from middle item — upstream unchanged');
{
  // A(5d)→B(5d)→C(5d). Change B.duration=10, recalc, propagate from B.
  // A unchanged. C shifts.
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','Mid','2026-01-12',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','End','2026-01-19',5,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{schedAround:true});

  const origAStart=A.startDate, origAEnd=A.endDate, origCStart=C.startDate;
  B.duration=10;
  B.endDate=App._calcEndDate(B);
  App.propagateFrom(['b']);

  assert('T28: A.startDate unchanged',origAStart,A.startDate);
  assert('T28: A.endDate unchanged',origAEnd,A.endDate);
  assertT('T28: C shifted later',C.startDate>origCStart);
}

// ===================================================================
//  SECTION 8: Critical Path Through Settings Changes
// ===================================================================

section('T29: Add holiday — single chain stays critical');
{
  // A→B→C near MLK Day. No holidays initially → all critical.
  // Add MLK → endDates shift but chain remains single → all still critical.
  const A=mkTask('a','Start','2026-01-13',5);
  const B=mkTask('b','Mid','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','End','2026-01-01',3,{deps:[{id:'b',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:true,holidays:[]});

  App.calculateFloat();
  assert('T29: pre-holiday A float=0',0,A._float);

  const origAEnd=A.endDate;
  App.proj.holidays=[{name:'MLK Day',start:'2026-01-19',end:'2026-01-19',schedAround:true}];
  App._recalcNonWorkingDays();
  App.calculateFloat();
  const cp=App.getCriticalPath();

  assertT('T29: A.endDate shifted',A.endDate!==origAEnd);
  assertT('T29: A still critical',cp&&cp.has('a'));
  assertT('T29: B still critical',cp&&cp.has('b'));
  assertT('T29: C still critical',cp&&cp.has('c'));
}

section('T30: Change dep type shifts critical path');
{
  // A(5d)→B(5d FS) + A→C(3d FS). B is longer path → {A,B} critical.
  // Change B dep to SS → B starts with A, finishes sooner → {A,C} becomes critical.
  const A=mkTask('a','Root','2026-01-05',5);
  const B=mkTask('b','LongPath','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','ShortPath','2026-01-01',3,{deps:[{id:'a',type:'FS',lag:0}]});
  initProj([A,B,C],{mode:'scheduled',schedAround:true});

  App.calculateFloat();
  assert('T30: initially B float=0',0,B._float);
  assertT('T30: initially C has slack',C._float>0);

  B.deps[0].type='SS';
  App.runSchedule();
  App.calculateFloat();

  assertT('T30: now B has slack',B._float>0);
  assert('T30: now C float=0',0,C._float);
  const cp=App.getCriticalPath();
  assertT('T30: A on CP',cp&&cp.has('a'));
  assertT('T30: C on CP',cp&&cp.has('c'));
  assertT('T30: B off CP',cp&&!cp.has('b'));
}

section('T31: Diamond — stale duration shifts critical path');
{
  // Diamond: A→B(10d)→D, A→C(5d)→D. B longer → {A,B,D} critical.
  // Change B.duration=3 WITHOUT recalc. calculateFloat freshens B.endDate.
  // C(5d) now longer path → {A,C,D} becomes critical.
  const A=mkTask('a','Start','2026-01-05',5);
  const B=mkTask('b','LongBranch','2026-01-01',10,{deps:[{id:'a',type:'FS',lag:0}]});
  const C=mkTask('c','ShortBranch','2026-01-01',5,{deps:[{id:'a',type:'FS',lag:0}]});
  const D=mkTask('d','End','2026-01-01',3,
    {deps:[{id:'b',type:'FS',lag:0},{id:'c',type:'FS',lag:0}]});
  initProj([A,B,C,D],{mode:'scheduled',schedAround:true});

  App.calculateFloat();
  assert('T31: initially B float=0',0,B._float);
  assertT('T31: initially C has slack',C._float>0);

  B.duration=3; // STALE endDate — still has 10d endDate
  App.calculateFloat(); // Must freshen B.endDate

  assertT('T31: B now has slack',B._float>0);
  assert('T31: C now float=0',0,C._float);
  assert('T31: D float=0',0,D._float);
  const cp=App.getCriticalPath();
  assertT('T31: CP = {A,C,D}',cp&&cp.has('a')&&cp.has('c')&&cp.has('d')&&!cp.has('b'));
}

// ─── Summary ────────────────────────────────────────────────────
const{failed}=summary();
process.exit(failed?1:0);
