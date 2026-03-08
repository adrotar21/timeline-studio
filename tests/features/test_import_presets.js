#!/usr/bin/env node
/**
 * Timeline Studio -- Import Preset & Multi-Source Tests
 * Covers: detectSourceTool, parseDuration, lagTodays, mspDepType,
 *   parseCSV/parseTSV with real sample files, autoDetectMappings per tool,
 *   _buildMappedRows, _resolveSwimlaneName, _resolveStatusForImport,
 *   parsePredString, cross-config pipelines, edge cases
 *
 * ~175 tests across 10 sections
 */
const{assert,assertT,assertF,assertNeq,assertGte,assertLte,section,summary}=require('../helpers/assert');
const{U,App,resetApp}=require('../helpers/mock-engine');
const{makeProj,makeSwim,makeStatusDefs}=require('../helpers/builders');
const fs=require('fs');
const path=require('path');

const SAMPLES=path.join(__dirname,'..','import-samples');

// ─── Re-implemented pure functions from app.js (matching test_csv_import.js) ───

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

// ─── New functions for import preset testing ───

function attachImportedDepsWithCycleGuard(newItems,predStrings){
  const byRowNum=new Map(newItems.map((it,idx)=>[idx+1,it]));
  const adj=new Map();
  newItems.forEach(it=>adj.set(it.id,[]));
  newItems.forEach(it=>{
    for(const d of it.deps||[]){
      const pid=(typeof d==='string'?d:(d&&d.id)||'').toString().trim();
      if(pid&&adj.has(pid))adj.get(pid).push(it.id);
    }
  });

  const wouldCreateCycle=(itemId,predId)=>{
    if(!itemId||!predId)return false;
    if(itemId===predId)return true;
    const seen=new Set([itemId]);
    const queue=[itemId];
    while(queue.length){
      const cur=queue.shift();
      const next=adj.get(cur)||[];
      for(const nid of next){
        if(nid===predId)return true;
        if(!seen.has(nid)){seen.add(nid);queue.push(nid);}
      }
    }
    return false;
  };

  let added=0,skippedCircular=0;
  newItems.forEach((it,idx)=>{
    const preds=parsePredString((predStrings&&predStrings[idx])||'');
    preds.forEach(p=>{
      const predItem=byRowNum.get(p.rowNum);
      const predId=predItem?predItem.id:'';
      if(!predId||predId===it.id)return;
      if(wouldCreateCycle(it.id,predId)){skippedCircular++;return;}
      (it.deps||(it.deps=[])).push({id:predId,type:p.type||'FS',lag:p.lag||0});
      if(adj.has(predId))adj.get(predId).push(it.id);
      added++;
    });
  });

  return{added,skippedCircular};
}

const _IMP_PRESET_SIGS={
  msproject:{ext:['.xml'],headerPatterns:[],xmlRoot:'Project'},
  smartsheet:{ext:[],headerPatterns:[['Primary Column'],['Row ID','Predecessors']]},
  jira:{ext:[],headerPatterns:[['Issue key','Summary','Issue Type'],['Issue key','Summary']]},
  asana:{ext:[],headerPatterns:[['Task ID','Section/Column'],['Task ID','Assignee Email']]},
  monday:{ext:[],headerPatterns:[['Group','Person'],['Group','Timeline']]},
  generic:{ext:['.csv','.tsv'],headerPatterns:[]}
};

function detectSourceTool(filename,headers,content){
  const ext=path.extname(filename||'').toLowerCase();
  if(ext==='.xml'&&content&&content.trim().startsWith('<')){
    if(content.includes('<Project')&&content.includes('schemas.microsoft.com/project'))return{tool:'msproject',confidence:'high'};
  }
  if(headers&&headers.length>0){
    const hlSet=new Set(headers.map(h=>h.toLowerCase().trim()));
    for(const[tool,sig] of Object.entries(_IMP_PRESET_SIGS)){
      if(tool==='generic')continue;
      for(const pattern of sig.headerPatterns){
        const matches=pattern.filter(p=>hlSet.has(p.toLowerCase()));
        if(matches.length===pattern.length){
          return{tool,confidence:matches.length>=3?'high':'medium'};
        }
      }
    }
  }
  if(content&&!content.includes(',')&&content.includes('\t'))return{tool:'generic-tsv',confidence:'high'};
  if(headers){
    const mappings=autoDetectMappings(headers);
    if(_checkTLSReimport(mappings,headers))return{tool:'tls-reimport',confidence:'high'};
  }
  return{tool:'generic',confidence:'low'};
}

function parseDuration(str){
  if(!str||!str.trim())return null;
  const s=str.trim().toLowerCase();
  const iso=s.match(/^pt(\d+)h/i);
  if(iso)return Math.round(parseInt(iso[1])/8);
  const wk=s.match(/^(\d+)\s*w(?:eeks?)?$/);
  if(wk)return parseInt(wk[1])*5;
  const dy=s.match(/^(\d+)\s*d(?:ays?)?$/);
  if(dy)return parseInt(dy[1]);
  const hr=s.match(/^(\d+)\s*h(?:ours?)?$/);
  if(hr)return Math.round(parseInt(hr[1])/8);
  const num=s.match(/^(\d+)$/);
  if(num)return parseInt(num[1]);
  const ed=s.match(/^(\d+)\s*edays?$/i);
  if(ed)return parseInt(ed[1]);
  return null;
}

function lagTodays(tenthsOfMin){
  return Math.round(tenthsOfMin/4800);
}

function mspDepType(typeInt){
  const MAP={0:'FF',1:'FS',2:'SF',3:'SS'};
  return MAP[typeInt]||'FS';
}

