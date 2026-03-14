/**
 * Timeline Studio — Licensing & Tier System Tests
 * Comprehensive coverage: tier config, gates, limits, cache, activation,
 * deactivation, expiry, staleness, GitHub bypass, project embedding.
 *
 * Tests mock the licensing logic (no DOM, no fetch, no IDB) to verify
 * pure state transitions and logic correctness.
 *
 * NOTE: Features are currently set to rank 0 (free tier gets all features).
 * Tests verify this "all unlocked" state AND that the gating hooks still
 * work when ranks are bumped back to 1+ in the future.
 */

const {assert,assertT,assertF,assertNeq,assertIncludes,section,summary}=require('../helpers/assert');

/* ── Tier Config Defaults (mirrors app.js _TIER_CONFIG_DEFAULTS) ── */
const _TIER_CONFIG_DEFAULTS={
  tiers:{
    free:{rank:0,label:'Free',limits:{swimlanes:5,items:25}},
    boardroom:{rank:1,label:'Boardroom',limits:{swimlanes:Infinity,items:Infinity}},
    execution:{rank:2,label:'Execution',limits:{swimlanes:Infinity,items:Infinity}},
  },
  features:{
    themes_all:0,export_clean:0,csv_export:0,csv_import:0,
    critical_path:0,auto_scheduling:0,dependencies:0,
    presenter_mode:0,show_float:0,
  },
  freeThemes:['warm','cool','light','midnight'],
  variantMap:{boardroom_annual:'boardroom',execution_annual:'execution'},
};
const ALL_FEATURES=Object.keys(_TIER_CONFIG_DEFAULTS.features);

/* Deep clone that preserves Infinity (JSON.stringify turns Infinity→null) */
function deepClone(obj){
  if(obj===null||typeof obj!=='object')return obj;
  if(Array.isArray(obj))return obj.map(deepClone);
  const out={};for(const k of Object.keys(obj))out[k]=deepClone(obj[k]);
  return out;
}

/* ── Fake localStorage ───────────────────────────────────────────── */
function makeFakeLS(){
  const store=new Map();
  return{
    getItem(k){return store.has(k)?store.get(k):null},
    setItem(k,v){store.set(k,String(v))},
    removeItem(k){store.delete(k)},
    clear(){store.clear()},
    _dump(){return Object.fromEntries(store)},
  };
}

