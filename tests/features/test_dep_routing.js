#!/usr/bin/env node
/**
 * Timeline Studio — Dependency Line Routing Tests (F67)
 * Covers: stepped (orthogonal elbow) route geometry for all 4 link types,
 *   forward/tight/same-row cases, adaptive narrow-gap Z (no needless S-loops),
 *   vertical milestone attachment (top/bottom tip entry + bottom exit),
 *   density-aware channel math, rounded-corner path emission, arrowhead entry
 *   angles, bar-clearing lag-label placement, curved-style preservation
 *   (byte-identical templates), and option plumbing.
 *
 * Replicates app.js algorithms as pure functions (standard mock-engine pattern).
 */
const fs=require('fs');
const path=require('path');
const{assert,assertT,assertF,assertGte,assertLte,assertIncludes,assertNotIncludes,assertApprox,section,summary}=require('../helpers/assert');

const appSrc=fs.readFileSync(path.join(__dirname,'../../app.js'),'utf8');
const htmlSrc=fs.readFileSync(path.join(__dirname,'../../index.html'),'utf8');

// ─── Pure-function replicas of app.js routing (rH/bar passed explicitly) ──

function orthoPath(pts,r){
  const f=n=>Math.round(n*10)/10;
  let d='M'+f(pts[0][0])+','+f(pts[0][1]);
  for(let i=1;i<pts.length-1;i++){
    const[x0,y0]=pts[i-1],[x1,y1]=pts[i],[x2,y2]=pts[i+1];
    const l1=Math.abs(x1-x0)+Math.abs(y1-y0),l2=Math.abs(x2-x1)+Math.abs(y2-y1);
    const rr=Math.min(r,l1/2,l2/2);
    const ux1=Math.sign(x1-x0),uy1=Math.sign(y1-y0),ux2=Math.sign(x2-x1),uy2=Math.sign(y2-y1);
    if(rr<0.75||(ux1===ux2&&uy1===uy2)){d+=' L'+f(x1)+','+f(y1);continue}
    d+=' L'+f(x1-ux1*rr)+','+f(y1-uy1*rr)+' Q'+f(x1)+','+f(y1)+' '+f(x1+ux2*rr)+','+f(y1+uy2*rr);
  }
  const last=pts[pts.length-1];d+=' L'+f(last[0])+','+f(last[1]);
  return d;
}

function depRoute(sx,sy,tx,ty,dtype,rH,bar,o){
  const STUB=10;o=o||{};bar=bar||22;
  const sameRow=Math.abs(ty-sy)<1,down=ty>=sy;
  let pts,a=null;
  if(dtype==='SS'){const xv=Math.min(sx,tx)-STUB;pts=[[sx,sy],[xv,sy],[xv,ty],[tx,ty]]}
  else if(dtype==='FF'){const xv=Math.max(sx,tx)+STUB;pts=[[sx,sy],[xv,sy],[xv,ty],[tx,ty]]}
  else if(dtype==='SF'){
    if(sameRow&&tx<sx)pts=[[sx,sy],[tx,ty]];
    else if(tx<=sx-2&&!sameRow){const xr=Math.max(sx-STUB,(sx+tx)/2);pts=[[sx,sy],[xr,sy],[xr,ty],[tx,ty]]}
    else{const ych=sameRow?ty+rH/2:(down?ty-rH/2:ty+rH/2);pts=[[sx,sy],[sx-STUB,sy],[sx-STUB,ych],[tx+STUB,ych],[tx+STUB,ty],[tx,ty]]}
  }else{
    if(sameRow&&tx>sx)pts=[[sx,sy],[tx,ty]];
    else if(tx>=sx+2&&!sameRow){const xr=Math.min(sx+STUB,(sx+tx)/2);pts=[[sx,sy],[xr,sy],[xr,ty],[tx,ty]]}
    else if(o.tgtMs&&Math.abs(ty-sy)>=12&&tx+8>=sx-2){const mx=tx+8,ey=down?ty-8:ty+8;pts=[[sx,sy],[mx,sy],[mx,ey]];a=down?Math.PI/2:-Math.PI/2}
    else if(o.srcMs&&Math.abs(ty-sy)>=12){const mx=sx-8,ey=down?sy+8:sy-8;
      if(tx>=mx+4)pts=[[mx,ey],[mx,ty],[tx,ty]];
      else{const ych=down?ty-rH/2:ty+rH/2;pts=[[mx,ey],[mx,ych],[tx-STUB,ych],[tx-STUB,ty],[tx,ty]]}}
    else{const ych=sameRow?ty+rH/2:(down?ty-rH/2:ty+rH/2);pts=[[sx,sy],[sx+STUB,sy],[sx+STUB,ych],[tx-STUB,ych],[tx-STUB,ty],[tx,ty]]}
  }
  pts=pts.filter((p,i)=>i===0||p[0]!==pts[i-1][0]||p[1]!==pts[i-1][1]);
  if(a===null){const pen=pts.length>1?pts[pts.length-2]:pts[0];a=Math.atan2(ty-pen[1],tx-pen[0])}
  let lx=(sx+tx)/2,ly=(sy+ty)/2-6,cand=null;
  for(let i=1;i<pts.length;i++){
    if(pts[i][1]!==pts[i-1][1])continue;
    const dx=Math.abs(pts[i][0]-pts[i-1][0]);
    const row=Math.abs(pts[i][1]-sy)<1||Math.abs(pts[i][1]-ty)<1;
    if(!cand||(cand.row&&!row)||(cand.row===row&&dx>cand.dx))cand={dx,row,x:(pts[i][0]+pts[i-1][0])/2,y:pts[i][1]};
  }
  if(cand){lx=cand.x;ly=cand.y-(cand.row?bar/2+5:6)}
  return{pts,d:orthoPath(pts,5),a,lx,ly};
}

