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
assert.ok(html.indexOf('18以內減數') >= 0);
assert.ok(html.indexOf('18以內加數') < 0);
assert.ok(html.indexOf('1:00') >= 0, 'countdown starts at 1:00');
assert.ok(html.indexOf('1 分鐘') >= 0, 'copy says one minute');
assert.ok(html.indexOf('1:30') < 0 && html.indexOf('1 分 30 秒') < 0, 'old 90-second copy is gone');
assert.ok(html.indexOf('2:00') < 0 && html.indexOf('兩分鐘') < 0, 'old two-minute copy is gone');
assert.ok(rules.indexOf('1 分鐘') >= 0 && rules.indexOf('1 分 30 秒') < 0 && rules.indexOf('兩分鐘') < 0 && rules.indexOf('2 分鐘') < 0);
assert.ok(html.indexOf('被減數由 1 至 18') >= 0);
assert.ok(html.indexOf('拿走') >= 0);
assert.ok(html.indexOf('\u2212') >= 0, 'equation uses a minus sign');
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
assert.ok(game.indexOf('這個減法還沒有答對') >= 0);
assert.ok(game.indexOf("$('btnOpenBoard').hidden = teacher") >= 0);
assert.ok(game.indexOf("$('btnEndBoard').hidden = true") >= 0);
assert.ok(game.indexOf('if (!api().shouldSubmit(state.mode)) return;') >= 0);
assert.ok(game.indexOf("type: 'unlock-wrong'") >= 0);
assert.ok(game.indexOf("type: 'advance'") >= 0);
assert.ok(game.indexOf("type: 'submit'") >= 0);
assert.ok(game.indexOf("type: 'timeout'") >= 0);
assert.ok(game.indexOf('Backspace') >= 0);
assert.ok(game.indexOf('Enter') >= 0);
assert.ok(game.indexOf('SubtractionWithin18') >= 0);
assert.ok(game.indexOf('SubtractionLeaderboard') >= 0);
assert.ok(game.indexOf('AdditionLeaderboard') < 0);

assert.ok(rules.indexOf('p1SubtractionWithin18') >= 0);
assert.ok(rules.indexOf('p1AdditionWithin18') >= 0, 'tells the teacher not to overwrite addition');
assert.ok(rules.indexOf('teacherPin') >= 0);
assert.ok(rules.indexOf('deleteTicket') >= 0);
assert.ok(rules.indexOf('13−5') >= 0 || rules.indexOf('13-5') >= 0);

var kept = [
  'href="p1-cm-estimate/"',
  'href="p1-cm-estimate-no-strip/"',
  'href="p1-number-bonds/"',
  'href="p1-number-bonds-14-18/"',
  'href="p1-number-bonds-2-18/"',
  'href="p1-addition-within-18/"',
  'href="p1-solid-shapes/"',
  'href="p4-division-spot-error/"',
  'href="p4-division-missing/"',
  'href="divisibility-drop/"',
  'href="p4-shape-compose/"',
  'href="p4-eight-directions/"',
  'href="p1-letter-typing/"'
];
kept.forEach(function (href) {
  assert.ok(hub.indexOf(href) >= 0, 'kept ' + href);
});
assert.ok(hub.indexOf('教學小遊戲') >= 0);
assert.ok(hub.indexOf('18以內加數') >= 0);
assert.ok(hub.indexOf('唔使登入') < 0);
var addLink = hub.indexOf('href="p1-addition-within-18/"');
var topic = hub.indexOf('減數');
var subLink = hub.indexOf('href="p1-subtraction-within-18/"');
assert.ok(addLink >= 0 && topic > addLink && subLink > topic, '減數 is its own topic after 加數 link');
var block = hub.slice(subLink, hub.indexOf('</a>', subLink));
assert.ok(block.indexOf('18以內減數') >= 0);
assert.ok(block.indexOf('class="sub"') < 0, 'hub card has no introduction');

console.log('ui.test.js ok');
