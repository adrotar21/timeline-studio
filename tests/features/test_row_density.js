#!/usr/bin/env node
/**
 * Timeline Studio — Row Density / Compact View Tests (F52)
 * Covers: DENSITY_PRESETS geometry, migration & _packProj integration,
 *   lane-height formulas (per-density stored heights: height vs heightC),
 *   compact shrink-wrap-on-entry + resizability, density isolation
 *   (compact resizes never touch normal layout), row mapping round-trips,
 *   vertical savings, density-aware autoFitHeights, UI/source wiring checks.
 *
 * Replicates app.js algorithms as pure functions (standard mock-engine pattern).
 */
const fs=require('fs');
const path=require('path');
const{assert,assertT,assertF,assertGte,assertLte,assertIncludes,assertNotIncludes,section,summary}=require('../helpers/assert');

const appSrc=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
const htmlSrc=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');
const cssSrc=fs.readFileSync(path.join(__dirname,'../../styles.css'),'utf8');

// ─── Pure-function replicas of app.js density geometry ────────────────────

const PRESETS={
  normal:{rH:38,bar:22,subMin:50,slDef:120,hKey:'height'},
  compact:{rH:26,bar:15,subMin:36,slDef:40,hKey:'heightC'}
};

/* Replica of the renderTL()/buildExportSVG() per-swimlane height computation.
   Single formula for both densities — only the stored-height field differs. */
function laneHeights(proj,density){
  const g=PRESETS[density]||PRESETS.normal;const out=[];
  for(const sl of proj.swimlanes){
    const slItems=proj.items.filter(i=>i.swimlaneId===sl.id);
    const hasSubs=sl.subSwimlanes&&sl.subSwimlanes.length>0;
    const isMin=sl.collapsed==='minimized',isHid=sl.collapsed==='collapsed';
    const subMeta=[];
    if(hasSubs&&!isMin&&!isHid){
      for(const ss of sl.subSwimlanes){
        if(ss.collapsed==='minimized'){subMeta.push(20);continue}
        const items=slItems.filter(i=>i.subSwimId===ss.id||(!i.subSwimId&&ss===sl.subSwimlanes[0]));
        const vis=items.filter(i=>!(proj.hideMode&&i.hidden));
        const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
        const contentH=Math.max(g.subMin,(mr+1)*g.rH+10);
        subMeta.push(ss[g.hKey]>0?Math.max(ss[g.hKey],contentH):contentH);
      }
    }else if(!isMin&&!isHid){
      const vis=slItems.filter(i=>!(proj.hideMode&&i.hidden));
      const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
      subMeta.push(Math.max(sl[g.hKey]||g.slDef,(mr+1)*g.rH+10));
    }
    out.push(isHid?8:isMin?28:(subMeta.reduce((s,h)=>s+h,0)||80));
  }
  return out;
}

/* Replica of item Y placement and click→row mapping */
function itemY(subRow,density){const g=PRESETS[density];return 6+(subRow||0)*g.rH}
function yToRow(y,density){const g=PRESETS[density];return Math.max(0,Math.floor((y-6)/g.rH))}

/* Replica of the migrate() density normalization */
function migrateDensity(p){if(!p.rowDensity||!PRESETS[p.rowDensity])p.rowDensity='normal';return p}

/* Replica of the density-aware autoFitHeights() write */
function autoFit(proj,density){
  const g=PRESETS[density],hk=g.hKey;let changed=0;
  for(const sl of proj.swimlanes){
    if(sl.collapsed!=='expanded')continue;
    const slItems=proj.items.filter(i=>i.swimlaneId===sl.id);
    if(sl.subSwimlanes&&sl.subSwimlanes.length){
      for(const ss of sl.subSwimlanes){
        if(ss.collapsed==='minimized')continue;
        const items=slItems.filter(i=>i.subSwimId===ss.id||(!i.subSwimId&&ss===sl.subSwimlanes[0]));
        const vis=items.filter(i=>!(proj.hideMode&&i.hidden));
        const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
        const contentH=Math.max(g.subMin,(mr+1)*g.rH+10);
        if(ss[hk]!==contentH){ss[hk]=contentH;changed++}
      }
    }else{
      const vis=slItems.filter(i=>!(proj.hideMode&&i.hidden));
      const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
      const contentH=Math.max(g.subMin,(mr+1)*g.rH+10);
      if(sl[hk]!==contentH){sl[hk]=contentH;changed++}
    }
  }
  return changed;
}

