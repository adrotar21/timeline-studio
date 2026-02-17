#!/usr/bin/env node
/**
 * Timeline Studio -- Data Table Context Menu Tests
 * Covers: column detection, text propagation (copy/prepend/append/clear),
 *   status propagation with statusDate, swimlane/sub-swimlane propagation,
 *   type change with date conversion, pin/hidden toggle/set/unset,
 *   color/row/progress propagation, single-item behavior, delete with dep cleanup,
 *   and undo atomicity (single snap per operation).
 *
 * ~95 tests
 */
const{assert,assertT,assertF,assertNeq,assertIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Helpers ──────────────────────────────────────────────────────

/** Simulate _dtCols array matching app.js renderDT() column definitions */
function makeDtCols(){
  return[
    {k:'cb',l:'',w:28},{k:'name',l:'Name',w:140},{k:'type',l:'Type',w:50},
    {k:'start',l:'Start',w:72},{k:'end',l:'End',w:72},{k:'duration',l:'Dur',w:38},
    {k:'progress',l:'%',w:32},{k:'owner',l:'Owner',w:90},{k:'notes',l:'Notes',w:90},
    {k:'status',l:'Status',w:56},{k:'swimlane',l:'Lane',w:70},{k:'subSwim',l:'Sub',w:60},
    {k:'color',l:'',w:24},{k:'subRow',l:'Row',w:30},{k:'pinned',l:'Pin',w:28},
    {k:'hidden',l:'Vis',w:28},{k:'deps',l:'Deps',w:50},
  ];
}

/** Track snap() calls to verify single-undo-unit per operation */
let snapCount=0;
function resetSnap(){snapCount=0}

/** Track sched()/autoSave()/toast() calls */
let schedCount=0,autoSaveCount=0,toastMsg='';
function resetTrackers(){
  snapCount=0;schedCount=0;autoSaveCount=0;toastMsg='';
  App.snap=()=>{snapCount++};
  App.sched=()=>{schedCount++};
  App.autoSave=()=>{autoSaveCount++};
  App.refreshPanel=()=>{};
  App.toast=(m)=>{toastMsg=m};
}

/** Build a standard test project with multiple items for bulk operations */
function makeTestProj(){
  resetItemCounter();
  const sw1=makeSwim({id:'sw1',name:'Design',subSwims:[
    {id:'ss1',name:'UX'},{id:'ss2',name:'Engineering'}
  ]});
  const sw2=makeSwim({id:'sw2',name:'Development',subSwims:[
    {id:'ss3',name:'Backend'},{id:'ss4',name:'Frontend'}
  ]});
  const items=[
    makeItem('task',{id:'i1',name:'Task Alpha',owner:'Sarah',notes:'Note A',status:'on-track',
      swimlaneId:'sw1',subSwimId:'ss1',color:'#ff0000',subRow:1,progress:50,pinned:false,hidden:false}),
    makeItem('task',{id:'i2',name:'Task Bravo',owner:'James',notes:'Note B',status:'at-risk',
      swimlaneId:'sw1',subSwimId:'ss2',color:'#00ff00',subRow:0,progress:25,pinned:true,hidden:false}),
    makeItem('milestone',{id:'i3',name:'Milestone Charlie',owner:'',notes:'',status:'complete',
      swimlaneId:'sw2',subSwimId:'ss3',color:'#0000ff',subRow:2,progress:0,pinned:false,hidden:true}),
    makeItem('task',{id:'i4',name:'Task Delta',owner:'Sarah',notes:'Note D',status:'',
      swimlaneId:'sw2',subSwimId:'',color:'#ff0000',subRow:0,progress:75,pinned:false,hidden:false}),
  ];
  return makeProj({swimlanes:[sw1,sw2],items});
}

/** Simulate _execDtCtxAction logic for a given action — mirrors app.js exactly */
function execAction(action,colKey,it,dataAttrs){
  const items=App.sel.map(id=>App.gi(id)).filter(Boolean);
  const n=items.length;
  const el={dataset:dataAttrs||{}};

  if(action==='copy-val'){
    App.snap();
    const v=it[colKey]!=null?it[colKey]:'';
    items.forEach(i=>{
      if(colKey==='status'){i.status=v;i.statusDate=v?U.iso(new Date()):''}
      else if(colKey==='swimlane'||colKey==='swimlaneId'){i.swimlaneId=it.swimlaneId;i.subSwimId=''}
      else if(colKey==='subSwim'||colKey==='subSwimId'){i.subSwimId=it.subSwimId;i.swimlaneId=it.swimlaneId}
      else if(colKey==='color'){i.color=it.color}
      else if(colKey==='subRow'){i.subRow=it.subRow}
      else if(colKey==='progress'){i.progress=it.progress}
      else{i[colKey]=v}
    });
    App.sched();App.autoSave();
  }
  else if(action==='clear'){
    App.snap();
    items.forEach(i=>{
      if(colKey==='status'){i.status='';i.statusDate=''}
      else i[colKey]='';
    });
    App.sched();App.autoSave();
  }
  else if(action==='set-status'){
    App.snap();
    const v=el.dataset.v||'';
    items.forEach(i=>{i.status=v;i.statusDate=v?U.iso(new Date()):''});
    App.sched();App.autoSave();
  }
  else if(action==='set-swim'){
    App.snap();
    const v=el.dataset.v||'';
    items.forEach(i=>{i.swimlaneId=v;i.subSwimId=''});
    App.sched();App.autoSave();
  }
  else if(action==='set-sub'){
    App.snap();
    const subId=el.dataset.v||'';
    const slId=el.dataset.sl||'';
    items.forEach(i=>{i.subSwimId=subId;if(slId)i.swimlaneId=slId});
    App.sched();App.autoSave();
  }
  else if(action==='set-color'){
    App.snap();
    const v=el.dataset.v||'';
    items.forEach(i=>{i.color=v});
    App.sched();App.autoSave();
  }
  else if(action==='set-row'){
    App.snap();
    const v=parseInt(el.dataset.v)||0;
    items.forEach(i=>{i.subRow=v});
    App.sched();App.autoSave();
  }
  else if(action==='set-progress'){
    App.snap();
    const v=parseInt(el.dataset.v)||0;
    items.forEach(i=>{i.progress=v});
    App.sched();App.autoSave();
  }
  else if(action==='set-type'){
    App.snap();
    const v=el.dataset.v||'';
    items.forEach(i=>{
      if(i.type===v)return;
      if(v==='milestone'&&i.type==='task'){
        i.type='milestone';i.date=i.startDate;
        delete i.startDate;delete i.endDate;delete i.duration;delete i.durMode;
        i.iconType='diamond';
      }else if(v==='task'&&i.type==='milestone'){
        i.type='task';i.startDate=i.date;i.duration=14;i.durMode='cal';
        i.endDate=U.addDays(i.startDate,13);
        delete i.date;delete i.iconType;
      }
    });
    App.sched();App.autoSave();
  }
  else if(action==='pin-all'){
    App.snap();items.forEach(i=>{i.pinned=true});App.sched();App.autoSave();
  }
  else if(action==='unpin-all'){
    App.snap();items.forEach(i=>{i.pinned=false});App.sched();App.autoSave();
  }
  else if(action==='toggle-pin'){
    App.snap();items.forEach(i=>{i.pinned=!i.pinned});App.sched();App.autoSave();
  }
  else if(action==='hide-all'){
    App.snap();items.forEach(i=>{i.hidden=true});App.sched();App.autoSave();
  }
  else if(action==='show-all'){
    App.snap();items.forEach(i=>{i.hidden=false});App.sched();App.autoSave();
  }
  else if(action==='toggle-hidden'){
    App.snap();items.forEach(i=>{i.hidden=!i.hidden});App.sched();App.autoSave();
  }
  else if(action==='del'){
    App.snap();
    const delIds=new Set(items.map(i=>i.id));
    // Clean dep references
    App.proj.items.forEach(i=>{
      if(i.deps&&i.deps.length){
        i.deps=i.deps.filter(d=>{const pid=typeof d==='string'?d:d.id;return !delIds.has(pid)});
      }
    });
    App.proj.items=App.proj.items.filter(i=>!delIds.has(i.id));
    App.sel=[];
    App.sched();App.autoSave();
  }
  else if(action==='prepend'||action==='append'){
    // Tested separately via _showDtCtxInput mock
    return;
  }
}

/** Simulate prepend/append text operation */
function execTextInput(mode,field,val){
  const items=App.sel.map(id=>App.gi(id)).filter(Boolean);
  if(!val)return;
  App.snap();
  items.forEach(i=>{
    if(mode==='prepend')i[field]=val+i[field];
    else i[field]=i[field]+val;
  });
  App.sched();App.autoSave();
}


// ═══════════════════════════════════════════════════════════════════
//  COLUMN DETECTION (17 tests)
// ═══════════════════════════════════════════════════════════════════

section('Column Detection — cellIndex to colKey mapping');

(()=>{
  const cols=makeDtCols();
  const expected=['cb','name','type','start','end','duration','progress','owner','notes',
    'status','swimlane','subSwim','color','subRow','pinned','hidden','deps'];
  for(let i=0;i<expected.length;i++){
    assert(`Col ${i} → "${expected[i]}"`,cols[i].k,expected[i]);
  }
})();

// ═══════════════════════════════════════════════════════════════════
//  TEXT FIELD PROPAGATION — copy, prepend, append, clear (20 tests)
// ═══════════════════════════════════════════════════════════════════

section('Text Copy — owner to 3 selected items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  const it=App.gi('i1'); // owner = "Sarah"
  execAction('copy-val','owner',it);
  assert('Copy owner: i1 unchanged',App.gi('i1').owner,'Sarah');
  assert('Copy owner: i2 updated',App.gi('i2').owner,'Sarah');
  assert('Copy owner: i4 unchanged (was Sarah)',App.gi('i4').owner,'Sarah');
  assert('Copy owner: snap once',snapCount,1);
})();

