/* Node checks for 10以內減法 round rules. No browser, no network. */
var assert = require('assert');
var api = require('./questions.js');

assert.strictEqual(api.POINTS, 10);
assert.strictEqual(api.ROUND_MS, 60000);
assert.strictEqual(api.MAX_SCORE, 2000);
assert.strictEqual(api.shouldSubmit('student'), true);
assert.strictEqual(api.shouldSubmit('teacher'), false);

var pairs = api.allPairs();
var seen = {};
var trivial = 0;
var hard = 0;
var easy = 0;
var i;
assert.strictEqual(pairs.length, 65, 'a = 1..10 and b = 0..a');
for (i = 0; i < pairs.length; i++) {
  var pair = pairs[i];
  var diff = pair.a - pair.b;
  assert.ok(pair.a >= 1 && pair.a <= 10, 'minuend 1–10');
  assert.ok(pair.b >= 0 && pair.b <= pair.a, 'subtrahend 0–a');
  assert.ok(diff >= 0 && diff <= 10, 'difference 0–10');
  assert.strictEqual(api.judge(pair, String(diff)).status, 'correct');
  var key = api.pairKey(pair);
  assert.ok(!seen[key], 'unique ' + key);
  seen[key] = true;
  var kind = api.kindOf(pair);
  if (kind === 'trivial') trivial++;
  else if (kind === 'hard') hard++;
  else easy++;
}
assert.strictEqual(trivial, 20);
assert.strictEqual(hard, 20);
assert.strictEqual(easy, 25);
assert.strictEqual(api.kindOf({ a: 8, b: 4 }), 'hard');
assert.strictEqual(api.kindOf({ a: 10, b: 7 }), 'hard');
assert.strictEqual(api.kindOf({ a: 6, b: 5 }), 'hard');
assert.strictEqual(api.kindOf({ a: 10, b: 3 }), 'easy');
assert.strictEqual(api.kindOf({ a: 5, b: 2 }), 'easy');
assert.strictEqual(api.kindOf({ a: 6, b: 1 }), 'easy');
assert.strictEqual(api.kindOf({ a: 9, b: 4 }), 'easy');
assert.strictEqual(api.kindOf({ a: 8, b: 0 }), 'trivial');
assert.strictEqual(api.kindOf({ a: 8, b: 8 }), 'trivial');
assert.strictEqual(api.kindOf({ a: 10, b: 0 }), 'trivial');
assert.ok(seen['8-4'] && seen['10-7'] && seen['5-2'] && seen['10-3']);
assert.ok(seen['10-0'] && seen['8-8'] && seen['1-0']);
assert.ok(!seen['0-0'] && !seen['11-1'] && !seen['5-6'] && !seen['10-11']);

var draw = api.drawList();
var drawTrivial = 0;
for (i = 0; i < draw.length; i++) {
  if (api.isTrivial(draw[i])) drawTrivial++;
}
assert.strictEqual(draw.length, 20 * 4 + 25 * 2 + 20);
assert.ok(drawTrivial / draw.length < 0.15, 'trivial copies do not dominate the deck');
assert.ok(drawTrivial > 0, 'trivial items still exist');

function rollFor(key) {
  var list = api.drawList();
  var idx = -1;
  var n;
  for (n = 0; n < list.length; n++) {
    if (api.pairKey(list[n]) === key) { idx = n; break; }
  }
  assert.ok(idx >= 0, 'deck has ' + key);
  return function () { return (idx + 0.01) / list.length; };
}

var hardPair = api.withNextPair(api.blankRound(), rollFor('8-4'));
assert.strictEqual(hardPair.pair.a, 8);
assert.strictEqual(hardPair.pair.b, 4);
assert.strictEqual(api.judge(hardPair.pair, '4').status, 'correct');
assert.strictEqual(api.judge(hardPair.pair, '3').status, 'wrong');
var tenSeven = api.withNextPair(api.blankRound(), rollFor('10-7'));
assert.strictEqual(api.judge(tenSeven.pair, '3').status, 'correct');
assert.strictEqual(api.judge(tenSeven.pair, '03').status, 'correct');

var zero = api.withNextPair(api.blankRound(), rollFor('8-8'));
zero = api.reduce(zero, { type: 'digit', digit: '0' });
zero = api.reduce(zero, { type: 'submit' });
assert.strictEqual(zero.feedback, 'correct');
assert.strictEqual(zero.score, 10);

var ten = api.withNextPair(api.blankRound(), rollFor('10-0'));
assert.strictEqual(ten.pair.a - ten.pair.b, 10);
ten = api.reduce(ten, { type: 'digit', digit: '1' });
ten = api.reduce(ten, { type: 'digit', digit: '0' });
ten = api.reduce(ten, { type: 'submit' });
assert.strictEqual(ten.feedback, 'correct', 'two-digit difference 10');

var leading = api.withNextPair(api.blankRound(), rollFor('10-7'));
leading = api.reduce(leading, { type: 'digit', digit: '0' });
leading = api.reduce(leading, { type: 'digit', digit: '8' });
assert.strictEqual(api.parseAnswer(leading.digits), 8);
leading = api.reduce(leading, { type: 'submit' });
assert.strictEqual(leading.feedback, 'wrong', '08 is eight, not three');

