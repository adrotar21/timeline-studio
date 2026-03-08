#!/usr/bin/env node
/**
 * Timeline Studio — Core Scheduling Engine Tests
 * Migrated from test_comprehensive.js using shared helpers.
 * Validates scheduling engine through the shared mock.
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
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
section('Basic FS Dependencies');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-12',duration:3,endDate:'2026-01-14'});
  addDep(B,'A','FS',0);
  initProj([A,B]);

  const es=App.calcEarlyStart(App.gi('B'));
  assert('FS dep: B early start after A ends','2026-01-10',es);
}

section('FS with Lag');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-15',duration:3,endDate:'2026-01-17'});
  addDep(B,'A','FS',2);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  assert('FS+2 lag: B early start','2026-01-12',es);
}

section('SS Dependencies');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  addDep(B,'A','SS',0);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  assert('SS dep: B starts with A','2026-01-05',es);
}

section('SS with Lag');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  addDep(B,'A','SS',3);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  assert('SS+3 lag: B start','2026-01-08',es);
}

section('FF Dependencies');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-07',duration:3,endDate:'2026-01-09'});
  addDep(B,'A','FF',0);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  // FF: B end must >= A end. A depEnd=Jan10. B dur=3. B start = Jan10 - 3 = Jan07
  assert('FF dep: B start computed from A end','2026-01-07',es);
}

section('SF Dependencies');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',name:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22'});
  addDep(B,'A','SF',0);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  // SF: B depEnd must be >= A start. A start Jan05, B dur=3 => Jan02
  assert('SF dep: B early start from A start','2026-01-02',es);
}

section('Milestone Dependencies');
{
  resetItemCounter();
  const M=makeItem('milestone',{id:'M',name:'M',date:'2026-01-10'});
  const B=makeItem('task',{id:'B',name:'B',startDate:'2026-01-12',duration:3,endDate:'2026-01-14'});
  addDep(B,'M','FS',0);
  initProj([M,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  // Milestone depEnd = date+1 = Jan11
  assert('MS→Task FS: B starts after milestone','2026-01-11',es);
}

section('Milestone to Milestone');
{
  resetItemCounter();
  const M1=makeItem('milestone',{id:'M1',name:'M1',date:'2026-01-10'});
  const M2=makeItem('milestone',{id:'M2',name:'M2',date:'2026-01-15'});
  addDep(M2,'M1','FS',0);
  initProj([M1,M2]);
  const es=App.calcEarlyStart(App.gi('M2'));
  assert('MS→MS FS: M2 after M1','2026-01-11',es);
}

section('Working Days — _addWorkingDays');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:true});
  resetApp(p);
  // Mon Jan 5 + 5 working days = Fri Jan 9
  assert('5 working days from Mon','2026-01-09',App._addWorkingDays('2026-01-05',5));
  // Fri Jan 9 + 1 working day: Fri is already a working day, count it, result=Fri
  // _addWorkingDays counts the start day: start on Fri, count 1 → stays Fri
  assert('1 working day from Fri','2026-01-09',App._addWorkingDays('2026-01-09',1));
  // Mon Jan 5 + 10 working days = Fri Jan 16
  assert('10 working days from Mon','2026-01-16',App._addWorkingDays('2026-01-05',10));
}

section('Working Days — _skipNonWorking');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:true});
  resetApp(p);
  assert('Skip Sat to Mon',App._skipNonWorking('2026-01-10'),'2026-01-12');
  assert('Skip Sun to Mon',App._skipNonWorking('2026-01-11'),'2026-01-12');
  assert('Mon stays Mon',App._skipNonWorking('2026-01-12'),'2026-01-12');
  assert('Fri stays Fri',App._skipNonWorking('2026-01-09'),'2026-01-09');
}

section('Working Days — _countWorkingDays');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:true});
  resetApp(p);
  assert('Mon-Fri = 5 working days',App._countWorkingDays('2026-01-05','2026-01-10'),5);
  assert('Mon-Mon = 5 working days (1 week)',App._countWorkingDays('2026-01-05','2026-01-12'),5);
}

section('Working Days — _subtractWorkingDays');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:true});
  resetApp(p);
  // Mon Jan 12 - 1 working day = Fri Jan 9
  assert('1 working day before Mon','2026-01-09',App._subtractWorkingDays('2026-01-12',1));
  // Fri Jan 9 - 5 working days = Fri Jan 2
  assert('5 working days before Fri','2026-01-02',App._subtractWorkingDays('2026-01-09',5));
}

section('CalcEndDate');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:false});
  resetApp(p);
  // Calendar mode: endDate = start + (dur-1)
  const it1={startDate:'2026-01-05',duration:5,durMode:'cal'};
  assert('Cal endDate: 5d from Jan5','2026-01-09',App._calcEndDate(it1));

  const it2={startDate:'2026-01-05',duration:1,durMode:'cal'};
  assert('Cal endDate: 1d = same day','2026-01-05',App._calcEndDate(it2));

  const it3={startDate:'2026-01-05',duration:0,durMode:'cal'};
  assert('Cal endDate: 0d = same day','2026-01-05',App._calcEndDate(it3));

  // Working mode
  const pw=makeProj({scheduleAroundNonWorking:true});
  resetApp(pw);
  const it4={startDate:'2026-01-05',duration:5,durMode:'work'};
  assert('Work endDate: 5wd from Mon Jan5','2026-01-09',App._calcEndDate(it4));

  const it5={startDate:'2026-01-05',duration:6,durMode:'work'};
  assert('Work endDate: 6wd from Mon (crosses weekend)','2026-01-12',App._calcEndDate(it5));
}

section('DepEnd');
{
  resetItemCounter();
  const p=makeProj();
  resetApp(p);
  assert('Task depEnd: endDate+1',App._depEnd({type:'task',endDate:'2026-01-09'}),'2026-01-10');
  assert('Milestone depEnd: date+1',App._depEnd({type:'milestone',date:'2026-01-15'}),'2026-01-16');
}

section('Topological Sort');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  const C=makeItem('task',{id:'C',startDate:'2026-01-11',duration:3,endDate:'2026-01-13'});
  addDep(B,'A','FS',0);
  addDep(C,'B','FS',0);
  initProj([A,B,C]);
  const order=App.topoSort();
  assert('Topo: A before B',order.indexOf('A')<order.indexOf('B'),true);
  assert('Topo: B before C',order.indexOf('B')<order.indexOf('C'),true);
}

section('Topo Sort — Diamond');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:2,endDate:'2026-01-06'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-07',duration:2,endDate:'2026-01-08'});
  const C=makeItem('task',{id:'C',startDate:'2026-01-07',duration:2,endDate:'2026-01-08'});
  const D=makeItem('task',{id:'D',startDate:'2026-01-09',duration:2,endDate:'2026-01-10'});
  addDep(B,'A','FS',0);addDep(C,'A','FS',0);
  addDep(D,'B','FS',0);addDep(D,'C','FS',0);
  initProj([A,B,C,D]);
  const order=App.topoSort();
  assert('Diamond: A first',order[0],'A');
  assert('Diamond: D last',order[order.length-1],'D');
}

section('Violation Detection');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  addDep(B,'A','FS',0);
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  // B starts Jan8, A depEnd=Jan10 → B should start Jan10 → violated
  assertT('B is violated (starts before A ends)',v.has('B'));
  assertF('A is not violated',v.has('A'));
}

section('Violation — No Violation');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-10',duration:3,endDate:'2026-01-12'});
  addDep(B,'A','FS',0);
  initProj([A,B]);
  const v=App.getViolatedDepIds();
  assert('No violations when B starts at depEnd',v.size,0);
}

section('RunSchedule');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-06',duration:3,endDate:'2026-01-08'});
  addDep(B,'A','FS',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  App.runSchedule();
  assert('After schedule: B start = A depEnd','2026-01-10',App.gi('B').startDate);
}

section('RunSchedule - Can Pull Earlier');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22'});
  addDep(B,'A','FF',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  App.runSchedule();
  // FF with A depEnd Jan10 and B dur=3 => B start Jan07 (left shift from Jan20)
  assert('RunSchedule can move left for FF constraints','2026-01-07',App.gi('B').startDate);
}

section('RunSchedule - SF Auto Scheduling');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22'});
  addDep(B,'A','SF',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  App.runSchedule();
  assert('RunSchedule applies SF constraint','2026-01-02',App.gi('B').startDate);
}

section('RunSchedule — Pinned Item Skipped');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-06',duration:3,endDate:'2026-01-08',pinned:true});
  addDep(B,'A','FS',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  App.runSchedule();
  assert('Pinned B not moved','2026-01-06',App.gi('B').startDate);
}

section('Propagate From');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  const C=makeItem('task',{id:'C',startDate:'2026-01-11',duration:2,endDate:'2026-01-12'});
  addDep(B,'A','FS',0);addDep(C,'B','FS',0);
  initProj([A,B,C]);
  const n=App.propagateFrom(['A']);
  assertGte('propagateFrom moves downstream items',n,1);
  assert('B moved to depEnd of A','2026-01-10',App.gi('B').startDate);
}

section('Float Calculation');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-10',duration:3,endDate:'2026-01-12'});
  addDep(B,'A','FS',0);
  initProj([A,B]);
  App.calculateFloat();
  // Linear chain: both should have float=0
  assert('A float in linear chain',App.gi('A')._float,0);
  assert('B float in linear chain',App.gi('B')._float,0);
}

section('Float Calculation - SF Branch');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22'});
  addDep(B,'A','SF',0);
  initProj([A,B],{schedulingMode:'scheduled'});
  App.runSchedule();
  App.calculateFloat();
  assert('SF branch: predecessor on critical chain has zero float',App.gi('A')._float,0);
  assertT('SF branch: successor float is computed',App.gi('B')._float!=null);
}

section('Float Calculation - SF Branching Paths');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-20',duration:3,endDate:'2026-01-22'});
  const C=makeItem('task',{id:'C',startDate:'2026-01-20',duration:5,endDate:'2026-01-24'});
  addDep(B,'A','SF',0);
  addDep(C,'A','FS',0);
  initProj([A,B,C],{schedulingMode:'scheduled'});
  App.runSchedule();
  App.calculateFloat();

  assert('SF branching: A float=0 (shared predecessor)',App.gi('A')._float,0);
  assert('SF branching: C float=0 (critical FS branch)',App.gi('C')._float,0);
  assertT('SF branching: B has slack',App.gi('B')._float>0);
  const crit=App.getCriticalPath();
  assertT('SF branching: A critical',crit&&crit.has('A'));
  assertT('SF branching: C critical',crit&&crit.has('C'));
  assertF('SF branching: B not critical',crit&&crit.has('B'));
}

section('Float — Parallel Paths');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-10',duration:3,endDate:'2026-01-12'});
  const C=makeItem('task',{id:'C',startDate:'2026-01-10',duration:1,endDate:'2026-01-10'});
  const D=makeItem('task',{id:'D',startDate:'2026-01-13',duration:2,endDate:'2026-01-14'});
  addDep(B,'A','FS',0);addDep(C,'A','FS',0);
  addDep(D,'B','FS',0);addDep(D,'C','FS',0);
  initProj([A,B,C,D]);
  App.calculateFloat();
  // B is longer path (3d), C is shorter (1d) → C has float
  assert('A float (critical)',App.gi('A')._float,0);
  assert('B float (critical)',App.gi('B')._float,0);
  assertGte('C has float (shorter path)',App.gi('C')._float,1);
  assert('D float (critical)',App.gi('D')._float,0);
}

section('Critical Path');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-10',duration:3,endDate:'2026-01-12'});
  addDep(B,'A','FS',0);
  initProj([A,B]);
  const crit=App.getCriticalPath();
  assertT('Critical path exists',crit!==null);
  assertT('A on critical path',crit.has('A'));
  assertT('B on critical path',crit.has('B'));
}

section('Negative Lag');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-08',duration:3,endDate:'2026-01-10'});
  addDep(B,'A','FS',-2);
  initProj([A,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  // A depEnd=Jan10, lag=-2 → Jan10-2=Jan08
  assert('FS negative lag: B early start','2026-01-08',es);
}

section('Multi-Predecessor');
{
  resetItemCounter();
  const A1=makeItem('task',{id:'A1',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  const A2=makeItem('task',{id:'A2',startDate:'2026-01-05',duration:5,endDate:'2026-01-09'});
  const B=makeItem('task',{id:'B',startDate:'2026-01-12',duration:3,endDate:'2026-01-14'});
  addDep(B,'A1','FS',0);addDep(B,'A2','FS',0);
  initProj([A1,A2,B]);
  const es=App.calcEarlyStart(App.gi('B'));
  // A1 depEnd=Jan08, A2 depEnd=Jan10 → B starts at later = Jan10
  assert('Multi-pred: B starts after later pred','2026-01-10',es);
}

section('Holidays');
{
  resetItemCounter();
  const hols=[{name:'Holiday',start:'2026-01-12',end:'2026-01-12',schedAround:true}];
  const p=makeProj({scheduleAroundNonWorking:true,holidays:hols});
  resetApp(p);
  const holSet=App._getNonWorkingHolidaySet();
  assertT('Holiday in set',holSet.has('2026-01-12'));
  assertF('Non-holiday not in set',holSet.has('2026-01-13'));
  assert('Skip holiday',App._skipNonWorking('2026-01-12'),'2026-01-13');
}

section('Duration Label');
{
  resetItemCounter();
  const p=makeProj({scheduleAroundNonWorking:false});
  resetApp(p);
  const it1={startDate:'2026-01-05',endDate:'2026-01-09',duration:5,durMode:'cal',durationFmt:'days'};
  assert('Duration label: 5d',App._fmtDurLabel(it1),'5d');

  const it2={startDate:'2026-01-05',endDate:'2026-01-09',duration:5,durMode:'cal',durationFmt:'weeks'};
  assert('Duration label: weeks',App._fmtDurLabel(it2),'1.0w');
}

section('U Utility Functions');
{
  assert('U.iso Date object',U.iso(new Date('2026-01-15T12:00:00')),'2026-01-15');
  assert('U.iso string passthrough',U.iso('2026-01-15'),'2026-01-15');
  assert('U.addDays +3',U.addDays('2026-01-05',3),'2026-01-08');
  assert('U.addDays -1',U.addDays('2026-01-05',-1),'2026-01-04');
  assert('U.days between',U.days('2026-01-05','2026-01-10'),5);
  assert('U.days same date',U.days('2026-01-05','2026-01-05'),0);
  assert('U.dow Monday',U.dow('2026-01-05'),1);
  assert('U.dow Sunday',U.dow('2026-01-04'),0);
  assert('U.dow Saturday',U.dow('2026-01-10'),6);
  assertT('U.isWeekend Sat',U.isWeekend('2026-01-10'));
  assertT('U.isWeekend Sun',U.isWeekend('2026-01-11'));
  assertF('U.isWeekend Mon',U.isWeekend('2026-01-05'));
  const obj={a:1,b:{c:2}};
  const copy=U.deep(obj);
  assert('U.deep copies',copy.b.c,2);
  copy.b.c=99;
  assert('U.deep is independent',obj.b.c,2);
}

section('No Items — Edge Cases');
{
  resetItemCounter();
  initProj([]);
  const order=App.topoSort();
  assert('Empty topo sort',order.length,0);
  const v=App.getViolatedDepIds();
  assert('No violations with no items',v.size,0);
}

section('Self-referencing Dep');
{
  resetItemCounter();
  const A=makeItem('task',{id:'A',startDate:'2026-01-05',duration:3,endDate:'2026-01-07'});
  addDep(A,'A','FS',0);
  initProj([A]);
  // Should not infinite loop — calcEarlyStart finds pred=self
  const es=App.calcEarlyStart(App.gi('A'));
  // Self-dep: pred=A, A depEnd=Jan08, so es=Jan08
  assert('Self-dep early start',es,'2026-01-08');
}

const{failed}=summary();
process.exit(failed?1:0);