function task(sl,subRow,extra){return Object.assign({type:'task',swimlaneId:sl,subRow:subRow||0,startDate:'2026-01-05',endDate:'2026-01-20'},extra||{})}

// ═══════════════════════════════════════════════════════════════════════
section('DENSITY_PRESETS Source of Truth');
{
  assertIncludes('DENSITY_PRESETS const exists',appSrc,'const DENSITY_PRESETS={');
  assertIncludes('normal preset matches engine replica',appSrc,"normal:{rH:38,bar:22,subMin:50,slDef:120,hKey:'height'}");
  assertIncludes('compact preset matches engine replica',appSrc,"compact:{rH:26,bar:15,subMin:36,slDef:40,hKey:'heightC'}");
  assertIncludes('_rGeom helper reads presets with fallback',appSrc,'_rGeom(){return DENSITY_PRESETS[this.proj.rowDensity]||DENSITY_PRESETS.normal}');
  assertF('no hardcoded rH=38 remains anywhere',/rH=38/.test(appSrc));
  assertF('drag snap-row no longer divides by literal 38',/\/38\)/.test(appSrc));
  assertNotIncludes('shrink flag fully retired (per-density heights instead)',appSrc,'g.shrink');
}

section('Project Defaults, Migration & Share-Link Packing');
{
  assertIncludes('newProj() includes rowDensity default',appSrc,"rowDensity:'normal'");
  assertIncludes('migrate() normalizes rowDensity via presets',appSrc,"if(!p.rowDensity||!DENSITY_PRESETS[p.rowDensity])p.rowDensity='normal'");
  assertIncludes('_packProj strips default rowDensity',appSrc,"'dayColumnWidth','rowDensity',");
  assertIncludes('_packProj strips unset lane heightC',appSrc,'if(!sl.heightC)delete sl.heightC');
  assertIncludes('_packProj strips unset sub heightC',appSrc,'if(!ss.heightC)delete ss.heightC');
  assert('migration: missing → normal',migrateDensity({}).rowDensity,'normal');
  assert('migration: invalid → normal',migrateDensity({rowDensity:'ultra'}).rowDensity,'normal');
  assert('migration: junk type → normal',migrateDensity({rowDensity:42}).rowDensity,'normal');
  assert('migration: compact preserved',migrateDensity({rowDensity:'compact'}).rowDensity,'compact');
  assert('migration: normal preserved',migrateDensity({rowDensity:'normal'}).rowDensity,'normal');
}

section('Lane Heights — Normal Density (existing behavior unchanged)');
{
  // Empty lane, no manual height → 120 default floor
  const p1={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[]}],items:[]};
  assert('empty lane: 120 default',laneHeights(p1,'normal')[0],120);
  // Manual height respected
  const p2={swimlanes:[{id:'s1',collapsed:'expanded',height:200,subSwimlanes:[]}],items:[task('s1',0)]};
  assert('manual 200 respected',laneHeights(p2,'normal')[0],200);
  // Content overflows manual height → grows
  const p3={swimlanes:[{id:'s1',collapsed:'expanded',height:100,subSwimlanes:[]}],items:[task('s1',4)]};
  assert('content overflow grows lane (5×38+10=200)',laneHeights(p3,'normal')[0],200);
  // Sub-swimlane manual height respected
  const p4={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[{id:'ss1',collapsed:'expanded',height:300}]}],items:[task('s1',0,{subSwimId:'ss1'})]};
  assert('sub manual 300 respected',laneHeights(p4,'normal')[0],300);
  // Compact heights are INVISIBLE to normal mode
  const p5={swimlanes:[{id:'s1',collapsed:'expanded',heightC:400,subSwimlanes:[]}],items:[task('s1',0)]};
  assert('heightC 400 ignored in normal → 120',laneHeights(p5,'normal')[0],120);
}

