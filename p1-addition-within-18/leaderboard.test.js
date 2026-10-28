/* Node checks for the 18以內加數 leaderboard. No network. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var lb = require('./leaderboard.js');

var src = fs.readFileSync(path.join(__dirname, 'leaderboard.js'), 'utf8');
assert.ok(src.indexOf("ref('p1AdditionWithin18/scores')") >= 0, 'scores path');
assert.ok(src.indexOf("ref('p1AdditionWithin18/deleteTicket')") >= 0, 'ticket path');
assert.ok(src.indexOf('divisibilityDrop') < 0, 'must not touch divisibilityDrop');
assert.ok(src.indexOf('p1SolidShapes') < 0, 'must not touch p1SolidShapes');
assert.ok(src.indexOf('p4EightDirections') < 0, 'must not touch p4EightDirections');
assert.strictEqual(lb.isConfigured(), false);
assert.strictEqual(lb.isConfigured({
  apiKey: 'YOUR_API_KEY',
  databaseURL: 'https://example.firebaseio.com',
  projectId: 'example'
}), false);
assert.strictEqual(lb.isConfigured({
  apiKey: 'AIzaSyExample',
  databaseURL: 'https://sinosee-mathsgame-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'sinosee-mathsgame'
}), true);

var chinese = lb.validateIdentity('陳大文', '12');
assert.strictEqual(chinese.ok, false);
assert.strictEqual(chinese.code, 'cjk');
assert.strictEqual(lb.validateIdentity('４Ａ', '12').ok, false);
assert.strictEqual(lb.validateIdentity('', '').code, 'empty');
assert.strictEqual(lb.validateIdentity('1A', '12號').ok, false);
var ok = lb.validateIdentity('1a', '07');
assert.strictEqual(ok.ok, true);
assert.strictEqual(ok.classId, '1A');
assert.strictEqual(ok.studentNo, '07');
assert.strictEqual(ok.displayName, '1A07');

function main() {
  return lb.submit({ classId: '陳大文', studentNo: '1', score: 10, stars: 1 }).then(function (bad) {
    assert.strictEqual(bad.ok, false);
    return lb.submit({ classId: '1a', studentNo: '12', score: 25, stars: 9 });
  }).then(function (first) {
    assert.strictEqual(first.ok, true);
    assert.strictEqual(first.source, 'local');
    assert.strictEqual(first.entry.score, 20);
    assert.strictEqual(first.entry.stars, 3);
    assert.strictEqual(first.entry.displayName, '1A12');
    return lb.submit({ classId: '1A', studentNo: '12', score: 2005, stars: 1 });
  }).then(function (capped) {
    assert.strictEqual(capped.entry.score, 2000);
    assert.strictEqual(capped.entry.stars, 1);
    return lb.submit({ classId: '1B', studentNo: '3', score: 40, stars: 1 });
  }).then(function () {
    return lb.load();
  }).then(function (loaded) {
    assert.strictEqual(loaded.source, 'local');
    var view = lb.present(loaded.entries, { classId: '1A', studentNo: '12', score: 20, ts: 1 }, 10);
    assert.strictEqual(view.rows.length, 2);
    assert.strictEqual(view.rows[0].classId, '1A');
    assert.strictEqual(view.rows[0].score, 2000);
    assert.strictEqual(view.rows[0].rank, 1);
    assert.strictEqual(view.rows[1].rank, 2);
    assert.strictEqual(view.mine.score, 2000);
    return lb.deleteScore(view.rows[1], '1111').then(function (denied) {
      assert.strictEqual(denied.ok, false);
      return lb.load();
    }).then(function (still) {
      assert.ok(still.entries.length >= 3);
      var again = lb.present(still.entries, null, 10);
      var target = null;
      var r;
      for (r = 0; r < again.rows.length; r++) {
        if (again.rows[r].classId === '1B') target = again.rows[r];
      }
      assert.ok(target, '1B still listed');
      return lb.deleteScore(target, '8800').then(function (gone) {
        assert.strictEqual(gone.ok, true);
        return lb.load();
      }).then(function (after) {
        var left = lb.present(after.entries, null, 10);
        var j;
        for (j = 0; j < left.rows.length; j++) {
          assert.notStrictEqual(left.rows[j].classId, '1B');
        }
      });
    });
  });
}

main().then(function () {
  console.log('leaderboard.test.js ok');
}).catch(function (err) {
  console.error(err);
  process.exit(1);
});