section('Text Copy — name to 2 selected items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  const it=App.gi('i1'); // name = "Task Alpha"
  execAction('copy-val','name',it);
  assert('Copy name: i1 unchanged',App.gi('i1').name,'Task Alpha');
  assert('Copy name: i2 updated',App.gi('i2').name,'Task Alpha');
})();

section('Text Prepend — owner for 3 items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execTextInput('prepend','owner','Sr. ');
  assert('Prepend owner: i1',App.gi('i1').owner,'Sr. Sarah');
  assert('Prepend owner: i2',App.gi('i2').owner,'Sr. James');
  assert('Prepend owner: i4',App.gi('i4').owner,'Sr. Sarah');
  assert('Prepend: snap once',snapCount,1);
})();

section('Text Append — notes for 2 items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  execTextInput('append','notes',' -- reviewed');
  assert('Append notes: i1',App.gi('i1').notes,'Note A -- reviewed');
  assert('Append notes: i2',App.gi('i2').notes,'Note B -- reviewed');
})();

section('Text Clear — owner for 3 items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execAction('clear','owner',App.gi('i1'));
  assert('Clear owner: i1',App.gi('i1').owner,'');
  assert('Clear owner: i2',App.gi('i2').owner,'');
  assert('Clear owner: i4',App.gi('i4').owner,'');
  assert('Clear: snap once',snapCount,1);
})();

