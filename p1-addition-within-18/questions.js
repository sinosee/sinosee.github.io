/* 18以內加數 — pure round rules.
   Addends are integers >= 1 and the sum is at most 18.
   A wrong answer stays on the same pair. A correct answer scores 10.
   The round lasts ROUND_MS (2 minutes) and then stops. */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AdditionWithin18 = api;
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : null), function () {
  'use strict';

  var POINTS = 10;
  var MAX_SCORE = 2000;
  var ROUND_MS = 120000;
  var PAIRS = buildPairs();

  function buildPairs() {
    var list = [];
    var a, b;
    for (a = 1; a <= 17; a++) {
      for (b = 1; b <= 18 - a; b++) list.push({ a: a, b: b });
    }
    return list;
  }

  function pairKey(pair) {
    return pair.a + '+' + pair.b;
  }

  function allPairs() {
    return PAIRS;
  }

  function nextPair(prevKey, rng) {
    var roll = typeof rng === 'function' ? rng() : Math.random();
    if (!(roll >= 0) || roll >= 1) roll = 0;
    var list = PAIRS;
    if (prevKey) {
      var filtered = [];
      var i;
      for (i = 0; i < PAIRS.length; i++) {
        if (pairKey(PAIRS[i]) !== prevKey) filtered.push(PAIRS[i]);
      }
      if (filtered.length) list = filtered;
    }
    var idx = Math.floor(roll * list.length);
    if (idx < 0) idx = 0;
    if (idx >= list.length) idx = list.length - 1;
    return list[idx];
  }

  function blankRound() {
    return {
      pair: PAIRS[0],
      prevKey: '',
      digits: '',
      score: 0,
      correct: 0,
      locked: false,
      over: false,
      feedback: 'ask'
    };
  }

  function copyRound(round, patch) {
    var next = {
      pair: round.pair,
      prevKey: round.prevKey,
      digits: round.digits,
      score: round.score,
      correct: round.correct,
      locked: round.locked,
      over: round.over,
      feedback: round.feedback
    };
    if (patch) {
      var k;
      for (k in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) next[k] = patch[k];
      }
    }
    return next;
  }

  function withNextPair(round, rng) {
    var pair = nextPair(round.prevKey, rng);
    return copyRound(round, {
      pair: pair,
      prevKey: pairKey(pair),
      digits: '',
      locked: false,
      over: false,
      feedback: 'ask'
    });
  }

  function appendDigit(current, digit) {
    var d = String(digit == null ? '' : digit);
    var cur = String(current || '');
    if (!/^[0-9]$/.test(d)) return cur;
    if (cur.length >= 2) return cur;
    return cur + d;
  }

  function backspace(current) {
    var cur = String(current || '');
    return cur.slice(0, -1);
  }

  function parseAnswer(text) {
    var s = String(text == null ? '' : text).replace(/\s+/g, '');
    if (!/^[0-9]{1,2}$/.test(s)) return null;
    return parseInt(s, 10);
  }

  function judge(pair, digits) {
    if (!pair) return { status: 'empty' };
    var n = parseAnswer(digits);
    if (n === null) return { status: 'empty' };
    if (n === pair.a + pair.b) return { status: 'correct' };
    return { status: 'wrong' };
  }

  function normalizeScore(n) {
    n = Math.round(Number(n));
    if (!isFinite(n) || n < 0) return 0;
    if (n > MAX_SCORE) n = MAX_SCORE;
    return n - (n % POINTS);
  }

  function starsFor(score) {
    score = normalizeScore(score);
    if (score >= 200) return 3;
    if (score >= 100) return 2;
    if (score >= 40) return 1;
    return 0;
  }

  function formatClock(ms) {
    var left = Number(ms);
    if (!isFinite(left) || left <= 0) return '0:00';
    var sec = Math.ceil(left / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function shouldSubmit(mode) {
    return mode !== 'teacher';
  }

  function reduce(round, action, rng) {
    action = action || {};
    if (action.type === 'timeout') {
      if (round.over) return round;
      return copyRound(round, { over: true, locked: true, feedback: 'done' });
    }
    if (round.over) return round;
    if (action.type === 'advance') {
      if (round.feedback !== 'correct') return round;
      return withNextPair(round, rng);
    }
    if (action.type === 'unlock-wrong') {
      if (round.feedback !== 'wrong') return round;
      return copyRound(round, { locked: false, digits: '', feedback: 'ask' });
    }
    if (round.locked) return round;
    if (action.type === 'digit') {
      var digits = appendDigit(round.digits, action.digit);
      if (digits === round.digits) {
        if (!/^[0-9]$/.test(String(action.digit == null ? '' : action.digit))) return round;
        if (round.feedback === 'maxlen') return round;
        return copyRound(round, { feedback: 'maxlen' });
      }
      return copyRound(round, { digits: digits, feedback: 'typing' });
    }
    if (action.type === 'back') {
      var cut = backspace(round.digits);
      if (cut === round.digits) return round;
      return copyRound(round, { digits: cut, feedback: cut ? 'typing' : 'ask' });
    }
    if (action.type === 'clear') {
      if (!round.digits && round.feedback === 'ask') return round;
      return copyRound(round, { digits: '', feedback: 'ask' });
    }
    if (action.type === 'submit') {
      var judged = judge(round.pair, round.digits);
      if (judged.status === 'empty') {
        if (round.feedback === 'empty') return round;
        return copyRound(round, { feedback: 'empty' });
      }
      if (judged.status === 'wrong') {
        return copyRound(round, { locked: true, feedback: 'wrong' });
      }
      if (round.score >= MAX_SCORE) {
        return copyRound(round, { locked: true, feedback: 'correct' });
      }
      return copyRound(round, {
        locked: true,
        feedback: 'correct',
        score: round.score + POINTS,
        correct: round.correct + 1
      });
    }
    return round;
  }

  return {
    POINTS: POINTS,
    MAX_SCORE: MAX_SCORE,
    ROUND_MS: ROUND_MS,
    allPairs: allPairs,
    pairKey: pairKey,
    nextPair: nextPair,
    blankRound: blankRound,
    withNextPair: withNextPair,
    appendDigit: appendDigit,
    parseAnswer: parseAnswer,
    judge: judge,
    normalizeScore: normalizeScore,
    starsFor: starsFor,
    formatClock: formatClock,
    shouldSubmit: shouldSubmit,
    reduce: reduce
  };
});