// ═══════════════════════════════════════════════════════════════════════════
//  TESTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Section 1: File Loading & Format Detection ─────────────────────────
section('File Loading & Format Detection');
{
  // Load and verify sample files exist and are non-empty
  const ssSimple=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-simple.csv'),'utf8');
  assertT('smartsheet-simple.csv loads',ssSimple.length>0);

  const ssDeps=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-deps.csv'),'utf8');
  assertT('smartsheet-deps.csv loads',ssDeps.length>0);

  const ssComplex=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-complex.csv'),'utf8');
  assertT('smartsheet-complex.csv loads',ssComplex.length>0);

  const jiraSimple=fs.readFileSync(path.join(SAMPLES,'jira','jira-simple.csv'),'utf8');
  assertT('jira-simple.csv loads',jiraSimple.length>0);

  const jiraComplex=fs.readFileSync(path.join(SAMPLES,'jira','jira-complex.csv'),'utf8');
  assertT('jira-complex.csv loads',jiraComplex.length>0);

  const genTSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-tab-separated.tsv'),'utf8');
  assertT('generic-tab-separated.tsv loads',genTSV.length>0);

  const mspSimple=fs.readFileSync(path.join(SAMPLES,'msproject','msproject-simple.xml'),'utf8');
  assertT('msproject-simple.xml loads',mspSimple.length>0);

  const genLarge=fs.readFileSync(path.join(SAMPLES,'generic','generic-large.csv'),'utf8');
  assertT('generic-large.csv loads',genLarge.length>0);

  // Parse CSV files and verify row counts match README benchmarks
  const ssSimpleRows=parseCSV(ssSimple);
  assert('smartsheet-simple row count (incl header)',ssSimpleRows.length,6);
  assert('smartsheet-simple data rows',ssSimpleRows.length-1,5);

  const ssDepsRows=parseCSV(ssDeps);
  assert('smartsheet-deps data rows',ssDepsRows.length-1,8);

  const ssComplexRows=parseCSV(ssComplex);
  assert('smartsheet-complex data rows',ssComplexRows.length-1,15);

  const jiraSimpleRows=parseCSV(jiraSimple);
  assert('jira-simple data rows',jiraSimpleRows.length-1,6);

  // Parse TSV file and verify
  const genTSVRows=parseTSV(genTSV);
  assert('generic-tsv row count (incl header)',genTSVRows.length,9);
  assert('generic-tsv data rows',genTSVRows.length-1,8);
}

// ─── Section 2: Source Auto-Detection ───────────────────────────────────
section('Source Auto-Detection');
{
  // MS Project XML detection
  const mspContent=fs.readFileSync(path.join(SAMPLES,'msproject','msproject-simple.xml'),'utf8');
  const mspResult=detectSourceTool('project.xml',[],mspContent);
  assert('MS Project XML tool detected',mspResult.tool,'msproject');
  assert('MS Project XML confidence high',mspResult.confidence,'high');

  // MS Project with .xml ext but non-XML content
  const fakeMsp=detectSourceTool('file.xml',[],'<root>Not a project</root>');
  assert('non-MSP XML falls through',fakeMsp.tool,'generic');

  // MS Project with non-.xml extension
  const noXmlExt=detectSourceTool('project.csv',[],mspContent);
  assertNeq('XML content but csv ext not msproject',noXmlExt.tool,'msproject');

  // Smartsheet detection via "Row ID" + "Predecessors"
  const ssHeaders=['Row ID','Task Name','Start','Finish','Duration','Predecessors','% Complete','Assigned To'];
  const ssResult=detectSourceTool('export.csv',ssHeaders,'');
  assert('Smartsheet detected via Row ID+Predecessors',ssResult.tool,'smartsheet');
  assert('Smartsheet confidence medium',ssResult.confidence,'medium');

  // Jira detection via "Issue key" + "Summary" + "Issue Type"
  const jiraHeaders=['Summary','Issue key','Issue id','Issue Type','Status','Priority','Assignee'];
  const jiraResult=detectSourceTool('jira-export.csv',jiraHeaders,'');
  assert('Jira detected via 3-column pattern',jiraResult.tool,'jira');
  assert('Jira confidence high',jiraResult.confidence,'high');

  // Jira detection via 2-column pattern
  const jira2Headers=['Issue key','Summary','Status','Assignee'];
  const jira2Result=detectSourceTool('issues.csv',jira2Headers,'');
  assert('Jira detected via 2-column pattern',jira2Result.tool,'jira');
  assert('Jira 2-col confidence medium',jira2Result.confidence,'medium');

  // Asana detection via "Task ID" + "Section/Column"
  const asanaHeaders=['Task ID','Created At','Completed At','Last Modified','Name','Section/Column','Assignee','Assignee Email','Start Date','Due Date','Tags','Notes'];
  const asanaResult=detectSourceTool('asana.csv',asanaHeaders,'');
  assert('Asana detected via Task ID+Section/Column',asanaResult.tool,'asana');
  assert('Asana confidence medium',asanaResult.confidence,'medium');

  // Asana detection via "Task ID" + "Assignee Email"
  const asana2Headers=['Task ID','Name','Assignee Email','Due Date'];
  const asana2Result=detectSourceTool('asana.csv',asana2Headers,'');
  assert('Asana detected via Task ID+Assignee Email',asana2Result.tool,'asana');

  // Monday detection via "Group" + "Person"
  const mondayHeaders=['Name','Group','Person','Status','Date','Priority','Notes'];
  const mondayResult=detectSourceTool('monday.csv',mondayHeaders,'');
  assert('Monday detected via Group+Person',mondayResult.tool,'monday');
  assert('Monday confidence medium',mondayResult.confidence,'medium');

  // Monday detection via "Group" + "Timeline"
  const monday2Headers=['Name','Group','Timeline','Status'];
  const monday2Result=detectSourceTool('monday.csv',monday2Headers,'');
  assert('Monday detected via Group+Timeline',monday2Result.tool,'monday');

  // TSV detection (tabs present, no commas)
  const tsvContent='Name\tStart\tEnd\nTask A\t2026-01-01\t2026-01-15';
  const tsvResult=detectSourceTool('data.tsv',[],tsvContent);
  assert('TSV auto-detected',tsvResult.tool,'generic-tsv');
  assert('TSV confidence high',tsvResult.confidence,'high');

  // TLS reimport detection
  const tlsHeaders=['Name','Owner','Type','Start','End','Duration','Swimlane','Sub-Swimlane','Row','Color','Progress','Pinned','Hidden','Notes','Predecessors','Status'];
  const tlsResult=detectSourceTool('export.csv',tlsHeaders,'');
  assert('TLS reimport detected',tlsResult.tool,'tls-reimport');
  assert('TLS reimport confidence high',tlsResult.confidence,'high');

  // Generic CSV fallback
  const genericHeaders=['Task','Date','Person'];
  const genericResult=detectSourceTool('data.csv',genericHeaders,'');
  assert('Generic CSV fallback',genericResult.tool,'generic');
  assert('Generic CSV confidence low',genericResult.confidence,'low');

  // Empty headers
  const emptyResult=detectSourceTool('file.csv',[],'a,b,c\n1,2,3');
  assert('Empty headers fallback to generic',emptyResult.tool,'generic');

  // Case insensitivity of header matching
  const jiraLC=['issue key','summary','issue type','status'];
  const jiraLCResult=detectSourceTool('jira.csv',jiraLC,'');
  assert('Jira case-insensitive detection',jiraLCResult.tool,'jira');

  // Headers with whitespace
  const asanaWS=['Task ID ',' Section/Column','Name'];
  const asanaWSResult=detectSourceTool('asana.csv',asanaWS,'');
  assert('Asana headers with whitespace',asanaWSResult.tool,'asana');
}

