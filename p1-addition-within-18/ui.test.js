/* Source checks for student-facing copy, keypad, timer, and hub link. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');

var dir = __dirname;
var html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
var game = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
var rules = fs.readFileSync(path.join(dir, 'LEADERBOARD.md'), 'utf8');
var hub = fs.readFileSync(path.join(dir, '..', 'index.html'), 'utf8');

var banned = /[撳唔嘅喺咗嗰嚟俾冇啲喎哋吖㗎囉咩乜睇呢啦]/;
function scan(name, text) {
  var match = banned.exec(text);
  assert.strictEqual(match, null, name + ' has colloquial copy: ' + (match && match[0]));
}
['index.html', 'game.js', 'questions.js', 'leaderboard.js', 'LEADERBOARD.md', 'style.css'].forEach(function (name) {
  scan(name, fs.readFileSync(path.join(dir, name), 'utf8'));
});

assert.ok(html.indexOf('../qr.css') >= 0);
assert.ok(html.indexOf('qrcode.png') >= 0);
assert.ok(html.indexOf('width="112"') >= 0);
assert.ok(html.indexOf('type="range"') < 0);
assert.ok(html.indexOf('18以內加數') >= 0);
assert.ok(html.indexOf('1:30') >= 0, 'countdown starts at 1:30');
assert.ok(html.indexOf('1 分 30 秒') >= 0, 'copy says 90 seconds');
assert.ok(html.indexOf('2:00') < 0 && html.indexOf('兩分鐘') < 0, 'old two-minute copy is gone');
assert.ok(rules.indexOf('1 分 30 秒') >= 0 && rules.indexOf('兩分鐘') < 0 && rules.indexOf('2 分鐘') < 0);
assert.ok(html.indexOf('../assets/mascot.jpg') >= 0);
assert.ok(html.indexOf('老師投影') >= 0);
assert.ok(html.indexOf('班別') >= 0 && html.indexOf('學號') >= 0);
var d;
for (d = 0; d <= 9; d++) assert.ok(html.indexOf('data-key="' + d + '"') >= 0, 'key ' + d);
assert.ok(html.indexOf('data-key="clear"') >= 0);
assert.ok(html.indexOf('data-key="back"') >= 0);
assert.ok(html.indexOf('data-key="ok"') >= 0);
assert.ok(html.indexOf('>確定<') >= 0);
assert.ok(html.indexOf('>清除<') >= 0);
assert.ok(fs.existsSync(path.join(dir, 'qrcode.png')));

assert.ok(game.indexOf('shouldSubmit') >= 0);
assert.ok(game.indexOf('老師投影模式，本局不會上榜。') >= 0);
assert.ok(game.indexOf("type: 'unlock-wrong'") >= 0);
assert.ok(game.indexOf("type: 'advance'") >= 0);
assert.ok(game.indexOf("type: 'submit'") >= 0);
assert.ok(game.indexOf("type: 'timeout'") >= 0);
assert.ok(game.indexOf('Backspace') >= 0);
assert.ok(game.indexOf('Enter') >= 0);

assert.ok(rules.indexOf('p1AdditionWithin18') >= 0);
assert.ok(rules.indexOf('teacherPin') >= 0);
assert.ok(rules.indexOf('deleteTicket') >= 0);
assert.ok(hub.indexOf('href="p1-addition-within-18/"') >= 0);
assert.ok(hub.indexOf('18以內加數') >= 0);

console.log('ui.test.js ok');
