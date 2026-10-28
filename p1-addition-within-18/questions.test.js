/* Node checks for 18以內加數 round rules. No browser, no network. */
var assert = require('assert');
var api = require('./questions.js');

assert.strictEqual(api.POINTS, 10);
assert.strictEqual(api.ROUND_MS, 90000);
assert.strictEqual(api.MAX_SCORE, 2000);
assert.strictEqual(api.shouldSubmit('student'), true);
assert.strictEqual(api.shouldSubmit('teacher'), false);

var pairs = api.allPairs();
var seen = {};
var i;
assert.strictEqual(pairs.length, 153, 'every ordered pair with sum 2–18');
for (i = 0; i < pairs.length; i++) {
  var pair = pairs[i];
  assert.ok(pair.a >= 1 && pair.b >= 1, 'no zero addend');
  assert.ok(pair.a + pair.b <= 18, 'sum within 18');
  assert.ok(pair.a + pair.b >= 2);
  var key = api.pairKey(pair);
  assert.ok(!seen[key], 'unique ' + key);
  seen[key] = true;
}
assert.ok(seen['9+9'] && seen['7+8'] && seen['8+7'] && seen['1+17'] && seen['17+1']);
assert.ok(!seen['0+5'] && !seen['9+10'] && !seen['10+9'] && !seen['18+1']);

function at(index) {
  return function () { return (index + 0.01) / pairs.length; };
}
var nine = -1;
var seven = -1;
for (i = 0; i < pairs.length; i++) {
  if (pairs[i].a === 9 && pairs[i].b === 9) nine = i;
  if (pairs[i].a === 7 && pairs[i].b === 8) seven = i;
}
var q99 = api.withNextPair(api.blankRound(), at(nine));
assert.strictEqual(q99.pair.a, 9);
assert.strictEqual(q99.pair.b, 9);
assert.strictEqual(api.judge(q99.pair, '18').status, 'correct');
assert.strictEqual(api.judge(q99.pair, '17').status, 'wrong');
var q78 = api.withNextPair(api.blankRound(), at(seven));
assert.strictEqual(q78.pair.a + q78.pair.b, 15);

var prev = '';
for (i = 0; i < 400; i++) {
  var drawn = api.nextPair(prev, Math.random);
  assert.ok(drawn.a >= 1 && drawn.b >= 1 && drawn.a + drawn.b <= 18);
  assert.notStrictEqual(api.pairKey(drawn), prev);
  prev = api.pairKey(drawn);
}

assert.strictEqual(api.formatClock(90000), '1:30');
assert.strictEqual(api.formatClock(89001), '1:30');
assert.strictEqual(api.formatClock(89000), '1:29');
assert.strictEqual(api.formatClock(60000), '1:00');
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
assert.deepStrictEqual({ a: round.pair.a, b: round.pair.b }, { a: 1, b: 1 });
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
round = api.reduce(round, { type: 'digit', digit: '2' });
assert.strictEqual(round.digits, '3', 'locked wrong answer ignores new digits');
round = api.reduce(round, { type: 'unlock-wrong' });
assert.strictEqual(round.digits, '');
assert.strictEqual(round.locked, false);
assert.strictEqual(api.pairKey(round.pair), same, 'retry keeps the same question');
round = api.reduce(round, { type: 'digit', digit: '2' });
round = api.reduce(round, { type: 'submit' });
assert.strictEqual(round.feedback, 'correct');
assert.strictEqual(round.score, 10);
assert.strictEqual(round.correct, 1);
round = api.reduce(round, { type: 'advance' }, function () { return 0; });
assert.strictEqual(round.feedback, 'ask');
assert.strictEqual(round.score, 10);
assert.notStrictEqual(api.pairKey(round.pair), same);
assert.strictEqual(round.digits, '');

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

var sum = String(round.pair.a + round.pair.b);
for (i = 0; i < sum.length; i++) round = api.reduce(round, { type: 'digit', digit: sum.charAt(i) });
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
  var answer = String(cap.pair.a + cap.pair.b);
  for (i = 0; i < answer.length; i++) cap = api.reduce(cap, { type: 'digit', digit: answer.charAt(i) });
  cap = api.reduce(cap, { type: 'submit' });
  assert.strictEqual(cap.feedback, 'correct');
  cap = api.reduce(cap, { type: 'advance' }, Math.random);
}
assert.strictEqual(cap.score, 2000);
assert.strictEqual(cap.correct, 200);

var leading = api.withNextPair(api.blankRound(), at(seven));
leading = api.reduce(leading, { type: 'digit', digit: '0' });
leading = api.reduce(leading, { type: 'digit', digit: '8' });
assert.strictEqual(api.parseAnswer(leading.digits), 8);
leading = api.reduce(leading, { type: 'submit' });
assert.strictEqual(leading.feedback, 'wrong', '08 is eight, not fifteen');

console.log('questions.test.js ok');
