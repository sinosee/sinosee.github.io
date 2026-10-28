/* 18以內加數 — 90-second run, on-screen keypad, retry until correct.
   Teacher projector mode never asks for a class or student number and never
   reads or writes the leaderboard. */
(function () {
  'use strict';

  var LS_MODE = 'p1AdditionWithin18.mode';
  var LS_SOUND = 'p1AdditionWithin18.sound';
  var LS_BEST = 'p1AdditionWithin18.best.v1';

  var COPY = {
    ask: '請輸入答案，然後按「確定」。',
    typing: '請按「確定」。',
    maxlen: '答案最多兩個數字。按「清除」可以重新輸入。',
    empty: '請先輸入答案。',
    wrong: '再試一次。這個加法還沒有答對。',
    correct: '答對了！加 10 分。',
    correctMax: '答對了！',
    done: '時間到了！'
  };

  var SPEECH = {
    ask: '算出來吧！',
    typing: '算出來吧！',
    maxlen: '看一看題目。',
    empty: '看一看題目。',
    wrong: '再試一次！',
    correct: '答對了！',
    done: '時間到了！'
  };

  var state = {
    mode: 'student',
    screen: 'home',
    round: null,
    runId: 0,
    endedRun: 0,
    startedAt: 0,
    ticker: 0,
    lockTimer: 0,
    player: null,
    sound: true,
    audio: null,
    urgent: false,
    gateReturn: 'home',
    boardReturn: 'home',
    boardToken: 0,
    teacherUnlocked: false,
    teacherFormOpen: false,
    teacherPin: '',
    teacherBusy: false
  };

  function $(id) { return document.getElementById(id); }

  function api() { return window.AdditionWithin18; }

  function motionOk() {
    return !window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function show(id) {
    var names = ['home', 'gate', 'play', 'end', 'board'];
    var i;
    for (i = 0; i < names.length; i++) {
      $(names[i]).classList.toggle('on', names[i] === id);
    }
    state.screen = id;
    window.scrollTo(0, 0);
  }

  function remaining() {
    return state.startedAt + api().ROUND_MS - Date.now();
  }

  function loadMode() {
    var q = '';
    try { q = location.search || ''; } catch (e) { q = ''; }
    if (/[?&]mode=teacher(?:&|$)/.test(q)) state.mode = 'teacher';
    else if (/[?&]mode=student(?:&|$)/.test(q)) state.mode = 'student';
    else {
      try {
        state.mode = sessionStorage.getItem(LS_MODE) === 'teacher' ? 'teacher' : 'student';
      } catch (e2) {
        state.mode = 'student';
      }
    }
    try { sessionStorage.setItem(LS_MODE, state.mode); } catch (e3) {}
  }

  function setMode(mode) {
    state.mode = mode === 'teacher' ? 'teacher' : 'student';
    try { sessionStorage.setItem(LS_MODE, state.mode); } catch (e) {}
    paintMode();
  }

  function paintMode() {
    var teacher = !api().shouldSubmit(state.mode);
    $('modeStudent').classList.toggle('sel', !teacher);
    $('modeTeacher').classList.toggle('sel', teacher);
    $('modeStudent').setAttribute('aria-pressed', teacher ? 'false' : 'true');
    $('modeTeacher').setAttribute('aria-pressed', teacher ? 'true' : 'false');
    $('modeNote').textContent = teacher
      ? '老師投影不用填寫班別學號，本局不會上榜。'
      : '學生要填寫班別和學號，時間結束後記入龍虎榜。';
    $('modePill').hidden = !teacher;
    var who = $('whoPill');
    if (teacher || !state.player) {
      who.hidden = true;
      who.textContent = '';
    } else {
      who.hidden = false;
      who.textContent = state.player.classId + ' · ' + state.player.studentNo;
    }
  }

  function loadSound() {
    try { state.sound = localStorage.getItem(LS_SOUND) !== '0'; }
    catch (e) { state.sound = true; }
  }

  function setSound(on) {
    state.sound = !!on;
    try { localStorage.setItem(LS_SOUND, state.sound ? '1' : '0'); } catch (e) {}
    $('chkSound').checked = state.sound;
    $('chkSoundHome').checked = state.sound;
  }

  function unlockAudio() {
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      if (!state.audio) state.audio = new Ctx();
      if (state.audio.state === 'suspended') state.audio.resume();
    } catch (e) {}
  }

  function beep(freq, dur) {
    if (!state.sound || !state.audio) return;
    try {
      var ctx = state.audio;
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + dur + 0.02);
    } catch (e) {}
  }

  function sfxOk() {
    beep(660, 0.1);
    setTimeout(function () { beep(880, 0.14); }, 90);
  }

  function sfxBad() { beep(180, 0.18); }

  function sfxTime() {
    beep(523, 0.1);
    setTimeout(function () { beep(659, 0.1); }, 110);
    setTimeout(function () { beep(784, 0.16); }, 220);
  }

  function readBest() {
    try {
      var raw = localStorage.getItem(LS_BEST);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || typeof data.score !== 'number') return null;
      return { score: api().normalizeScore(data.score), stars: api().starsFor(data.score) };
    } catch (e) { return null; }
  }

  function writeBest(score) {
    try { localStorage.setItem(LS_BEST, JSON.stringify({ score: score })); }
    catch (e) {}
  }

  function considerBest(score) {
    if (!api().shouldSubmit(state.mode)) return;
    var best = readBest();
    if (!best || score > best.score) writeBest(score);
  }

  function paintBest() {
    var best = readBest();
    $('bestLine').textContent = best ? ('這部裝置最高 ' + best.score + ' 分') : '';
  }

  function fillFruits(el, n, kind) {
    el.textContent = '';
    var i;
    for (i = 0; i < n; i++) {
      var fruit = document.createElement('i');
      fruit.className = 'fruit ' + kind;
      fruit.style.animationDelay = (i * 0.04) + 's';
      el.appendChild(fruit);
    }
  }

  function renderPair(pair) {
    $('termA').textContent = String(pair.a);
    $('termB').textContent = String(pair.b);
    $('countA').textContent = String(pair.a);
    $('countB').textContent = String(pair.b);
    fillFruits($('trayA'), pair.a, 'apple');
    fillFruits($('trayB'), pair.b, 'orange');
    $('srQ').textContent = pair.a + ' 加 ' + pair.b + ' 等於多少？';
  }

  function paintAnswer(round) {
    var box = $('answerBox');
    box.textContent = round.digits || '?';
    box.classList.toggle('empty', !round.digits);
    box.classList.toggle('filled', !!round.digits);
    box.classList.toggle('bad', round.feedback === 'wrong');
    box.classList.toggle('good', round.feedback === 'correct');
  }

  function paintFeedback(round, prev) {
    var el = $('feedback');
    var text = COPY[round.feedback] || COPY.ask;
    if (round.feedback === 'correct' && prev && prev.score === round.score) text = COPY.correctMax;
    el.textContent = text;
    el.className = 'feedback ' + (round.feedback || 'ask');
  }

  function paintSpeech(round) {
    var text = SPEECH[round.feedback] || SPEECH.ask;
    if (state.urgent && round.feedback !== 'correct' && round.feedback !== 'wrong' && round.feedback !== 'done') {
      text = '剩餘時間不多了。';
    }
    $('speech').textContent = text;
  }

  function paintScore(round, prev) {
    var el = $('scoreValue');
    el.textContent = String(round.score);
    $('correctPill').textContent = '答對 ' + round.correct + ' 題';
    if (prev && round.score !== prev.score) {
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    }
  }

  function paintLock(locked) {
    var buttons = $('keypad').getElementsByTagName('button');
    var i;
    for (i = 0; i < buttons.length; i++) buttons[i].disabled = !!locked;
    $('keypad').classList.toggle('locked', !!locked);
  }

  function paintTime(ms) {
    $('timeValue').textContent = api().formatClock(ms);
    $('timeStat').classList.toggle('urgent', ms <= 10000);
  }

  function paintRound(prev) {
    var round = state.round;
    if (!round) return;
    var pairChanged = !prev || api().pairKey(prev.pair) !== api().pairKey(round.pair);
    if (pairChanged) {
      renderPair(round.pair);
      $('buddy').classList.remove('cheer');
    }
    paintAnswer(round);
    paintFeedback(round, prev);
    paintSpeech(round);
    paintScore(round, prev);
    paintLock(round.locked);
    if (round.feedback !== 'wrong') $('eq').classList.remove('shake');
  }

  function shake() {
    var eq = $('eq');
    eq.classList.remove('shake');
    void eq.offsetWidth;
    eq.classList.add('shake');
    var buddy = $('buddy');
    buddy.classList.remove('oops');
    void buddy.offsetWidth;
    buddy.classList.add('oops');
  }

  function burst() {
    if (!motionOk()) return;
    var layer = $('fx');
    layer.textContent = '';
    var bits = ['⭐', '🌟', '✨', '💖', '🎉', '🌸', '🍎', '🍊', '🐰'];
    var i;
    for (i = 0; i < 18; i++) {
      var bit = document.createElement('span');
      bit.className = 'confetti';
      bit.textContent = bits[i % bits.length];
      bit.style.left = (6 + Math.random() * 88) + '%';
      bit.style.animationDelay = (Math.random() * 0.18) + 's';
      bit.style.fontSize = (18 + Math.random() * 20) + 'px';
      layer.appendChild(bit);
    }
  }

  function popPlus() {
    var el = $('plusPop');
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  }

  function cheer() {
    var buddy = $('buddy');
    buddy.classList.remove('oops');
    buddy.classList.remove('cheer');
    void buddy.offsetWidth;
    buddy.classList.add('cheer');
    burst();
  }

  function titleFor(stars) {
    if (stars >= 3) return '真棒！';
    if (stars === 2) return '做得好！';
    if (stars === 1) return '繼續加油！';
    return '再試一次！';
  }

  function paintStars(el, n) {
    el.textContent = '';
    var i;
    for (i = 0; i < 3; i++) {
      var star = document.createElement('span');
      star.className = 'star' + (i < n ? ' on' : '');
      star.textContent = i < n ? '⭐' : '☆';
      el.appendChild(star);
    }
    el.setAttribute('aria-label', n + ' 顆星');
  }

  function onRoundChanged(prev, next) {
    if (next.over) {
      clearTimeout(state.lockTimer);
      paintRound(prev);
      showEnd();
      return;
    }
    var enteredWrong = next.feedback === 'wrong' && (!prev || prev.feedback !== 'wrong');
    var enteredCorrect = next.feedback === 'correct' && (!prev || prev.feedback !== 'correct');
    paintRound(prev);
    if (enteredWrong) {
      shake();
      sfxBad();
      clearTimeout(state.lockTimer);
      state.lockTimer = setTimeout(function () {
        if (state.screen !== 'play' || !state.round || state.round.over) return;
        applyAction({ type: 'unlock-wrong' });
      }, 560);
    }
    if (enteredCorrect) {
      cheer();
      sfxOk();
      if (!prev || next.score !== prev.score) popPlus();
      clearTimeout(state.lockTimer);
      state.lockTimer = setTimeout(function () {
        if (state.screen !== 'play' || !state.round || state.round.over) return;
        if (remaining() <= 0) applyAction({ type: 'timeout' });
        else applyAction({ type: 'advance' });
      }, 700);
    }
  }

  function applyAction(action) {
    if (state.screen !== 'play' || !state.round) return;
    var prev = state.round;
    var next = api().reduce(prev, action, Math.random);
    if (next === prev) return;
    state.round = next;
    onRoundChanged(prev, next);
  }

  function tick() {
    if (state.screen !== 'play' || !state.round || state.round.over) return;
    var left = remaining();
    paintTime(left);
    if (!state.urgent && left <= 10000 && left > 0) {
      state.urgent = true;
      $('timeLive').textContent = '剩餘十秒。';
      paintSpeech(state.round);
    }
    if (left <= 0) applyAction({ type: 'timeout' });
  }

  function startRound() {
    state.runId += 1;
    state.endedRun = 0;
    state.startedAt = Date.now();
    state.urgent = false;
    state.round = api().withNextPair(api().blankRound(), Math.random);
    clearInterval(state.ticker);
    clearTimeout(state.lockTimer);
    $('timeLive').textContent = '';
    $('timeStat').classList.remove('urgent');
    show('play');
    paintMode();
    paintRound(null);
    paintTime(api().ROUND_MS);
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    state.ticker = setInterval(tick, 100);
  }

  function leavePlay() {
    clearInterval(state.ticker);
    clearTimeout(state.lockTimer);
    state.ticker = 0;
    state.round = null;
    show('home');
    paintBest();
    paintMode();
  }

  function showEnd() {
    if (!state.round || state.endedRun === state.runId) return;
    state.endedRun = state.runId;
    clearInterval(state.ticker);
    clearTimeout(state.lockTimer);
    var score = state.round.score;
    var correct = state.round.correct;
    var stars = api().starsFor(score);
    considerBest(score, stars);
    paintStars($('endStars'), stars);
    $('endKicker').textContent = '時間到了！';
    $('endTitle').textContent = titleFor(stars);
    $('endScore').textContent = '分數 ' + score;
    $('endSub').textContent = '答對 ' + correct + ' 題';
    var teacher = !api().shouldSubmit(state.mode);
    $('endNote').textContent = teacher
      ? '老師投影模式，本局不會上榜。'
      : '這一局的分數會記入龍虎榜。';
    var best = readBest();
    $('endBest').textContent = (!teacher && best) ? ('這部裝置最高 ' + best.score + ' 分') : '';
    $('btnEndBoard').hidden = !teacher;
    if (teacher) $('endBoard').textContent = '';
    show('end');
    paintBest();
    sfxTime();
    if (score > 0) burst();
    if (!teacher) publishResult(state.runId, score, stars);
  }

  function publishResult(runId, score, stars) {
    var board = window.AdditionLeaderboard;
    var box = $('endBoard');
    if (!board || !box) return;
    board.renderLoading(box);
    var identity = state.player;
    function paint(result, highlight) {
      if (runId !== state.runId) return;
      board.renderInto(box, result, highlight, { title: '本局龍虎榜' });
    }
    if (!identity) {
      board.load().then(function (result) { paint(result, null); });
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
      return board.load().then(function (result) { paint(result, highlight); });
    }).catch(function () {
      board.load().then(function (result) {
        paint(result, {
          classId: identity.classId,
          studentNo: identity.studentNo,
          score: score
        });
      });
    });
  }

  function openGate(returnTo) {
    state.gateReturn = returnTo || 'home';
    var cls = $('gateClass');
    var no = $('gateNo');
    var board = window.AdditionLeaderboard;
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
        if (no.select) no.select();
      } else {
        cls.focus();
      }
    }, 60);
  }

  function applyGate(forceEmpty) {
    var board = window.AdditionLeaderboard;
    var cls = $('gateClass');
    var no = $('gateNo');
    var err = $('gateErr');
    var btn = $('btnGateGo');
    if (!board) return { ok: true };
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
    $('btnTeacherOpen').hidden = state.teacherUnlocked || state.teacherFormOpen;
    $('teacherForm').hidden = state.teacherUnlocked || !state.teacherFormOpen;
    $('teacherOn').hidden = !state.teacherUnlocked;
  }

  function lockTeacherDelete() {
    state.teacherUnlocked = false;
    state.teacherFormOpen = false;
    state.teacherPin = '';
    state.teacherBusy = false;
    $('teacherPin').value = '';
    $('teacherErr').textContent = '';
    syncTeacherBox();
  }

  function openBoard(returnTo) {
    state.boardReturn = returnTo || 'home';
    syncTeacherBox();
    show('board');
    refreshBoard();
  }

  function refreshBoard() {
    var mount = $('boardMount');
    var board = window.AdditionLeaderboard;
    if (!board) {
      mount.textContent = '龍虎榜暫時未能載入。';
      return;
    }
    var token = ++state.boardToken;
    board.renderLoading(mount);
    board.load().then(function (result) {
      if (token !== state.boardToken) return;
      if (state.screen !== 'board') return;
      var highlight = (api().shouldSubmit(state.mode) && state.player) ? {
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
    var board = window.AdditionLeaderboard;
    if (!state.teacherUnlocked || state.teacherBusy || !board) return;
    var who = row.classId + ' · ' + row.studentNo;
    if (!window.confirm('確定刪除 ' + who + ' 的 ' + row.score + ' 分？刪除後不可以還原。')) return;
    state.teacherBusy = true;
    $('teacherStatus').textContent = '刪除中…';
    board.deleteScore(row, state.teacherPin).then(function (res) {
      state.teacherBusy = false;
      $('teacherStatus').textContent = (res && res.message) || (res && res.ok ? '已刪除。' : '刪除失敗。');
      if (res && res.ok) refreshBoard();
    }).catch(function () {
      state.teacherBusy = false;
      $('teacherStatus').textContent = '刪除失敗。請稍後再試。';
    });
  }

  function buttonFrom(node) {
    while (node && node !== document.body) {
      if (node.tagName === 'BUTTON') return node;
      node = node.parentNode;
    }
    return null;
  }

  function init() {
    if (!api()) return;
    loadSound();
    loadMode();
    setSound(state.sound);
    paintBest();
    paintMode();

    $('modeStudent').addEventListener('click', function () { setMode('student'); });
    $('modeTeacher').addEventListener('click', function () { setMode('teacher'); });
    $('chkSoundHome').addEventListener('change', function () { setSound(this.checked); });
    $('chkSound').addEventListener('change', function () { setSound(this.checked); });

    $('btnStart').addEventListener('click', function () {
      unlockAudio();
      if (!api().shouldSubmit(state.mode) || !window.AdditionLeaderboard) startRound();
      else openGate('home');
    });
    $('btnOpenBoard').addEventListener('click', function () { openBoard('home'); });

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
      window.AdditionLeaderboard.rememberIdentity(state.player);
      unlockAudio();
      startRound();
    });
    $('btnGateBack').addEventListener('click', function () {
      show(state.gateReturn || 'home');
      if (state.screen === 'home') {
        paintBest();
        paintMode();
      }
    });

    $('keypad').addEventListener('click', function (ev) {
      var btn = buttonFrom(ev.target);
      if (!btn || btn.disabled) return;
      var key = btn.getAttribute('data-key');
      if (key === 'clear') applyAction({ type: 'clear' });
      else if (key === 'back') applyAction({ type: 'back' });
      else if (key === 'ok') applyAction({ type: 'submit' });
      else applyAction({ type: 'digit', digit: key });
    });

    document.addEventListener('keydown', function (ev) {
      if (state.screen !== 'play') return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      var k = ev.key;
      if (k >= '0' && k <= '9') {
        ev.preventDefault();
        applyAction({ type: 'digit', digit: k });
      } else if (k === 'Backspace') {
        ev.preventDefault();
        applyAction({ type: 'back' });
      } else if (k === 'Delete' || k === 'Escape') {
        ev.preventDefault();
        applyAction({ type: 'clear' });
      } else if (k === 'Enter') {
        if (ev.repeat) return;
        if (ev.target && ev.target.id === 'btnHome') return;
        ev.preventDefault();
        applyAction({ type: 'submit' });
      } else if (k === ' ' || k === 'Spacebar') {
        ev.preventDefault();
      }
    });

    $('btnHome').addEventListener('click', function () {
      if (state.round && !state.round.over) {
        if (!window.confirm('返回主頁？這一局的分數不會記錄。')) return;
      }
      leavePlay();
    });
    $('btnAgain').addEventListener('click', function () {
      unlockAudio();
      if (!api().shouldSubmit(state.mode) || !window.AdditionLeaderboard) startRound();
      else openGate('end');
    });
    $('btnMenu').addEventListener('click', function () {
      show('home');
      paintBest();
      paintMode();
    });
    $('btnEndBoard').addEventListener('click', function () { openBoard('end'); });

    $('btnBoardBack').addEventListener('click', function () {
      lockTeacherDelete();
      show(state.boardReturn || 'home');
      if (state.screen === 'home') {
        paintBest();
        paintMode();
      }
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
      if (state.teacherBusy || !window.AdditionLeaderboard) return;
      var pinEl = $('teacherPin');
      var err = $('teacherErr');
      var btn = $('btnTeacherUnlock');
      state.teacherBusy = true;
      btn.disabled = true;
      err.textContent = '';
      window.AdditionLeaderboard.verifyTeacherPin(pinEl.value).then(function (res) {
        state.teacherBusy = false;
        btn.disabled = false;
        if (!res || !res.ok) {
          err.textContent = (res && res.message) || '老師密碼不正確。';
          pinEl.focus();
          return;
        }
        state.teacherPin = res.pin || '';
        pinEl.value = '';
        state.teacherUnlocked = true;
        state.teacherFormOpen = false;
        $('teacherStatus').textContent = '已解鎖。按「刪除」清除一筆最高分。如果還有其他紀錄，會顯示下一筆。';
        syncTeacherBox();
        refreshBoard();
      }).catch(function () {
        state.teacherBusy = false;
        btn.disabled = false;
        err.textContent = '暫時無法核對老師密碼。請稍後再試。';
      });
    });

    document.addEventListener('pointerdown', unlockAudio);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
