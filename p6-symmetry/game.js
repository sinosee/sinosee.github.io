/* 軸對稱平面圖形 — home, teacher/student mode, lesson 1 play. No leaderboard. */
(function () {
  'use strict';
  var G = window.SymmetryGeo;
  var S = window.SymmetryShapes;
  var TOTAL = 10;
  var LS_SOUND = 'p6Symmetry.sound.v1';
  var LS_BEST1 = 'p6Symmetry.best1.v1';
  var LS_BEST2 = 'p6Symmetry.best2.v1';
  var LS_MODE = 'p6Symmetry.mode.v1';

  var state = {
    mode: 'student',
    sound: true,
    audio: null,
    index: 0,
    correct: 0,
    locked: false,
    attempts: 0,
    selected: [],
    marks: null
  };

  function $(id) { return document.getElementById(id); }

  function isTeacher() { return state.mode === 'teacher'; }

  function show(id) {
    document.querySelectorAll('.screen').forEach(function (node) {
      node.classList.toggle('on', node.id === id);
    });
  }

  function starsText(n) {
    var s = '';
    for (var i = 0; i < 3; i++) s += i < n ? '⭐' : '☆';
    return s;
  }

  function readBest(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var data = JSON.parse(raw);
      var score = Math.max(0, Math.min(TOTAL, Math.round(data.score || 0)));
      var stars = Math.max(0, Math.min(3, Math.round(data.stars || 0)));
      return { score: score, stars: stars };
    } catch (e) {
      return null;
    }
  }

  function writeBest(key, score, stars) {
    try {
      localStorage.setItem(key, JSON.stringify({ score: score, stars: stars }));
    } catch (e) { /* private mode */ }
  }

  function paintBest() {
    var b1 = readBest(LS_BEST1);
    var b2 = readBest(LS_BEST2);
    $('bestLine').textContent = b1 ? ('這部裝置最高 ' + b1.score + '／' + TOTAL + '　' + starsText(b1.stars)) : '';
    $('bestLine2').textContent = b2 ? ('這部裝置最高 ' + b2.score + '／' + TOTAL + '　' + starsText(b2.stars)) : '';
  }

  function ensureAudio() {
    if (state.audio) return state.audio;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    state.audio = new AC();
    return state.audio;
  }

  function tone(freq, dur, type) {
    if (!state.sound) return;
    var ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  function sfxOk() {
    tone(523, 0.12);
    setTimeout(function () { tone(659, 0.14); }, 90);
  }

  function sfxNo() { tone(294, 0.16, 'triangle'); }

  function loadSound() {
    try {
      if (localStorage.getItem(LS_SOUND) === '0') state.sound = false;
    } catch (e) { /* ignore */ }
    var a = $('chkSound');
    var b = $('chkSound2');
    if (a) a.checked = state.sound;
    if (b) b.checked = state.sound;
  }

  function setSound(on) {
    state.sound = !!on;
    try { localStorage.setItem(LS_SOUND, state.sound ? '1' : '0'); } catch (e) { /* ignore */ }
    loadSound();
    if (state.sound) ensureAudio();
  }

  function loadMode() {
    try {
      state.mode = sessionStorage.getItem(LS_MODE) === 'teacher' ? 'teacher' : 'student';
    } catch (e) {
      state.mode = 'student';
    }
  }

  function paintModePill() {
    ['modePill', 'modePill2'].forEach(function (id) {
      var pill = $(id);
      if (!pill) return;
      pill.hidden = !isTeacher();
      pill.textContent = isTeacher() ? '老師投影' : '';
    });
  }

  function syncModeUi() {
    var teacher = isTeacher();
    var studentBtn = $('modeStudent');
    var teacherBtn = $('modeTeacher');
    if (studentBtn) {
      studentBtn.classList.toggle('sel', !teacher);
      studentBtn.setAttribute('aria-pressed', teacher ? 'false' : 'true');
    }
    if (teacherBtn) {
      teacherBtn.classList.toggle('sel', teacher);
      teacherBtn.setAttribute('aria-pressed', teacher ? 'true' : 'false');
    }
    var note = $('modeNote');
    if (note) {
      note.textContent = teacher
        ? '老師投影方便在課堂示範，兩課都可以直接開始。'
        : '兩課都可以直接開始，成績只顯示在這部裝置。';
    }
    paintModePill();
  }

  function setMode(mode) {
    state.mode = mode === 'teacher' ? 'teacher' : 'student';
    try { sessionStorage.setItem(LS_MODE, state.mode); } catch (e) { /* private mode */ }
    syncModeUi();
  }

  function setFeedback(el, kind, text) {
    el.classList.remove('ok', 'bad');
    if (kind) el.classList.add(kind);
    el.textContent = text || '';
  }

  function currentQ() {
    return S.QUESTIONS[state.index];
  }

  function currentShape() {
    return S.SHAPES[currentQ().shapeId];
  }

  function hidePlayButtons() {
    $('btnCheck').hidden = true;
    $('btnRetry').hidden = true;
    $('btnNext').hidden = true;
  }

  function renderQuestion() {
    var q = currentQ();
    var shape = currentShape();
    state.locked = false;
    state.attempts = 0;
    state.marks = null;
    if (S.cancelFolds) S.cancelFolds();
    hidePlayButtons();
    $('choices').innerHTML = '';
    $('choices').hidden = false;
    $('prog').textContent = '第 ' + (state.index + 1) + '／' + TOTAL + ' 題';
    $('scorePill').textContent = '答對 ' + state.correct;
    $('barFill').style.width = (state.index / TOTAL * 100) + '%';
    $('prompt').textContent = q.prompt;
    $('lead').textContent = q.lead || '';
    setFeedback($('feedback'), '', q.type === 'find-axes'
      ? '點選全部對稱軸，再按「完成」。'
      : q.type === 'judge'
        ? '請選擇「是」或「不是」。'
        : '請選出正確的數目。');

    if (q.type === 'judge') {
      S.renderIdle($('stage'), shape, {});
      addChoice('是', true);
      addChoice('不是', false);
    } else if (q.type === 'count') {
      S.renderIdle($('stage'), shape, {});
      (q.choices || []).forEach(function (label) {
        addChoice(label, label);
      });
    } else if (q.type === 'find-axes') {
      var cands = typeof q.candidates === 'function' ? q.candidates() : q.candidates;
      state.candidates = cands;
      state.selected = cands.map(function () { return false; });
      paintFindAxes();
      $('btnCheck').hidden = false;
    }
  }

  function addChoice(label, value) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'choice';
    btn.textContent = label;
    btn.addEventListener('click', function () { choose(value, btn); });
    $('choices').appendChild(btn);
  }

  function paintFindAxes() {
    var shape = currentShape();
    S.renderFindAxes($('stage'), shape, state.candidates, {
      selected: state.selected,
      marks: state.marks,
      locked: state.locked
    });
    if (state.locked) return;
    state.candidates.forEach(function (cand, idx) {
      if (!cand._hit) return;
      cand._hit.addEventListener('click', function () { toggleAxis(idx); });
      cand._hit.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          toggleAxis(idx);
        }
      });
    });
  }

  function toggleAxis(idx) {
    if (state.locked) return;
    state.selected[idx] = !state.selected[idx];
    paintFindAxes();
  }

  function choose(value, btn) {
    if (state.locked) return;
    var q = currentQ();
    state.locked = true;
    var ok = value === q.answer;
    document.querySelectorAll('#choices .choice').forEach(function (el) {
      el.disabled = true;
      var label = el.textContent;
      var isAns = (q.type === 'judge' && ((label === '是' && q.answer === true) || (label === '不是' && q.answer === false))) ||
        (q.type === 'count' && label === q.answer);
      if (isAns) el.classList.add('good');
      if (el === btn && !ok) el.classList.add('bad');
      if (isAns && !ok) el.classList.add('show');
    });
    if (ok) {
      state.correct += 1;
      $('scorePill').textContent = '答對 ' + state.correct;
      setFeedback($('feedback'), 'ok', q.ok);
      sfxOk();
    } else {
      setFeedback($('feedback'), 'bad', q.bad);
      sfxNo();
    }
    $('choices').hidden = true;
    afterAnswer(q, ok);
  }

  function checkAxes() {
    if (state.locked) return;
    var q = currentQ();
    var cands = state.candidates;
    var allRight = true;
    var pickedDiagonal = false;
    var marks = [];
    for (var i = 0; i < cands.length; i++) {
      var picked = !!state.selected[i];
      var should = !!cands[i].correct;
      if (picked && should) marks[i] = 'good';
      else if (picked && !should) {
        marks[i] = 'bad';
        allRight = false;
        if (cands[i].kind === 'diagonal') pickedDiagonal = true;
      } else if (!picked && should) {
        marks[i] = '';
        allRight = false;
      } else {
        marks[i] = '';
      }
    }
    state.attempts += 1;
    if (allRight) {
      state.locked = true;
      if (state.attempts === 1) state.correct += 1;
      $('scorePill').textContent = '答對 ' + state.correct;
      /* Mark all correct axes. */
      for (var j = 0; j < cands.length; j++) {
        marks[j] = cands[j].correct ? 'good' : (state.selected[j] ? 'bad' : '');
      }
      state.marks = marks;
      paintFindAxes();
      setFeedback($('feedback'), 'ok', q.ok);
      sfxOk();
      afterAnswer(q, true);
      return;
    }

    var msg = q.bad;
    if (pickedDiagonal && q.badDiagonal) msg = q.badDiagonal;
    if (state.attempts === 1) {
      state.marks = marks;
      paintFindAxes();
      setFeedback($('feedback'), 'bad', msg);
      sfxNo();
      $('btnRetry').hidden = false;
      return;
    }

    /* Second (or later) miss: reveal the correct axes, then fold. */
    state.locked = true;
    for (var k = 0; k < cands.length; k++) {
      if (cands[k].correct) marks[k] = state.selected[k] ? 'good' : 'miss';
      else marks[k] = state.selected[k] ? 'bad' : '';
    }
    state.marks = marks;
    paintFindAxes();
    setFeedback($('feedback'), 'bad', msg);
    sfxNo();
    afterAnswer(q, false);
  }

  function genuineAxes(q, shape) {
    if (q.type === 'find-axes' && state.candidates && state.candidates.length) {
      return state.candidates.filter(function (c) { return c.correct; }).map(function (c) { return c.axis; });
    }
    if (shape.axes && shape.axes.length) return shape.axes.slice();
    return [];
  }

  function afterAnswer(q, ok) {
    hidePlayButtons();
    var shape = currentShape();
    function showNext() {
      $('btnNext').hidden = false;
      if (state.index >= TOTAL - 1) $('btnNext').textContent = '查看成績';
      else $('btnNext').textContent = '下一題';
    }
    if (q.foldSpecial === 'circle') {
      S.playCircleReveal($('stage'), shape, showNext);
      return;
    }
    var steps = [];
    if (q.type === 'find-axes' && !ok && state.candidates) {
      for (var i = 0; i < state.candidates.length; i++) {
        if (state.selected[i] && !state.candidates[i].correct) {
          steps.push({ axis: state.candidates[i].axis, coincides: false });
          break;
        }
      }
    }
    var genuine = (q.type === 'judge' && q.coincides === false) ? [] : genuineAxes(q, shape);
    genuine.forEach(function (ax) {
      steps.push({ axis: ax, coincides: true });
    });
    if (!steps.length && q.foldAxis) {
      steps.push({ axis: q.foldAxis(shape), coincides: !!q.coincides });
    }
    if (!steps.length) {
      showNext();
      return;
    }
    S.playFoldSequence($('stage'), shape, steps, function () {
      if (genuine.length) {
        S.renderIdle($('stage'), shape, {
          axis: genuine[0],
          extraAxes: genuine.slice(1)
        });
      }
      showNext();
    });
  }

  function retryAxes() {
    if (state.locked) return;
    state.marks = null;
    paintFindAxes();
    $('btnRetry').hidden = true;
    setFeedback($('feedback'), '', '再選一次，然後按「完成」。');
  }

  function nextQuestion() {
    if (state.index >= TOTAL - 1) {
      finishLesson1();
      return;
    }
    state.index += 1;
    renderQuestion();
  }

  function startLesson1() {
    ensureAudio();
    state.index = 0;
    state.correct = 0;
    paintModePill();
    show('play');
    renderQuestion();
  }

  function finishLesson1() {
    var stars = G.starsFor(state.correct, TOTAL);
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += i < stars ? '<span class="star on">⭐</span>' : '<span class="star">☆</span>';
    }
    $('endStars').innerHTML = html;
    $('endTitle').textContent = stars >= 3 ? '真棒！' : stars === 2 ? '做得好！' : stars === 1 ? '繼續加油！' : '再試一次！';
    $('endScore').textContent = '答對 ' + state.correct + '／' + TOTAL;
    if (!isTeacher()) {
      var best = readBest(LS_BEST1);
      var improved = !best || state.correct > best.score || (state.correct === best.score && stars > best.stars);
      if (improved) writeBest(LS_BEST1, state.correct, stars);
      var shown = improved ? { score: state.correct, stars: stars } : best;
      $('endBest').textContent = shown ? ('這部裝置最高 ' + shown.score + '／' + TOTAL + '　' + starsText(shown.stars)) : '';
    } else {
      $('endBest').textContent = '';
    }
    if (stars >= 2) sfxOk();
    show('end');
    paintBest();
  }

  function goHome() {
    if (S.cancelFolds) S.cancelFolds();
    show('home');
    paintBest();
    paintModePill();
  }

  window.P6Symmetry = {
    $, show: show, isTeacher: isTeacher, sfxOk: sfxOk, sfxNo: sfxNo,
    ensureAudio: ensureAudio, starsText: starsText, setSound: setSound,
    loadSound: loadSound, paintModePill: paintModePill, goHome: goHome,
    setFeedback: setFeedback, readBest: readBest, writeBest: writeBest,
    TOTAL: TOTAL, LS_BEST2: LS_BEST2, paintBest: paintBest,
    getCorrect: function () { return state.correct; },
    prefersReducedMotion: function () {
      try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
      catch (e) { return false; }
    }
  };

  function onReady() {
    loadMode();
    loadSound();
    syncModeUi();
    paintBest();

    $('modeStudent').addEventListener('click', function () { setMode('student'); });
    $('modeTeacher').addEventListener('click', function () { setMode('teacher'); });
    $('btnStart').addEventListener('click', startLesson1);
    $('btnHome').addEventListener('click', goHome);
    $('btnMenu').addEventListener('click', goHome);
    $('btnAgain').addEventListener('click', startLesson1);
    $('btnNext').addEventListener('click', nextQuestion);
    $('btnCheck').addEventListener('click', checkAxes);
    $('btnRetry').addEventListener('click', retryAxes);
    $('chkSound').addEventListener('change', function () { setSound($('chkSound').checked); });
    $('chkSound2').addEventListener('change', function () { setSound($('chkSound2').checked); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
