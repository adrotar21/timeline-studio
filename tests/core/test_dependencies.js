#!/usr/bin/env node
/**
 * Timeline Studio — Dependency Type Tests
 * Covers FS/SS/FF link types, lag, violations, float, topo sort, cycle detection.
 * Extracted from test_expanded.js dependency sections.
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,section,summary}=require('../helpers/assert');
const{U,App,resetApp,HOLIDAYS_MLK}=require('../helpers/mock-engine');
const{makeProj,makeItem,addDep,addItems,resetItemCounter}=require('../helpers/builders');

function initProj(items,opts={}){
  const p=makeProj({
    schedulingMode:opts.schedulingMode||'manual',
    scheduleAroundNonWorking:opts.scheduleAroundNonWorking||false,
    holidays:opts.holidays||[],
    items:items,
  });
  resetApp(p);
  return p;
}

// ═══════════════════════════════════════════════════════════════
section('FS Dependency Variations');
{
  resetItemCounter();
  // FS lag=0, lag=1, lag=5, lag=-1, lag=-3
  const lags=[0,1,5,-1,-3];
  for(const lag of lags){
    const A=makeItem('task',{id:'A'+lag,startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
    const B=makeItem('task',{id:'B'+lag,startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
    addDep(B,'A'+lag,'FS',lag);
    initProj([A,B]);
    const es=App.calcEarlyStart(App.gi('B'+lag));
    const expected=U.addDays('2026-02-07',lag); // depEnd=Feb07
    assert(`FS lag=${lag}: B early start`,es,expected);
  }
}

section('SS Dependency Variations');
{
  resetItemCounter();
  const lags=[0,1,3,-1];
  for(const lag of lags){
    const A=makeItem('task',{id:'SA'+lag,startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
    const B=makeItem('task',{id:'SB'+lag,startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
    addDep(B,'SA'+lag,'SS',lag);
    initProj([A,B]);
    const es=App.calcEarlyStart(App.gi('SB'+lag));
    const expected=U.addDays('2026-02-02',lag);
    assert(`SS lag=${lag}: B early start`,es,expected);
  }
}

section('FF Dependency Variations');
{
  resetItemCounter();
  // FF: B end >= A end + lag. B start = (A depEnd + lag) - B duration
  const A=makeItem('task',{id:'FA',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const B=makeItem('task',{id:'FB',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  addDep(B,'FA','FF',0);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('FB'));
  // A depEnd=Feb07, lag=0, B dur=3. B start = Feb07 - 3 = Feb04
  assert('FF lag=0: B start',es,'2026-02-04');

  // FF with lag=2
  const A2=makeItem('task',{id:'FA2',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const B2=makeItem('task',{id:'FB2',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  addDep(B2,'FA2','FF',2);
  initProj([A2,B2]);
  const es2=App.calcEarlyStart(App.gi('FB2'));
  // A depEnd=Feb07, lag=2 → Feb09, B dur=3 → B start = Feb09-3 = Feb06
  assert('FF lag=2: B start',es2,'2026-02-06');
}

section('SF Dependency Variations');
{
  resetItemCounter();
  const A=makeItem('task',{id:'SFA',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const B=makeItem('task',{id:'SFB',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  addDep(B,'SFA','SF',0);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('SFB'));
  // SF: B depEnd >= A start. A start=Feb02, B dur=3 => B start=Jan30
  assert('SF lag=0: B start',es,'2026-01-30');

  const A2=makeItem('task',{id:'SFA2',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const B2=makeItem('task',{id:'SFB2',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  addDep(B2,'SFA2','SF',2);
  initProj([A2,B2]);
  const es2=App.calcEarlyStart(App.gi('SFB2'));
  // A start+2 => Feb04 required depEnd, B dur=3 => Feb01
  assert('SF lag=2: B start',es2,'2026-02-01');

  const A3=makeItem('task',{id:'SFA3',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const B3=makeItem('task',{id:'SFB3',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  addDep(B3,'SFA3','SF',-1);
  initProj([A3,B3]);
  const es3=App.calcEarlyStart(App.gi('SFB3'));
  // A start-1 => Feb01 required depEnd, B dur=3 => Jan29
  assert('SF lag=-1: B start',es3,'2026-01-29');
}

section('SF with Working-Day Successor');
{
  resetItemCounter();
  const A=makeItem('task',{id:'SFW_A',startDate:'2026-01-09',duration:2,endDate:'2026-01-10',durMode:'cal'});
  const B=makeItem('task',{id:'SFW_B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22',durMode:'work'});
  addDep(B,'SFW_A','SF',0);
  initProj([A,B],{scheduleAroundNonWorking:true});
  const es=App.calcEarlyStart(App.gi('SFW_B'));
  // Required depEnd=pred start (Fri Jan09). 3 working days ending Jan09 => Tue Jan06
  assert('SF work-mode successor start',es,'2026-01-06');
}

section('SF Milestone Combinations');
{
  resetItemCounter();
  const M=makeItem('milestone',{id:'SFM_M',date:'2026-02-10'});
  const T=makeItem('task',{id:'SFM_T',startDate:'2026-02-20',duration:2,endDate:'2026-02-21'});
  addDep(T,'SFM_M','SF',0);
  initProj([M,T]);
  // SF: successor depEnd >= predecessor start(date). 2d task => start two days earlier.
  assert('SF milestone->task',App.calcEarlyStart(App.gi('SFM_T')),'2026-02-08');

  const A=makeItem('task',{id:'SFM_A',startDate:'2026-02-10',duration:3,endDate:'2026-02-12'});
  const M2=makeItem('milestone',{id:'SFM_M2',date:'2026-02-20'});
  addDep(M2,'SFM_A','SF',0);
  initProj([A,M2]);
  // Milestone depEnd = date+1, so SF allows milestone date at pred start-1.
  assert('SF task->milestone',App.calcEarlyStart(App.gi('SFM_M2')),'2026-02-09');
}

section('Milestone as Predecessor');
{
  resetItemCounter();
  // FS
  const M=makeItem('milestone',{id:'MP',date:'2026-02-10'});
  const T=makeItem('task',{id:'TP',startDate:'2026-02-15',duration:3,endDate:'2026-02-17'});
  addDep(T,'MP','FS',0);
  initProj([M,T]);
  assert('MS→Task FS',App.calcEarlyStart(App.gi('TP')),'2026-02-11');

  // SS
  const M2=makeItem('milestone',{id:'MP2',date:'2026-02-10'});
  const T2=makeItem('task',{id:'TP2',startDate:'2026-02-15',duration:3,endDate:'2026-02-17'});
  addDep(T2,'MP2','SS',0);
  initProj([M2,T2]);
  assert('MS→Task SS',App.calcEarlyStart(App.gi('TP2')),'2026-02-10');

  // MS→MS
  const M3=makeItem('milestone',{id:'MP3',date:'2026-02-10'});
  const M4=makeItem('milestone',{id:'MP4',date:'2026-02-15'});
  addDep(M4,'MP3','FS',0);
  initProj([M3,M4]);
  assert('MS→MS FS',App.calcEarlyStart(App.gi('MP4')),'2026-02-11');

  // Task→MS
  const T3=makeItem('task',{id:'TP3',startDate:'2026-02-02',duration:5,endDate:'2026-02-06'});
  const M5=makeItem('milestone',{id:'MP5',date:'2026-02-15'});
  addDep(M5,'TP3','FS',0);
  initProj([T3,M5]);
  assert('Task→MS FS',App.calcEarlyStart(App.gi('MP5')),'2026-02-07');
}

section('Working Day FS Dependencies');
{
  resetItemCounter();
  // Task A ends Friday, B should start Monday (working day)
  const A=makeItem('task',{id:'WA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09',durMode:'work'});
  const B=makeItem('task',{id:'WB',startDate:'2026-01-15',duration:3,endDate:'2026-01-17',durMode:'work'});
  addDep(B,'WA','FS',0);
  initProj([A,B],{scheduleAroundNonWorking:true});
  const es=App.calcEarlyStart(App.gi('WB'));
  // A endDate=Jan09 (Fri), depEnd=Jan10 (Sat) → skip to Mon Jan12
  assert('Work FS: B skips weekend','2026-01-12',es);
}

section('Working Day with Holiday');
{
  resetItemCounter();
  const hols=[{name:'TestHol',start:'2026-01-12',end:'2026-01-12',schedAround:true}];
  const A=makeItem('task',{id:'HA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09',durMode:'work'});
  const B=makeItem('task',{id:'HB',startDate:'2026-01-15',duration:3,endDate:'2026-01-17',durMode:'work'});
  addDep(B,'HA','FS',0);
  initProj([A,B],{scheduleAroundNonWorking:true,holidays:hols});
  const es=App.calcEarlyStart(App.gi('HB'));
  // Jan10=Sat, Jan11=Sun, Jan12=Holiday → next working = Jan13
  assert('Work FS with holiday: B skips to Tue','2026-01-13',es);
}

section('Mixed durMode Chains');
{
  resetItemCounter();
  // A(cal) → B(work): A ends Jan09 (Fri), depEnd=Jan10, B work mode → skip to Mon
  const A=makeItem('task',{id:'MA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09',durMode:'cal'});
  const B=makeItem('task',{id:'MB',startDate:'2026-01-12',duration:3,endDate:'2026-01-14',durMode:'work'});
  addDep(B,'MA','FS',0);
  initProj([A,B],{scheduleAroundNonWorking:true});
  const es=App.calcEarlyStart(App.gi('MB'));
  assert('Cal→Work FS: B starts Mon','2026-01-12',es);
}

section('FS Violation Detection — All Types');
{
  resetItemCounter();
  // FS violated
  const A=makeItem('task',{id:'VA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'VB',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  addDep(B,'VA','FS',0);
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('FS violated: B starts early',v.has('VB'));

  // SS violated
  const C=makeItem('task',{id:'VC',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const D=makeItem('task',{id:'VD',startDate:'2026-01-04',duration:3,endDate:'2026-01-06'});
  addDep(D,'VC','SS',0);
  initProj([C,D]);
  const v2=App.getViolatedDepIds();
  assertT('SS violated: D starts before C',v2.has('VD'));

  // SS not violated
  const E=makeItem('task',{id:'VE',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const F=makeItem('task',{id:'VF',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  addDep(F,'VE','SS',0);
  initProj([E,F]);
  const v3=App.getViolatedDepIds();
  assertF('SS not violated when same start',v3.has('VF'));
}

section('FF Violation Detection');
{
  resetItemCounter();
  // FF violated: B ends before A ends
  const A=makeItem('task',{id:'FVA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'FVB',startDate:'2026-01-05',duration:2,endDate:'2026-01-06'});
  addDep(B,'FVA','FF',0);
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  // B depEnd=Jan07, A depEnd=Jan10. FF requires B end >= A end → Jan07 < Jan10 → violated
  assertT('FF violated: B ends before A',v.has('FVB'));

  // FF not violated
  const C=makeItem('task',{id:'FVC',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const D=makeItem('task',{id:'FVD',startDate:'2026-01-07',duration:3,endDate:'2026-01-09'});
  addDep(D,'FVC','FF',0);
  initProj([C,D]);
  const v2=App.getViolatedDepIds();
  // D depEnd=Jan10, C depEnd=Jan10 → D end >= C end → not violated
  assertF('FF not violated when ends match',v2.has('FVD'));
}

section('SF Violation Detection');
{
  resetItemCounter();
  const A=makeItem('task',{id:'SFV_A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'SFV_B',startDate:'2026-01-01',duration:3,endDate:'2026-01-03'});
  addDep(B,'SFV_A','SF',0);
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assertT('SF violated: B ends before A starts',v.has('SFV_B'));

  const C=makeItem('task',{id:'SFV_C',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const D=makeItem('task',{id:'SFV_D',startDate:'2026-01-02',duration:3,endDate:'2026-01-04'});
  addDep(D,'SFV_C','SF',0);
  initProj([C,D]);
  const v2=App.getViolatedDepIds();
  assertF('SF not violated when successor depEnd matches pred start',v2.has('SFV_D'));
}

section('Scheduled Mode — Chain Propagation');
{
  resetItemCounter();
  const A=makeItem('task',{id:'SA',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'SB',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const C=makeItem('task',{id:'SC',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  addDep(B,'SA','FS',0);addDep(C,'SB','FS',0);
  initProj([A,B,C],{schedulingMode:'scheduled'});
  App.runSchedule();
  assert('Chain: B after A','2026-01-08',App.gi('SB').startDate);
  assert('Chain: C after B','2026-01-11',App.gi('SC').startDate);
}

section('Scheduled Mode — Diamond');
{
  resetItemCounter();
  const A=makeItem('task',{id:'DA',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'DB',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const C=makeItem('task',{id:'DC',startDate:'2026-01-05',duration:2,endDate:'2026-01-06'});
  const D=makeItem('task',{id:'DD',startDate:'2026-01-05',duration:2,endDate:'2026-01-06'});
  addDep(B,'DA','FS',0);addDep(C,'DA','FS',0);
  addDep(D,'DB','FS',0);addDep(D,'DC','FS',0);
  initProj([A,B,C,D],{schedulingMode:'scheduled'});
  App.runSchedule();
  // A ends Jan07, depEnd=Jan08 → B starts Jan08, B dur=5 → B ends Jan12, depEnd=Jan13
  // C starts Jan08, dur=2 → C ends Jan09, depEnd=Jan10
  // D waits for later of B depEnd (Jan13) and C depEnd (Jan10) → D starts Jan13
  assert('Diamond: D starts after longer path','2026-01-13',App.gi('DD').startDate);
}

section('Lag with Working Days');
{
  resetItemCounter();
  const A=makeItem('task',{id:'LWA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09',durMode:'work'});
  const B=makeItem('task',{id:'LWB',startDate:'2026-01-15',duration:3,endDate:'2026-01-17',durMode:'work'});
  addDep(B,'LWA','FS',2);
  initProj([A,B],{scheduleAroundNonWorking:true});
  const es=App.calcEarlyStart(App.gi('LWB'));
  // A depEnd=Jan10 (Sat). Work mode lag: skip to working day first (Mon Jan12), then +2 working days = Wed Jan14
  assert('FS+2 work lag: B start','2026-01-14',es);
}

section('Recalc Non-Working Days');
{
  resetItemCounter();
  const A=makeItem('task',{id:'RA',startDate:'2026-01-05',duration:5,endDate:'2026-01-09',durMode:'work'});
  const p=makeProj({scheduleAroundNonWorking:true,items:[A]});
  resetApp(p);
  App._recalcNonWorkingDays();
  assert('Recalc endDate for work mode','2026-01-09',App.gi('RA').endDate);

  // Add a holiday in the range
  p.holidays=[{name:'H',start:'2026-01-07',end:'2026-01-07',schedAround:true}];
  App._recalcNonWorkingDays();
  // Mon5, Tue6, Thu8, Fri9, Mon12 = 5 working days (Wed7 is holiday)
  assert('Recalc with holiday','2026-01-12',App.gi('RA').endDate);
}

section('No Deps — No Early Start');
{
  resetItemCounter();
  const A=makeItem('task',{id:'ND',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  initProj([A]);
  const es=App.calcEarlyStart(App.gi('ND'));
  assert('No deps → null early start',es,null);
}

section('Missing Predecessor');
{
  resetItemCounter();
  const B=makeItem('task',{id:'MP',startDate:'2026-01-10',duration:3,endDate:'2026-01-12'});
  addDep(B,'nonexistent','FS',0);
  initProj([B]);
  const es=App.calcEarlyStart(App.gi('MP'));
  assert('Missing pred → null early start',es,null);
}

section('Cycle Detection');
{
  resetItemCounter();
  const A=makeItem('task',{id:'CA',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'CB',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  const C=makeItem('task',{id:'CC',startDate:'2026-01-11',duration:3,endDate:'2026-01-13'});
  addDep(B,'CA','FS',0);addDep(C,'CB','FS',0);
  initProj([A,B,C]);
  // hasCycle(A, C) → does adding C as pred of A create cycle? C is downstream of A → yes
  assertT('Cycle: C downstream of A',App.hasCycle('CA','CC'));
  assertF('No cycle: A not downstream of C',App.hasCycle('CC','CA'));
}

section('Duration Label Formatting');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:true});
  resetApp(p);

  // Work mode: 5 working days Mon-Fri = 5d calendar too
  const it1={startDate:'2026-01-05',endDate:'2026-01-09',duration:5,durMode:'work',durationFmt:'days'};
  assert('Work label (same cal/work)',App._fmtDurLabel(it1),'5d');

  // Work mode crossing weekend: 6wd Mon-Mon = 8 cal days
  const it2={startDate:'2026-01-05',endDate:'2026-01-12',duration:6,durMode:'work',durationFmt:'days'};
  assert('Work label (diff cal/work)',App._fmtDurLabel(it2),'W:6d C:8d');

  // Weeks format
  const it3={startDate:'2026-01-05',endDate:'2026-01-09',duration:5,durMode:'cal',durationFmt:'weeks'};
  assert('Weeks format',App._fmtDurLabel(it3),'1.0w');

  // No dates
  const it4={startDate:'',endDate:'',duration:5,durMode:'cal',durationFmt:'days'};
  assert('No dates → empty',App._fmtDurLabel(it4),'');
}

section('Schedule Pass — Dry Run');
{
  resetItemCounter();
  const A=makeItem('task',{id:'DRA',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'DRB',startDate:'2026-01-06',duration:3,endDate:'2026-01-08'});
  addDep(B,'DRA','FS',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  const changes=App._runSchedulePass(true);
  assertT('Dry run returns changes array',Array.isArray(changes));
  assertGte('Dry run finds at least 1 change',changes.length,1);
  assert('B not actually moved (dry run)','2026-01-06',App.gi('DRB').startDate);
}

section('Schedule — Manual Mode No-Op');
{
  resetItemCounter();
  const A=makeItem('task',{id:'MNA',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'MNB',startDate:'2026-01-06',duration:3,endDate:'2026-01-08'});
  addDep(B,'MNA','FS',0);
  initProj([A,B],{schedulingMode:'manual'});
  App.runSchedule();
  assert('Manual mode: B not moved','2026-01-06',App.gi('MNB').startDate);
}

const{failed}=summary();
process.exit(failed?1:0);
