/* Node checks for the eight-directions leaderboard. No network. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var lb = require('./leaderboard.js');

var src = fs.readFileSync(path.join(__dirname, 'leaderboard.js'), 'utf8');
assert(src.indexOf("ref('p4EightDirections/levels/' + levelId + '/scores')") >= 0, 'scores path');
assert(src.indexOf("ref('p4EightDirections/levels/' + levelId + '/deleteTicket')") >= 0, 'ticket path');
assert(src.indexOf("ref('p4EightDirections/scores')") < 0, 'old flat scores path gone');
assert(src.indexOf("ref('p4EightDirections/deleteTicket')") < 0, 'old flat ticket path gone');
assert(src.indexOf('divisibilityDrop') < 0, 'must not touch divisibilityDrop');
assert(src.indexOf('p1SolidShapes') < 0, 'must not touch p1SolidShapes');
assert(lb.LEVELS.length === 2 && lb.LEVELS[0].id === '1' && lb.LEVELS[1].id === '2', 'two levels');
assert(lb.isConfigured() === false, 'no config in node');
assert(lb.isConfigured({
  apiKey: 'YOUR_API_KEY',
  databaseURL: 'https://example.firebaseio.com',
  projectId: 'example'
}) === false, 'placeholder rejected');
assert(lb.isConfigured({
  apiKey: 'AIzaSyExample',
  databaseURL: 'https://sinosee-mathsgame-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'sinosee-mathsgame'
}) === true, 'real-looking config');

var chinese = lb.validateIdentity('陳大文', '12');
assert(chinese.ok === false && chinese.code === 'cjk', 'reject chinese name');
var full = lb.validateIdentity('４Ａ', '12');
assert(full.ok === false, 'reject fullwidth');
var empty = lb.validateIdentity('', '');
assert(empty.ok === false && empty.code === 'empty', 'reject empty');
var badChar = lb.validateIdentity('4A', '12號');
assert(badChar.ok === false, 'reject mixed chinese student no');
var ok = lb.validateIdentity('4a', '07');
assert(ok.ok && ok.classId === '4A' && ok.studentNo === '07' && ok.displayName === '4A07', 'normalize');

assert(lb.starsForRose(0) === 3 && lb.starsForRose(3) === 3, 'rose 3 stars');
assert(lb.starsForRose(4) === 2 && lb.starsForRose(8) === 2, 'rose 2 stars');
assert(lb.starsForRose(9) === 1 && lb.starsForRose(15) === 1, 'rose 1 star');
assert(lb.starsForRose(16) === 0, 'rose 0 stars');

var view = lb.present([
  { id: 'a', classId: '4A', studentNo: '1', score: 8, stars: 1, ts: 1 },
  { id: 'b', classId: '4A', studentNo: '1', score: 10, stars: 1, ts: 2 },
  { id: 'c', classId: '4B', studentNo: '2', score: 10, stars: 3, ts: 1 },
  { id: 'd', classId: '4C', studentNo: '3', score: 7, stars: 3, ts: 1 }
], { classId: '4A', studentNo: '1', score: 8, ts: 9 }, 10);
assert(view.rows.length === 3, 'one row per student');
assert(view.rows[0].classId === '4B' && view.rows[0].rank === 1, 'higher stars first inside a tie');
assert(view.rows[1].classId === '4A' && view.rows[1].rank === 1 && view.rows[1].score === 10, 'same score shares rank');
assert(view.rows[2].rank === 3 && view.rows[2].score === 7, 'next lower score is 3rd');
assert(view.mine && view.mine.score === 10, 'board shows best only');
assert(view.note.indexOf('8') >= 0 && view.note.indexOf('10') >= 0, 'mentions a lower this-round score');

lb.submit({ levelId: 'nope', classId: '4A', studentNo: '1', score: 1, stars: 1 }).then(function (bad) {
  assert(bad.ok === false && bad.reason === 'invalid', 'reject unknown level');
  return lb.submit({ levelId: '1', classId: '4a', studentNo: '12', score: 40, stars: 9 });
}).then(function (rose) {
  assert(rose.ok && rose.source === 'local' && rose.levelId === '1', 'level 1 offline submit');
  assert(rose.entry.score === 28 && rose.entry.stars === 3, 'level 1 clamped to 28');
  assert(rose.entry.displayName === '4A12', 'display name');
  return lb.submit({ levelId: '2', classId: '4A', studentNo: '12', score: 15, stars: 9 });
}).then(function (adv) {
  assert(adv.entry.score === 10 && adv.entry.stars === 3, 'level 2 clamped to 10');
  return lb.submit({ levelId: '2', classId: '4A', studentNo: '12', score: 6, stars: 2 });
}).then(function () {
  return lb.load('1');
}).then(function (level1) {
  assert(level1.entries.length === 1 && level1.entries[0].score === 28, 'level 1 keeps its own row');
  return lb.load('2');
}).then(function (level2) {
  assert(level2.entries.length === 2, 'level 2 keeps every local run');
  var best = lb.present(level2.entries, null, 10);
  assert(best.rows.length === 1 && best.rows[0].score === 10, 'display best on level 2');
  return lb.deleteScore('2', best.rows[0], '1111').then(function (denied) {
    assert(denied.ok === false, 'wrong local pin');
    return lb.load('2');
  }).then(function (still) {
    assert(still.entries.length === 2, 'wrong pin deletes nothing');
    return lb.deleteScore('2', best.rows[0], '8800');
  }).then(function (gone) {
    assert(gone.ok === true, 'local pin deletes one level 2 row');
    return Promise.all([lb.load('2'), lb.load('1')]);
  }).then(function (both) {
    assert(both[0].entries.length === 1 && both[0].entries[0].score === 6, 'lower level 2 run remains');
    assert(both[1].entries.length === 1 && both[1].entries[0].score === 28, 'level 1 untouched');
    console.log('leaderboard.test.js OK');
  });
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
