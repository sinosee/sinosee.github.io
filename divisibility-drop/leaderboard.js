/* Per-level leaderboard for 整除掉落挑戰.
   Cloud path (append-only):
     /divisibilityDrop/levels/{2|5|10|3|mix}/scores/{pushId}
   Fields: classId, studentNo, score, stars, ts, displayName (= classId + studentNo)
   Client writes only after a run ends.
   If Firebase is still placeholders or the network fails, scores stay in localStorage.

   Realtime Database rules (also in LEADERBOARD.md — publish these in the console):
   {
     "rules": {
       "divisibilityDrop": {
         "levels": {
           "$levelId": {
             "scores": {
               ".read": true,
               ".indexOn": ["score"],
               "$pushId": {
                 ".write": "!data.exists() && newData.exists() && ($levelId == '2' || $levelId == '5' || $levelId == '10' || $levelId == '3' || $levelId == 'mix')",
                 ".validate": "newData.hasChildren(['classId','studentNo','score','stars','ts','displayName'])",
                 "classId": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)" },
                 "studentNo": { ".validate": "newData.isString() && newData.val().matches(/^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/)" },
                 "score": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 9999 && newData.val() % 1 == 0" },
                 "stars": { ".validate": "newData.isNumber() && newData.val() >= 0 && newData.val() <= 3 && newData.val() % 1 == 0" },
                 "ts": { ".validate": "newData.isNumber() && newData.val() > 1600000000000 && newData.val() < now + 86400000" },
                 "displayName": { ".validate": "newData.isString() && newData.val() == newData.parent().child('classId').val() + newData.parent().child('studentNo').val()" },
                 "$other": { ".validate": false }
               }
             }
           }
         }
       }
     }
   }
*/
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DivLeaderboard = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var LEVELS = [
    { id: '2', short: '被 2 整除', name: '被 2 整除' },
    { id: '5', short: '被 5 整除', name: '被 5 整除' },
    { id: '10', short: '被 10 整除', name: '被 10 整除' },
    { id: '3', short: '被 3 整除', name: '被 3 整除' },
    { id: 'mix', short: '全部關卡', name: '全部關卡' }
  ];
  var LEVEL_IDS = { '2': 1, '5': 1, '10': 1, '3': 1, mix: 1 };
  var TOP_N = 10;
  var LS_SCORES = 'divisibilityDrop.localScores.v1';
  var LS_IDENTITY = 'divisibilityDrop.identity.v1';
  var FB_APP = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js';
  var FB_DB = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-database-compat.js';
  var HAN_RE = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF]/;
  var CJK_PUNCT_RE = /[\u3000-\u303F]/;
  var FULLWIDTH_RE = /[\uFF00-\uFFEF]/;
  var TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/;

  var MSG = {
    unconfigured: '龍虎榜未接上雲端，以下係本機暫存。',
    offline: '暫時無法連線，以下係本機暫存。',
    cloud: '雲端龍虎榜',
    empty: '暫時未有成績。玩完一局就會出現喺度。',
    loading: '龍虎榜載入中…'
  };

  var memoryScores = null;
  var memoryIdentity = null;
  var fbPromise = null;

  function clean(raw) {
    return String(raw == null ? '' : raw).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  }

  function analyze(raw) {
    var value = clean(raw);
    if (!value) return { code: 'empty', value: '' };
    if (HAN_RE.test(value) || CJK_PUNCT_RE.test(value)) return { code: 'cjk', value: value };
    if (FULLWIDTH_RE.test(value)) return { code: 'fullwidth', value: value };
    if (!TOKEN_RE.test(value)) return { code: 'charset', value: value };
    return { code: 'ok', value: value.toUpperCase() };
  }

  function validateIdentity(classRaw, noRaw) {
    var c = analyze(classRaw);
    var n = analyze(noRaw);
    var fields = [];
    function fail(code, message, which) {
      return { ok: false, code: code, field: which[0], fields: which, message: message };
    }
    if (c.code === 'cjk' || n.code === 'cjk') {
      if (c.code === 'cjk') fields.push('classId');
      if (n.code === 'cjk') fields.push('studentNo');
      var message = (c.code === 'cjk' && n.code === 'cjk')
        ? '唔好打中文。班別學號請用英文字母同數字，例如 4A、12。'
        : (c.code === 'cjk'
          ? '班別唔可以打中文。請用英文字母同數字，例如 4A。'
          : '學號唔可以打中文。請用數字，例如 12。');
      return fail('cjk', message, fields);
    }
    if (c.code === 'fullwidth' || n.code === 'fullwidth') {
      if (c.code === 'fullwidth') fields.push('classId');
      if (n.code === 'fullwidth') fields.push('studentNo');
      return fail('cjk', '請改用半形英文字母同數字，唔好用全形字或中文。', fields);
    }
    if (c.code === 'charset' || n.code === 'charset') {
      if (c.code === 'charset') fields.push('classId');
      if (n.code === 'charset') fields.push('studentNo');
      return fail('charset', '只可以輸入英文字母、數字同連字號（-）。', fields);
    }
    if (c.code === 'empty' && n.code === 'empty') {
      return fail('empty', '請填寫班別學號，先可以開始。', ['classId', 'studentNo']);
    }
    if (c.code === 'empty') return fail('empty', '請填寫班別，例如 4A。', ['classId']);
    if (n.code === 'empty') return fail('empty', '請填寫學號，例如 12。', ['studentNo']);
    return {
      ok: true,
      code: 'ok',
      field: null,
      fields: [],
      message: '',
      classId: c.value,
      studentNo: n.value,
      displayName: c.value + n.value
    };
  }

  function storageGet(key, memoryRef) {
    try {
      if (typeof localStorage !== 'undefined') {
        var raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw);
      }
    } catch (e) { /* private mode or bad JSON */ }
    return memoryRef;
  }

  function storageSet(key, value, setMemory) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch (e) { /* quota */ }
    setMemory(value);
    return false;
  }

  function readScores() {
    var data = storageGet(LS_SCORES, memoryScores);
    if (!data || typeof data !== 'object') return {};
    return data;
  }

  function writeScores(data) {
    memoryScores = data;
    storageSet(LS_SCORES, data, function (v) { memoryScores = v; });
  }

  function readLocal(levelId) {
    var all = readScores();
    var list = all[levelId];
    if (!Array.isArray(list)) return [];
    return list.map(normalizeStored).filter(Boolean);
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var idn = validateIdentity(raw.classId, raw.studentNo);
    if (!idn.ok) return null;
    return {
      classId: idn.classId,
      studentNo: idn.studentNo,
      displayName: idn.displayName,
      score: clampScore(raw.score),
      stars: clampStars(raw.stars),
      ts: clampTs(raw.ts)
    };
  }

  function saveLocal(levelId, entry) {
    var all = readScores();
    var list = Array.isArray(all[levelId]) ? all[levelId].slice() : [];
    list.push({
      classId: entry.classId,
      studentNo: entry.studentNo,
      displayName: entry.displayName,
      score: entry.score,
      stars: entry.stars,
      ts: entry.ts
    });
    list.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    if (list.length > 80) list = list.slice(list.length - 80);
    all[levelId] = list;
    writeScores(all);
  }

  function rememberIdentity(id) {
    if (!id) return;
    var safe = { classId: id.classId, studentNo: id.studentNo };
    memoryIdentity = safe;
    storageSet(LS_IDENTITY, safe, function (v) { memoryIdentity = v; });
  }

  function recallIdentity() {
    var data = storageGet(LS_IDENTITY, memoryIdentity);
    if (!data) return null;
    var idn = validateIdentity(data.classId, data.studentNo);
    if (!idn.ok) return null;
    return { classId: idn.classId, studentNo: idn.studentNo, displayName: idn.displayName };
  }

  function clampScore(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    if (n > 9999) return 9999;
    return n;
  }

  function clampStars(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    if (n > 3) return 3;
    return n;
  }

  function clampTs(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  function isConfigured(cfg) {
    cfg = cfg || (root && root.FIREBASE_CONFIG);
    if (!cfg || typeof cfg !== 'object') return false;
    var apiKey = String(cfg.apiKey || '');
    var databaseURL = String(cfg.databaseURL || '');
    var projectId = String(cfg.projectId || '');
    if (!apiKey || !databaseURL || !projectId) return false;
    if (/YOUR_|PLACEHOLDER|xxxx/i.test(apiKey + ' ' + databaseURL + ' ' + projectId)) return false;
    if (!/^https:\/\/[a-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)\/?$/i.test(databaseURL)) return false;
    return true;
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (!root || !root.document) { reject(new Error('no-document')); return; }
      var s = root.document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('script')); };
      root.document.head.appendChild(s);
    });
  }

  function initFirebase() {
    try {
      if (!root.firebase || !root.firebase.initializeApp) return false;
      if (!root.firebase.apps || !root.firebase.apps.length) {
        root.firebase.initializeApp(root.FIREBASE_CONFIG);
      }
      return !!(root.firebase.database);
    } catch (e) {
      return false;
    }
  }

  function ensureFirebase() {
    if (fbPromise) return fbPromise;
    if (!isConfigured()) {
      fbPromise = Promise.resolve({ ready: false, reason: 'unconfigured' });
      return fbPromise;
    }
    if (root.firebase && root.firebase.database && initFirebase()) {
      fbPromise = Promise.resolve({ ready: true, reason: null });
      return fbPromise;
    }
    fbPromise = loadScript(FB_APP).then(function () {
      return loadScript(FB_DB);
    }).then(function () {
      return initFirebase()
        ? { ready: true, reason: null }
        : { ready: false, reason: 'offline' };
    }).catch(function () {
      return { ready: false, reason: 'offline' };
    });
    return fbPromise;
  }

  function scoresRef(levelId) {
    return root.firebase.database().ref('divisibilityDrop/levels/' + levelId + '/scores');
  }

  function parseSnap(snap) {
    var entries = [];
    if (!snap || !snap.forEach) return entries;
    snap.forEach(function (child) {
      var row = normalizeStored(child.val());
      if (row) {
        row.id = child.key;
        entries.push(row);
      }
    });
    return entries;
  }

  function readCloud(levelId) {
    var ref = scoresRef(levelId);
    return ref.orderByChild('score').limitToLast(100).once('value').then(parseSnap, function () {
      return ref.limitToLast(100).once('value').then(parseSnap);
    });
  }

  function writeCloud(levelId, entry) {
    return scoresRef(levelId).push({
      classId: entry.classId,
      studentNo: entry.studentNo,
      score: entry.score,
      stars: entry.stars,
      ts: entry.ts,
      displayName: entry.displayName
    });
  }

  function makeEntry(input) {
    input = input || {};
    if (!LEVEL_IDS[input.levelId]) return null;
    var idn = validateIdentity(input.classId, input.studentNo);
    if (!idn.ok) return null;
    return {
      levelId: input.levelId,
      classId: idn.classId,
      studentNo: idn.studentNo,
      displayName: idn.displayName,
      score: clampScore(input.score),
      stars: clampStars(input.stars),
      ts: Date.now()
    };
  }

  function submit(input) {
    var entry = makeEntry(input);
    if (!entry) return Promise.resolve({ ok: false, source: 'local', reason: 'invalid', entry: null, message: '' });
    saveLocal(entry.levelId, entry);
    return ensureFirebase().then(function (gate) {
      if (!gate.ready) {
        var reason = gate.reason || 'unconfigured';
        return {
          ok: true,
          source: 'local',
          reason: reason,
          entry: entry,
          message: reason === 'offline' ? MSG.offline : MSG.unconfigured
        };
      }
      return writeCloud(entry.levelId, entry).then(function () {
        return { ok: true, source: 'cloud', reason: null, entry: entry, message: MSG.cloud };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] write failed', err);
        return { ok: true, source: 'local', reason: 'offline', entry: entry, message: MSG.offline };
      });
    });
  }

  function sameStudent(a, b) {
    return !!a && !!b && a.classId === b.classId && a.studentNo === b.studentNo;
  }

  function mergeHighlight(entries, levelId, highlight) {
    if (!highlight || !highlight.classId) return entries;
    var localMine = readLocal(levelId).filter(function (e) {
      return e.classId === highlight.classId && e.studentNo === highlight.studentNo;
    });
    return entries.concat(localMine);
  }

  function load(levelId) {
    if (!LEVEL_IDS[levelId]) levelId = '2';
    return ensureFirebase().then(function (gate) {
      if (!gate.ready) {
        var reason = gate.reason || 'unconfigured';
        return {
          ok: true,
          source: 'local',
          reason: reason,
          message: reason === 'offline' ? MSG.offline : MSG.unconfigured,
          entries: readLocal(levelId),
          levelId: levelId
        };
      }
      return readCloud(levelId).then(function (entries) {
        return {
          ok: true,
          source: 'cloud',
          reason: null,
          message: MSG.cloud,
          entries: entries,
          levelId: levelId
        };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] read failed', err);
        return {
          ok: true,
          source: 'local',
          reason: 'offline',
          message: MSG.offline,
          entries: readLocal(levelId),
          levelId: levelId
        };
      });
    });
  }

  /* Higher score wins. Tie: more stars, then newer ts. */
  function better(a, b) {
    if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    return (b.ts || 0) - (a.ts || 0);
  }

  function bestByStudent(entries) {
    var map = {};
    (entries || []).forEach(function (e) {
      if (!e) return;
      var key = e.classId + '|' + e.studentNo;
      if (!map[key] || better(e, map[key]) < 0) map[key] = e;
    });
    return Object.keys(map).map(function (k) { return map[k]; }).sort(better);
  }

  function starsText(n) {
    var s = '';
    var v = clampStars(n);
    for (var i = 0; i < 3; i++) s += i < v ? '⭐' : '☆';
    return s;
  }

  function rankText(n) {
    if (n === 1) return '🥇';
    if (n === 2) return '🥈';
    if (n === 3) return '🥉';
    return String(n);
  }

  function present(entries, highlight, limit) {
    var ranked = bestByStudent(entries);
    var cap = limit || TOP_N;
    var rows = [];
    var mine = null;
    for (var i = 0; i < ranked.length; i++) {
      var e = ranked[i];
      var isMine = sameStudent(e, highlight);
      var badge = '';
      if (isMine) {
        badge = (highlight.ts && e.ts === highlight.ts) ? '今次' : '你';
        mine = {
          rank: i + 1,
          classId: e.classId,
          studentNo: e.studentNo,
          score: e.score,
          stars: e.stars,
          ts: e.ts,
          badge: badge
        };
      }
      if (i < cap) {
        rows.push({
          rank: i + 1,
          classId: e.classId,
          studentNo: e.studentNo,
          score: e.score,
          stars: e.stars,
          ts: e.ts,
          mine: isMine,
          badge: badge
        });
      }
    }
    var pinned = null;
    if (mine && mine.rank > cap) {
      pinned = mine;
      pinned.mine = true;
    }
    var note = '';
    if (highlight && mine && highlight.score != null && highlight.score !== mine.score) {
      note = '今次 ' + highlight.score + ' 分。榜上顯示你最高的 ' + mine.score + ' 分。';
    }
    return { rows: rows, pinned: pinned, mine: mine, note: note, total: ranked.length };
  }

  function el(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function paintRow(doc, row) {
    var li = el(doc, 'li', 'lbRow' + (row.mine ? ' mine' : ''));
    li.appendChild(el(doc, 'span', 'lbRank', rankText(row.rank)));
    var name = el(doc, 'span', 'lbName', row.classId + ' · ' + row.studentNo);
    if (row.badge) name.appendChild(el(doc, 'span', 'lbTag', row.badge));
    li.appendChild(name);
    li.appendChild(el(doc, 'span', 'lbStars', starsText(row.stars)));
    li.appendChild(el(doc, 'span', 'lbScore', String(row.score)));
    li.setAttribute('aria-label', '第' + row.rank + '名 ' + row.classId + ' ' + row.studentNo + '號 ' + row.score + '分');
    return li;
  }

  function renderLoading(container) {
    if (!container) return;
    var doc = container.ownerDocument;
    container.textContent = '';
    container.appendChild(el(doc, 'p', 'lbMsg', MSG.loading));
  }

  function renderInto(container, loadResult, highlight, options) {
    if (!container) return;
    var doc = container.ownerDocument;
    options = options || {};
    var levelId = (loadResult && loadResult.levelId) || options.levelId;
    var entries = (loadResult && loadResult.entries) || [];
    if (highlight && levelId) entries = mergeHighlight(entries, levelId, highlight);
    var view = present(entries, highlight, TOP_N);
    container.textContent = '';

    if (options.title) {
      container.appendChild(el(doc, 'h3', 'lbTitle', options.title));
    }
    var message = (loadResult && loadResult.message) || '';
    if (!view.rows.length && !message) message = MSG.empty;
    if (message) container.appendChild(el(doc, 'p', 'lbMsg', message));
    container.appendChild(el(doc, 'p', 'lbHint', '每位同學顯示最高分。同分先比星星，星星一樣就比較新的排前面。'));
    if (view.note) container.appendChild(el(doc, 'p', 'lbMsg', view.note));

    if (!view.rows.length) {
      container.appendChild(el(doc, 'div', 'lbEmpty', '呢關暫時未有人上榜。'));
      return;
    }
    var list = el(doc, 'ol', 'lbList');
    view.rows.forEach(function (row) { list.appendChild(paintRow(doc, row)); });
    container.appendChild(list);
    if (view.pinned) {
      container.appendChild(el(doc, 'p', 'lbHint', '你的名次'));
      var extra = el(doc, 'ol', 'lbList');
      extra.appendChild(paintRow(doc, view.pinned));
      container.appendChild(extra);
    }
  }

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) if (LEVELS[i].id === id) return LEVELS[i];
    return LEVELS[0];
  }

  return {
    LEVELS: LEVELS,
    TOP_N: TOP_N,
    MSG: MSG,
    validateIdentity: validateIdentity,
    rememberIdentity: rememberIdentity,
    recallIdentity: recallIdentity,
    isConfigured: isConfigured,
    submit: submit,
    load: load,
    present: present,
    bestByStudent: bestByStudent,
    renderInto: renderInto,
    renderLoading: renderLoading,
    levelById: levelById,
    readLocal: readLocal
  };
});
