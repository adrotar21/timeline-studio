#!/usr/bin/env node
/**
 * Timeline Studio — File Handling Test Suite
 *
 * Tests the correctness of file open/save/saveAs/MRU/newTab flows.
 * Since these functions use browser APIs (File System Access API, IndexedDB)
 * that aren't available in Node, we mock the relevant APIs and test
 * the state-management logic — the part that can go wrong and cause
 * the "file handle points to the wrong file" bug.
 *
 * Test matrix covers:
 *   1. Save / Save As handle ownership
 *   2. Open file handle assignment
 *   3. MRU duplicate detection & deduplication
 *   4. Open in New Tab handle reconnection
 *   5. "Current file" badge accuracy (by handle identity)
 *   6. Multi-tab per-tab IDB scoping
 *   7. Project name ↔ filename consistency
 *   8. New project / template handle clearing
 *   9. Unsaved-changes guards
 *  10. Handle persistence (IDB store/load/clear)
 *  11. Share mode vs. MRU link mode
 *  12. Edge cases: orphaned handles, denied permissions, stale handles
 *  13. Stale file warning on save (Fix D)
 *  14. Regression guards for Bug A/B/C fixes
 */

const {assert, assertT, assertF, assertNeq,
       section, summary} = require('../helpers/assert');

// ─── Mock Infrastructure ─────────────────────────────────────────────────

let _mockTime = 1000;
class MockHandle {
  constructor(name, fileContent = '{}', id = null) {
    this._id = id || 'handle_' + Math.random().toString(36).slice(2, 8);
    this.name = name;
    this._content = fileContent;
    this._permission = 'granted';
    this._exists = true;
    this._lastModified = _mockTime++;
  }
  async getFile() {
    if (!this._exists) throw new DOMException('File not found', 'NotFoundError');
    return { text: async () => this._content, name: this.name, lastModified: this._lastModified };
  }
  async queryPermission() { return this._permission; }
  async requestPermission() { return this._permission; }
  async isSameEntry(other) { return !!(other && other._id === this._id); }
  async createWritable() {
    const self = this;
    return {
      _data: '',
      async write(data) { this._data = data; },
      async close() { self._content = this._data; self._lastModified = _mockTime++; }
    };
  }
}

class MockIDB {
  constructor() { this.handles = {}; this.recentFiles = {}; }
}

function projJSON(name, itemCount = 0) {
  const items = [];
  for (let i = 0; i < itemCount; i++)
    items.push({ id: 'it_' + (i + 1), type: 'milestone', name: 'Item ' + (i + 1),
      date: '2026-03-15', swimlaneId: 'sw1', subSwimId: '', subRow: 0, color: '#4f8cc9',
      labelPosition: 'right', deps: [] });
  return JSON.stringify({
    version: 2, name, items,
    swimlanes: [{ id: 'sw1', name: 'Lane 1', color: '', collapsed: 'expanded', height: 120, subSwimlanes: [] }],
  });
}