// ─── Section 3: Preset Column Mapping ───────────────────────────────────
section('Preset Column Mapping');
{
  // Smartsheet headers
  const ssH=['Row ID','Task Name','Start','Finish','Duration','Predecessors','% Complete','Assigned To'];
  const ssM=autoDetectMappings(ssH);
  assertT('SS: Task Name -> Name',ssM.some(m=>m.tgtField==='Name'&&m.srcIdx===1));
  assertT('SS: Start -> Start',ssM.some(m=>m.tgtField==='Start'&&m.srcIdx===2));
  assertT('SS: Finish -> End',ssM.some(m=>m.tgtField==='End'&&m.srcIdx===3));
  assertT('SS: Duration -> Duration',ssM.some(m=>m.tgtField==='Duration'&&m.srcIdx===4));
  assertT('SS: Predecessors -> Predecessors',ssM.some(m=>m.tgtField==='Predecessors'&&m.srcIdx===5));
  assertT('SS: % Complete -> Progress',ssM.some(m=>m.tgtField==='Progress'&&m.srcIdx===6));
  assertT('SS: Assigned To -> Owner',ssM.some(m=>m.tgtField==='Owner'&&m.srcIdx===7));
  assert('SS: 7 fields mapped',ssM.length,7);

  // Jira headers — "Summary" is not in Name aliases (only "description" is),
  // and "Issue Type" is not in Type aliases (only "item type" is).
  // These Jira-specific columns require preset overrides in the real import UI.
  const jH=['Summary','Issue key','Issue id','Issue Type','Status','Priority','Assignee','Reporter','Created','Updated'];
  const jM=autoDetectMappings(jH);
  assertF('Jira: Summary not auto-mapped to Name',jM.some(m=>m.tgtField==='Name'));
  assertF('Jira: Issue Type not auto-mapped to Type',jM.some(m=>m.tgtField==='Type'));
  assertT('Jira: Status -> Status',jM.some(m=>m.tgtField==='Status'&&m.srcIdx===4));
  assertT('Jira: Assignee -> Owner',jM.some(m=>m.tgtField==='Owner'&&m.srcIdx===6));

  // Asana headers
  const aH=['Task ID','Created At','Completed At','Last Modified','Name','Section/Column','Assignee','Assignee Email','Start Date','Due Date','Tags','Notes'];
  const aM=autoDetectMappings(aH);
  assertT('Asana: Name -> Name',aM.some(m=>m.tgtField==='Name'&&m.srcIdx===4));
  assertT('Asana: Assignee -> Owner',aM.some(m=>m.tgtField==='Owner'&&m.srcIdx===6));
  assertT('Asana: Start Date -> Start',aM.some(m=>m.tgtField==='Start'&&m.srcIdx===8));
  assertT('Asana: Due Date -> End',aM.some(m=>m.tgtField==='End'&&m.srcIdx===9));
  assertT('Asana: Notes -> Notes',aM.some(m=>m.tgtField==='Notes'&&m.srcIdx===11));

  // Monday headers
  const mH=['Name','Group','Person','Status','Date','Priority','Notes'];
  const mM=autoDetectMappings(mH);
  assertT('Monday: Name -> Name',mM.some(m=>m.tgtField==='Name'&&m.srcIdx===0));
  assertT('Monday: Group -> Swimlane',mM.some(m=>m.tgtField==='Swimlane'&&m.srcIdx===1));
  assertT('Monday: Status -> Status',mM.some(m=>m.tgtField==='Status'&&m.srcIdx===3));
  assertT('Monday: Notes -> Notes',mM.some(m=>m.tgtField==='Notes'&&m.srcIdx===6));

  // Generic headers
  const gH=['Task','From','To','Resource'];
  const gM=autoDetectMappings(gH);
  assertT('Generic: Task -> Name',gM.some(m=>m.tgtField==='Name'));
  assertT('Generic: From -> Start (alias)',gM.some(m=>m.tgtField==='Start'));
  assertT('Generic: To -> End (alias)',gM.some(m=>m.tgtField==='End'));

  // Full TLS reimport (all 22 columns)
  const allH=['Name','Owner','Type','Start Date','End Date','Duration','Swimlane','Sub-Swimlane','Row','Predecessors','Status','StatusDate','Progress','Notes','Color','Pinned','Hidden','LabelPos','FontSize','TextColor','DateFormat','ShowDate'];
  const allM=autoDetectMappings(allH);
  assertT('TLS full reimport check',_checkTLSReimport(allM,allH));
  assert('TLS all 22 columns mapped',allM.length,22);

  // Case insensitivity
  const ciH=['NAME','start date','END DATE','OWNER','duration'];
  const ciM=autoDetectMappings(ciH);
  assertT('CI: NAME -> Name',ciM.some(m=>m.tgtField==='Name'));
  assertT('CI: start date -> Start',ciM.some(m=>m.tgtField==='Start'));
  assertT('CI: END DATE -> End',ciM.some(m=>m.tgtField==='End'));

  // Unknown columns not mapped
  const unkH=['Name','Custom XYZ','Unknown Field','Random Col'];
  const unkM=autoDetectMappings(unkH);
  assert('Only known fields mapped',unkM.length,1);
  assert('Unknown columns skipped',unkM[0].tgtField,'Name');
}