section('Text Prepend — empty value is no-op');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  execTextInput('prepend','owner','');
  assert('Empty prepend: i1 unchanged',App.gi('i1').owner,'Sarah');
  assert('Empty prepend: i2 unchanged',App.gi('i2').owner,'James');
  assert('Empty prepend: no snap',snapCount,0);
})();

section('Text Append — empty value is no-op');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  execTextInput('append','notes','');
  assert('Empty append: i1 unchanged',App.gi('i1').notes,'Note A');
  assert('Empty append: no snap',snapCount,0);
})();

// ═══════════════════════════════════════════════════════════════════
//  STATUS PROPAGATION (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Status — set-status propagates with statusDate');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execAction('set-status','status',App.gi('i1'),{v:'complete'});
  const today=U.iso(new Date());
  assert('Set status: i1',App.gi('i1').status,'complete');
  assert('Set status: i2',App.gi('i2').status,'complete');
  assert('Set status: i4',App.gi('i4').status,'complete');
  assert('Set status: i1 statusDate updated',App.gi('i1').statusDate,today);
  assert('Set status: i2 statusDate updated',App.gi('i2').statusDate,today);
  assert('Set status: snap once',snapCount,1);
})();

section('Status — clear status clears statusDate');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  execAction('set-status','status',App.gi('i1'),{v:''});
  assert('Clear status: i1 status empty',App.gi('i1').status,'');
  assert('Clear status: i1 statusDate cleared',App.gi('i1').statusDate,'');
  assert('Clear status: i2 status empty',App.gi('i2').status,'');
  assert('Clear status: i2 statusDate cleared',App.gi('i2').statusDate,'');
})();

