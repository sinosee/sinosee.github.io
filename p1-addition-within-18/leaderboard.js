/* 18以內加數 leaderboard.
   Cloud path:
     /p1AdditionWithin18/scores/{pushId}
   Fields: classId, studentNo, score (0–2000, step 10), stars (0–3), ts, displayName (= classId + studentNo)
   Students may only create a score node. A teacher deletes one node by writing
   /p1AdditionWithin18/deleteTicket with the PIN that matches /p1AdditionWithin18/teacherPin
   (set in the Firebase console; clients cannot read it), then removing that score.
   Full rules: LEADERBOARD.md — republish them or delete fails.
   A score is written only after the 2-minute round ends. Teacher mode never writes.
   If Firebase is still placeholders or the network fails, scores stay in localStorage.
   Offline deletes use LOCAL_TEACHER_PIN and never touch the cloud.
*/
(function (root, factory) {
  var api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AdditionLeaderboard = api;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null), function (root) {
  'use strict';

  var TOP_N = 10;
  var LS_SCORES = 'p1AdditionWithin18.scores.v1';
  var LS_IDENTITY = 'p1AdditionWithin18.identity.v1';
  var FB_APP = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js';
  var FB_DB = 'https://www.gstatic.com/firebasejs/10.13.2/firebase-database-compat.js';
  var HAN_RE = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF]/;
  var CJK_PUNCT_RE = /[\u3000-\u303F]/;
  var FULLWIDTH_RE = /[\uFF00-\uFFEF]/;
  var TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/;
  var PIN_RE = /^[0-9]{4,8}$/;
  var SCORE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
  /* Offline / 本機暫存 only. Cloud deletes check p1AdditionWithin18/teacherPin. */
  var LOCAL_TEACHER_PIN = '8800';

  var MSG = {
    unconfigured: '龍虎榜尚未連接雲端，以下是本機暫存。',
    offline: '暫時無法連線，以下是本機暫存。',
    rules: '雲端規則尚未發佈，以下是本機暫存。老師請參閱 LEADERBOARD.md。',
    cloud: '雲端龍虎榜',
    empty: '暫時未有成績。完成一局後就會出現在這裡。',
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
        ? '請不要輸入中文姓名。班別和學號請用英文字母和數字，例如 1A、12。'
        : (c.code === 'cjk'
          ? '班別不可以輸入中文。請用英文字母和數字，例如 1A。'
          : '學號不可以輸入中文。請用數字，例如 12。');
      return fail('cjk', message, fields);
    }
    if (c.code === 'fullwidth' || n.code === 'fullwidth') {
      if (c.code === 'fullwidth') fields.push('classId');
      if (n.code === 'fullwidth') fields.push('studentNo');
      return fail('cjk', '請改用半形英文字母和數字，不要使用全形字或中文。', fields);
    }
    if (c.code === 'charset' || n.code === 'charset') {
      if (c.code === 'charset') fields.push('classId');
      if (n.code === 'charset') fields.push('studentNo');
      return fail('charset', '只可以輸入英文字母、數字和連字號（-）。', fields);
    }
    if (c.code === 'empty' && n.code === 'empty') {
      return fail('empty', '請填寫班別和學號，才可以開始。', ['classId', 'studentNo']);
    }
    if (c.code === 'empty') return fail('empty', '請填寫班別，例如 1A。', ['classId']);
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
    if (!Array.isArray(data)) return [];
    return data.map(normalizeStored).filter(Boolean);
  }

  function writeScores(list) {
    memoryScores = list;
    storageSet(LS_SCORES, list, function (v) { memoryScores = v; });
  }

  function normalizeStored(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var idn = validateIdentity(raw.classId, raw.studentNo);
    if (!idn.ok) return null;
    var row = {
      classId: idn.classId,
      studentNo: idn.studentNo,
      displayName: idn.displayName,
      score: clampScore(raw.score),
      stars: clampStars(raw.stars),
      ts: clampTs(raw.ts)
    };
    if (raw.id && SCORE_ID_RE.test(String(raw.id))) row.id = String(raw.id);
    return row;
  }

  function newLocalId() {
    return 'local-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  function saveLocal(entry) {
    var list = readScores();
    list.push({
      id: entry.id && SCORE_ID_RE.test(String(entry.id)) ? String(entry.id) : newLocalId(),
      classId: entry.classId,
      studentNo: entry.studentNo,
      displayName: entry.displayName,
      score: entry.score,
      stars: entry.stars,
      ts: entry.ts
    });
    list.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    if (list.length > 80) list = list.slice(list.length - 80);
    writeScores(list);
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
    if (n > 2000) n = 2000;
    return n - (n % 10);
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

  function scoresRef() {
    return root.firebase.database().ref('p1AdditionWithin18/scores');
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

  function readCloud() {
    var ref = scoresRef();
    return ref.orderByChild('score').limitToLast(100).once('value').then(parseSnap, function () {
      return ref.limitToLast(100).once('value').then(parseSnap);
    });
  }

  function writeCloud(entry) {
    return scoresRef().push({
      classId: entry.classId,
      studentNo: entry.studentNo,
      score: entry.score,
      stars: entry.stars,
      ts: entry.ts,
      displayName: entry.displayName
    });
  }

  function ticketRef() {
    return root.firebase.database().ref('p1AdditionWithin18/deleteTicket');
  }

  function normalizePin(raw) {
    var value = clean(raw).replace(/[\uFF10-\uFF19]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 0x30);
    });
    if (!PIN_RE.test(value)) return '';
    return value;
  }

  function isCloudScoreId(id) {
    return typeof id === 'string' && SCORE_ID_RE.test(id) && id.indexOf('local-') !== 0 && id.charAt(0) !== '_';
  }

  function removeLocal(row) {
    var list = readScores().filter(function (item) {
      if (row.id && item.id && String(item.id) === String(row.id)) return false;
      return !(item.classId === row.classId && item.studentNo === row.studentNo
        && item.score === clampScore(row.score) && item.stars === clampStars(row.stars)
        && item.ts === clampTs(row.ts));
    });
    writeScores(list);
  }

  function verifyTeacherPin(pinRaw) {
    var pin = normalizePin(pinRaw);
    if (!pin) {
      return Promise.resolve({ ok: false, code: 'format', message: '老師密碼要 4 至 8 位數字。' });
    }
    return ensureFirebase().then(function (gate) {
      if (!gate.ready) {
        if (pin === LOCAL_TEACHER_PIN) return { ok: true, source: 'local', pin: pin, message: '' };
        return { ok: false, code: 'pin', source: 'local', message: '老師密碼不正確。' };
      }
      var ref = ticketRef();
      return ref.set({ pin: pin, scoreId: '_pincheck' }).then(function () {
        return ref.remove().catch(function () { /* ticket is unreadable; leftover expires on the next unlock */ });
      }).then(function () {
        return { ok: true, source: 'cloud', pin: pin, message: '' };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] pin check failed', err);
        return {
          ok: false,
          code: 'pin',
          source: 'cloud',
          message: '解鎖失敗。密碼不正確，或 Firebase 尚未發佈新規則、尚未設定 teacherPin。請參閱 LEADERBOARD.md。成績未有改動。'
        };
      });
    });
  }

  function deleteScore(row, pinRaw) {
    var pin = normalizePin(pinRaw);
    if (!pin) return Promise.resolve({ ok: false, message: '老師密碼要 4 至 8 位數字。' });
    if (!row || !row.classId) {
      return Promise.resolve({ ok: false, message: '找不到這一筆成績。' });
    }
    return ensureFirebase().then(function (gate) {
      if (!gate.ready || !isCloudScoreId(row.id)) {
        return verifyTeacherPin(pin).then(function (check) {
          if (!check.ok) {
            var denied = check.source === 'cloud'
              ? '刪除失敗。密碼不正確，或尚未發佈新規則、尚未設定 teacherPin。這一筆成績仍然在榜上。請參閱 LEADERBOARD.md。'
              : (check.message || '老師密碼不正確。');
            return { ok: false, source: check.source, message: denied };
          }
          removeLocal(row);
          return { ok: true, source: 'local', message: '已刪除本機這一筆成績。' };
        });
      }
      var ref = ticketRef();
      return ref.set({ pin: pin, scoreId: row.id }).then(function () {
        return scoresRef().child(row.id).remove();
      }).then(function () {
        removeLocal(row);
        return ref.remove().catch(function () {});
      }).then(function () {
        return {
          ok: true,
          source: 'cloud',
          message: '已刪除這一筆成績。如果榜上還看到同一位同學，代表還有其他紀錄，可以再刪一次。'
        };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] delete failed', err);
        return ref.remove().catch(function () {}).then(function () {
          return {
            ok: false,
            source: 'cloud',
            message: '刪除失敗。密碼不正確，或尚未發佈新規則、尚未設定 teacherPin。這一筆成績仍然在榜上。請參閱 LEADERBOARD.md。'
          };
        });
      });
    });
  }

  function makeEntry(input) {
    input = input || {};
    var idn = validateIdentity(input.classId, input.studentNo);
    if (!idn.ok) return null;
    return {
      classId: idn.classId,
      studentNo: idn.studentNo,
      displayName: idn.displayName,
      score: clampScore(input.score),
      stars: clampStars(input.stars),
      ts: Date.now()
    };
  }

  function cloudReason(err) {
    var text = String((err && (err.code || err.message)) || err || '');
    if (/permission/i.test(text)) return 'rules';
    return 'offline';
  }

  function localResult(reason, entry) {
    return {
      ok: true,
      source: 'local',
      reason: reason,
      entry: entry || null,
      message: reason === 'rules' ? MSG.rules : (reason === 'offline' ? MSG.offline : MSG.unconfigured),
      entries: entry ? undefined : readScores()
    };
  }

  function submit(input) {
    var entry = makeEntry(input);
    if (!entry) return Promise.resolve({ ok: false, source: 'local', reason: 'invalid', entry: null, message: '' });
    saveLocal(entry);
    return ensureFirebase().then(function (gate) {
      if (!gate.ready) return localResult(gate.reason || 'unconfigured', entry);
      return writeCloud(entry).then(function () {
        return { ok: true, source: 'cloud', reason: null, entry: entry, message: MSG.cloud };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] write failed', err);
        return localResult(cloudReason(err), entry);
      });
    });
  }

  function sameStudent(a, b) {
    return !!a && !!b && a.classId === b.classId && a.studentNo === b.studentNo;
  }

  function mergeHighlight(entries, highlight) {
    if (!highlight || !highlight.classId) return entries;
    var localMine = readScores().filter(function (e) {
      return e.classId === highlight.classId && e.studentNo === highlight.studentNo;
    });
    return entries.concat(localMine);
  }

  function load() {
    return ensureFirebase().then(function (gate) {
      if (!gate.ready) {
        var reason = gate.reason || 'unconfigured';
        var local = localResult(reason);
        local.entries = readScores();
        return local;
      }
      return readCloud().then(function (entries) {
        return {
          ok: true,
          source: 'cloud',
          reason: null,
          message: MSG.cloud,
          entries: entries
        };
      }).catch(function (err) {
        if (root.console && root.console.warn) root.console.warn('[leaderboard] read failed', err);
        var failed = localResult(cloudReason(err));
        failed.entries = readScores();
        return failed;
      });
    });
  }

  function better(a, b) {
    if (scoreOf(b) !== scoreOf(a)) return scoreOf(b) - scoreOf(a);
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    return (b.ts || 0) - (a.ts || 0);
  }

  function scoreOf(e) {
    var n = e && e.score;
    return n || 0;
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
    var pinned = null;
    var place = 1;
    for (var i = 0; i < ranked.length; i++) {
      var e = ranked[i];
      if (i > 0 && scoreOf(e) !== scoreOf(ranked[i - 1])) place = i + 1;
      var tied = (i > 0 && scoreOf(ranked[i - 1]) === scoreOf(e))
        || (i + 1 < ranked.length && scoreOf(ranked[i + 1]) === scoreOf(e));
      var isMine = sameStudent(e, highlight);
      var badge = '';
      if (isMine) badge = (highlight.ts && e.ts === highlight.ts) ? '這次' : '你';
      var row = {
        rank: place,
        tied: tied,
        id: e.id || '',
        classId: e.classId,
        studentNo: e.studentNo,
        score: e.score,
        stars: e.stars,
        ts: e.ts,
        mine: isMine,
        badge: badge
      };
      if (isMine) {
        mine = row;
        if (i >= cap) pinned = row;
      }
      if (i < cap) rows.push(row);
    }
    var note = '';
    if (highlight && mine && highlight.score != null && highlight.score !== mine.score) {
      note = '這次 ' + highlight.score + ' 分。榜上顯示你最高的 ' + mine.score + ' 分。';
    }
    return { rows: rows, pinned: pinned, mine: mine, note: note, total: ranked.length };
  }

  function el(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function paintRow(doc, row, onDelete) {
    var li = el(doc, 'li', 'lbRow' + (row.mine ? ' mine' : '') + (onDelete ? ' hasDel' : ''));
    li.appendChild(el(doc, 'span', 'lbRank', rankText(row.rank)));
    var name = el(doc, 'span', 'lbName', row.classId + ' · ' + row.studentNo);
    if (row.badge) name.appendChild(el(doc, 'span', 'lbTag', row.badge));
    li.appendChild(name);
    li.appendChild(el(doc, 'span', 'lbStars', starsText(row.stars)));
    li.appendChild(el(doc, 'span', 'lbScore', String(row.score) + '分'));
    if (onDelete) {
      var btn = el(doc, 'button', 'lbDel', '刪除');
      btn.type = 'button';
      btn.setAttribute('aria-label', '刪除 ' + row.classId + ' ' + row.studentNo + ' 號 ' + row.score + ' 分');
      btn.addEventListener('click', function (ev) {
        ev.preventDefault();
        ev.stopPropagation();
        onDelete(row);
      });
      li.appendChild(btn);
    }
    var placeWord = (row.tied ? '並列第' : '第') + row.rank + '名 ';
    li.setAttribute('aria-label', placeWord + row.classId + ' ' + row.studentNo + '號 ' + row.score + '分');
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
    var entries = (loadResult && loadResult.entries) || [];
    if (highlight) entries = mergeHighlight(entries, highlight);
    var view = present(entries, highlight, TOP_N);
    container.textContent = '';

    if (options.title) {
      container.appendChild(el(doc, 'h3', 'lbTitle', options.title));
    }
    var message = (loadResult && loadResult.message) || '';
    if (!view.rows.length && !message) message = MSG.empty;
    if (message) container.appendChild(el(doc, 'p', 'lbMsg', message));
    container.appendChild(el(doc, 'p', 'lbHint', '每位同學顯示最高分。答對一題得 10 分。分數相同就並列，星星較多的排前。'));
    if (view.note) container.appendChild(el(doc, 'p', 'lbMsg', view.note));
    if (options.onDelete) {
      container.appendChild(el(doc, 'p', 'lbHint', '老師刪除模式。每一行是最高分，刪除只清除這一筆。'));
    }

    if (!view.rows.length) {
      container.appendChild(el(doc, 'div', 'lbEmpty', '暫時未有人上榜。'));
      return;
    }
    var list = el(doc, 'ol', 'lbList');
    view.rows.forEach(function (row) { list.appendChild(paintRow(doc, row, options.onDelete)); });
    container.appendChild(list);
    if (view.pinned) {
      container.appendChild(el(doc, 'p', 'lbHint', '你的名次'));
      var extra = el(doc, 'ol', 'lbList');
      extra.appendChild(paintRow(doc, view.pinned, options.onDelete));
      container.appendChild(extra);
    }
  }

  return {
    TOP_N: TOP_N,
    MSG: MSG,
    validateIdentity: validateIdentity,
    rememberIdentity: rememberIdentity,
    recallIdentity: recallIdentity,
    isConfigured: isConfigured,
    submit: submit,
    load: load,
    verifyTeacherPin: verifyTeacherPin,
    deleteScore: deleteScore,
    present: present,
    bestByStudent: bestByStudent,
    renderInto: renderInto,
    renderLoading: renderLoading,
    readScores: readScores
  };
});
