/* Node checks for lesson 2 rules. No browser, no network.
   Ebook: 小學數學新思維 1上A 單元三 第7課 立體圖形（二） pp.88–90. */
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var lesson = require('./lesson2.js');
var shapes = require('./shapes.js');

var dir = __dirname;
var lessonSrc = fs.readFileSync(path.join(dir, 'lesson2.js'), 'utf8');
var gameSrc = fs.readFileSync(path.join(dir, 'game.js'), 'utf8');
var boardSrc = fs.readFileSync(path.join(dir, 'leaderboard.js'), 'utf8');
var html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');

assert.strictEqual(lesson.TOTAL, 10);
assert.deepStrictEqual(lesson.RULES.stackYes, ['prism', 'cylinder']);
assert.deepStrictEqual(lesson.RULES.stackNo, ['sphere', 'cone', 'pyramid']);
assert.deepStrictEqual(lesson.RULES.rollYes, ['sphere', 'cylinder', 'cone']);
assert.deepStrictEqual(lesson.RULES.rollNo, ['prism', 'pyramid']);
assert.deepStrictEqual(lesson.RULES.both, ['cylinder']);

var items = lesson.makeRound();
assert.strictEqual(items.length, 10);
var ids = {};
items.forEach(function (item) {
  assert(!ids[item.id], 'duplicate ' + item.id);
  ids[item.id] = item;
});

['stack-prism', 'stack-sphere', 'stack-cone', 'stack-cylinder', 'stack-pyramid',
  'roll-sphere', 'roll-prism', 'roll-cone', 'both-cylinder', 'sort-roll'].forEach(function (id) {
  assert(ids[id], 'missing ' + id);
});

items.forEach(function (item) {
  if (item.kind === 'watch' && item.topic === 'stack') {
    var yes = lesson.RULES.stackYes.indexOf(item.shape) >= 0;
    assert.strictEqual(item.answer, yes ? 'yes' : 'no', item.id);
    assert.strictEqual(lesson.grade(item, item.answer), true, item.id);
    assert.strictEqual(lesson.grade(item, item.answer === 'yes' ? 'no' : 'yes'), false, item.id);
  }
  if (item.kind === 'watch' && item.topic === 'roll') {
    var roll = lesson.RULES.rollYes.indexOf(item.shape) >= 0;
    assert.strictEqual(item.answer, roll ? 'yes' : 'no', item.id);
  }
});

assert.strictEqual(ids['stack-pyramid'].answer, 'no');
assert.strictEqual(ids['stack-cone'].answer, 'no');
assert.strictEqual(ids['stack-cone'].motion, 'stack-tips');
assert.strictEqual(ids['stack-prism'].answer, 'yes');
assert.strictEqual(ids['stack-cylinder'].answer, 'yes');
assert.strictEqual(ids['roll-prism'].answer, 'no');
assert.strictEqual(ids['roll-sphere'].answer, 'yes');
assert.strictEqual(ids['roll-cone'].answer, 'yes');
assert(ids['roll-sphere'].prompt.indexOf('斜板') >= 0);
assert(ids['stack-cone'].prompt.indexOf('尖對尖') >= 0);
assert(ids['stack-prism'].why.indexOf('長方體') >= 0);

assert.strictEqual(ids['both-cylinder'].answer, 'cylinder');
assert.strictEqual(lesson.grade(ids['both-cylinder'], 'cylinder'), true);
assert.strictEqual(lesson.grade(ids['both-cylinder'], 'prism'), false);
assert.strictEqual(lesson.grade(ids['both-cylinder'], 'cone'), false);
assert.strictEqual(lesson.grade(ids['both-cylinder'], 'pyramid'), false);
var bothIds = ids['both-cylinder'].choices.map(function (c) { return c.id; }).sort();
assert.deepStrictEqual(bothIds, ['cone', 'cylinder', 'prism', 'pyramid', 'sphere']);

var sortMap = {};
ids['sort-roll'].pieces.forEach(function (p) {
  var roll = lesson.RULES.rollYes.indexOf(p.id) >= 0;
  assert.strictEqual(p.bin, roll ? 'roll' : 'stay', p.id);
  sortMap[p.id] = p.bin;
});
assert.strictEqual(lesson.grade(ids['sort-roll'], sortMap), true);
sortMap = Object.assign({}, sortMap, { prism: 'roll' });
assert.strictEqual(lesson.grade(ids['sort-roll'], sortMap), false);

assert(lessonSrc.indexOf('尖對尖') >= 0);
assert(lessonSrc.indexOf('斜板') >= 0);
assert(lessonSrc.indexOf('只有圓柱') >= 0);
assert(lessonSrc.indexOf('兩件角錐不能疊穩') >= 0);
assert(lessonSrc.indexOf('SolidLeaderboard') < 0, 'lesson 2 must not touch the leaderboard');
assert(lessonSrc.indexOf('p1SolidShapes/scores') < 0);
assert(lessonSrc.indexOf('gateClass') < 0, 'lesson 2 must not ask for class');
assert(lessonSrc.indexOf('學號') < 0, 'lesson 2 must not ask for a student number');
assert(lessonSrc.indexOf('p1SolidShapes.lesson2.best.v1') >= 0);
assert(lessonSrc.indexOf('isTeacher') >= 0, 'lesson 2 follows projector mode');
assert(lessonSrc.indexOf('老師投影模式，本局不會上榜。') >= 0);
assert(lessonSrc.indexOf('角錐底朝下') < 0, 'old pyramid-can-stack wording');