/* ── Mock App factory ────────────────────────────────────────────── */
function makeApp(overrides={},extLS=null){
  const ls=extLS||makeFakeLS();
  const app={
    _LICENSING_ENABLED:true,
    _resolvedTier:'free',
    _tierConfig:null,
    _isGitHubPages:false,
    _revalidateCalled:false,
    _clearStorageCalled:false,
    proj:{swimlanes:[],items:[]},
    _ls:ls, /* exposed for test assertions */

    _initTierConfig(){
      const _fixLimits=(tier,defTier)=>{if(!tier||!tier.limits)return;if(!defTier||!defTier.limits)return;for(const k in defTier.limits){if(tier.limits[k]===null||tier.limits[k]===undefined)tier.limits[k]=defTier.limits[k]}};
      try{
        const raw=ls.getItem('tls3_tierConfig');
        if(raw){
          const parsed=JSON.parse(raw);
          /* Deep-merge each tier so limits survive */
          const mergedTiers={};
          for(const k in _TIER_CONFIG_DEFAULTS.tiers)mergedTiers[k]={..._TIER_CONFIG_DEFAULTS.tiers[k],limits:{..._TIER_CONFIG_DEFAULTS.tiers[k].limits,...(parsed.tiers&&parsed.tiers[k]?parsed.tiers[k].limits:{})},...(parsed.tiers&&parsed.tiers[k]?parsed.tiers[k]:{})};
          if(parsed.tiers)for(const k in parsed.tiers){if(!mergedTiers[k])mergedTiers[k]=parsed.tiers[k]}
          for(const k in mergedTiers)_fixLimits(mergedTiers[k],_TIER_CONFIG_DEFAULTS.tiers[k]);
          this._tierConfig={
            tiers:mergedTiers,
            features:{..._TIER_CONFIG_DEFAULTS.features,...(parsed.features||{})},
            freeThemes:parsed.freeThemes||_TIER_CONFIG_DEFAULTS.freeThemes,
            variantMap:{..._TIER_CONFIG_DEFAULTS.variantMap,...(parsed.variantMap||{})},
          };return;
        }
      }catch(e){}
      this._tierConfig=deepClone(_TIER_CONFIG_DEFAULTS);
    },
    _checkTier(feature){
      if(!this._LICENSING_ENABLED)return true;
      const cfg=this._tierConfig;const tierKey=this._resolvedTier||'free';
      const tier=cfg.tiers[tierKey]||cfg.tiers.free;
      const req=cfg.features[feature];
      if(req===undefined)return true;
      return tier.rank>=req;
    },
    _checkLimit(type){
      if(!this._LICENSING_ENABLED)return true;
      const cfg=this._tierConfig;const tierKey=this._resolvedTier||'free';
      const tier=cfg.tiers[tierKey]||cfg.tiers.free;
      const lim=tier.limits||{};
      if(type==='swimlanes'){const max=lim.swimlanes;return max===null||max===undefined||max===Infinity||this.proj.swimlanes.length<=max}
      if(type==='items'){const max=lim.items;return max===null||max===undefined||max===Infinity||this.proj.items.length<=max}
      return true;
    },
    _tierLabel(){
      const cfg=this._tierConfig;const tierKey=this._resolvedTier||'free';
      return(cfg.tiers[tierKey]||cfg.tiers.free).label;
    },
    _tierLimits(){
      const cfg=this._tierConfig;const tierKey=this._resolvedTier||'free';
      return(cfg.tiers[tierKey]||cfg.tiers.free).limits;
    },
    _readLicenseCache(){
      try{const raw=ls.getItem('tls3_license');if(raw){const lic=JSON.parse(raw);if(lic.valid&&lic.tier)return lic}}catch(e){}
      return null;
    },
    _applyLicenseCache(lic){
      if(lic.expiresAt&&new Date(lic.expiresAt)<new Date()){
        this._resolvedTier='free';
        this._clearLicenseStorage();return;
      }
      this._resolvedTier=lic.tier;
      const age=Date.now()-new Date(lic.lastChecked||0).getTime();
      if(age>3*24*60*60*1000)this._revalidateCalled=true;
    },
    _storeLicense(lic){
      try{ls.setItem('tls3_license',JSON.stringify(lic))}catch(e){}
    },
    _clearLicenseStorage(){
      this._clearStorageCalled=true;
      try{ls.removeItem('tls3_license')}catch(e){}
    },
    _loadLicense(){
      try{const devTier=ls.getItem('tls3_devTier');if(devTier&&this._tierConfig.tiers[devTier]){this._resolvedTier=devTier;return}}catch(e){}
      const lic=this._readLicenseCache();
      if(lic){this._applyLicenseCache(lic);return}
      this._resolvedTier='free';
    },
    _deactivateLicense(){
      this._clearLicenseStorage();
      this._resolvedTier='free';
    },
    /* Simplified _populateLicenseSection state logic (no DOM) — returns computed state */
    _computeLicenseUIState(){
      const cfg=this._tierConfig;
      let lic=null;try{const raw=ls.getItem('tls3_license');if(raw)lic=JSON.parse(raw)}catch(e){}
      const isLicensed=lic&&lic.valid&&lic.tier;
      const isExpired=lic&&lic.expiresAt&&new Date(lic.expiresAt)<new Date();
      /* Sync _resolvedTier from license if drifted — but respect dev override */
      const devOverride=ls.getItem('tls3_devTier');
      if(!devOverride&&isLicensed&&!isExpired&&this._resolvedTier!==lic.tier){this._resolvedTier=lic.tier}
      const tierKey=this._resolvedTier||'free';
      /* For display: use license tier when licensed (even expired) */
      const displayTierKey=isLicensed&&lic?lic.tier:tierKey;
      const tierName=(cfg.tiers[displayTierKey]||cfg.tiers.free).label;
      const displayName=isLicensed?tierName:'Free Plan';
      let badge='Free',badgeClass='license-badge-free';
      if(isExpired){badge='Expired';badgeClass='license-badge-expired'}
      else if(isLicensed){badge='Active';badgeClass='license-badge-active'}
      const who=isLicensed&&lic?(lic.customerEmail||lic.customerName||''):'';
      const detailsText=isLicensed?(who?'Licensed to: '+who:'Licensed'):'';
      return{displayName,badge,badgeClass,isLicensed:!!isLicensed,isExpired:!!isExpired,
        showKeyRow:!isLicensed,showFreeInfo:!isLicensed,detailsText,tierKey,displayTierKey};
    },
    /* Activation response parser (no fetch) */
    _parseActivationResponse(data,key){
      if(!data.valid)return{success:false,error:data.error||data.message||(data.license_key&&data.license_key.status_formatted)||'Invalid license key'};
      const lk=data.license_key||{};const meta=data.meta||{};
      const variantName=(meta.variant_name||'').toLowerCase().replace(/\s+/g,'_');
      const tier=this._tierConfig.variantMap[variantName]||'boardroom';
      const lic={key,tier,valid:true,variant:variantName,
        expiresAt:lk.expires_at||null,createdAt:lk.created_at||null,
        lastChecked:new Date().toISOString(),
        customerEmail:meta.customer_email||lk.customer_email||'',
        customerName:meta.customer_name||'',
        productName:meta.product_name||'',orderId:meta.order_id||null,
        status:lk.status||'active'};
      return{success:true,lic,tier};
    },
    /* Menu gating logic (no DOM) — returns which items would be gated */
    _computeMenuGating(){
      if(!this._LICENSING_ENABLED)return{gated:[]};
      const map=[
        {id:'btn-present',feature:'presenter_mode'},
        {id:'btn-crit-path',feature:'critical_path'},
        {id:'btn-toggle-sched',feature:'auto_scheduling'},
        {id:'btn-show-float',feature:'show_float'},
        {id:'btn-tools-exp-csv',feature:'csv_export'},
      ];
      const gated=[];
      map.forEach(({id,feature})=>{if(!this._checkTier(feature))gated.push(id)});
      if(!this._checkTier('csv_import'))gated.push('imp-adv-toggle');
      return{gated};
    },
  };
  Object.assign(app,overrides);
  app._initTierConfig();
  return app;
}

function makeSwimlanes(n){return Array.from({length:n},(_,i)=>({id:'sl'+i}))}
function makeItems(n){return Array.from({length:n},(_,i)=>({id:'it'+i}))}

