#!/usr/bin/env node
/**
 * Timeline Studio -- CSV/TSV Import Tests (F35)
 * Covers: parseCSV, parseTSV, parsePredString, autoDetectMappings,
 *   _checkTLSReimport, _buildMappedRows, _resolveSwimlaneName,
 *   _resolveStatusForImport
 *
 * ~65 tests
 */
const{assert,assertT,assertF,assertNeq,assertIncludes,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeSwim,makeStatusDefs}=require('../helpers/builders');

// ─── Extract pure functions from app.js by re-implementing identically ───
// These are self-contained pure functions that we mock here to match app.js logic.

const _IMP_ALIASES={
  Name:['name','task name','title','item','activity','description','task'],
  Owner:['owner','assigned to','assignee','resource','responsible'],
  Type:['type','item type'],
  Start:['start','start date','begin','from','start_date'],
  End:['end','end date','finish','due','to','due date','finish date','end_date'],
  Duration:['duration','dur','days','length'],
  Swimlane:['swimlane','lane','swim lane','category','group','phase','stream'],
  SubSwim:['sub-swimlane','sub swimlane','sub','sub lane','subswimlane','subswim'],
  Row:['row','sub row','subrow'],
  Predecessors:['predecessors','predecessor','deps','dependencies','pred','depends on'],
  Status:['status','state','health'],
  StatusDate:['statusdate','status date','status_date'],
  Progress:['progress','pct','percent','%','% complete'],
  Notes:['notes','note','comments','comment','details'],
  Color:['color','colour'],
  Pinned:['pinned','pin','locked'],
  Hidden:['hidden','hide'],
  LabelPos:['labelpos','label position','labelposition','label pos'],
  FontSize:['fontsize','font size','font_size'],
  TextColor:['textcolor','text color','text_color'],
  DateFormat:['dateformat','date format','date_format'],
  ShowDate:['showdate','show date','show_date']
};

const _IMP_LINK_COLORS=['#3b82f6','#22c55e','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

function parseCSV(text){
  const rows=[],n=text.length;let row=[],field='',inQ=false,i=0;
  while(i<n){const c=text[i];
    if(inQ){if(c==='"'){if(i+1<n&&text[i+1]==='"'){field+='"';i+=2}else{inQ=false;i++}}else{field+=c;i++}}
    else{if(c==='"'){inQ=true;i++}else if(c===','){row.push(field.trim());field='';i++}
    else if(c==='\r'){row.push(field.trim());field='';rows.push(row);row=[];i++;if(i<n&&text[i]==='\n')i++}
    else if(c==='\n'){row.push(field.trim());field='';rows.push(row);row=[];i++}
    else{field+=c;i++}}
  }
  if(field||row.length)row.push(field.trim());
  if(row.length>0&&!(row.length===1&&row[0]===''))rows.push(row);
  return rows;
}

function parseTSV(text){
  return text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim()).map(l=>l.split('\t').map(c=>c.trim()));
}

function autoDetectMappings(headers){
  const mappings=[],used=new Set();
  headers.forEach((h,i)=>{
    const hl=h.toLowerCase().trim();
    for(const[field,aliases] of Object.entries(_IMP_ALIASES)){
      if(used.has(field))continue;
      if(aliases.includes(hl)){mappings.push({srcIdx:i,tgtField:field,color:_IMP_LINK_COLORS[mappings.length%_IMP_LINK_COLORS.length]});used.add(field);return}
    }
  });
  return mappings;
}

function _checkTLSReimport(mappings,headers){
  return headers.length>0&&mappings.length===headers.length;
}

function parsePredString(predStr){
  if(!predStr)return[];
  return predStr.split(/[,;]/).map(s=>s.trim()).filter(Boolean).map(part=>{
    const m=part.match(/^(\d+)\s*(FS|SS|FF|SF)?\s*([+-]\s*\d+)?\s*d?\s*$/i);
    if(!m)return null;
    return{rowNum:+m[1],type:m[2]?m[2].toUpperCase():'FS',lag:m[3]?parseInt(m[3].replace(/\s/g,''),10):0};
  }).filter(Boolean);
}