let _tabCounter = 0;
function createApp() {
  const idb = new MockIDB();
  const ls = {};
  const tabId = 'tab_test_' + (++_tabCounter);
  return {
    proj: { version: 2, name: 'New Timeline', items: [], swimlanes: [] },
    _fileHandle: null, _fileLastModified: 0, _unsaved: false, _shareMode: false, _shareLoadFailed: false,
    _mruLinkFile: null, _mruCache: [], _mruValidated: false, _MRU_MAX: 8,
    _storedHandle: null, _clearedFromIDB: false, _toasts: [],
    _tabSessionId: tabId,
    _idb: idb, _ls: ls,
    _confirmResult: true,

    snap() {}, sched() {}, autoSave() {}, migrate() {}, applyTheme() {},
    sel: [], _pendingFit: false,
    toast(m, t) { this._toasts.push({ msg: m, type: t || 'success' }); },
    markClean() { this._unsaved = false; },
    markDirty() { this._unsaved = true; },
    _updateFileIndicator() {},
    _setLS(k, v) { this._ls[k] = v; },
    _getLS(k) { return this._ls[k] || null; },
    _removeLS(k) { delete this._ls[k]; },

    /* Fix A: per-tab IDB key using _tabSessionId */
    async _storeHandle(h) { this._idb.handles[this._tabSessionId] = h; },
    async _loadHandle() { return this._idb.handles[this._tabSessionId] || null; },
    async _clearHandle() { delete this._idb.handles[this._tabSessionId]; this._clearedFromIDB = true; },

    async _updateMRU(handle, fileName, projectName) {
      const entry = { id: 'mru_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: fileName, projectName: projectName || '', handle: handle || null, lastOpened: Date.now() };
      await this._storeMRUEntry(entry);
    },
    async _storeMRUEntry(entry) {
      const all = Object.values(this._idb.recentFiles);
      const deleteIds = [];
      for (const ex of all) {
        let same = false;
        if (entry.handle && ex.handle) { try { same = await entry.handle.isSameEntry(ex.handle); } catch(e) {} }
        else if (!entry.handle && !ex.handle && entry.name === ex.name) same = true;
        if (same && ex.id !== entry.id) deleteIds.push(ex.id);
      }
      for (const id of deleteIds) delete this._idb.recentFiles[id];
      this._idb.recentFiles[entry.id] = entry;
      const after = Object.values(this._idb.recentFiles);
      if (after.length > this._MRU_MAX) {
        after.sort((a, b) => b.lastOpened - a.lastOpened);
        for (let i = this._MRU_MAX; i < after.length; i++) delete this._idb.recentFiles[after[i].id];
      }
      await this._loadMRU(); this._syncMRUCache();
    },
    async _removeMRUEntry(id) {
      delete this._idb.recentFiles[id]; await this._loadMRU(); this._syncMRUCache();
    },
    async _loadMRU() {
      const all = Object.values(this._idb.recentFiles);
      all.sort((a, b) => b.lastOpened - a.lastOpened);
      this._mruCache = all; return all;
    },
    _syncMRUCache() {
      this._ls['tls3_recentNames'] = JSON.stringify(
        this._mruCache.map(e => ({ id: e.id, name: e.name, projectName: e.projectName,
          lastOpened: e.lastOpened, lastState: e._state || 'nameonly' })));
    },
    async _validateMRUEntry(entry) {
      if (!entry.handle) return 'nameonly';
      try {
        const perm = await entry.handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') { try { await entry.handle.getFile(); return 'ready'; } catch(e) { return 'orphaned'; } }
        if (perm === 'denied') return 'denied';
        return 'stale';
      } catch(e) { return 'stale'; }
    },
    /* Fix B: validate MRU marks _isCurrent by handle identity */
    async _validateMRU() {
      if (!this._mruCache.length) return;
      const results = await Promise.allSettled(this._mruCache.map(e => this._validateMRUEntry(e)));
      results.forEach((r, i) => { if (r.status === 'fulfilled') this._mruCache[i]._state = r.value; else this._mruCache[i]._state = 'nameonly'; });
      if (this._fileHandle) {
        const curChecks = await Promise.allSettled(this._mruCache.map(e => e.handle ? this._fileHandle.isSameEntry(e.handle) : Promise.resolve(false)));
        this._mruCache.forEach((e, i) => { e._isCurrent = curChecks[i].status === 'fulfilled' && curChecks[i].value === true; });
      } else { this._mruCache.forEach(e => { e._isCurrent = false; }); }
      this._mruValidated = true; this._syncMRUCache();
    },

    // ─── Core file operations ──────────────────────────────────────
    async openFile(handle) {
      if (this._unsaved) return 'blocked_unsaved';
      if (!handle) return 'no_handle';
      const file = await handle.getFile(); const text = await file.text();
      this.snap(); this.proj = JSON.parse(text); this.migrate(); this.applyTheme(); this.sel = [];
      this._fileHandle = handle; this._fileLastModified = file.lastModified;
      await this._storeHandle(handle);
      this._setLS('tls3_fileName', handle.name); this.sched();
      if (this.proj.items.length) this._pendingFit = true;
      this.markClean(); await this._updateMRU(handle, handle.name, this.proj.name);
      this.toast('Loaded!'); return 'ok';
    },
    async handleOpen(fileName, fileContent, fileLM) {
      this.snap(); this.proj = JSON.parse(fileContent); this.migrate(); this.applyTheme(); this.sel = [];
      this._fileHandle = null; this._fileLastModified = fileLM || 0;
      this._setLS('tls3_fileName', fileName); this.sched();
      if (this.proj.items.length) this._pendingFit = true;
      this.markClean(); await this._updateMRU(null, fileName, this.proj.name); this.toast('Loaded!');
    },
    async saveFile(saveAs = false, pickerHandle = null) {
      const data = JSON.stringify(this.proj, null, 2);
      if (!saveAs && !this._fileHandle) {
        const stored = await this._loadHandle();
        if (stored) { const perm = await stored.requestPermission({ mode: 'readwrite' });
          if (perm === 'granted') this._fileHandle = stored; }
      }
      if (!saveAs && this._fileHandle) {
        /* Fix D: stale file check */
        if (this._fileLastModified) {
          try {
            const chk = await this._fileHandle.getFile();
            if (chk.lastModified !== this._fileLastModified) {
              if (!this._confirmResult) return 'blocked_stale';
            }
          } catch(e) {}
        }
        const w = await this._fileHandle.createWritable(); await w.write(data); await w.close();
        try { const saved = await this._fileHandle.getFile(); this._fileLastModified = saved.lastModified; } catch(e) {}
        this.markClean(); this.toast('Saved!'); this.autoSave();
        this._setLS('tls3_fileName', this._fileHandle.name); this._updateFileIndicator();
        await this._updateMRU(this._fileHandle, this._fileHandle.name, this.proj.name);
        return 'saved_existing';
      }
      if (pickerHandle) {
        const prevHandle = saveAs ? this._fileHandle : null;
        const h = pickerHandle;
        const w = await h.createWritable(); await w.write(data); await w.close();
        this._fileHandle = saveAs && prevHandle ? prevHandle : h;
        this.markClean(); this.toast(saveAs ? 'Saved copy!' : 'Saved!'); this.autoSave();
        await this._storeHandle(this._fileHandle);
        this._setLS('tls3_fileName', this._fileHandle.name); this._updateFileIndicator();
        await this._updateMRU(this._fileHandle, this._fileHandle.name, this.proj.name);
        return saveAs ? 'saved_as' : 'saved_first';
      }
      return 'no_picker';
    },
    createFromTemplate(name, tpl = 'blank') {
      if (tpl === 'duplicate') {
        this.snap(); this.proj = JSON.parse(JSON.stringify(this.proj));
        this.proj.name = name + ' (Copy)'; this._fileHandle = null; this._fileLastModified = 0;
        this._clearHandle(); this._removeLS('tls3_fileName'); this.sel = []; this.markDirty(); return;
      }
      this.snap(); this.proj = { version: 2, name, items: [], swimlanes: [] };
      this._fileHandle = null; this._fileLastModified = 0; this._clearHandle(); this._removeLS('tls3_fileName');
      this.sel = []; this.markClean();
    },
    async _openFromMRU(id) {
      const entry = this._mruCache.find(e => e.id === id); if (!entry) return 'not_found';
      if (this._fileHandle && entry.handle) {
        try { if (await this._fileHandle.isSameEntry(entry.handle)) { this.toast('Already open', 'info'); return 'already_open'; } } catch(e) {}
      }
      if (this._unsaved) return 'blocked_unsaved';
      const st = entry._state || 'nameonly';
      if (st === 'orphaned') { this.toast('File not found', 'error'); return 'orphaned'; }
      if (st === 'nameonly') return 'nameonly_fallback';
      if (st === 'stale' || st === 'denied') {
        const perm = await entry.handle.requestPermission({ mode: 'readwrite' });
        if (perm !== 'granted') { this.toast('Permission denied', 'error'); return 'denied'; }
      }
      const file = await entry.handle.getFile(); const text = await file.text();
      this.snap(); this.proj = JSON.parse(text); this.migrate(); this.applyTheme(); this.sel = [];
      this._fileHandle = entry.handle; this._fileLastModified = file.lastModified;
      await this._storeHandle(entry.handle);
      this._setLS('tls3_fileName', entry.handle.name); this.sched();
      if (this.proj.items.length) this._pendingFit = true; this.markClean();
      await this._updateMRU(entry.handle, entry.handle.name || entry.name, this.proj.name);
      this.toast('Loaded!'); return 'ok';
    },
    async _openInNewTab(id) {
      const entry = this._mruCache.find(e => e.id === id);
      if (!entry || !entry.handle) return { result: 'no_entry' };
      const st = entry._state || 'nameonly';
      if (st === 'orphaned') return { result: 'orphaned' };
      let isCur = !!(this._fileHandle && entry.handle);
      if (isCur) { try { isCur = await this._fileHandle.isSameEntry(entry.handle); } catch(e) { isCur = false; } }
      if (isCur && this._unsaved) return { result: 'unsaved_current' };
      if (st === 'stale' || st === 'denied') {
        const perm = await entry.handle.requestPermission({ mode: 'read' });
        if (perm !== 'granted') return { result: 'denied' };
      }
      const file = await entry.handle.getFile(); const text = await file.text();
      const proj = JSON.parse(text);
      /* Fix C: URL uses filename, not MRU ID */
      return { result: 'ok', mruFile: entry.handle.name, projName: proj.name, fileName: entry.handle.name };
    },
    /* Fix C: reconnect by filename instead of unstable MRU ID */
    async reconnectFromMRULink(mruFile) {
      await this._loadMRU();
      const entry = this._mruCache.find(e => e.name === mruFile);
      if (entry && entry.handle) {
        const perm = await entry.handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          this._fileHandle = entry.handle; await this._storeHandle(entry.handle);
          try { const rf = await entry.handle.getFile(); this._fileLastModified = rf.lastModified; } catch(e) {}
          this._setLS('tls3_fileName', entry.handle.name); this.markClean(); return 'reconnected';
        } else { this._storedHandle = entry.handle; return 'needs_permission'; }
      }
      return 'not_found';
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main — all tests run in a single async scope so assertions register
// ═══════════════════════════════════════════════════════════════════════════

(async () => {

// ─── 1. Save — existing handle ───────────────────────────────────────────

section('1. Save — existing handle');
{
  const app = createApp();
  const h = new MockHandle('Alpha.tlproj', projJSON('Alpha'));
  app._fileHandle = h;
  app.proj = { version: 2, name: 'Alpha', items: [] };
  const result = await app.saveFile(false);
  assert('save uses existing handle', result, 'saved_existing');
  assert('handle unchanged after save', app._fileHandle._id, h._id);
  assert('handle name still Alpha', app._fileHandle.name, 'Alpha.tlproj');
  assertT('marked clean after save', !app._unsaved);
}

section('1b. Save — auto-reconnect from IDB');
{
  const app = createApp();
  const h = new MockHandle('Beta.tlproj', projJSON('Beta'));
  app._fileHandle = null;
  app._idb.handles[app._tabSessionId] = h; // per-tab key
  app.proj = { version: 2, name: 'Beta', items: [] };
  const result = await app.saveFile(false);
  assert('save auto-reconnected from IDB', result, 'saved_existing');
  assert('handle restored from IDB', app._fileHandle._id, h._id);
}

section('1c. Save — auto-reconnect denied');
{
  const app = createApp();
  const h = new MockHandle('Gamma.tlproj', projJSON('Gamma'));
  h._permission = 'denied';
  app._fileHandle = null;
  app._idb.handles[app._tabSessionId] = h; // per-tab key
  app.proj = { version: 2, name: 'Gamma', items: [] };
  const result = await app.saveFile(false, null);
  assert('denied handle not reconnected', result, 'no_picker');
  assert('handle still null', app._fileHandle, 'null');
}

// ─── 2. Save As — handle ownership (B34 fix) ────────────────────────────

section('2. Save As — preserves original handle');
{
  const app = createApp();
  const original = new MockHandle('Original.tlproj', projJSON('Original'));
  const copy = new MockHandle('Copy.tlproj');
  app._fileHandle = original;
  app.proj = { version: 2, name: 'Original', items: [] };
  const result = await app.saveFile(true, copy);
  assert('save as returned saved_as', result, 'saved_as');
  assert('handle still points to original', app._fileHandle._id, original._id);
  assert('handle name still Original', app._fileHandle.name, 'Original.tlproj');
  assertT('original handle stored in IDB', app._idb.handles[app._tabSessionId]._id === original._id);
}

section('2b. Save As — no prior handle (first save via Save As)');
{
  const app = createApp();
  const newHandle = new MockHandle('NewFile.tlproj');
  app._fileHandle = null;
  app.proj = { version: 2, name: 'My Timeline', items: [] };
  const result = await app.saveFile(true, newHandle);
  assert('first save via Save As adopts handle', result, 'saved_as');
  assert('handle is now the new file', app._fileHandle._id, newHandle._id);
}

section('2c. First save (not Save As) adopts new handle');
{
  const app = createApp();
  const newHandle = new MockHandle('FirstSave.tlproj');
  app._fileHandle = null;
  app.proj = { version: 2, name: 'Test', items: [] };
  const result = await app.saveFile(false, newHandle);
  assert('first save adopts handle', result, 'saved_first');
  assert('handle is now FirstSave', app._fileHandle._id, newHandle._id);
}

// ─── 3. Open file — handle assignment ────────────────────────────────────

section('3. Open file replaces handle');
{
  const app = createApp();
  const old = new MockHandle('Old.tlproj', projJSON('Old Project'));
  const newH = new MockHandle('New.tlproj', projJSON('New Project'));
  app._fileHandle = old;
  const result = await app.openFile(newH);
  assert('open succeeded', result, 'ok');
  assert('handle replaced', app._fileHandle._id, newH._id);
  assert('project name loaded', app.proj.name, 'New Project');
  assertT('marked clean', !app._unsaved);
  assertT('handle stored in IDB', app._idb.handles[app._tabSessionId]._id === newH._id);
}

section('3b. Open file — unsaved changes guard');
{
  const app = createApp();
  app._unsaved = true;
  const h = new MockHandle('Another.tlproj', projJSON('Another'));
  const result = await app.openFile(h);
  assert('open blocked by unsaved changes', result, 'blocked_unsaved');
}

section('3c. handleOpen (no File System Access API fallback)');
{
  const app = createApp();
  app._fileHandle = new MockHandle('WasLinked.tlproj');
  await app.handleOpen('Fallback.tlproj', projJSON('Fallback'));
  assert('handle cleared (no FS API)', app._fileHandle, 'null');
  assert('project name loaded', app.proj.name, 'Fallback');
  assert('filename stored in LS', app._getLS('tls3_fileName'), 'Fallback.tlproj');
}

// ─── 4. New Project / Template — handle clearing ─────────────────────────

section('4. New project clears file handle');
{
  const app = createApp();
  const h = new MockHandle('Existing.tlproj', projJSON('Existing'));
  app._fileHandle = h;
  app._idb.handles[app._tabSessionId] = h;
  app._ls['tls3_fileName'] = 'Existing.tlproj';
  app.createFromTemplate('Fresh Start', 'blank');
  assert('handle cleared', app._fileHandle, 'null');
  assertT('IDB handle cleared', app._clearedFromIDB);
  assert('filename removed from LS', app._ls['tls3_fileName'], 'undefined');
  assert('project name set', app.proj.name, 'Fresh Start');
  assertT('marked clean (blank template)', !app._unsaved);
  assert('fileLastModified reset', String(app._fileLastModified), '0');
}

section('4b. Duplicate template clears handle and marks dirty');
{
  const app = createApp();
  app._fileHandle = new MockHandle('Source.tlproj');
  app.proj = { version: 2, name: 'Source', items: [{ id: 'it1' }], swimlanes: [] };
  app.createFromTemplate('Source', 'duplicate');
  assert('handle cleared', app._fileHandle, 'null');
  assert('project name is Source (Copy)', app.proj.name, 'Source (Copy)');
  assertT('marked dirty', app._unsaved);
  assert('fileLastModified reset', String(app._fileLastModified), '0');
}

// ─── 5. MRU — duplicate detection ───────────────────────────────────────

section('5. MRU deduplicates by handle identity');
{
  const app = createApp();
  const h = new MockHandle('Report.tlproj', projJSON('Report'), 'shared_id_1');
  await app._updateMRU(h, 'Report.tlproj', 'Report v1');
  assert('first MRU entry added', Object.keys(app._idb.recentFiles).length, '1');
  await app._updateMRU(h, 'Report.tlproj', 'Report v2');
  assert('duplicate replaced, still 1 entry', Object.keys(app._idb.recentFiles).length, '1');
  const entries = Object.values(app._idb.recentFiles);
  assert('project name updated to v2', entries[0].projectName, 'Report v2');
}

section('5b. MRU deduplicates NAME_ONLY entries by filename');
{
  const app = createApp();
  await app._updateMRU(null, 'download.tlproj', 'Project A');
  await app._updateMRU(null, 'download.tlproj', 'Project B');
  assert('NAME_ONLY deduplicated', Object.keys(app._idb.recentFiles).length, '1');
}

section('5c. MRU keeps separate entries for different files');
{
  const app = createApp();
  const h1 = new MockHandle('Alpha.tlproj', projJSON('Alpha'), 'id_alpha');
  const h2 = new MockHandle('Beta.tlproj', projJSON('Beta'), 'id_beta');
  await app._updateMRU(h1, 'Alpha.tlproj', 'Alpha');
  await app._updateMRU(h2, 'Beta.tlproj', 'Beta');
  assert('two separate entries', Object.keys(app._idb.recentFiles).length, '2');
}

section('5d. MRU enforces max 8 entries');
{
  const app = createApp();
  for (let i = 0; i < 10; i++) {
    const h = new MockHandle(`File${i}.tlproj`, projJSON(`Project ${i}`), `id_${i}`);
    await app._updateMRU(h, `File${i}.tlproj`, `Project ${i}`);
    await new Promise(r => setTimeout(r, 5));
  }
  assert('max 8 entries enforced', Object.keys(app._idb.recentFiles).length, '8');
}

// ─── 6. Current-file badge — handle identity (Fix B) ────────────────────

section('6. Badge by handle identity — only correct entry marked');
{
  const app = createApp();
  const h1 = new MockHandle('Timeline.tlproj', projJSON('A'), 'id_A');
  const h2 = new MockHandle('Timeline.tlproj', projJSON('B'), 'id_B');
  await app._updateMRU(h1, 'Timeline.tlproj', 'Project A');
  await app._updateMRU(h2, 'Timeline.tlproj', 'Project B');
  app._fileHandle = h1;
  await app._validateMRU();
  let badgedCount = 0;
  for (const e of app._mruCache) { if (e._isCurrent) badgedCount++; }
  assert('only 1 entry marked current', badgedCount, '1');
  const cur = app._mruCache.find(e => e._isCurrent);
  assertT('correct entry marked', cur && cur.handle._id === 'id_A');
}

section('6b. Badge — no file open means no current');
{
  const app = createApp();
  const h = new MockHandle('X.tlproj', projJSON('X'), 'x_id');
  await app._updateMRU(h, 'X.tlproj', 'X');
  app._fileHandle = null;
  await app._validateMRU();
  assertF('no entry marked current', app._mruCache.some(e => e._isCurrent));
}

// ─── 7. Open from MRU ───────────────────────────────────────────────────

section('7. Open from MRU — ready state');
{
  const app = createApp();
  const h = new MockHandle('Project.tlproj', projJSON('MRU Project'), 'mru_h1');
  await app._updateMRU(h, 'Project.tlproj', 'MRU Project');
  app._mruCache[0]._state = 'ready';
  const result = await app._openFromMRU(app._mruCache[0].id);
  assert('open from MRU succeeded', result, 'ok');
  assert('handle set to MRU entry', app._fileHandle._id, h._id);
  assert('project loaded', app.proj.name, 'MRU Project');
  assertT('lastModified captured', app._fileLastModified > 0);
}

section('7b. Open from MRU — already open');
{
  const app = createApp();
  const h = new MockHandle('Current.tlproj', projJSON('Current'), 'cur_h');
  app._fileHandle = h;
  await app._updateMRU(h, 'Current.tlproj', 'Current');
  app._mruCache[0]._state = 'ready';
  const result = await app._openFromMRU(app._mruCache[0].id);
  assert('already open returns early', result, 'already_open');
}

section('7c. Open from MRU — orphaned file');
{
  const app = createApp();
  const h = new MockHandle('Gone.tlproj', projJSON('Gone'));
  h._exists = false;
  await app._updateMRU(h, 'Gone.tlproj', 'Gone');
  app._mruCache[0]._state = 'orphaned';
  const result = await app._openFromMRU(app._mruCache[0].id);
  assert('orphaned returns error', result, 'orphaned');
}

section('7d. Open from MRU — unsaved changes guard');
{
  const app = createApp();
  const h = new MockHandle('Other.tlproj', projJSON('Other'));
  await app._updateMRU(h, 'Other.tlproj', 'Other');
  app._mruCache[0]._state = 'ready';
  app._unsaved = true;
  const result = await app._openFromMRU(app._mruCache[0].id);
  assert('unsaved changes blocks open', result, 'blocked_unsaved');
}

section('7e. Open from MRU — stale handle gets permission');
{
  const app = createApp();
  const h = new MockHandle('Stale.tlproj', projJSON('Stale Project'));
  await app._updateMRU(h, 'Stale.tlproj', 'Stale Project');
  app._mruCache[0]._state = 'stale';
  const result = await app._openFromMRU(app._mruCache[0].id);
  assert('stale handle granted and loaded', result, 'ok');
  assert('handle set correctly', app._fileHandle._id, h._id);
}

// ─── 8. Open in New Tab ──────────────────────────────────────────────────

section('8. Open in New Tab — reads from disk');
{
  const app = createApp();
  const h = new MockHandle('DiskFile.tlproj', projJSON('Disk Version'), 'disk_h');
  app.proj = { version: 2, name: 'In-Memory Version', items: [] };
  app._fileHandle = new MockHandle('Other.tlproj', projJSON('Other'), 'other_h');
  await app._updateMRU(h, 'DiskFile.tlproj', 'Disk Version');
  app._mruCache[0]._state = 'ready';
  const result = await app._openInNewTab(app._mruCache[0].id);
  assert('open in new tab succeeded', result.result, 'ok');
  assert('project name from disk', result.projName, 'Disk Version');
  assert('returns filename for URL (Fix C)', result.mruFile, 'DiskFile.tlproj');
}

section('8b. Open in New Tab — blocks unsaved current file');
{
  const app = createApp();
  const h = new MockHandle('Same.tlproj', projJSON('Same'), 'same_id');
  app._fileHandle = h;
  app._unsaved = true;
  await app._updateMRU(h, 'Same.tlproj', 'Same');
  app._mruCache[0]._state = 'ready';
  const result = await app._openInNewTab(app._mruCache[0].id);
  assert('blocks unsaved current file', result.result, 'unsaved_current');
}

section('8c. Open in New Tab — allows different file with unsaved changes');
{
  const app = createApp();
  const curH = new MockHandle('Current.tlproj', projJSON('Current'), 'cur_id');
  const otherH = new MockHandle('Other.tlproj', projJSON('Other'), 'other_id');
  app._fileHandle = curH;
  app._unsaved = true;
  await app._updateMRU(otherH, 'Other.tlproj', 'Other');
  app._mruCache[0]._state = 'ready';
  const result = await app._openInNewTab(app._mruCache[0].id);
  assert('allows opening different file', result.result, 'ok');
}

// ─── 9. MRU reconnect in new tab (Fix C: by filename) ───────────────────

section('9. MRU reconnect by filename');
{
  const app = createApp();
  const h = new MockHandle('Reconnect.tlproj', projJSON('Reconnect'), 'recon_id');
  await app._updateMRU(h, 'Reconnect.tlproj', 'Reconnect');
  const result = await app.reconnectFromMRULink('Reconnect.tlproj');
  assert('reconnect succeeded', result, 'reconnected');
  assert('file handle set', app._fileHandle._id, h._id);
  assert('filename in LS', app._getLS('tls3_fileName'), 'Reconnect.tlproj');
  assertT('lastModified captured', app._fileLastModified > 0);
}

section('9b. MRU reconnect — permission needed');
{
  const app = createApp();
  const h = new MockHandle('NeedsPerm.tlproj', projJSON('NeedsPerm'));
  h._permission = 'prompt';
  await app._updateMRU(h, 'NeedsPerm.tlproj', 'NeedsPerm');
  const result = await app.reconnectFromMRULink('NeedsPerm.tlproj');
  assert('reconnect needs permission', result, 'needs_permission');
  assert('handle not set as active', app._fileHandle, 'null');
}

section('9c. MRU reconnect — entry not found');
{
  const app = createApp();
  const result = await app.reconnectFromMRULink('nonexistent.tlproj');
  assert('returns not_found', result, 'not_found');
}

section('9d. MRU reconnect stable after save (Fix C regression)');
{
  const app = createApp();
  const h = new MockHandle('Tab.tlproj', projJSON('Tab'), 'tab_h');
  await app.openFile(h);
  // Save updates MRU ID — but filename stays stable
  await app.saveFile(false);
  // New tab reconnects by filename (not by ID)
  const result = await app.reconnectFromMRULink('Tab.tlproj');
  assert('reconnect works after save', result, 'reconnected');
}

// ─── 10. Project name ↔ filename consistency ─────────────────────────────

section('10. Save updates MRU with current project name');
{
  const app = createApp();
  const h = new MockHandle('Report.tlproj', projJSON('Old Name'));
  app._fileHandle = h;
  app.proj = { version: 2, name: 'New Name', items: [] };
  await app.saveFile(false);
  const entries = Object.values(app._idb.recentFiles);
  assert('MRU project name is current', entries[0].projectName, 'New Name');
  assert('MRU filename matches handle', entries[0].name, 'Report.tlproj');
}

section('10b. Open file replaces project name in MRU');
{
  const app = createApp();
  const h = new MockHandle('Report.tlproj', projJSON('Loaded Name'));
  await app._updateMRU(h, 'Report.tlproj', 'Old Entry Name');
  await app.openFile(h);
  const entries = Object.values(app._idb.recentFiles);
  assert('MRU deduplicated to 1', entries.length, '1');
  assert('MRU project name updated', entries[0].projectName, 'Loaded Name');
}

// ─── 11. Multi-tab — per-tab IDB scoping (Fix A) ─────────────────────────

section('11. Per-tab IDB scoping: tabs get separate handles');
{
  const app1 = createApp();
  const app2 = createApp();
  app2._idb = app1._idb; // shared IDB
  const hA = new MockHandle('A.tlproj', projJSON('A'), 'handle_A');
  const hB = new MockHandle('B.tlproj', projJSON('B'), 'handle_B');
  await app1.openFile(hA);
  await app2.openFile(hB);
  // Each tab stored under its own key
  assert('tab1 IDB has A', app1._idb.handles[app1._tabSessionId]._id, 'handle_A');
  assert('tab2 IDB has B', app1._idb.handles[app2._tabSessionId]._id, 'handle_B');
  // Tab1 refresh → loads its own handle, not tab2's
  const loaded1 = await app1._loadHandle();
  assert('tab1 loads own handle', loaded1._id, 'handle_A');
}

section('11b. Per-tab scoping: refresh does NOT cross-contaminate');
{
  const app1 = createApp();
  const app2 = createApp();
  app2._idb = app1._idb; // shared IDB
  const hA = new MockHandle('FileX.tlproj', projJSON('Project X'), 'handle_X');
  const hB = new MockHandle('FileY.tlproj', projJSON('Project Y'), 'handle_Y');
  await app1.openFile(hA);
  await app2.openFile(hB);
  // Simulate tab1 refresh: clear in-memory handle, try save
  app1._fileHandle = null;
  app1.proj = { version: 2, name: 'Project X', items: [] };
  await app1.saveFile(false);
  // Tab1 should reconnect to its own file (X), not tab2's (Y)
  assert('tab1 reconnected to own file', app1._fileHandle._id, 'handle_X');
  assert('FileX updated', JSON.parse(hA._content).name, 'Project X');
  // FileY should be untouched
  assert('FileY untouched', JSON.parse(hB._content).name, 'Project Y');
}

// ─── 12. Handle store/load/clear lifecycle ───────────────────────────────

section('12. Handle persistence lifecycle');
{
  const app = createApp();
  const h = new MockHandle('Persist.tlproj');
  await app._storeHandle(h);
  const loaded = await app._loadHandle();
  assert('loaded matches stored', loaded._id, h._id);
  await app._clearHandle();
  const after = await app._loadHandle();
  assert('cleared from IDB', after, 'null');
}

// ─── 13. MRU validation — all 5 states ──────────────────────────────────

section('13. MRU entry validation — all 5 states');
{
  const app = createApp();
  const ready = new MockHandle('R.tlproj'); ready._permission = 'granted'; ready._exists = true;
  assert('READY', await app._validateMRUEntry({ handle: ready }), 'ready');

  const stale = new MockHandle('S.tlproj'); stale._permission = 'prompt';
  assert('STALE', await app._validateMRUEntry({ handle: stale }), 'stale');

  const denied = new MockHandle('D.tlproj'); denied._permission = 'denied';
  assert('DENIED', await app._validateMRUEntry({ handle: denied }), 'denied');

  const orphaned = new MockHandle('O.tlproj'); orphaned._permission = 'granted'; orphaned._exists = false;
  assert('ORPHANED', await app._validateMRUEntry({ handle: orphaned }), 'orphaned');

  assert('NAME_ONLY', await app._validateMRUEntry({ handle: null }), 'nameonly');
}

// ─── 14. Save As then Save — correct target ─────────────────────────────

section('14. Save As then Save — writes to original');
{
  const app = createApp();
  const original = new MockHandle('Original.tlproj', projJSON('Original'));
  const copyH = new MockHandle('Copy.tlproj');
  app._fileHandle = original;
  app.proj = { version: 2, name: 'My Project', items: [] };
  await app.saveFile(true, copyH);
  assert('handle still original', app._fileHandle._id, original._id);
  app.proj.name = 'Modified';
  await app.saveFile(false);
  assert('save uses original', app._fileHandle._id, original._id);
  assert('original file updated', JSON.parse(original._content).name, 'Modified');
}

// ─── 15. New tab reconnects and saves to correct file ────────────────────

section('15. New tab reconnects and saves to correct file');
{
  const app = createApp();
  const h = new MockHandle('Target.tlproj', projJSON('Target'), 'target_id');
  await app._updateMRU(h, 'Target.tlproj', 'Target');
  await app.reconnectFromMRULink('Target.tlproj');
  assert('reconnected', app._fileHandle._id, h._id);
  app.proj = { version: 2, name: 'Modified Target', items: [] };
  await app.saveFile(false);
  assert('save goes to target file', JSON.parse(h._content).name, 'Modified Target');
}

// ─── 16. Save As picking the same file ──────────────────────────────────

section('16. Save As picking same file');
{
  const app = createApp();
  const h = new MockHandle('Same.tlproj', projJSON('Same'), 'same_h');
  app._fileHandle = h;
  app.proj = { version: 2, name: 'Same', items: [] };
  await app.saveFile(true, h);
  assert('handle unchanged', app._fileHandle._id, h._id);
}

// ─── 17. Rapid open sequence ─────────────────────────────────────────────

section('17. Rapid open → open → open');
{
  const app = createApp();
  const h1 = new MockHandle('F1.tlproj', projJSON('P1'), 'h1');
  const h2 = new MockHandle('F2.tlproj', projJSON('P2'), 'h2');
  const h3 = new MockHandle('F3.tlproj', projJSON('P3'), 'h3');
  await app.openFile(h1);
  await app.openFile(h2);
  await app.openFile(h3);
  assert('handle is last opened', app._fileHandle._id, h3._id);
  assert('project is P3', app.proj.name, 'P3');
  assert('IDB has last handle', app._idb.handles[app._tabSessionId]._id, h3._id);
  assert('MRU has 3 entries', Object.keys(app._idb.recentFiles).length, '3');
}

// ─── 18. MRU ID stability ───────────────────────────────────────────────

section('18. MRU ID changes on each _updateMRU call');
{
  const app = createApp();
  const h = new MockHandle('E.tlproj', projJSON('E'), 'e_id');
  await app._updateMRU(h, 'E.tlproj', 'V1');
  const id1 = app._mruCache[0].id;
  await app._updateMRU(h, 'E.tlproj', 'V2');
  const id2 = app._mruCache[0].id;
  assertNeq('MRU ID changes', id1, id2);
  assert('still 1 entry', Object.keys(app._idb.recentFiles).length, '1');
}

section('18b. Filename-based reconnect survives ID churn (Fix C)');
{
  const app = createApp();
  const h = new MockHandle('Tab.tlproj', projJSON('Tab'), 'tab_h');
  await app.openFile(h);
  const fname = 'Tab.tlproj';
  await app.saveFile(false); // ID changes
  const result = await app.reconnectFromMRULink(fname);
  assert('filename-based reconnect works', result, 'reconnected');
}

// ─── 19. Cross-tab IDB — per-tab isolation (Fix A) ──────────────────────

section('19. Per-tab IDB: tabs do NOT overwrite each other');
{
  const app1 = createApp();
  const app2 = createApp();
  app2._idb = app1._idb; // shared IDB
  const hA = new MockHandle('A.tlproj', projJSON('A'), 'alpha');
  const hB = new MockHandle('B.tlproj', projJSON('B'), 'beta');
  await app1.openFile(hA);
  assert('tab1 IDB has A', app1._idb.handles[app1._tabSessionId]._id, 'alpha');
  await app2.openFile(hB);
  // Tab1's key should still point to A
  assert('tab1 IDB still has A after tab2 opens', app1._idb.handles[app1._tabSessionId]._id, 'alpha');
  assert('tab2 IDB has B', app1._idb.handles[app2._tabSessionId]._id, 'beta');
  // Simulate tab1 refresh
  app1._fileHandle = null;
  app1.proj = { version: 2, name: 'A', items: [] };
  await app1.saveFile(false);
  assert('tab1 reconnected to A (not B)', app1._fileHandle._id, 'alpha');
  assert('FileA updated', JSON.parse(hA._content).name, 'A');
  assert('FileB untouched', JSON.parse(hB._content).name, 'B');
}

// ─── 20. Share mode flags ────────────────────────────────────────────────

section('20. Share mode vs MRU link mode');
{
  const app = createApp();
  app._shareMode = true; app._mruLinkFile = null;
  assertT('share mode for share links', app._shareMode);
  app._shareMode = false; app._mruLinkFile = 'test.tlproj';
  assertF('no share mode for MRU links', app._shareMode);
  assert('MRU link filename set', app._mruLinkFile, 'test.tlproj');
}

// ─── 21. Save As cancellation (B33 fix) ──────────────────────────────────

section('21. Save As cancel preserves handle (B33 fix)');
{
  const app = createApp();
  const h = new MockHandle('Protected.tlproj', projJSON('Protected'));
  app._fileHandle = h;
  app.proj = { version: 2, name: 'Protected', items: [] };
  await app.saveFile(true, null);
  assert('handle preserved on cancel', app._fileHandle._id, h._id);
}

// ─── 22. Full workflow ──────────────────────────────────────────────────

section('22. Full workflow: Open → Edit → Save As → Edit → Save');
{
  const app = createApp();
  const original = new MockHandle('Original.tlproj', projJSON('Original Project'));
  const copyH = new MockHandle('Copy.tlproj');
  await app.openFile(original);
  assert('step 1: opened', app._fileHandle._id, original._id);
  app.proj.name = 'Edited'; app.markDirty();
  await app.saveFile(true, copyH);
  assert('step 3: handle still original', app._fileHandle._id, original._id);
  assert('step 3: copy has edit', JSON.parse(copyH._content).name, 'Edited');
  app.proj.name = 'Further Edited'; app.markDirty();
  await app.saveFile(false);
  assert('step 6: save to original', JSON.parse(original._content).name, 'Further Edited');
}

// ─── 23. MRU removal ────────────────────────────────────────────────────

section('23. MRU entry removal');
{
  const app = createApp();
  const h1 = new MockHandle('Keep.tlproj', projJSON('Keep'), 'keep');
  const h2 = new MockHandle('Remove.tlproj', projJSON('Remove'), 'remove');
  await app._updateMRU(h1, 'Keep.tlproj', 'Keep');
  await app._updateMRU(h2, 'Remove.tlproj', 'Remove');
  assert('2 entries before', Object.keys(app._idb.recentFiles).length, '2');
  const rmId = app._mruCache.find(e => e.name === 'Remove.tlproj').id;
  await app._removeMRUEntry(rmId);
  assert('1 entry after', Object.keys(app._idb.recentFiles).length, '1');
  assert('remaining is Keep', app._mruCache[0].name, 'Keep.tlproj');
}

// ─── 24. New Project → First Save ────────────────────────────────────────

section('24. New Project → First Save assigns handle');
{
  const app = createApp();
  const h = new MockHandle('Fresh.tlproj');
  app.createFromTemplate('Fresh Project', 'blank');
  assert('no handle after new', app._fileHandle, 'null');
  await app.saveFile(false, h);
  assert('handle adopted', app._fileHandle._id, h._id);
}

// ─── 25. Multiple Save As ───────────────────────────────────────────────

section('25. Multiple Save As — handle stays on original');
{
  const app = createApp();
  const orig = new MockHandle('Main.tlproj', projJSON('Main'));
  app._fileHandle = orig;
  app.proj = { version: 2, name: 'Main', items: [] };
  await app.saveFile(true, new MockHandle('C1.tlproj'));
  assert('after copy1', app._fileHandle._id, orig._id);
  await app.saveFile(true, new MockHandle('C2.tlproj'));
  assert('after copy2', app._fileHandle._id, orig._id);
  await app.saveFile(false);
  assert('regular save', app._fileHandle._id, orig._id);
}

// ─── 26. Open from MRU → Save → MRU consistency ─────────────────────────

section('26. Open from MRU → Save → MRU reflects state');
{
  const app = createApp();
  const h = new MockHandle('MF.tlproj', projJSON('MRU Project'), 'mf_h');
  await app._updateMRU(h, 'MF.tlproj', 'Original Name');
  app._mruCache[0]._state = 'ready';
  await app._openFromMRU(app._mruCache[0].id);
  app.proj.name = 'Renamed';
  await app.saveFile(false);
  const entry = Object.values(app._idb.recentFiles)[0];
  assert('MRU name updated', entry.projectName, 'Renamed');
  assert('MRU filename unchanged', entry.name, 'MF.tlproj');
}

// ─── 27. Same filename different directories ─────────────────────────────

section('27. Same filename different dirs — separate entries');
{
  const app = createApp();
  const h1 = new MockHandle('T.tlproj', projJSON('A'), 'dir1');
  const h2 = new MockHandle('T.tlproj', projJSON('B'), 'dir2');
  await app._updateMRU(h1, 'T.tlproj', 'A');
  await app._updateMRU(h2, 'T.tlproj', 'B');
  assert('both entries kept', Object.keys(app._idb.recentFiles).length, '2');
}

// ─── 28. Renamed file deduplication ──────────────────────────────────────

section('28. Renamed file deduplicated by handle identity');
{
  const app = createApp();
  const h1 = new MockHandle('OldName.tlproj', projJSON('P'), 'same_file');
  const h2 = new MockHandle('NewName.tlproj', projJSON('P'), 'same_file');
  await app._updateMRU(h1, 'OldName.tlproj', 'P');
  await app._updateMRU(h2, 'NewName.tlproj', 'P');
  assert('deduplicated to 1', Object.keys(app._idb.recentFiles).length, '1');
  assert('has new filename', Object.values(app._idb.recentFiles)[0].name, 'NewName.tlproj');
}

// ═══════════════════════════════════════════════════════════════════════════
// FIX VERIFICATION TESTS
// These tests verify that Bugs A, B, C are fixed and D works correctly.
// ═══════════════════════════════════════════════════════════════════════════

section('FIX A: Per-tab IDB prevents cross-tab file corruption');
{
  const app1 = createApp();
  const app2 = createApp();
  app2._idb = app1._idb; // shared IDB
  const hX = new MockHandle('FileX.tlproj', projJSON('Project X'), 'handle_X');
  const hY = new MockHandle('FileY.tlproj', projJSON('Project Y'), 'handle_Y');
  await app1.openFile(hX);
  await app2.openFile(hY);
  // Tab 1 loses handle (page refresh)
  app1._fileHandle = null;
  app1.proj = { version: 2, name: 'Project X', items: [] };
  await app1.saveFile(false);
  // FIXED: Tab 1 reconnects to its OWN file (X), not tab2's (Y)
  assert('tab1 reconnected to correct file', app1._fileHandle._id, 'handle_X');
  assert('FileX updated with X data', JSON.parse(hX._content).name, 'Project X');
  assert('FileY NOT overwritten', JSON.parse(hY._content).name, 'Project Y');
}

section('FIX B: Badge uses handle identity, not filename');
{
  const app = createApp();
  const h1 = new MockHandle('P.tlproj', projJSON('A'), 'dir1');
  const h2 = new MockHandle('P.tlproj', projJSON('B'), 'dir2');
  await app._updateMRU(h1, 'P.tlproj', 'A');
  await app._updateMRU(h2, 'P.tlproj', 'B');
  app._fileHandle = h1;
  await app._validateMRU();
  let badged = 0;
  for (const e of app._mruCache) { if (e._isCurrent) badged++; }
  assert('only 1 entry badged (not both)', badged, '1');
  const cur = app._mruCache.find(e => e._isCurrent);
  assertT('correct entry badged', cur && cur.handle._id === 'dir1');
}

section('FIX C: Filename-based reconnect survives MRU ID churn');
{
  const app = createApp();
  const h = new MockHandle('Test.tlproj', projJSON('Test'), 'test_h');
  await app._updateMRU(h, 'Test.tlproj', 'Test');
  // Save again (natural user action) — MRU ID changes
  app._fileHandle = h;
  app.proj = { version: 2, name: 'Test', items: [] };
  await app.saveFile(false);
  // New tab reconnects by FILENAME (not by stale ID)
  const result = await app.reconnectFromMRULink('Test.tlproj');
  assert('reconnect succeeds despite ID change', result, 'reconnected');
  assert('correct handle reconnected', app._fileHandle._id, 'test_h');
}

section('FIX D: Stale file warning on save');
{
  const app = createApp();
  const h = new MockHandle('Shared.tlproj', projJSON('Original'));
  await app.openFile(h);
  const originalLM = app._fileLastModified;
  assertT('lastModified captured on open', originalLM > 0);
  // Simulate another tab/process modifying the file on disk
  h._lastModified = _mockTime++;
  // Try to save — stale check should detect the mismatch
  app._confirmResult = false; // user cancels the overwrite
  app.proj = { version: 2, name: 'My Changes', items: [] };
  const result = await app.saveFile(false);
  assert('save blocked by stale warning', result, 'blocked_stale');
  assert('file NOT overwritten', JSON.parse(h._content).name, 'Original');
}

section('FIX D: Stale file warning — user confirms overwrite');
{
  const app = createApp();
  const h = new MockHandle('Shared2.tlproj', projJSON('Original'));
  await app.openFile(h);
  // Simulate external modification
  h._lastModified = _mockTime++;
  // User confirms the overwrite
  app._confirmResult = true;
  app.proj = { version: 2, name: 'My Changes', items: [] };
  const result = await app.saveFile(false);
  assert('save proceeds after confirmation', result, 'saved_existing');
  assert('file overwritten', JSON.parse(h._content).name, 'My Changes');
  // Timestamp should be updated after save
  assertT('lastModified updated after save', app._fileLastModified > 0);
}

section('FIX D: No stale warning on first save (no prior timestamp)');
{
  const app = createApp();
  const h = new MockHandle('New.tlproj');
  app._fileHandle = h;
  app._fileLastModified = 0; // no prior timestamp
  app._confirmResult = false; // would block if stale check ran
  app.proj = { version: 2, name: 'New Project', items: [] };
  const result = await app.saveFile(false);
  assert('first save not blocked', result, 'saved_existing');
}

section('FIX D: Stale timestamp reset on new project');
{
  const app = createApp();
  const h = new MockHandle('Old.tlproj', projJSON('Old'));
  await app.openFile(h);
  assertT('had timestamp', app._fileLastModified > 0);
  app.createFromTemplate('Fresh', 'blank');
  assert('timestamp cleared', String(app._fileLastModified), '0');
}

section('FIX D: openFile captures lastModified');
{
  const app = createApp();
  const h = new MockHandle('Tracked.tlproj', projJSON('Tracked'));
  h._lastModified = 9999;
  await app.openFile(h);
  assert('lastModified captured from file', String(app._fileLastModified), '9999');
}

// ═══════════════════════════════════════════════════════════════════════════

const stats = summary();
process.exit(stats.failed > 0 ? 1 : 0);

})();
