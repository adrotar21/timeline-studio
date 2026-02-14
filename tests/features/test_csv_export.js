#!/usr/bin/env node
/**
 * Timeline Studio -- CSV Export Tests
 * Covers: exportDataCSV header/rows, field mapping, CSV escaping,
 *   status name resolution, getVal column accessor, tab-separated output.
 *
 * ~40 tests
 */
const{assert,assertT,assertF,assertGte,assertLte,assertNeq,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeItem,makeSwim,makeStatusDefs,makeStatusDisplay,addDep,addItems,resetItemCounter}=require('../helpers/builders');

// ─── Mock Functions ──────────────────────────────────────────────────────

/** CSV export: builds rows array and formats as CSV string */
function exportDataCSV(proj,statusDefs){
  const rows=[['Name','Owner','Type','Start','End','Duration','Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate']];
  for(const it of proj.items){
    const sl=proj.swimlanes.find(s=>s.id===it.swimlaneId);
    const sd=(statusDefs||[]).find(s=>s.id===it.status);
    const preds=(it.deps||[]).map(d=>{const p=proj.items.find(i=>i.id===(typeof d==='string'?d:d.id));return p?p.name:''}).filter(Boolean).join(', ');
    rows.push([
      it.name,it.owner||'',it.type,
      it.type==='task'?it.startDate:it.date,
      it.type==='task'?it.endDate:'',
      it.type==='task'?String(it.duration):'',
      sl?sl.name:'',String(it.subRow||0),it.color,
      String(it.progress||0),it.pinned?'true':'false',
      it.hidden?'true':'false',it.notes||'',preds,
      sd?sd.name:'',it.statusDate||''
    ]);
  }
  return rows.map(r=>r.map(c=>c.includes(',')||c.includes('"')||c.includes('\n')?'"'+c.replace(/"/g,'""')+'"':c).join(',')).join('\n');
}

/** Column value getter */
function getVal(it,col,proj,statusDefs){
  switch(col){
    case'Name':return it.name;
    case'Owner':return it.owner||'';
    case'Type':return it.type;
    case'Start':return it.type==='task'?it.startDate:it.date;
    case'End':return it.type==='task'?it.endDate:'';
    case'Duration':return it.type==='task'?String(it.duration):'';
    case'Status':const sd=(statusDefs||[]).find(s=>s.id===it.status);return sd?sd.name:'';
    case'StatusDate':return it.statusDate||'';
    default:return'';
  }
}

/** Tab-separated variant */
function exportDataTSV(proj,statusDefs,cols){
  const rows=[cols];
  for(const it of proj.items){
    rows.push(cols.map(c=>getVal(it,c,proj,statusDefs)));
  }
  return rows.map(r=>r.join('\t')).join('\n');
}

// ═══════════════════════════════════════════════════════════════════
//  SIMPLE CSV (15 tests)
// ═══════════════════════════════════════════════════════════════════

section('Simple CSV — Header');

(()=>{
  resetItemCounter();
  const proj=makeProj({items:[]});
  const csv=exportDataCSV(proj,[]);
  const header=csv.split('\n')[0];
  const cols=header.split(',');
  assert('Header has 16 columns',cols.length,16);
  assertIncludes('Header includes Name',header,'Name');
  assertIncludes('Header includes Status',header,'Status');
  assertIncludes('Header includes StatusDate',header,'StatusDate');
})();

section('Simple CSV — Task Row');

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const proj=makeProj({
    items:[makeItem('task',{name:'Build',owner:'Alice',startDate:'2026-01-05',endDate:'2026-01-09',duration:5,color:'#4f8cc9',status:'on-track',statusDate:'2026-02-01'})],
  });
  const csv=exportDataCSV(proj,defs);
  const lines=csv.split('\n');
  assert('CSV has header + 1 data row',lines.length,2);
  assertIncludes('Row includes name',lines[1],'Build');
  assertIncludes('Row includes owner',lines[1],'Alice');
  assertIncludes('Row includes type',lines[1],'task');
  assertIncludes('Row includes start',lines[1],'2026-01-05');
  assertIncludes('Row includes end',lines[1],'2026-01-09');
  assertIncludes('Row includes status name',lines[1],'On Track');
  assertIncludes('Row includes statusDate',lines[1],'2026-02-01');
})();

section('Simple CSV — Milestone Row');

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('milestone',{name:'Kickoff',date:'2026-02-01'})],
  });
  const csv=exportDataCSV(proj,[]);
  const lines=csv.split('\n');
  const row=lines[1];
  assertIncludes('Milestone: type=milestone',row,'milestone');
  assertIncludes('Milestone: date as start',row,'2026-02-01');
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('milestone',{name:'Kickoff',date:'2026-02-01'})],
  });
  const csv=exportDataCSV(proj,[]);
  const lines=csv.split('\n');
  const fields=lines[1].split(',');
  // End is at index 4 (0=Name,1=Owner,2=Type,3=Start,4=End)
  assert('Milestone: empty end date',fields[4],'');
  // Duration is at index 5
  assert('Milestone: empty duration',fields[5],'');
})();

