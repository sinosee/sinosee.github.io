/* 圖形分割和拼砌 — classroom board. Depends on geom.js (ShapeGeom). */
(function () {
  'use strict';
  const G = window.ShapeGeom;

  const HOUSE = [[0, 0], [4, 0], [4, 2], [2, 3], [0, 2]];
  const PARA = [[0, 0], [4, 0], [7, 3], [3, 3]];
  const RECT = [[0, 0], [6, 0], [6, 4], [0, 4]];
  const USHAPE = [[0, 0], [6, 0], [6, 3], [4, 3], [4, 1], [2, 1], [2, 3], [0, 3]];
  const TSHAPE = [[0, 2], [0, 4], [4, 4], [4, 2], [3, 2], [3, 0], [1, 0], [1, 2]];
  const TRI = [[0, 0], [2, 0], [0, 2]];
  const RECT2 = [[0, 0], [4, 0], [4, 2], [0, 2]];
  const CENTER_TRI = [[0, 0], [2, 0], [1, 1]];

  const COL = {
    same: '#7eb6d4',
    a: '#7eb6d4',
    b: '#e2b15c',
    c: '#8fbf9f',
    d: '#d9897a',
    e: '#b7a4d4',
    part: '#f0c2a0'
  };

  function goalText(parts) {
    const bits = parts.map(function (p) { return p.count + ' 個' + p.name; });
    if (bits.length <= 1) return bits[0] || '';
    if (bits.length === 2) return bits[0] + '和' + bits[1];
    return bits.slice(0, -1).join('、') + '和' + bits[bits.length - 1];
  }

  const ACTIVITIES = [
    {
      id: 'name-h', lesson: 'split', group: '沿虛線講名稱',
      title: '橫虛線：長方形', aim: '講出分成咩圖形',
      kind: 'name', poly: RECT, cuts: [[[0, 2], [6, 2]]],
      prompt: '長方形沿虛線剪開。可以拖開兩塊，再選出正確描述。',
      choices: [
        { id: 'ok', text: '2 個長方形，形狀和大小都相同', correct: true },
        { id: 'b', text: '2 個梯形，形狀和大小都相同', correct: false },
        { id: 'c', text: '2 個三角形，形狀和大小都相同', correct: false },
        { id: 'd', text: '2 個長方形，大小不相同', correct: false }
      ]
    },
    {
      id: 'name-s', lesson: 'split', group: '沿虛線講名稱',
      title: '斜虛線：長方形', aim: '講出分成咩圖形',
      kind: 'name', poly: RECT, cuts: [[[0, 1], [6, 3]]],
      prompt: '同一塊長方形，沿斜虛線剪開。拖開兩塊，再選出正確描述。',
      choices: [
        { id: 'a', text: '2 個長方形，形狀和大小都相同', correct: false },
        { id: 'ok', text: '2 個梯形，形狀和大小都相同', correct: true },
        { id: 'c', text: '2 個平行四邊形，形狀和大小都相同', correct: false },
        { id: 'd', text: '1 個三角形和 1 個梯形', correct: false }
      ]
    },
    {
      id: 'draw-pt', lesson: 'split', group: '分割成相同的圖形',
      title: '平行四邊形分成 2 個三角形', aim: '畫一條線段',
      kind: 'draw', poly: PARA, congruent: true,
      parts: [{ name: '三角形', count: 2 }],
      solution: [[[0, 0], [7, 3]]],
      prompt: '畫一條線段，把平行四邊形分割成 2 個形狀和大小都相同的三角形。'
    },
    {
      id: 'draw-pz', lesson: 'split', group: '分割成相同的圖形',
      title: '平行四邊形分成 2 個梯形', aim: '畫一條線段',
      kind: 'draw', poly: PARA, congruent: true,
      parts: [{ name: '梯形', count: 2 }],
      solution: [[[1, 0], [6, 3]]],
      prompt: '畫一條線段，把平行四邊形分割成 2 個形狀和大小都相同的梯形。'
    },
    {
      id: 'draw-r4', lesson: 'split', group: '分割成相同的圖形',
      title: '長方形分成 4 個長方形', aim: '可以畫多過一條線',
      kind: 'draw', poly: RECT, congruent: true,
      parts: [{ name: '長方形', count: 4 }],
      solution: [[[3, 0], [3, 4]], [[0, 2], [6, 2]]],
      prompt: '畫線段，把長方形分割成 4 個形狀和大小都相同的長方形。'
    },
    {
      id: 'draw-t4', lesson: 'split', group: '分割成相同的圖形',
      title: '長方形分成 4 個三角形', aim: '可以畫多過一條線',
      kind: 'draw', poly: RECT, congruent: true,
      parts: [{ name: '三角形', count: 4 }],
      solution: [[[3, 0], [3, 4]], [[0, 0], [3, 4]], [[3, 0], [6, 4]]],
      prompt: '畫線段，把長方形分割成 4 個形狀和大小都相同的三角形。'
    },
    {
      id: 'draw-s6', lesson: 'split', group: '分割成相同的圖形',
      title: '長方形分成 6 個正方形', aim: '可以畫多過一條線',
      kind: 'draw', poly: RECT, congruent: true,
      parts: [{ name: '正方形', count: 6 }],
      solution: [[[2, 0], [2, 4]], [[4, 0], [4, 4]], [[0, 2], [6, 2]]],
      prompt: '畫線段，把長方形分割成 6 個形狀和大小都相同的正方形。'
    },
    {
      id: 'draw-h1', lesson: 'split', group: '分割成不同的圖形',
      title: '屋形分成三角形和長方形', aim: '各塊可以不同',
      kind: 'draw', poly: HOUSE, congruent: false,
      parts: [{ name: '三角形', count: 1 }, { name: '長方形', count: 1 }],
      solution: [[[0, 2], [4, 2]]],
      prompt: '畫線段，把屋形分割成 1 個三角形和 1 個長方形。'
    },
    {
      id: 'draw-h2', lesson: 'split', group: '分割成不同的圖形',
      title: '屋形分成 2 個梯形', aim: '各塊可以不同',
      kind: 'draw', poly: HOUSE, congruent: false,
      parts: [{ name: '梯形', count: 2 }],
      solution: [[[2, 0], [2, 3]]],
      prompt: '畫線段，把屋形分割成 2 個梯形。'
    },
    {
      id: 'draw-u1', lesson: 'split', group: '分割成不同的圖形',
      title: 'U 形分成長方形和正方形', aim: '各塊可以不同',
      kind: 'draw', poly: USHAPE, congruent: false,
      parts: [{ name: '長方形', count: 1 }, { name: '正方形', count: 2 }],
      solution: [[[0, 1], [6, 1]]],
      prompt: '畫線段，把 U 形分割成 1 個長方形和 2 個正方形。'
    },
    {
      id: 'draw-u2', lesson: 'split', group: '分割成不同的圖形',
      title: 'U 形分成 3 個長方形', aim: '各塊可以不同',
      kind: 'draw', poly: USHAPE, congruent: false,
      parts: [{ name: '長方形', count: 3 }],
      solution: [[[2, 0], [2, 3]], [[4, 0], [4, 3]]],
      prompt: '畫線段，把 U 形分割成 3 個長方形。'
    },
    {
      id: 'draw-t1', lesson: 'split', group: '分割成不同的圖形',
      title: 'T 形分成正方形和梯形', aim: '各塊可以不同',
      kind: 'draw', poly: TSHAPE, congruent: false,
      parts: [{ name: '正方形', count: 1 }, { name: '梯形', count: 2 }],
      solution: [[[0, 2], [4, 2]], [[1, 2], [3, 4]]],
      prompt: '畫線段，把 T 形分割成 1 個正方形和 2 個梯形。'
    },
    {
      id: 'draw-t2', lesson: 'split', group: '分割成不同的圖形',
      title: 'T 形分成三角形、正方形和梯形', aim: '各塊可以不同',
      kind: 'draw', poly: TSHAPE, congruent: false,
      parts: [{ name: '三角形', count: 1 }, { name: '正方形', count: 1 }, { name: '梯形', count: 1 }],
      solution: [[[0, 2], [4, 2]], [[0, 2], [4, 3]]],
      prompt: '畫線段，把 T 形分割成 1 個三角形、1 個正方形和 1 個梯形。'
    },
    {
      id: 'tri2', lesson: 'join', group: '用相同的圖形拼砌',
      title: '2 個等邊三角形', aim: '拼好再講名稱',
      kind: 'tri', count: 2,
      accept: ['菱形'],
      names: ['菱形', '梯形', '平行四邊形', '正方形'],
      solution: { cells: [{ p: 0, q: 0, down: false }, { p: 0, q: 0, down: true }], name: '菱形' },
      prompt: '用 2 個相同的等邊三角形拼出一個四邊形，再選出名稱。可以旋轉。'
    },
    {
      id: 'tri3', lesson: 'join', group: '用相同的圖形拼砌',
      title: '3 個等邊三角形', aim: '拼好再講名稱',
      kind: 'tri', count: 3,
      accept: ['梯形'],
      names: ['菱形', '梯形', '平行四邊形', '三角形'],
      solution: {
        cells: [{ p: 0, q: 0, down: false }, { p: 0, q: 0, down: true }, { p: 0, q: 1, down: false }],
        name: '梯形'
      },
      prompt: '用 3 個相同的等邊三角形拼出一個四邊形，再選出名稱。'
    },
    {
      id: 'tri4', lesson: 'join', group: '用相同的圖形拼砌',
      title: '4 個等邊三角形', aim: '有兩種拼法',
      kind: 'tri', count: 4,
      accept: ['平行四邊形', '等邊三角形'],
      names: ['平行四邊形', '等邊三角形', '梯形', '菱形', '正方形'],
      solution: {
        cells: [
          { p: 0, q: 0, down: false }, { p: 0, q: 0, down: true },
          { p: 0, q: 1, down: false }, { p: 0, q: 1, down: true }
        ],
        name: '平行四邊形'
      },
      prompt: '用 4 個相同的等邊三角形拼一個圖形。可以拼成平行四邊形，也可以拼成更大的等邊三角形。拼好再選名稱。'
    },
    {
      id: 'iso2', lesson: 'join', group: '用相同的圖形拼砌',
      title: '2 個等腰直角三角形', aim: '拼好再講名稱',
      kind: 'join',
      pieces: [
        { local: TRI, color: COL.same },
        { local: TRI, color: COL.same }
      ],
      accept: ['正方形', '等腰直角三角形'],
      names: ['正方形', '等腰直角三角形', '長方形', '平行四邊形', '梯形'],
      solution: { placements: [{ k: 0, tx: 0, ty: 0 }, { k: 2, tx: 2, ty: 2 }], name: '正方形' },
      bounds: { minX: -3, minY: -3, maxX: 6, maxY: 5 },
      prompt: '用 2 個相同的等腰直角三角形拼一個圖形，再選出名稱。斜邊相貼，或者直角邊相貼，結果可以不同。'
    },
    {
      id: 'iso4', lesson: 'join', group: '用相同的圖形拼砌',
      title: '4 個等腰直角三角形拼正方形', aim: '拖入方格再旋轉',
      kind: 'join',
      pieces: [0, 1, 2, 3].map(function () { return { local: CENTER_TRI, color: COL.same }; }),
      accept: ['正方形'],
      names: ['正方形', '長方形', '平行四邊形', '梯形'],
      solution: {
        placements: [{ k: 0, tx: 0, ty: 0 }, { k: 1, tx: 2, ty: 0 }, { k: 2, tx: 2, ty: 2 }, { k: 3, tx: 0, ty: 2 }],
        name: '正方形'
      },
      bounds: { minX: -2, minY: -2, maxX: 6, maxY: 5 },
      prompt: '用 4 個相同的等腰直角三角形拼成一個正方形，再選出名稱。直角可以碰在中間。'
    },
    {
      id: 'fill-trap', lesson: 'join', group: '用不同的圖形拼砌',
      title: '不同圖形拼成梯形', aim: '填滿虛線框',
      kind: 'fill',
      targetName: '梯形',
      target: [[0, 0], [4, 0], [3, 2], [1, 2]],
      pieces: [
        { local: [[0, 0], [4, 0], [3, 2], [2, 1], [1, 2]], color: COL.e },
        { local: [[1, 2], [2, 1], [3, 2]], color: COL.b }
      ],
      solution: { placements: [{ k: 0, tx: 0, ty: 0 }, { k: 0, tx: 0, ty: 0 }] },
      bounds: { minX: -1, minY: -1, maxX: 6, maxY: 4 },
      prompt: '用這兩塊不同的圖形，填滿虛線裏的梯形。可以旋轉。'
    },
    {
      id: 'fill-hex', lesson: 'join', group: '用不同的圖形拼砌',
      title: '不同圖形拼成六邊形', aim: '填滿虛線框',
      kind: 'fill',
      targetName: '六邊形',
      target: [[0, 2], [1, 1], [4, 1], [5, 2], [3, 3], [2, 3]],
      pieces: [
        { local: [[1, 1], [4, 1], [3, 3], [2, 3]], color: COL.d },
        { local: [[0, 2], [1, 1], [2, 3]], color: COL.b },
        { local: [[4, 1], [5, 2], [3, 3]], color: COL.c }
      ],
      solution: { placements: [{ k: 0, tx: 0, ty: 0 }, { k: 0, tx: 0, ty: 0 }, { k: 0, tx: 0, ty: 0 }] },
      bounds: { minX: -1, minY: -1, maxX: 7, maxY: 5 },
      prompt: '用梯形和兩個三角形，填滿虛線裏的六邊形。'
    },
    {
      id: 'miss-r', lesson: 'join', group: '補上缺少的一塊',
      title: '補成一個長方形', aim: '由下面揀一塊',
      kind: 'missing',
      targetName: '長方形',
      target: [[0, 0], [6, 0], [6, 4], [0, 4]],
      partial: [[0, 0], [6, 0], [6, 4], [4, 4], [3, 2], [2, 4], [0, 4]],
      palette: palette(),
      solutionIndex: 0,
      solution: { k: 0, tx: 2, ty: 2 },
      bounds: { minX: -1, minY: -1, maxX: 8, maxY: 6 },
      prompt: '橘色圖形缺了一塊。從下面揀一塊補上，拼成一個長方形。只需用一塊。'
    },
    {
      id: 'miss-s', lesson: 'join', group: '補上缺少的一塊',
      title: '補成一個正方形', aim: '由下面揀一塊',
      kind: 'missing',
      targetName: '正方形',
      target: [[0, 0], [4, 0], [4, 4], [0, 4]],
      partial: [[0, 0], [2, 0], [4, 2], [4, 4], [0, 4]],
      palette: palette(),
      solutionIndex: 1,
      solution: { k: 1, tx: 4, ty: 0 },
      bounds: { minX: -1, minY: -1, maxX: 7, maxY: 6 },
      prompt: '橘色圖形缺了一角。從下面揀一塊補上，拼成一個正方形。'
    },
    {
      id: 'miss-t', lesson: 'join', group: '補上缺少的一塊',
      title: '補成一個三角形', aim: '由下面揀一塊',
      kind: 'missing',
      targetName: '三角形',
      target: [[0, 0], [6, 0], [0, 6]],
      partial: [[0, 0], [2, 0], [1, 2], [3, 2], [4, 0], [6, 0], [0, 6]],
      palette: palette(),
      solutionIndex: 2,
      solution: { k: 0, tx: 2, ty: 0 },
      bounds: { minX: -2, minY: -1, maxX: 8, maxY: 8 },
      prompt: '橘色圖形缺了一塊。從下面揀一塊補上，拼成一個三角形。'
    },
    {
      id: 'yesno', lesson: 'join', group: '可唔可以拼成',
      title: '三塊圖形可以拼成嗎', aim: '可以先試拼',
      kind: 'yesno',
      pieces: [
        { local: TRI, color: COL.a },
        { local: TRI, color: COL.b },
        { local: RECT2, color: COL.c }
      ],
      rows: [
        { id: 'tri', name: '三角形', ok: false },
        { id: 'sq', name: '正方形', ok: false },
        { id: 'trap', name: '梯形', ok: true },
        { id: 'para', name: '平行四邊形', ok: true }
      ],
      solution: {
        placements: [{ k: 1, tx: 2, ty: 0 }, { k: 0, tx: 6, ty: 0 }, { k: 0, tx: 2, ty: 0 }]
      },
      bounds: { minX: -1, minY: -1, maxX: 12, maxY: 6 },
      prompt: '用下面 3 塊（兩個相同的直角三角形和一個長方形），可以拼出下列圖形嗎？可以先在方格上試拼，再選可以或不可以。'
    }
  ];

  function palette() {
    return [
      { local: [[0, 2], [2, 2], [1, 0]], color: COL.b, name: '三角形' },
      { local: [[0, 0], [2, 0], [0, 2]], color: COL.a, name: '直角三角形' },
      { local: [[0, 0], [2, 0], [1, 2], [-1, 2]], color: COL.c, name: '平行四邊形' },
      { local: [[0, 0], [3, 0], [2, 1], [1, 1]], color: COL.e, name: '梯形' }
    ];
  }

  const S = {
    mode: 'student',
    screen: 'home',
    lesson: 'split',
    taskId: null,
    cuts: [],
    view: 'edit',
    pieces: [],
    offsets: [],
    choice: null,
    yn: {},
    marked: false,
    feedback: null,
    selected: null,
    revealed: false
  };
  let frame = null;
  let drag = null;

  function task() {
    return ACTIVITIES.find(function (a) { return a.id === S.taskId; }) || null;
  }
  function lessonTasks() {
    return ACTIVITIES.filter(function (a) { return a.lesson === S.lesson; });
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function centroid(xy) {
    let x = 0, y = 0;
    xy.forEach(function (p) { x += p[0]; y += p[1]; });
    return [x / xy.length, y / xy.length];
  }
  function explodeOffsets(pieces) {
    const cs = pieces.map(function (p) { return centroid(p.xy); });
    const gx = cs.reduce(function (s, c) { return s + c[0]; }, 0) / cs.length;
    const gy = cs.reduce(function (s, c) { return s + c[1]; }, 0) / cs.length;
    return cs.map(function (c) {
      let dx = c[0] - gx, dy = c[1] - gy;
      const len = Math.hypot(dx, dy) || 1;
      return [dx / len * 0.72, dy / len * 0.72];
    });
  }

  function resetTask() {
    const t = task();
    S.cuts = [];
    S.view = 'edit';
    S.choice = null;
    S.yn = {};
    S.marked = false;
    S.feedback = null;
    S.selected = null;
    S.revealed = false;
    S.offsets = [];
    S.pieces = [];
    if (!t) return;
    if (t.kind === 'name') {
      const res = G.splitPolygon(t.poly, t.cuts);
      S.result = res.ok ? res.pieces : [];
      S.offsets = S.result.map(function () { return [0, 0]; });
    }
    if (t.kind === 'tri') {
      for (let i = 0; i < t.count; i++) {
        S.pieces.push({ id: 'p' + i, down: i % 2 === 1, p: 0, q: 0, placed: false, color: COL.same });
      }
    }
    if (t.kind === 'join' || t.kind === 'fill' || t.kind === 'yesno') {
      t.pieces.forEach(function (src, i) {
        S.pieces.push({
          id: 'p' + i, local: src.local, color: src.color, k: 0,
          tx: 0, ty: 0, placed: t.kind === 'yesno'
        });
      });
      if (t.kind === 'yesno') {
        S.pieces[0].tx = 0; S.pieces[0].ty = 0;
        S.pieces[1].tx = 3; S.pieces[1].ty = 0;
        S.pieces[2].tx = 6; S.pieces[2].ty = 0;
      }
    }
    if (t.kind === 'missing') {
      t.palette.forEach(function (src, i) {
        S.pieces.push({
          id: 'p' + i, local: src.local, color: src.color, name: src.name,
          k: 0, tx: 0, ty: 0, placed: false
        });
      });
    }
  }

  function render() {
    const app = document.getElementById('app');
    if (S.screen === 'home') app.innerHTML = homeHtml();
    else if (S.screen === 'list') app.innerHTML = listHtml();
    else app.innerHTML = taskHtml();
    bind();
    const pause = document.getElementById('pause');
    pause.classList.toggle('on', S.screen === 'task' && S.mode === 'teacher' && S.paused);
  }

  function homeHtml() {
    return ''
      + '<div class="top"><a class="back" href="../">返回</a></div>'
      + '<h1>圖形分割和拼砌</h1>'
      + '<p class="sub">四年級 · 單元六 · 第18課、第19課</p>'
      + '<div class="modes">'
      + modeBtn('student', '學生模式', '自己畫、自己拼，按檢查')
      + modeBtn('teacher', '老師模式', '投影時可暫停、顯示答案')
      + '</div>'
      + '<div class="lessons">'
      + '<button type="button" class="lesson" id="go-split"><b>圖形分割</b><span>沿虛線講名稱，或在方格上畫線切開</span></button>'
      + '<button type="button" class="lesson" id="go-join"><b>圖形拼砌</b><span>拖動圖形拼埋，或補上缺少的一塊</span></button>'
      + '</div>'
      + '<p class="note">點住圓點拖出線段，就可以切開圖形。拼砌時拖動圖形，貼住方格，需要就可以旋轉。</p>'
      + '<div class="foot">'
      + '<img class="qr" src="qrcode.png" width="280" height="340" alt="圖形分割和拼砌二維碼">'
      + '<div><img class="dog" src="assets/mascot.jpg" width="52" height="52" alt="">'
      + '<p>平板掃碼，打開呢一頁</p>'
      + '<a href="https://sinosee.github.io/p4-shape-compose/">sinosee.github.io/p4-shape-compose</a></div>'
      + '</div>';
  }
  function modeBtn(id, title, desc) {
    return '<button type="button" class="mode' + (S.mode === id ? ' sel' : '') + '" data-mode="' + id + '"><b>'
      + title + '</b><span>' + desc + '</span></button>';
  }
  function listHtml() {
    const title = S.lesson === 'split' ? '圖形分割' : '圖形拼砌';
    let html = '<div class="top"><button type="button" class="back" id="go-home">返回</button></div>';
    html += '<h1>' + title + '</h1><p class="sub">揀一道題目。做完可以再揀下一題。</p>';
    let group = '';
    lessonTasks().forEach(function (a) {
      if (a.group !== group) {
        if (group) html += '</div>';
        group = a.group;
        html += '<div class="group">' + esc(group) + '</div><div class="tasklist">';
      }
      html += '<button type="button" class="taskbtn" data-task="' + a.id + '"><span><b>' + esc(a.title) + '</b><small>'
        + esc(a.aim) + '</small></span></button>';
    });
    if (group) html += '</div>';
    return html;
  }

  function taskHtml() {
    const t = task();
    const list = lessonTasks();
    const idx = list.findIndex(function (a) { return a.id === t.id; });
    let html = '<div class="stageHead"><button type="button" class="back" id="go-list">返回題目</button><div class="pills">';
    html += '<span class="pill">' + (S.mode === 'teacher' ? '老師' : '學生') + '</span>';
    if (S.mode === 'teacher') {
      html += '<button type="button" class="pill" id="btn-pause">暫停</button>';
      html += '<button type="button" class="pill on" id="btn-reveal">顯示答案</button>';
    }
    html += '</div></div>';
    html += '<p class="prompt">' + esc(t.prompt) + '</p>';
    const fb = S.feedback;
    html += '<div class="feedback' + (fb ? ' ' + fb.tone : '') + '" id="feedback" aria-live="polite">'
      + (fb ? esc(fb.text) : (t.kind === 'draw' || t.kind === 'name' ? '畫好之後，按檢查。' : '拼好之後，按檢查。')) + '</div>';
    if (t.kind === 'name' || t.kind === 'tri' || t.kind === 'join') {
      const names = t.choices || t.names.map(function (n) { return { id: n, text: n }; });
      html += '<div class="choices">';
      names.forEach(function (c) {
        html += '<button type="button" class="choice' + (S.choice === c.id ? ' sel' : '') + '" data-choice="' + esc(c.id) + '">'
          + esc(c.text || c.id) + '</button>';
      });
      html += '</div>';
    }
    if (t.kind === 'yesno') {
      t.rows.forEach(function (row) {
        let cls = 'yn';
        if (S.marked) cls += S.yn[row.id] === (row.ok ? 'yes' : 'no') ? ' good' : ' nope';
        html += '<div class="' + cls + '"><b>' + esc(row.name) + '</b>';
        html += ynBtn(row.id, 'yes', '可以');
        html += ynBtn(row.id, 'no', '不可以');
        html += '</div>';
      });
    }
    html += '<div class="boardCard">' + boardSvg(t) + '</div>';
    html += '<div class="tools">';
    html += '<button type="button" class="btn" id="btn-reset">重設</button>';
    if (t.kind === 'draw' && S.view === 'edit') html += '<button type="button" class="btn" id="btn-undo">清除上一條</button>';
    if (t.kind === 'draw' && S.view === 'result') html += '<button type="button" class="btn" id="btn-edit">再改線段</button>';
    if (t.kind === 'name' || (t.kind === 'draw' && S.view === 'result')) html += '<button type="button" class="btn" id="btn-apart">拆開</button>';
    if (t.kind === 'tri' || t.kind === 'join' || t.kind === 'fill' || t.kind === 'missing' || t.kind === 'yesno') {
      html += '<button type="button" class="btn" id="btn-rot"' + (S.selected == null ? ' disabled' : '') + '>旋轉</button>';
    }
    html += '<button type="button" class="btn primary" id="btn-check">檢查</button>';
    html += '</div>';
    html += '<div class="navrow">';
    if (idx > 0) html += '<button type="button" class="btn" id="btn-prev">上一題</button>';
    if (idx < list.length - 1) html += '<button type="button" class="btn" id="btn-next">下一題</button>';
    html += '</div>';
    if (t.kind === 'draw' && S.view === 'edit') {
      html += '<p class="fine">已畫 ' + S.cuts.length + ' 條線段。點住圓點，拖到另一個圓點。</p>';
    }
    return html;
  }
  function ynBtn(id, val, label) {
    const sel = S.yn[id] === val ? ' sel' : '';
    return '<button type="button" class="' + sel + '" data-yn="' + id + '" data-val="' + val + '">' + label + '</button>';
  }

  const CELL = 64;
  const PAD = 28;

  function boundsOf(polys, extra) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    polys.forEach(function (poly) {
      poly.forEach(function (p) {
        minX = Math.min(minX, p[0]); minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]); maxY = Math.max(maxY, p[1]);
      });
    });
    const e = extra == null ? 0.6 : extra;
    return { minX: minX - e, minY: minY - e, maxX: maxX + e, maxY: maxY + e };
  }

  function boardSvg(t) {
    if (t.kind === 'tri') return triSvg(t);
    if (t.kind === 'draw' || t.kind === 'name') return splitSvg(t);
    return polySvg(t);
  }

  function splitSvg(t) {
    const b = boundsOf([t.poly], 0.55);
    frame = { kind: 'grid', minX: b.minX, maxY: b.maxY, cell: CELL, pad: PAD };
    const w = (b.maxX - b.minX) * CELL + PAD * 2;
    const h = (b.maxY - b.minY) * CELL + PAD * 2;
    let s = '<svg id="board" viewBox="0 0 ' + w + ' ' + h + '" role="application" aria-label="方格圖形">';
    s += gridLines(b, w, h);
    if (S.view === 'result' && S.result && S.result.length) {
      S.result.forEach(function (p, i) {
        const off = S.offsets[i] || [0, 0];
        s += polyShape(p.xy, off, COLS[i % COLS.length], true, 'data-pid="r' + i + '"');
        const c = centroid(p.xy);
        const at = g2s(c[0] + off[0], c[1] + off[1]);
        s += label(at[0], at[1], p.name);
      });
    } else if (t.kind === 'name' && S.result) {
      S.result.forEach(function (p, i) {
        const off = S.offsets[i] || [0, 0];
        s += polyShape(p.xy, off, COLS[i % COLS.length], true, 'data-pid="r' + i + '"');
      });
      (t.cuts || []).forEach(function (c) {
        const a = g2s(c[0][0], c[0][1]), d = g2s(c[1][0], c[1][1]);
        s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + d[0] + '" y2="' + d[1] + '" stroke="#c05621" stroke-width="4" stroke-dasharray="10 8" pointer-events="none"/>';
      });
    } else {
      s += polyShape(t.poly, [0, 0], '#8ec5d6', false, '');
      S.cuts.forEach(function (c) {
        const a = g2s(c[0][0], c[0][1]), d = g2s(c[1][0], c[1][1]);
        s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + d[0] + '" y2="' + d[1] + '" stroke="#c05621" stroke-width="5" stroke-linecap="round" pointer-events="none"/>';
      });
      if (S.draft) {
        const a = g2s(S.draft[0][0], S.draft[0][1]);
        const d = g2s(S.draft[1][0], S.draft[1][1]);
        s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + d[0] + '" y2="' + d[1] + '" stroke="#c05621" stroke-width="4" stroke-dasharray="8 6" pointer-events="none"/>';
      }
      G.bboxGridPoints(t.poly).forEach(function (p) {
        const at = g2s(p[0], p[1]);
        s += '<circle class="dot" cx="' + at[0] + '" cy="' + at[1] + '" r="7" fill="#1a6a84" data-x="' + p[0] + '" data-y="' + p[1] + '"/>';
      });
    }
    s += '</svg>';
    return s;
  }

  const COLS = ['#7eb6d4', '#e2b15c', '#8fbf9f', '#d9897a', '#b7a4d4', '#e0c36a'];

  function g2s(x, y) {
    return [PAD + (x - frame.minX) * CELL, PAD + (frame.maxY - y) * CELL];
  }
  function gridLines(b) {
    let s = '';
    const x0 = Math.ceil(b.minX), x1 = Math.floor(b.maxX);
    const y0 = Math.ceil(b.minY), y1 = Math.floor(b.maxY);
    for (let x = x0; x <= x1; x++) {
      const a = g2s(x, b.minY), c = g2s(x, b.maxY);
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + c[0] + '" y2="' + c[1] + '" stroke="#d5e2ea" stroke-width="2"/>';
    }
    for (let y = y0; y <= y1; y++) {
      const a = g2s(b.minX, y), c = g2s(b.maxX, y);
      s += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + c[0] + '" y2="' + c[1] + '" stroke="#d5e2ea" stroke-width="2"/>';
    }
    return s;
  }
  function polyShape(xy, off, fill, interactive, extra) {
    const pts = xy.map(function (p) {
      const at = g2s(p[0] + (off ? off[0] : 0), p[1] + (off ? off[1] : 0));
      return at[0] + ',' + at[1];
    }).join(' ');
    return '<polygon points="' + pts + '" fill="' + fill + '" stroke="#1c4e63" stroke-width="3" stroke-linejoin="round" '
      + (interactive ? '' : 'pointer-events="none" ') + extra + '/>';
  }
  function label(x, y, text) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="800" fill="#1c2b33" stroke="#fff" stroke-width="6" paint-order="stroke" pointer-events="none">' + esc(text) + '</text>';
  }

  function polySvg(t) {
    const tray = t.kind !== 'yesno';
    const trayRight = layoutTray(t);
    const b = {
      minX: t.bounds.minX,
      maxX: Math.max(t.bounds.maxX, trayRight),
      maxY: t.bounds.maxY,
      minY: tray ? t.bounds.minY - 4.6 : t.bounds.minY
    };
    const trayY = t.bounds.minY - 0.2;
    frame = {
      kind: 'grid', minX: b.minX, maxY: b.maxY, cell: CELL, pad: PAD,
      playMinY: t.bounds.minY, tray: tray
    };
    const w = (b.maxX - b.minX) * CELL + PAD * 2;
    const h = (b.maxY - b.minY) * CELL + PAD * 2;
    let s = '<svg id="board" viewBox="0 0 ' + w + ' ' + h + '" role="application" aria-label="拼圖方格">';
    s += gridLines(t.bounds);
    if (t.target) {
      const pts = t.target.map(function (p) { const at = g2s(p[0], p[1]); return at[0] + ',' + at[1]; }).join(' ');
      s += '<polygon points="' + pts + '" fill="rgba(232,240,243,.95)" stroke="#3e6574" stroke-width="4" stroke-dasharray="9 7" stroke-linejoin="round" pointer-events="none"/>';
    }
    if (t.partial) s += polyShape(t.partial, [0, 0], COL.part, false, '');
    if (tray) {
      const a = g2s(b.minX, trayY), c = g2s(b.maxX, b.minY);
      s += '<rect x="' + Math.min(a[0], c[0]) + '" y="' + Math.min(a[1], c[1]) + '" width="' + Math.abs(c[0] - a[0]) + '" height="' + Math.abs(c[1] - a[1]) + '" fill="#f4f7f8" stroke="#d5e2ea"/>';
      const lab = g2s(b.minX + 0.2, b.minY + 2.55);
      s += '<text x="' + (PAD + 8) + '" y="' + lab[1] + '" font-size="18" font-weight="800" fill="#52656e">圖形（拖上方格）</text>';
    }
    S.pieces.forEach(function (p) {
      const xy = G.placePoly(p.local, p.k, p.tx, p.ty);
      const sel = S.selected === p.id;
      s += polyShape(xy, [0, 0], p.color, true, 'data-pid="' + p.id + '"' + (sel ? ' stroke="#0e534a" stroke-width="5"' : ''));
    });
    s += '</svg>';
    return s;
  }

  function layoutTray(t) {
    if (t.kind === 'yesno') return t.bounds.maxX;
    let x = t.bounds.minX + 0.3;
    const cy = t.bounds.minY - 2.35;
    S.pieces.forEach(function (p) {
      const xy = G.placePoly(p.local, p.k, 0, 0);
      const xs = xy.map(function (v) { return v[0]; });
      const minx = Math.min.apply(null, xs);
      const maxx = Math.max.apply(null, xs);
      if (!p.placed) {
        const c0 = centroid(xy);
        p.tx = x - minx;
        p.ty = cy - c0[1];
      }
      x += (maxx - minx) + 0.7;
    });
    return Math.max(t.bounds.maxX, x + 0.2);
  }

  function triSvg(t) {
    const cells = triCells();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    function grow(pt) {
      minX = Math.min(minX, pt.x); maxX = Math.max(maxX, pt.x);
      minY = Math.min(minY, pt.y); maxY = Math.max(maxY, pt.y);
    }
    cells.forEach(function (c) { G.cellWorld(c).forEach(grow); });
    minY -= 1.8;
    minX -= 0.4; maxX += 0.4; maxY += 0.35; minY -= 0.2;
    const SC = 86;
    frame = { kind: 'tri', minX: minX, maxY: maxY, cell: SC, pad: PAD, playMinY:  -0.15 };
    const w = (maxX - minX) * SC + PAD * 2;
    const h = (maxY - minY) * SC + PAD * 2;
    let s = '<svg id="board" viewBox="0 0 ' + w + ' ' + h + '" role="application" aria-label="等邊三角形拼圖">';
    cells.forEach(function (c) {
      const ct = G.cellCenter(c);
      if (ct.y < -0.2) return;
      const at = w2s(ct.x, ct.y);
      s += '<circle cx="' + at[0] + '" cy="' + at[1] + '" r="3.5" fill="#c5d5df" pointer-events="none"/>';
    });
    const trayTop = w2s(minX, -0.15);
    s += '<text x="' + (PAD + 6) + '" y="' + (trayTop[1] + 28) + '" font-size="18" font-weight="800" fill="#52656e">圖形（拖上去拼）</text>';
    ensureTriParked();
    S.pieces.forEach(function (p) {
      const world = triPieceWorld(p);
      const pts = world.map(function (pt) { const at = w2s(pt.x, pt.y); return at[0] + ',' + at[1]; }).join(' ');
      const sel = S.selected === p.id;
      s += '<polygon points="' + pts + '" fill="' + COL.same + '" stroke="' + (sel ? '#0e534a' : '#1c4e63') + '" stroke-width="' + (sel ? 5 : 3) + '" stroke-linejoin="round" data-pid="' + p.id + '"/>';
    });
    s += '</svg>';
    return s;
  }
  function w2s(x, y) {
    return [PAD + (x - frame.minX) * frame.cell, PAD + (frame.maxY - y) * frame.cell];
  }
  function triCells() {
    const out = [];
    for (let q = -1; q <= 2; q++) {
      for (let p = -1; p <= 3; p++) {
        out.push({ p: p, q: q, down: false });
        out.push({ p: p, q: q, down: true });
      }
    }
    return out;
  }
  function triPieceWorld(p) {
    if (p.placed) return G.cellWorld(p);
    const base = G.cellWorld({ p: 0, q: 0, down: p.down });
    const c = G.cellCenter({ p: 0, q: 0, down: p.down });
    return base.map(function (v) { return { x: v.x - c.x + p.home.x, y: v.y - c.y + p.home.y }; });
  }
  function ensureTriParked() {
    S.pieces.forEach(function (p, i) {
      if (p.placed) return;
      p.home = { x: 0.2 + i * 1.35, y: -1.05 };
    });
  }
  function nearestTri(world, down) {
    let best = null, bestD = 0.72;
    triCells().forEach(function (c) {
      if (c.down !== down) return;
      const ct = G.cellCenter(c);
      if (ct.y < 0) return;
      const d = Math.hypot(ct.x - world.x, ct.y - world.y);
      if (d < bestD) { bestD = d; best = c; }
    });
    return best;
  }

  function clientTo(ev) {
    const svg = document.getElementById('board');
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = (p.x - PAD) / frame.cell + frame.minX;
    const y = frame.maxY - (p.y - PAD) / frame.cell;
    return { x: x, y: y };
  }

  function bind() {
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { S.mode = b.getAttribute('data-mode'); S.paused = false; render(); });
    });
    const gs = document.getElementById('go-split');
    const gj = document.getElementById('go-join');
    if (gs) gs.addEventListener('click', function () { S.lesson = 'split'; S.screen = 'list'; render(); });
    if (gj) gj.addEventListener('click', function () { S.lesson = 'join'; S.screen = 'list'; render(); });
    const home = document.getElementById('go-home');
    if (home) home.addEventListener('click', function () { S.screen = 'home'; render(); });
    const list = document.getElementById('go-list');
    if (list) list.addEventListener('click', function () { S.screen = 'list'; S.paused = false; render(); });
    document.querySelectorAll('[data-task]').forEach(function (b) {
      b.addEventListener('click', function () { openTask(b.getAttribute('data-task')); });
    });
    const prev = document.getElementById('btn-prev');
    const next = document.getElementById('btn-next');
    if (prev) prev.addEventListener('click', function () { stepTask(-1); });
    if (next) next.addEventListener('click', function () { stepTask(1); });
    const reset = document.getElementById('btn-reset');
    if (reset) reset.addEventListener('click', function () { resetTask(); render(); });
    const undo = document.getElementById('btn-undo');
    if (undo) undo.addEventListener('click', function () { S.cuts.pop(); setFeedback('已清除上一條線段。', 'hint'); render(); });
    const edit = document.getElementById('btn-edit');
    if (edit) edit.addEventListener('click', function () { S.view = 'edit'; S.feedback = null; render(); });
    const apart = document.getElementById('btn-apart');
    if (apart) apart.addEventListener('click', doApart);
    const rot = document.getElementById('btn-rot');
    if (rot) rot.addEventListener('click', doRotate);
    const check = document.getElementById('btn-check');
    if (check) check.addEventListener('click', doCheck);
    const rev = document.getElementById('btn-reveal');
    if (rev) rev.addEventListener('click', doReveal);
    const pause = document.getElementById('btn-pause');
    if (pause) pause.addEventListener('click', function () { S.paused = true; render(); });
    document.querySelectorAll('[data-choice]').forEach(function (b) {
      b.addEventListener('click', function () { S.choice = b.getAttribute('data-choice'); render(); });
    });
    document.querySelectorAll('[data-yn]').forEach(function (b) {
      b.addEventListener('click', function () {
        S.yn[b.getAttribute('data-yn')] = b.getAttribute('data-val');
        S.marked = false;
        render();
      });
    });
    const board = document.getElementById('board');
    if (board) {
      board.addEventListener('pointerdown', onDown);
      board.addEventListener('pointermove', onMove);
      board.addEventListener('pointerup', onUp);
      board.addEventListener('pointercancel', onUp);
    }
    const resume = document.getElementById('btnResume');
    resume.onclick = function () { S.paused = false; render(); };
  }

  function openTask(id) {
    S.taskId = id;
    S.screen = 'task';
    S.paused = false;
    resetTask();
    render();
  }
  function stepTask(dir) {
    const list = lessonTasks();
    const idx = list.findIndex(function (a) { return a.id === S.taskId; });
    const n = list[idx + dir];
    if (n) openTask(n.id);
  }
  function setFeedback(text, tone) {
    S.feedback = { text: text, tone: tone };
  }

  function onDown(ev) {
    if (S.paused) return;
    const pid = ev.target.closest && ev.target.closest('[data-pid]');
    const t = task();
    if (pid) {
      ev.preventDefault();
      document.getElementById('board').setPointerCapture(ev.pointerId);
      const id = pid.getAttribute('data-pid');
      S.selected = id;
      const g = clientTo(ev);
      if (id.charAt(0) === 'r') {
        const i = Number(id.slice(1));
        drag = { type: 'off', i: i, start: g, orig: S.offsets[i].slice(), pid: ev.pointerId, moved: false };
      } else if (t.kind === 'tri') {
        const p = S.pieces.find(function (x) { return x.id === id; });
        const world = placedCenter(p);
        drag = { type: 'tri', id: id, start: g, orig: world, pid: ev.pointerId, moved: false, p: p.p, q: p.q, down: p.down, placed: p.placed };
      } else {
        const p = S.pieces.find(function (x) { return x.id === id; });
        drag = { type: 'poly', id: id, start: g, origTx: p.tx, origTy: p.ty, pid: ev.pointerId, moved: false };
        p.placed = true;
      }
      return;
    }
    if (t && t.kind === 'draw' && S.view === 'edit') {
      const g = clientTo(ev);
      const dot = nearestDot(t, g);
      if (!dot) return;
      ev.preventDefault();
      document.getElementById('board').setPointerCapture(ev.pointerId);
      drag = { type: 'cut', a: dot, b: dot, pid: ev.pointerId };
      S.draft = [dot, dot];
      paintDraft();
    }
  }
  function placedCenter(p) {
    if (p.placed) return G.cellCenter(p);
    return { x: p.home.x, y: p.home.y };
  }
  function nearestDot(t, g) {
    let best = null, bestD = 0.48;
    G.bboxGridPoints(t.poly).forEach(function (p) {
      const d = Math.hypot(p[0] - g.x, p[1] - g.y);
      if (d < bestD) { bestD = d; best = p; }
    });
    return best;
  }
  function onMove(ev) {
    if (!drag || drag.pid !== ev.pointerId) return;
    const g = clientTo(ev);
    drag.moved = true;
    if (drag.type === 'cut') {
      const dot = nearestDot(task(), g) || drag.b;
      drag.b = dot;
      S.draft = [drag.a, dot];
      paintDraft();
      return;
    }
    if (drag.type === 'off') {
      S.offsets[drag.i] = [drag.orig[0] + (g.x - drag.start.x), drag.orig[1] + (g.y - drag.start.y)];
      paintOffsets();
      return;
    }
    if (drag.type === 'poly') {
      const p = S.pieces.find(function (x) { return x.id === drag.id; });
      p.tx = drag.origTx + (g.x - drag.start.x);
      p.ty = drag.origTy + (g.y - drag.start.y);
      p.placed = true;
      paintPoly(p);
      return;
    }
    if (drag.type === 'tri') {
      const p = S.pieces.find(function (x) { return x.id === drag.id; });
      const cx = drag.orig.x + (g.x - drag.start.x);
      const cy = drag.orig.y + (g.y - drag.start.y);
      const near = nearestTri({ x: cx, y: cy }, p.down);
      if (near) { p.placed = true; p.p = near.p; p.q = near.q; }
      else { p.placed = false; p.home = { x: cx, y: cy }; }
      paintTri(p);
    }
  }
  function onUp(ev) {
    if (!drag || drag.pid !== ev.pointerId) return;
    const t = task();
    const ended = drag;
    drag = null;
    if (ended.type === 'cut') {
      S.draft = null;
      const a = ended.a, b = ended.b;
      if (a && b && (a[0] !== b[0] || a[1] !== b[1])) addCut(t, a, b);
      else render();
      return;
    }
    if (ended.type === 'poly') {
      const p = S.pieces.find(function (x) { return x.id === ended.id; });
      const c = centroid(G.placePoly(p.local, p.k, p.tx, p.ty));
      if (frame.tray && c[1] < frame.playMinY - 0.25) p.placed = false;
      else {
        p.placed = true;
        p.tx = Math.round(p.tx);
        p.ty = Math.round(p.ty);
        const tnow = task();
        const c2 = centroid(G.placePoly(p.local, p.k, p.tx, p.ty));
        const loX = tnow.bounds.minX, hiX = tnow.bounds.maxX, loY = tnow.bounds.minY, hiY = tnow.bounds.maxY;
        if (c2[0] < loX || c2[0] > hiX || c2[1] < loY || c2[1] > hiY) {
          p.tx += Math.max(loX, Math.min(hiX, c2[0])) - c2[0];
          p.ty += Math.max(loY, Math.min(hiY, c2[1])) - c2[1];
          p.tx = Math.round(p.tx);
          p.ty = Math.round(p.ty);
        }
      }
      render();
      return;
    }
    if (ended.type === 'tri') {
      const p = S.pieces.find(function (x) { return x.id === ended.id; });
      if (p.placed) {
        const dup = S.pieces.some(function (o) {
          return o !== p && o.placed && o.p === p.p && o.q === p.q && o.down === p.down;
        });
        if (dup) {
          p.placed = false;
          setFeedback('呢個位置已經有一塊。', 'hint');
        }
      }
      render();
      return;
    }
    render();
  }

  function paintDraft() {
    const old = document.getElementById('draft-line');
    if (old) old.remove();
    if (!S.draft) return;
    const a = g2s(S.draft[0][0], S.draft[0][1]);
    const b = g2s(S.draft[1][0], S.draft[1][1]);
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('id', 'draft-line');
    ln.setAttribute('x1', a[0]); ln.setAttribute('y1', a[1]);
    ln.setAttribute('x2', b[0]); ln.setAttribute('y2', b[1]);
    ln.setAttribute('stroke', '#c05621');
    ln.setAttribute('stroke-width', '4');
    ln.setAttribute('stroke-dasharray', '8 6');
    ln.setAttribute('pointer-events', 'none');
    document.getElementById('board').appendChild(ln);
  }
  function paintOffsets() {
    S.result.forEach(function (p, i) {
      const el = document.querySelector('[data-pid="r' + i + '"]');
      if (!el) return;
      const off = S.offsets[i];
      el.setAttribute('points', p.xy.map(function (pt) {
        const at = g2s(pt[0] + off[0], pt[1] + off[1]);
        return at[0] + ',' + at[1];
      }).join(' '));
    });
  }
  function paintPoly(p) {
    const el = document.querySelector('[data-pid="' + p.id + '"]');
    if (!el) return;
    const xy = G.placePoly(p.local, p.k, p.tx, p.ty);
    el.setAttribute('points', xy.map(function (pt) {
      const at = g2s(pt[0], pt[1]);
      return at[0] + ',' + at[1];
    }).join(' '));
  }
  function paintTri(p) {
    const el = document.querySelector('[data-pid="' + p.id + '"]');
    if (!el) return;
    const world = triPieceWorld(p);
    el.setAttribute('points', world.map(function (pt) {
      const at = w2s(pt.x, pt.y);
      return at[0] + ',' + at[1];
    }).join(' '));
  }

  function addCut(t, a, b) {
    if (S.cuts.length >= 6) {
      setFeedback('線已經夠多，可以先檢查，或者清除再畫。', 'hint');
      render();
      return;
    }
    const trial = S.cuts.concat([[a, b]]);
    const after = G.splitPolygon(t.poly, trial);
    if (!after.ok) {
      const msg = {
        outside: '呢條線有部分在圖形外面。請由一邊畫到另一邊，線要留在圖形裏面。',
        dangling: '線的兩端要放在圖形的邊上，或者接到另一條線。',
        'not-split': '呢條線還沒有把圖形切開。請由一邊畫到另一邊。',
        short: '請拖到另一個點。'
      }[after.code] || '這條線不能用。';
      setFeedback(msg, 'hint');
      render();
      return;
    }
    const before = G.splitPolygon(t.poly, S.cuts);
    if (before.ok && after.pieces.length === before.pieces.length) {
      setFeedback('呢條線沒有再切開圖形。', 'hint');
      render();
      return;
    }
    S.cuts.push([a, b]);
    setFeedback('已加上一條線段。', 'hint');
    render();
  }

  function doApart() {
    const t = task();
    if (t.kind === 'name') {
      S.offsets = explodeOffsets(S.result);
      render();
      return;
    }
    if (t.kind === 'draw' && S.view === 'result' && S.result) {
      S.offsets = explodeOffsets(S.result);
      render();
    }
  }

  function doRotate() {
    const t = task();
    const p = S.pieces.find(function (x) { return x.id === S.selected; });
    if (!p) return;
    if (t.kind === 'tri') {
      const center = p.placed ? G.cellCenter(p) : p.home;
      p.down = !p.down;
      if (p.placed) {
        const near = nearestTri(center, p.down);
        if (near) { p.p = near.p; p.q = near.q; }
        else p.placed = false;
      }
      render();
      return;
    }
    const before = centroid(G.placePoly(p.local, p.k, p.tx, p.ty));
    p.k = (p.k + 1) % 4;
    const c0 = centroid(G.placePoly(p.local, p.k, 0, 0));
    p.tx = before[0] - c0[0];
    p.ty = before[1] - c0[1];
    if (p.placed) { p.tx = Math.round(p.tx); p.ty = Math.round(p.ty); }
    render();
  }

  function doCheck() {
    const t = task();
    try {
      if (t.kind === 'draw') checkDraw(t);
      else if (t.kind === 'name') checkName(t);
      else if (t.kind === 'tri') checkTri(t);
      else if (t.kind === 'join') checkJoin(t);
      else if (t.kind === 'fill' || t.kind === 'missing') checkFill(t);
      else if (t.kind === 'yesno') checkYes(t);
    } catch (err) {
      console.error(err);
      setFeedback('請重設再試一次。', 'bad');
    }
    render();
  }

  function checkDraw(t) {
    const res = G.checkSplit(t.poly, S.cuts, { parts: t.parts, congruent: t.congruent });
    if (!res.ok && !res.label) {
      const msg = {
        outside: '有線段伸到圖形外面。',
        dangling: '有線段的一端未接到邊上。',
        'not-split': '圖形還沒切開。請畫一條由一邊去到另一邊的線段。',
        area: '這組線段還沒有把圖形完全切開。'
      }[res.code] || '圖形還沒切開。';
      setFeedback(msg, 'hint');
      return;
    }
    S.result = res.pieces;
    S.offsets = res.pieces.map(function () { return [0, 0]; });
    S.view = 'result';
    const goal = goalText(t.parts);
    if (res.ok) {
      let text = '正確。分成了：' + res.label + '。';
      if (t.congruent) text += '各塊的形狀和大小都相同。';
      else if (G.allCongruent(res.pieces) && res.pieces.length > 1) text += '這一種切法，形狀和大小都相同。';
      setFeedback(text, 'ok');
    } else if (res.code === 'size') {
      setFeedback('塊數和名稱正確，但形狀和大小還未全部相同。現在是' + res.label + '。', 'bad');
    } else {
      setFeedback('還未正確。現在分成：' + res.label + '。題目要：' + goal + '。', 'bad');
    }
  }

  function checkName(t) {
    if (!S.choice) {
      setFeedback('請先選一個描述，再按檢查。可以先把圖形拖開來看看。', 'hint');
      return;
    }
    const hit = t.choices.find(function (c) { return c.id === S.choice; });
    if (hit && hit.correct) setFeedback('正確。' + hit.text + '。', 'ok');
    else setFeedback('還未正確。再看看每塊是什麼圖形、大小是否一樣。', 'bad');
  }

  function checkTri(t) {
    const placed = S.pieces.filter(function (p) { return p.placed; });
    if (placed.length < t.count) {
      setFeedback('還有三角形在下面，請全部用上。', 'hint');
      return;
    }
    const u = G.triAnalyze(placed.map(function (p) { return { p: p.p, q: p.q, down: p.down }; }));
    if (!u.ok) {
      const msg = {
        overlap: '有三角形疊住了。',
        disconnected: '三角形還沒拼在一起。邊要貼住邊。',
        'not-simple': '請把邊完全貼住，不要只碰一個角。'
      }[u.code] || '還沒拼成一個完整圖形。';
      setFeedback(msg, 'bad');
      return;
    }
    if (!u.convex) {
      setFeedback('你拼出的圖形凹了進去。試下拼一個凸出來的多邊形。', 'bad');
      return;
    }
    if (t.accept.indexOf(u.name) < 0) {
      setFeedback('你拼出了' + u.name + '。這題可以拼成：' + t.accept.join('、') + '。', 'bad');
      return;
    }
    if (!S.choice) {
      setFeedback('你拼出了' + u.name + '。請選出名稱，再按檢查。', 'hint');
      return;
    }
    if (S.choice === u.name) setFeedback('正確。你拼出的是' + u.name + '。', 'ok');
    else setFeedback('你拼出了' + u.name + '，但選了「' + S.choice + '」。再看看邊和角。', 'bad');
  }

  function checkJoin(t) {
    const placed = S.pieces.filter(function (p) { return p.placed; });
    if (placed.length < t.pieces.length) {
      setFeedback('還有圖形在下面，請全部用上。', 'hint');
      return;
    }
    const polys = placed.map(function (p) { return G.placePoly(p.local, p.k, p.tx, p.ty); });
    const u = G.unionOutline(polys);
    if (!u.ok) {
      const msg = {
        overlap: '有圖形疊住了。分開少少再試。',
        disconnected: '圖形還沒拼在一起。邊要貼住邊。'
      }[u.code] || '還沒拼成一個完整圖形。';
      setFeedback(msg, 'bad');
      return;
    }
    if (!u.convex) {
      setFeedback('你拼出的圖形凹了進去。試下拼一個凸出來的多邊形。', 'bad');
      return;
    }
    if (t.accept.indexOf(u.name) < 0) {
      setFeedback('你拼出了' + u.name + '。這題可以拼成：' + t.accept.join('、') + '。', 'bad');
      return;
    }
    if (!S.choice) {
      setFeedback('你拼出了' + u.name + '。請選出名稱，再按檢查。', 'hint');
      return;
    }
    if (S.choice === u.name) setFeedback('正確。你拼出的是' + u.name + '。', 'ok');
    else setFeedback('你拼出了' + u.name + '，但選了「' + S.choice + '」。再看看邊和角。', 'bad');
  }

  function checkFill(t) {
    const placed = S.pieces.filter(function (p) { return p.placed; });
    if (t.kind === 'missing') {
      if (placed.length === 0) { setFeedback('請從下面拖一塊上來補上。', 'hint'); return; }
      if (placed.length > 1) { setFeedback('只需補上一塊。其餘的放回下面。', 'hint'); return; }
    } else if (placed.length < t.pieces.length) {
      setFeedback('請把所有圖形都放進虛線框。', 'hint');
      return;
    }
    const polys = placed.map(function (p) { return G.placePoly(p.local, p.k, p.tx, p.ty); });
    if (t.partial) polys.unshift(t.partial);
    const r = G.fillsTarget(t.target, polys);
    if (r.ok) setFeedback('正確。拼成了' + t.targetName + '。', 'ok');
    else if (r.code === 'outside') setFeedback('有圖形伸出了虛線框。', 'bad');
    else if (r.code === 'overlap') setFeedback('有圖形疊住了，或者沒有對準缺口。', 'bad');
    else setFeedback('虛線框還沒填滿。可以旋轉，再移一移。', 'bad');
  }

  function checkYes(t) {
    const missing = t.rows.some(function (row) { return !S.yn[row.id]; });
    if (missing) {
      setFeedback('請每一行都選「可以」或「不可以」。', 'hint');
      return;
    }
    S.marked = true;
    const wrong = t.rows.filter(function (row) { return S.yn[row.id] !== (row.ok ? 'yes' : 'no'); });
    const polys = S.pieces.map(function (p) { return G.placePoly(p.local, p.k, Math.round(p.tx), Math.round(p.ty)); });
    const u = G.unionOutline(polys);
    let extra = '';
    if (u.ok && u.convex) extra = '你現在拼出的是' + u.name + '。';
    if (!wrong.length) {
      setFeedback('正確。三角形：不可以。正方形：不可以。梯形：可以。平行四邊形：可以。' + extra, 'ok');
    } else {
      setFeedback('橙色的行還未正確，改一改再檢查。' + extra, 'bad');
    }
  }

  function doReveal() {
    const t = task();
    S.paused = false;
    S.revealed = true;
    if (t.kind === 'draw') {
      S.cuts = t.solution.map(function (c) { return [c[0].slice(), c[1].slice()]; });
      checkDraw(t);
      if (S.result) S.offsets = explodeOffsets(S.result);
      render();
      return;
    }
    if (t.kind === 'name') {
      const hit = t.choices.find(function (c) { return c.correct; });
      S.choice = hit.id;
      S.offsets = explodeOffsets(S.result);
      setFeedback('一種答案：' + hit.text + '。', 'ok');
      render();
      return;
    }
    if (t.kind === 'tri') {
      t.solution.cells.forEach(function (c, i) {
        S.pieces[i].placed = true;
        S.pieces[i].p = c.p;
        S.pieces[i].q = c.q;
        S.pieces[i].down = c.down;
      });
      S.choice = t.solution.name;
      setFeedback('一種拼法是' + t.solution.name + '。' + (t.id === 'tri4' ? '4 塊亦可以拼成更大的等邊三角形。' : ''), 'ok');
      render();
      return;
    }
    if (t.kind === 'join' || t.kind === 'fill' || t.kind === 'yesno' || t.kind === 'missing') {
      const place = t.solution.placements;
      if (t.kind === 'missing') {
        S.pieces.forEach(function (p, i) { p.placed = i === t.solutionIndex; });
        const p = S.pieces[t.solutionIndex];
        p.k = t.solution.k;
        p.tx = t.solution.tx;
        p.ty = t.solution.ty;
        p.placed = true;
        setFeedback('補上的是' + (p.name || '') + '，拼成' + t.targetName + '。', 'ok');
      } else {
        place.forEach(function (pl, i) {
          S.pieces[i].k = pl.k;
          S.pieces[i].tx = pl.tx;
          S.pieces[i].ty = pl.ty;
          S.pieces[i].placed = true;
        });
        if (t.kind === 'join') {
          S.choice = t.solution.name;
          setFeedback('一種拼法是' + t.solution.name + '。', 'ok');
        } else if (t.kind === 'fill') {
          setFeedback('圖形可以這樣填滿' + t.targetName + '。', 'ok');
        } else {
          t.rows.forEach(function (row) { S.yn[row.id] = row.ok ? 'yes' : 'no'; });
          S.marked = true;
          setFeedback('三角形：不可以。正方形：不可以。梯形：可以。平行四邊形：可以。畫面是其中一種梯形拼法。', 'ok');
        }
      }
      render();
    }
  }

  render();
})();
