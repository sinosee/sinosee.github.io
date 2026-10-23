/* Per-student progress for 除法直式填空.
   Offline only (localStorage). No Firebase.

   Keys
     p4-division-spot-error-identity-v1
       last confirmed 班別 + 學號, for prefill. Not a score.
     p4-division-spot-error-progress-v1
       legacy device-wide save from before identities. Claimed once.
     p4-division-spot-error-progress-v1:legacy-owner
       "4A:12" once that legacy save has been handed to one student.
     p4-division-spot-error-progress-v1:4A:12
       that student's stars, best stars, and highest unlocked rank.
     p4-division-spot-error-progress-v1:teacher
       projector / teacher demo. Never written into a student key.

   Rank ladder (第 1 級 … 第 5 級) is the existing star titles.
   Highest unlocked level only moves forward.
*/
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.DivisionProgress = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var GAME_ID = 'p4-division-spot-error';
  var PREFIX = GAME_ID + '-progress-v1';
  var KEYS = {
    prefix: PREFIX,
    identity: GAME_ID + '-identity-v1',
    legacy: PREFIX,
    legacyOwner: PREFIX + ':legacy-owner',
    teacher: PREFIX + ':teacher'
  };
  var RANKS = [
    { min: 0, name: '試商新手', icon: '🌱' },
    { min: 6, name: '商位學徒', icon: '🎓' },
    { min: 15, name: '直式小師傅', icon: '✏️' },
    { min: 30, name: '除法達人', icon: '🌟' },
    { min: 50, name: '除法王者', icon: '👑' }
  ];
  var HAN_RE = /[\u3400-\u9FFF\uF900-\uFAFF\u3040-\u30FF\u31F0-\u31FF\uAC00-\uD7AF]/;
  var CJK_PUNCT_RE = /[\u3000-\u303F]/;
  var FULLWIDTH_RE = /[\uFF00-\uFFEF]/;
  var TOKEN_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,11}$/;

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

  function fail(code, message, fields) {
    return { ok: false, code: code, field: fields[0], fields: fields, message: message };
  }

  function validateIdentity(classRaw, noRaw) {
    var c = analyze(classRaw);
    var n = analyze(noRaw);
    var fields = [];
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

  function progressKey(classId, studentNo) {
    return KEYS.prefix + ':' + classId + ':' + studentNo;
  }

  function toInt(v, min, max) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) n = min;
    if (n < min) n = min;
    if (n > max) n = max;
    return n;
  }

  function rankIndex(totalStars) {
    var total = toInt(totalStars, 0, 100000);
    var idx = 0;
    for (var i = 0; i < RANKS.length; i++) {
      if (total >= RANKS[i].min) idx = i;
    }
    return idx;
  }

  function emptyProgress() {
    return { totalStars: 0, bestNormal: 0, bestHard: 0, highestLevel: 1 };
  }

  function normalizeProgress(data) {
    if (!data || typeof data !== 'object') return emptyProgress();
    var best = data.bestStars && typeof data.bestStars === 'object' ? data.bestStars : {};
    var totalStars = toInt(data.totalStars, 0, 100000);
    var bestNormal = toInt(best.normal != null ? best.normal : data.bestNormal, 0, 3);
    var bestHard = toInt(best.hard != null ? best.hard : data.bestHard, 0, 3);
    var fromStars = rankIndex(totalStars) + 1;
    var stored = data.highestLevel == null ? fromStars : toInt(data.highestLevel, 1, RANKS.length);
    var highest = stored > fromStars ? stored : fromStars;
    return {
      totalStars: totalStars,
      bestNormal: bestNormal,
      bestHard: bestHard,
      highestLevel: highest
    };
  }

  function serializeProgress(progress) {
    var p = normalizeProgress(progress);
    return {
      totalStars: p.totalStars,
      bestStars: { normal: p.bestNormal, hard: p.bestHard },
      highestLevel: p.highestLevel
    };
  }

  function applyRun(before, earned, hard) {
    var b = normalizeProgress(before);
    var stars = toInt(earned, 0, 3);
    return normalizeProgress({
      totalStars: b.totalStars + stars,
      bestNormal: hard ? b.bestNormal : Math.max(b.bestNormal, stars),
      bestHard: hard ? Math.max(b.bestHard, stars) : b.bestHard,
      highestLevel: b.highestLevel
    });
  }

  function levelView(progress) {
    var p = normalizeProgress(progress);
    var starLevel = rankIndex(p.totalStars) + 1;
    var highest = p.highestLevel > starLevel ? p.highestLevel : starLevel;
    var nextLevel = highest < RANKS.length ? highest + 1 : null;
    var hasProgress = p.totalStars > 0 || p.bestNormal > 0 || p.bestHard > 0 || highest > 1;
    var continueLabel = '開始！';
    if (hasProgress) {
      continueLabel = nextLevel ? ('繼續：第 ' + nextLevel + ' 級') : ('繼續：第 ' + highest + ' 級');
    }
    var nextRank = nextLevel ? RANKS[nextLevel - 1] : null;
    var continueDetail = continueLabel;
    if (hasProgress && nextRank) continueDetail = continueLabel + ' · ' + nextRank.name;
    return {
      totalStars: p.totalStars,
      bestNormal: p.bestNormal,
      bestHard: p.bestHard,
      highestLevel: highest,
      starLevel: starLevel,
      nextLevel: nextLevel,
      hasProgress: hasProgress,
      rank: RANKS[starLevel - 1],
      barRank: RANKS[starLevel - 1],
      barNext: starLevel < RANKS.length ? RANKS[starLevel] : null,
      continueLabel: continueLabel,
      continueDetail: continueDetail,
      summary: hasProgress ? ('已解鎖至第 ' + highest + ' 級') : '由第 1 級開始'
    };
  }

  function memoryStorage() {
    var mem = {};
    return {
      getItem: function (key) {
        return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null;
      },
      setItem: function (key, value) { mem[key] = String(value); },
      removeItem: function (key) { delete mem[key]; }
    };
  }

  function defaultStorage() {
    try {
      if (typeof localStorage === 'undefined') return null;
      var probe = GAME_ID + '-probe';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return localStorage;
    } catch (e) {
      return null;
    }
  }

  function createStore(storage) {
    var box = storage || defaultStorage() || memoryStorage();

    function readJson(key) {
      var raw;
      try { raw = box.getItem(key); } catch (e) { return null; }
      if (!raw) return null;
      try { return JSON.parse(raw); } catch (e2) { return null; }
    }

    function writeJson(key, value) {
      try { box.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }

    function readProgress(key) {
      var data = readJson(key);
      if (!data || typeof data !== 'object') return null;
      return normalizeProgress(data);
    }

    function meaningful(p) {
      return !!(p && (p.totalStars > 0 || p.bestNormal > 0 || p.bestHard > 0 || p.highestLevel > 1));
    }

    function hasUnclaimedLegacy() {
      try { if (box.getItem(KEYS.legacyOwner)) return false; } catch (e) { return false; }
      return meaningful(readProgress(KEYS.legacy));
    }

    function loadStudent(classId, studentNo) {
      var idn = validateIdentity(classId, studentNo);
      if (!idn.ok) return emptyProgress();
      var key = progressKey(idn.classId, idn.studentNo);
      var own = readProgress(key);
      if (own) return own;
      var owner = null;
      try { owner = box.getItem(KEYS.legacyOwner); } catch (e) { owner = null; }
      if (owner) return emptyProgress();
      var legacy = readProgress(KEYS.legacy);
      if (!meaningful(legacy)) return emptyProgress();
      var saved = serializeProgress(legacy);
      writeJson(key, saved);
      try { box.setItem(KEYS.legacyOwner, idn.classId + ':' + idn.studentNo); } catch (e2) {}
      return normalizeProgress(saved);
    }

    function saveStudent(identity, progress) {
      var idn = validateIdentity(identity && identity.classId, identity && identity.studentNo);
      if (!idn.ok) return null;
      var saved = serializeProgress(progress);
      writeJson(progressKey(idn.classId, idn.studentNo), saved);
      return normalizeProgress(saved);
    }

    function loadTeacher() {
      return readProgress(KEYS.teacher) || emptyProgress();
    }

    function saveTeacher(progress) {
      var saved = serializeProgress(progress);
      writeJson(KEYS.teacher, saved);
      return normalizeProgress(saved);
    }

    function readIdentity() {
      var data = readJson(KEYS.identity);
      if (!data) return null;
      var idn = validateIdentity(data.classId, data.studentNo);
      if (!idn.ok) return null;
      return { classId: idn.classId, studentNo: idn.studentNo, displayName: idn.displayName };
    }

    function writeIdentity(identity) {
      var idn = validateIdentity(identity && identity.classId, identity && identity.studentNo);
      if (!idn.ok) return null;
      var safe = { classId: idn.classId, studentNo: idn.studentNo };
      writeJson(KEYS.identity, safe);
      return { classId: idn.classId, studentNo: idn.studentNo, displayName: idn.displayName };
    }

    return {
      loadStudent: loadStudent,
      saveStudent: saveStudent,
      loadTeacher: loadTeacher,
      saveTeacher: saveTeacher,
      readIdentity: readIdentity,
      writeIdentity: writeIdentity,
      hasUnclaimedLegacy: hasUnclaimedLegacy,
      readProgress: readProgress
    };
  }

  return {
    GAME_ID: GAME_ID,
    KEYS: KEYS,
    RANKS: RANKS,
    validateIdentity: validateIdentity,
    progressKey: progressKey,
    emptyProgress: emptyProgress,
    normalizeProgress: normalizeProgress,
    serializeProgress: serializeProgress,
    applyRun: applyRun,
    rankIndex: rankIndex,
    levelView: levelView,
    createStore: createStore,
    memoryStorage: memoryStorage
  };
});
