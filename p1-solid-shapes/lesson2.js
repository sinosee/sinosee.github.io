/* Lesson 2 — 小學數學新思維 1上A 單元三 第7課 立體圖形（二） pp.88–90
   能疊穩（兩個相同圖形疊）: 角柱 ✓、圓柱 ✓。球 ✗、圓錐（尖對尖）✗、角錐 ✗。
   能滾動（斜板）: 球 ✓、圓柱 ✓、圓錐 ✓。角柱 ✗、角錐 ✗。
   又能疊穩又能滾動: 只有圓柱。
   正方體／長方體都係角柱。
   Stars stay in localStorage (p1SolidShapes.lesson2.best.v1) and never write the lesson-1 board.
*/
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SolidLesson2 = api;
  if (root && root.document) {
    root.document.addEventListener('DOMContentLoaded', function () { mount(api); });
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var TOTAL = 10;
  var RULES = {
    source: '小學數學新思維 1上A 單元三 第7課 pp.88-90',
    stackYes: ['prism', 'cylinder'],
    stackNo: ['sphere', 'cone', 'pyramid'],
    rollYes: ['sphere', 'cylinder', 'cone'],
    rollNo: ['prism', 'pyramid'],
    both: ['cylinder']
  };

  var POSES = {
    prism: { shape: 'prism', base: 'box', w: 1.15, h: 1.15, d: 1.15, pitch: 0.62, modelYaw: 0.55, yaw: 0.62, palette: 'gold', scale: 1 },
    cylinderUp: { shape: 'cylinder', axis: 'y', radius: 0.66, height: 1.2, pitch: 0.56, yaw: 0.35, spin: 0, palette: 'sky', scale: 1 },
    cylinderSide: { shape: 'cylinder', axis: 'x', radius: 0.55, height: 1.75, pitch: 0.36, yaw: 0.18, spin: 0, palette: 'sky', scale: 1 },
    pyramid: { shape: 'pyramid', base: 'pyramid', sides: 4, radius: 0.95, height: 1.35, pitch: 0.56, modelYaw: 0.2, yaw: 0.7, palette: 'pink', scale: 1 },
    coneUp: { shape: 'cone', axis: 'y', radius: 0.78, height: 1.42, pitch: 0.48, yaw: 0.3, spin: 0, palette: 'mint', scale: 1 },
    coneDown: { shape: 'cone', axis: 'y', radius: 0.78, height: 1.42, pitch: 0.48, yaw: 0.3, spin: Math.PI, palette: 'mint', scale: 1 },
    coneSide: { shape: 'cone', axis: 'x', radius: 0.62, height: 1.7, pitch: 0.32, yaw: 0.15, spin: 0, palette: 'mint', scale: 1 },
    sphere: { shape: 'sphere', scale: 1, yaw: 0.8, palette: 'lilac' }
  };

  var TAG_COLOR = {
    prism: '#ffd15c',
    sphere: '#c9b6ff',
    cone: '#7ddeb3',
    cylinder: '#7ecbff',
    pyramid: '#ff8ec8'
  };

  var STACK_CHOICES = [
    { id: 'yes', label: '✓ 能疊穩', cls: 'yes' },
    { id: 'no', label: '✗ 唔能疊穩', cls: 'no' }
  ];
  var ROLL_CHOICES = [
    { id: 'yes', label: '✓ 能滾動', cls: 'yes' },
    { id: 'no', label: '✗ 唔能滾動', cls: 'no' }
  ];
  var WATCH_HINT = '睇完動畫，再撳 ✓ 或者 ✗。';

  var ITEMS = [
    {
      id: 'stack-prism', kind: 'watch', topic: 'stack', shape: 'prism', motion: 'stack-yes', pose: 'prism',
      tag: '角柱',
      prompt: '兩件正方體疊起。正方體都係角柱。可唔可以疊穩？',
      answer: 'yes', choices: STACK_CHOICES, hint: WATCH_HINT,
      why: '兩件角柱能疊穩。正方體、長方體都係角柱。'
    },
    {
      id: 'stack-sphere', kind: 'watch', topic: 'stack', shape: 'sphere', motion: 'stack-sphere', pose: 'sphere',
      tag: '球',
      prompt: '睇住兩件球。佢哋可唔可以疊穩？',
      answer: 'no', choices: STACK_CHOICES, hint: WATCH_HINT,
      why: '兩件球唔能疊穩。'
    },
    {
      id: 'stack-cone', kind: 'watch', topic: 'stack', shape: 'cone', motion: 'stack-tips',
      lower: 'coneUp', upper: 'coneDown',
      tag: '圓錐尖對尖',
      prompt: '睇住兩件圓錐尖對尖。佢哋可唔可以疊穩？',
      answer: 'no', choices: STACK_CHOICES, hint: WATCH_HINT,
      why: '兩件圓錐尖對尖，唔能疊穩。'
    },
    {
      id: 'stack-cylinder', kind: 'watch', topic: 'stack', shape: 'cylinder', motion: 'stack-yes', pose: 'cylinderUp',
      tag: '圓柱',
      prompt: '睇住兩件圓柱疊起。佢哋可唔可以疊穩？',
      answer: 'yes', choices: STACK_CHOICES, hint: WATCH_HINT,
      why: '兩件圓柱能疊穩。'
    },
    {
      id: 'stack-pyramid', kind: 'watch', topic: 'stack', shape: 'pyramid', motion: 'stack-pyramid', pose: 'pyramid',
      tag: '角錐',
      prompt: '睇住兩件角錐。佢哋可唔可以疊穩？',
      answer: 'no', choices: STACK_CHOICES, hint: WATCH_HINT,
      why: '兩件角錐唔能疊穩。'
    },
    {
      id: 'roll-sphere', kind: 'watch', topic: 'roll', shape: 'sphere', motion: 'roll-yes', pose: 'sphere',
      tag: '球',
      prompt: '個球喺斜板上面。佢可唔可以滾動？',
      answer: 'yes', choices: ROLL_CHOICES, hint: WATCH_HINT,
      why: '球喺斜板能滾動。'
    },
    {
      id: 'roll-prism', kind: 'watch', topic: 'roll', shape: 'prism', motion: 'roll-no', pose: 'prism',
      tag: '角柱',
      prompt: '件角柱喺斜板上面。佢可唔可以滾動？',
      answer: 'no', choices: ROLL_CHOICES, hint: WATCH_HINT,
      why: '角柱喺斜板唔能滾動。'
    },
    {
      id: 'roll-cone', kind: 'watch', topic: 'roll', shape: 'cone', motion: 'roll-yes', pose: 'coneSide',
      tag: '圓錐',
      prompt: '個圓錐喺斜板上面。佢可唔可以滾動？',
      answer: 'yes', choices: ROLL_CHOICES, hint: WATCH_HINT,
      why: '圓錐喺斜板能滾動。'
    },
    {
      id: 'both-cylinder', kind: 'pick',
      prompt: '邊對又能疊穩又能滾動？',
      answer: 'cylinder',
      hint: '睇住每對點樣疊、點樣落斜板，再撳你揀嘅一對。',
      why: '只有圓柱又能疊穩又能滾動。',
      choices: [
        { id: 'prism', label: '兩件角柱', demo: 'stackOnly' },
        { id: 'sphere', label: '兩件球', demo: 'rollOnly' },
        { id: 'cone', label: '兩件圓錐', demo: 'cone' },
        { id: 'pyramid', label: '兩件角錐', demo: 'neither' },
        { id: 'cylinder', label: '兩件圓柱', demo: 'both' }
      ]
    },
    {
      id: 'sort-roll', kind: 'sort',
      prompt: '邊啲可以滾動？拖去啱嘅格。',
      hint: '撳住拖過去，或者先撳圖形再撳格。',
      why: '球、圓柱、圓錐能滾動。角柱同角錐唔能滾動。',
      pieces: [
        { id: 'sphere', pose: 'sphere', bin: 'roll' },
        { id: 'cylinder', pose: 'cylinderUp', bin: 'roll' },
        { id: 'cone', pose: 'coneUp', bin: 'roll' },
        { id: 'prism', pose: 'prism', bin: 'stay' },
        { id: 'pyramid', pose: 'pyramid', bin: 'stay' }
      ]
    }
  ];

  var NAMES = { prism: '角柱', cylinder: '圓柱', pyramid: '角錐', cone: '圓錐', sphere: '球' };

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function makeRound() { return clone(ITEMS); }

  /* Balls tumble like a ball. Cylinders and cones roll around their own
     axis so the side stays on the ground. Prisms and pyramids do not roll. */
  function rollStyle(poseKey) {
    var spec = POSES[poseKey];
    var shape = spec ? spec.shape : poseKey;
    if (shape === 'sphere') return 'ball';
    if (shape === 'cylinder' || shape === 'cone') return 'side';
    return 'none';
  }

  function grade(item, response) {
    if (!item) return false;
    if (item.kind === 'watch' || item.kind === 'pick') return response === item.answer;
    if (item.kind === 'sort') {
      var map = response || {};
      for (var i = 0; i < item.pieces.length; i++) {
        if (map[item.pieces[i].id] !== item.pieces[i].bin) return false;
      }
      return true;
    }
    return false;
  }

  return {
    TOTAL: TOTAL,
    RULES: RULES,
    POSES: POSES,
    makeRound: makeRound,
    grade: grade,
    rollStyle: rollStyle,
    NAMES: NAMES
  };
});

