#!/usr/bin/env node
/**
 * Timeline Studio — Auto-Fit Swimlane Heights (F33) Tests
 * Covers: autoFitHeights() logic, shortcut registration, edge cases
 *   (collapsed/minimized swimlanes, sub-swimlanes, hideMode, empty lanes,
 *    idempotency, unassigned items routing, mixed states).
 *
 * ~25 tests
 */
const{assert,assertT,assertF,assertNeq,section,summary}=require('../helpers/assert');
const{U}=require('../helpers/mock-engine');
const{makeItem,resetItemCounter}=require('../helpers/builders');

// ─── Read SHORTCUT_ACTIONS from app.js ─────────────────────────────────
const fs=require('fs');
const path=require('path');
const appSrc=fs.readFileSync(path.resolve(__dirname,'../../app.js'),'utf8');

// ─── autoFitHeights mock — mirrors app.js implementation ───────────────
const rH=38;

function autoFitHeights(proj){
  const p=proj;
  let changed=0;
  for(const sl of p.swimlanes){
    if(sl.collapsed!=='expanded')continue;
    const slItems=p.items.filter(i=>i.swimlaneId===sl.id);
    const hasSubs=sl.subSwimlanes?.length>0;
    if(hasSubs){
      for(const ss of sl.subSwimlanes){
        if(ss.collapsed==='minimized')continue;
        const ssItems=slItems.filter(i=>i.subSwimId===ss.id||(!i.subSwimId&&ss===sl.subSwimlanes[0]));
        const vis=ssItems.filter(i=>!(p.hideMode&&i.hidden));
        const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
        const contentH=Math.max(50,(mr+1)*rH+10);
        if(ss.height!==contentH){ss.height=contentH;changed++}
      }
    }else{
      const vis=slItems.filter(i=>!(p.hideMode&&i.hidden));
      const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0),0);
      const contentH=Math.max(50,(mr+1)*rH+10);
      if(sl.height!==contentH){sl.height=contentH;changed++}
    }
  }
  return changed;
}

function contentH(maxSubRow){return Math.max(50,(maxSubRow+1)*rH+10)}

// ─── Project builder ───────────────────────────────────────────────────
function mkProj(overrides={}){
  return Object.assign({
    version:2,
    hideMode:false,
    swimlanes:[{id:'sw1',name:'Default',color:'',collapsed:'expanded',height:120,subSwimlanes:[]}],
    items:[],
  },overrides);
}

// ═══════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════
resetItemCounter();

// ─── Shortcut Registration ─────────────────────────────────────────────
section('Shortcut Registration');
{
  const match=appSrc.match(/\{id:'autoFitHeights'[^}]+\}/);
  assertT('autoFitHeights in SHORTCUT_ACTIONS',match);
  if(match){
    assertT('category is View',match[0].includes("cat:'View'"));
    assertT('label is Auto Fit Heights',match[0].includes("label:'Auto Fit Heights'"));
    assertT('context is tl',match[0].includes("ctx:'tl'"));
    assertT('defaults is empty array',match[0].includes("defaults:[]"));
  }
}
{
  const dispatchMatch=appSrc.match(/autoFitHeights\(\)\{this\.autoFitHeights\(\)\}/);
  assertT('autoFitHeights in _scDispatch',!!dispatchMatch);
}

// ─── Button Registration ───────────────────────────────────────────────
section('Button Registration');
{
  const htmlSrc=fs.readFileSync(path.resolve(__dirname,'../../index.html'),'utf8');
  assertT('Auto Fit button exists in HTML',htmlSrc.includes('id="btn-autofit-heights"'));
  assertT('Button text is Auto Fit ↕',htmlSrc.includes('>Auto Fit ↕</button>'));
  assertT('Button in same group as Expand/Collapse',htmlSrc.includes('btn-collapse-all') && htmlSrc.includes('btn-autofit-heights'));
}
{
  assertT('btn-autofit-heights handler in app.js',appSrc.includes("on('btn-autofit-heights'"));
  assertT('handler closes view dropdown',appSrc.includes("btn-autofit-heights',()=>{this.$.view_dropdown.classList.remove('show');this.autoFitHeights()"));
}

// ─── Basic: Single Swimlane, No Items ──────────────────────────────────
section('Basic — Single Swimlane, No Items');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:200,subSwimlanes:[]}],items:[]});
  const ch=autoFitHeights(p);
  assert('empty lane shrinks to min 50',p.swimlanes[0].height,contentH(0));
  assert('contentH(0) = 50',contentH(0),50);
  assert('changed count is 1',ch,1);
}