function _buildMappedRows(impData,impMappings,impOverloads){
  if(!impData)return[];
  return impData.rows.map(r=>{
    const out={};
    impMappings.forEach(m=>{if(m.srcIdx<r.length)out[m.tgtField]=r[m.srcIdx]||''});
    impOverloads.forEach(ov=>{
      if(!ov.tgtField||!ov.srcIdxs.length)return;
      const delims=ov.delimiters||[];const pfxs=ov.prefixes||[];
      let combined='',count=0;
      ov.srcIdxs.forEach((si,i)=>{
        if(si==null||si>=r.length)return;
        if(count>0)combined+=(delims[i-1]!=null?delims[i-1]:' ');
        combined+=(pfxs[i]||'')+(r[si]||'');count++;
      });
      out[ov.tgtField]=combined;
    });
    return out;
  });
}

function _resolveSwimlaneName(name,proj){
  const COLORS=['#2C5F7C','#5B8C5A','#C17817','#9B4DCA','#E34234','#1ABC9C','#2980B9','#8E44AD','#D35400','#27AE60',
    '#F39C12','#C0392B','#16A085','#2C3E50','#E74C3C','#3498DB','#9B59B6','#E67E22','#1ABC9C','#34495E'];
  if(!name)return proj.swimlanes[0]?proj.swimlanes[0].id:'';
  const nl=name.toLowerCase().trim();
  const match=proj.swimlanes.find(s=>s.name.toLowerCase().trim()===nl);
  if(match)return match.id;
  const newSl={id:U.id(),name:name.trim(),color:COLORS[proj.swimlanes.length%COLORS.length],height:120,subSwimlanes:[],collapsed:'expanded'};
  proj.swimlanes.push(newSl);return newSl.id;
}