const orthogonal=pts=>{for(let i=1;i<pts.length;i++){if(pts[i][0]!==pts[i-1][0]&&pts[i][1]!==pts[i-1][1])return false}return true};
const countQ=d=>(d.match(/Q/g)||[]).length;

// ═══════════════════════════════════════════════════════════════════════
section('FS Routing — forward, tight, same-row');
{
  // Wide forward gap: Z with the rail a stub past the source
  const r1=depRoute(100,50,300,126,'FS',38);
  assert('forward: 4 waypoints',r1.pts.length,4);
  assert('forward: vertical rail at sx+10',r1.pts[1][0],110);
  assertT('forward: all segments orthogonal',orthogonal(r1.pts));
  assertT('forward: starts at source',r1.d.startsWith('M100,50'));
  assertT('forward: ends at target',r1.d.endsWith('L300,126'));
  assert('forward: 2 rounded corners',countQ(r1.d),2);
  // NARROW forward gap: still a clean Z — rail moves to the midpoint (no S-loop)
  const rn=depRoute(100,50,112,126,'FS',38);
  assert('narrow forward: 4 waypoints (Z, not S)',rn.pts.length,4);
  assert('narrow forward: rail at midpoint',rn.pts[1][0],106);
  assert('narrow forward: corners still rounded',countQ(rn.d),2);
  // Tight/backward: S-route through the channel below the source row
  const r2=depRoute(300,50,250,126,'FS',38);
  assert('tight: 6 waypoints',r2.pts.length,6);
  assert('tight: out-stub at sx+10',r2.pts[1][0],310);
  assert('tight: channel hugs target row (ty-rH/2)',r2.pts[2][1],107);
  assert('tight: in-stub at tx-10',r2.pts[4][0],240);
  assert('tight: 4 rounded corners',countQ(r2.d),4);
  assertT('tight: orthogonal',orthogonal(r2.pts));
  // Target ABOVE: channel goes up
  const r3=depRoute(300,126,250,50,'FS',38);
  assert('tight-up: channel hugs target row (ty+rH/2)',r3.pts[2][1],69);
  // Same row, forward: straight line, no corners
  const r4=depRoute(100,50,300,50,'FS',38);
  assert('same-row forward: 2 waypoints',r4.pts.length,2);
  assert('same-row forward: no corners',countQ(r4.d),0);
  // Same row, backward: dips into the channel below
  const r5=depRoute(300,50,200,50,'FS',38);
  assert('same-row backward: 6 waypoints',r5.pts.length,6);
  assert('same-row backward: dips below by rH/2',r5.pts[2][1],69);
}

