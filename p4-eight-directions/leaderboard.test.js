/* Node checks for the eight-directions leaderboard. No network. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var lb = require('./leaderboard.js');

var src = fs.readFileSync(path.join(__dirname, 'leaderboard.js'), 'utf8');
assert(src.indexOf("ref('p4EightDirections/scores')") >= 0, 'scores path');
assert(src.indexOf("ref('p4EightDirections/deleteTicket')") >= 0, 'ticket path');
assert(src.indexOf('divisibilityDrop') < 0, 'must not touch divisibilityDrop');
assert(src.indexOf('p1SolidShapes') < 0, 'must not touch p1SolidShapes');
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

lb.submit({ classId: '4a', studentNo: '12', score: 15, stars: 9 }).then(function (sub) {
  assert(sub.ok && sub.source === 'local', 'offline submit');
  assert(sub.entry.score === 10 && sub.entry.stars === 3, 'clamped');
  assert(sub.entry.displayName === '4A12', 'display name');
  return lb.submit({ classId: '4A', studentNo: '12', score: 6, stars: 2 }).then(function () {
    return lb.load();
  }).then(function (loaded) {
    assert(loaded.entries.length === 2, 'keeps every local run');
    var best = lb.present(loaded.entries, null, 10);
    assert(best.rows.length === 1 && best.rows[0].score === 10, 'display best');
    return lb.deleteScore(best.rows[0], '1111').then(function (denied) {
      assert(denied.ok === false, 'wrong local pin');
      return lb.load();
    }).then(function (still) {
      assert(still.entries.length === 2, 'wrong pin deletes nothing');
      return lb.deleteScore(best.rows[0], '8800');
    }).then(function (gone) {
      assert(gone.ok === true, 'local pin deletes one row');
      return lb.load();
    }).then(function (after) {
      assert(after.entries.length === 1 && after.entries[0].score === 6, 'lower run remains');
      console.log('leaderboard.test.js OK');
    });
  });
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