section('Lane Heights — Compact Density (shrink-wrap entry + per-density resize)');
{
  // Empty lane → 40 floor (not 120)
  const p1={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[]}],items:[]};
  assert('empty lane shrinks to 40 floor',laneHeights(p1,'compact')[0],40);
  // Normal manual height invisible to compact — packs to content
  const p2={swimlanes:[{id:'s1',collapsed:'expanded',height:200,subSwimlanes:[]}],items:[task('s1',0)]};
  assert('normal height 200 ignored → 40 (1 row: 36 < 40 floor)',laneHeights(p2,'compact')[0],40);
  // Compact resize (heightC) respected in compact
  const p3={swimlanes:[{id:'s1',collapsed:'expanded',height:200,heightC:90,subSwimlanes:[]}],items:[task('s1',0)]};
  assert('heightC 90 respected in compact',laneHeights(p3,'compact')[0],90);
  assert('…while normal still renders 200',laneHeights(p3,'normal')[0],200);
  // Content can outgrow a compact resize
  const p4={swimlanes:[{id:'s1',collapsed:'expanded',heightC:50,subSwimlanes:[]}],items:[task('s1',9)]};
  assert('content outgrows heightC: 10×26+10=270',laneHeights(p4,'compact')[0],270);
  // Sub-swimlane: normal height ignored, heightC respected
  const p5={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[{id:'ss1',collapsed:'expanded',height:300}]}],items:[task('s1',0,{subSwimId:'ss1'})]};
  assert('sub normal-height 300 ignored → 36 contentH',laneHeights(p5,'compact')[0],36);
  const p6={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[{id:'ss1',collapsed:'expanded',height:300,heightC:80}]}],items:[task('s1',0,{subSwimId:'ss1'})]};
  assert('sub heightC 80 respected in compact',laneHeights(p6,'compact')[0],80);
  assert('…while normal sub still renders 300',laneHeights(p6,'normal')[0],300);
  // Minimized / hidden lanes unchanged by density
  const p7={swimlanes:[{id:'s1',collapsed:'minimized',subSwimlanes:[]},{id:'s2',collapsed:'collapsed',subSwimlanes:[]}],items:[]};
  assert('minimized lane stays 28',laneHeights(p7,'compact')[0],28);
  assert('hidden lane stays 8',laneHeights(p7,'compact')[1],8);
  // Minimized sub-lane stays 20
  const p8={swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[{id:'ss1',collapsed:'minimized'},{id:'ss2',collapsed:'expanded'}]}],items:[task('s1',0,{subSwimId:'ss2'})]};
  assert('minimized sub 20 + expanded sub 36 = 56',laneHeights(p8,'compact')[0],56);
  // hideMode excludes hidden items from row math
  const p9={hideMode:true,swimlanes:[{id:'s1',collapsed:'expanded',subSwimlanes:[]}],items:[task('s1',0),task('s1',7,{hidden:true})]};
  assert('hideMode: hidden row 7 excluded → 40',laneHeights(p9,'compact')[0],40);
}