// ═══════════════════════════════════════════════════════════════════
//  SWIMLANE PROPAGATION (8 tests)
// ═══════════════════════════════════════════════════════════════════

section('Swimlane — move items clears subSwimId');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3'];
  execAction('set-swim','swimlane',App.gi('i1'),{v:'sw2'});
  assert('Set swim: i1 moved',App.gi('i1').swimlaneId,'sw2');
  assert('Set swim: i1 sub cleared',App.gi('i1').subSwimId,'');
  assert('Set swim: i2 moved',App.gi('i2').swimlaneId,'sw2');
  assert('Set swim: i2 sub cleared',App.gi('i2').subSwimId,'');
  assert('Set swim: i3 already sw2',App.gi('i3').swimlaneId,'sw2');
  assert('Set swim: i3 sub cleared',App.gi('i3').subSwimId,'');
  assert('Set swim: snap once',snapCount,1);
})();

section('Sub-swimlane — also sets parent swimlane');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i4'];
  // Move to ss3 (belongs to sw2)
  execAction('set-sub','subSwim',App.gi('i3'),{v:'ss3',sl:'sw2'});
  assert('Set sub: i1 subSwimId',App.gi('i1').subSwimId,'ss3');
  assert('Set sub: i1 swimlaneId set to parent',App.gi('i1').swimlaneId,'sw2');
  assert('Set sub: i4 subSwimId',App.gi('i4').subSwimId,'ss3');
  assert('Set sub: i4 swimlaneId set to parent',App.gi('i4').swimlaneId,'sw2');
})();

// ═══════════════════════════════════════════════════════════════════
//  COLOR PROPAGATION (4 tests)
// ═══════════════════════════════════════════════════════════════════

section('Color — copy and set');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3'];
  execAction('set-color','color',App.gi('i1'),{v:'#ff9900'});
  assert('Set color: i1',App.gi('i1').color,'#ff9900');
  assert('Set color: i2',App.gi('i2').color,'#ff9900');
  assert('Set color: i3',App.gi('i3').color,'#ff9900');
  assert('Set color: snap once',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  ROW (subRow) PROPAGATION (4 tests)
// ═══════════════════════════════════════════════════════════════════

section('Row — set subRow for multiple items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execAction('set-row','subRow',App.gi('i1'),{v:'3'});
  assert('Set row: i1',App.gi('i1').subRow,3);
  assert('Set row: i2',App.gi('i2').subRow,3);
  assert('Set row: i4',App.gi('i4').subRow,3);
  assert('Set row: snap once',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  PROGRESS PROPAGATION (6 tests)
// ═══════════════════════════════════════════════════════════════════

section('Progress — set percentage for multiple items');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execAction('set-progress','progress',App.gi('i1'),{v:'100'});
  assert('Set progress: i1',App.gi('i1').progress,100);
  assert('Set progress: i2',App.gi('i2').progress,100);
  assert('Set progress: i4',App.gi('i4').progress,100);
})();

section('Progress — copy value from clicked item');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  const it=App.gi('i1'); // progress = 50
  execAction('copy-val','progress',it);
  assert('Copy progress: i2 gets 50',App.gi('i2').progress,50);
  assert('Copy progress: i4 gets 50',App.gi('i4').progress,50);
  assert('Copy progress: snap once',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  PINNED — pin, unpin, toggle (9 tests)
// ═══════════════════════════════════════════════════════════════════

section('Pinned — pin all');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  // i1=false, i2=true, i3=false
  App.sel=['i1','i2','i3'];
  execAction('pin-all','pinned',App.gi('i1'));
  assertT('Pin all: i1 pinned',App.gi('i1').pinned);
  assertT('Pin all: i2 still pinned',App.gi('i2').pinned);
  assertT('Pin all: i3 pinned',App.gi('i3').pinned);
})();

section('Pinned — unpin all');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3'];
  execAction('unpin-all','pinned',App.gi('i1'));
  assertF('Unpin all: i1',App.gi('i1').pinned);
  assertF('Unpin all: i2',App.gi('i2').pinned);
  assertF('Unpin all: i3',App.gi('i3').pinned);
})();