/* ═════════════════════════════════════════════════════════════════ */
/* 1. Tier Config Initialization                                    */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('1. Tier Config Initialization');
  const app=makeApp();
  const cfg=app._tierConfig;
  assert('free tier rank',cfg.tiers.free.rank,0);
  assert('boardroom rank',cfg.tiers.boardroom.rank,1);
  assert('execution rank',cfg.tiers.execution.rank,2);
  assert('3 tiers defined',Object.keys(cfg.tiers).length,3);
  assert('all 9 features defined',Object.keys(cfg.features).length,9);
  assert('all features rank 0 (unlocked)',Object.values(cfg.features).every(v=>v===0),true);
  assert('freeThemes includes all 4',cfg.freeThemes.length,4);
  assert('variantMap boardroom_annual',cfg.variantMap.boardroom_annual,'boardroom');
  assert('variantMap execution_annual',cfg.variantMap.execution_annual,'execution');

  /* localStorage override merges with defaults */
  const ov=makeApp();
  ov._ls.setItem('tls3_tierConfig',JSON.stringify({tiers:{custom:{rank:3,label:'Custom',limits:{swimlanes:Infinity,items:Infinity}}}}));
  ov._initTierConfig();
  assertT('override adds custom tier',!!ov._tierConfig.tiers.custom);
  assertT('override preserves free tier',!!ov._tierConfig.tiers.free);

  /* Corrupted config → defaults */
  const bad=makeApp();
  bad._ls.setItem('tls3_tierConfig','{broken json');
  bad._initTierConfig();
  assert('corrupted config fallback to free rank',bad._tierConfig.tiers.free.rank,0);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 2. _checkTier Logic                                              */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('2. _checkTier Logic');

  /* Kill switch OFF → always true */
  const off=makeApp({_LICENSING_ENABLED:false,_resolvedTier:'free'});
  ALL_FEATURES.forEach(f=>assertT('kill switch OFF: '+f+' allowed',off._checkTier(f)));

  /* With features at rank 0, free tier passes all checks */
  const free=makeApp({_resolvedTier:'free'});
  ALL_FEATURES.forEach(f=>assertT('free (rank 0 features): '+f+' allowed',free._checkTier(f)));

  /* Boardroom and execution also pass */
  const board=makeApp({_resolvedTier:'boardroom'});
  ALL_FEATURES.forEach(f=>assertT('boardroom: '+f+' allowed',board._checkTier(f)));
  const exec=makeApp({_resolvedTier:'execution'});
  ALL_FEATURES.forEach(f=>assertT('execution: '+f+' allowed',exec._checkTier(f)));

  /* Unknown feature → permissive */
  assertT('unknown feature allowed',free._checkTier('nonexistent'));
  /* Unknown tier → falls back to free */
  const unk=makeApp({_resolvedTier:'xyzzy'});
  assertT('unknown tier falls back to free (rank 0 features pass)',unk._checkTier('themes_all'));

  /* When features are bumped to rank 1+, gating kicks in */
  const gated=makeApp({_resolvedTier:'free'});
  gated._tierConfig.features.themes_all=1;
  assertF('rank 1 feature blocks free tier',gated._checkTier('themes_all'));
  gated._resolvedTier='boardroom';
  assertT('rank 1 feature passes boardroom',gated._checkTier('themes_all'));

  /* Custom rank 2 feature */
  const r2=makeApp({_resolvedTier:'boardroom'});
  r2._tierConfig.features.themes_all=2;
  assertF('rank 2 feature blocks boardroom (rank 1)',r2._checkTier('themes_all'));
  r2._resolvedTier='execution';
  assertT('rank 2 feature passes execution (rank 2)',r2._checkTier('themes_all'));

  /* Null tier → free fallback */
  const nul=makeApp({_resolvedTier:null});
  nul._tierConfig.features.themes_all=1;
  assertF('null tier with rank 1 feature: blocked',nul._checkTier('themes_all'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 3. _checkLimit Logic (inclusive: <= )                             */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('3. _checkLimit Logic');

  /* Kill switch OFF → always true */
  const off=makeApp({_LICENSING_ENABLED:false,_resolvedTier:'free'});
  off.proj={swimlanes:makeSwimlanes(100),items:makeItems(100)};
  assertT('kill switch OFF: swimlanes unlimited',off._checkLimit('swimlanes'));
  assertT('kill switch OFF: items unlimited',off._checkLimit('items'));

  /* Free tier inclusive limits: 5 swimlanes, 25 items */
  const free=makeApp({_resolvedTier:'free'});
  free.proj={swimlanes:makeSwimlanes(5),items:makeItems(25)};
  assertT('free: 5 swimlanes OK (at limit, inclusive)',free._checkLimit('swimlanes'));
  assertT('free: 25 items OK (at limit, inclusive)',free._checkLimit('items'));

  free.proj={swimlanes:makeSwimlanes(6),items:makeItems(26)};
  assertF('free: 6 swimlanes blocked (over limit)',free._checkLimit('swimlanes'));
  assertF('free: 26 items blocked (over limit)',free._checkLimit('items'));

  free.proj={swimlanes:makeSwimlanes(4),items:makeItems(24)};
  assertT('free: 4 swimlanes OK (under limit)',free._checkLimit('swimlanes'));
  assertT('free: 24 items OK (under limit)',free._checkLimit('items'));

  /* Boardroom → Infinity */
  const board=makeApp({_resolvedTier:'boardroom'});
  board.proj={swimlanes:makeSwimlanes(100),items:makeItems(500)};
  assertT('boardroom: 100 swimlanes OK',board._checkLimit('swimlanes'));
  assertT('boardroom: 500 items OK',board._checkLimit('items'));

  /* Unknown limit type → true */
  assertT('unknown limit type allowed',free._checkLimit('widgets'));

  /* Null tier → free limits */
  const nul=makeApp({_resolvedTier:null});
  nul.proj={swimlanes:makeSwimlanes(6),items:makeItems(26)};
  assertF('null tier: 6 swimlanes blocked',nul._checkLimit('swimlanes'));

  /* Custom limit */
  const cust=makeApp({_resolvedTier:'free'});
  cust._tierConfig.tiers.free.limits.swimlanes=3;
  cust.proj={swimlanes:makeSwimlanes(4),items:[]};
  assertF('custom limit 3: 4 blocked',cust._checkLimit('swimlanes'));
  cust.proj={swimlanes:makeSwimlanes(3),items:[]};
  assertT('custom limit 3: 3 allowed (inclusive)',cust._checkLimit('swimlanes'));
  cust.proj={swimlanes:makeSwimlanes(2),items:[]};
  assertT('custom limit 3: 2 allowed',cust._checkLimit('swimlanes'));

  /* Zero → always true */
  const zero=makeApp({_resolvedTier:'free'});
  zero.proj={swimlanes:[],items:[]};
  assertT('zero swimlanes OK',zero._checkLimit('swimlanes'));
  assertT('zero items OK',zero._checkLimit('items'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 4. Tier Resolution Priority                                      */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('4. Tier Resolution Priority');

  /* Dev override wins */
  const app1=makeApp();
  app1._ls.setItem('tls3_devTier','execution');
  app1._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app1._loadLicense();
  assert('dev override wins over license','execution',app1._resolvedTier);

  /* License wins when no dev override */
  const app2=makeApp();
  app2._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app2._loadLicense();
  assert('license wins','boardroom',app2._resolvedTier);

  /* Default free */
  const app3=makeApp();
  app3._loadLicense();
  assert('default free','free',app3._resolvedTier);

  /* Invalid dev tier ignored, falls to license */
  const app4=makeApp();
  app4._ls.setItem('tls3_devTier','nonexistent');
  app4._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app4._loadLicense();
  assert('invalid dev tier ignored, uses license','boardroom',app4._resolvedTier);

  /* Expired license → free */
  const app5=makeApp();
  app5._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2020-01-01T00:00:00Z'}));
  app5._loadLicense();
  assert('expired license falls to free','free',app5._resolvedTier);

  /* invalid license not recognized */
  const app6=makeApp();
  app6._ls.setItem('tls3_license',JSON.stringify({valid:false,tier:'boardroom',key:'k'}));
  app6._loadLicense();
  assert('invalid license not recognized','free',app6._resolvedTier);

  /* Missing tier → not recognized */
  const app7=makeApp();
  app7._ls.setItem('tls3_license',JSON.stringify({valid:true,key:'k'}));
  app7._loadLicense();
  assert('license without tier not recognized','free',app7._resolvedTier);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 5. License Cache Read/Write                                      */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('5. License Cache Read/Write');
  const app=makeApp();
  assert('empty localStorage returns null',app._readLicenseCache(),null);

  app._ls.setItem('tls3_license','{broken');
  assert('corrupted JSON returns null',app._readLicenseCache(),null);

  app._ls.setItem('tls3_license',JSON.stringify({valid:false,tier:'boardroom',key:'k'}));
  assert('valid=false returns null',app._readLicenseCache(),null);

  app._ls.setItem('tls3_license',JSON.stringify({valid:true,key:'k'}));
  assert('missing tier returns null',app._readLicenseCache(),null);

  app._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k'}));
  assert('valid license returned',app._readLicenseCache().tier,'boardroom');

  /* _storeLicense writes tls3_license */
  const app2=makeApp();
  app2._storeLicense({key:'k',tier:'execution',valid:true});
  assertT('tls3_license written',!!app2._ls.getItem('tls3_license'));
  const stored=JSON.parse(app2._ls.getItem('tls3_license'));
  assert('stored tier matches','execution',stored.tier);

  /* _clearLicenseStorage removes tls3_license */
  const app3=makeApp();
  app3._ls.setItem('tls3_license','test');
  app3._clearLicenseStorage();
  assert('clear removes tls3_license',null,app3._ls.getItem('tls3_license'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 6. License Activation Response Parsing                           */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('6. License Activation Response Parsing');
  const app=makeApp();
  const resp=app._parseActivationResponse({valid:true,license_key:{status:'active',created_at:'2026-01-01',expires_at:'2027-01-01'},meta:{variant_name:'Boardroom Annual',customer_email:'a@b.com',product_name:'TS Boardroom',order_id:123}},'MY-KEY');
  assertT('valid response success',resp.success);
  assert('variant mapped to tier','boardroom',resp.tier);
  assert('lic.customerEmail','a@b.com',resp.lic.customerEmail);
  assert('lic.productName','TS Boardroom',resp.lic.productName);
  assert('lic.orderId',123,resp.lic.orderId);
  assert('lic.status','active',resp.lic.status);
  assert('lic.createdAt','2026-01-01',resp.lic.createdAt);

  /* Unknown variant → defaults to boardroom */
  const r2=app._parseActivationResponse({valid:true,license_key:{},meta:{variant_name:'Unknown Plan'}},'k');
  assert('unknown variant defaults to boardroom','boardroom',r2.tier);

  /* Invalid response */
  const r3=app._parseActivationResponse({valid:false,error:'Key expired'},'k');
  assertF('invalid response not success',r3.success);
  assert('error message from data.error','Key expired',r3.error);

  const r4=app._parseActivationResponse({valid:false,license_key:{status_formatted:'Disabled by admin'}},'k');
  assert('error from status_formatted','Disabled by admin',r4.error);

  const r5=app._parseActivationResponse({valid:false},'k');
  assert('fallback error message','Invalid license key',r5.error);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 7. License Expiry & Staleness                                    */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('7. License Expiry & Staleness');
  /* Future expiry → sets tier */
  const app1=makeApp();
  app1._applyLicenseCache({valid:true,tier:'boardroom',expiresAt:'2099-01-01T00:00:00Z',lastChecked:new Date().toISOString()});
  assert('future expiry sets tier','boardroom',app1._resolvedTier);

  /* Past expiry → reverts to free */
  const app2=makeApp();
  app2._applyLicenseCache({valid:true,tier:'boardroom',expiresAt:'2020-01-01T00:00:00Z',lastChecked:new Date().toISOString()});
  assert('past expiry reverts to free','free',app2._resolvedTier);
  assertT('past expiry clears storage',app2._clearStorageCalled);

  /* Null expiry = perpetual */
  const app3=makeApp();
  app3._applyLicenseCache({valid:true,tier:'boardroom',expiresAt:null,lastChecked:new Date().toISOString()});
  assert('null expiry = perpetual','boardroom',app3._resolvedTier);

  /* Stale check: >3 days → revalidation */
  const app4=makeApp();
  const old=new Date(Date.now()-4*24*60*60*1000).toISOString();
  app4._applyLicenseCache({valid:true,tier:'boardroom',lastChecked:old});
  assertT('stale >3 days triggers revalidation',app4._revalidateCalled);

  const app5=makeApp();
  app5._applyLicenseCache({valid:true,tier:'boardroom',lastChecked:new Date().toISOString()});
  assertF('fresh <3 days no revalidation',app5._revalidateCalled);

  const app6=makeApp();
  app6._applyLicenseCache({valid:true,tier:'boardroom'});
  assertT('missing lastChecked triggers revalidation',app6._revalidateCalled);

  /* Days-until-expiry calculation */
  const future=new Date(Date.now()+10*24*60*60*1000);
  const daysLeft=Math.ceil((future-new Date())/(1000*60*60*24));
  assertT('future date gives positive days',daysLeft>0);
  assert('~10 days from now',daysLeft,10);

  const past=new Date(Date.now()-5*24*60*60*1000);
  const daysPast=Math.ceil((past-new Date())/(1000*60*60*24));
  assertT('past date gives negative days',daysPast<0);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 8. Deactivation Flow                                             */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('8. Deactivation Flow');
  const app=makeApp({_resolvedTier:'boardroom'});
  app._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k'}));
  app._deactivateLicense();
  assert('deactivation sets _resolvedTier to free','free',app._resolvedTier);
  assertT('deactivation called _clearLicenseStorage',app._clearStorageCalled);
  assert('tls3_license removed',null,app._ls.getItem('tls3_license'));

  /* Post-deactivation: features still allowed (rank 0) */
  ALL_FEATURES.forEach(f=>assertT('post-deactivate (rank 0): '+f+' still allowed',app._checkTier(f)));

  /* Post-deactivation: limits enforced */
  app.proj={swimlanes:makeSwimlanes(6),items:makeItems(26)};
  assertF('post-deactivate: 6 swimlanes blocked',app._checkLimit('swimlanes'));
  assertF('post-deactivate: 26 items blocked',app._checkLimit('items'));

  /* With rank 1 features, post-deactivation blocks */
  const app2=makeApp({_resolvedTier:'boardroom'});
  app2._tierConfig.features.themes_all=1;
  assertT('boardroom: rank 1 feature passes',app2._checkTier('themes_all'));
  app2._deactivateLicense();
  assertF('post-deactivate: rank 1 feature blocked on free',app2._checkTier('themes_all'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 9. _populateLicenseSection State Logic                           */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('9. _populateLicenseSection State Logic');

  /* Free state */
  const free=makeApp({_resolvedTier:'free'});
  const fs=free._computeLicenseUIState();
  assert('free: displayName','Free Plan',fs.displayName);
  assert('free: badge','Free',fs.badge);
  assertT('free: showKeyRow',fs.showKeyRow);
  assertT('free: showFreeInfo',fs.showFreeInfo);
  assertF('free: isLicensed',fs.isLicensed);

  /* Licensed state */
  const lic=makeApp({_resolvedTier:'boardroom'});
  lic._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z',customerEmail:'adam@test.com'}));
  const ls_=lic._computeLicenseUIState();
  assert('licensed: displayName','Boardroom',ls_.displayName);
  assert('licensed: badge','Active',ls_.badge);
  assertF('licensed: showKeyRow',ls_.showKeyRow);
  assertF('licensed: showFreeInfo',ls_.showFreeInfo);
  assertT('licensed: isLicensed',ls_.isLicensed);
  assertIncludes('licensed: detailsText has email',ls_.detailsText,'adam@test.com');

  /* Licensed state: tier name from license, not _resolvedTier (drift fix) */
  const drift=makeApp({_resolvedTier:'free'});
  drift._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  const ds=drift._computeLicenseUIState();
  assert('drifted: displayName from license','Boardroom',ds.displayName);
  assert('drifted: _resolvedTier synced','boardroom',drift._resolvedTier);

  /* Expired state */
  const exp=makeApp({_resolvedTier:'free'});
  exp._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2020-01-01T00:00:00Z'}));
  const es=exp._computeLicenseUIState();
  assert('expired: badge','Expired',es.badge);
  assert('expired: displayName shows original tier','Boardroom',es.displayName);

  /* Licensed with missing customerEmail */
  const noEmail=makeApp({_resolvedTier:'boardroom'});
  noEmail._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k'}));
  const ne=noEmail._computeLicenseUIState();
  assert('no email: detailsText','Licensed',ne.detailsText);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 10. Menu Gating Logic                                            */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('10. Menu Gating Logic');

  /* Kill switch OFF → nothing gated */
  const off=makeApp({_LICENSING_ENABLED:false,_resolvedTier:'free'});
  assert('kill switch OFF: nothing gated',0,off._computeMenuGating().gated.length);

  /* With features at rank 0, free tier has nothing gated */
  const free=makeApp({_resolvedTier:'free'});
  assert('free (rank 0): nothing gated',0,free._computeMenuGating().gated.length);

  /* Boardroom: nothing gated */
  const board=makeApp({_resolvedTier:'boardroom'});
  assert('boardroom: nothing gated',0,board._computeMenuGating().gated.length);

  /* When features bumped to rank 1, free tier gets gated */
  const gated=makeApp({_resolvedTier:'free'});
  ALL_FEATURES.forEach(f=>{gated._tierConfig.features[f]=1});
  const g=gated._computeMenuGating();
  assert('free with rank 1 features: 6 items gated',6,g.gated.length);
  assertT('btn-present gated',g.gated.includes('btn-present'));
  assertT('btn-crit-path gated',g.gated.includes('btn-crit-path'));
  assertT('btn-toggle-sched gated',g.gated.includes('btn-toggle-sched'));
  assertT('btn-show-float gated',g.gated.includes('btn-show-float'));
  assertT('btn-tools-exp-csv gated',g.gated.includes('btn-tools-exp-csv'));
  assertT('imp-adv-toggle gated',g.gated.includes('imp-adv-toggle'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 11. GitHub Pages Bypass                                          */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('11. GitHub Pages Bypass');

  /* GitHub Pages sets tier to boardroom */
  const ghApp=makeApp({_isGitHubPages:true,_resolvedTier:'boardroom'});
  ALL_FEATURES.forEach(f=>assertT('GitHub Pages: '+f+' allowed',ghApp._checkTier(f)));
  ghApp.proj={swimlanes:makeSwimlanes(100),items:makeItems(500)};
  assertT('GitHub Pages: unlimited swimlanes',ghApp._checkLimit('swimlanes'));
  assertT('GitHub Pages: unlimited items',ghApp._checkLimit('items'));

  /* Non-GitHub Pages: free tier behavior */
  const appTier=makeApp({_isGitHubPages:false,_resolvedTier:'free'});
  appTier._tierConfig.features.themes_all=1;
  assertF('app.timelinestudio.io: themes gated (rank 1)',appTier._checkTier('themes_all'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 12. Project File License Embedding                               */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('12. Project File License Embedding');

  /* _packProj strips _licenseKey */
  const app=makeApp();
  app.proj={swimlanes:[],items:[],_licenseKey:'SECRET'};
  const packed=JSON.parse(JSON.stringify(app.proj));
  delete packed._licenseKey;
  assertT('packed has no _licenseKey',packed._licenseKey===undefined);

  /* Save embeds _licenseKey from cached license */
  const app2=makeApp();
  app2._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'MY-KEY'}));
  app2.proj={swimlanes:[],items:[]};
  const lic=app2._readLicenseCache();
  const saveData=JSON.parse(JSON.stringify(app2.proj));
  if(lic&&lic.key)saveData._licenseKey=lic.key;
  assert('save embeds _licenseKey','MY-KEY',saveData._licenseKey);
  /* Clean up live proj */
  delete app2.proj._licenseKey;
  assertT('live proj cleaned',app2.proj._licenseKey===undefined);
  assertT('serialized data has key',saveData._licenseKey==='MY-KEY');

  /* No license → no _licenseKey */
  const app3=makeApp();
  app3.proj={swimlanes:[],items:[]};
  const lic3=app3._readLicenseCache();
  const save3=JSON.parse(JSON.stringify(app3.proj));
  if(lic3&&lic3.key)save3._licenseKey=lic3.key;
  assertT('no license: no _licenseKey',save3._licenseKey===undefined);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 13. Edge Cases & Regression                                      */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('13. Edge Cases & Regression');

  /* Activate then deactivate — features stay available (rank 0) but limits enforced */
  const app=makeApp({_resolvedTier:'free'});
  const resp=app._parseActivationResponse({valid:true,license_key:{status:'active'},meta:{variant_name:'boardroom_annual'}},'KEY');
  app._storeLicense(resp.lic);app._resolvedTier=resp.tier;
  assertT('activated: themes allowed',app._checkTier('themes_all'));
  app._deactivateLicense();
  assertT('deactivated: themes still allowed (rank 0)',app._checkTier('themes_all'));

  /* With rank 1 features, deactivation blocks */
  const app1b=makeApp({_resolvedTier:'boardroom'});
  app1b._tierConfig.features.csv_export=1;
  assertT('boardroom: csv passes rank 1',app1b._checkTier('csv_export'));
  app1b._deactivateLicense();
  assertF('deactivated: csv blocked (rank 1)',app1b._checkTier('csv_export'));

  /* Exact boundary: swimlane limit (inclusive) */
  const app3=makeApp({_resolvedTier:'free'});
  app3.proj={swimlanes:makeSwimlanes(5),items:[]};
  assertT('exactly at swimlane limit: allowed (inclusive)',app3._checkLimit('swimlanes'));
  app3.proj={swimlanes:makeSwimlanes(6),items:[]};
  assertF('one over swimlane limit: blocked',app3._checkLimit('swimlanes'));

  /* Exact boundary: item limit (inclusive) */
  const app4=makeApp({_resolvedTier:'free'});
  app4.proj={swimlanes:[],items:makeItems(25)};
  assertT('exactly at item limit: allowed (inclusive)',app4._checkLimit('items'));
  app4.proj={swimlanes:[],items:makeItems(26)};
  assertF('one over item limit: blocked',app4._checkLimit('items'));

  /* Expiry 1s in past → expired */
  const pastMs=new Date(Date.now()-1000).toISOString();
  const app6=makeApp();
  app6._applyLicenseCache({valid:true,tier:'boardroom',expiresAt:pastMs,lastChecked:new Date().toISOString()});
  assert('1s in past: expired, tier is free','free',app6._resolvedTier);

  /* Unknown _resolvedTier string → falls back to free behavior */
  const app7=makeApp({_resolvedTier:'xyzzy'});
  assertT('unknown tier string: features still pass (rank 0)',app7._checkTier('themes_all'));
  app7.proj={swimlanes:makeSwimlanes(6),items:[]};
  assertF('unknown tier string: limit enforced',app7._checkLimit('swimlanes'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 14. Dev Override vs Settings Sync                                */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('14. Dev Override vs Settings Sync');

  /* Dev override should NOT be overwritten when Settings opens */
  const app1=makeApp({_resolvedTier:'execution'});
  app1._ls.setItem('tls3_devTier','execution');
  app1._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app1._computeLicenseUIState();
  assert('dev override preserved over license sync','execution',app1._resolvedTier);

  /* Without dev override, sync DOES correct drifted _resolvedTier */
  const app2=makeApp({_resolvedTier:'free'});
  app2._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app2._computeLicenseUIState();
  assert('no dev override: sync corrects drift','boardroom',app2._resolvedTier);

  /* _loadLicense with dev override uses it even with cached license */
  const app3=makeApp();
  app3._ls.setItem('tls3_devTier','execution');
  app3._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k'}));
  app3._loadLicense();
  assert('_loadLicense respects dev override','execution',app3._resolvedTier);

  /* _loadLicense with invalid dev tier falls through to license */
  const app4=makeApp();
  app4._ls.setItem('tls3_devTier','nonexistent_tier');
  app4._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  app4._loadLicense();
  assert('invalid dev tier ignored, uses license','boardroom',app4._resolvedTier);

  /* Dev override wins over expired license */
  const app5=makeApp();
  app5._ls.setItem('tls3_devTier','execution');
  app5._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2020-01-01T00:00:00Z'}));
  app5._loadLicense();
  assert('dev override wins over expired license','execution',app5._resolvedTier);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 15. Expired License Display Name                                 */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('15. Expired License Display Name');

  /* Expired license shows original tier name, not "Free" */
  const app1=makeApp({_resolvedTier:'free'});
  app1._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2020-01-01T00:00:00Z'}));
  const s1=app1._computeLicenseUIState();
  assert('expired: displayName shows original tier','Boardroom',s1.displayName);
  assert('expired: badge says Expired','Expired',s1.badge);
  assertT('expired: isExpired flag',s1.isExpired);
  assert('expired: _resolvedTier stays free','free',app1._resolvedTier);

  /* Expired execution license shows Execution */
  const app2=makeApp({_resolvedTier:'free'});
  app2._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'execution',key:'k',expiresAt:'2020-01-01T00:00:00Z'}));
  const s2=app2._computeLicenseUIState();
  assert('expired execution: displayName','Execution',s2.displayName);

  /* Non-expired shows normally */
  const app3=makeApp({_resolvedTier:'free'});
  app3._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',expiresAt:'2099-01-01T00:00:00Z'}));
  const s3=app3._computeLicenseUIState();
  assert('active: displayName','Boardroom',s3.displayName);
  assert('active: badge','Active',s3.badge);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 16. Revalidation Tier Update Gap                                 */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('16. Revalidation Tier Update Gap');

  function simulateRevalidation(app,serverResponse){
    const raw=app._ls.getItem('tls3_license');
    if(raw){
      const lic=JSON.parse(raw);
      const lk=serverResponse.license_key||{};
      const meta=serverResponse.meta||{};
      lic.lastChecked=new Date().toISOString();
      if(lk.expires_at)lic.expiresAt=lk.expires_at;
      if(lk.created_at)lic.createdAt=lk.created_at;
      if(lk.status)lic.status=lk.status;
      if(meta.product_name)lic.productName=meta.product_name;
      if(meta.order_id)lic.orderId=meta.order_id;
      app._storeLicense(lic);
    }
  }

  const app=makeApp({_resolvedTier:'boardroom'});
  app._ls.setItem('tls3_license',JSON.stringify({valid:true,tier:'boardroom',key:'k',lastChecked:'2020-01-01T00:00:00Z'}));

  simulateRevalidation(app,{valid:true,license_key:{status:'active',expires_at:'2099-12-31'},meta:{variant_name:'Execution Annual',product_name:'TS Execution'}});
  const cached=JSON.parse(app._ls.getItem('tls3_license'));
  assert('revalidation updates productName','TS Execution',cached.productName);
  assert('revalidation updates status','active',cached.status);
  assert('revalidation does NOT update tier (known gap)','boardroom',cached.tier);
  assertT('lastChecked updated',new Date(cached.lastChecked)>new Date('2024-01-01'));
  assert('expiresAt updated','2099-12-31',cached.expiresAt);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 17. Batch Limit Bypass (paste/import)                            */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('17. Batch Limit Bypass');

  const app=makeApp({_resolvedTier:'free'});
  app.proj={swimlanes:makeSwimlanes(5),items:makeItems(25)};
  assertT('at limit: check passes (inclusive)',app._checkLimit('items'));
  assertT('at limit: swimlanes pass (inclusive)',app._checkLimit('swimlanes'));

  /* Simulate batch add that exceeds limit after passing the gate */
  app.proj.items.push(...makeItems(50));
  assert('after batch add: item count exceeds limit',75,app.proj.items.length);
  assertF('next check blocks further adds',app._checkLimit('items'));

  /* One over: gate blocks */
  const app2=makeApp({_resolvedTier:'free'});
  app2.proj={swimlanes:makeSwimlanes(5),items:makeItems(25)};
  assertT('at limit: items pass (inclusive)',app2._checkLimit('items'));
  app2.proj.items.push({id:'extra'});
  assertF('one over limit: items blocked',app2._checkLimit('items'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 18. Tier Config Missing/Null Limits (JSON round-trip safety)     */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('18. Tier Config Missing/Null Limits');

  /* Missing limits property entirely — treated as unlimited */
  const app=makeApp({_resolvedTier:'custom'});
  app._tierConfig.tiers.custom={rank:1,label:'Custom'};/* no limits prop */
  app.proj={swimlanes:makeSwimlanes(3),items:[]};
  assertT('missing limits: swimlanes allowed (treated as unlimited)',app._checkLimit('swimlanes'));
  assertT('missing limits: items allowed (treated as unlimited)',app._checkLimit('items'));

  /* Null limits (Infinity lost in JSON.stringify round-trip) — treated as unlimited */
  const app2=makeApp({_resolvedTier:'boardroom'});
  app2._tierConfig.tiers.boardroom.limits={swimlanes:null,items:null};
  app2.proj={swimlanes:makeSwimlanes(100),items:makeItems(500)};
  assertT('null swimlane limit: 100 swimlanes allowed',app2._checkLimit('swimlanes'));
  assertT('null item limit: 500 items allowed',app2._checkLimit('items'));

  /* Undefined limits in object */
  const app3=makeApp({_resolvedTier:'boardroom'});
  app3._tierConfig.tiers.boardroom.limits={swimlanes:undefined,items:undefined};
  app3.proj={swimlanes:makeSwimlanes(50),items:makeItems(200)};
  assertT('undefined swimlane limit: allowed',app3._checkLimit('swimlanes'));
  assertT('undefined item limit: allowed',app3._checkLimit('items'));
}

/* ═════════════════════════════════════════════════════════════════ */
/* 19. Stale Feature State After License Change                     */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('19. Stale Feature State After License Change');

  /* With rank 0, features are always allowed — test with rank 1 bump */
  const app=makeApp({_resolvedTier:'free'});
  ALL_FEATURES.forEach(f=>{app._tierConfig.features[f]=1});
  assertF('pre-activate (rank 1): themes blocked',app._checkTier('themes_all'));

  /* Simulate activation */
  const resp=app._parseActivationResponse({valid:true,license_key:{status:'active'},meta:{variant_name:'boardroom_annual'}},'KEY');
  app._storeLicense(resp.lic);
  app._resolvedTier=resp.tier;
  assertT('post-activate: themes allowed',app._checkTier('themes_all'));

  /* Menu gating should now show nothing gated */
  const gating=app._computeMenuGating();
  assert('post-activate: no menu items gated',0,gating.gated.length);

  /* Deactivate */
  app._deactivateLicense();
  assertF('post-deactivate: themes blocked again (rank 1)',app._checkTier('themes_all'));
  const gating2=app._computeMenuGating();
  assert('post-deactivate: 6 menu items gated',6,gating2.gated.length);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 20. UI State Consistency Across Scenarios                        */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('20. UI State Consistency Across Scenarios');

  /* Free → Activated → Deactivated: full cycle */
  const app=makeApp({_resolvedTier:'free'});
  let s=app._computeLicenseUIState();
  assert('cycle-free: badge','Free',s.badge);
  assertT('cycle-free: showKeyRow',s.showKeyRow);

  /* Activate */
  const resp=app._parseActivationResponse({valid:true,license_key:{status:'active',expires_at:'2099-12-31'},meta:{variant_name:'boardroom_annual',customer_email:'test@test.com'}},'MY-KEY');
  app._storeLicense(resp.lic);
  app._resolvedTier=resp.tier;
  s=app._computeLicenseUIState();
  assert('cycle-active: badge','Active',s.badge);
  assert('cycle-active: displayName','Boardroom',s.displayName);
  assertF('cycle-active: showKeyRow',s.showKeyRow);
  assertF('cycle-active: showFreeInfo',s.showFreeInfo);
  assertIncludes('cycle-active: detailsText has email',s.detailsText,'test@test.com');

  /* Deactivate */
  app._deactivateLicense();
  s=app._computeLicenseUIState();
  assert('cycle-deactivated: badge','Free',s.badge);
  assert('cycle-deactivated: displayName','Free Plan',s.displayName);
  assertT('cycle-deactivated: showKeyRow',s.showKeyRow);
  assertT('cycle-deactivated: showFreeInfo',s.showFreeInfo);
  assert('cycle-deactivated: _resolvedTier','free',app._resolvedTier);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 21. Future-Proofing: Feature Gating When Ranks Are Bumped        */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('21. Future-Proofing: Feature Gating Hooks');

  /* Simulate future state: all features bumped to rank 1 */
  const app=makeApp({_resolvedTier:'free'});
  ALL_FEATURES.forEach(f=>{app._tierConfig.features[f]=1});

  /* Free tier should be blocked for all features */
  ALL_FEATURES.forEach(f=>assertF('rank 1: free blocked for '+f,app._checkTier(f)));

  /* Boardroom passes */
  app._resolvedTier='boardroom';
  ALL_FEATURES.forEach(f=>assertT('rank 1: boardroom passes '+f,app._checkTier(f)));

  /* Menu gating works */
  app._resolvedTier='free';
  const g=app._computeMenuGating();
  assert('rank 1: 6 menu items gated on free',6,g.gated.length);

  app._resolvedTier='boardroom';
  const g2=app._computeMenuGating();
  assert('rank 1: 0 gated on boardroom',0,g2.gated.length);
}

/* ═════════════════════════════════════════════════════════════════ */
/* 22. _initTierConfig JSON Round-Trip: Infinity Restoration        */
/* ═════════════════════════════════════════════════════════════════ */
{
  section('22. _initTierConfig JSON Round-Trip');

  /* Simulate Dev Panel saving config with Infinity values → JSON → null */
  const ls=makeFakeLS();
  const cfg=deepClone(_TIER_CONFIG_DEFAULTS);
  /* JSON.stringify converts Infinity → null */
  const serialized=JSON.stringify(cfg);
  assertIncludes('JSON.stringify loses Infinity',serialized,'null');
  ls.setItem('tls3_tierConfig',serialized);

  const app=makeApp({},ls);
  app._initTierConfig();
  /* After deep merge + null restoration, Infinity should be back */
  assert('boardroom swimlanes restored to Infinity',Infinity,app._tierConfig.tiers.boardroom.limits.swimlanes);
  assert('boardroom items restored to Infinity',Infinity,app._tierConfig.tiers.boardroom.limits.items);
  assert('execution swimlanes restored to Infinity',Infinity,app._tierConfig.tiers.execution.limits.swimlanes);
  assert('execution items restored to Infinity',Infinity,app._tierConfig.tiers.execution.limits.items);
  /* Free tier limits preserved correctly (not Infinity, no restoration needed) */
  assert('free swimlanes preserved',5,app._tierConfig.tiers.free.limits.swimlanes);
  assert('free items preserved',25,app._tierConfig.tiers.free.limits.items);

  /* Verify limit checks work with restored config */
  app._resolvedTier='boardroom';
  app.proj={swimlanes:makeSwimlanes(100),items:makeItems(500)};
  assertT('restored boardroom: 100 swimlanes OK',app._checkLimit('swimlanes'));
  assertT('restored boardroom: 500 items OK',app._checkLimit('items'));

  /* Free tier still enforces limits correctly */
  app._resolvedTier='free';
  app.proj={swimlanes:makeSwimlanes(5),items:makeItems(25)};
  assertT('restored free: 5 swimlanes OK (inclusive)',app._checkLimit('swimlanes'));
  app.proj.swimlanes.push({id:'s6'});
  assertF('restored free: 6 swimlanes blocked',app._checkLimit('swimlanes'));

  /* Custom overrides in stored config are preserved */
  const ls2=makeFakeLS();
  const cfg2=deepClone(_TIER_CONFIG_DEFAULTS);
  cfg2.tiers.free.limits.swimlanes=10;/* custom override */
  ls2.setItem('tls3_tierConfig',JSON.stringify(cfg2));
  const app2=makeApp({},ls2);
  app2._initTierConfig();
  assert('custom free limit preserved',10,app2._tierConfig.tiers.free.limits.swimlanes);
}

/* ═════════════════════════════════════════════════════════════════ */
const stats=summary();
process.exit(stats.failed?1:0);