section('Density Isolation — resizes never leak across modes');
{
  // Simulate: user in compact resizes lanes (writes heightC), then switches back
  const p={swimlanes:[
    {id:'s1',collapsed:'expanded',height:160,subSwimlanes:[]},
    {id:'s2',collapsed:'expanded',subSwimlanes:[{id:'ss1',collapsed:'expanded',height:220}]}
  ],items:[task('s1',1),task('s2',0,{subSwimId:'ss1'})]};
  const normalBefore=laneHeights(p,'normal');
  // compact-mode resizes
  p.swimlanes[0].heightC=130;
  p.swimlanes[1].subSwimlanes[0].heightC=100;
  assert('compact uses the resizes (130)',laneHeights(p,'compact')[0],130);
  assert('compact uses the sub resize (100)',laneHeights(p,'compact')[1],100);
  const normalAfter=laneHeights(p,'normal');
  assert('normal lane heights unchanged by compact resizes',JSON.stringify(normalAfter),JSON.stringify(normalBefore));
  // and auto-fit in compact rewrites ONLY heightC
  autoFit(p,'compact');
  assert('compact autoFit re-shrink-wraps lane (2 rows: 62)',laneHeights(p,'compact')[0],62);
  assert('normal height field untouched by compact autoFit',p.swimlanes[0].height,160);
  assert('normal sub height untouched by compact autoFit',p.swimlanes[1].subSwimlanes[0].height,220);
  assert('normal render still identical',JSON.stringify(laneHeights(p,'normal')),JSON.stringify(normalBefore));
}

section('Vertical Savings — realistic execution timeline');
{
  // 6 swimlanes, mixed manual heights, items up to subRow 2
  const sls=[];const items=[];
  for(let i=0;i<6;i++){sls.push({id:'s'+i,collapsed:'expanded',height:i%2?160:0,subSwimlanes:[]});
    for(let r=0;r<3;r++)items.push(task('s'+i,r))}
  const p={swimlanes:sls,items};
  const nTotal=laneHeights(p,'normal').reduce((a,b)=>a+b,0);
  const cTotal=laneHeights(p,'compact').reduce((a,b)=>a+b,0);
  // normal: 3 lanes @124 (content) + 3 lanes @160 (manual) = 852
  assert('normal total 852px',nTotal,852);
  // compact: 6 lanes @ max(40, 3*26+10=88) = 528
  assert('compact total 528px',cTotal,528);
  assertLte('compact saves ≥ 35%',cTotal,nTotal*0.65);
}

section('Row Mapping Round-Trips (click/drag ↔ render)');
{
  for(const d of['normal','compact']){
    const g=PRESETS[d];
    let ok=true;
    for(let r=0;r<12;r++){
      // click at the vertical center of the bar in row r must map back to row r
      const yCenter=itemY(r,d)+g.bar/2;
      if(yToRow(yCenter,d)!==r){ok=false;break}
      // click at the very top of the bar must also map to row r
      if(yToRow(itemY(r,d),d)!==r){ok=false;break}
    }
    assertT(d+': rows 0–11 round-trip exactly',ok);
    assertLte(d+': bar fits row pitch',g.bar+6,g.rH);
    assertGte(d+': ≥4px inter-row gap',g.rH-g.bar,4);
  }
}

section('autoFitHeights — Density-Aware');
{
  // lastIndexOf: the first occurrence is the _scDispatch alias, the real method comes later.
  const fnStart=appSrc.lastIndexOf('autoFitHeights(){');
  const fnBody=appSrc.slice(fnStart,fnStart+1800);
  assertIncludes('reads active density geometry',fnBody,'const g=this._rGeom(),hk=g.hKey');
  assertIncludes('autoFit uses preset subMin',fnBody,'Math.max(g.subMin,(mr+1)*rH+10)');
  assertIncludes('writes density field (sub)',fnBody,'if(ss[hk]!==contentH){ss[hk]=contentH');
  assertIncludes('writes density field (lane)',fnBody,'if(sl[hk]!==contentH){sl[hk]=contentH');
  assertNotIncludes('no compact early-return guard (autoFit works in both modes)',fnBody,'switch Row Density');
  // Existing wiring assertion from test_auto_fit_heights must keep holding
  assertIncludes('dropdown handler string intact',appSrc,"btn-autofit-heights',()=>{this.$.view_dropdown.classList.add('hidden');this.autoFitHeights()");
  // replica sanity: autoFit in normal mode reproduces the documented formula
  const p={swimlanes:[{id:'s1',collapsed:'expanded',height:999,subSwimlanes:[]}],items:[task('s1',2)]};
  autoFit(p,'normal');
  assert('normal autoFit: 3 rows → 124',p.swimlanes[0].height,124);
}