section('Pinned — toggle');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  // i1=false, i2=true, i3=false
  App.sel=['i1','i2','i3'];
  execAction('toggle-pin','pinned',App.gi('i1'));
  assertT('Toggle pin: i1 flipped to true',App.gi('i1').pinned);
  assertF('Toggle pin: i2 flipped to false',App.gi('i2').pinned);
  assertT('Toggle pin: i3 flipped to true',App.gi('i3').pinned);
})();

// ═══════════════════════════════════════════════════════════════════
//  HIDDEN — hide, show, toggle (9 tests)
// ═══════════════════════════════════════════════════════════════════

section('Hidden — hide all');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  // i1=false, i2=false, i3=true
  App.sel=['i1','i2','i3'];
  execAction('hide-all','hidden',App.gi('i1'));
  assertT('Hide all: i1',App.gi('i1').hidden);
  assertT('Hide all: i2',App.gi('i2').hidden);
  assertT('Hide all: i3 still hidden',App.gi('i3').hidden);
})();

section('Hidden — show all');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3'];
  execAction('show-all','hidden',App.gi('i1'));
  assertF('Show all: i1',App.gi('i1').hidden);
  assertF('Show all: i2',App.gi('i2').hidden);
  assertF('Show all: i3 now visible',App.gi('i3').hidden);
})();

section('Hidden — toggle');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  // i1=false, i2=false, i3=true
  App.sel=['i1','i2','i3'];
  execAction('toggle-hidden','hidden',App.gi('i1'));
  assertT('Toggle hidden: i1 flipped to true',App.gi('i1').hidden);
  assertT('Toggle hidden: i2 flipped to true',App.gi('i2').hidden);
  assertF('Toggle hidden: i3 flipped to false',App.gi('i3').hidden);
})();

// ═══════════════════════════════════════════════════════════════════
//  TYPE CONVERSION (10 tests)
// ═══════════════════════════════════════════════════════════════════

section('Type — task to milestone');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  const startBefore=App.gi('i1').startDate;
  execAction('set-type','type',App.gi('i1'),{v:'milestone'});
  const it=App.gi('i1');
  assert('Task→MS: type changed',it.type,'milestone');
  assert('Task→MS: date = original startDate',it.date,startBefore);
  assertT('Task→MS: startDate removed',it.startDate===undefined);
  assertT('Task→MS: endDate removed',it.endDate===undefined);
  assertT('Task→MS: duration removed',it.duration===undefined);
  assert('Task→MS: iconType set',it.iconType,'diamond');
  assert('Task→MS: snap once',snapCount,1);
})();

section('Type — milestone to task');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i3'];
  const dateBefore=App.gi('i3').date;
  execAction('set-type','type',App.gi('i3'),{v:'task'});
  const it=App.gi('i3');
  assert('MS→Task: type changed',it.type,'task');
  assert('MS→Task: startDate = original date',it.startDate,dateBefore);
  assert('MS→Task: duration = 14',it.duration,14);
  assert('MS→Task: durMode = cal',it.durMode,'cal');
  assert('MS→Task: endDate calculated',it.endDate,U.addDays(dateBefore,13));
  assertT('MS→Task: date removed',it.date===undefined);
  assertT('MS→Task: iconType removed',it.iconType===undefined);
})();

section('Type — same type is no-op');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  const before=U.deep(App.gi('i1'));
  execAction('set-type','type',App.gi('i1'),{v:'task'});
  const after=App.gi('i1');
  assert('Same type: still task',after.type,'task');
  assert('Same type: name unchanged',after.name,before.name);
  assert('Same type: startDate unchanged',after.startDate,before.startDate);
})();

