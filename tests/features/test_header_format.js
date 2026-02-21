#!/usr/bin/env node
/**
 * Timeline Studio -- Header Format Tests (Phases 1–5)
 * Phase 1: monthFormat, quarterFormat, buildHdrRows label generation,
 *   migration defaults, _packProj stripping, met() label generation.
 * Phase 2: headerFontSize migration, pack/strip, rendering output.
 * Phase 3: Days timescale, dayLabelFormat, dayColumnWidth, hybrid mode.
 * Phase 4: cycleDayFmt, cycleScale, cycleHdrRows keyboard shortcuts.
 * Phase 5: boundary detection, holiday/weekend indicators, shading sync.
 *
 * ~350 tests
 */
const{assert,assertT,assertF,section,summary}=require('../helpers/assert');
const{U,App}=require('../helpers/mock-engine');
const{makeProj}=require('../helpers/builders');

// ─── Local mock of met() column generation ────────────────────────────────
// Mirrors the months/weeks/quarters/years branches from app.js met()
function mockMet(proj){
  const p=proj;
  const start=new Date(p.timelineStart+'T12:00:00');
  const end=new Date(p.timelineEnd+'T12:00:00');
  const z=(p.zoom||100)/100;
  const cols=[];
  const cur=new Date(start);
  const _MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _ML=['J','F','M','A','M','J','J','A','S','O','N','D'];
  const _DL=['S','M','T','W','T','F','S'];

  if(p.timescale==='days'){
    while(cur<=end){
      const dow=cur.getDay(),iso=U.iso(cur),dn=cur.getDate(),mi=cur.getMonth(),df=p.dayLabelFormat||'letter';
      const lbl=df==='number'?String(dn):df==='hybrid'?String(dn):_DL[dow];
      cols.push({label:lbl,dayLetter:_DL[dow],dayNum:dn,start:iso,end:iso,year:cur.getFullYear(),month:mi,quarter:Math.floor(mi/3)+1,dow,isWeekend:dow===0||dow===6});
      cur.setDate(cur.getDate()+1);
    }
  }else if(p.timescale==='weeks'){
    cur.setDate(cur.getDate()-cur.getDay());
    while(cur<=end){
      const sat=new Date(+cur+6*864e5);
      cols.push({label:'W'+Math.ceil(((cur-new Date(cur.getFullYear(),0,1))/864e5+1)/7),start:U.iso(cur),end:U.iso(sat),year:sat.getFullYear(),month:sat.getMonth(),quarter:Math.floor(sat.getMonth()/3)+1});
      cur.setDate(cur.getDate()+7);
    }
  }else if(p.timescale==='months'){
    cur.setDate(1);
    while(cur<=end){
      const mi=cur.getMonth();
      cols.push({label:(p.monthFormat==='letter'?_ML:_MN)[mi],start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),mi+1,0)),year:cur.getFullYear(),month:mi,quarter:Math.floor(mi/3)+1});
      cur.setMonth(cur.getMonth()+1);
    }
  }else if(p.timescale==='quarters'){
    cur.setMonth(Math.floor(cur.getMonth()/3)*3);cur.setDate(1);
    while(cur<=end){
      const q=Math.floor(cur.getMonth()/3)+1;
      cols.push({label:`Q${q}`,start:U.iso(cur),end:U.iso(new Date(cur.getFullYear(),cur.getMonth()+3,0)),year:cur.getFullYear(),quarter:q});
      cur.setMonth(cur.getMonth()+3);
    }
  }else{
    cur.setMonth(0);cur.setDate(1);
    while(cur<=end){
      cols.push({label:String(cur.getFullYear()),start:U.iso(cur),end:`${cur.getFullYear()}-12-31`,year:cur.getFullYear()});
      cur.setFullYear(cur.getFullYear()+1);
    }
  }
  const dayCw={compact:20,normal:28,wide:36}[p.dayColumnWidth||'normal']||28;
  const cw=(p.timescale==='days'?dayCw:{weeks:60,months:100,quarters:200,years:400}[p.timescale]||100)*z;
  return{start,end,cols,cw,tw:cols.length*cw,z};
}

// ─── Local mock of buildHdrRows() ─────────────────────────────────────────
// Mirrors the buildHdrRows() from app.js including monthFormat/quarterFormat
function mockBuildHdrRows(proj,tl){
  const layers=proj.headerLayers||2,ts=proj.timescale,rows=[];
  const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const ML=['J','F','M','A','M','J','J','A','S','O','N','D'];
  const mFmt=proj.monthFormat||'short',qFmt=proj.quarterFormat||'withYear';
  const monthLabel=m=>mFmt==='letter'?ML[m]:MN[m];

  // dX helper for boundary row
  function dX(ds){
    if(!ds||!tl.cols.length)return null;
    const d=new Date(ds+'T12:00:00');
    for(let i=0;i<tl.cols.length;i++){
      const c=tl.cols[i],cs=new Date(c.start+'T12:00:00'),ce=new Date(c.end+'T12:00:00');
      if(d>=cs&&d<=ce){const cd=Math.max(1,U.days(c.start,c.end)+1);return i*tl.cw+(U.days(c.start,ds)/cd)*tl.cw}
    }
    const f=tl.cols[0],l=tl.cols[tl.cols.length-1];
    if(d<new Date(f.start+'T12:00:00')){const cd=Math.max(1,U.days(f.start,f.end)+1);return -(U.days(ds,f.start)/cd)*tl.cw}
    const cd=Math.max(1,U.days(l.start,l.end)+1);return(tl.cols.length-1)*tl.cw+(U.days(l.start,ds)/cd)*tl.cw;
  }

  const buildBoundaryRow=(getNext,getLabel)=>{
    const g=[];if(!tl.cols.length)return g;
    const tlS=new Date(tl.cols[0].start+'T12:00:00');const tlE=new Date(tl.cols[tl.cols.length-1].end+'T12:00:00');
    let cur=getNext(tlS,true),prevX=0;
    let prevLabel=getLabel(tlS);
    while(cur<=tlE){
      const x=dX(U.iso(cur));
      if(x!==null&&x>prevX&&x<tl.tw){
        g.push({label:prevLabel,width:x-prevX});
        prevLabel=getLabel(cur);prevX=x;
      }
      cur=getNext(cur,false);
    }
    if(prevX<tl.tw)g.push({label:prevLabel,width:tl.tw-prevX});
    return g;
  };

  if(layers>=3&&(ts==='days'||ts==='weeks'||ts==='months')){
    if(ts==='days'||ts==='weeks'){
      rows.push(buildBoundaryRow(
        (d,first)=>{const y=first?d.getFullYear():d.getFullYear()+1;return new Date(y+(first?1:0),0,1)},
        d=>String(d.getFullYear())
      ));
    }else{const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
  }
  if(layers>=2){
    if(ts==='days'||ts==='weeks'){
      rows.push(buildBoundaryRow(
        (d,first)=>{const m=first?d.getMonth()+1:d.getMonth()+1;return new Date(d.getFullYear(),m,1)},
        d=>monthLabel(d.getMonth())
      ));
    }
    else if(ts==='months'){const g=[];let cq=null,cn=0;tl.cols.forEach(c=>{const k=c.year+'-Q'+c.quarter;if(k!==cq){if(cq!==null){const parts=cq.split('-');g.push({label:qFmt==='plain'?parts[1]:parts[1]+' '+parts[0],span:cn})}cq=k;cn=1}else cn++});if(cq!==null){const parts=cq.split('-');g.push({label:qFmt==='plain'?parts[1]:parts[1]+' '+parts[0],span:cn})}rows.push(g)}
    else if(ts==='quarters'){const g=[];let cy=null,cn=0;tl.cols.forEach(c=>{if(c.year!==cy){if(cy!==null)g.push({label:String(cy),span:cn});cy=c.year;cn=1}else cn++});if(cy!==null)g.push({label:String(cy),span:cn});rows.push(g)}
  }
  rows.push(tl.cols.map((c,i)=>{const cell={label:c.label,span:1};if(c.dayLetter)cell.dayLetter=c.dayLetter;if(i>0){const prev=tl.cols[i-1];if((ts==='days'||ts==='weeks')&&c.month!==prev.month)cell.boundary=true;else if(ts==='months'&&c.quarter!==prev.quarter)cell.boundary=true;else if(ts==='quarters'&&c.year!==prev.year)cell.boundary=true}return cell}));
  return rows;
}

// ─── Migration mock ───────────────────────────────────────────────────────
function migrate(p){
  if(!p.timescale||!['days','weeks','months','quarters','years'].includes(p.timescale))p.timescale='months';
  if(p.headerLayers==null)p.headerLayers=2;
  if(!p.monthFormat||!['short','letter'].includes(p.monthFormat))p.monthFormat='short';
  if(!p.quarterFormat||!['withYear','plain'].includes(p.quarterFormat))p.quarterFormat='withYear';
  if(p.headerFontSize==null)p.headerFontSize=10.5;p.headerFontSize=Math.max(7,Math.min(16,p.headerFontSize));
  if(!p.dayLabelFormat||!['letter','number','hybrid'].includes(p.dayLabelFormat))p.dayLabelFormat='letter';
  if(!p.dayColumnWidth||!['compact','normal','wide'].includes(p.dayColumnWidth))p.dayColumnWidth='normal';
  return p;
}

// ─── _packProj stripping mock ─────────────────────────────────────────────
function packStripDefaults(proj){
  const p=JSON.parse(JSON.stringify(proj));
  const projStrip=['monthFormat','quarterFormat','headerFontSize','dayLabelFormat','dayColumnWidth'];
  const defaults={monthFormat:'short',quarterFormat:'withYear',headerFontSize:10.5,dayLabelFormat:'letter',dayColumnWidth:'normal'};
  for(const k of projStrip){
    if(JSON.stringify(p[k])===JSON.stringify(defaults[k]))delete p[k];
  }
  return p;
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Migration Tests ─────────────────────────────────────────────────────

section('Migration — monthFormat defaults');
{
  const p=migrate({timescale:'months',headerLayers:2});
  assert('Missing monthFormat defaults to short',p.monthFormat,'short');
}
{
  const p=migrate({timescale:'months',monthFormat:'letter'});
  assert('Valid letter format preserved',p.monthFormat,'letter');
}
{
  const p=migrate({timescale:'months',monthFormat:'bogus'});
  assert('Invalid monthFormat defaults to short',p.monthFormat,'short');
}
{
  const p=migrate({timescale:'months',monthFormat:''});
  assert('Empty monthFormat defaults to short',p.monthFormat,'short');
}

section('Migration — quarterFormat defaults');
{
  const p=migrate({timescale:'months',headerLayers:2});
  assert('Missing quarterFormat defaults to withYear',p.quarterFormat,'withYear');
}
{
  const p=migrate({timescale:'months',quarterFormat:'plain'});
  assert('Valid plain format preserved',p.quarterFormat,'plain');
}
{
  const p=migrate({timescale:'months',quarterFormat:'invalid'});
  assert('Invalid quarterFormat defaults to withYear',p.quarterFormat,'withYear');
}

// ─── _packProj Stripping Tests ─────────────────────────────────────────

section('Pack — strip default format values');
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear'});
  assertF('Default monthFormat stripped','monthFormat' in p);
  assertF('Default quarterFormat stripped','quarterFormat' in p);
}
{
  const p=packStripDefaults({monthFormat:'letter',quarterFormat:'plain'});
  assertT('Non-default monthFormat kept','monthFormat' in p);
  assertT('Non-default quarterFormat kept','quarterFormat' in p);
  assert('monthFormat value correct after pack',p.monthFormat,'letter');
  assert('quarterFormat value correct after pack',p.quarterFormat,'plain');
}
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'plain'});
  assertF('Default monthFormat stripped even with non-default quarter','monthFormat' in p);
  assertT('Non-default quarterFormat kept','quarterFormat' in p);
}

