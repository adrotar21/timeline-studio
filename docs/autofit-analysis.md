# Timeline Studio — Auto-Layout & Fit System: Code Analysis Document

> **Purpose:** Standalone reference for analyzing the auto-arrange, auto-fit heights, and fit-to-content systems in Timeline Studio. Contains all raw code logic with annotations explaining how each piece interfaces with the broader app. Designed for copy-paste into a separate AI chat for architecture review.

---

## Table of Contents
1. [Context & Goals](#context--goals)
2. [Data Model](#data-model)
3. [Core Algorithm: `_autoLayoutItems()`](#core-algorithm-_autolayoutitems)
4. [Entry Points: `autoArrange()` & Import](#entry-points-autoarrange--import)
5. [Auto-Fit Heights: `autoFitHeights()`](#auto-fit-heights-autofittheights)
6. [Fit-to-Content: `fitToContent()` & `fitToSelection()`](#fit-to-content-fittocontent--fittoselection)
7. [Supporting Infrastructure](#supporting-infrastructure)
8. [Tunable Settings & Live Preview UI](#tunable-settings--live-preview-ui)
9. [Rendering Pipeline: How `subRow` Becomes Pixels](#rendering-pipeline-how-subrow-becomes-pixels)
10. [Known Gaps & Desired Improvements](#known-gaps--desired-improvements)

---

## 1. Context & Goals

Timeline Studio is a vanilla JS (no frameworks, no build tools) Gantt chart app. All logic lives in a single `app.js` (~4400 lines). The app renders tasks and milestones on a scrollable SVG/HTML timeline organized into swimlanes and optional sub-swimlanes.

**The core use case for auto-layout:** A user imports 30–50+ items (from Excel paste or CSV) into one or more swimlanes and needs them cleanly organized — no overlaps, visually readable, with a natural top-left → bottom-right waterfall flow. The result needs to look good for leadership reviews.

**Three cooperating systems:**
1. **`_autoLayoutItems()`** — Assigns `subRow` (vertical row within a swimlane/sub-swimlane) to each item based on density, date spread, and tunable parameters.
2. **`autoFitHeights()`** — Shrinks swimlane heights to tightly wrap the content after layout.
3. **`fitToContent()`** — Adjusts zoom and scroll to frame all visible items in the viewport.

These three are typically used in sequence after a large import: auto-arrange → auto-fit heights → fit-to-content.

---

## 2. Data Model

### Item Structure (relevant fields)
```js
{
  id: 'unique-id',
  type: 'task' | 'milestone',
  name: 'Task Name',
  startDate: '2026-03-01',    // tasks only
  endDate: '2026-03-15',      // tasks only (INCLUSIVE — last active day)
  date: '2026-03-01',         // milestones only
  swimlaneId: 'sl-id',        // which swimlane
  subSwimId: 'ss-id' | '',    // which sub-swimlane (empty = first sub or none)
  subRow: 0,                  // vertical row index within the sub-swimlane band
  labelPosition: 'right' | 'left' | 'top' | 'bottom' | 'center',
  fontSize: 11,               // per-item override (default from proj.fontSize)
  deps: [{id:'pred-id', type:'FS', lag:0}],  // dependency links
  hidden: false,
  pinned: false,
  duration: 10,
  durMode: 'cal' | 'work',
  // ... status, color, owner, showDate, etc.
}
```

### Project-Level Arrange Settings
```js
{
  arrangeSpread: 50,       // 0–100 slider: row spread (0=dense pack, 100=one-item-per-row)
  arrangePadding: 50,      // 0–100 slider: label padding between items (maps to 10–120px)
  arrangeDateWeight: 20,   // 0–100 slider: 0=waterfall by date, 100=pack top-down by index
  arrangeLabels: false,    // boolean: consider label width in collision detection
  timescale: 'months',     // weeks|months|quarters|years — affects pixel density
  fontSize: 11,            // global font size for label measurement
  zoom: 100,               // current zoom percentage
}
```

### Swimlane Structure
```js
{
  id: 'sl-id',
  name: 'Phase 1',
  height: 120,              // pixel height
  collapsed: 'expanded',    // 'expanded' | 'minimized' | 'collapsed'
  subSwimlanes: [
    { id: 'ss-id', name: 'Frontend', height: 0, collapsed: 'expanded' }
    // height 0 = content-derived; collapsed: 'expanded' | 'minimized'
  ]
}
```

---

## 3. Core Algorithm: `_autoLayoutItems()`

This is the main layout engine. Called by both import (on new items only) and auto-arrange (on all/selected items).

```js
/* Density-Based Auto-Layout — tunable via proj.arrangeSpread and proj.arrangePadding.
   Computes a row budget from item density, distributes items using date-elapsed
   percentage for natural top-left → bottom-right waterfall, then compacts empties.
   Used by both import (newItems only) and autoArrange (any scope). */
_autoLayoutItems(items){
  if(!items||!items.length)return;
  const p=this.proj;

  /* Use zoom=100% as reference so layout is deterministic regardless of current view zoom */
  const baseCw={weeks:60,months:100,quarters:200,years:400}[p.timescale]||100;
  const daysPerCol={weeks:7,months:30,quarters:91,years:365}[p.timescale]||30;
  const pxPerDay=Math.max(0.5,baseCw/daysPerCol);
  const fs=p.fontSize||11;

  /* Tunable parameters from project settings */
  const padPx=10+((p.arrangePadding!=null?p.arrangePadding:50)/100)*110; /* 10–120px */
  const spread=(p.arrangeSpread!=null?p.arrangeSpread:50)/100;            /* 0.0–1.0 */
  const dateWt=(100-(p.arrangeDateWeight!=null?p.arrangeDateWeight:20))/100; /* slider 0→waterfall, 100→pack */
  const useLabels=!!p.arrangeLabels; /* consider label width in collision detection */

  /* Group by swimlane+sub-swimlane */
  const grps=new Map();
  items.forEach(it=>{
    const k=it.swimlaneId+'|'+(it.subSwimId||'');
    if(!grps.has(k))grps.set(k,[]);
    grps.get(k).push(it)
  });

  for(const[,grp]of grps){
    /* Step 1: Sort chronologically */
    grp.sort((a,b)=>{
      const da=new Date((a.date||a.startDate||'')+'T12:00:00');
      const db=new Date((b.date||b.startDate||'')+'T12:00:00');
      return da-db
    });

    /* Step 2: Compute visual ends and density stats */
    let earliestStart=null,latestVE=null,totalVisDays=0;
    const meta=[];
    for(const it of grp){
      const s=it.date||it.startDate||'';
      const e=it.endDate||it.date||s;
      const lp=it.labelPosition||'right';
      const nameW=useLabels?this._mt(it.name||'',fs,'600'):0;
      const barDur=Math.max(1,U.days(s,e)+1);
      const barPx=barDur*pxPerDay;
      let totalPx=barPx+padPx; /* padPx always adds inter-item breathing room */
      if(useLabels&&nameW){
        if(lp==='right') totalPx=barPx+nameW+padPx;
        else if(lp==='top'||lp==='bottom'){
          const half=nameW/2, barHalf=barPx/2;
          if(half>barHalf) totalPx=Math.max(totalPx,barPx+(half-barHalf)*2+padPx)
        }
        /* left, center: label doesn't extend rightward past bar → totalPx stays barPx+padPx */
      }
      const totalDays=Math.max(barDur,Math.ceil(totalPx/pxPerDay));
      const ve=U.addDays(s,totalDays);
      meta.push({s,ve,totalDays});
      totalVisDays+=totalDays;
      if(!earliestStart||s<earliestStart) earliestStart=s;
      if(!latestVE||ve>latestVE) latestVE=ve;
    }

    /* Step 3: Density → row budget (tuned by spread slider) */
    const N=grp.length;
    const dateSpan=Math.max(1,U.days(earliestStart,latestVE));
    const avgVisDays=totalVisDays/N;
    const coverage=(N*avgVisDays)/dateSpan;
    const minRows=Math.max(1,Math.ceil(coverage));
    const rawTarget=minRows+spread*(N-minRows); /* lerp: minRows → N */
    const targetRows=U.clamp(Math.round(rawTarget),1,N);

    /* Step 4: Date-based proportional placement with spiral search */
    const rowEnds=[]; /* rowEnds[r] = visual end ISO string */
    for(let i=0;i<N;i++){
      const it=grp[i],{s,ve}=meta[i];
      /* Preferred row: blend index-based (pack) and date-based (waterfall) via dateWt */
      const idxPct=N>1?i/(N-1):0;           /* 0→first item, 1→last item (pack top-down) */
      const daysPct=Math.max(0,U.days(earliestStart,s))/dateSpan; /* date-elapsed % */
      const blended=idxPct*(1-dateWt)+daysPct*dateWt; /* lerp between pack and waterfall */
      const preferred=Math.min(targetRows-1,Math.floor(blended*targetRows));

      let placed=-1;
      const maxSearch=Math.max(rowEnds.length+1,targetRows+1);
      for(let off=0;off<=maxSearch&&placed<0;off++){
        const candidates=off===0?[preferred]:[preferred-off,preferred+off];
        for(const r of candidates){
          if(r<0) continue;
          if(r<rowEnds.length){
            if(U.days(rowEnds[r],s)>=1){placed=r;break} /* ≥1 day gap = no overlap */
          }else if(r===rowEnds.length){placed=r;break}   /* new row */
        }
      }
      if(placed>=0){
        while(rowEnds.length<=placed) rowEnds.push(null);
        rowEnds[placed]=ve;
        it.subRow=placed;
      }else{
        rowEnds.push(ve);
        it.subRow=rowEnds.length-1;
      }
    }

    /* Step 5: Compact empty rows */
    const used=new Set(grp.map(it=>it.subRow));
    const sorted=[...used].sort((a,b)=>a-b);
    const rMap=new Map();
    sorted.forEach((old,idx)=>rMap.set(old,idx));
    grp.forEach(it=>{it.subRow=rMap.get(it.subRow)});
  }
},
```

### Algorithm Summary

1. **Group** items by swimlane + sub-swimlane key
2. **Sort** each group chronologically by start date
3. **Compute** visual extents per item (bar width + optional label width → "visual end date")
4. **Calculate density** → row budget: `coverage = (N × avgVisDays) / dateSpan`, then spread slider lerps between `minRows` (tight pack) and `N` (one item per row)
5. **Place** each item using a **blended preferred row** (mix of chronological index % and date-elapsed %), then **upward-first spiral search** from preferred row to find first non-overlapping slot
6. **Compact** — remove empty rows by remapping indices

---

## 4. Entry Points: `autoArrange()` & Import

### `autoArrange(scope)` — User-triggered via context menu or keyboard shortcut

```js
/* Auto-Arrange — delegates to label-aware _autoLayoutItems.
   When scope='all' or 'swimlane', we must include ALL items in affected groups
   so density calculation matches import. For 'selection', we still include the
   full sub-swimlane group so the algorithm sees the same density context. */
autoArrange(scope='all'){
  this.snap(); // capture undo state
  let items;
  if(scope==='selection'&&this.sel.length){
    /* Collect full sub-swimlane groups for any selected item so density context matches */
    const grpKeys=new Set();
    this.sel.forEach(id=>{
      const it=this.gi(id);
      if(it) grpKeys.add(it.swimlaneId+'|'+(it.subSwimId||''))
    });
    items=this.proj.items.filter(it=>grpKeys.has(it.swimlaneId+'|'+(it.subSwimId||'')));
  }else if(scope==='swimlane'&&this.sel.length){
    const it=this.gi(this.sel[0]);
    items=it?this.proj.items.filter(i=>i.swimlaneId===it.swimlaneId):[];
  }else{
    items=[...this.proj.items];
  }
  this._autoLayoutItems(items);
  this.sched(); // mark dirty → triggers rAF → re-render
  this.autoSave();
  this.toast('Auto-arranged!')
},
```

### Import Call Path

During paste-import from Excel/CSV, after items are created but before they're pushed into `proj.items`:

```js
/* Pass 2.5: Auto-layout rows (skip if Row column explicitly mapped) */
const hasRowMapping=this._impMappings.some(m=>m.tgtField==='Row')
  || this._impOverloads.some(ov=>ov.tgtField==='Row');
if(!hasRowMapping) this._autoLayoutItems(newItems);

/* Pass 3: Finalize */
newItems.forEach(it=>this.proj.items.push(it));
if(this.proj.autoSortSwimlanes) this._sortSwimlanesGravity();
if(this.proj.autoRange) this.autoRange();
```

**Key detail:** Import runs `_autoLayoutItems` on **new items only** (not the full project), so density is calculated against only the import batch. Existing items in the same swimlane/sub-swimlane are NOT considered for overlap detection.

---

## 5. Auto-Fit Heights: `autoFitHeights()`

Shrinks swimlane/sub-swimlane pixel heights to tightly wrap content. Called after auto-arrange or independently.

```js
autoFitHeights(){
  this.snap();
  const p=this.proj, rH=38; // row height constant = 38px per subRow
  let changed=0;
  for(const sl of p.swimlanes){
    if(sl.collapsed!=='expanded') continue; // skip collapsed/minimized swimlanes
    const slItems=p.items.filter(i=>i.swimlaneId===sl.id);
    const hasSubs=sl.subSwimlanes?.length>0;
    if(hasSubs){
      for(const ss of sl.subSwimlanes){
        if(ss.collapsed==='minimized') continue;
        // Route unassigned items (subSwimId='') to first sub-swimlane
        const ssItems=slItems.filter(i=>
          i.subSwimId===ss.id || (!i.subSwimId && ss===sl.subSwimlanes[0])
        );
        const vis=ssItems.filter(i=>!(p.hideMode&&i.hidden));
        const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0), 0); // max subRow in use
        const contentH=Math.max(50, (mr+1)*rH + 10); // min 50px, else rows*38 + 10px padding
        if(ss.height!==contentH){ss.height=contentH; changed++}
      }
    }else{
      const vis=slItems.filter(i=>!(p.hideMode&&i.hidden));
      const mr=vis.reduce((m,i)=>Math.max(m,i.subRow||0), 0);
      const contentH=Math.max(50, (mr+1)*rH + 10);
      if(sl.height!==contentH){sl.height=contentH; changed++}
    }
  }
  this.sched(); this.autoSave();
  this.toast(changed
    ? `Heights auto-fitted (${changed} lane${changed===1?'':'s'})`
    : 'Heights already optimal'
  );
},
```

### Key Formula
`contentHeight = max(50, (maxSubRow + 1) × 38 + 10)`

- 38px per row (item bar height + spacing)
- 10px bottom padding
- Minimum 50px even if empty

---

## 6. Fit-to-Content: `fitToContent()` & `fitToSelection()`

### `fitToContent()` — Zoom-to-fit all visible items

The tricky part: **bar positions scale with zoom, but text label widths are fixed pixels.** This requires an iterative solver.

```js
fitToContent(){
  const bs=this.$.tl_body_scroll; if(!bs) return;
  const panelW=this.panelOpen?290:0;
  const vpW=bs.clientWidth-panelW; // available viewport width
  const p=this.proj;

  // Filter out items in collapsed swimlanes and minimized sub-swimlanes
  const collapsedSlIds=new Set(
    p.swimlanes.filter(sl=>sl.collapsed!=='expanded').map(sl=>sl.id)
  );
  const collapsedSubIds=new Set();
  p.swimlanes.forEach(sl=>{
    if(sl.subSwimlanes) sl.subSwimlanes.forEach(ss=>{
      if(ss.collapsed==='minimized') collapsedSubIds.add(ss.id)
    })
  });
  const items=p.items.filter(i=>
    !(p.hideMode&&i.hidden)
    && !collapsedSlIds.has(i.swimlaneId)
    && (!i.subSwimId || !collapsedSubIds.has(i.subSwimId))
  );
  if(!items.length){p.zoom=100; this.sched(); return}

  /* Pre-compute per-item geometry at z=1:
     barLeft/barRight (scales with zoom) and fixed-px text offsets.
     At any zoom z: item's absolute left = z*barL - textLeft
                    item's absolute right = z*barR + textRight
     Goal: max(all rights) - min(all lefts) + pad <= vpW. Solve for z iteratively. */
  const savedZoom=p.zoom||100;
  p.zoom=100;
  const tl1=this.met(); // compute metrics at zoom=100%

  const itemGeom=[]; // {bL, bR, tL, tR} per item
  for(const it of items){
    const lp=it.labelPosition||'right';
    const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(it);
    let bL, bR, tL=0, tR=0;
    if(it.type==='task'){
      const x1=this.dX(it.startDate,tl1);
      const x2=this.dXEnd(it.endDate,tl1);
      if(x1===null||x2===null) continue;
      bL=x1; bR=x2;
      if(lp==='right')      tR=6+labelW;
      else if(lp==='left')  tL=6+labelW;
      else if(lp==='top'||lp==='bottom'){
        const half=labelW/2, barHalf=(x2-x1)/2;
        if(half>barHalf){tL=half-barHalf; tR=half-barHalf}
      }
      if(edgeLW) tL=Math.max(tL,edgeLW);
      if(edgeRW) tR=Math.max(tR,edgeRW);
    }else{
      const x=this.dXMid(it.date,tl1);
      if(x===null) continue;
      bL=x-8; bR=x+8;
      if(lp==='right')      tR=12+labelW;
      else if(lp==='left')  tL=12+labelW;
      else if(lp==='top'||lp==='bottom'||lp==='center'){
        const half=labelW/2;
        if(half>8){tL=half-8; tR=half-8}
      }
    }
    itemGeom.push({bL,bR,tL,tR});
  }
  if(!itemGeom.length){p.zoom=savedZoom; this.sched(); return}

  /* Iterative solve: start at z=1, refine 4 rounds for text/bar convergence */
  const pad=40;
  let z=1;
  for(let iter=0;iter<4;iter++){
    let minAbs=Infinity, maxAbs=-Infinity;
    for(const g of itemGeom){
      minAbs=Math.min(minAbs, z*g.bL - g.tL);
      maxAbs=Math.max(maxAbs, z*g.bR + g.tR);
    }
    const needed=maxAbs-minAbs+pad;
    z=z*(vpW/needed); // scale z to fit
  }

  const newZoom=U.clamp(Math.round(z*100), 10, 300);
  p.zoom=newZoom;
  this.sched();

  /* Post-render: compute scroll position at final zoom */
  requestAnimationFrame(()=>{
    const zFinal=newZoom/100;
    let minAbs=Infinity;
    for(const g of itemGeom) minAbs=Math.min(minAbs, zFinal*g.bL - g.tL);
    bs.scrollLeft=Math.max(0, minAbs-20); // 20px left padding
  });
  this.toast('Fit to content');
},
```

### `fitToSelection()` — Same algorithm but filtered to selected items only

Identical structure to `fitToContent()` but operates on `this.sel` items. Falls back to `fitToContent()` if selection is empty. Shortcut: `Ctrl+Shift+G`.

---

## 7. Supporting Infrastructure

### Text Measurement: `_mt(text, fontSize, fontWeight)`

Uses an offscreen canvas for pixel-accurate text width. Critical for both layout collision detection and fit calculations.

```js
_mt(text,fontSize,fontWeight){
  if(!this._mCtx){
    const c=document.createElement('canvas');
    this._mCtx=c.getContext('2d')
  }
  this._mCtx.font=(fontWeight||'600')+' '+fontSize+'px "DM Sans",sans-serif';
  return this._mCtx.measureText(text||'').width;
},
```

### Label Width Measurement: `_itemLabelWidths(it)`

Returns `{labelW, edgeLW, edgeRW}` — the pixel widths of primary label, left edge date label, and right edge date label. Accounts for status inline prefixes, owner text, duration text, and date formatting.

```js
_itemLabelWidths(it){
  const p=this.proj, gfs=p.fontSize||11, fs=it.fontSize||gfs;

  // Inline status prefix
  const sd=this._getStatusDef(it.status);
  const sdCfg=p.statusDisplay||{};
  const sdMode=sdCfg.mode||'emoji';
  const useInline=sd&&sdCfg.show&&(sdCfg.badgePos||'inline')==='inline';
  const inlineTxt=useInline
    ? (sdMode==='emoji' ? sd.emoji+' '
      : sdMode==='text' ? sd.name+' '
      : '('+sd.shortName+') ')
    : '';
  const inlineExtra=inlineTxt?this._mt(inlineTxt,fs,'700'):0;
  const nameW=this._mt(it.name||'',fs,'600')+inlineExtra;

  let secW=0;
  if(it.type==='task'){
    const parts=[];
    if(it.showOwner&&it.owner) parts.push(it.owner);
    if(it.showDuration) parts.push(this._fmtDurLabel?this._fmtDurLabel(it):'00d');
    if(parts.length>1) secW=this._mt(parts[0]+' ('+parts[1]+')', Math.max(8,fs-1.5), '400');
    else if(parts.length===1) secW=this._mt(parts[0], Math.max(8,fs-1.5), '400');
  }else if(it.type!=='task'&&it.showDate!==false){
    let dtStr='';
    const hasOwner=it.showOwner&&it.owner;
    if(hasOwner){dtStr=it.owner; if(it.date) dtStr+=' · '+U.fmt(it.date,it.dateFormat||p.dateFormat)}
    else{dtStr=U.fmt(it.date,it.dateFormat||p.dateFormat)}
    if(dtStr) secW=this._mt(dtStr,fs-1,'400');
  }
  const labelW=Math.max(nameW,secW)+8;

  let edgeLW=0, edgeRW=0;
  if(it.type==='task'){
    if(it.showStartDate) edgeLW=this._mt(U.fmt(it.startDate,it.dateFormat||p.dateFormat),Math.max(8,fs-1),'400')+4;
    if(it.showEndDate) edgeRW=this._mt(U.fmt(it.endDate,it.dateFormat||p.dateFormat),Math.max(8,fs-1),'400')+4;
  }
  return{labelW, edgeLW, edgeRW};
},
```

### Item Extents: `_itemExtents(items, tl)`

Returns `{minPx, maxPx}` — the leftmost and rightmost pixel positions across all items including their text labels. Used by export fit and on-screen fit.

```js
_itemExtents(items,tl){
  let minPx=Infinity, maxPx=-Infinity;
  for(const it of items){
    const lp=it.labelPosition||'right';
    const{labelW,edgeLW,edgeRW}=this._itemLabelWidths(it);
    if(it.type==='task'){
      const x1=this.dX(it.startDate,tl), x2=this.dXEnd(it.endDate,tl);
      if(x1!==null&&x2!==null){
        let itemL=x1, itemR=x2;
        if(lp==='right') itemR=Math.max(x2, x2+6+labelW);
        else if(lp==='left') itemL=Math.min(x1, x1-6-labelW);
        else if(lp==='top'||lp==='bottom'){
          const halfLabel=labelW/2;
          itemL=Math.min(itemL, x1+(x2-x1)/2-halfLabel);
          itemR=Math.max(itemR, x1+(x2-x1)/2+halfLabel);
        }
        if(edgeLW) itemL=Math.min(itemL, x1-edgeLW);
        if(edgeRW) itemR=Math.max(itemR, x2+edgeRW);
        minPx=Math.min(minPx,itemL); maxPx=Math.max(maxPx,itemR);
      }
    }else{
      const x=this.dXMid(it.date,tl);
      if(x!==null){
        let itemL=x-8, itemR=x+8;
        if(lp==='right') itemR=Math.max(itemR, x+12+labelW);
        else if(lp==='left') itemL=Math.min(itemL, x-12-labelW);
        else if(lp==='top'||lp==='bottom'||lp==='center'){
          const halfLabel=labelW/2;
          itemL=Math.min(itemL, x-halfLabel);
          itemR=Math.max(itemR, x+halfLabel);
        }
        minPx=Math.min(minPx,itemL); maxPx=Math.max(maxPx,itemR);
      }
    }
  }
  if(minPx===Infinity||maxPx===-Infinity) return null;
  return{minPx, maxPx};
},
```

### Coordinate System Helpers

```js
// Compute timeline metrics: columns, cell width, total width
met(){
  const p=this.proj;
  const start=new Date(p.timelineStart+'T12:00:00');
  const end=new Date(p.timelineEnd+'T12:00:00');
  const z=(p.zoom||100)/100;
  const cols=[]; // array of {label, start, end, year, month, quarter}
  // ... builds column array based on timescale (weeks/months/quarters/years)
  const cw=({weeks:60,months:100,quarters:200,years:400}[p.timescale]||100)*z;
  return{start, end, cols, cw, tw:cols.length*cw, z}
},

// Date → pixel X position (left edge of date's cell fraction)
dX(ds,tl){
  if(!ds||!tl.cols.length) return null;
  const d=new Date(ds+'T12:00:00');
  for(let i=0;i<tl.cols.length;i++){
    const c=tl.cols[i];
    const cs=new Date(c.start+'T12:00:00');
    const ce=new Date(c.end+'T12:00:00');
    if(d>=cs&&d<=ce){
      const cd=Math.max(1,U.days(c.start,c.end)+1);
      return i*tl.cw + (U.days(c.start,ds)/cd)*tl.cw
    }
  }
  // Handle dates outside column range (extrapolate)
  // ...
},

// Pixel X at END of a day (for right edges of task bars)
dXEnd(ds,tl){ return this.dX(U.addDays(ds,1),tl) },

// Pixel X at CENTER of a day (for milestone icons)
dXMid(ds,tl){
  const a=this.dX(ds,tl), b=this.dX(U.addDays(ds,1),tl);
  return (a!=null&&b!=null) ? (a+b)/2 : a
},
```

---

## 8. Tunable Settings & Live Preview UI

The auto-arrange has a settings panel with live preview. When "Live Preview" is checked, the settings modal becomes draggable/transparent and every slider change re-runs the layout in real time.

```js
/* Live preview state */
let liveSnapped=false;
const liveUpdate=()=>{
  if(!arrLiveChk||!arrLiveChk.checked) return;
  if(!liveSnapped){this.snap(); liveSnapped=true}  // single undo capture
  p.arrangeSpread=+arrSpEl.value;
  p.arrangePadding=+arrPdEl.value;
  if(arrDwEl) p.arrangeDateWeight=+arrDwEl.value;
  if(arrLabChk) p.arrangeLabels=arrLabChk.checked;
  this._autoLayoutItems([...p.items]);
  this.sched()  // → rAF → re-render timeline
};

// Sliders bound to liveUpdate on input
arrSpEl.oninput=function(){arrSpVal.textContent=this.value; liveUpdate()};
arrPdEl.oninput=function(){arrPdVal.textContent=this.value; liveUpdate()};
arrDwEl.oninput=function(){arrDwVal.textContent=this.value; liveUpdate()};
arrLabChk.onchange=function(){liveUpdate()};
```

### Slider Ranges & Defaults
| Slider | Range | Default | Effect |
|--------|-------|---------|--------|
| Row Spread | 0–100 | 50 | 0=dense pack (min rows), 100=max spread (one per row) |
| Label Padding | 0–100 | 50 | Maps to 10–120px horizontal gap between items |
| Date Weight | 0–100 | 20 | 0=waterfall (date-proportional rows), 100=pack (index-based top-down) |
| Consider Labels | bool | false | Include label pixel width in overlap detection |

---

## 9. Rendering Pipeline: How `subRow` Becomes Pixels

The `rI()` function (render Item) converts `subRow` to a vertical pixel offset:

```js
rI(it, tl, rH, yOff, violatedIds, th, critIds){
  // ...
  const y = yOff + 6 + (it.subRow||0) * rH;  // rH = 38px
  const left = x - (isT ? 0 : 8);  // tasks left-aligned, milestones centered
  // ...
  h+=`<div class="${cls}" data-iid="${it.id}" style="left:${left}px;top:${y}px;...">`;
  // ...
}
```

**`yOff`** is the cumulative Y offset computed during `renderTL()` — it accounts for the swimlane header height, previous swimlane heights, and sub-swimlane divider positions. Each item's absolute Y position is:

```
absoluteY = swimlaneTopOffset + subSwimlaneBandOffset + 6px padding + (subRow × 38px)
```

---

## 10. Known Gaps & Desired Improvements

### Gap 1: No Dependency-Aware Row Preference (BIGGEST GAP)
The current algorithm sorts by date and uses a date/index blend for preferred row, but it **completely ignores dependency relationships**. When items have FS/SS/FF dependencies:
- Predecessor and successor should ideally be on the **same row or adjacent rows** for visual clarity
- Dependency arrows crossing many rows look messy and are hard to follow
- The "preferred row" calculation should weight connected items toward proximity

**Current state:** Dependencies exist in the data (`it.deps[]`) but `_autoLayoutItems` never reads them. The dependency engine (topological sort, float calculation, critical path) is fully implemented elsewhere in the codebase but not consulted during layout.

### Gap 2: Import vs. Existing Items
When importing new items into a swimlane that already has items, `_autoLayoutItems` only sees the new items — it doesn't know about existing items already placed in the same swimlane/sub-swimlane. This can cause overlaps between new and existing items.

### Gap 3: No Visual Priority for Critical Path
Items on the critical path could get preferred placement (e.g., row 0) to make the critical path visually prominent, but the layout doesn't consider critical path status.

### Gap 4: Milestone Clustering
When many milestones share the same date (common in project management), they all compete for the same row. The algorithm handles this through spiral search, but there's no explicit strategy for grouping related milestones.

### Gap 5: Label Overlap Detection is Approximate
The `useLabels` flag adds label width to the "visual end" date, but this is a 1D approximation. Labels at different `subRows` can't actually overlap horizontally (they're on different vertical rows), so the padding is sometimes overly conservative.

### Desired Outcome
For 50+ item imports with dependencies: items should flow in a clean waterfall where dependency chains read left-to-right on the same or adjacent rows, critical path items get visual prominence (top rows), and the result requires minimal manual adjustment. Think of it as "auto-layout that a project manager would be proud to screenshot."