section('Milestone Attachment — vertical tip entry/exit (no curls)');
{
  // Task ends ON the milestone date: drop into the star's TOP tip
  const m1=depRoute(300,50,295,126,'FS',38,22,{tgtMs:true});
  assert('M-target: 3 waypoints (out, over, drop)',m1.pts.length,3);
  assert('M-target: drop rail at star center',m1.pts[1][0],303);
  assert('M-target: enters star top tip',JSON.stringify(m1.pts[2]),'[303,118]');
  assertApprox('M-target: arrow points DOWN',m1.a,Math.PI/2,0.001);
  assertT('M-target: orthogonal',orthogonal(m1.pts));
  // Coming from below: enter the BOTTOM tip, arrow points up
  const m2=depRoute(300,126,295,50,'FS',38,22,{tgtMs:true});
  assert('M-target from below: enters bottom tip',JSON.stringify(m2.pts[2]),'[303,58]');
  assertApprox('M-target from below: arrow points UP',m2.a,-Math.PI/2,0.001);
  // Star far LEFT of the source end: vertical entry impossible → normal S
  const m3=depRoute(300,50,280,126,'FS',38,22,{tgtMs:true});
  assert('M-target too far left: falls back to S',m3.pts.length,6);
  // Milestone SOURCE with successor starting at the star: exit the bottom, L into target
  const m4=depRoute(200,50,198,126,'FS',38,22,{srcMs:true});
  assert('M-source L: 3 waypoints',m4.pts.length,3);
  assert('M-source L: exits star bottom',JSON.stringify(m4.pts[0]),'[192,58]');
  assertApprox('M-source L: horizontal entry',Math.cos(m4.a),1,0.001);
  // Successor slightly LEFT of the star: bottom exit + channel, never right of the star
  const m5=depRoute(200,50,190,126,'FS',38,22,{srcMs:true});
  assert('M-source S: 5 waypoints',m5.pts.length,5);
  assert('M-source S: channel hugs target row',m5.pts[1][1],107);
  assertT('M-source S: route never wraps right of the star',m5.pts.every(p=>p[0]<=192));
  // Vertical attachment only kicks in across rows — same-row stays as before
  const m6=depRoute(300,50,295,50,'FS',38,22,{tgtMs:true});
  assert('same-row milestone: classic S (no vertical entry)',m6.pts.length,6);
  // Near-level star (3px offset, e.g. same sub-row): degenerate tip entry rejected
  const m7=depRoute(300,50,295,53,'FS',38,22,{tgtMs:true});
  assert('near-level milestone (<12px drop): falls back to S',m7.pts.length,6);
  const m8=depRoute(200,50,190,53,'FS',38,22,{srcMs:true});
  assert('near-level source star: no bottom exit',m8.pts.length,6);
}

section('Density-Aware Channel (rH from _rGeom)');
{
  assert('normal density: target channel at ty-19',depRoute(300,50,250,126,'FS',38).pts[2][1],107);
  assert('compact density: target channel at ty-13',depRoute(300,50,250,126,'FS',26).pts[2][1],113);
  assertIncludes('app uses _rGeom() geometry in route builder',appSrc,'const g=this._rGeom(),STUB=10,rH=g.rH,bar=g.bar');
}

section('SS / FF / SF Routing');
{
  const ss=depRoute(120,50,180,126,'SS',38);
  assert('SS: rail x = min-10',ss.pts[1][0],110);
  assertT('SS: orthogonal',orthogonal(ss.pts));
  assertApprox('SS: enters target pointing right',Math.cos(ss.a),1,0.001);
  const ss2=depRoute(200,50,120,126,'SS',38);
  assert('SS reversed: rail x = min-10',ss2.pts[1][0],110);
  const ff=depRoute(220,50,180,126,'FF',38);
  assert('FF: rail x = max+10',ff.pts[1][0],230);
  assertApprox('FF: enters target pointing left',Math.cos(ff.a),-1,0.001);
  const sf=depRoute(300,50,150,126,'SF',38);
  assert('SF forward: 4 waypoints',sf.pts.length,4);
  assert('SF forward: rail at sx-10',sf.pts[1][0],290);
  assertApprox('SF: enters target pointing left',Math.cos(sf.a),-1,0.001);
  // SF narrow backward gap: adaptive rail at midpoint
  const sfn=depRoute(300,50,288,126,'SF',38);
  assert('SF narrow: 4 waypoints (Z, not S)',sfn.pts.length,4);
  assert('SF narrow: rail at midpoint',sfn.pts[1][0],294);
  const sf2=depRoute(150,50,300,126,'SF',38);
  assert('SF tight: 6 waypoints',sf2.pts.length,6);
  assert('SF tight: in-stub at tx+10',sf2.pts[4][0],310);
}

section('Arrowhead Entry & Lag Labels');
{
  for(const[args,name]of[[[100,50,300,126,'FS'],'FS fwd'],[[300,50,250,126,'FS'],'FS tight'],[[120,50,180,126,'SS'],'SS'],[[220,50,180,126,'FF'],'FF'],[[300,50,150,126,'SF'],'SF']]){
    const r=depRoute(args[0],args[1],args[2],args[3],args[4],38);
    assertApprox(name+': horizontal entry (sin≈0)',Math.sin(r.a),0,0.001);
  }
  // Z route: label rides the long row run but LIFTS above the bar (bar/2+5)
  const r=depRoute(100,50,300,126,'FS',38,22);
  assert('row-run label x = midpoint of longest run',r.lx,205);
  assert('row-run label clears the bar (normal)',r.ly,110);
  const rc=depRoute(100,50,300,126,'FS',26,15);
  assert('row-run label clears the bar (compact)',rc.ly,113.5);
  // S route: channel run preferred over longer row runs, modest 6px lift
  const s=depRoute(300,50,250,126,'FS',38,22);
  assert('channel label x = run midpoint',s.lx,275);
  assert('channel label y = channel-6',s.ly,101);
}