section('Simple CSV — Status Column');

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const proj=makeProj({
    items:[makeItem('task',{name:'A',status:'on-track'})],
  });
  const csv=exportDataCSV(proj,defs);
  assertIncludes('Status column shows full name',csv,'On Track');
  assertNotIncludes('Status column does not show shortName alone',csv.split('\n')[1],',G,');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const proj=makeProj({
    items:[makeItem('task',{name:'A',status:''})],
  });
  const csv=exportDataCSV(proj,defs);
  const lines=csv.split('\n');
  const fields=lines[1].split(',');
  // Status is at index 14
  assert('Blank status → empty cell',fields[14],'');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const proj=makeProj({
    items:[makeItem('task',{name:'A',status:'on-track',statusDate:'2026-02-14'})],
  });
  const csv=exportDataCSV(proj,defs);
  assertIncludes('StatusDate shows ISO string',csv,'2026-02-14');
})();

section('Simple CSV — Escaping');

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('task',{name:'Design, Review',owner:'Test'})],
  });
  const csv=exportDataCSV(proj,[]);
  assertIncludes('Commas in names get quoted',csv,'"Design, Review"');
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('task',{name:'Say "Hello"'})],
  });
  const csv=exportDataCSV(proj,[]);
  assertIncludes('Quotes in values get doubled',csv,'""Hello""');
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('task',{notes:'Line1\nLine2'})],
  });
  const csv=exportDataCSV(proj,[]);
  assertIncludes('Newlines in values get quoted',csv,'"Line1\nLine2"');
})();

section('Simple CSV — Multiple Items');

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[
      makeItem('task',{name:'A'}),
      makeItem('task',{name:'B'}),
      makeItem('milestone',{name:'C'}),
    ],
  });
  const csv=exportDataCSV(proj,[]);
  const lines=csv.split('\n');
  assert('3 items produce 4 lines (header + 3)',lines.length,4);
})();

// ═══════════════════════════════════════════════════════════════════
//  ADVANCED CSV / DATA EXPORT (25 tests)
// ═══════════════════════════════════════════════════════════════════

section('getVal — Column Value Accessor');

(()=>{
  resetItemCounter();
  const it=makeItem('task',{name:'Build Feature'});
  assert('getVal Name',getVal(it,'Name',null,[]),'Build Feature');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{owner:'Bob'});
  assert('getVal Owner',getVal(it,'Owner',null,[]),'Bob');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{owner:''});
  assert('getVal Owner empty',getVal(it,'Owner',null,[]),'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task');
  assert('getVal Type task',getVal(it,'Type',null,[]),'task');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone');
  assert('getVal Type milestone',getVal(it,'Type',null,[]),'milestone');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{startDate:'2026-03-15'});
  assert('getVal Start for task',getVal(it,'Start',null,[]),'2026-03-15');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone',{date:'2026-04-01'});
  assert('getVal Start for milestone',getVal(it,'Start',null,[]),'2026-04-01');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{endDate:'2026-03-20'});
  assert('getVal End for task',getVal(it,'End',null,[]),'2026-03-20');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone');
  assert('getVal End for milestone → empty',getVal(it,'End',null,[]),'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{duration:7});
  assert('getVal Duration for task',getVal(it,'Duration',null,[]),'7');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('milestone');
  assert('getVal Duration for milestone → empty',getVal(it,'Duration',null,[]),'');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const it=makeItem('task',{status:'on-track'});
  assert('getVal Status resolves to name',getVal(it,'Status',null,defs),'On Track');
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const it=makeItem('task',{status:'off-track'});
  assert('getVal Status off-track',getVal(it,'Status',null,defs),'Off Track');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{statusDate:'2026-02-14'});
  assert('getVal StatusDate returns ISO',getVal(it,'StatusDate',null,[]),'2026-02-14');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{statusDate:''});
  assert('getVal StatusDate empty → empty',getVal(it,'StatusDate',null,[]),'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:''});
  assert('getVal Status missing → empty',getVal(it,'Status',null,[]),'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{status:'nonexistent-id'});
  assert('getVal Status unknown ID → empty',getVal(it,'Status',null,makeStatusDefs()),'');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task');
  assert('getVal unknown column → empty',getVal(it,'FooBar',null,[]),'');
})();

