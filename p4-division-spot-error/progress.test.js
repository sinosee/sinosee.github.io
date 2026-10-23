/* Node checks for 除法直式填空 progress. No browser, no network. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var progress = require('./progress.js');

function mem() {
  return progress.createStore(progress.memoryStorage());
}

var chinese = progress.validateIdentity('陳大文', '12');
assert.strictEqual(chinese.ok, false);
assert.strictEqual(chinese.code, 'cjk');
var full = progress.validateIdentity('４Ａ', '12');
assert.strictEqual(full.ok, false);
var empty = progress.validateIdentity('', '');
assert.strictEqual(empty.ok, false);
assert.strictEqual(empty.code, 'empty');
var mixed = progress.validateIdentity('4A', '12號');
assert.strictEqual(mixed.ok, false);
var ok = progress.validateIdentity('4a', '07');
assert.strictEqual(ok.ok, true);
assert.strictEqual(ok.classId, '4A');
assert.strictEqual(ok.studentNo, '07');
assert.strictEqual(ok.displayName, '4A07');

assert.strictEqual(progress.progressKey('4A', '12'), 'p4-division-spot-error-progress-v1:4A:12');
assert.strictEqual(progress.KEYS.teacher, 'p4-division-spot-error-progress-v1:teacher');
assert.strictEqual(progress.KEYS.legacy, 'p4-division-spot-error-progress-v1');
assert.notStrictEqual(progress.progressKey('4A', '12'), progress.KEYS.teacher);

var fresh = progress.levelView(progress.emptyProgress());
assert.strictEqual(fresh.starLevel, 1);
assert.strictEqual(fresh.highestLevel, 1);
assert.strictEqual(fresh.hasProgress, false);
assert.strictEqual(fresh.continueLabel, '開始！');

var towardTwo = progress.levelView({ totalStars: 5, bestStars: { normal: 2, hard: 0 } });
assert.strictEqual(towardTwo.highestLevel, 1);
assert.strictEqual(towardTwo.continueLabel, '繼續：第 2 級');

var clearedTwo = progress.levelView({ totalStars: 8, bestStars: { normal: 3, hard: 1 }, highestLevel: 2 });
assert.strictEqual(clearedTwo.starLevel, 2);
assert.strictEqual(clearedTwo.highestLevel, 2);
assert.strictEqual(clearedTwo.nextLevel, 3);
assert.strictEqual(clearedTwo.continueLabel, '繼續：第 3 級');
assert.strictEqual(clearedTwo.summary, '已解鎖至第 2 級');
assert.strictEqual(clearedTwo.rank.name, '商位學徒');

assert.strictEqual(progress.levelView({ totalStars: 15, bestStars: { normal: 3, hard: 3 } }).continueLabel, '繼續：第 4 級');
assert.strictEqual(progress.levelView({ totalStars: 30, bestStars: { normal: 3, hard: 0 } }).continueLabel, '繼續：第 5 級');
assert.strictEqual(progress.levelView({ totalStars: 50, bestStars: { normal: 3, hard: 3 } }).continueLabel, '繼續：第 5 級');
assert.strictEqual(progress.levelView({ totalStars: 50, bestStars: { normal: 3, hard: 3 } }).nextLevel, null);

var kept = progress.levelView({ totalStars: 0, bestStars: { normal: 0, hard: 0 }, highestLevel: 2 });
assert.strictEqual(kept.highestLevel, 2);
assert.strictEqual(kept.continueLabel, '繼續：第 3 級');

var after = progress.applyRun({ totalStars: 5, bestNormal: 2, bestHard: 1, highestLevel: 1 }, 3, false);
assert.strictEqual(after.totalStars, 8);
assert.strictEqual(after.bestNormal, 3);
assert.strictEqual(after.bestHard, 1);
assert.strictEqual(after.highestLevel, 2);
var hardRun = progress.applyRun(after, 2, true);
assert.strictEqual(hardRun.bestNormal, 3);
assert.strictEqual(hardRun.bestHard, 2);
assert.strictEqual(hardRun.totalStars, 10);
assert.strictEqual(hardRun.highestLevel, 2);

var box = progress.memoryStorage();
box.setItem(progress.KEYS.legacy, JSON.stringify({
  totalStars: 8,
  bestStars: { normal: 3, hard: 1 }
}));
var store = progress.createStore(box);
assert.strictEqual(store.hasUnclaimedLegacy(), true);
var claimed = store.loadStudent('4a', '12');
assert.strictEqual(claimed.totalStars, 8);
assert.strictEqual(claimed.highestLevel, 2);
assert.strictEqual(store.hasUnclaimedLegacy(), false);
var other = store.loadStudent('4B', '3');
assert.strictEqual(other.totalStars, 0);
assert.strictEqual(other.highestLevel, 1);
assert.strictEqual(store.readProgress(progress.progressKey('4A', '12')).totalStars, 8);

store.saveTeacher({ totalStars: 6, bestNormal: 3, bestHard: 0, highestLevel: 2 });
assert.strictEqual(store.loadTeacher().totalStars, 6);
assert.strictEqual(store.loadStudent('4A', '12').totalStars, 8);
assert.strictEqual(store.readProgress(progress.KEYS.teacher).highestLevel, 2);

var again = progress.createStore(box);
assert.deepStrictEqual(again.readIdentity(), null);
again.writeIdentity({ classId: '4a', studentNo: '12' });
assert.deepStrictEqual(again.readIdentity(), { classId: '4A', studentNo: '12', displayName: '4A12' });
var resumed = progress.levelView(again.loadStudent('4A', '12'));
assert.strictEqual(resumed.continueLabel, '繼續：第 3 級');
assert.strictEqual(resumed.highestLevel, 2);

var earned = again.saveStudent({ classId: '4A', studentNo: '12' }, progress.applyRun(again.loadStudent('4A', '12'), 1, false));
assert.strictEqual(earned.totalStars, 9);
assert.strictEqual(earned.highestLevel, 2);
assert.strictEqual(progress.createStore(box).loadStudent('4A', '12').totalStars, 9);

assert.strictEqual(store.saveStudent({ classId: '陳', studentNo: '1' }, { totalStars: 99 }), null);

var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(html.indexOf('src="progress.js"') >= 0, 'page loads progress.js');
assert(html.indexOf('id="gateClass"') >= 0, 'class gate');
assert(html.indexOf('id="gateNo"') >= 0, 'student number gate');
assert(html.indexOf('換學生') >= 0, 'switch student');
assert(html.indexOf('localStorage.setItem') < 0, 'page does not write storage itself');
assert(html.indexOf('不會記入學生進度') >= 0, 'teacher mode is labelled separate');

console.log('progress.test.js ok');
