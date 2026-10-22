/* 立體圖形對對碰 — local score only. No cloud, no class list. */
(function () {
  'use strict';

  var TOTAL = 10;
  var LS_BEST = 'p1SolidShapes.best.v1';
  var LS_SOUND = 'p1SolidShapes.sound.v1';
  var state = {
    round: [],
    index: 0,
    correct: 0,
    locked: false,
    sound: true
  };
  var audioCtx = null;

  function $(id) { return document.getElementById(id); }

  function show(id) {
    document.querySelectorAll('.screen').forEach(function (node) {
      node.classList.toggle('on', node.id === id);
    });
    window.scrollTo(0, 0);
  }

  function readBest() {
    try {
      var data = JSON.parse(localStorage.getItem(LS_BEST) || 'null');
      if (!data || typeof data.score !== 'number') return null;
      var score = Math.max(0, Math.min(TOTAL, Math.round(data.score)));
      var stars = Math.max(0, Math.min(3, Math.round(data.stars || 0)));
      return { score: score, stars: stars };
    } catch (e) {
      return null;
    }
  }

  function writeBest(score, stars) {
    try {
      localStorage.setItem(LS_BEST, JSON.stringify({ score: score, stars: stars }));
    } catch (e) { /* private mode */ }
  }

  function starsText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '⭐' : '☆';
    return s;
  }

  function paintBest() {
    var best = readBest();
    var line = best ? ('呢部機最高 ' + best.score + '／' + TOTAL + '　' + starsText(best.stars)) : '';
    $('bestLine').textContent = line;
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

  function loadSound() {
    try {
      if (localStorage.getItem(LS_SOUND) === '0') state.sound = false;
    } catch (e) { /* ignore */ }
    $('chkSound').checked = state.sound;
  }

  function startRound() {
    ensureAudio();
    state.round = window.SolidShapes.makeRound(Date.now() ^ (Math.random() * 1e9));
    state.index = 0;
    state.correct = 0;
    state.locked = false;
    show('play');
    renderQuestion();
  }

  function renderQuestion() {
    var q = state.round[state.index];
    state.locked = false;
    $('prog').textContent = '第 ' + (state.index + 1) + '／' + TOTAL + ' 題';
    $('scorePill').textContent = '答啱 ' + state.correct;
    $('barFill').style.width = ((state.index / TOTAL) * 100) + '%';
    var frame = $('shape');
    frame.classList.remove('pop', 'wiggle');
    frame.innerHTML = window.SolidShapes.renderSvg(q, 'q' + state.index);
    var fb = $('feedback');
    fb.className = 'feedback';
    fb.textContent = '撳下面嘅名。';
    $('btnNext').hidden = true;
    var box = $('choices');
    box.textContent = '';
    q.choices.forEach(function (id) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice';
      btn.setAttribute('data-id', id);
      btn.textContent = window.SolidShapes.nameOf(id);
      btn.addEventListener('click', function () { choose(id); });
      box.appendChild(btn);
    });
  }

  function choose(id) {
    if (state.locked) return;
    var q = state.round[state.index];
    if (!q || q.choices.indexOf(id) < 0) return;
    state.locked = true;
    var ok = id === q.shape;
    if (ok) state.correct += 1;
    $('scorePill').textContent = '答啱 ' + state.correct;
    document.querySelectorAll('#choices .choice').forEach(function (btn) {
      btn.disabled = true;
      var bid = btn.getAttribute('data-id');
      if (bid === q.shape) btn.classList.add(ok ? 'good' : 'show');
      if (bid === id && !ok) btn.classList.add('bad');
    });
    var fb = $('feedback');
    var name = window.SolidShapes.nameOf(q.shape);
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    fb.textContent = ok ? ('啱晒！呢個係' + name + '。') : ('差少少。呢個係' + name + '。');
    var frame = $('shape');
    frame.classList.remove('pop', 'wiggle');
    void frame.offsetWidth;
    frame.classList.add(ok ? 'pop' : 'wiggle');
    if (ok) sfxOk(); else sfxNo();
    var next = $('btnNext');
    next.hidden = false;
    next.textContent = state.index + 1 >= TOTAL ? '睇成績' : '下一題';
    next.focus();
  }

  function finish() {
    var stars = window.SolidShapes.starsFor(state.correct, TOTAL);
    var starHtml = '';
    for (var i = 0; i < 3; i++) {
      starHtml += i < stars ? '<span class="star on">⭐</span>' : '<span class="star">☆</span>';
    }
    $('endStars').innerHTML = starHtml;
    $('endTitle').textContent = stars >= 3 ? '好叻！' : stars === 2 ? '做得好！' : stars === 1 ? '繼續加油！' : '再試一次！';
    $('endScore').textContent = '答啱 ' + state.correct + '／' + TOTAL;
    var best = readBest();
    var improved = !best || state.correct > best.score || (state.correct === best.score && stars > best.stars);
    if (improved) writeBest(state.correct, stars);
    var shown = improved ? { score: state.correct, stars: stars } : best;
    $('endBest').textContent = shown ? ('呢部機最高 ' + shown.score + '／' + TOTAL + '　' + starsText(shown.stars)) : '';
    if (stars >= 2) sfxOk();
    show('end');
    paintBest();
  }

  function goNext() {
    if (!state.locked) return;
    if (state.index + 1 >= TOTAL) finish();
    else {
      state.index += 1;
      renderQuestion();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    loadSound();
    paintBest();
    $('btnStart').addEventListener('click', startRound);
    $('btnAgain').addEventListener('click', startRound);
    $('btnMenu').addEventListener('click', function () { show('home'); paintBest(); });
    $('btnNext').addEventListener('click', goNext);
    $('btnHome').addEventListener('click', function () {
      if (!window.confirm('返去主頁？呢局嘅進度會冇咗。')) return;
      show('home');
      paintBest();
    });
    $('chkSound').addEventListener('change', function () {
      state.sound = this.checked;
      try { localStorage.setItem(LS_SOUND, state.sound ? '1' : '0'); } catch (e) { /* ignore */ }
      if (state.sound) ensureAudio();
    });
  });
})();
