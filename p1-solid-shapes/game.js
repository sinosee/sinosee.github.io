/* 立體圖形對對碰 — local stars plus the class leaderboard.
   Student mode keeps the class gate and /p1SolidShapes/scores.
   Teacher projector mode never asks 班別/學號 and never reads or writes the board. */
(function () {
  'use strict';

  var TOTAL = 10;
  var LS_BEST = 'p1SolidShapes.best.v1';
  var LS_SOUND = 'p1SolidShapes.sound.v1';
  var LS_MODE = 'p1SolidShapes.playMode.v1';
  var state = {
    round: [],
    index: 0,
    correct: 0,
    locked: false,
    sound: true,
    mode: 'student',
    player: null,
    gateReturn: 'home',
    runId: 0,
    teacherUnlocked: false,
    teacherFormOpen: false,
    teacherPin: '',
    teacherBusy: false,
    boardToken: 0
  };
  var audioCtx = null;

  function $(id) { return document.getElementById(id); }

  function isTeacher() { return state.mode === 'teacher'; }

  window.SolidPlay = {
    isTeacher: isTeacher,
    mode: function () { return state.mode; }
  };

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
    paintWho();
    paintModePill();
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

  function paintWho() {
    var pill = $('whoPill');
    if (!pill) return;
    if (isTeacher() || !state.player) {
      pill.hidden = true;
      pill.textContent = '';
      return;
    }
    pill.hidden = false;
    pill.textContent = state.player.classId + ' · ' + state.player.studentNo;
  }

  function paintModePill() {
    var pill = $('modePill');
    if (!pill) return;
    pill.hidden = !isTeacher();
    pill.textContent = isTeacher() ? '老師投影' : '';
  }

  function loadMode() {
    try {
      state.mode = sessionStorage.getItem(LS_MODE) === 'teacher' ? 'teacher' : 'student';
    } catch (e) {
      state.mode = 'student';
    }
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
        ? '老師投影唔問班別學號，兩課都唔會上榜。'
        : '學生要填班別同學號，完成第一課先入龍虎榜。';
    }
    var boardBtn = $('btnOpenBoard');
    if (boardBtn) boardBtn.hidden = teacher;
    paintModePill();
  }

  function setMode(mode) {
    state.mode = mode === 'teacher' ? 'teacher' : 'student';
    try { sessionStorage.setItem(LS_MODE, state.mode); } catch (e) { /* private mode */ }
    syncModeUi();
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
    var teacher = isTeacher();
    var best = readBest();
    if (!teacher) {
      var improved = !best || state.correct > best.score || (state.correct === best.score && stars > best.stars);
      if (improved) writeBest(state.correct, stars);
      var shown = improved ? { score: state.correct, stars: stars } : best;
      $('endBest').textContent = shown ? ('呢部機最高 ' + shown.score + '／' + TOTAL + '　' + starsText(shown.stars)) : '';
    } else {
      $('endBest').textContent = '老師投影模式，呢局唔會上榜。';
    }
    if (stars >= 2) sfxOk();
    var box = $('endBoard');
    if (teacher && box) box.textContent = '';
    show('end');
    paintBest();
    if (!teacher) publishResult(stars, state.runId);
  }

  function publishResult(stars, runId) {
    var box = $('endBoard');
    if (isTeacher()) {
      if (box) box.textContent = '';
      return;
    }
    var board = window.SolidLeaderboard;
    if (!box || !board) return;
    board.renderLoading(box);
    var identity = state.player;
    var score = state.correct;
    function done(result, highlight) {
      if (runId !== state.runId) return;
      board.renderInto(box, result, highlight, { title: '呢局龍虎榜' });
    }
    if (!identity) {
      board.load().then(function (result) { done(result, null); });
      return;
    }
    board.submit({
      classId: identity.classId,
      studentNo: identity.studentNo,
      score: score,
      stars: stars
    }).then(function (sub) {
      var highlight = {
        classId: identity.classId,
        studentNo: identity.studentNo,
        ts: sub.entry ? sub.entry.ts : 0,
        score: sub.entry ? sub.entry.score : score
      };
      return board.load().then(function (result) { done(result, highlight); });
    }).catch(function () {
      board.load().then(function (result) {
        done(result, { classId: identity.classId, studentNo: identity.studentNo, score: score });
      });
    });
  }

  function openGate(returnTo) {
    state.gateReturn = returnTo || 'home';
    var cls = $('gateClass');
    var no = $('gateNo');
    var board = window.SolidLeaderboard;
    if (board) {
      var saved = state.player || board.recallIdentity();
      if (saved) {
        if (!cls.value) cls.value = saved.classId || '';
        if (!no.value) no.value = saved.studentNo || '';
      }
      applyGate(false);
    }
    show('gate');
    setTimeout(function () {
      if (cls.value) {
        no.focus();
        if (no.value && no.select) no.select();
      } else {
        cls.focus();
      }
    }, 60);
  }

  function applyGate(forceEmpty) {
    var board = window.SolidLeaderboard;
    if (!board) return { ok: true };
    var cls = $('gateClass');
    var no = $('gateNo');
    var err = $('gateErr');
    var btn = $('btnGateGo');
    var result = board.validateIdentity(cls.value, no.value);
    var loud = !result.ok && (result.code !== 'empty' || forceEmpty);
    err.textContent = loud ? result.message : '';
    cls.classList.toggle('bad', !!(loud && result.fields.indexOf('classId') >= 0));
    no.classList.toggle('bad', !!(loud && result.fields.indexOf('studentNo') >= 0));
    cls.setAttribute('aria-invalid', (loud && result.fields.indexOf('classId') >= 0) ? 'true' : 'false');
    no.setAttribute('aria-invalid', (loud && result.fields.indexOf('studentNo') >= 0) ? 'true' : 'false');
    btn.classList.toggle('is-locked', !result.ok);
    return result;
  }

  function syncTeacherBox() {
    var openBtn = $('btnTeacherOpen');
    var form = $('teacherForm');
    var on = $('teacherOn');
    if (!openBtn || !form || !on) return;
    openBtn.hidden = state.teacherUnlocked || state.teacherFormOpen;
    form.hidden = state.teacherUnlocked || !state.teacherFormOpen;
    on.hidden = !state.teacherUnlocked;
  }

  function lockTeacherDelete() {
    state.teacherUnlocked = false;
    state.teacherFormOpen = false;
    state.teacherPin = '';
    state.teacherBusy = false;
    var pin = $('teacherPin');
    var err = $('teacherErr');
    if (pin) pin.value = '';
    if (err) err.textContent = '';
    syncTeacherBox();
  }

  function openBoard() {
    if (isTeacher()) return;
    syncTeacherBox();
    show('board');
    refreshBoard();
  }

  function refreshBoard() {
    var mount = $('boardMount');
    var board = window.SolidLeaderboard;
    if (!board) {
      mount.textContent = '龍虎榜未接上雲端';
      return;
    }
    var token = ++state.boardToken;
    board.renderLoading(mount);
    board.load().then(function (result) {
      if (token !== state.boardToken) return;
      if (!$('board').classList.contains('on')) return;
      var highlight = state.player ? {
        classId: state.player.classId,
        studentNo: state.player.studentNo
      } : null;
      board.renderInto(mount, result, highlight, {
        title: '龍虎榜',
        onDelete: state.teacherUnlocked ? askDeleteScore : null
      });
    });
  }

  function askDeleteScore(row) {
    var board = window.SolidLeaderboard;
    if (!state.teacherUnlocked || state.teacherBusy || !board) return;
    var who = row.classId + ' · ' + row.studentNo;
    if (!window.confirm('確定刪除 ' + who + ' 的 ' + row.score + ' 分？刪除後唔可以還原。')) return;
    state.teacherBusy = true;
    var status = $('teacherStatus');
    if (status) status.textContent = '刪除緊…';
    board.deleteScore(row, state.teacherPin).then(function (res) {
      state.teacherBusy = false;
      if (status) status.textContent = (res && res.message) || (res && res.ok ? '已刪除。' : '刪除失敗。');
      if (res && res.ok) refreshBoard();
    }).catch(function () {
      state.teacherBusy = false;
      if (status) status.textContent = '刪除失敗。請稍後再試。';
    });
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
    loadMode();
    paintBest();
    syncModeUi();
    $('modeStudent').addEventListener('click', function () { setMode('student'); });
    $('modeTeacher').addEventListener('click', function () { setMode('teacher'); });
    $('btnStart').addEventListener('click', function () {
      if (isTeacher() || !window.SolidLeaderboard) { startRound(); return; }
      openGate('home');
    });
    $('btnOpenBoard').addEventListener('click', openBoard);
    $('gateClass').addEventListener('input', function () { applyGate(false); });
    $('gateNo').addEventListener('input', function () { applyGate(false); });
    $('gateClass').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        $('gateNo').focus();
      }
    });
    $('gateForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var result = applyGate(true);
      if (!result.ok) {
        $(result.field === 'studentNo' ? 'gateNo' : 'gateClass').focus();
        return;
      }
      state.player = {
        classId: result.classId,
        studentNo: result.studentNo,
        displayName: result.displayName
      };
      window.SolidLeaderboard.rememberIdentity(state.player);
      state.runId += 1;
      startRound();
    });
    $('btnGateBack').addEventListener('click', function () {
      show(state.gateReturn || 'home');
      paintBest();
    });
    $('btnAgain').addEventListener('click', function () {
      if (isTeacher() || !window.SolidLeaderboard) { startRound(); return; }
      openGate('end');
    });
    $('btnMenu').addEventListener('click', function () { show('home'); paintBest(); });
    $('btnBoardBack').addEventListener('click', function () {
      lockTeacherDelete();
      show('home');
      paintBest();
    });
    $('btnBoardReload').addEventListener('click', refreshBoard);
    $('btnTeacherOpen').addEventListener('click', function () {
      state.teacherFormOpen = true;
      $('teacherErr').textContent = '';
      syncTeacherBox();
      $('teacherPin').focus();
    });
    $('btnTeacherCancel').addEventListener('click', function () {
      state.teacherFormOpen = false;
      $('teacherPin').value = '';
      $('teacherErr').textContent = '';
      syncTeacherBox();
    });
    $('btnTeacherLock').addEventListener('click', function () {
      lockTeacherDelete();
      refreshBoard();
    });
    $('teacherForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (state.teacherBusy || !window.SolidLeaderboard) return;
      var pinEl = $('teacherPin');
      var err = $('teacherErr');
      var btn = $('btnTeacherUnlock');
      state.teacherBusy = true;
      btn.disabled = true;
      err.textContent = '';
      window.SolidLeaderboard.verifyTeacherPin(pinEl.value).then(function (res) {
        state.teacherBusy = false;
        btn.disabled = false;
        if (!res || !res.ok) {
          err.textContent = (res && res.message) || '老師密碼唔正確。';
          pinEl.focus();
          return;
        }
        state.teacherPin = res.pin || '';
        pinEl.value = '';
        state.teacherUnlocked = true;
        state.teacherFormOpen = false;
        $('teacherStatus').textContent = '已解鎖。撳「刪除」清走一筆最高分。如果仲有其他紀錄，會顯示下一筆。';
        syncTeacherBox();
        refreshBoard();
      }).catch(function () {
        state.teacherBusy = false;
        btn.disabled = false;
        err.textContent = '暫時無法核對老師密碼。請稍後再試。';
      });
    });
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