// ─── Basic: Single Swimlane, One Item (subRow 0) ──────────────────────
section('Basic — Single Swimlane, 1 Item subRow 0');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:200,subSwimlanes:[]}],
    items:[makeItem('task',{swimlaneId:'sw1',subRow:0})]});
  const ch=autoFitHeights(p);
  assert('height set to contentH(0)=50 (since Max(50,48)=50)',p.swimlanes[0].height,contentH(0));
  // contentH(0) = Max(50, (0+1)*38+10) = Max(50, 48) = 50
  assert('changed count is 1',ch,1);
}

// ─── Basic: Multiple Rows ──────────────────────────────────────────────
section('Basic — Multiple Rows');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:400,subSwimlanes:[]}],
    items:[
      makeItem('task',{swimlaneId:'sw1',subRow:0}),
      makeItem('task',{swimlaneId:'sw1',subRow:1}),
      makeItem('task',{swimlaneId:'sw1',subRow:2}),
    ]});
  const ch=autoFitHeights(p);
  // contentH(2) = Max(50, (2+1)*38+10) = Max(50, 124) = 124
  assert('3 rows → height=124',p.swimlanes[0].height,contentH(2));
  assert('contentH(2) = 124',contentH(2),124);
  assert('changed count is 1',ch,1);
}

// ─── Height Already Optimal ────────────────────────────────────────────
section('Height Already Optimal');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:contentH(1),subSwimlanes:[]}],
    items:[
      makeItem('task',{swimlaneId:'sw1',subRow:0}),
      makeItem('task',{swimlaneId:'sw1',subRow:1}),
    ]});
  const ch=autoFitHeights(p);
  assert('no changes when optimal',ch,0);
  assert('height unchanged',p.swimlanes[0].height,contentH(1));
}

// ─── Idempotency ───────────────────────────────────────────────────────
section('Idempotency');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:500,subSwimlanes:[]}],
    items:[makeItem('task',{swimlaneId:'sw1',subRow:3})]});
  autoFitHeights(p);
  const h1=p.swimlanes[0].height;
  const ch2=autoFitHeights(p);
  assert('second run returns 0 changes',ch2,0);
  assert('height same after second run',p.swimlanes[0].height,h1);
}

// ─── Collapsed Swimlane Skipped ────────────────────────────────────────
section('Collapsed / Minimized Swimlanes Skipped');
{
  const p=mkProj({swimlanes:[
    {id:'sw1',name:'Collapsed',color:'',collapsed:'collapsed',height:300,subSwimlanes:[]},
    {id:'sw2',name:'Minimized',color:'',collapsed:'minimized',height:300,subSwimlanes:[]},
    {id:'sw3',name:'Expanded',color:'',collapsed:'expanded',height:300,subSwimlanes:[]},
  ],items:[
    makeItem('task',{swimlaneId:'sw1',subRow:0}),
    makeItem('task',{swimlaneId:'sw2',subRow:0}),
    makeItem('task',{swimlaneId:'sw3',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  assert('collapsed lane height unchanged',p.swimlanes[0].height,300);
  assert('minimized lane height unchanged',p.swimlanes[1].height,300);
  assert('expanded lane height fitted',p.swimlanes[2].height,contentH(0));
  assert('only 1 lane changed',ch,1);
}

// ─── Sub-Swimlanes: Basic ──────────────────────────────────────────────
section('Sub-Swimlanes — Basic');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:200},
    {id:'ss2',name:'Sub 2',color:'',collapsed:'expanded',height:200},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:0}),
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:1}),
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss2',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  // ss1: maxSubRow=1, contentH(1)=Max(50, 86)=86
  // ss2: maxSubRow=0, contentH(0)=Max(50, 48)=50
  assert('ss1 height = contentH(1)',p.swimlanes[0].subSwimlanes[0].height,contentH(1));
  assert('ss2 height = contentH(0)',p.swimlanes[0].subSwimlanes[1].height,contentH(0));
  assert('contentH(1) = 86',contentH(1),86);
  assert('2 sub-swimlanes changed',ch,2);
}

// ─── Sub-Swimlane: Minimized Sub Skipped ───────────────────────────────
section('Sub-Swimlane — Minimized Sub Skipped');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:300},
    {id:'ss2',name:'Sub 2',color:'',collapsed:'minimized',height:300},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:0}),
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss2',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  assert('expanded sub fitted',p.swimlanes[0].subSwimlanes[0].height,contentH(0));
  assert('minimized sub height unchanged',p.swimlanes[0].subSwimlanes[1].height,300);
  assert('only 1 sub changed',ch,1);
}