// ─── Section 4: CSV/TSV Parsing with Sample Files ───────────────────────
section('CSV/TSV Parsing with Sample Files');
{
  // smartsheet-simple.csv: 5 data rows, correct columns
  const ssText=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-simple.csv'),'utf8');
  const ssRows=parseCSV(ssText);
  assert('ss-simple: 6 total rows',ssRows.length,6);
  assert('ss-simple: header has 6 cols',ssRows[0].length,6);
  assert('ss-simple: first col is Row ID',ssRows[0][0],'Row ID');
  assert('ss-simple: first data name',ssRows[1][1],'Project Kickoff');
  assert('ss-simple: last data name',ssRows[5][1],'Launch');

  // smartsheet-deps.csv: 8 rows, predecessor column populated
  const sdText=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-deps.csv'),'utf8');
  const sdRows=parseCSV(sdText);
  assert('ss-deps: 8 data rows',sdRows.length-1,8);
  assert('ss-deps: header has Predecessors',sdRows[0][5],'Predecessors');
  assert('ss-deps: row 2 predecessor',sdRows[2][5],'2');
  assert('ss-deps: row 3 predecessor SS',sdRows[3][5],'2SS');
  assert('ss-deps: row 4 predecessor FS+lag',sdRows[4][5],'3FS+2d');

  // smartsheet-complex.csv: quoted fields with commas
  const scText=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-complex.csv'),'utf8');
  const scRows=parseCSV(scText);
  assert('ss-complex: 15 data rows',scRows.length-1,15);
  assert('ss-complex: header has 12 cols',scRows[0].length,12);
  // Verify a quoted field with comma is parsed correctly
  assertT('ss-complex: quoted comment parsed',scRows[1][9].includes('review'));

  // jira-simple.csv: 6 rows, datetime fields
  const jsText=fs.readFileSync(path.join(SAMPLES,'jira','jira-simple.csv'),'utf8');
  const jsRows=parseCSV(jsText);
  assert('jira-simple: 6 data rows',jsRows.length-1,6);
  assert('jira-simple: first issue key',jsRows[1][1],'PROJ-1');
  assert('jira-simple: first issue type',jsRows[1][3],'Epic');
  assertT('jira-simple: datetime field present',jsRows[1][8].includes('T'));

  // jira-complex.csv: multi-line descriptions in quoted fields
  const jcText=fs.readFileSync(path.join(SAMPLES,'jira','jira-complex.csv'),'utf8');
  const jcRows=parseCSV(jcText);
  assert('jira-complex: 10 data rows',jcRows.length-1,10);
  // Row 1 (first data) has multi-line description
  assertT('jira-complex: multi-line description',jcRows[1][11].includes('\n'));

  // generic-special-chars.csv: Unicode, embedded quotes, multi-line fields
  const gscText=fs.readFileSync(path.join(SAMPLES,'generic','generic-special-chars.csv'),'utf8');
  const gscRows=parseCSV(gscText);
  assert('generic-special: 7 data rows',gscRows.length-1,7);
  assertT('generic-special: unicode char preserved',gscRows[3][0].includes('\u65E5\u672C\u8A9E'));
  assert('generic-special: embedded quotes',gscRows[4][0],'Task with "quoted" name');
  assertT('generic-special: multi-line name',gscRows[5][0].includes('\n'));
  assertT('generic-special: accented chars',gscRows[6][0].includes('\u00E9'));

  // generic-empty-rows.csv: blank rows filtered, 5 data rows
  const gerText=fs.readFileSync(path.join(SAMPLES,'generic','generic-empty-rows.csv'),'utf8');
  const gerRows=parseCSV(gerText);
  // Count non-blank data rows (exclude header and empty rows)
  const gerDataRows=gerRows.slice(1).filter(r=>r.some(c=>c!==''));
  assert('generic-empty-rows: 5 non-blank data rows',gerDataRows.length,5);

  // generic-tab-separated.tsv with parseTSV
  const gtText=fs.readFileSync(path.join(SAMPLES,'generic','generic-tab-separated.tsv'),'utf8');
  const gtRows=parseTSV(gtText);
  assert('generic-tsv: 8 data rows',gtRows.length-1,8);
  assert('generic-tsv: header col count',gtRows[0].length,7);
  assert('generic-tsv: first data name',gtRows[1][0],'Project Kickoff');
  assert('generic-tsv: last data name',gtRows[8][0],'Production Deployment');
}