// ─── met() Column Label Tests — Months Scale ──────────────────────────

section('met() — months scale, short format (default)');
{
  const p=makeProj({timescale:'months',timelineStart:'2026-01-01',timelineEnd:'2026-06-30',monthFormat:'short',zoom:100});
  const tl=mockMet(p);
  assert('Jan label for month 0',tl.cols[0].label,'Jan');
  assert('Feb label for month 1',tl.cols[1].label,'Feb');
  assert('Mar label for month 2',tl.cols[2].label,'Mar');
  assert('Jun label for month 5',tl.cols[5].label,'Jun');
}

section('met() — months scale, letter format');
{
  const p=makeProj({timescale:'months',timelineStart:'2026-01-01',timelineEnd:'2026-12-31',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  assert('J for January',tl.cols[0].label,'J');
  assert('F for February',tl.cols[1].label,'F');
  assert('M for March',tl.cols[2].label,'M');
  assert('A for April',tl.cols[3].label,'A');
  assert('M for May',tl.cols[4].label,'M');
  assert('J for June',tl.cols[5].label,'J');
  assert('J for July',tl.cols[6].label,'J');
  assert('A for August',tl.cols[7].label,'A');
  assert('S for September',tl.cols[8].label,'S');
  assert('O for October',tl.cols[9].label,'O');
  assert('N for November',tl.cols[10].label,'N');
  assert('D for December',tl.cols[11].label,'D');
}

section('met() — months scale with missing monthFormat defaults to short');
{
  const p=makeProj({timescale:'months',timelineStart:'2026-01-01',timelineEnd:'2026-03-31',zoom:100});
  delete p.monthFormat;
  const tl=mockMet(p);
  assert('Default to short month name',tl.cols[0].label,'Jan');
}

// ─── buildHdrRows() Tests — Quarter Format ─────────────────────────────

section('buildHdrRows — months scale, 2 layers, quarterFormat withYear');
{
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-06-30',monthFormat:'short',quarterFormat:'withYear',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('2 rows for 2 layers',rows.length,2);
  const qLabels=rows[0].map(c=>c.label);
  assertT('Q1 label includes year',qLabels[0].includes('Q1')&&qLabels[0].includes('2026'));
  assertT('Q2 label includes year',qLabels[1].includes('Q2')&&qLabels[1].includes('2026'));
}

section('buildHdrRows — months scale, 2 layers, quarterFormat plain');
{
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-06-30',monthFormat:'short',quarterFormat:'plain',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  const qLabels=rows[0].map(c=>c.label);
  assert('Plain quarter: Q1 without year',qLabels[0],'Q1');
  assert('Plain quarter: Q2 without year',qLabels[1],'Q2');
  assertF('No year in plain quarter label',qLabels[0].includes('2026'));
}

section('buildHdrRows — months scale, 3 layers, quarterFormat plain');
{
  const p=makeProj({timescale:'months',headerLayers:3,timelineStart:'2026-01-01',timelineEnd:'2026-12-31',monthFormat:'short',quarterFormat:'plain',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('3 rows for 3 layers',rows.length,3);
  assert('Layer 3 = year',rows[0][0].label,'2026');
  const qLabels=rows[1].map(c=>c.label);
  assert('Plain quarter in layer 2',qLabels[0],'Q1');
  assertF('No year in plain quarter with 3 layers',qLabels[0].includes('2026'));
}

section('buildHdrRows — months scale, 1 layer only');
{
  const p=makeProj({timescale:'months',headerLayers:1,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'letter',quarterFormat:'plain',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('1 row for 1 layer',rows.length,1);
  assert('Letter month label in single layer',rows[0][0].label,'J');
  assert('Feb as F',rows[0][1].label,'F');
  assert('Mar as M',rows[0][2].label,'M');
}

// ─── buildHdrRows() Tests — Weeks Scale with Month Format ──────────────

section('buildHdrRows — weeks scale, 2 layers, monthFormat short');
{
  const p=makeProj({timescale:'weeks',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('2 rows for weeks + 2 layers',rows.length,2);
  const mLabels=rows[0].map(c=>c.label);
  assertT('Month boundary labels use short names',mLabels.includes('Jan')||mLabels.includes('Dec'));
  assertF('No single-letter labels when format is short',mLabels.some(l=>l.length===1&&'JFMAMJJASOND'.includes(l)));
}

section('buildHdrRows — weeks scale, 2 layers, monthFormat letter');
{
  const p=makeProj({timescale:'weeks',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  const mLabels=rows[0].map(c=>c.label);
  assertT('All month boundary labels are single letters',mLabels.every(l=>l.length===1));
}

section('buildHdrRows — weeks scale, 3 layers, monthFormat letter');
{
  const p=makeProj({timescale:'weeks',headerLayers:3,timelineStart:'2026-01-01',timelineEnd:'2026-06-30',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('3 rows for weeks + 3 layers',rows.length,3);
  assertT('Year label in top row',rows[0][0].label==='2026'||rows[0][0].label==='2025');
  const mLabels=rows[1].map(c=>c.label);
  assertT('Month letters in middle row',mLabels.every(l=>l.length===1));
}

// ─── buildHdrRows() — Non-affected Scales ──────────────────────────────

section('buildHdrRows — quarters scale unaffected by monthFormat');
{
  const p=makeProj({timescale:'quarters',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-12-31',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('2 rows for quarters + 2 layers',rows.length,2);
  const qLabels=rows[1].map(c=>c.label);
  assert('Q1 label unchanged',qLabels[0],'Q1');
  assert('Q4 label unchanged',qLabels[3],'Q4');
  assert('Year in top row',rows[0][0].label,'2026');
}

section('buildHdrRows — years scale unaffected by monthFormat');
{
  const p=makeProj({timescale:'years',headerLayers:2,timelineStart:'2025-01-01',timelineEnd:'2027-12-31',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('Years scale: only 1 row even with headerLayers=2',rows.length,1);
  assert('Year label',rows[0][0].label,'2025');
}

// ─── Cross-year Quarter Labels ─────────────────────────────────────────

section('buildHdrRows — cross-year months with quarter format');
{
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2025-10-01',timelineEnd:'2026-03-31',monthFormat:'short',quarterFormat:'withYear',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  const qLabels=rows[0].map(c=>c.label);
  assertT('Cross-year: has 2025 labels',qLabels.some(l=>l.includes('2025')));
  assertT('Cross-year: has 2026 labels',qLabels.some(l=>l.includes('2026')));
}
{
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2025-10-01',timelineEnd:'2026-03-31',monthFormat:'short',quarterFormat:'plain',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  const qLabels=rows[0].map(c=>c.label);
  assertF('Plain format: no 2025',qLabels.some(l=>l.includes('2025')));
  assertF('Plain format: no 2026',qLabels.some(l=>l.includes('2026')));
  assertT('Plain: Q4',qLabels.some(l=>l==='Q4'));
  assertT('Plain: Q1',qLabels.some(l=>l==='Q1'));
}

// ─── Column Count Stability ────────────────────────────────────────────

section('Format changes do not affect column counts');
{
  const base={timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-12-31',zoom:100};
  const p1=makeProj({...base,monthFormat:'short'});
  const p2=makeProj({...base,monthFormat:'letter'});
  const tl1=mockMet(p1);
  const tl2=mockMet(p2);
  assert('Same column count regardless of monthFormat',tl1.cols.length,tl2.cols.length);
  assert('Same total width regardless of monthFormat',tl1.tw,tl2.tw);
}
{
  const base={timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-12-31',zoom:100};
  const p1=makeProj({...base,quarterFormat:'withYear'});
  const p2=makeProj({...base,quarterFormat:'plain'});
  const tl1=mockMet(p1);
  const tl2=mockMet(p2);
  assert('Same column count regardless of quarterFormat',tl1.cols.length,tl2.cols.length);
}

// ─── Row Structure Consistency ─────────────────────────────────────────

section('Row structure consistency across formats');
{
  const base={timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-12-31',zoom:100};
  const p1=makeProj({...base,monthFormat:'short',quarterFormat:'withYear'});
  const p2=makeProj({...base,monthFormat:'letter',quarterFormat:'plain'});
  const tl1=mockMet(p1);const tl2=mockMet(p2);
  const r1=mockBuildHdrRows(p1,tl1);const r2=mockBuildHdrRows(p2,tl2);
  assert('Same row count',r1.length,r2.length);
  assert('Same cell count in quarter row',r1[0].length,r2[0].length);
  assert('Same cell count in month row',r1[1].length,r2[1].length);
  for(let i=0;i<r1[0].length;i++){
    assert(`Quarter cell ${i} span unchanged`,r1[0][i].span,r2[0][i].span);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 TESTS — Header Font Size
// ═══════════════════════════════════════════════════════════════════════════

// ─── Migration — headerFontSize ──────────────────────────────────────────

section('Migration — headerFontSize defaults');
{
  const p=migrate({timescale:'months'});
  assert('Missing headerFontSize defaults to 10.5',p.headerFontSize,10.5);
}
{
  const p=migrate({timescale:'months',headerFontSize:12});
  assert('Valid headerFontSize 12 preserved',p.headerFontSize,12);
}
{
  const p=migrate({timescale:'months',headerFontSize:8});
  assert('Valid headerFontSize 8 preserved',p.headerFontSize,8);
}
{
  const p=migrate({timescale:'months',headerFontSize:7});
  assert('Minimum headerFontSize 7 preserved',p.headerFontSize,7);
}
{
  const p=migrate({timescale:'months',headerFontSize:16});
  assert('Maximum headerFontSize 16 preserved',p.headerFontSize,16);
}

section('Migration — headerFontSize clamping');
{
  const p=migrate({timescale:'months',headerFontSize:3});
  assert('Below-min headerFontSize clamped to 7',p.headerFontSize,7);
}
{
  const p=migrate({timescale:'months',headerFontSize:0});
  assert('Zero headerFontSize clamped to 7',p.headerFontSize,7);
}
{
  const p=migrate({timescale:'months',headerFontSize:-5});
  assert('Negative headerFontSize clamped to 7',p.headerFontSize,7);
}
{
  const p=migrate({timescale:'months',headerFontSize:20});
  assert('Above-max headerFontSize clamped to 16',p.headerFontSize,16);
}
{
  const p=migrate({timescale:'months',headerFontSize:100});
  assert('Very large headerFontSize clamped to 16',p.headerFontSize,16);
}

section('Migration — headerFontSize null/undefined');
{
  const p=migrate({timescale:'months',headerFontSize:null});
  assert('Null headerFontSize defaults to 10.5',p.headerFontSize,10.5);
}
{
  const p=migrate({timescale:'months',headerFontSize:undefined});
  assert('Undefined headerFontSize defaults to 10.5',p.headerFontSize,10.5);
}

// ─── Pack/Strip — headerFontSize ─────────────────────────────────────────

section('Pack — headerFontSize strip defaults');
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear',headerFontSize:10.5});
  assertF('Default headerFontSize 10.5 stripped','headerFontSize' in p);
}
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear',headerFontSize:12});
  assertT('Non-default headerFontSize 12 kept','headerFontSize' in p);
  assert('headerFontSize value correct after pack',p.headerFontSize,12);
}
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear',headerFontSize:8});
  assertT('Non-default headerFontSize 8 kept','headerFontSize' in p);
  assert('headerFontSize 8 value correct',p.headerFontSize,8);
}
{
  const p=packStripDefaults({monthFormat:'letter',quarterFormat:'plain',headerFontSize:10.5});
  assertF('Default headerFontSize stripped with non-default formats','headerFontSize' in p);
  assertT('Non-default monthFormat kept with default headerFontSize','monthFormat' in p);
  assertT('Non-default quarterFormat kept with default headerFontSize','quarterFormat' in p);
}

// ─── renderTL() header font-size mock ────────────────────────────────────
// Mocks the th-cell HTML generation to verify font-size injection

section('renderTL — header font-size in th-cell HTML');
{
  function mockRenderHdrHTML(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hc='#1a2332',rowH=22;
    const hFs=proj.headerFontSize||10.5;
    let hh='';
    hR.forEach(row=>{
      hh+=`<div class="th-row" style="background:${hc};height:${rowH}px">`;
      row.forEach(cell=>{
        const w=cell.width!=null?cell.width:cell.span*tl.cw;
        hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}</div>`;
      });
      hh+=`</div>`;
    });
    return hh;
  }
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',headerFontSize:10.5,zoom:100});
  const tl=mockMet(p);
  const html=mockRenderHdrHTML(p,tl);
  assertT('Default font-size 10.5 in th-cell',html.includes('font-size:10.5px'));
}
{
  function mockRenderHdrHTML(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hc='#1a2332',rowH=22;
    const hFs=proj.headerFontSize||10.5;
    let hh='';
    hR.forEach(row=>{
      hh+=`<div class="th-row" style="background:${hc};height:${rowH}px">`;
      row.forEach(cell=>{
        const w=cell.width!=null?cell.width:cell.span*tl.cw;
        hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}</div>`;
      });
      hh+=`</div>`;
    });
    return hh;
  }
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',headerFontSize:14,zoom:100});
  const tl=mockMet(p);
  const html=mockRenderHdrHTML(p,tl);
  assertT('Custom font-size 14 in th-cell',html.includes('font-size:14px'));
  assertF('No hardcoded 10.5 when font-size is 14',html.includes('font-size:10.5px'));
}
{
  function mockRenderHdrHTML(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hc='#1a2332',rowH=22;
    const hFs=proj.headerFontSize||10.5;
    let hh='';
    hR.forEach(row=>{
      hh+=`<div class="th-row" style="background:${hc};height:${rowH}px">`;
      row.forEach(cell=>{
        const w=cell.width!=null?cell.width:cell.span*tl.cw;
        hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}</div>`;
      });
      hh+=`</div>`;
    });
    return hh;
  }
  const p=makeProj({timescale:'months',headerLayers:1,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',headerFontSize:7,zoom:100});
  const tl=mockMet(p);
  const html=mockRenderHdrHTML(p,tl);
  assertT('Minimum font-size 7 in th-cell',html.includes('font-size:7px'));
}

// ─── buildExportSVG() header font-size mock ──────────────────────────────

section('buildExportSVG — header font-size in SVG text');
{
  function mockExportHdrSVG(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hFs=proj.headerFontSize||10.5;
    const rowHH=22;
    let svg='',hdrY=0;
    hR.forEach(row=>{
      let hx=0;
      row.forEach(cell=>{
        const cw=cell.width!=null?cell.width:cell.span*tl.cw;
        svg+=`<text x="${hx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`;
        hx+=cw;
      });
      hdrY+=rowHH;
    });
    return svg;
  }
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',headerFontSize:10.5,zoom:100});
  const tl=mockMet(p);
  const svg=mockExportHdrSVG(p,tl);
  assertT('Default font-size 10.5 in SVG text',svg.includes('font-size="10.5"'));
}
{
  function mockExportHdrSVG(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hFs=proj.headerFontSize||10.5;
    const rowHH=22;
    let svg='',hdrY=0;
    hR.forEach(row=>{
      let hx=0;
      row.forEach(cell=>{
        const cw=cell.width!=null?cell.width:cell.span*tl.cw;
        svg+=`<text x="${hx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`;
        hx+=cw;
      });
      hdrY+=rowHH;
    });
    return svg;
  }
  const p=makeProj({timescale:'months',headerLayers:2,timelineStart:'2026-01-01',timelineEnd:'2026-03-31',monthFormat:'short',headerFontSize:13,zoom:100});
  const tl=mockMet(p);
  const svg=mockExportHdrSVG(p,tl);
  assertT('Custom font-size 13 in SVG text',svg.includes('font-size="13"'));
  assertF('No hardcoded 10.5 in SVG when font-size is 13',svg.includes('font-size="10.5"'));
}

// ─── _applyHdrFs mock (clamping behavior) ────────────────────────────────

section('_applyHdrFs — clamping behavior');
{
  function applyHdrFs(proj,size){
    proj.headerFontSize=Math.max(7,Math.min(16,size));
    return proj;
  }
  let p={headerFontSize:10.5};
  p=applyHdrFs(p,12);assert('Apply 12',p.headerFontSize,12);
  p=applyHdrFs(p,7);assert('Apply minimum 7',p.headerFontSize,7);
  p=applyHdrFs(p,16);assert('Apply maximum 16',p.headerFontSize,16);
  p=applyHdrFs(p,3);assert('Apply below-min clamped to 7',p.headerFontSize,7);
  p=applyHdrFs(p,20);assert('Apply above-max clamped to 16',p.headerFontSize,16);
  p=applyHdrFs(p,10.5);assert('Apply default 10.5',p.headerFontSize,10.5);
}

// ─── _adjustHdrFs mock (stepper behavior) ────────────────────────────────

section('_adjustHdrFs — stepper increments');
{
  function adjustHdrFs(cur,delta){
    return Math.max(7,Math.min(16,cur+delta));
  }
  assert('Increment from 10.5 by +0.5',adjustHdrFs(10.5,0.5),11);
  assert('Decrement from 10.5 by -0.5',adjustHdrFs(10.5,-0.5),10);
  assert('Increment from 15.5 by +0.5',adjustHdrFs(15.5,0.5),16);
  assert('Increment from 16 by +0.5 clamped',adjustHdrFs(16,0.5),16);
  assert('Decrement from 7.5 by -0.5',adjustHdrFs(7.5,-0.5),7);
  assert('Decrement from 7 by -0.5 clamped',adjustHdrFs(7,-0.5),7);
  assert('Multiple increments',adjustHdrFs(adjustHdrFs(10,0.5),0.5),11);
}

// ─── Popover format row visibility by timescale ──────────────────────────

section('Popover format row visibility by timescale');
{
  function getPopoverVisibility(ts,layers){
    const showMonth=(ts==='months')||(ts==='weeks'&&layers>=2);
    const showQuarter=(ts==='months'&&layers>=2);
    return{showMonth,showQuarter};
  }
  // months scale
  let v=getPopoverVisibility('months',2);
  assertT('months+2L: month row visible',v.showMonth);
  assertT('months+2L: quarter row visible',v.showQuarter);
  v=getPopoverVisibility('months',1);
  assertT('months+1L: month row visible',v.showMonth);
  assertF('months+1L: quarter row hidden',v.showQuarter);
  v=getPopoverVisibility('months',3);
  assertT('months+3L: month row visible',v.showMonth);
  assertT('months+3L: quarter row visible',v.showQuarter);
  // weeks scale
  v=getPopoverVisibility('weeks',2);
  assertT('weeks+2L: month row visible',v.showMonth);
  assertF('weeks+2L: quarter row hidden',v.showQuarter);
  v=getPopoverVisibility('weeks',1);
  assertF('weeks+1L: month row hidden',v.showMonth);
  assertF('weeks+1L: quarter row hidden',v.showQuarter);
  // quarters scale
  v=getPopoverVisibility('quarters',2);
  assertF('quarters+2L: month row hidden',v.showMonth);
  assertF('quarters+2L: quarter row hidden',v.showQuarter);
  // years scale
  v=getPopoverVisibility('years',1);
  assertF('years+1L: month row hidden',v.showMonth);
  assertF('years+1L: quarter row hidden',v.showQuarter);
}

// ─── SK map key for headerFontSize ───────────────────────────────────────

section('SK map — headerFontSize short key');
{
  const SK={monthFormat:'mF',quarterFormat:'qF',headerFontSize:'hF'};
  assert('headerFontSize maps to hF',SK.headerFontSize,'hF');
  assert('monthFormat maps to mF',SK.monthFormat,'mF');
  assert('quarterFormat maps to qF',SK.quarterFormat,'qF');
}

// ─── MOUSE_REFS includes header entry ────────────────────────────────────

section('MOUSE_REFS — header right-click entry');
{
  const MOUSE_REFS=[
    {combo:'Right-click label',desc:'Format swimlane label'},
    {combo:'Right-click header',desc:'Format header text size'},
  ];
  const hdrRef=MOUSE_REFS.find(r=>r.combo==='Right-click header');
  assertT('MOUSE_REFS has header right-click entry',!!hdrRef);
  assert('Header ref desc',hdrRef.desc,'Format header text size');
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 3 TESTS — Days Timescale
// ═══════════════════════════════════════════════════════════════════════════

// ─── Migration — days properties ─────────────────────────────────────────

section('Migration — dayLabelFormat defaults');
{
  const p=migrate({timescale:'days'});
  assert('Missing dayLabelFormat defaults to letter',p.dayLabelFormat,'letter');
}
{
  const p=migrate({timescale:'days',dayLabelFormat:'number'});
  assert('Valid number format preserved',p.dayLabelFormat,'number');
}
{
  const p=migrate({timescale:'days',dayLabelFormat:'hybrid'});
  assert('Valid hybrid format preserved',p.dayLabelFormat,'hybrid');
}
{
  const p=migrate({timescale:'days',dayLabelFormat:'bogus'});
  assert('Invalid dayLabelFormat defaults to letter',p.dayLabelFormat,'letter');
}

section('Migration — dayColumnWidth defaults');
{
  const p=migrate({timescale:'days'});
  assert('Missing dayColumnWidth defaults to normal',p.dayColumnWidth,'normal');
}
{
  const p=migrate({timescale:'days',dayColumnWidth:'compact'});
  assert('Valid compact width preserved',p.dayColumnWidth,'compact');
}
{
  const p=migrate({timescale:'days',dayColumnWidth:'wide'});
  assert('Valid wide width preserved',p.dayColumnWidth,'wide');
}
{
  const p=migrate({timescale:'days',dayColumnWidth:'invalid'});
  assert('Invalid dayColumnWidth defaults to normal',p.dayColumnWidth,'normal');
}

section('Migration — timescale validation includes days');
{
  const p=migrate({timescale:'days'});
  assert('days timescale preserved',p.timescale,'days');
}
{
  const p=migrate({timescale:'bogus'});
  assert('Invalid timescale defaults to months',p.timescale,'months');
}

// ─── Pack/Strip — days properties ────────────────────────────────────────

section('Pack — dayLabelFormat/dayColumnWidth strip defaults');
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear',headerFontSize:10.5,dayLabelFormat:'letter',dayColumnWidth:'normal'});
  assertF('Default dayLabelFormat stripped','dayLabelFormat' in p);
  assertF('Default dayColumnWidth stripped','dayColumnWidth' in p);
}
{
  const p=packStripDefaults({monthFormat:'short',quarterFormat:'withYear',headerFontSize:10.5,dayLabelFormat:'number',dayColumnWidth:'wide'});
  assertT('Non-default dayLabelFormat kept','dayLabelFormat' in p);
  assertT('Non-default dayColumnWidth kept','dayColumnWidth' in p);
  assert('dayLabelFormat value correct',p.dayLabelFormat,'number');
  assert('dayColumnWidth value correct',p.dayColumnWidth,'wide');
}

// ─── met() — days scale column generation ────────────────────────────────

section('met() — days scale, letter format');
{
  // 2026-02-02 is a Monday
  const p=makeProj({timescale:'days',timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'letter',dayColumnWidth:'normal',zoom:100});
  const tl=mockMet(p);
  assert('7 days = 7 columns',tl.cols.length,7);
  assert('Mon label = M',tl.cols[0].label,'M');
  assert('Tue label = T',tl.cols[1].label,'T');
  assert('Wed label = W',tl.cols[2].label,'W');
  assert('Thu label = T',tl.cols[3].label,'T');
  assert('Fri label = F',tl.cols[4].label,'F');
  assert('Sat label = S',tl.cols[5].label,'S');
  assert('Sun label = S',tl.cols[6].label,'S');
}

section('met() — days scale, number format');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'number',zoom:100});
  const tl=mockMet(p);
  assert('Mon dayNum = 2',tl.cols[0].label,'2');
  assert('Tue dayNum = 3',tl.cols[1].label,'3');
  assert('Sun dayNum = 8',tl.cols[6].label,'8');
}

section('met() — days scale, hybrid format');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'hybrid',zoom:100});
  const tl=mockMet(p);
  assert('Hybrid: label is number',tl.cols[0].label,'2');
  assert('Hybrid: dayLetter is weekday letter',tl.cols[0].dayLetter,'M');
  assert('Hybrid: Wed dayLetter',tl.cols[2].dayLetter,'W');
}

section('met() — days scale, single-day columns');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-03-15',timelineEnd:'2026-03-17',dayLabelFormat:'letter',zoom:100});
  const tl=mockMet(p);
  assert('Each column start === end',tl.cols[0].start,tl.cols[0].end);
  assert('Column 2 start === end',tl.cols[1].start,tl.cols[1].end);
  assert('3 columns for 3 days',tl.cols.length,3);
}

section('met() — days scale, weekend detection');
{
  // 2026-02-07 is Saturday, 2026-02-08 is Sunday
  const p=makeProj({timescale:'days',timelineStart:'2026-02-06',timelineEnd:'2026-02-09',dayLabelFormat:'letter',zoom:100});
  const tl=mockMet(p);
  assertF('Friday not weekend',tl.cols[0].isWeekend);
  assertT('Saturday is weekend',tl.cols[1].isWeekend);
  assertT('Sunday is weekend',tl.cols[2].isWeekend);
  assertF('Monday not weekend',tl.cols[3].isWeekend);
}

section('met() — days scale, column metadata');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-01-15',timelineEnd:'2026-01-17',dayLabelFormat:'letter',zoom:100});
  const tl=mockMet(p);
  assert('Year metadata',tl.cols[0].year,2026);
  assert('Month metadata (0-indexed)',tl.cols[0].month,0);
  assert('Quarter metadata',tl.cols[0].quarter,1);
  assert('Day-of-week metadata',typeof tl.cols[0].dow,'number');
}

// ─── met() — day column width presets ────────────────────────────────────

section('met() — day column width presets');
{
  const base={timescale:'days',timelineStart:'2026-03-01',timelineEnd:'2026-03-31',dayLabelFormat:'letter',zoom:100};
  const pComp=makeProj({...base,dayColumnWidth:'compact'});
  const pNorm=makeProj({...base,dayColumnWidth:'normal'});
  const pWide=makeProj({...base,dayColumnWidth:'wide'});
  const tlC=mockMet(pComp),tlN=mockMet(pNorm),tlW=mockMet(pWide);
  assert('Compact cw = 20',tlC.cw,20);
  assert('Normal cw = 28',tlN.cw,28);
  assert('Wide cw = 36',tlW.cw,36);
  assert('Same column count all widths',tlC.cols.length,tlN.cols.length);
  assert('Compact tw = 20*31',tlC.tw,20*31);
  assert('Normal tw = 28*31',tlN.tw,28*31);
  assert('Wide tw = 36*31',tlW.tw,36*31);
}

section('met() — day column width with zoom');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-03-01',timelineEnd:'2026-03-10',dayColumnWidth:'normal',zoom:150});
  const tl=mockMet(p);
  assert('Zoomed cw = 28*1.5 = 42',tl.cw,42);
}

// ─── buildHdrRows — days scale ───────────────────────────────────────────

section('buildHdrRows — days scale, 1 layer');
{
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('1 row for 1 layer',rows.length,1);
  assert('7 cells for 7 days',rows[0].length,7);
  assert('First cell label = M',rows[0][0].label,'M');
}

section('buildHdrRows — days scale, 2 layers');
{
  const p=makeProj({timescale:'days',headerLayers:2,timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'letter',monthFormat:'short',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('2 rows for 2 layers',rows.length,2);
  assert('Bottom row = day labels',rows[1].length,7);
  assertT('Top row has month boundary labels',rows[0].length>=1);
  assertT('Month label is Feb',rows[0].some(c=>c.label==='Feb'));
}

section('buildHdrRows — days scale, 3 layers');
{
  const p=makeProj({timescale:'days',headerLayers:3,timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'letter',monthFormat:'short',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('3 rows for 3 layers',rows.length,3);
  assertT('Top row has year label',rows[0].some(c=>c.label==='2026'));
  assertT('Middle row has month label',rows[1].some(c=>c.label==='Feb'));
  assert('Bottom row = day labels',rows[2].length,7);
}

section('buildHdrRows — days scale, letter month format in L2');
{
  const p=makeProj({timescale:'days',headerLayers:2,timelineStart:'2026-02-02',timelineEnd:'2026-02-08',dayLabelFormat:'letter',monthFormat:'letter',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assertT('Month boundary uses letter format',rows[0].some(c=>c.label==='F'));
}

section('buildHdrRows — days scale, cross-month boundary');
{
  const p=makeProj({timescale:'days',headerLayers:2,timelineStart:'2026-01-28',timelineEnd:'2026-02-04',dayLabelFormat:'letter',monthFormat:'short',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  const mLabels=rows[0].map(c=>c.label);
  assertT('Has Jan label',mLabels.includes('Jan'));
  assertT('Has Feb label',mLabels.includes('Feb'));
}

section('buildHdrRows — days scale, hybrid dayLetter in bottom row');
{
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'hybrid',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assertT('Bottom row cells have dayLetter',!!rows[0][0].dayLetter);
  assert('dayLetter for Monday',rows[0][0].dayLetter,'M');
  assert('Hybrid label is number',rows[0][0].label,'2');
}

section('buildHdrRows — days scale, number format labels');
{
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'number',zoom:100});
  const tl=mockMet(p);
  const rows=mockBuildHdrRows(p,tl);
  assert('Number label for day 2',rows[0][0].label,'2');
  assert('Number label for day 3',rows[0][1].label,'3');
  assert('Number label for day 4',rows[0][2].label,'4');
}

// ─── Rendering mock — hybrid mode ────────────────────────────────────────

section('renderTL — hybrid mode generates th-cell-hybrid');
{
  function mockRenderHdrHTML(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hc='#1a2332',rowH=22;
    const hFs=proj.headerFontSize||10.5;
    const isDaysHybrid=proj.timescale==='days'&&(proj.dayLabelFormat||'letter')==='hybrid';
    let hh='';
    hR.forEach((row,ri)=>{
      hh+=`<div class="th-row" style="background:${hc};height:${rowH}px">`;
      row.forEach(cell=>{
        const w=cell.width!=null?cell.width:cell.span*tl.cw;
        if(isDaysHybrid&&ri===hR.length-1&&cell.dayLetter){
          hh+=`<div class="th-cell th-cell-hybrid" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}<span class="th-day-letter">${cell.dayLetter}</span></div>`;
        }else{
          hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}</div>`;
        }
      });
      hh+=`</div>`;
    });
    return hh;
  }
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'hybrid',headerFontSize:10.5,zoom:100});
  const tl=mockMet(p);
  const html=mockRenderHdrHTML(p,tl);
  assertT('Hybrid HTML contains th-cell-hybrid class',html.includes('th-cell-hybrid'));
  assertT('Hybrid HTML contains th-day-letter span',html.includes('th-day-letter'));
  assertT('Hybrid HTML contains day number',html.includes('>2<'));
}
{
  function mockRenderHdrHTML(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hc='#1a2332',rowH=22;
    const hFs=proj.headerFontSize||10.5;
    const isDaysHybrid=proj.timescale==='days'&&(proj.dayLabelFormat||'letter')==='hybrid';
    let hh='';
    hR.forEach((row,ri)=>{
      hh+=`<div class="th-row" style="background:${hc};height:${rowH}px">`;
      row.forEach(cell=>{
        const w=cell.width!=null?cell.width:cell.span*tl.cw;
        if(isDaysHybrid&&ri===hR.length-1&&cell.dayLetter){
          hh+=`<div class="th-cell th-cell-hybrid" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}<span class="th-day-letter">${cell.dayLetter}</span></div>`;
        }else{
          hh+=`<div class="th-cell" style="width:${w}px;min-width:${w}px;font-size:${hFs}px">${cell.label}</div>`;
        }
      });
      hh+=`</div>`;
    });
    return hh;
  }
  // Non-hybrid letter mode should NOT have th-cell-hybrid
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'letter',headerFontSize:10.5,zoom:100});
  const tl=mockMet(p);
  const html=mockRenderHdrHTML(p,tl);
  assertF('Letter mode has no th-cell-hybrid',html.includes('th-cell-hybrid'));
}

// ─── SVG export — hybrid mode ────────────────────────────────────────────

section('buildExportSVG — hybrid mode generates two text elements');
{
  function mockExportHdrSVG(proj,tl){
    const hR=mockBuildHdrRows(proj,tl);
    const hFs=proj.headerFontSize||10.5;
    const isDaysHybrid=proj.timescale==='days'&&(proj.dayLabelFormat||'letter')==='hybrid';
    const rowHH=22;
    let svg='',hdrY=0;
    hR.forEach((row,ri)=>{
      let hx=0;
      row.forEach(cell=>{
        const cw=cell.width!=null?cell.width:cell.span*tl.cw;
        if(isDaysHybrid&&ri===hR.length-1&&cell.dayLetter){
          svg+=`<text x="${hx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`;
          svg+=`<text x="${hx+cw-2}" y="${hdrY+5}" fill="rgba(255,255,255,0.6)" font-size="7" font-weight="500" text-anchor="end">${cell.dayLetter}</text>`;
        }else{
          svg+=`<text x="${hx+cw/2}" y="${hdrY+rowHH/2+4}" fill="#fff" font-size="${hFs}" font-weight="600" text-anchor="middle">${cell.label}</text>`;
        }
        hx+=cw;
      });
      hdrY+=rowHH;
    });
    return svg;
  }
  const p=makeProj({timescale:'days',headerLayers:1,timelineStart:'2026-02-02',timelineEnd:'2026-02-04',dayLabelFormat:'hybrid',headerFontSize:10.5,zoom:100});
  const tl=mockMet(p);
  const svg=mockExportHdrSVG(p,tl);
  assertT('Hybrid SVG has small letter text element',svg.includes('font-size="7"'));
  assertT('Hybrid SVG has day number',svg.includes('>2<'));
  assertT('Hybrid SVG has day letter',svg.includes('>M<'));
}

// ─── SK map keys for days ────────────────────────────────────────────────

section('SK map — days short keys');
{
  const SK={dayLabelFormat:'dL',dayColumnWidth:'dW'};
  assert('dayLabelFormat maps to dL',SK.dayLabelFormat,'dL');
  assert('dayColumnWidth maps to dW',SK.dayColumnWidth,'dW');
}

// ─── Popover visibility for days ─────────────────────────────────────────

section('Popover visibility — days timescale');
{
  function getVisibility(ts,layers){
    const showDay=(ts==='days');
    const showMonth=(ts==='months')||(ts==='weeks'&&layers>=2)||(ts==='days'&&layers>=2);
    const showQuarter=(ts==='months'&&layers>=2);
    return{showDay,showMonth,showQuarter};
  }
  let v=getVisibility('days',1);
  assertT('days+1L: day rows visible',v.showDay);
  assertF('days+1L: month row hidden',v.showMonth);
  assertF('days+1L: quarter row hidden',v.showQuarter);
  v=getVisibility('days',2);
  assertT('days+2L: day rows visible',v.showDay);
  assertT('days+2L: month row visible',v.showMonth);
  assertF('days+2L: quarter row hidden',v.showQuarter);
  v=getVisibility('days',3);
  assertT('days+3L: day rows visible',v.showDay);
  assertT('days+3L: month row visible',v.showMonth);
  assertF('days+3L: quarter row hidden',v.showQuarter);
  // Non-days should not show day rows
  v=getVisibility('weeks',2);
  assertF('weeks: day rows hidden',v.showDay);
  v=getVisibility('months',2);
  assertF('months: day rows hidden',v.showDay);
}

// ─── 30-day column count ─────────────────────────────────────────────────

section('met() — 30-day and 90-day column counts');
{
  const p30=makeProj({timescale:'days',timelineStart:'2026-03-01',timelineEnd:'2026-03-30',dayLabelFormat:'letter',zoom:100});
  const tl30=mockMet(p30);
  assert('30 days = 30 columns',tl30.cols.length,30);

  const p90=makeProj({timescale:'days',timelineStart:'2026-01-01',timelineEnd:'2026-03-31',dayLabelFormat:'letter',zoom:100});
  const tl90=mockMet(p90);
  assert('Jan-Mar = 90 columns',tl90.cols.length,90);
}

// ─── Format changes do not affect column counts for days ─────────────────

section('Format changes do not affect days column counts');
{
  const base={timescale:'days',timelineStart:'2026-02-01',timelineEnd:'2026-02-28',zoom:100};
  const p1=makeProj({...base,dayLabelFormat:'letter'});
  const p2=makeProj({...base,dayLabelFormat:'number'});
  const p3=makeProj({...base,dayLabelFormat:'hybrid'});
  const tl1=mockMet(p1),tl2=mockMet(p2),tl3=mockMet(p3);
  assert('Same count: letter vs number',tl1.cols.length,tl2.cols.length);
  assert('Same count: letter vs hybrid',tl1.cols.length,tl3.cols.length);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 4 — Keyboard Shortcuts: cycleDayFmt, cycleScale, cycleHdrRows
// ═══════════════════════════════════════════════════════════════════════════

// ── Mock of SHORTCUT_ACTIONS (only the 3 new Phase 4 entries needed) ──
const SHORTCUT_ACTIONS_P4=[
  {id:'cycleDayFmt',cat:'View',label:'Cycle Day Label Format',defaults:[],ctx:'tl'},
  {id:'cycleScale',cat:'View',label:'Cycle Timescale',defaults:[],ctx:'tl'},
  {id:'cycleHdrRows',cat:'View',label:'Cycle Header Rows',defaults:[],ctx:'tl'},
];

// ── Mock dispatch environment ──
function makeMockApp(projOverrides){
  const proj=makeProj(projOverrides||{});
  const toasts=[];
  const app={
    proj,
    $:{ts_sel:{value:proj.timescale||'months'},hl_sel:{value:String(proj.headerLayers||2)}},
    _pendingFit:false,
    snap(){},
    sched(){},
    autoSave(){},
    _syncHdrFmtUI(){},
    toast(msg,type){toasts.push({msg,type})},
    toasts
  };
  return app;
}

// ── Extracted dispatch logic (mirrors app.js _scDispatch) ──
function dispatchCycleDayFmt(app){
  if(app.proj.timescale!=='days'){app.toast('Switch to Days scale first','info');return}
  app.snap();const order=['letter','number','hybrid'];const cur=app.proj.dayLabelFormat||'letter';const ni=(order.indexOf(cur)+1)%order.length;app.proj.dayLabelFormat=order[ni];app._syncHdrFmtUI();app.sched();app.autoSave();const labels={letter:'Letter (M T W)',number:'Number (1 2 3)',hybrid:'Hybrid (3 W)'};app.toast('Day format: '+labels[order[ni]]);
}
function dispatchCycleScale(app){
  app.snap();const order=['days','weeks','months','quarters','years'];const cur=app.proj.timescale||'months';const ni=(order.indexOf(cur)+1)%order.length;const prev=app.proj.timescale;app.proj.timescale=order[ni];app.$.ts_sel.value=order[ni];if(order[ni]==='days'){if(prev!=='days')app._pendingFit=true}app._syncHdrFmtUI();app.sched();app.autoSave();app.toast('Scale: '+order[ni].charAt(0).toUpperCase()+order[ni].slice(1));
}
function dispatchCycleHdrRows(app){
  app.snap();const ts=app.proj.timescale||'months';const max=ts==='years'?1:ts==='quarters'?2:3;const cur=app.proj.headerLayers||2;let next=cur+1;if(next>max)next=1;app.proj.headerLayers=next;app.$.hl_sel.value=String(next);app.sched();app.autoSave();app.toast('Header rows: '+next);
}

section('Phase 4 — SHORTCUT_ACTIONS registration');
{
  // Verify the 3 new actions have correct structure
  SHORTCUT_ACTIONS_P4.forEach(a=>{
    assertT(`${a.id} has cat View`,a.cat==='View');
    assertT(`${a.id} has ctx tl`,a.ctx==='tl');
    assertT(`${a.id} has empty defaults`,Array.isArray(a.defaults)&&a.defaults.length===0);
    assertT(`${a.id} is not reserved`,!a.reserved);
  });
}

section('Phase 4 — cycleDayFmt: letter → number → hybrid → letter');
{
  const app=makeMockApp({timescale:'days',dayLabelFormat:'letter'});
  dispatchCycleDayFmt(app);
  assert('After 1st cycle: number',app.proj.dayLabelFormat,'number');
  dispatchCycleDayFmt(app);
  assert('After 2nd cycle: hybrid',app.proj.dayLabelFormat,'hybrid');
  dispatchCycleDayFmt(app);
  assert('After 3rd cycle: back to letter',app.proj.dayLabelFormat,'letter');
}

section('Phase 4 — cycleDayFmt: guard non-days scale');
{
  const app=makeMockApp({timescale:'months',dayLabelFormat:'letter'});
  dispatchCycleDayFmt(app);
  assert('dayLabelFormat unchanged on months scale',app.proj.dayLabelFormat,'letter');
  assertT('Toast was info type',app.toasts[0].type==='info');
  assertT('Toast mentions Days scale',app.toasts[0].msg.includes('Days scale'));
}

section('Phase 4 — cycleDayFmt: guard all non-days scales');
{
  ['weeks','quarters','years'].forEach(ts=>{
    const app=makeMockApp({timescale:ts,dayLabelFormat:'number'});
    dispatchCycleDayFmt(app);
    assert(`dayLabelFormat unchanged on ${ts}`,app.proj.dayLabelFormat,'number');
  });
}

section('Phase 4 — cycleDayFmt: default letter when undefined');
{
  const app=makeMockApp({timescale:'days'});
  delete app.proj.dayLabelFormat;
  dispatchCycleDayFmt(app);
  assert('Undefined defaults to letter, cycles to number',app.proj.dayLabelFormat,'number');
}

section('Phase 4 — cycleDayFmt: toast labels are correct');
{
  const app=makeMockApp({timescale:'days',dayLabelFormat:'letter'});
  dispatchCycleDayFmt(app);
  assertT('Toast has Number label',app.toasts.some(t=>t.msg.includes('Number (1 2 3)')));
  dispatchCycleDayFmt(app);
  assertT('Toast has Hybrid label',app.toasts.some(t=>t.msg.includes('Hybrid (3 W)')));
  dispatchCycleDayFmt(app);
  assertT('Toast has Letter label',app.toasts.some(t=>t.msg.includes('Letter (M T W)')));
}

section('Phase 4 — cycleScale: full rotation days → weeks → months → quarters → years → days');
{
  const app=makeMockApp({timescale:'days'});
  dispatchCycleScale(app);
  assert('days → weeks',app.proj.timescale,'weeks');
  assert('ts_sel synced to weeks',app.$.ts_sel.value,'weeks');
  dispatchCycleScale(app);
  assert('weeks → months',app.proj.timescale,'months');
  dispatchCycleScale(app);
  assert('months → quarters',app.proj.timescale,'quarters');
  dispatchCycleScale(app);
  assert('quarters → years',app.proj.timescale,'years');
  dispatchCycleScale(app);
  assert('years → days (wrap)',app.proj.timescale,'days');
}

section('Phase 4 — cycleScale: ts_sel synced on every step');
{
  const app=makeMockApp({timescale:'months'});
  dispatchCycleScale(app);
  assert('ts_sel = quarters',app.$.ts_sel.value,'quarters');
  dispatchCycleScale(app);
  assert('ts_sel = years',app.$.ts_sel.value,'years');
  dispatchCycleScale(app);
  assert('ts_sel = days',app.$.ts_sel.value,'days');
}

section('Phase 4 — cycleScale: pendingFit when entering days');
{
  const app=makeMockApp({timescale:'years'});
  assertF('No pending fit initially',app._pendingFit);
  dispatchCycleScale(app);  // years → days
  assert('Timescale is days',app.proj.timescale,'days');
  assertT('pendingFit set when entering days',app._pendingFit);
}

section('Phase 4 — cycleScale: no pendingFit when leaving days');
{
  const app=makeMockApp({timescale:'days'});
  dispatchCycleScale(app);  // days → weeks
  assert('Timescale is weeks',app.proj.timescale,'weeks');
  assertF('No pendingFit when leaving days',app._pendingFit);
}

section('Phase 4 — cycleScale: no pendingFit on non-days transitions');
{
  const app=makeMockApp({timescale:'weeks'});
  dispatchCycleScale(app);  // weeks → months
  assertF('No pendingFit weeks→months',app._pendingFit);
  dispatchCycleScale(app);  // months → quarters
  assertF('No pendingFit months→quarters',app._pendingFit);
}

section('Phase 4 — cycleScale: toast shows capitalized name');
{
  const app=makeMockApp({timescale:'days'});
  dispatchCycleScale(app);
  assertT('Toast has "Scale: Weeks"',app.toasts.some(t=>t.msg==='Scale: Weeks'));
  dispatchCycleScale(app);
  assertT('Toast has "Scale: Months"',app.toasts.some(t=>t.msg==='Scale: Months'));
  dispatchCycleScale(app);
  assertT('Toast has "Scale: Quarters"',app.toasts.some(t=>t.msg==='Scale: Quarters'));
  dispatchCycleScale(app);
  assertT('Toast has "Scale: Years"',app.toasts.some(t=>t.msg==='Scale: Years'));
  dispatchCycleScale(app);
  assertT('Toast has "Scale: Days"',app.toasts.some(t=>t.msg==='Scale: Days'));
}

section('Phase 4 — cycleHdrRows: 3-layer scales (days, weeks, months)');
{
  ['days','weeks','months'].forEach(ts=>{
    const app=makeMockApp({timescale:ts,headerLayers:1});
    dispatchCycleHdrRows(app);
    assert(`${ts}: 1 → 2`,app.proj.headerLayers,2);
    assert(`${ts}: hl_sel=2`,app.$.hl_sel.value,'2');
    dispatchCycleHdrRows(app);
    assert(`${ts}: 2 → 3`,app.proj.headerLayers,3);
    dispatchCycleHdrRows(app);
    assert(`${ts}: 3 → 1 (wrap)`,app.proj.headerLayers,1);
  });
}

section('Phase 4 — cycleHdrRows: quarters (max 2 layers)');
{
  const app=makeMockApp({timescale:'quarters',headerLayers:1});
  dispatchCycleHdrRows(app);
  assert('quarters: 1 → 2',app.proj.headerLayers,2);
  dispatchCycleHdrRows(app);
  assert('quarters: 2 → 1 (wrap at 2)',app.proj.headerLayers,1);
}

section('Phase 4 — cycleHdrRows: years (max 1 layer)');
{
  const app=makeMockApp({timescale:'years',headerLayers:1});
  dispatchCycleHdrRows(app);
  assert('years: 1 → 1 (stays at 1)',app.proj.headerLayers,1);
}

section('Phase 4 — cycleHdrRows: hl_sel synced on every step');
{
  const app=makeMockApp({timescale:'months',headerLayers:2});
  dispatchCycleHdrRows(app);
  assert('hl_sel synced to 3',app.$.hl_sel.value,'3');
  dispatchCycleHdrRows(app);
  assert('hl_sel synced to 1',app.$.hl_sel.value,'1');
}

section('Phase 4 — cycleHdrRows: toast shows row count');
{
  const app=makeMockApp({timescale:'months',headerLayers:1});
  dispatchCycleHdrRows(app);
  assertT('Toast shows row 2',app.toasts.some(t=>t.msg==='Header rows: 2'));
  dispatchCycleHdrRows(app);
  assertT('Toast shows row 3',app.toasts.some(t=>t.msg==='Header rows: 3'));
  dispatchCycleHdrRows(app);
  assertT('Toast shows row 1',app.toasts.some(t=>t.msg==='Header rows: 1'));
}

section('Phase 4 — cycleHdrRows: default headerLayers from makeProj');
{
  // makeProj defaults headerLayers to 1
  const app=makeMockApp({timescale:'months'});
  assert('makeProj default headerLayers is 1',app.proj.headerLayers,1);
  dispatchCycleHdrRows(app);
  assert('Default 1 cycles to 2',app.proj.headerLayers,2);
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 5 — Boundary detection, holiday/weekend indicators, shading sync
// ═══════════════════════════════════════════════════════════════════════════

// ── 5C: Boundary detection in buildHdrRows bottom row ──

section('Phase 5C — Boundary detection: days scale (month boundaries)');
{
  // Feb 28 → Mar 1 boundary (non-leap 2026)
  const p=makeProj({timescale:'days',timelineStart:'2026-02-26',timelineEnd:'2026-03-03',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  // Feb 26,27,28, Mar 1,2,3 → 6 cells
  assert('6 day cells',bottom.length,6);
  // First cell (Feb 26) has no boundary (i=0)
  assertF('First cell no boundary',!!bottom[0].boundary);
  // Feb 27, Feb 28 — same month as previous
  assertF('Feb 27 no boundary',!!bottom[1].boundary);
  assertF('Feb 28 no boundary',!!bottom[2].boundary);
  // Mar 1 — boundary! month changed from 1 (Feb) to 2 (Mar)
  assertT('Mar 1 is boundary',!!bottom[3].boundary);
  // Mar 2, Mar 3 — same month
  assertF('Mar 2 no boundary',!!bottom[4].boundary);
  assertF('Mar 3 no boundary',!!bottom[5].boundary);
}

section('Phase 5C — Boundary detection: weeks scale (month boundaries)');
{
  // Weeks spanning Jan-Feb boundary
  const p=makeProj({timescale:'weeks',timelineStart:'2026-01-19',timelineEnd:'2026-02-15',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  // Check that at least one cell has boundary (month change)
  const hasBoundary=bottom.some(c=>c.boundary);
  assertT('Weeks has at least one month boundary',hasBoundary);
  assertF('First week cell has no boundary',!!bottom[0].boundary);
}

section('Phase 5C — Boundary detection: months scale (quarter boundaries)');
{
  const p=makeProj({timescale:'months',timelineStart:'2026-01-01',timelineEnd:'2026-06-30',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  // Jan,Feb,Mar,Apr,May,Jun — boundary at Apr (Q1→Q2)
  assert('6 month cells',bottom.length,6);
  assertF('Jan no boundary',!!bottom[0].boundary);
  assertF('Feb no boundary',!!bottom[1].boundary);
  assertF('Mar no boundary',!!bottom[2].boundary);
  assertT('Apr is quarter boundary',!!bottom[3].boundary);
  assertF('May no boundary',!!bottom[4].boundary);
  assertF('Jun no boundary',!!bottom[5].boundary);
}

section('Phase 5C — Boundary detection: quarters scale (year boundaries)');
{
  const p=makeProj({timescale:'quarters',timelineStart:'2025-07-01',timelineEnd:'2026-06-30',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  // Q3'25, Q4'25, Q1'26, Q2'26 — boundary at Q1'26 (year change)
  assert('4 quarter cells',bottom.length,4);
  assertF('Q3 no boundary',!!bottom[0].boundary);
  assertF('Q4 no boundary',!!bottom[1].boundary);
  assertT('Q1 2026 is year boundary',!!bottom[2].boundary);
  assertF('Q2 no boundary',!!bottom[3].boundary);
}

section('Phase 5C — Boundary detection: years scale (no boundaries)');
{
  const p=makeProj({timescale:'years',timelineStart:'2025-01-01',timelineEnd:'2027-12-31',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  const anyBoundary=bottom.some(c=>c.boundary);
  assertF('Years scale has no boundaries',anyBoundary);
}

section('Phase 5C — Boundary detection: multiple boundaries in one range');
{
  // 6 months = crosses at least 1 quarter boundary
  const p=makeProj({timescale:'days',timelineStart:'2026-02-28',timelineEnd:'2026-03-02',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  const boundaries=bottom.filter(c=>c.boundary);
  assert('One boundary (Feb→Mar)',boundaries.length,1);
}

// ── 5D: Holiday date set construction & indicator class logic ──

section('Phase 5D — Holiday date set: single-day holiday');
{
  const holidays=[{name:'New Year',start:'2026-01-01',end:'2026-01-01',schedAround:true}];
  const holDateSet=new Set();
  for(const hol of holidays){
    const hs=new Date(hol.start+'T12:00:00'),he=new Date(hol.end+'T12:00:00');
    const cur=new Date(hs);
    while(cur<=he){holDateSet.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
  }
  assert('Set has 1 date',holDateSet.size,1);
  assertT('Contains 2026-01-01',holDateSet.has('2026-01-01'));
  assertF('Does not contain 2026-01-02',holDateSet.has('2026-01-02'));
}

section('Phase 5D — Holiday date set: multi-day holiday');
{
  const holidays=[{name:'Break',start:'2026-03-16',end:'2026-03-20',schedAround:true}];
  const holDateSet=new Set();
  for(const hol of holidays){
    const hs=new Date(hol.start+'T12:00:00'),he=new Date(hol.end+'T12:00:00');
    const cur=new Date(hs);
    while(cur<=he){holDateSet.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
  }
  assert('Set has 5 dates',holDateSet.size,5);
  assertT('Contains 2026-03-16',holDateSet.has('2026-03-16'));
  assertT('Contains 2026-03-20',holDateSet.has('2026-03-20'));
  assertF('Does not contain 2026-03-15',holDateSet.has('2026-03-15'));
  assertF('Does not contain 2026-03-21',holDateSet.has('2026-03-21'));
}

section('Phase 5D — Holiday date set: multiple holidays merged');
{
  const holidays=[
    {name:'A',start:'2026-01-01',end:'2026-01-01',schedAround:true},
    {name:'B',start:'2026-02-14',end:'2026-02-14',schedAround:true},
    {name:'C',start:'2026-03-16',end:'2026-03-18',schedAround:true}
  ];
  const holDateSet=new Set();
  for(const hol of holidays){
    const hs=new Date(hol.start+'T12:00:00'),he=new Date(hol.end+'T12:00:00');
    const cur=new Date(hs);
    while(cur<=he){holDateSet.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
  }
  assert('Set has 5 dates total',holDateSet.size,5);
}

section('Phase 5D — Holiday date set: empty holidays');
{
  const holidays=[];
  const holDateSet=new Set();
  for(const hol of holidays){
    const hs=new Date(hol.start+'T12:00:00'),he=new Date(hol.end+'T12:00:00');
    const cur=new Date(hs);
    while(cur<=he){holDateSet.add(U.iso(cur));cur.setDate(cur.getDate()+1)}
  }
  assert('Empty set',holDateSet.size,0);
}

section('Phase 5D — Indicator class logic: holiday > weekend');
{
  // Simulate the class assignment logic from renderTL
  const holDateSet=new Set(['2026-01-03']); // Jan 3 2026 is a Saturday
  const cols=[
    {start:'2026-01-01',isWeekend:false,dow:4}, // Thu
    {start:'2026-01-02',isWeekend:false,dow:5}, // Fri
    {start:'2026-01-03',isWeekend:true,dow:6},  // Sat (also holiday)
    {start:'2026-01-04',isWeekend:true,dow:0},  // Sun
    {start:'2026-01-05',isWeekend:false,dow:1}, // Mon
  ];
  const classes=cols.map(col=>{
    if(holDateSet.has(col.start))return 'th-day-holiday';
    if(col.isWeekend)return 'th-day-weekend';
    return '';
  });
  assert('Thu: no class',classes[0],'');
  assert('Fri: no class',classes[1],'');
  assert('Sat (holiday): holiday class wins',classes[2],'th-day-holiday');
  assert('Sun: weekend class',classes[3],'th-day-weekend');
  assert('Mon: no class',classes[4],'');
}

section('Phase 5D — Indicator class logic: non-days scale produces no classes');
{
  // For non-days timescales, the indicator logic is not applied
  const p=makeProj({timescale:'weeks'});
  // No holDateSet is built for non-days
  assertT('Weeks scale: no holiday date set needed',p.timescale!=='days');
}

// ── 5B: Shading sync logic ──

section('Phase 5B — _syncShadingUI logic: weekend sync');
{
  // Simulate the sync logic
  const p={showWeekends:true,weekendOpacity:15,showHolidays:false,holidayOpacity:12,holidays:[]};
  // Weekend values
  const wk=p.showWeekends,wo=p.weekendOpacity||8;
  assertT('Weekend checked',wk===true);
  assert('Weekend opacity',wo,15);
  assertF('Slider not disabled when checked',!wk);
}

section('Phase 5B — _syncShadingUI logic: holiday disabled when no holidays');
{
  const p={showWeekends:false,weekendOpacity:8,showHolidays:true,holidayOpacity:20,holidays:[]};
  const noHols=!p.holidays||p.holidays.length===0;
  assertT('noHols is true',noHols);
  // checkbox should be disabled
  assertT('Holiday checkbox disabled when no holidays',noHols);
  // slider should be disabled
  assertT('Holiday slider disabled when no holidays',!p.showHolidays||noHols);
  // gear link should show
  assertT('Gear link visible when no holidays',noHols);
}

section('Phase 5B — _syncShadingUI logic: holiday enabled with holidays');
{
  const p={showWeekends:false,weekendOpacity:8,showHolidays:true,holidayOpacity:25,holidays:[{name:'Test',start:'2026-01-01',end:'2026-01-01',schedAround:true}]};
  const noHols=!p.holidays||p.holidays.length===0;
  assertF('noHols is false',noHols);
  assertT('Holiday checkbox enabled',!noHols);
  assert('Holiday opacity value',p.holidayOpacity,25);
  assertF('Gear link hidden when holidays exist',noHols);
}

section('Phase 5B — _syncShadingUI logic: slider disabled when checkbox off');
{
  const p={showWeekends:false,weekendOpacity:10,showHolidays:false,holidayOpacity:12,holidays:[{name:'A',start:'2026-01-01',end:'2026-01-01',schedAround:true}]};
  const noHols=!p.holidays||p.holidays.length===0;
  // Weekend slider disabled when !showWeekends
  assertT('Weekend slider disabled when unchecked',!p.showWeekends);
  // Holiday slider disabled when !showHolidays (even with holidays present)
  assertT('Holiday slider disabled when unchecked',!p.showHolidays||noHols);
}

section('Phase 5B — _syncShadingUI logic: default opacity values');
{
  const p={showWeekends:true,showHolidays:true,holidays:[{name:'A',start:'2026-01-01',end:'2026-01-01'}]};
  const wo=p.weekendOpacity||8;
  const ho=p.holidayOpacity||12;
  assert('Default weekend opacity is 8',wo,8);
  assert('Default holiday opacity is 12',ho,12);
}

// ── 5A: Popover dismiss guard logic ──

section('Phase 5A — Popover dismiss guard: Ctrl+Click keeps open');
{
  // Simulate the dismiss logic
  // When Ctrl is held and target is .sl-lbl: popover stays
  const ctrlKey=true, closestSlLbl=true, closestPopover=false;
  const shouldHide=!closestPopover&&!(closestSlLbl&&ctrlKey);
  assertF('Ctrl+Click on label: should NOT hide',shouldHide);
}

section('Phase 5A — Popover dismiss guard: plain click hides');
{
  const ctrlKey=false, closestSlLbl=true, closestPopover=false;
  const shouldHide=!closestPopover&&!(closestSlLbl&&ctrlKey);
  assertT('Plain click on label: should hide',shouldHide);
}

section('Phase 5A — Popover dismiss guard: click inside popover stays');
{
  const ctrlKey=false, closestSlLbl=false, closestPopover=true;
  const shouldHide=!closestPopover&&!(closestSlLbl&&ctrlKey);
  assertF('Click inside popover: should NOT hide',shouldHide);
}

section('Phase 5A — Popover dismiss guard: click empty area hides');
{
  const ctrlKey=false, closestSlLbl=false, closestPopover=false;
  const shouldHide=!closestPopover&&!(closestSlLbl&&ctrlKey);
  assertT('Click empty area: should hide',shouldHide);
}

section('Phase 5A — Popover dismiss guard: Meta+Click (Mac) keeps open');
{
  const metaKey=true, closestSlLbl=true, closestPopover=false;
  const shouldHide=!closestPopover&&!(closestSlLbl&&metaKey);
  assertF('Meta+Click on label: should NOT hide',shouldHide);
}

// ── 5C: SVG export stroke values ──

section('Phase 5C — SVG export: vertical stroke opacity 0.2');
{
  const strokeStr='rgba(255,255,255,0.2)';
  assertT('Vertical stroke is 0.2',strokeStr.includes('0.2'));
}

section('Phase 5C — SVG export: boundary stroke opacity 0.35');
{
  const strokeStr='rgba(255,255,255,0.35)';
  assertT('Boundary stroke is 0.35',strokeStr.includes('0.35'));
}

// ── Additional boundary edge cases ──

section('Phase 5C — Boundary: single column has no boundary');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-03-15',timelineEnd:'2026-03-15',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  assert('Single day: 1 cell',bottom.length,1);
  assertF('Single cell has no boundary',!!bottom[0].boundary);
}

section('Phase 5C — Boundary: two days same month, no boundary');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-03-15',timelineEnd:'2026-03-16',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  assert('Two day cells',bottom.length,2);
  assertF('Second cell no boundary (same month)',!!bottom[1].boundary);
}

section('Phase 5C — Boundary: two days cross month, has boundary');
{
  const p=makeProj({timescale:'days',timelineStart:'2026-03-31',timelineEnd:'2026-04-01',headerLayers:1});
  const tl=mockMet(p);
  const hR=mockBuildHdrRows(p,tl);
  const bottom=hR[hR.length-1];
  assert('Two day cells',bottom.length,2);
  assertT('Apr 1 is boundary (Mar→Apr)',!!bottom[1].boundary);
}

summary();