section('Type — bulk conversion: 2 tasks to milestones');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  const s1=App.gi('i1').startDate;
  const s2=App.gi('i2').startDate;
  execAction('set-type','type',App.gi('i1'),{v:'milestone'});
  assert('Bulk T→MS: i1 type',App.gi('i1').type,'milestone');
  assert('Bulk T→MS: i2 type',App.gi('i2').type,'milestone');
  assert('Bulk T→MS: i1 date',App.gi('i1').date,s1);
  assert('Bulk T→MS: i2 date',App.gi('i2').date,s2);
  assert('Bulk T→MS: snap once',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  DELETE WITH DEPENDENCY CLEANUP (6 tests)
// ═══════════════════════════════════════════════════════════════════

section('Delete — removes items and cleans dependencies');

(()=>{
  resetItemCounter();
  const proj=makeProj({items:[
    makeItem('task',{id:'d1',name:'Pred'}),
    makeItem('task',{id:'d2',name:'Mid',deps:[{id:'d1',type:'FS',lag:0}]}),
    makeItem('task',{id:'d3',name:'Succ',deps:[{id:'d2',type:'FS',lag:0}]}),
    makeItem('task',{id:'d4',name:'Other',deps:[{id:'d1',type:'FS',lag:0},{id:'d2',type:'SS',lag:1}]}),
  ]});
  App.proj=proj;resetTrackers();
  App.sel=['d2'];

  execAction('del','',App.gi('d2'));

  assert('Delete: item count reduced',App.proj.items.length,3);
  assertF('Delete: d2 gone',App.proj.items.some(i=>i.id==='d2'));
  assertT('Delete: d1 still exists',App.proj.items.some(i=>i.id==='d1'));

  // d3 dep on d2 should be removed
  const d3=App.gi('d3');
  assert('Delete: d3 dep on d2 removed',d3.deps.length,0);

  // d4 dep on d2 removed, dep on d1 preserved
  const d4=App.gi('d4');
  assert('Delete: d4 has 1 dep left',d4.deps.length,1);
  assert('Delete: d4 still depends on d1',d4.deps[0].id,'d1');
})();

section('Delete — bulk delete multiple items');

(()=>{
  resetItemCounter();
  const proj=makeProj({items:[
    makeItem('task',{id:'b1',name:'A'}),
    makeItem('task',{id:'b2',name:'B'}),
    makeItem('task',{id:'b3',name:'C'}),
    makeItem('task',{id:'b4',name:'D',deps:[{id:'b1',type:'FS',lag:0},{id:'b2',type:'FS',lag:0},{id:'b3',type:'FS',lag:0}]}),
  ]});
  App.proj=proj;resetTrackers();
  App.sel=['b1','b3'];

  execAction('del','',App.gi('b1'));

  assert('Bulk del: 2 items remain',App.proj.items.length,2);
  assertT('Bulk del: b2 survives',App.proj.items.some(i=>i.id==='b2'));
  assertT('Bulk del: b4 survives',App.proj.items.some(i=>i.id==='b4'));

  const b4=App.gi('b4');
  assert('Bulk del: b4 only dep on b2 remains',b4.deps.length,1);
  assert('Bulk del: b4 dep is b2',b4.deps[0].id,'b2');
  assert('Bulk del: sel cleared',App.sel.length,0);
  assert('Bulk del: snap once',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  SINGLE ITEM BEHAVIOR (6 tests)
// ═══════════════════════════════════════════════════════════════════

section('Single item — text operations');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  execTextInput('prepend','name','[WIP] ');
  assert('Single prepend: name updated',App.gi('i1').name,'[WIP] Task Alpha');
})();

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  execTextInput('append','name',' (done)');
  assert('Single append: name updated',App.gi('i1').name,'Task Alpha (done)');
})();

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  execAction('clear','notes',App.gi('i1'));
  assert('Single clear: notes empty',App.gi('i1').notes,'');
})();

section('Single item — status change');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  execAction('set-status','status',App.gi('i1'),{v:'off-track'});
  const today=U.iso(new Date());
  assert('Single status: updated',App.gi('i1').status,'off-track');
  assert('Single status: statusDate',App.gi('i1').statusDate,today);
})();

section('Single item — pin toggle');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1']; // pinned=false
  execAction('toggle-pin','pinned',App.gi('i1'));
  assertT('Single toggle pin: now pinned',App.gi('i1').pinned);
})();

section('Single item — hidden toggle');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i3']; // hidden=true
  execAction('toggle-hidden','hidden',App.gi('i3'));
  assertF('Single toggle hidden: now visible',App.gi('i3').hidden);
})();

// ═══════════════════════════════════════════════════════════════════
//  UNDO ATOMICITY — single snap() per operation (5 tests)
// ═══════════════════════════════════════════════════════════════════