// ─── Unassigned Items Route to First Sub ───────────────────────────────
section('Unassigned Items Route to First Sub-Swimlane');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:200},
    {id:'ss2',name:'Sub 2',color:'',collapsed:'expanded',height:200},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'',subRow:0}),   // unassigned → ss1
    makeItem('task',{swimlaneId:'sw1',subSwimId:'',subRow:1}),   // unassigned → ss1
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss2',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  // ss1 gets unassigned items: maxSubRow=1 → contentH(1)=86
  // ss2: maxSubRow=0 → contentH(0)=50
  assert('unassigned items counted in first sub',p.swimlanes[0].subSwimlanes[0].height,contentH(1));
  assert('ss2 has own items only',p.swimlanes[0].subSwimlanes[1].height,contentH(0));
  assert('2 subs changed',ch,2);
}

// ─── hideMode: Hidden Items Excluded ───────────────────────────────────
section('hideMode ON — Hidden Items Excluded');
{
  const p=mkProj({hideMode:true,swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:300,subSwimlanes:[]}],
    items:[
      makeItem('task',{swimlaneId:'sw1',subRow:0,hidden:false}),
      makeItem('task',{swimlaneId:'sw1',subRow:1,hidden:true}),  // hidden — excluded
      makeItem('task',{swimlaneId:'sw1',subRow:2,hidden:true}),  // hidden — excluded
    ]});
  const ch=autoFitHeights(p);
  // Only visible item at subRow 0 → contentH(0)=50
  assert('hidden items excluded → height=contentH(0)',p.swimlanes[0].height,contentH(0));
  assert('changed count is 1',ch,1);
}

// ─── hideMode OFF: Hidden Items Included ───────────────────────────────
section('hideMode OFF — Hidden Items Included');
{
  const p=mkProj({hideMode:false,swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:300,subSwimlanes:[]}],
    items:[
      makeItem('task',{swimlaneId:'sw1',subRow:0,hidden:false}),
      makeItem('task',{swimlaneId:'sw1',subRow:1,hidden:true}),  // hidden but hideMode off
      makeItem('task',{swimlaneId:'sw1',subRow:2,hidden:true}),  // hidden but hideMode off
    ]});
  const ch=autoFitHeights(p);
  // All items visible: maxSubRow=2 → contentH(2)=124
  assert('hideMode off → all items included → height=contentH(2)',p.swimlanes[0].height,contentH(2));
  assert('changed count is 1',ch,1);
}

// ─── Multiple Swimlanes ───────────────────────────────────────────────
section('Multiple Swimlanes');
{
  const p=mkProj({swimlanes:[
    {id:'sw1',name:'A',color:'',collapsed:'expanded',height:400,subSwimlanes:[]},
    {id:'sw2',name:'B',color:'',collapsed:'expanded',height:400,subSwimlanes:[]},
    {id:'sw3',name:'C',color:'',collapsed:'expanded',height:400,subSwimlanes:[]},
  ],items:[
    makeItem('task',{swimlaneId:'sw1',subRow:0}),
    makeItem('task',{swimlaneId:'sw2',subRow:0}),
    makeItem('task',{swimlaneId:'sw2',subRow:1}),
    makeItem('task',{swimlaneId:'sw2',subRow:2}),
    // sw3 has no items
  ]});
  const ch=autoFitHeights(p);
  assert('sw1 = contentH(0)',p.swimlanes[0].height,contentH(0));
  assert('sw2 = contentH(2)',p.swimlanes[1].height,contentH(2));
  assert('sw3 (empty) = contentH(0)',p.swimlanes[2].height,contentH(0));
  assert('all 3 lanes changed',ch,3);
}

// ─── Large subRow ──────────────────────────────────────────────────────
section('Large subRow');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:100,subSwimlanes:[]}],
    items:[makeItem('task',{swimlaneId:'sw1',subRow:10})]});
  const ch=autoFitHeights(p);
  // contentH(10) = Max(50, (11)*38+10) = 428
  assert('large subRow → height=428',p.swimlanes[0].height,contentH(10));
  assert('contentH(10) = 428',contentH(10),428);
  assert('changed count is 1',ch,1);
}

// ─── Milestones ────────────────────────────────────────────────────────
section('Milestones');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:300,subSwimlanes:[]}],
    items:[
      makeItem('milestone',{swimlaneId:'sw1',subRow:0}),
      makeItem('milestone',{swimlaneId:'sw1',subRow:1}),
    ]});
  const ch=autoFitHeights(p);
  assert('milestones use subRow like tasks',p.swimlanes[0].height,contentH(1));
  assert('changed',ch,1);
}

// ─── Mixed Collapsed Parent With Subs ──────────────────────────────────
section('Collapsed Parent With Sub-Swimlanes');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'collapsed',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:300},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  assert('collapsed parent → subs not touched',p.swimlanes[0].subSwimlanes[0].height,300);
  assert('no changes',ch,0);
}