// ─── Section 5: Predecessor Parsing Variations ──────────────────────────
section('Predecessor Parsing Variations');
{
  // Standard: "3FS+2d"
  const p1=parsePredString('3FS+2d');
  assert('standard pred count',p1.length,1);
  assert('standard rowNum',p1[0].rowNum,3);
  assert('standard type',p1[0].type,'FS');
  assert('standard lag',p1[0].lag,2);

  // Compact: "3FS" no lag
  const p2=parsePredString('3FS');
  assert('compact type',p2[0].type,'FS');
  assert('compact lag zero',p2[0].lag,0);

  // Number only: "3"
  const p3=parsePredString('3');
  assert('number only rowNum',p3[0].rowNum,3);
  assert('number only default FS',p3[0].type,'FS');
  assert('number only default lag 0',p3[0].lag,0);

  // Multiple: "3FS+2d, 5SS-1d"
  const p4=parsePredString('3FS+2d, 5SS-1d');
  assert('multi pred count',p4.length,2);
  assert('multi pred 1 row',p4[0].rowNum,3);
  assert('multi pred 1 type',p4[0].type,'FS');
  assert('multi pred 1 lag',p4[0].lag,2);
  assert('multi pred 2 row',p4[1].rowNum,5);
  assert('multi pred 2 type',p4[1].type,'SS');
  assert('multi pred 2 lag',p4[1].lag,-1);

  // All four types
  const pFS=parsePredString('1FS');
  assert('FS type',pFS[0].type,'FS');
  const pSS=parsePredString('2SS');
  assert('SS type',pSS[0].type,'SS');
  const pFF=parsePredString('3FF');
  assert('FF type',pFF[0].type,'FF');
  const pSF=parsePredString('4SF');
  assert('SF type',pSF[0].type,'SF');

  // Negative lag: "3FS-3d"
  const p5=parsePredString('3FS-3d');
  assert('negative lag',p5[0].lag,-3);

  // Whitespace tolerance
  const p6=parsePredString(' 3 FS + 2d ');
  assert('whitespace pred count',p6.length,1);
  assert('whitespace rowNum',p6[0].rowNum,3);

  // Empty string
  assert('empty string',parsePredString('').length,0);

  // Null
  assert('null',parsePredString(null).length,0);

  // Invalid: "abc"
  assert('invalid "abc"',parsePredString('abc').length,0);

  // Mixed valid/invalid
  const p7=parsePredString('abc,2,xyz,5FS');
  assert('mixed valid/invalid count',p7.length,2);
  assert('mixed valid part 1',p7[0].rowNum,2);
  assert('mixed valid part 2',p7[1].rowNum,5);
}

// ─── Section 6: Duration Parsing ────────────────────────────────────────
section('Duration Parsing');
{
  // Plain number
  assert('plain number "5"',parseDuration('5'),5);
  assert('plain number "0"',parseDuration('0'),0);
  assert('plain number "100"',parseDuration('100'),100);

  // Days variants
  assert('"5d" -> 5',parseDuration('5d'),5);
  assert('"5 days" -> 5',parseDuration('5 days'),5);
  assert('"5 day" -> 5',parseDuration('5 day'),5);
  assert('"0d" -> 0',parseDuration('0d'),0);

  // Weeks
  assert('"2w" -> 10',parseDuration('2w'),10);
  assert('"2 weeks" -> 10',parseDuration('2 weeks'),10);
  assert('"1 week" -> 5',parseDuration('1 week'),5);

  // Hours
  assert('"16h" -> 2',parseDuration('16h'),2);
  assert('"16 hours" -> 2',parseDuration('16 hours'),2);
  assert('"8h" -> 1',parseDuration('8h'),1);

  // ISO 8601 durations (MS Project format)
  assert('"PT40H0M0S" -> 5',parseDuration('PT40H0M0S'),5);
  assert('"PT80H0M0S" -> 10',parseDuration('PT80H0M0S'),10);
  assert('"PT0H0M0S" -> 0',parseDuration('PT0H0M0S'),0);
  assert('"PT176H0M0S" -> 22',parseDuration('PT176H0M0S'),22);

  // Empty/null
  assert('empty string -> null',parseDuration(''),null);
  assert('null -> null',parseDuration(null),null);
  assert('whitespace only -> null',parseDuration('   '),null);

  // Elapsed days
  assert('"5 edays" -> 5',parseDuration('5 edays'),5);
  assert('"10eDays" -> 10',parseDuration('10eDays'),10);

  // MS Project lag conversion
  assert('lagTodays(4800) -> 1 day',lagTodays(4800),1);
  assert('lagTodays(-4800) -> -1 day',lagTodays(-4800),-1);
  assert('lagTodays(9600) -> 2 days',lagTodays(9600),2);
  assert('lagTodays(0) -> 0',lagTodays(0),0);
  assert('lagTodays(480) -> 0 (sub-day)',lagTodays(480),0);

  // MS Project dep type conversion
  assert('mspDepType(0) -> FF',mspDepType(0),'FF');
  assert('mspDepType(1) -> FS',mspDepType(1),'FS');
  assert('mspDepType(2) -> SF',mspDepType(2),'SF');
  assert('mspDepType(3) -> SS',mspDepType(3),'SS');
  assert('mspDepType(99) -> FS default',mspDepType(99),'FS');
  assert('mspDepType(undefined) -> FS',mspDepType(undefined),'FS');
}