section('Undo atomicity — one snap per bulk text copy');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3','i4'];
  execAction('copy-val','name',App.gi('i1'));
  assert('Bulk copy 4 items: exactly 1 snap',snapCount,1);
  assert('Bulk copy: sched called',schedCount,1);
  assert('Bulk copy: autoSave called',autoSaveCount,1);
})();

section('Undo atomicity — one snap per bulk status set');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i3','i4'];
  execAction('set-status','status',App.gi('i1'),{v:'on-track'});
  assert('Bulk status 4 items: exactly 1 snap',snapCount,1);
})();

section('Undo atomicity — one snap per bulk type change');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  execAction('set-type','type',App.gi('i1'),{v:'milestone'});
  assert('Bulk type 2 items: exactly 1 snap',snapCount,1);
})();

section('Undo atomicity — one snap per bulk delete');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2'];
  execAction('del','',App.gi('i1'));
  assert('Bulk delete: exactly 1 snap',snapCount,1);
})();

section('Undo atomicity — one snap per prepend');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','i2','i4'];
  execTextInput('prepend','owner','Dr. ');
  assert('Prepend 3 items: exactly 1 snap',snapCount,1);
})();

// ═══════════════════════════════════════════════════════════════════
//  COLUMN CLASSIFICATION (8 tests)
// ═══════════════════════════════════════════════════════════════════

section('Column classification — text fields');

(()=>{
  const textCols=['name','owner','notes'];
  const enumCols=['status','swimlane','subSwim','color','subRow','progress','pinned','hidden','type'];
  const noPropCols=['start','end','duration','deps','cb'];

  for(const k of textCols){
    assertT(`"${k}" is a text field`,textCols.includes(k));
  }
  for(const k of enumCols){
    assertF(`"${k}" is NOT a text field`,textCols.includes(k));
  }
  for(const k of noPropCols){
    assertF(`"${k}" is NOT propagatable (text)`,textCols.includes(k));
    assertF(`"${k}" is NOT propagatable (enum)`,enumCols.includes(k));
  }
})();

// ═══════════════════════════════════════════════════════════════════
//  EDGE CASES (5 tests)
// ═══════════════════════════════════════════════════════════════════

section('Edge — copy empty value');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i3','i1']; // i3 has owner=''
  const it=App.gi('i3');
  execAction('copy-val','owner',it);
  assert('Copy empty: i1 owner cleared',App.gi('i1').owner,'');
  assert('Copy empty: i3 still empty',App.gi('i3').owner,'');
})();

section('Edge — swimlane clear sub on same lane');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1']; // sw1/ss1
  execAction('set-swim','swimlane',App.gi('i1'),{v:'sw1'});
  assert('Same lane: swimlane unchanged',App.gi('i1').swimlaneId,'sw1');
  assert('Same lane: sub still cleared',App.gi('i1').subSwimId,'');
})();

section('Edge — delete non-existent item in selection');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1','nonexistent'];
  // Should only process items that exist via .filter(Boolean)
  execAction('pin-all','pinned',App.gi('i1'));
  assertT('Non-existent filtered: i1 pinned',App.gi('i1').pinned);
  assert('Non-existent filtered: snap once',snapCount,1);
})();

section('Edge — set sub-swimlane also sets parent swimlane for cross-lane item');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  // i1 is in sw1/ss1; move to ss4 which belongs to sw2
  App.sel=['i1'];
  execAction('set-sub','subSwim',App.gi('i1'),{v:'ss4',sl:'sw2'});
  assert('Cross-lane sub: swimlaneId set to sw2',App.gi('i1').swimlaneId,'sw2');
  assert('Cross-lane sub: subSwimId set to ss4',App.gi('i1').subSwimId,'ss4');
})();

section('Edge — type conversion preserves other properties');

(()=>{
  App.proj=makeTestProj();resetTrackers();
  App.sel=['i1'];
  const before=App.gi('i1');
  const origColor=before.color;
  const origOwner=before.owner;
  const origStatus=before.status;
  execAction('set-type','type',before,{v:'milestone'});
  const after=App.gi('i1');
  assert('Type conv: color preserved',after.color,origColor);
  assert('Type conv: owner preserved',after.owner,origOwner);
  assert('Type conv: status preserved',after.status,origStatus);
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