section('Resize Handles — present and density-aware in BOTH modes');
{
  // Divider handle depends ONLY on the sub above it (the one it resizes) being
  // expanded — a minimized neighbor below must not strand an expanded sub.
  assertIncludes('sub-rh divider keyed to sub-above only',appSrc,'if(!subMeta[smi-1].minimized){bodyH+=`<div class="sub-sw-div sub-rh"');
  assertNotIncludes('old both-neighbors-expanded condition gone',appSrc,'if(!subMeta[smi-1].minimized&&!minimized)');
  assertIncludes('sl-rh handle rendered unconditionally',appSrc,'bodyH+=`<div class="sl-rh" data-sl-id="${sl.id}"></div></div>`');
  // bindRH writes the active density's field with the density's clamp
  const bStart=appSrc.indexOf('bindRH(){');
  const bBody=appSrc.slice(bStart,bStart+2800);
  assertIncludes('bindRH resolves density at drag start',bBody,'const g=this._rGeom(),hk=g.hKey,mn=g.subMin');
  assertIncludes('lane drag writes density field',bBody,'else{sl[hk]=nh}');
  assertIncludes('sub drag writes density field with clamp',bBody,'ss[hk]=Math.max(mn,startH+ev.clientY-sY)');
  assertIncludes('drags seed from rendered height (no dead zone)',bBody,'const ssRendH=ssId=>');
  assertIncludes('sub seed prefers rendered height',bBody,'startH=ssRendH(ss.id)||ss[hk]||mn');
  assertIncludes('parent-resize seeds last sub from rendered height',bBody,'startLastH=lastSs?(ssRendH(lastSs.id)||lastSs[hk]||mn):0');
  assertIncludes('lane-bottom targets last EXPANDED sub',bBody,"[...sl.subSwimlanes].reverse().find(s=>s.collapsed!=='minimized')");
  assertIncludes('lane-bottom no-ops when all subs minimized',bBody,'if(hasSubs&&!lastSs)return;');
}

section('Resize Reachability — expanded subs resizable despite minimized neighbors');
{
  /* Replicas of the two affordance rules:
     - divider handle exists when the sub above it is expanded (resizes that sub)
     - lane-bottom handle resizes the last expanded sub */
  const subHandleTargets=subs=>{const out=[];for(let i=1;i<subs.length;i++){if(!subs[i-1].min)out.push(subs[i-1].id)}return out};
  const laneBottomTarget=subs=>{for(let i=subs.length-1;i>=0;i--){if(!subs[i].min)return subs[i].id}return null};
  const reachable=subs=>new Set([...subHandleTargets(subs),laneBottomTarget(subs)].filter(Boolean));

  // The reported bug: expanded sub ABOVE a minimized sub
  let subs=[{id:'A'},{id:'B',min:true}];
  assertT('[A, Bmin]: A resizable via its divider',reachable(subs).has('A'));
  assert('[A, Bmin]: lane bottom also targets A',laneBottomTarget(subs),'A');
  // Minimized sub above an expanded sub
  subs=[{id:'A',min:true},{id:'B'}];
  assertF('[Amin, B]: no handle resizes minimized A',reachable(subs).has('A'));
  assertT('[Amin, B]: B resizable via lane bottom',reachable(subs).has('B'));
  // Sandwich: expanded subs around a minimized middle
  subs=[{id:'A'},{id:'B',min:true},{id:'C'}];
  assertT('[A, Bmin, C]: A resizable',reachable(subs).has('A'));
  assertF('[A, Bmin, C]: minimized B not resizable',reachable(subs).has('B'));
  assertT('[A, Bmin, C]: C resizable',reachable(subs).has('C'));
  // All minimized → nothing resizable, lane bottom no-ops
  subs=[{id:'A',min:true},{id:'B',min:true}];
  assert('[Amin, Bmin]: lane bottom target null',laneBottomTarget(subs),null);
  assert('[Amin, Bmin]: nothing resizable',reachable(subs).size,0);
  // Invariant sweep: every expanded sub is reachable in all 3-sub collapse combos
  let ok=true;
  for(let mask=0;mask<8;mask++){
    const s=[{id:'s0',min:!!(mask&1)},{id:'s1',min:!!(mask&2)},{id:'s2',min:!!(mask&4)}];
    const r=reachable(s);
    for(const sub of s){if(!sub.min&&!r.has(sub.id)){ok=false}if(sub.min&&r.has(sub.id)){ok=false}}
  }
  assertT('invariant: all 8 collapse combos — expanded ⊆ resizable, minimized ∉ resizable',ok);
}