// ─── Section 7: Swimlane & Status Resolution ───────────────────────────
section('Swimlane & Status Resolution');
{
  // _resolveSwimlaneName with existing swimlane
  const proj1={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  assert('existing swimlane match',_resolveSwimlaneName('Engineering',proj1),'sl1');
  assert('no new swimlane created',proj1.swimlanes.length,1);

  // Case insensitive match
  const proj2={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  assert('case insensitive match',_resolveSwimlaneName('engineering',proj2),'sl1');
  assert('case insensitive no duplicate',proj2.swimlanes.length,1);

  // Whitespace trimming
  const proj2b={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  assert('whitespace trimmed match',_resolveSwimlaneName(' Engineering ',proj2b),'sl1');

  // Auto create new swimlane
  const proj3={swimlanes:[{id:'sl1',name:'Engineering',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const newId=_resolveSwimlaneName('Design',proj3);
  assertNeq('new swimlane id != existing',newId,'sl1');
  assert('swimlane count after create',proj3.swimlanes.length,2);
  assert('new swimlane name',proj3.swimlanes[1].name,'Design');

  // Empty name returns first swimlane
  const proj4={swimlanes:[{id:'sl1',name:'Default',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  assert('empty name -> default swimlane',_resolveSwimlaneName('',proj4),'sl1');
  assert('null name -> default swimlane',_resolveSwimlaneName(null,proj4),'sl1');

  // Duplicate names merge into same lane
  const proj5={swimlanes:[{id:'sl1',name:'Dev',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  const id1=_resolveSwimlaneName('Dev',proj5);
  const id2=_resolveSwimlaneName('Dev',proj5);
  assert('duplicate names return same id',id1,id2);
  assert('no duplicate swimlane',proj5.swimlanes.length,1);

  // Status: matched
  const projS1={statusDefs:[{id:'blank',name:''},{id:'on-track',name:'On Track',color:'#22c55e',shortName:'G',emoji:''}],swimlanes:[]};
  const mapS1={'On Track':'on-track'};
  assert('status matched id',_resolveStatusForImport('On Track',projS1,mapS1),'on-track');
  assert('status no new defs',projS1.statusDefs.length,2);

  // Status: create new
  const projS2={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const mapS2={'In Progress':'__create__'};
  const newSid=_resolveStatusForImport('In Progress',projS2,mapS2);
  assertNeq('new status id not empty',newSid,'');
  assertNeq('new status id not __create__',newSid,'__create__');
  assert('statusDef added',projS2.statusDefs.length,2);
  assert('new def name',projS2.statusDefs[1].name,'In Progress');
  assert('new def shortName',projS2.statusDefs[1].shortName,'I');

  // Status: skip (mapped to empty)
  const projS3={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const mapS3={'Unknown':''};
  assert('skip returns empty',_resolveStatusForImport('Unknown',projS3,mapS3),'');

  // Status: empty value
  assert('empty value returns empty',_resolveStatusForImport('',{statusDefs:[],swimlanes:[]},{}),'');

  // Status: __create__ invoked twice for same value reuses the created def
  const projS4={statusDefs:[{id:'blank',name:''}],swimlanes:[]};
  const mapS4={'Blocked':'__create__'};
  const sid1=_resolveStatusForImport('Blocked',projS4,mapS4);
  const sid2=_resolveStatusForImport('Blocked',projS4,mapS4);
  assert('create then reuse same id',sid1,sid2);
  assert('only one def created',projS4.statusDefs.length,2);
}

// ─── Section 8: Mapped Row Building ─────────────────────────────────────
section('Mapped Row Building');
{
  // Build from smartsheet-simple data with correct mappings
  const ssText=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-simple.csv'),'utf8');
  const ssRows=parseCSV(ssText);
  const ssHeaders=ssRows[0];
  const ssMappings=autoDetectMappings(ssHeaders);
  const ssData={headers:ssHeaders,rows:ssRows.slice(1)};
  const ssMapped=_buildMappedRows(ssData,ssMappings,[]);
  assert('ss mapped row count',ssMapped.length,5);
  assert('ss mapped first Name',ssMapped[0].Name,'Project Kickoff');
  assert('ss mapped first Start',ssMapped[0].Start,'01/05/2026');
  assert('ss mapped first Owner',ssMapped[0].Owner,'Sarah Chen');
  assert('ss mapped last Name',ssMapped[4].Name,'Launch');

  // Build with overloaded columns
  const ovData={headers:['First','Last','Role'],rows:[['Alice','Kim','Dev'],['Bob','Lee','PM']]};
  const ovMappings=[{srcIdx:2,tgtField:'Type',color:'#3b82f6'}];
  const ovOverloads=[{srcIdxs:[0,1],tgtField:'Name',delimiters:[' ']}];
  const ovMapped=_buildMappedRows(ovData,ovMappings,ovOverloads);
  assert('overloaded Name combined',ovMapped[0].Name,'Alice Kim');
  assert('overloaded Name row 2',ovMapped[1].Name,'Bob Lee');
  assert('1:1 mapping still works',ovMapped[0].Type,'Dev');

  // Overloads with prefix/delimiter
  const pfxData={headers:['Dept','Name'],rows:[['Eng','Alice'],['PM','Bob']]};
  const pfxOverloads=[{srcIdxs:[0,1],tgtField:'Notes',delimiters:[': '],prefixes:['Dept: ','']}];
  const pfxMapped=_buildMappedRows(pfxData,[],pfxOverloads);
  assert('prefix+delimiter overload',pfxMapped[0].Notes,'Dept: Eng: Alice');

  // Verify all 22 field types from generic-all-fields.csv
  const gafText=fs.readFileSync(path.join(SAMPLES,'generic','generic-all-fields.csv'),'utf8');
  const gafRows=parseCSV(gafText);
  const gafHeaders=gafRows[0];
  const gafMappings=autoDetectMappings(gafHeaders);
  const gafData={headers:gafHeaders,rows:gafRows.slice(1)};
  const gafMapped=_buildMappedRows(gafData,gafMappings,[]);
  assert('all-fields mapped row count',gafMapped.length,13);
  assertT('all-fields has Name',gafMapped[0].Name!==undefined);
  assertT('all-fields has Start',gafMapped[1].Start!==undefined);
  assertT('all-fields has End',gafMapped[1].End!==undefined);
  assertT('all-fields has Swimlane',gafMapped[0].Swimlane!==undefined);
  assertT('all-fields has Status',gafMapped[0].Status!==undefined);
  assertT('all-fields has Notes',gafMapped[0].Notes!==undefined);
  assertT('all-fields has Color',gafMapped[0].Color!==undefined);
  assertT('all-fields has Predecessors',gafMapped[2].Predecessors!==undefined);

  // Missing column (srcIdx out of range)
  const shortData={headers:['A','B'],rows:[['x']]};
  const shortMappings=[{srcIdx:0,tgtField:'Name',color:'#3b82f6'},{srcIdx:5,tgtField:'Owner',color:'#22c55e'}];
  const shortMapped=_buildMappedRows(shortData,shortMappings,[]);
  assert('valid idx mapped',shortMapped[0].Name,'x');
  assertF('out-of-range idx not present','Owner' in shortMapped[0]);

  // Null impData returns empty
  assert('null impData returns empty',_buildMappedRows(null,[],[]).length,0);
}

// ─── Section 9: Cross-Configuration ─────────────────────────────────────
section('Cross-Configuration');
{
  // Smartsheet CSV end-to-end: parseCSV -> autoDetect -> verify Smartsheet detected
  const ssCSV=fs.readFileSync(path.join(SAMPLES,'smartsheet','smartsheet-deps.csv'),'utf8');
  const ssP=parseCSV(ssCSV);
  const ssD=detectSourceTool('smartsheet-export.csv',ssP[0],'');
  assert('smartsheet cross-config detected',ssD.tool,'smartsheet');

  // Jira CSV end-to-end
  const jiraCSV=fs.readFileSync(path.join(SAMPLES,'jira','jira-simple.csv'),'utf8');
  const jiraP=parseCSV(jiraCSV);
  const jiraD=detectSourceTool('jira.csv',jiraP[0],'');
  assert('jira cross-config detected',jiraD.tool,'jira');

  // Generic all-fields -> TLS reimport
  const gafCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-all-fields.csv'),'utf8');
  const gafP=parseCSV(gafCSV);
  const gafM=autoDetectMappings(gafP[0]);
  assertT('all-fields is TLS reimport',_checkTLSReimport(gafM,gafP[0]));

  // TLS reimport file explicit
  const tlsCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-tls-reimport.csv'),'utf8');
  const tlsP=parseCSV(tlsCSV);
  const tlsD=detectSourceTool('export.csv',tlsP[0],'');
  assert('tls-reimport detected from file',tlsD.tool,'tls-reimport');
  assert('tls-reimport data rows',tlsP.length-1,6);

  // Large CSV (100 items): parseCSV -> verify 100 data rows
  const largeCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-large.csv'),'utf8');
  const largeP=parseCSV(largeCSV);
  assert('large CSV 100 data rows',largeP.length-1,100);
  // Verify correct column count
  assert('large CSV 9 columns',largeP[0].length,9);

  // TSV file -> parseTSV -> detect
  const tsvContent=fs.readFileSync(path.join(SAMPLES,'generic','generic-tab-separated.tsv'),'utf8');
  const tsvP=parseTSV(tsvContent);
  assert('TSV cross-config row count',tsvP.length-1,8);
  assert('TSV first header',tsvP[0][0],'Task Name');

  // Dates-ISO: verify ISO dates parse as strings
  const isoCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-dates-iso.csv'),'utf8');
  const isoP=parseCSV(isoCSV);
  assert('dates-iso data rows',isoP.length-1,6);
  assertT('dates-iso YYYY-MM-DD format',isoP[1][1].match(/^\d{4}-\d{2}-\d{2}$/)!==null);

  // deps-all-types: parsePredString on predecessor fields
  const depsCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-deps-all-types.csv'),'utf8');
  const depsP=parseCSV(depsCSV);
  // Row 2 (data[1]) has "1FS"
  const dep1=parsePredString(depsP[2][3]);
  assert('deps-all: row 2 type FS',dep1[0].type,'FS');
  // Row 3 has "2SS+5d"
  const dep2=parsePredString(depsP[3][3]);
  assert('deps-all: row 3 type SS',dep2[0].type,'SS');
  assert('deps-all: row 3 lag +5',dep2[0].lag,5);
  // Row 5 has "3FF,4FF"
  const dep4=parsePredString(depsP[5][3]);
  assert('deps-all: row 5 multi-FF count',dep4.length,2);
  assert('deps-all: row 5 first FF',dep4[0].type,'FF');
  // Row 11 has negative lag "10FS-1d"
  const dep10=parsePredString(depsP[11][3]);
  assert('deps-all: negative lag row 11',dep10[0].lag,-1);

  // Asana file parsed and mapped
  const asanaCSV=fs.readFileSync(path.join(SAMPLES,'asana','asana-simple.csv'),'utf8');
  const asanaP=parseCSV(asanaCSV);
  const asanaM=autoDetectMappings(asanaP[0]);
  assertT('asana: Name mapped',asanaM.some(m=>m.tgtField==='Name'));
  assertT('asana: Start mapped',asanaM.some(m=>m.tgtField==='Start'));
  assertT('asana: End mapped',asanaM.some(m=>m.tgtField==='End'));
}

// ─── Section 10: Edge Cases ─────────────────────────────────────────────
section('Edge Cases');
{
  // Empty file content
  const emptyRows=parseCSV('');
  assert('empty file -> 0 rows',emptyRows.length,0);

  // Header-only CSV
  const headerOnly=parseCSV('Name,Start,End\n');
  assert('header-only row count',headerOnly.length,1);
  assert('header-only 0 data rows',headerOnly.length-1,0);

  // No-header CSV (data rows present, positional)
  const nhCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-no-header.csv'),'utf8');
  const nhRows=parseCSV(nhCSV);
  assert('no-header: rows present',nhRows.length,6);
  assert('no-header: first row first col',nhRows[0][0],'Project Kickoff');

  // Large file performance (100 rows parsed)
  const t0=Date.now();
  const lgCSV=fs.readFileSync(path.join(SAMPLES,'generic','generic-large.csv'),'utf8');
  const lgRows=parseCSV(lgCSV);
  const t1=Date.now();
  assert('large file: 100 data rows',lgRows.length-1,100);
  assertT('large file: parsed in <1000ms',(t1-t0)<1000);

  // BOM handling: prepend BOM to CSV, verify it can still be parsed
  const bomCSV='\uFEFF'+'Name,Start\nTask A,2026-01-01';
  const bomRows=parseCSV(bomCSV);
  assert('BOM: 2 rows parsed',bomRows.length,2);
  // The header might include BOM char; just verify data is intact
  assertT('BOM: data row intact',bomRows[1][0]==='Task A');

  // CRLF vs LF vs CR line endings
  const crlfCSV='Name,Start\r\nA,2026-01-01\r\nB,2026-01-02';
  assert('CRLF: 3 rows',parseCSV(crlfCSV).length,3);
  const lfCSV='Name,Start\nA,2026-01-01\nB,2026-01-02';
  assert('LF: 3 rows',parseCSV(lfCSV).length,3);
  const crCSV='Name,Start\rA,2026-01-01\rB,2026-01-02';
  assert('CR: 3 rows',parseCSV(crCSV).length,3);

  // CSV with more columns than header
  const extraCols=parseCSV('A,B\n1,2,3,4');
  assert('extra cols: row 2 has 4 cols',extraCols[1].length,4);
  assert('extra cols: header has 2',extraCols[0].length,2);

  // CSV with fewer columns than header
  const fewerCols=parseCSV('A,B,C,D\n1,2');
  assert('fewer cols: data row has 2',fewerCols[1].length,2);
  assert('fewer cols: header has 4',fewerCols[0].length,4);

  // detectSourceTool with null/undefined filename and partial-match headers
  // (only 2 of 4 match, so not TLS reimport, falls to generic)
  const nullFile=detectSourceTool(null,['Name','Start','Custom1','Custom2'],'');
  assert('null filename -> generic',nullFile.tool,'generic');

  // detectSourceTool with empty everything
  const emptyAll=detectSourceTool('',[],'');
  assert('empty everything -> generic',emptyAll.tool,'generic');

  // parsePredString semicolons
  const semiPred=parsePredString('1FS;2SS+3d;3FF-1d');
  assert('semicolons: 3 preds',semiPred.length,3);
  assert('semicolons: last type FF',semiPred[2].type,'FF');
  assert('semicolons: last lag -1',semiPred[2].lag,-1);

  // Multiple swimlane creates in sequence
  const projML={swimlanes:[{id:'sl1',name:'Default',color:'#000',height:120,subSwimlanes:[],collapsed:'expanded'}],statusDefs:[]};
  _resolveSwimlaneName('Alpha',projML);
  _resolveSwimlaneName('Beta',projML);
  _resolveSwimlaneName('Gamma',projML);
  assert('3 new swimlanes created',projML.swimlanes.length,4);
  assert('swimlane names correct',projML.swimlanes[3].name,'Gamma');
}

// ═══════════════════════════════════════════════════════════════════════════
section('Import Dependency Cycle Guard');
{
  const direct=[
    {id:'d1',deps:[]},
    {id:'d2',deps:[]},
  ];
  const directRes=attachImportedDepsWithCycleGuard(direct,['2FS','1FS']);
  assert('direct cycle: one edge added',directRes.added,1);
  assert('direct cycle: one edge skipped',directRes.skippedCircular,1);
  assert('direct cycle: row1 keeps dep on row2',direct[0].deps[0].id,'d2');
  assert('direct cycle: row2 dep skipped',direct[1].deps.length,0);

  const transitive=[
    {id:'t1',deps:[]},
    {id:'t2',deps:[]},
    {id:'t3',deps:[]},
  ];
  // 3->1, 1->2, 2->3 would form a cycle; third link must be skipped
  const transitiveRes=attachImportedDepsWithCycleGuard(transitive,['3FS','1FS','2FS']);
  assert('transitive cycle: two edges added',transitiveRes.added,2);
  assert('transitive cycle: one edge skipped',transitiveRes.skippedCircular,1);
  assert('transitive: row1 depends on row3',transitive[0].deps[0].id,'t3');
  assert('transitive: row2 depends on row1',transitive[1].deps[0].id,'t1');
  assert('transitive: row3 dep skipped',transitive[2].deps.length,0);

  const nonCycle=[
    {id:'n1',deps:[]},
    {id:'n2',deps:[]},
    {id:'n3',deps:[]},
  ];
  const nonCycleRes=attachImportedDepsWithCycleGuard(nonCycle,['','1FS','1SS+2d']);
  assert('non-cycle: all links added',nonCycleRes.added,2);
  assert('non-cycle: no skipped links',nonCycleRes.skippedCircular,0);
  assert('non-cycle: type preserved',nonCycle[2].deps[0].type,'SS');
  assert('non-cycle: lag preserved',nonCycle[2].deps[0].lag,2);
}

const result=summary();
process.exit(result.failed?1:0);