function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function sample(seed) {
  var rng = mulberry32(seed);
  var prev = '';
  var lastTrivial = false;
  var nTrivial = 0;
  var nHard = 0;
  var nEasy = 0;
  var n;
  for (n = 0; n < 400; n++) {
    var drawn = api.nextPair(prev, rng);
    var diff = drawn.a - drawn.b;
    assert.ok(drawn.a >= 1 && drawn.a <= 10 && drawn.b >= 0 && drawn.b <= drawn.a);
    assert.ok(diff >= 0 && diff <= 10);
    assert.notStrictEqual(api.pairKey(drawn), prev);
    var triv = api.isTrivial(drawn);
    if (lastTrivial) assert.strictEqual(triv, false, 'trivial questions are not consecutive');
    if (triv) nTrivial++;
    else if (api.isHard(drawn)) nHard++;
    else nEasy++;
    lastTrivial = triv;
    prev = api.pairKey(drawn);
  }
  assert.ok(nTrivial > 0 && nTrivial < 80, 'trivial count ' + nTrivial);
  assert.ok(nHard >= 120, 'hard count ' + nHard);
  assert.ok(nEasy >= 40, 'easy count ' + nEasy);
  assert.ok(nTrivial < nHard && nTrivial < nEasy);
}

sample(1);
sample(10);
sample(2026);

assert.strictEqual(api.formatClock(60000), '1:00');
assert.strictEqual(api.formatClock(59001), '1:00');
assert.strictEqual(api.formatClock(59000), '0:59');
assert.strictEqual(api.formatClock(1000), '0:01');
assert.strictEqual(api.formatClock(1), '0:01');
assert.strictEqual(api.formatClock(0), '0:00');
assert.strictEqual(api.formatClock(-20), '0:00');

assert.strictEqual(api.normalizeScore(25), 20);
assert.strictEqual(api.normalizeScore(2001), 2000);
assert.strictEqual(api.normalizeScore(-4), 0);
assert.strictEqual(api.starsFor(0), 0);
assert.strictEqual(api.starsFor(30), 0);
assert.strictEqual(api.starsFor(39), 0);
assert.strictEqual(api.starsFor(40), 1);
assert.strictEqual(api.starsFor(90), 1);
assert.strictEqual(api.starsFor(100), 2);
assert.strictEqual(api.starsFor(190), 2);
assert.strictEqual(api.starsFor(199), 2);
assert.strictEqual(api.starsFor(200), 3);
assert.strictEqual(api.starsFor(2000), 3);

var round = api.withNextPair(api.blankRound(), function () { return 0; });
assert.deepStrictEqual({ a: round.pair.a, b: round.pair.b }, { a: 1, b: 0 });
var same = api.pairKey(round.pair);
round = api.reduce(round, { type: 'submit' });
assert.strictEqual(round.feedback, 'empty');
assert.strictEqual(round.score, 0);
assert.strictEqual(round.locked, false);
round = api.reduce(round, { type: 'digit', digit: '3' });
round = api.reduce(round, { type: 'submit' });
assert.strictEqual(round.feedback, 'wrong');
assert.strictEqual(round.score, 0);
assert.strictEqual(round.locked, true);
assert.strictEqual(api.pairKey(round.pair), same);
assert.strictEqual(round.digits, '3');
round = api.reduce(round, { type: 'digit', digit: '1' });
assert.strictEqual(round.digits, '3', 'locked wrong answer ignores new digits');
round = api.reduce(round, { type: 'unlock-wrong' });
assert.strictEqual(round.digits, '');
assert.strictEqual(round.locked, false);
assert.strictEqual(api.pairKey(round.pair), same, 'retry keeps the same question');
round = api.reduce(round, { type: 'digit', digit: '1' });
round = api.reduce(round, { type: 'submit' });
assert.strictEqual(round.feedback, 'correct');
assert.strictEqual(round.score, 10);
assert.strictEqual(round.correct, 1);
round = api.reduce(round, { type: 'advance' }, function () { return 0; });
assert.strictEqual(round.feedback, 'ask');
assert.strictEqual(round.score, 10);
assert.notStrictEqual(api.pairKey(round.pair), same);
assert.strictEqual(round.digits, '');
assert.strictEqual(api.isTrivial(round.pair), false, 'a trivial item is not followed by another');

round = api.reduce(round, { type: 'digit', digit: '9' });
round = api.reduce(round, { type: 'digit', digit: '9' });
round = api.reduce(round, { type: 'digit', digit: '9' });
assert.strictEqual(round.digits, '99');
assert.strictEqual(round.feedback, 'maxlen');
round = api.reduce(round, { type: 'back' });
assert.strictEqual(round.digits, '9');
round = api.reduce(round, { type: 'clear' });
assert.strictEqual(round.digits, '');
assert.strictEqual(round.feedback, 'ask');

var answer = String(round.pair.a - round.pair.b);
for (i = 0; i < answer.length; i++) round = api.reduce(round, { type: 'digit', digit: answer.charAt(i) });
round = api.reduce(round, { type: 'submit' });
assert.strictEqual(round.feedback, 'correct');
assert.strictEqual(round.score, 20);
round = api.reduce(round, { type: 'timeout' });
assert.strictEqual(round.over, true);
assert.strictEqual(round.score, 20);
var frozen = api.reduce(round, { type: 'digit', digit: '1' });
assert.strictEqual(frozen, round, 'time up ignores further input');

var cap = api.withNextPair(api.blankRound(), Math.random);
var n;
for (n = 0; n < 201; n++) {
  var digits = String(cap.pair.a - cap.pair.b);
  for (i = 0; i < digits.length; i++) cap = api.reduce(cap, { type: 'digit', digit: digits.charAt(i) });
  cap = api.reduce(cap, { type: 'submit' });
  assert.strictEqual(cap.feedback, 'correct');
  cap = api.reduce(cap, { type: 'advance' }, Math.random);
}
assert.strictEqual(cap.score, 2000);
assert.strictEqual(cap.correct, 200);

console.log('questions.test.js ok');