section('Render / Export / Drag Wiring');
{
  assertIncludes('renderTL reads geometry',appSrc,'th=this.getTheme(),g=this._rGeom(),rH=g.rH');
  assertIncludes('renderTL sets --bar-h CSS var',appSrc,"setProperty('--bar-h',g.bar+'px')");
  assertIncludes('lane height from density field + slDef',appSrc,'h:Math.max(sl[g.hKey]||g.slDef,(mr+1)*rH+10)');
  assertIncludes('sub height from density field',appSrc,'const ssH=ss&&ss[g.hKey]>0?Math.max(ss[g.hKey],contentH):contentH');
  assertIncludes('export bar height from preset',appSrc,'iy=itemY,barH=g.bar');
  assertIncludes('drag closure captures geometry once',appSrc,'const _dg=this._rGeom();/* density geometry');
  assertIncludes('drag ghost height from preset',appSrc,"(gIsT?_dg.bar:16)+'px'");
  assertIncludes('TTT label offset bar-derived (screen)',appSrc,'top:${iy+g.bar+1}px');
  assertIncludes('TTT/float offset bar-derived (export)',appSrc,'y="${iy+g.bar+10}"');
}

section('UI Wiring — View Dropdown, Shortcut, CSS');
{
  assertIncludes('density select in View dropdown',htmlSrc,'id="density-sel"');
  assertT('density section before Header Rows',htmlSrc.indexOf('Row Density')<htmlSrc.indexOf('Header Rows'));
  assertIncludes('normal option',htmlSrc,'<option value="normal" selected>Normal</option>');
  assertIncludes('compact option',htmlSrc,'<option value="compact">Compact</option>');
  assertIncludes('tooltip mentions lanes stay resizable',htmlSrc,'Lanes can still be');
  assertIncludes('onchange handler validates against presets',appSrc,'denSel.onchange=e=>{this.snap();this.proj.rowDensity=DENSITY_PRESETS[e.target.value]');
  assertIncludes('rAF loop re-syncs select (undo-safe)',appSrc,"_ds.value=DENSITY_PRESETS[this.proj.rowDensity]?this.proj.rowDensity:'normal'");
  assertIncludes('shortcut action registered',appSrc,"{id:'toggleDensity',cat:'View',label:'Toggle Row Density',defaults:[],ctx:'tl'}");
  assertIncludes('dispatch cycles preset keys (extensible)',appSrc,'const keys=Object.keys(DENSITY_PRESETS)');
  assertIncludes(':root declares --bar-h fallback',cssSrc,'--bar-h:22px');
  assertIncludes('.tl-task-bar uses var',cssSrc,'.tl-task-bar{height:var(--bar-h,22px)');
}

// ═══════════════════════════════════════════════════════════════════════
const{failed}=summary();
process.exit(failed?1:0);
