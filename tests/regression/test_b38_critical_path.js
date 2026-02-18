#!/usr/bin/env node
/**
 * Timeline Studio -- B38 Regression Tests
 * Critical path float calculation through milestones with working-day scheduling.
 *
 * Bug: _addLagWorkingDays normalizes non-working start dates (e.g. Saturday → Monday)
 * in the positive direction but has no equivalent normalization for negative lag.
 * This makes the backward pass non-symmetric with the forward pass, producing
 * spurious float when _depEnd(milestone) falls on a weekend or holiday.
 *
 * Fix: Anchor backward FS/FF constraints to _depEnd(pred) and replay the forward
 * arithmetic: LF(pred) = _depEnd(pred) + U.days(fwdContrib, sls).
 */

const{assert,assertT,assertF,assertGte,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
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
  // Recalculate endDates for all tasks (holidays may differ from mkTask defaults)
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
//  1. Milestone on Friday (depEnd=Saturday) with FS+lag — core bug
// ===================================================================
section('B38-1: Milestone on Friday, depEnd=Saturday, FS+5 work lag');
{
  // A(4wd Mon→Thu) → M → B(3wd, FS+5)
  // A ends Thu → _depEnd(A)=Fri → M scheduled Fri → _depEnd(M)=Sat(non-working).
  // Forward: _addLagWD(Sat,5,work) normalizes Sat→Mon then counts 5.
  // BUG: backward can't invert the normalization → spurious float.
  // Use early dates for M and B so runSchedule pushes them to earliest.
  const A=mkTask('a','TaskA','2026-07-06',4);         // Mon Jul-06 → Thu Jul-09
  const M=mkMilestone('m','MilestoneM','2026-01-01',  // early; schedule pushes to Fri Jul-10
    {deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','TaskB','2026-01-01',3,          // early; schedule pushes forward
    {deps:[{id:'m',type:'FS',lag:5}]});
  initProj([A,M,B],{mode:'scheduled'});
  App.calculateFloat();

  assert('B38-1: TaskA float=0',A._float,0);
  assert('B38-1: MilestoneM float=0',M._float,0);
  assert('B38-1: TaskB float=0',B._float,0);
  const cp=App.getCriticalPath();
  assertT('B38-1: TaskA on critical path',cp&&cp.has('a'));
  assertT('B38-1: MilestoneM on critical path',cp&&cp.has('m'));
  assertT('B38-1: TaskB on critical path',cp&&cp.has('b'));
}

// ===================================================================
//  2. Showcase-style chain through multiple milestones with holidays
// ===================================================================
section('B38-2: Showcase chain — staging → proddeploy → launch → postlaunch');
{
  // Reproduces the Showcase project's critical chain tail-end.
  // Use early dates so schedule pushes all to earliest.
  const HOLIDAYS=[{start:'2026-07-03',end:'2026-07-03',name:'Independence Day',schedAround:true}];

  const staging=mkTask('t_staging','Staging Deploy','2026-07-02',5);
  const proddeploy=mkMilestone('m_proddeploy','Production Deploy','2026-01-01',
    {deps:[{id:'t_staging',type:'FS',lag:0}]});
  const launch=mkMilestone('m_launch','Launch Day','2026-01-01',
    {deps:[{id:'m_proddeploy',type:'FS',lag:5}]});
  const postlaunch=mkMilestone('m_postlaunch','Post-Launch Review','2026-01-01',
    {deps:[{id:'m_launch',type:'FS',lag:10}]});

  initProj([staging,proddeploy,launch,postlaunch],{mode:'scheduled',holidays:HOLIDAYS});
  App.calculateFloat();

  assert('B38-2: staging float=0',staging._float,0);
  assert('B38-2: proddeploy float=0',proddeploy._float,0);
  assert('B38-2: launch float=0',launch._float,0);
  assert('B38-2: postlaunch float=0',postlaunch._float,0);
  const cp=App.getCriticalPath();
  assertT('B38-2: all 4 items critical',cp&&cp.size>=4);
  assertT('B38-2: staging on CP',cp&&cp.has('t_staging'));
  assertT('B38-2: proddeploy on CP',cp&&cp.has('m_proddeploy'));
  assertT('B38-2: launch on CP',cp&&cp.has('m_launch'));
  assertT('B38-2: postlaunch on CP',cp&&cp.has('m_postlaunch'));
}

// ===================================================================
//  3. Diamond with milestone — genuine slack preserved
// ===================================================================
section('B38-3: Diamond with milestone — non-critical path has positive float');
{
  // Short: A(5wd) → M (FS+0). Long: Z(10wd) → M (FS+0). M → C(3wd, FS+0).
  // A shorter, so A has genuine positive float; Z, M, C should be critical.
  const A=mkTask('a','ShortTask','2026-01-05',5);
  const Z=mkTask('z','LongTask','2026-01-05',10);
  const M=mkMilestone('m','Merge Milestone','2026-01-01',
    {deps:[{id:'a',type:'FS',lag:0},{id:'z',type:'FS',lag:0}]});
  const C=mkTask('c','AfterMerge','2026-01-01',3,
    {deps:[{id:'m',type:'FS',lag:0}]});

  initProj([A,Z,M,C],{mode:'scheduled'});
  App.calculateFloat();

  assertT('B38-3: ShortTask has positive float',A._float>0);
  assert('B38-3: LongTask float=0',Z._float,0);
  assert('B38-3: Merge Milestone float=0',M._float,0);
  assert('B38-3: AfterMerge float=0',C._float,0);
  const cp=App.getCriticalPath();
  assertT('B38-3: ShortTask NOT critical',cp&&!cp.has('a'));
  assertT('B38-3: LongTask critical',cp&&cp.has('z'));
  assertT('B38-3: Merge Milestone critical',cp&&cp.has('m'));
}

// ===================================================================
//  4. Calendar-mode chain — unaffected by fix
// ===================================================================
section('B38-4: Calendar-mode chain (no working day scheduling)');
{
  const A=mkTask('a','CalA','2026-01-05',5,{durMode:'cal'});
  const M=mkMilestone('m','CalM','2026-01-01',
    {deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','CalB','2026-01-01',3,{durMode:'cal',
    deps:[{id:'m',type:'FS',lag:3}]});

  initProj([A,M,B],{mode:'scheduled',schedAround:false});
  App.calculateFloat();

  assert('B38-4: CalA float=0',A._float,0);
  assert('B38-4: CalM float=0',M._float,0);
  assert('B38-4: CalB float=0',B._float,0);
}

// ===================================================================
//  5. Milestone on Thursday (depEnd=Fri, working day) — no bug
// ===================================================================
section('B38-5: Milestone on Thursday (depEnd=Friday, working day)');
{
  // A(3wd) → M(Thu) → B(3wd, FS+5). depEnd=Fri, a working day, so no normalize.
  const A=mkTask('a','TaskA','2026-01-05',3);           // Mon Jan-05 → Wed Jan-07
  const M=mkMilestone('m','MilestoneM','2026-01-01',    // schedule pushes to Thu Jan-08
    {deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','TaskB','2026-01-01',3,
    {deps:[{id:'m',type:'FS',lag:5}]});

  initProj([A,M,B],{mode:'scheduled'});
  App.calculateFloat();

  assert('B38-5: TaskA float=0',A._float,0);
  assert('B38-5: MilestoneM float=0',M._float,0);
  assert('B38-5: TaskB float=0',B._float,0);
}

// ===================================================================
//  6. FS+0 through Friday milestone (lag=0 short-circuits)
// ===================================================================
section('B38-6: FS+0 through Friday milestone');
{
  // With lag=0, _addLagWD short-circuits to U.addDays(date,0). No normalization.
  // But _depEnd(M) = Sat. The successor's _skipNonWorking moves it to Mon.
  // In backward pass, this can still cause a mismatch.
  const A=mkTask('a','TaskA','2026-07-06',4);         // Mon Jul-06 → Thu Jul-09
  const M=mkMilestone('m','FriMilestone','2026-01-01',// schedule → Fri Jul-10
    {deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','TaskB','2026-01-01',5,          // schedule pushes forward
    {deps:[{id:'m',type:'FS',lag:0}]});

  initProj([A,M,B],{mode:'scheduled'});
  App.calculateFloat();

  assert('B38-6: TaskA float=0',A._float,0);
  assert('B38-6: FriMilestone float=0',M._float,0);
  assert('B38-6: TaskB float=0',B._float,0);
}

// ===================================================================
//  7. Milestone depEnd on holiday
// ===================================================================
section('B38-7: Milestone depEnd on holiday');
{
  // MLK Day = Mon Jan-19. Milestone on Fri Jan-16 → depEnd=Sat Jan-17.
  // Normalization: Sat→Mon(holiday)→Tue Jan-20.
  const HOLIDAYS=[{start:'2026-01-19',end:'2026-01-19',name:'MLK Day',schedAround:true}];

  const A=mkTask('a','TaskA','2026-01-12',4);            // Mon Jan-12 → Thu Jan-15
  const M=mkMilestone('m','MilestoneM','2026-01-01',     // schedule → Fri Jan-16
    {deps:[{id:'a',type:'FS',lag:0}]});
  const B=mkTask('b','TaskB','2026-01-01',3,
    {deps:[{id:'m',type:'FS',lag:3}]});

  initProj([A,M,B],{mode:'scheduled',holidays:HOLIDAYS});
  App.calculateFloat();

  assert('B38-7: TaskA float=0',A._float,0);
  assert('B38-7: MilestoneM float=0',M._float,0);
  assert('B38-7: TaskB float=0',B._float,0);
}

// ===================================================================
//  8. Chain with multiple milestones
// ===================================================================
section('B38-8: Chain with multiple milestones and lag');
{
  // T1(4wd) → M1 → T2(5wd, FS+3) → M2 → T3(3wd, FS+2)
  const T1=mkTask('t1','Task1','2026-01-05',4);          // Mon Jan-05 → Thu Jan-08
  const M1=mkMilestone('m1','Mile1','2026-01-01',
    {deps:[{id:'t1',type:'FS',lag:0}]});
  const T2=mkTask('t2','Task2','2026-01-01',5,
    {deps:[{id:'m1',type:'FS',lag:3}]});
  const M2=mkMilestone('m2','Mile2','2026-01-01',
    {deps:[{id:'t2',type:'FS',lag:0}]});
  const T3=mkTask('t3','Task3','2026-01-01',3,
    {deps:[{id:'m2',type:'FS',lag:2}]});

  initProj([T1,M1,T2,M2,T3],{mode:'scheduled'});
  App.calculateFloat();

  assert('B38-8: Task1 float=0',T1._float,0);
  assert('B38-8: Mile1 float=0',M1._float,0);
  assert('B38-8: Task2 float=0',T2._float,0);
  assert('B38-8: Mile2 float=0',M2._float,0);
  assert('B38-8: Task3 float=0',T3._float,0);
  const cp=App.getCriticalPath();
  assertT('B38-8: all 5 on CP',cp&&cp.size>=5);
}

// ===================================================================
//  9. Parallel branches converging through milestones
// ===================================================================
section('B38-9: Parallel branches converging through milestone');
{
  // Branch 1: T_long(15wd) → M_merge (FS+0)
  // Branch 2: T_short(3wd) → T_mid(5wd, FS+5) → M_merge (FS+0)
  // M_merge → T_final(3wd)
  // Branch 1 is longer → critical. Branch 2 has slack.
  const T_long=mkTask('tl','LongTask','2026-01-05',15);
  const T_short=mkTask('ts','ShortTask','2026-01-05',3);
  const T_mid=mkTask('tm','MidTask','2026-01-01',5,
    {deps:[{id:'ts',type:'FS',lag:5}]});
  const M_merge=mkMilestone('mg','MergeMilestone','2026-01-01',
    {deps:[{id:'tl',type:'FS',lag:0},{id:'tm',type:'FS',lag:0}]});
  const T_final=mkTask('tf','FinalTask','2026-01-01',3,
    {deps:[{id:'mg',type:'FS',lag:0}]});

  initProj([T_long,T_short,T_mid,M_merge,T_final],{mode:'scheduled'});
  App.calculateFloat();

  assert('B38-9: LongTask float=0',T_long._float,0);
  assert('B38-9: MergeMilestone float=0',M_merge._float,0);
  assert('B38-9: FinalTask float=0',T_final._float,0);
  assertT('B38-9: ShortTask has slack',T_short._float>0);
  assertT('B38-9: MidTask has slack',T_mid._float>0);
  assertT('B38-9: no negative floats',
    [T_long,T_short,T_mid,M_merge,T_final].every(i=>i._float>=0));
}

// ─── Summary ────────────────────────────────────────────────────
const{failed}=summary();
process.exit(failed?1:0);