section('Rounded-Corner Path Emitter');
{
  const d1=orthoPath([[0,0],[10,0],[10,2],[30,2]],5);
  assertT('clamped radius still emits Q',countQ(d1)===2);
  const d2=orthoPath([[0,0],[10,0],[10,1],[30,1]],5);
  assert('sub-pixel corner falls back to square',countQ(d2),0);
  const d3=orthoPath([[0,0],[10,0],[20,0]],5);
  assert('collinear: no corners',countQ(d3),0);
  const d4=orthoPath([[0.123,0.567],[20.111,0.567]],5);
  assert('coords rounded to 0.1px',d4,'M0.1,0.6 L20.1,0.6');
}

section('Curved Style Preserved (default, byte-identical)');
{
  const curvedTemplate='pd=`M${sx},${sy} C${mx},${sy} ${mx},${ty} ${tx},${ty}`;a=Math.atan2(ty-sy,tx-mx);lgx=(sx+tx)/2;lgy=(sy+ty)/2-6';
  const n=appSrc.split(curvedTemplate).length-1;
  assert('curved bezier template intact in BOTH renderers',n,2);
  const arrow='points="${tx},${ty} ${tx-s*Math.cos(a-.4)},${ty-s*Math.sin(a-.4)} ${tx-s*Math.cos(a+.4)},${ty-s*Math.sin(a+.4)}"';
  assertGte('arrowhead polygon template unchanged (2 renderers)',appSrc.split(arrow).length-1,2);
  assert('stepped branch in BOTH renderers',appSrc.split('this._depRoute(sx,sy,tx,ty,dtype,').length-1,2);
  assertIncludes('on-screen branch passes milestone flags',appSrc,"{srcMs:pred.type==='milestone',tgtMs:it.type==='milestone'}");
  assertIncludes('export branch passes milestone flags',appSrc,"{srcMs:pred&&pred.type==='milestone',tgtMs:it.type==='milestone'}");
  assertIncludes('on-screen branch reads proj.depLineStyle',appSrc,"(this.proj.depLineStyle||'curved')==='stepped'");
  assertIncludes('export branch reads p.depLineStyle',appSrc,"(p.depLineStyle||'curved')==='stepped'");
}

section('Option Plumbing — defaults, migration, share links, UI');
{
  assertIncludes('newProj default curved',appSrc,"depFilter:'all',depLineStyle:'curved'");
  assertIncludes('migrate validates style',appSrc,"if(!p.depLineStyle||!['curved','stepped'].includes(p.depLineStyle))p.depLineStyle='curved'");
  assertIncludes('_packProj strips default',appSrc,"'depFilter','depLineStyle',");
  assertIncludes('View dropdown select exists',htmlSrc,'id="view-dep-style"');
  assertIncludes('curved option',htmlSrc,'<option value="curved" selected>Curved</option>');
  assertIncludes('stepped option',htmlSrc,'<option value="stepped">Stepped</option>');
  assertIncludes('Settings radios exist',htmlSrc,'name="s-dep-style"');
  assertIncludes('menu-open sync',appSrc,"vds0.value=this.proj.depLineStyle||'curved'");
  assertIncludes('onchange writes style + cross-syncs Settings radio',appSrc,"this.proj.depLineStyle=vds.value==='stepped'?'stepped':'curved'");
  assertIncludes('showSettings syncs radios',appSrc,"const dsVal=p.depLineStyle||'curved'");
  assertIncludes('applySettings reads radios',appSrc,"p.depLineStyle=depSR&&depSR.value==='stepped'?'stepped':'curved'");
  const mig=p=>{if(!p.depLineStyle||!['curved','stepped'].includes(p.depLineStyle))p.depLineStyle='curved';return p};
  assert('migration: missing → curved',mig({}).depLineStyle,'curved');
  assert('migration: junk → curved',mig({depLineStyle:'zigzag'}).depLineStyle,'curved');
  assert('migration: stepped preserved',mig({depLineStyle:'stepped'}).depLineStyle,'stepped');
}

// ═══════════════════════════════════════════════════════════════════════
const{failed}=summary();
process.exit(failed?1:0);