// ─── All Swimlanes Collapsed ───────────────────────────────────────────
section('All Swimlanes Collapsed — No Changes');
{
  const p=mkProj({swimlanes:[
    {id:'sw1',name:'A',color:'',collapsed:'collapsed',height:300,subSwimlanes:[]},
    {id:'sw2',name:'B',color:'',collapsed:'minimized',height:300,subSwimlanes:[]},
  ],items:[
    makeItem('task',{swimlaneId:'sw1',subRow:0}),
    makeItem('task',{swimlaneId:'sw2',subRow:0}),
  ]});
  const ch=autoFitHeights(p);
  assert('collapsed stays at 300',p.swimlanes[0].height,300);
  assert('minimized stays at 300',p.swimlanes[1].height,300);
  assert('zero changes',ch,0);
}

// ─── Sub-swimlane: Empty Sub ───────────────────────────────────────────
section('Sub-Swimlane — Empty Sub');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:200},
    {id:'ss2',name:'Sub 2',color:'',collapsed:'expanded',height:200},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:0}),
    // ss2 has no items
  ]});
  const ch=autoFitHeights(p);
  assert('ss1 fitted',p.swimlanes[0].subSwimlanes[0].height,contentH(0));
  assert('ss2 empty → min 50',p.swimlanes[0].subSwimlanes[1].height,contentH(0));
  assert('2 subs changed',ch,2);
}

// ─── Height Never Below 50 ────────────────────────────────────────────
section('Minimum Height Floor is 50px');
{
  const p=mkProj({swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:30,subSwimlanes:[]}],items:[]});
  autoFitHeights(p);
  // Even if current height is below 50, autoFit sets to contentH which floors at 50
  assert('height floors at 50 even from below',p.swimlanes[0].height,50);
}

// ─── Non-explicit contentH values (not 0 sentinel) ────────────────────
section('Explicit contentH Values (Not Zero)');
{
  // Verify auto-fit never sets height to 0 (the auto-size sentinel)
  const p=mkProj({swimlanes:[
    {id:'sw1',name:'A',color:'',collapsed:'expanded',height:200,subSwimlanes:[]},
    {id:'sw2',name:'B',color:'',collapsed:'expanded',height:200,subSwimlanes:[
      {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:200},
    ]},
  ],items:[]});
  autoFitHeights(p);
  assertT('swimlane height is never 0',p.swimlanes[0].height>0);
  assertT('sub-swimlane height is never 0',p.swimlanes[1].subSwimlanes[0].height>0);
  assert('swimlane gets explicit 50',p.swimlanes[0].height,50);
  assert('sub gets explicit 50',p.swimlanes[1].subSwimlanes[0].height,50);
}

// ─── hideMode with sub-swimlanes ──────────────────────────────────────
section('hideMode with Sub-Swimlanes');
{
  const p=mkProj({hideMode:true,swimlanes:[{id:'sw1',name:'A',color:'',collapsed:'expanded',height:120,subSwimlanes:[
    {id:'ss1',name:'Sub 1',color:'',collapsed:'expanded',height:300},
  ]}],items:[
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:0,hidden:false}),
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:1,hidden:true}),
    makeItem('task',{swimlaneId:'sw1',subSwimId:'ss1',subRow:2,hidden:false}),
  ]});
  const ch=autoFitHeights(p);
  // Visible items at subRow 0 and 2 → maxSubRow=2 → contentH(2)=124
  assert('hideMode excludes hidden in subs',p.swimlanes[0].subSwimlanes[0].height,contentH(2));
  assert('1 sub changed',ch,1);
}

// ─── Items at subRow 0 only (single row) ──────────────────────────────
section('Content Height Formula Verification');
{
  // Verify the formula: contentH = Max(50, (maxSubRow+1)*38+10)
  assert('0 rows (empty): contentH=50',contentH(0),50);          // Max(50, 48)=50
  assert('1 row (subRow 0): contentH=50',contentH(0),50);        // Max(50, 48)=50 (48 < 50)
  assert('2 rows (subRow 1): contentH=86',contentH(1),86);       // Max(50, 86)=86
  assert('3 rows (subRow 2): contentH=124',contentH(2),124);     // Max(50, 124)=124
  assert('5 rows (subRow 4): contentH=200',contentH(4),200);     // Max(50, 200)=200
  assert('10 rows (subRow 9): contentH=390',contentH(9),390);    // Max(50, 390)=390
}

// ═══════════════════════════════════════════════════════════════════════
const{total,passed,failed}=summary();
process.exit(failed?1:0);