assert(gameSrc.indexOf('board.submit') >= 0, 'lesson 1 still submits');
assert(gameSrc.indexOf('p1SolidShapes.best.v1') >= 0);
assert(gameSrc.indexOf('function isTeacher()') >= 0);
assert(gameSrc.indexOf("if (isTeacher() || !window.SolidLeaderboard) { startRound(); return; }") >= 0);
assert(gameSrc.indexOf("openGate('home')") >= 0, 'student start still opens the gate');
var publishSrc = gameSrc.slice(gameSrc.indexOf('function publishResult'), gameSrc.indexOf('function openGate'));
assert(publishSrc.indexOf('isTeacher()') >= 0);
assert(publishSrc.indexOf('return') < publishSrc.indexOf('board.submit'), 'projector mode returns before submit');
assert(gameSrc.indexOf('老師投影模式，本局不會上榜。') >= 0);
assert(boardSrc.indexOf('p1SolidShapes/scores') >= 0);
assert(boardSrc.indexOf('p1SolidShapes/deleteTicket') >= 0);

assert(html.indexOf('id="btnStart"') >= 0);
assert(html.indexOf('id="btnOpenBoard"') >= 0);
assert(html.indexOf('id="modeStudent"') >= 0);
assert(html.indexOf('id="modeTeacher"') >= 0);
assert(html.indexOf('老師投影') >= 0);
assert(html.indexOf('id="gateClass"') >= 0);
assert(html.indexOf('id="gateNo"') >= 0);
assert(html.indexOf('id="btnStart2"') >= 0);
assert(html.indexOf('第二課') >= 0);
assert(html.indexOf('疊起和滾動') >= 0);
assert(html.indexOf('class="qr"') >= 0);
assert(html.indexOf('lesson2.js') >= 0);
assert(html.indexOf('href="../#maths"') < 0, 'no hub return on this home');
assert(html.indexOf('id="play"') >= 0 && html.indexOf('id="endBoard"') >= 0);

assert.strictEqual(lesson.rollStyle('sphere'), 'ball');
assert.strictEqual(lesson.rollStyle('cylinderSide'), 'side');
assert.strictEqual(lesson.rollStyle('cylinderUp'), 'side');
assert.strictEqual(lesson.rollStyle('coneSide'), 'side');
assert.strictEqual(lesson.rollStyle('coneUp'), 'side');
assert.strictEqual(lesson.rollStyle('prism'), 'none');
assert.strictEqual(lesson.rollStyle('pyramid'), 'none');

var css = fs.readFileSync(path.join(dir, 'style.css'), 'utf8');
assert(css.indexOf('.roll-yes .roller.rollBall svg') >= 0);
assert(css.indexOf('.demo.goes .miniRoller.rollBall svg') >= 0);
assert(!/\.roll-yes \.roller svg\s*\{[^}]*spinRoll/.test(css), 'side rollers must not tumble');
assert(!/\.demo\.goes \.miniRoller svg\s*\{[^}]*spinRoll/.test(css), 'mini side rollers must not tumble');
assert(lessonSrc.indexOf('rollSide') >= 0);
assert(lessonSrc.indexOf('spec.roll') >= 0);
var shapeCardCss = css.slice(css.indexOf('.shapeCard {'), css.indexOf('.shapeCard {') + 220);
assert(shapeCardCss.indexOf('#ff8ec8') < 0, 'shape card is not a pink frame');
assert(shapeCardCss.indexOf('transparent') >= 0);
var tokenCss = css.slice(css.indexOf('.token {'), css.indexOf('.token {') + 360);
assert(tokenCss.indexOf('#ffe0f0') < 0, 'tokens are not pink cards');
assert(tokenCss.indexOf('transparent') >= 0);

function bodyD(svg) {
  var m = svg.match(/class="body" d="([^"]+)"/);
  return m ? m[1] : '';
}
function bands(svg) {
  var out = [];
  var re = /class="rollBand" d="([^"]+)"/g;
  var m;
  while ((m = re.exec(svg))) out.push(m[1]);
  return out.join('|');
}

Object.keys(lesson.POSES).forEach(function (key) {
  var svg = shapes.renderSvg(lesson.POSES[key], 't' + key);
  assert(svg.indexOf('<svg') >= 0, key + ' renders');
  assert(svg.length > 80, key + ' svg too small');
  var rx = parseFloat((svg.match(/class="shadow"[^>]*rx="([0-9.]+)"/) || [])[1]);
  var vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  assert(rx > 0 && rx < 3, key + ' shadow rx ' + rx);
  assert(rx < vb[2] * 0.6, key + ' shadow fills the frame rx=' + rx + ' vb=' + vb[2]);
  assert(svg.indexOf('rx="18') < 0, key + ' old pink-frame shadow');
});

['cylinderSide', 'coneSide'].forEach(function (key) {
  var pose = lesson.POSES[key];
  var body0 = null;
  var seen = {};
  var visible = 0;
  for (var i = 0; i < 8; i++) {
    var spec = JSON.parse(JSON.stringify(pose));
    spec.roll = i * Math.PI / 4;
    var svg = shapes.renderSvg(spec, 'rb' + key + i);
    var b = bodyD(svg);
    assert(b.length > 20, key + ' body');
    if (body0 == null) body0 = b;
    assert.strictEqual(b, body0, key + ' silhouette must stay side-on while rolling');
    var band = bands(svg);
    if (band) {
      visible += 1;
      seen[band] = true;
    }
  }
  assert(visible >= 4, key + ' stripe stays visible, saw ' + visible);
  assert(Object.keys(seen).length >= 3, key + ' stripe moves around the axis');
});

var round = lesson.makeRound();
round[0].answer = 'changed';
assert.notStrictEqual(lesson.makeRound()[0].answer, 'changed');

console.log('lesson2.test.js ok');