function _resolveStatusForImport(val,proj,impStatusMap){
  if(!val)return'';
  const mapped=impStatusMap[val];
  if(!mapped||mapped==='')return'';
  if(mapped==='__create__'){
    const newDef={id:U.id(),name:val.trim(),desc:'Imported status',color:'#6b7280',shortName:val.trim().charAt(0).toUpperCase(),emoji:'\u26AA'};
    proj.statusDefs.push(newDef);impStatusMap[val]=newDef.id;return newDef.id;
  }
  return mapped;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════════

section('parseCSV — Basic');
{
  const r=parseCSV('Name,Start,End\nAlpha,2026-01-01,2026-01-15\nBeta,2026-02-01,2026-02-28');
  assert('parseCSV row count',r.length,3);
  assert('parseCSV header',r[0][0],'Name');
  assert('parseCSV first data name',r[1][0],'Alpha');
  assert('parseCSV first data start',r[1][1],'2026-01-01');
  assert('parseCSV second data name',r[2][0],'Beta');
}

section('parseCSV — Quoted Fields');
{
  const r=parseCSV('"Task A","Jan 1, 2026","Jan 15, 2026"\n"Task B","Feb 1, 2026","Feb 28, 2026"');
  assert('quoted field name',r[0][0],'Task A');
  assert('quoted field with comma',r[0][1],'Jan 1, 2026');
  assert('quoted second row',r[1][0],'Task B');
}

section('parseCSV — Embedded Quotes');
{
  const r=parseCSV('Name,Notes\n"Task ""Alpha""","Some ""notes"" here"');
  assert('embedded quote name',r[1][0],'Task "Alpha"');
  assert('embedded quote notes',r[1][1],'Some "notes" here');
}

section('parseCSV — Embedded Newlines');
{
  const r=parseCSV('Name,Notes\n"Task A","Line 1\nLine 2"\nTask B,Simple');
  assert('embedded newline row count',r.length,3);
  assert('embedded newline field',r[1][1],'Line 1\nLine 2');
  assert('row after embedded newline',r[2][0],'Task B');
}

section('parseCSV — Empty/Edge Cases');
{
  const r=parseCSV('');
  assert('empty string',r.length,0);
  const r2=parseCSV('Name\n');
  assert('header only',r2.length,1);
  const r3=parseCSV('A,,C\nD,,F');
  assert('empty middle field header',r3[0][1],'');
  assert('empty middle field data',r3[1][1],'');
}

section('parseCSV — CRLF Line Endings');
{
  const r=parseCSV('Name,Start\r\nAlpha,2026-01-01\r\nBeta,2026-02-01');
  assert('CRLF row count',r.length,3);
  assert('CRLF data parsed',r[1][0],'Alpha');
}

section('parseTSV — Basic');
{
  const r=parseTSV('Name\tStart\tEnd\nAlpha\t2026-01-01\t2026-01-15\nBeta\t2026-02-01\t2026-02-28');
  assert('parseTSV row count',r.length,3);
  assert('parseTSV header',r[0][0],'Name');
  assert('parseTSV data',r[1][0],'Alpha');
}

section('parseTSV — CRLF');
{
  const r=parseTSV('Name\tStart\r\nAlpha\t2026-01-01\r\nBeta\t2026-02-01');
  assert('parseTSV CRLF rows',r.length,3);
  assert('parseTSV CRLF data',r[2][0],'Beta');
}

section('autoDetectMappings — Standard Headers');
{
  const m=autoDetectMappings(['Name','Start Date','End Date','Owner','Duration']);
  assert('auto-detect count',m.length,5);
  assert('Name mapped',m.find(x=>x.tgtField==='Name').srcIdx,0);
  assert('Start mapped',m.find(x=>x.tgtField==='Start').srcIdx,1);
  assert('End mapped',m.find(x=>x.tgtField==='End').srcIdx,2);
  assert('Owner mapped',m.find(x=>x.tgtField==='Owner').srcIdx,3);
  assert('Duration mapped',m.find(x=>x.tgtField==='Duration').srcIdx,4);
}

section('autoDetectMappings — PM Tool Aliases');
{
  const m=autoDetectMappings(['Task Name','Assigned To','Finish','Category','Depends On']);
  assert('Task Name->Name',m.find(x=>x.tgtField==='Name').srcIdx,0);
  assert('Assigned To->Owner',m.find(x=>x.tgtField==='Owner').srcIdx,1);
  assert('Finish->End',m.find(x=>x.tgtField==='End').srcIdx,2);
  assert('Category->Swimlane',m.find(x=>x.tgtField==='Swimlane').srcIdx,3);
  assert('Depends On->Predecessors',m.find(x=>x.tgtField==='Predecessors').srcIdx,4);
}

section('autoDetectMappings — Case Insensitive');
{
  const m=autoDetectMappings(['NAME','start','END','OWNER']);
  assert('uppercase NAME',m.find(x=>x.tgtField==='Name').srcIdx,0);
  assert('lowercase start',m.find(x=>x.tgtField==='Start').srcIdx,1);
  assert('uppercase END',m.find(x=>x.tgtField==='End').srcIdx,2);
}

section('autoDetectMappings — Unknown Headers');
{
  const m=autoDetectMappings(['Name','Custom Field','Unknown','Start']);
  assert('known fields mapped',m.length,2);
  assertT('Name found',m.some(x=>x.tgtField==='Name'));
  assertT('Start found',m.some(x=>x.tgtField==='Start'));
}

section('autoDetectMappings — No Duplicates');
{
  const m=autoDetectMappings(['Name','Title','Start','Begin']);
  assert('no duplicate Name',m.filter(x=>x.tgtField==='Name').length,1);
  assert('no duplicate Start',m.filter(x=>x.tgtField==='Start').length,1);
  assert('first match wins for Name',m.find(x=>x.tgtField==='Name').srcIdx,0);
  assert('first match wins for Start',m.find(x=>x.tgtField==='Start').srcIdx,2);
}

section('_checkTLSReimport — Full Match');
{
  const h=['Name','Owner','Type','Start','End','Duration','Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate'];
  const m=autoDetectMappings(h);
  assertT('TLS basic export detected',_checkTLSReimport(m,h));
}

section('_checkTLSReimport — Extended Match');
{
  const h=['Name','Owner','Type','Start','End','Duration','Swimlane','SubSwim','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status','StatusDate','LabelPos','FontSize','TextColor','DateFormat','ShowDate'];
  const m=autoDetectMappings(h);
  assertT('TLS extended export detected',_checkTLSReimport(m,h));
}

section('_checkTLSReimport — Partial Match');
{
  const h=['Name','Start','End','Custom Field'];
  const m=autoDetectMappings(h);
  assertF('partial match is not TLS re-import',_checkTLSReimport(m,h));
}

section('parsePredString — Basic');
{
  const p=parsePredString('1');
  assert('single pred count',p.length,1);
  assert('single pred rowNum',p[0].rowNum,1);
  assert('single pred default type',p[0].type,'FS');
  assert('single pred default lag',p[0].lag,0);
}

section('parsePredString — Type + Lag');
{
  const p=parsePredString('2FS,3SS+2d,4FF-1');
  assert('multi pred count',p.length,3);
  assert('pred 1 row',p[0].rowNum,2);
  assert('pred 1 type',p[0].type,'FS');
  assert('pred 2 row',p[1].rowNum,3);
  assert('pred 2 type',p[1].type,'SS');
  assert('pred 2 lag',p[1].lag,2);
  assert('pred 3 row',p[2].rowNum,4);
  assert('pred 3 type',p[2].type,'FF');
  assert('pred 3 lag',p[2].lag,-1);
}

section('parsePredString — Semicolons');
{
  const p=parsePredString('1FS;2SS;3FF+5d');
  assert('semicolons count',p.length,3);
  assert('semicolons last lag',p[2].lag,5);
}

section('parsePredString — SF Type');
{
  const p=parsePredString('5SF');
  assert('SF type parsed',p[0].type,'SF');
}

section('parsePredString — Empty/Invalid');
{
  assert('empty string',parsePredString('').length,0);
  assert('null',parsePredString(null).length,0);
  const p=parsePredString('abc,1,xyz');
  assert('invalid filtered out',p.length,1);
  assert('valid part kept',p[0].rowNum,1);
}

section('_buildMappedRows — Basic 1:1');
{
  const data={headers:['Task','Date1','Date2'],rows:[['Alpha','2026-01-01','2026-01-15'],['Beta','2026-02-01','2026-02-28']]};
  const mappings=[{srcIdx:0,tgtField:'Name',color:'#3b82f6'},{srcIdx:1,tgtField:'Start',color:'#22c55e'},{srcIdx:2,tgtField:'End',color:'#f59e0b'}];
  const rows=_buildMappedRows(data,mappings,[]);
  assert('mapped row count',rows.length,2);
  assert('mapped Name',rows[0].Name,'Alpha');
  assert('mapped Start',rows[0].Start,'2026-01-01');
  assert('mapped End',rows[1].End,'2026-02-28');
}

section('_buildMappedRows — Overloads');
{
  const data={headers:['First','Last','Title'],rows:[['John','Doe','PM'],['Jane','Smith','Lead']]};
  const mappings=[{srcIdx:2,tgtField:'Type',color:'#3b82f6'}];
  const overloads=[{srcIdxs:[0,1],tgtField:'Name',delimiters:[' ']}];
  const rows=_buildMappedRows(data,mappings,overloads);
  assert('overload Name combined',rows[0].Name,'John Doe');
  assert('overload Name second row',rows[1].Name,'Jane Smith');
  assert('1:1 mapping still works',rows[0].Type,'PM');
}

section('_buildMappedRows — 4-field Overload');
{
  const data={headers:['A','B','C','D'],rows:[['1','2','3','4']]};
  const overloads=[{srcIdxs:[0,1,2,3],tgtField:'Notes',delimiters:['-',' | ','/']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('4-field overload',rows[0].Notes,'1-2 | 3/4');
}

section('_buildMappedRows — Overload with Prefixes');
{
  const data={headers:['EngDRI','PMODRI'],rows:[['Alex Kim','Sarah Chen'],['Priya Patel','James Wilson']]};
  const overloads=[{srcIdxs:[0,1],tgtField:'Owner',delimiters:[' / '],prefixes:['Eng: ','PMO: ']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('prefix overload row 1',rows[0].Owner,'Eng: Alex Kim / PMO: Sarah Chen');
  assert('prefix overload row 2',rows[1].Owner,'Eng: Priya Patel / PMO: James Wilson');
}

section('_buildMappedRows — Prefix on First Source Only');
{
  const data={headers:['First','Last'],rows:[['John','Doe']]};
  const overloads=[{srcIdxs:[0,1],tgtField:'Name',delimiters:[' '],prefixes:['Mr. ','']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('prefix on first only',rows[0].Name,'Mr. John Doe');
}

section('_buildMappedRows — Prefix with No Delimiter');
{
  const data={headers:['Code','Desc'],rows:[['A1','Widget']]};
  const overloads=[{srcIdxs:[0,1],tgtField:'Name',delimiters:[''],prefixes:['[',': ']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('prefix with empty delim',rows[0].Name,'[A1: Widget');
}

section('_buildMappedRows — 4-field with Prefixes');
{
  const data={headers:['A','B','C','D'],rows:[['w','x','y','z']]};
  const overloads=[{srcIdxs:[0,1,2,3],tgtField:'Notes',delimiters:[', ',', ',', '],prefixes:['a=','b=','c=','d=']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('4-field with prefixes',rows[0].Notes,'a=w, b=x, c=y, d=z');
}

section('_buildMappedRows — Overload Missing Prefixes Array');
{
  const data={headers:['X','Y'],rows:[['Hello','World']]};
  const overloads=[{srcIdxs:[0,1],tgtField:'Name',delimiters:[' ']}];
  const rows=_buildMappedRows(data,[],overloads);
  assert('no prefixes array defaults to empty',rows[0].Name,'Hello World');
}

section('_resolveSwimlaneName — Existing Match');
{
  const proj={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const id=_resolveSwimlaneName('Engineering',proj);
  assert('existing match returns id',id,'sl1');
  assert('no new swimlane created',proj.swimlanes.length,1);
}

section('_resolveSwimlaneName — Case Insensitive');
{
  const proj={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const id=_resolveSwimlaneName('engineering',proj);
  assert('case insensitive match',id,'sl1');
}

section('_resolveSwimlaneName — Auto Create');
{
  const proj={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const id=_resolveSwimlaneName('Design',proj);
  assertNeq('new id created',id,'sl1');
  assert('swimlane added',proj.swimlanes.length,2);
  assert('new swimlane name',proj.swimlanes[1].name,'Design');
}

section('_resolveSwimlaneName — Empty Name');
{
  const proj={swimlanes:[{id:'sl1',name:'Default',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const id=_resolveSwimlaneName('',proj);
  assert('empty name returns first swimlane',id,'sl1');
}

section('_resolveStatusForImport — Matched');
{
  const proj={statusDefs:[{id:'blank',name:''},{id:'on-track',name:'On Track',color:'#22c55e',shortName:'G',emoji:''}],swimlanes:[]};
  const map={'On Track':'on-track'};
  const id=_resolveStatusForImport('On Track',proj,map);
  assert('matched status id',id,'on-track');
  assert('no new defs',proj.statusDefs.length,2);
}

section('_resolveStatusForImport — Create New');
{
  const proj={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const map={'In Progress':'__create__'};
  const id=_resolveStatusForImport('In Progress',proj,map);
  assertNeq('new id is not blank',id,'');
  assertNeq('new id is not __create__',id,'__create__');
  assert('statusDef added',proj.statusDefs.length,2);
  assert('new def name',proj.statusDefs[1].name,'In Progress');
  assert('new def shortName',proj.statusDefs[1].shortName,'I');
}

section('_resolveStatusForImport — Skip');
{
  const proj={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const map={'Unknown':''};
  const id=_resolveStatusForImport('Unknown',proj,map);
  assert('skip returns empty',id,'');
}

section('_resolveStatusForImport — Empty Value');
{
  const proj={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const map={};
  const id=_resolveStatusForImport('',proj,map);
  assert('empty value returns empty',id,'');
}

// ═══════════════════════════════════════════════════════════════════════════
const result=summary();
process.exit(result.failed?1:0);