section('Tab-Separated Output');

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[makeItem('task',{name:'Alpha',owner:'Bob',startDate:'2026-01-05'})],
  });
  const defs=makeStatusDefs();
  const tsv=exportDataTSV(proj,defs,['Name','Owner','Start']);
  const lines=tsv.split('\n');
  assert('TSV: header line',lines[0],'Name\tOwner\tStart');
  assert('TSV: data line',lines[1],'Alpha\tBob\t2026-01-05');
})();

(()=>{
  resetItemCounter();
  const proj=makeProj({
    items:[
      makeItem('task',{name:'A'}),
      makeItem('task',{name:'B'}),
    ],
  });
  const tsv=exportDataTSV(proj,[],['Name']);
  const lines=tsv.split('\n');
  assert('TSV: 2 items + header = 3 lines',lines.length,3);
})();

(()=>{
  resetItemCounter();
  const defs=makeStatusDefs();
  const proj=makeProj({
    items:[makeItem('task',{name:'X',status:'on-track',statusDate:'2026-02-14'})],
  });
  const tsv=exportDataTSV(proj,defs,['Name','Status','StatusDate']);
  assertIncludes('TSV: status column has name',tsv,'On Track');
  assertIncludes('TSV: statusDate column',tsv,'2026-02-14');
})();

section('Column Subset Selection');

(()=>{
  resetItemCounter();
  const allCols=['Name','Owner','Type','Start','End','Duration','Status','StatusDate'];
  const subset=allCols.filter(c=>c==='Name'||c==='Status');
  assert('Column subset: 2 cols selected',subset.length,2);
  assert('Column subset: first is Name',subset[0],'Name');
  assert('Column subset: second is Status',subset[1],'Status');
})();

section('Predecessors in CSV');

(()=>{
  resetItemCounter();
  const pred=makeItem('task',{id:'p1',name:'Predecessor'});
  const succ=makeItem('task',{id:'s1',name:'Successor',deps:[{id:'p1',type:'FS',lag:0}]});
  const proj=makeProj({items:[pred,succ]});
  const csv=exportDataCSV(proj,[]);
  assertIncludes('Predecessor name in CSV',csv,'Predecessor');
})();

(()=>{
  resetItemCounter();
  const p1=makeItem('task',{id:'p1',name:'PredA'});
  const p2=makeItem('task',{id:'p2',name:'PredB'});
  const succ=makeItem('task',{id:'s1',name:'Succ',deps:[{id:'p1',type:'FS',lag:0},{id:'p2',type:'FS',lag:0}]});
  const proj=makeProj({items:[p1,p2,succ]});
  const csv=exportDataCSV(proj,[]);
  assertIncludes('Multiple predecessors joined',csv,'PredA, PredB');
})();

(()=>{
  resetItemCounter();
  const it=makeItem('task',{id:'t1',name:'NoDeps',deps:[]});
  const proj=makeProj({items:[it]});
  const csv=exportDataCSV(proj,[]);
  const lines=csv.split('\n');
  const fields=lines[1].split(',');
  // Predecessors at index 13
  assert('No deps → empty predecessors column',fields[13],'');
})();

// ═══════════════════════════════════════════════════════════════════

const{failed}=summary();process.exit(failed?1:0);