function mount(api) {
  'use strict';
  if (!document.getElementById('btnStart2') || !window.SolidShapes) return;

  var TOTAL = api.TOTAL;
  var LS_BEST = 'p1SolidShapes.lesson2.best.v1';
  var LS_SOUND = 'p1SolidShapes.sound.v1';
  var state = {
    items: [],
    index: 0,
    correct: 0,
    locked: false,
    sound: true,
    mistakes: 0,
    placed: {},
    selected: null
  };
  var audioCtx = null;
  var suppressClick = false;
  var NAMES = api.NAMES;
  var TAG_COLOR = {
    prism: '#ffd15c', sphere: '#c9b6ff', cone: '#7ddeb3', cylinder: '#7ecbff', pyramid: '#ff8ec8'
  };

  function $(id) { return document.getElementById(id); }

  function show(id) {
    document.querySelectorAll('.screen').forEach(function (node) {
      node.classList.toggle('on', node.id === id);
    });
    window.scrollTo(0, 0);
  }

  function current() { return state.items[state.index]; }

  function readSound() {
    try { return localStorage.getItem(LS_SOUND) !== '0'; } catch (e) { return true; }
  }

  function persistSound(on) {
    state.sound = on;
    try { localStorage.setItem(LS_SOUND, on ? '1' : '0'); } catch (e) { /* ignore */ }
    var other = $('chkSound');
    if (other && other.checked !== on) {
      other.checked = on;
      other.dispatchEvent(new Event('change'));
    }
  }

  function ensureAudio() {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur, type) {
    if (!state.sound) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function sfxOk() {
    tone(523, 0.1);
    setTimeout(function () { tone(659, 0.14); }, 90);
  }
  function sfxNo() { tone(294, 0.16, 'triangle'); }
  function sfxTick() { tone(620, 0.08); }
  function sfxWin() {
    sfxOk();
    setTimeout(function () { tone(784, 0.16); }, 180);
  }

  function starsText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '⭐' : '☆';
    return s;
  }

  function readBest() {
    try {
      var data = JSON.parse(localStorage.getItem(LS_BEST) || 'null');
      if (!data || typeof data.score !== 'number') return null;
      return {
        score: Math.max(0, Math.min(TOTAL, Math.round(data.score))),
        stars: Math.max(0, Math.min(3, Math.round(data.stars || 0)))
      };
    } catch (e) { return null; }
  }

  function writeBest(score, stars) {
    try { localStorage.setItem(LS_BEST, JSON.stringify({ score: score, stars: stars })); } catch (e) { /* ignore */ }
  }

  function paintBest() {
    var best = readBest();
    var el = $('bestLine2');
    if (!el) return;
    el.textContent = best ? ('第二課最高 ' + best.score + '／' + TOTAL + '　' + starsText(best.stars)) : '';
  }

  function confetti() {
    var host = $('fx2');
    if (!host) return;
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#ff8ec8', '#ffd15c', '#7ddeb3', '#7ecbff', '#c9b6ff', '#fff'];
    for (var i = 0; i < 36; i++) {
      var bit = document.createElement('i');
      bit.style.left = (Math.random() * 100) + '%';
      bit.style.background = colors[i % colors.length];
      bit.style.animationDelay = (Math.random() * 0.18) + 's';
      bit.style.animationDuration = (0.9 + Math.random() * 0.55) + 's';
      box.appendChild(bit);
    }
    host.appendChild(box);
    setTimeout(function () { if (box.parentNode) box.remove(); }, 1700);
  }

  function setFeedback(text, kind) {
    var fb = $('feedback2');
    fb.className = 'feedback' + (kind ? ' ' + kind : '');
    fb.textContent = text;
  }

  function svg(poseKey, uid) {
    var spec = api.POSES[poseKey];
    if (!spec) return '';
    return window.SolidShapes.renderSvg(spec, uid);
  }

  function rollClass(poseKey) {
    var style = api.rollStyle(poseKey);
    if (style === 'ball') return 'rollBall';
    if (style === 'side') return 'rollSide';
    return '';
  }

  function solidHtml(poseKey, uid) {
    return '<span class="solidSlot" data-pose="' + poseKey + '" data-uid="' + uid + '">' + svg(poseKey, uid) + '</span>';
  }

  function piece(poseKey, uid, cls) {
    return '<div class="piece ' + cls + '">' + solidHtml(poseKey, uid) + '</div>';
  }

  function watchHtml(item, n) {
    var color = TAG_COLOR[item.shape] || '#ff8ec8';
    var tag = '<span class="shapeTag" style="border-color:' + color + '">' + item.tag + '</span>';
    var replay = '<button type="button" class="replay">再睇一次</button>';
    var ground = '<div class="ground"></div>';
    if (item.motion.indexOf('stack') === 0) {
      var lower = item.lower || item.pose;
      var upper = item.upper || item.pose;
      var extra = item.motion === 'stack-yes'
        ? '<span class="landStar" aria-hidden="true">⭐</span>'
        : '<i class="dust d1"></i><i class="dust d2"></i><i class="dust d3"></i>';
      return '<div class="animStage ' + item.motion + '" role="img" aria-label="' + item.tag + '">' +
        ground + tag +
        '<div class="stackScene">' +
          piece(lower, 'l' + n, 'lower') +
          piece(upper, 'u' + n, 'upper') +
          extra +
        '</div>' + replay + '</div>';
    }
    return '<div class="animStage ' + item.motion + '" role="img" aria-label="' + item.tag + '">' +
      ground +
      '<div class="ramp"></div>' +
      '<svg class="slopeLine" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
        '<line x1="16" y1="36" x2="80" y2="72" stroke="#e0a020" stroke-width="2.2" stroke-dasharray="3 2"/>' +
      '</svg>' +
      '<span class="rampLabel">斜板</span>' +
      '<span class="finishFlag" aria-hidden="true">🏁</span>' +
      tag +
      '<div class="roller ' + rollClass(item.pose) + '">' + solidHtml(item.pose, 'r' + n) + '</div>' +
      replay + '</div>';
  }

  function choicesHtml(list) {
    return list.map(function (c) {
      return '<button type="button" class="choice ' + c.cls + '" data-id="' + c.id + '">' + c.label + '</button>';
    }).join('');
  }

  var DEMO = {
    stackOnly: { lower: 'prism', upper: 'prism', roller: 'prism', go: false },
    rollOnly: { lower: 'sphere', upper: 'sphere', roller: 'sphere', go: true },
    cone: { lower: 'coneUp', upper: 'coneDown', roller: 'coneSide', go: true },
    neither: { lower: 'pyramid', upper: 'pyramid', roller: 'pyramid', go: false },
    both: { lower: 'cylinderUp', upper: 'cylinderUp', roller: 'cylinderSide', go: true }
  };

  function miniPair(demo, uid) {
    var m = DEMO[demo];
    var go = m.go ? 'goes' : 'stays';
    return '<span class="demo ' + demo + ' ' + go + '">' +
      '<span class="miniCol"><span class="miniCap">疊</span>' +
        '<span class="miniPiece lower">' + solidHtml(m.lower, uid + 'l') + '</span>' +
        '<span class="miniPiece upper">' + solidHtml(m.upper, uid + 'u') + '</span>' +
      '</span>' +
      '<span class="miniCol rampCol"><span class="miniCap">斜板</span><span class="miniRamp"></span>' +
        '<span class="miniRoller ' + rollClass(m.roller) + '">' + solidHtml(m.roller, uid + 'r') + '</span>' +
      '</span></span>';
  }

  function pickHtml(item) {
    return item.choices.map(function (c, i) {
      return '<button type="button" class="pairCard" data-id="' + c.id + '">' +
        miniPair(c.demo, 'p' + i) +
        '<span class="pairLabel">' + c.label + '</span></button>';
    }).join('');
  }

  function shuffle(list) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function sortHtml(item) {
    var bits = shuffle(item.pieces).map(function (p, i) {
      var ball = api.rollStyle(p.pose) === 'ball' ? ' rollBall' : '';
      return '<div class="token idle' + ball + '" data-id="' + p.id + '" role="button" tabindex="0" aria-pressed="false">' +
        solidHtml(p.pose, 't' + i + p.id) +
        '<span class="tokenName">' + NAMES[p.id] + '</span></div>';
    }).join('');
    return '<div class="tray">' + bits + '</div>';
  }

  function zonesHtml() {
    return '<button type="button" class="zone rollZone" data-zone="roll"><span class="zoneLabel">能滾動</span><span class="zoneWell"></span></button>' +
      '<button type="button" class="zone stayZone" data-zone="stay"><span class="zoneLabel">唔能滾動</span><span class="zoneWell"></span></button>';
  }

  function showNext() {
    var next = $('btnNext2');
    next.hidden = false;
    next.textContent = state.index + 1 >= TOTAL ? '睇成績' : '下一題';
    $('scorePill2').textContent = '答啱 ' + state.correct;
    next.focus();
  }

  function markWatch(item, picked, ok) {
    document.querySelectorAll('#answers2 .choice').forEach(function (btn) {
      btn.disabled = true;
      var id = btn.getAttribute('data-id');
      if (id === item.answer) btn.classList.add(ok ? 'good' : 'show');
      if (id === picked && !ok) btn.classList.add('bad');
    });
  }

  function answerWatch(item, id) {
    if (state.locked || !item || item.kind !== 'watch') return;
    if (id !== 'yes' && id !== 'no') return;
    state.locked = true;
    var ok = api.grade(item, id);
    if (ok) state.correct += 1;
    markWatch(item, id, ok);
    setFeedback((ok ? '啱晒！' : '差少少。') + item.why, ok ? 'ok' : 'bad');
    if (ok) { sfxOk(); confetti(); } else sfxNo();
    showNext();
  }

  function answerPick(item, id) {
    if (state.locked || !item || item.kind !== 'pick') return;
    state.locked = true;
    var ok = api.grade(item, id);
    if (ok) state.correct += 1;
    document.querySelectorAll('#answers2 .pairCard').forEach(function (card) {
      card.disabled = true;
      var cid = card.getAttribute('data-id');
      if (cid === item.answer) card.classList.add(ok ? 'good' : 'show');
      if (cid === id && !ok) card.classList.add('bad');
    });
    setFeedback((ok ? '啱晒！' : '差少少。') + item.why, ok ? 'ok' : 'bad');
    if (ok) { sfxOk(); confetti(); } else sfxNo();
    showNext();
  }

  function selectToken(id) {
    state.selected = id;
    document.querySelectorAll('#stage2 .token').forEach(function (node) {
      var on = node.getAttribute('data-id') === id && !node.classList.contains('placed');
      node.classList.toggle('selected', on);
      node.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function selectNext() {
    var next = document.querySelector('#stage2 .tray .token:not(.placed)');
    if (!next) { state.selected = null; return; }
    selectToken(next.getAttribute('data-id'));
  }

  function wobble(el) {
    if (!el) return;
    el.classList.remove('wobble');
    void el.offsetWidth;
    el.classList.add('wobble');
  }

  function pieceById(item, id) {
    for (var i = 0; i < item.pieces.length; i++) {
      if (item.pieces[i].id === id) return item.pieces[i];
    }
    return null;
  }

  function dropSort(item, id, zoneId) {
    if (state.locked || !item || item.kind !== 'sort' || state.placed[id]) return;
    var piece = pieceById(item, id);
    var zone = document.querySelector('#answers2 .zone[data-zone="' + zoneId + '"]');
    var token = document.querySelector('#stage2 .token[data-id="' + id + '"]');
    if (!piece || !zone || !token) return;
    if (piece.bin !== zoneId) {
      state.mistakes += 1;
      wobble(zone);
      wobble(token);
      sfxNo();
      setFeedback('呢格唔啱，再試過。', 'bad');
      return;
    }
    state.placed[id] = zoneId;
    token.classList.remove('selected', 'idle');
    token.classList.add('placed', piece.bin === 'roll' ? 'justRoll' : 'justStay');
    zone.querySelector('.zoneWell').appendChild(token);
    zone.classList.add('has');
    sfxTick();
    var done = item.pieces.every(function (p) { return !!state.placed[p.id]; });
    if (!done) {
      selectNext();
      if (state.mistakes === 0) setFeedback('啱！繼續放低其他圖形。', 'ok');
      return;
    }
    state.locked = true;
    var clean = state.mistakes === 0;
    if (clean) state.correct += 1;
    document.querySelectorAll('#answers2 .zone').forEach(function (z) {
      z.disabled = true;
      z.classList.add('celebrate');
    });
    setFeedback((clean ? '啱晒！' : '記低：') + item.why + (clean ? '' : '頭先有放錯，呢題未計分。'), clean ? 'ok' : 'bad');
    if (clean) { sfxWin(); confetti(); } else sfxNo();
    showNext();
  }

  function bindToken(token) {
    var start = null;
    token.addEventListener('pointerdown', function (ev) {
      if (state.locked || token.classList.contains('placed')) return;
      if (ev.button != null && ev.button !== 0) return;
      ev.preventDefault();
      var rect = token.getBoundingClientRect();
      start = {
        pid: ev.pointerId,
        x: ev.clientX,
        y: ev.clientY,
        ox: ev.clientX - rect.left,
        oy: ev.clientY - rect.top,
        dragged: false,
        ghost: null
      };
      try { token.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
    });
    token.addEventListener('pointermove', function (ev) {
      if (!start || ev.pointerId !== start.pid) return;
      var dx = ev.clientX - start.x;
      var dy = ev.clientY - start.y;
      if (!start.dragged && dx * dx + dy * dy > 36) {
        start.dragged = true;
        var rect = token.getBoundingClientRect();
        var ghost = token.cloneNode(true);
        ghost.classList.add('dragGhost');
        ghost.style.width = rect.width + 'px';
        ghost.style.height = rect.height + 'px';
        document.body.appendChild(ghost);
        start.ghost = ghost;
        token.classList.add('ghosting');
      }
      if (start.ghost) {
        start.ghost.style.left = (ev.clientX - start.ox) + 'px';
        start.ghost.style.top = (ev.clientY - start.oy) + 'px';
      }
    });
    function finish(ev, cancelled) {
      if (!start || ev.pointerId !== start.pid) return;
      var dragged = start.dragged;
      if (start.ghost) start.ghost.remove();
      token.classList.remove('ghosting');
      start = null;
      if (cancelled || !dragged) {
        if (!cancelled) selectToken(token.getAttribute('data-id'));
        return;
      }
      suppressClick = true;
      setTimeout(function () { suppressClick = false; }, 90);
      var el = document.elementFromPoint(ev.clientX, ev.clientY);
      var zone = el && el.closest ? el.closest('.zone') : null;
      if (zone) dropSort(current(), token.getAttribute('data-id'), zone.getAttribute('data-zone'));
    }
    token.addEventListener('pointerup', function (ev) { finish(ev, false); });
    token.addEventListener('pointercancel', function (ev) { finish(ev, true); });
    token.addEventListener('click', function () {
      if (state.locked || token.classList.contains('placed')) return;
      selectToken(token.getAttribute('data-id'));
    });
  }

  function prefersStill() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Spin the lateral stripe around the solid's own axis. The SVG outline
     stays side-on; it does not flip end over end. */
  function spinSlot(slot) {
    var poseKey = slot.getAttribute('data-pose');
    var uid = slot.getAttribute('data-uid') || 'roll';
    var base = api.POSES[poseKey];
    if (!base || api.rollStyle(poseKey) !== 'side') return;
    var token = {};
    slot._rollToken = token;
    if (prefersStill()) return;
    var mini = !!slot.closest('.miniRoller');
    var period = mini ? 2200 : 1750;
    var trips = mini ? Infinity : 2;
    var spinsPerTrip = 2;
    var spec = JSON.parse(JSON.stringify(base));
    var t0 = performance.now();
    function draw(angle) {
      if (slot._rollToken !== token || !slot.isConnected) return false;
      spec.roll = angle;
      slot.innerHTML = window.SolidShapes.renderSvg(spec, uid);
      return true;
    }
    function frame(now) {
      var done = (now - t0) / period;
      if (done >= trips) {
        draw(spinsPerTrip * Math.PI * 2);
        return;
      }
      if (!draw(done * spinsPerTrip * Math.PI * 2)) return;
      window.requestAnimationFrame(frame);
    }
    draw(0);
    window.requestAnimationFrame(frame);
  }

  function bindSideRolls(root) {
    if (!root) return;
    root.querySelectorAll('.rollSide > .solidSlot, .rollSide .solidSlot').forEach(function (slot) {
      if (slot.closest('.rollSide')) spinSlot(slot);
    });
  }

  function replay(root) {
    var nodes = root.querySelectorAll('.piece, .roller, .roller svg, .landStar, .dust');
    nodes.forEach(function (n) { n.style.animation = 'none'; });
    void root.offsetWidth;
    nodes.forEach(function (n) { n.style.animation = ''; });
    root.querySelectorAll('.rollSide .solidSlot').forEach(function (slot) { slot._rollToken = null; });
    bindSideRolls(root);
  }

  function renderQuestion() {
    document.querySelectorAll('.dragGhost').forEach(function (g) { g.remove(); });
    var item = current();
    state.locked = false;
    state.mistakes = 0;
    state.placed = {};
    state.selected = null;
    $('prog2').textContent = '第 ' + (state.index + 1) + '／' + TOTAL + ' 題';
    $('scorePill2').textContent = '答啱 ' + state.correct;
    $('barFill2').style.width = ((state.index / TOTAL) * 100) + '%';
    $('prompt2').textContent = item.prompt;
    $('btnNext2').hidden = true;
    var stage = $('stage2');
    var answers = $('answers2');
    if (item.kind === 'watch') {
      stage.innerHTML = watchHtml(item, state.index);
      answers.className = 'choices pair';
      answers.innerHTML = choicesHtml(item.choices);
    } else if (item.kind === 'pick') {
      stage.innerHTML = '';
      answers.className = 'pairGrid';
      answers.innerHTML = pickHtml(item);
    } else {
      stage.innerHTML = sortHtml(item);
      answers.className = 'zoneGrid';
      answers.innerHTML = zonesHtml();
      stage.querySelectorAll('.token').forEach(bindToken);
      selectNext();
    }
    bindSideRolls($('play2'));
    setFeedback(item.hint, '');
  }

  function startRound() {
    ensureAudio();
    state.sound = readSound();
    $('chkSound2').checked = state.sound;
    state.items = api.makeRound();
    state.index = 0;
    state.correct = 0;
    show('play2');
    renderQuestion();
  }

  function finish() {
    var stars = window.SolidShapes.starsFor(state.correct, TOTAL);
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += i < stars ? '<span class="star on">⭐</span>' : '<span class="star">☆</span>';
    }
    $('end2Stars').innerHTML = html;
    $('end2Title').textContent = stars >= 3 ? '好叻！' : stars === 2 ? '做得好！' : stars === 1 ? '繼續加油！' : '再試一次！';
    $('end2Score').textContent = '答啱 ' + state.correct + '／' + TOTAL;
    var best = readBest();
    var improved = !best || state.correct > best.score || (state.correct === best.score && stars > best.stars);
    if (improved) writeBest(state.correct, stars);
    var shown = improved ? { score: state.correct, stars: stars } : best;
    $('end2Best').textContent = shown ? ('第二課最高 ' + shown.score + '／' + TOTAL + '　' + starsText(shown.stars)) : '';
    show('end2');
    paintBest();
    if (stars >= 2) { sfxOk(); confetti(); }
  }

  function goNext() {
    if (!state.locked) return;
    if (state.index + 1 >= TOTAL) finish();
    else {
      state.index += 1;
      renderQuestion();
    }
  }

  $('btnStart2').addEventListener('click', startRound);
  $('btnAgain2').addEventListener('click', startRound);
  $('btnNext2').addEventListener('click', goNext);
  $('btnMenu2').addEventListener('click', function () { show('home'); paintBest(); });
  $('btnHome2').addEventListener('click', function () {
    if (!window.confirm('返去主頁？呢局嘅進度會冇咗。')) return;
    show('home');
    paintBest();
  });
  $('chkSound2').addEventListener('change', function () {
    persistSound(this.checked);
    if (state.sound) ensureAudio();
  });
  $('stage2').addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('.replay');
    if (!btn) return;
    replay(btn.closest('.animStage') || $('stage2'));
  });
  $('answers2').addEventListener('click', function (ev) {
    if (suppressClick) return;
    var item = current();
    if (!item || state.locked) return;
    var card = ev.target.closest && ev.target.closest('.pairCard');
    if (card && item.kind === 'pick') {
      answerPick(item, card.getAttribute('data-id'));
      return;
    }
    var choice = ev.target.closest && ev.target.closest('.choice');
    if (choice && item.kind === 'watch') {
      answerWatch(item, choice.getAttribute('data-id'));
      return;
    }
    var zone = ev.target.closest && ev.target.closest('.zone');
    if (zone && item.kind === 'sort') {
      if (ev.target.closest('.token')) return;
      if (!state.selected) {
        setFeedback('先撳一個圖形。', '');
        return;
      }
      dropSort(item, state.selected, zone.getAttribute('data-zone'));
    }
  });

  state.sound = readSound();
  $('chkSound2').checked = state.sound;
  paintBest();
}
