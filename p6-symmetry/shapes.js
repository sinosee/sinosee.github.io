/* Lesson 1 shapes, questions, SVG drawing, and the fold-along-the-axis animation. */
(function (root) {
  'use strict';
  var G = root.SymmetryGeo;
  var NS = 'http://www.w3.org/2000/svg';
  var VB = 400;
  var CX = 200;
  var CY = 200;
  var foldSeq = 0;

  var PALETTE = {
    stroke: '#1e2a4a',
    gold: '#f2c14e',
    mint: '#5ec9a8',
    lilac: '#cbb8ea',
    red: '#d64545',
    cream: '#fff6e8',
    goldFill: '#f7d56a',
    ink: '#1e2a4a'
  };

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] !== null && attrs[k] !== undefined && attrs[k] !== '') {
          node.setAttribute(k, String(attrs[k]));
        }
      });
    }
    return node;
  }

  function pts(list) {
    return list.map(function (p) { return p.x + ',' + p.y; }).join(' ');
  }

  function shift(vs, dx, dy) {
    return vs.map(function (p) { return { x: p.x + dx, y: p.y + dy }; });
  }

  /* Intersect an axis with the padded view box; return two endpoints. */
  function axisEndpoints(axis, pad) {
    var m = pad == null ? 28 : pad;
    var box = [
      { x: m, y: m }, { x: VB - m, y: m },
      { x: VB - m, y: VB - m }, { x: m, y: VB - m }
    ];
    var hits = [];
    for (var i = 0; i < 4; i++) {
      var a = box[i], b = box[(i + 1) % 4];
      var da = G.signedDistance(a, axis);
      var db = G.signedDistance(b, axis);
      if (da === 0 || (da < 0 && db > 0) || (da > 0 && db < 0) || (da === 0 && db !== 0)) {
        if (Math.abs(da) < 1e-9 && Math.abs(db) < 1e-9) continue;
        if (Math.abs(da) < 1e-9) hits.push({ x: a.x, y: a.y });
        else if (da * db <= 0) hits.push(G.intersectSegmentAxis(a, b, axis));
      }
    }
    hits = G.uniquePoints(hits, 0.5);
    if (hits.length >= 2) {
      /* Pick the pair farthest apart. */
      var best = [hits[0], hits[1]], bestD = G.dist(hits[0], hits[1]);
      for (var i = 0; i < hits.length; i++) {
        for (var j = i + 1; j < hits.length; j++) {
          var d = G.dist(hits[i], hits[j]);
          if (d > bestD) { bestD = d; best = [hits[i], hits[j]]; }
        }
      }
      return best;
    }
    var p = G.projectToAxis({ x: CX, y: CY }, axis);
    var u = G.axisUnit(axis);
    return [G.add(p, G.scale(u, 160)), G.add(p, G.scale(u, -160))];
  }

  var SHAPES = {
    square: {
      name: '正方形',
      type: 'polygon',
      fill: PALETTE.mint,
      vertices: [
        { x: 120, y: 120 }, { x: 280, y: 120 },
        { x: 280, y: 280 }, { x: 120, y: 280 }
      ],
      axes: [G.verticalAxis(200), G.horizontalAxis(200), G.diagonalAxis(1, 0), G.diagonalAxis(-1, 400)]
    },
    rectangle: {
      name: '長方形',
      type: 'polygon',
      fill: PALETTE.lilac,
      vertices: [
        { x: 100, y: 140 }, { x: 300, y: 140 },
        { x: 300, y: 260 }, { x: 100, y: 260 }
      ],
      axes: [G.verticalAxis(200), G.horizontalAxis(200)]
    },
    parallelogram: {
      name: '平行四邊形',
      type: 'polygon',
      fill: PALETTE.red,
      vertices: [
        { x: 100, y: 150 }, { x: 280, y: 150 },
        { x: 330, y: 250 }, { x: 150, y: 250 }
      ],
      axes: [],
      trialAxis: G.horizontalAxis(200)
    },
    scaleneTriangle: {
      name: '三角形',
      type: 'polygon',
      fill: PALETTE.goldFill,
      vertices: [
        { x: 90, y: 270 }, { x: 290, y: 280 }, { x: 220, y: 110 }
      ],
      axes: [],
      trialAxis: G.lineAxis({ x: 220, y: 110 }, { x: 190, y: 275 })
    },
    house: {
      name: '房子',
      type: 'polygon',
      fill: PALETTE.lilac,
      vertices: [
        { x: 200, y: 90 },
        { x: 110, y: 200 },
        { x: 110, y: 320 },
        { x: 290, y: 320 },
        { x: 290, y: 200 }
      ],
      axes: [],
      trialAxis: G.verticalAxis(200),
      decorations: [
        { type: 'rect', x: 128, y: 230, w: 42, h: 36, fill: '#fff6e8', stroke: PALETTE.stroke },
        { type: 'rect', x: 176, y: 268, w: 48, h: 52, fill: '#d64545', stroke: PALETTE.stroke },
        { type: 'circle', cx: 248, cy: 248, r: 16, fill: '#d64545', stroke: PALETTE.stroke },
        { type: 'circle', cx: 248, cy: 248, r: 7, fill: PALETTE.gold }
      ]
    },
    isoscelesTriangle: {
      name: '等腰三角形',
      type: 'polygon',
      fill: PALETTE.mint,
      vertices: [
        { x: 200, y: 100 }, { x: 90, y: 300 }, { x: 310, y: 300 }
      ],
      axes: [G.verticalAxis(200)]
    },
    equilateralTriangle: {
      name: '等邊三角形',
      type: 'polygon',
      fill: PALETTE.goldFill,
      vertices: shift(G.equilateralVertices(196), 200, 214),
      axes: null /* filled below */
    },
    rhombus: {
      name: '菱形',
      type: 'polygon',
      fill: PALETTE.red,
      vertices: [
        { x: 67.085, y: 140 }, { x: 227.085, y: 140 },
        { x: 332.915, y: 260 }, { x: 172.915, y: 260 }
      ],
      axes: [
        G.lineAxis({ x: 67.085, y: 140 }, { x: 332.915, y: 260 }),
        G.lineAxis({ x: 227.085, y: 140 }, { x: 172.915, y: 260 })
      ]
    },
    circle: {
      name: '圓',
      type: 'circle',
      fill: PALETTE.mint,
      center: { x: 200, y: 200 },
      radius: 112,
      axes: null
    }
  };

  SHAPES.equilateralTriangle.axes = [
    G.verticalAxis(200),
    G.lineAxis(SHAPES.equilateralTriangle.vertices[1], G.mid(SHAPES.equilateralTriangle.vertices[0], SHAPES.equilateralTriangle.vertices[2])),
    G.lineAxis(SHAPES.equilateralTriangle.vertices[2], G.mid(SHAPES.equilateralTriangle.vertices[0], SHAPES.equilateralTriangle.vertices[1]))
  ];

  function polygonPoints(shape) {
    if (shape.type === 'circle') {
      var ptsList = [];
      var n = 64;
      for (var i = 0; i < n; i++) {
        var a = (Math.PI * 2 * i) / n;
        ptsList.push({
          x: shape.center.x + shape.radius * Math.cos(a),
          y: shape.center.y + shape.radius * Math.sin(a)
        });
      }
      return ptsList;
    }
    return shape.vertices;
  }

  function drawPolygon(parent, vertices, fill, extra) {
    var attrs = {
      points: pts(vertices),
      fill: fill || PALETTE.mint,
      stroke: PALETTE.stroke,
      'stroke-width': 5,
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round'
    };
    if (extra) Object.keys(extra).forEach(function (k) { attrs[k] = extra[k]; });
    var node = el('polygon', attrs);
    parent.appendChild(node);
    return node;
  }

  function drawCircle(parent, shape, fill, extra) {
    var attrs = {
      cx: shape.center.x, cy: shape.center.y, r: shape.radius,
      fill: fill || shape.fill || PALETTE.mint,
      stroke: PALETTE.stroke,
      'stroke-width': 5
    };
    if (extra) Object.keys(extra).forEach(function (k) { attrs[k] = extra[k]; });
    var node = el('circle', attrs);
    parent.appendChild(node);
    return node;
  }

  function decorationCenter(d) {
    if (d.type === 'rect') return { x: d.x + d.w / 2, y: d.y + d.h / 2 };
    if (d.type === 'circle') return { x: d.cx, y: d.cy };
    return { x: 0, y: 0 };
  }

  /* side is the clipPolygonHalf sign used for that piece; on-axis decorations stay put. */
  function decorationsForSide(list, axis, side) {
    if (!list) return [];
    return list.filter(function (d) {
      var s = G.signedDistance(decorationCenter(d), axis);
      if (Math.abs(s) < 1) return side < 0;
      return side < 0 ? s < 0 : s > 0;
    });
  }

  function drawDecorations(parent, list, fade) {
    if (!list) return;
    list.forEach(function (d) {
      var node;
      if (d.type === 'rect') {
        node = el('rect', {
          x: d.x, y: d.y, width: d.w, height: d.h,
          fill: d.fill, stroke: d.stroke || PALETTE.stroke, 'stroke-width': 3, rx: 4
        });
      } else if (d.type === 'circle') {
        node = el('circle', {
          cx: d.cx, cy: d.cy, r: d.r,
          fill: d.fill, stroke: d.stroke || 'none', 'stroke-width': d.stroke ? 3 : 0
        });
      }
      if (node) {
        if (fade) node.setAttribute('opacity', '0.35');
        parent.appendChild(node);
      }
    });
  }

  function drawAxisLine(parent, axis, opts) {
    opts = opts || {};
    var ends = axisEndpoints(axis, opts.pad);
    var line = el('line', {
      x1: ends[0].x, y1: ends[0].y, x2: ends[1].x, y2: ends[1].y,
      stroke: opts.stroke || PALETTE.gold,
      'stroke-width': opts.width || 4,
      'stroke-dasharray': opts.dash != null ? opts.dash : '10 8',
      'stroke-linecap': 'round',
      opacity: opts.opacity == null ? 1 : opts.opacity,
      'pointer-events': 'none'
    });
    parent.appendChild(line);
    return { line: line, ends: ends };
  }

  function drawShapeFigure(parent, shape, opt) {
    opt = opt || {};
    var fill = opt.fill || shape.fill || PALETTE.mint;
    if (!opt.noShadow) {
      var gShadow = el('g', { transform: 'translate(5,5)', opacity: '0.18' });
      if (shape.type === 'circle') drawCircle(gShadow, shape, PALETTE.ink, { stroke: 'none' });
      else drawPolygon(gShadow, shape.vertices, PALETTE.ink, { stroke: 'none' });
      parent.appendChild(gShadow);
    }
    if (shape.type === 'circle') drawCircle(parent, shape, fill, opt.attrs);
    else drawPolygon(parent, shape.vertices, fill, opt.attrs);
    if (!opt.hideDecorations) drawDecorations(parent, shape.decorations, opt.fadeDecorations);
  }

  function emptySvg() {
    return el('svg', {
      viewBox: '0 0 ' + VB + ' ' + VB,
      role: 'img',
      'aria-hidden': 'false'
    });
  }

  function renderIdle(mount, shape, opt) {
    mount.innerHTML = '';
    var svg = emptySvg();
    drawShapeFigure(svg, shape, opt || {});
    if (opt && opt.axis) drawAxisLine(svg, opt.axis, { stroke: PALETTE.gold, width: 4 });
    if (opt && opt.extraAxes) {
      opt.extraAxes.forEach(function (ax) {
        drawAxisLine(svg, ax, { stroke: PALETTE.gold, width: 4, opacity: 0.9 });
      });
    }
    mount.appendChild(svg);
    return svg;
  }

  /* Interactive candidate axes: large invisible hit strokes + dashed visible lines. */
  function renderFindAxes(mount, shape, candidates, state) {
    mount.innerHTML = '';
    var svg = emptySvg();
    drawShapeFigure(svg, shape, {});
    candidates.forEach(function (cand, idx) {
      var ends = axisEndpoints(cand.axis, 24);
      var selected = state.selected[idx];
      var mark = state.marks && state.marks[idx]; /* 'good' | 'bad' | 'miss' | '' */
      var color = PALETTE.ink;
      var width = 4;
      var dash = '10 8';
      var opacity = 0.45;
      if (selected) {
        color = PALETTE.gold;
        width = 5;
        opacity = 1;
      }
      if (mark === 'good' || mark === 'miss') {
        color = '#1a8a5c';
        width = 5;
        opacity = 1;
        if (mark === 'miss') dash = '10 8';
        else dash = '12 0';
      }
      if (mark === 'bad') {
        color = PALETTE.red;
        width = 5;
        opacity = 1;
      }
      var hit = el('line', {
        x1: ends[0].x, y1: ends[0].y, x2: ends[1].x, y2: ends[1].y,
        stroke: 'transparent',
        'stroke-width': 30,
        'stroke-linecap': 'round',
        class: 'axisHit',
        'data-idx': idx,
        tabindex: state.locked ? -1 : 0,
        role: 'button',
        'aria-pressed': selected ? 'true' : 'false',
        'aria-label': '候選對稱軸 ' + (idx + 1) + (selected ? '，已選取' : '')
      });
      var vis = el('line', {
        x1: ends[0].x, y1: ends[0].y, x2: ends[1].x, y2: ends[1].y,
        stroke: color,
        'stroke-width': width,
        'stroke-dasharray': dash,
        'stroke-linecap': 'round',
        opacity: opacity,
        'pointer-events': 'none'
      });
      svg.appendChild(hit);
      svg.appendChild(vis);
      cand._hit = hit;
      cand._vis = vis;
    });
    mount.appendChild(svg);
    return svg;
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      return false;
    }
  }

  var foldToken = 0;
  function cancelFolds() { foldToken += 1; }

  function playFold(mount, shape, axis, coincides, done, opts) {
    opts = opts || {};
    foldSeq += 1;
    var uid = 'f' + foldSeq;
    var token = foldToken;
    mount.innerHTML = '';
    var svg = emptySvg();
    var verts = polygonPoints(shape);
    var staySide = -1;
    var flapSide = 1;
    var stay = G.clipPolygonHalf(verts, axis, staySide);
    var flap = G.clipPolygonHalf(verts, axis, flapSide);
    if (stay.length < 3) {
      staySide = 1;
      stay = G.clipPolygonHalf(verts, axis, staySide);
    }
    if (flap.length < 3) {
      flapSide = staySide === 1 ? -1 : 1;
      flap = G.clipPolygonHalf(verts, axis, flapSide);
    }

    var around = shape.type === 'circle' ? shape.center : { x: CX, y: CY };

    /* Faint outline only; decorations travel with the stay / flap so a mismatch is visible. */
    var back = el('g', { opacity: '0.22' });
    drawShapeFigure(back, shape, { noShadow: true, hideDecorations: true });
    svg.appendChild(back);

    var stayG = el('g', { class: 'fold-stay' });
    drawPolygon(stayG, stay, coincides ? PALETTE.mint : PALETTE.lilac, { 'stroke-width': 4 });
    drawDecorations(stayG, decorationsForSide(shape.decorations, axis, staySide), false);
    svg.appendChild(stayG);

    var flapG = el('g', { class: 'fold-flap' });
    drawPolygon(flapG, flap, coincides ? PALETTE.goldFill : PALETTE.red, { 'stroke-width': 4 });
    drawDecorations(flapG, decorationsForSide(shape.decorations, axis, flapSide), false);
    svg.appendChild(flapG);

    drawAxisLine(svg, axis, { stroke: PALETTE.gold, width: 5, dash: '12 8' });

    mount.appendChild(svg);

    function applyScale(s) {
      flapG.setAttribute('transform', G.foldTransformAt(axis, s, around));
    }

    function showSettled() {
      if (!coincides) return;
      mount.innerHTML = '';
      var doneSvg = emptySvg();
      drawShapeFigure(doneSvg, shape, {});
      drawAxisLine(doneSvg, axis, { stroke: PALETTE.gold, width: 5, dash: '12 8' });
      mount.appendChild(doneSvg);
    }

    function finish() {
      if (token !== foldToken) return;
      applyScale(-1);
      showSettled();
      if (done) done();
    }

    var duration = opts.duration != null ? opts.duration : 1100;
    if (prefersReducedMotion()) {
      finish();
      return;
    }

    applyScale(1);
    var t0 = null;
    function frame(now) {
      if (token !== foldToken) return;
      if (t0 == null) t0 = now;
      var t = Math.min(1, (now - t0) / duration);
      var eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      var s = Math.cos(Math.PI * eased);
      applyScale(s);
      if (t < 1) {
        root.requestAnimationFrame(frame);
      } else {
        finish();
      }
    }
    root.requestAnimationFrame(frame);
  }

  /* Play several folds in order, then call done. Short folds when there are many axes. */
  function playFoldSequence(mount, shape, steps, done, opts) {
    opts = opts || {};
    var token = foldToken;
    var list = steps || [];
    var i = 0;
    var reduced = prefersReducedMotion();
    var duration = opts.duration != null ? opts.duration : (list.length > 1 ? 650 : 1100);
    var pause = reduced ? 50 : (opts.pause != null ? opts.pause : 220);

    function nextStep() {
      if (token !== foldToken) return;
      if (i >= list.length) {
        if (done) done();
        return;
      }
      var step = list[i++];
      playFold(mount, shape, step.axis, step.coincides, function () {
        if (token !== foldToken) return;
        if (i >= list.length) {
          if (done) done();
        } else {
          setTimeout(nextStep, pause);
        }
      }, { duration: reduced ? 0 : duration });
    }

    if (!list.length) {
      if (done) done();
      return;
    }
    nextStep();
  }

  function circleSampleDiameters(shape, n) {
    var list = [];
    var count = n || 8;
    for (var i = 0; i < count; i++) {
      var a = (Math.PI * i) / count;
      list.push(G.lineAxis(
        { x: shape.center.x + Math.cos(a), y: shape.center.y + Math.sin(a) },
        shape.center
      ));
    }
    return list;
  }

  function drawCircleWithDiameters(mount, shape, diameters) {
    mount.innerHTML = '';
    var svg = emptySvg();
    drawShapeFigure(svg, shape, {});
    (diameters || []).forEach(function (axis) {
      drawAxisLine(svg, axis, { stroke: PALETTE.gold, width: 3, dash: '8 6' });
    });
    var label = el('text', {
      x: CX, y: 28, 'text-anchor': 'middle',
      fill: PALETTE.ink, 'font-size': 22, 'font-weight': 900,
      class: 'axisLabel'
    });
    label.textContent = '無數條對稱軸';
    svg.appendChild(label);
    mount.appendChild(svg);
  }

  /* After a circle answer, fold a few diameters in sequence to show 無數條. */
  function playCircleReveal(mount, shape, done) {
    var token = foldToken;
    var cx = shape.center.x, cy = shape.center.y;
    /* Four folds: vertical, horizontal, and both 45° through the centre. */
    var foldAxes = [
      G.verticalAxis(cx),
      G.horizontalAxis(cy),
      G.diagonalAxis(1, cy - cx),
      G.diagonalAxis(-1, cx + cy)
    ];
    var diameters = circleSampleDiameters(shape, 8);
    drawCircleWithDiameters(mount, shape, diameters);
    var wait = prefersReducedMotion() ? 80 : 450;
    setTimeout(function () {
      if (token !== foldToken) return;
      var steps = foldAxes.map(function (axis) {
        return { axis: axis, coincides: true };
      });
      playFoldSequence(mount, shape, steps, function () {
        if (token !== foldToken) return;
        drawCircleWithDiameters(mount, shape, diameters);
        if (done) done();
      }, { duration: 650, pause: 200 });
    }, wait);
  }

  function rectangleCandidates() {
    var v = SHAPES.rectangle.vertices;
    return [
      { axis: G.verticalAxis(200), correct: true, kind: 'midline' },
      { axis: G.horizontalAxis(200), correct: true, kind: 'midline' },
      { axis: G.lineAxis(v[0], v[2]), correct: false, kind: 'diagonal' },
      { axis: G.lineAxis(v[1], v[3]), correct: false, kind: 'diagonal' }
    ];
  }

  function squareCandidates() {
    return [
      { axis: G.verticalAxis(200), correct: true, kind: 'midline' },
      { axis: G.horizontalAxis(200), correct: true, kind: 'midline' },
      { axis: G.diagonalAxis(1, 0), correct: true, kind: 'diagonal' },
      { axis: G.diagonalAxis(-1, 400), correct: true, kind: 'diagonal' }
    ];
  }

  function isoscelesCandidates() {
    var v = SHAPES.isoscelesTriangle.vertices;
    return [
      { axis: G.verticalAxis(200), correct: true, kind: 'altitude' },
      { axis: G.lineAxis(v[1], G.mid(v[0], v[2])), correct: false, kind: 'other' },
      { axis: G.lineAxis(v[2], G.mid(v[0], v[1])), correct: false, kind: 'other' },
      { axis: G.horizontalAxis(230), correct: false, kind: 'horizontal' }
    ];
  }

  function equilateralCandidates() {
    var axes = SHAPES.equilateralTriangle.axes;
    return axes.map(function (ax) {
      return { axis: ax, correct: true, kind: 'altitude' };
    });
  }

  function rhombusCandidates() {
    var v = SHAPES.rhombus.vertices;
    var midTop = G.mid(v[0], v[1]);
    var midBot = G.mid(v[2], v[3]);
    var midRight = G.mid(v[1], v[2]);
    var midLeft = G.mid(v[3], v[0]);
    return [
      { axis: G.lineAxis(v[0], v[2]), correct: true, kind: 'diagonal' },
      { axis: G.lineAxis(v[1], v[3]), correct: true, kind: 'diagonal' },
      { axis: G.lineAxis(midTop, midBot), correct: false, kind: 'midline' },
      { axis: G.lineAxis(midLeft, midRight), correct: false, kind: 'midline' }
    ];
  }

  var QUESTIONS = [
    {
      id: 'q1-judge-square',
      type: 'judge',
      shapeId: 'square',
      prompt: '這個平面圖形是軸對稱平面圖形嗎？',
      lead: '沿對稱軸對摺，兩邊能完全重合，就是軸對稱平面圖形。',
      answer: true,
      foldAxis: function (sh) { return sh.axes[0]; },
      coincides: true,
      ok: '答對了！這是正方形。沿對稱軸對摺，兩邊能完全重合。',
      bad: '再想一想。正方形沿對稱軸對摺，兩邊能完全重合，所以是軸對稱平面圖形。'
    },
    {
      id: 'q2-judge-parallelogram',
      type: 'judge',
      shapeId: 'parallelogram',
      prompt: '這個平面圖形是軸對稱平面圖形嗎？',
      lead: '',
      answer: false,
      foldAxis: function (sh) { return sh.trialAxis; },
      coincides: false,
      ok: '答對了！平行四邊形對摺後兩邊不能完全重合，所以不是軸對稱平面圖形。',
      bad: '再想一想。把平行四邊形沿這條線對摺，兩邊不能完全重合，所以不是軸對稱平面圖形。'
    },
    {
      id: 'q3-judge-scalene',
      type: 'judge',
      shapeId: 'scaleneTriangle',
      prompt: '這個平面圖形是軸對稱平面圖形嗎？',
      answer: false,
      foldAxis: function (sh) { return sh.trialAxis; },
      coincides: false,
      ok: '答對了！這個三角形三條邊不相等，對摺後兩邊不能完全重合。',
      bad: '再想一想。三邊不相等的三角形對摺後兩邊不能完全重合，所以不是軸對稱平面圖形。'
    },
    {
      id: 'q4-judge-house-pattern',
      type: 'judge',
      shapeId: 'house',
      prompt: '這個平面圖形是軸對稱平面圖形嗎？',
      lead: '仔細看看圖形和裡面的圖案。',
      answer: false,
      foldAxis: function (sh) { return sh.trialAxis; },
      coincides: false,
      ok: '答對了！這個圖形的外形雖然左右相同，但門窗的位置和形狀不同，對摺後不能完全重合，所以不是軸對稱平面圖形。',
      bad: '再想一想。判斷時也要看裡面的圖案。門窗左右並不相同，對摺後不能完全重合。'
    },
    {
      id: 'q5-axes-rectangle',
      type: 'find-axes',
      shapeId: 'rectangle',
      prompt: '請選出這個長方形的全部對稱軸。',
      lead: '點選你認為是對稱軸的虛線，再按「完成」。',
      candidates: rectangleCandidates,
      foldAxis: function (sh) { return sh.axes[0]; },
      coincides: true,
      ok: '答對了！長方形有 2 條對稱軸，是對邊中點的連線。對角線不是對稱軸。',
      badDiagonal: '長方形的對角線不是對稱軸。請選出對邊中點的連線。',
      bad: '還未選齊，或選了不是對稱軸的線。再試一次。'
    },
    {
      id: 'q6-axes-square',
      type: 'find-axes',
      shapeId: 'square',
      prompt: '請選出這個正方形的全部對稱軸。',
      lead: '正方形的對稱軸包括對邊中點連線和兩條對角線。',
      candidates: squareCandidates,
      foldAxis: function (sh) { return sh.axes[2]; },
      coincides: true,
      ok: '答對了！正方形有 4 條對稱軸：兩條對邊中點連線，還有兩條對角線。',
      bad: '正方形有 4 條對稱軸，請全部選出。再試一次。'
    },
    {
      id: 'q7-axes-isosceles',
      type: 'find-axes',
      shapeId: 'isoscelesTriangle',
      prompt: '請選出這個等腰三角形的全部對稱軸。',
      lead: '點選虛線，再按「完成」。',
      candidates: isoscelesCandidates,
      foldAxis: function (sh) { return sh.axes[0]; },
      coincides: true,
      ok: '答對了！等腰三角形有 1 條對稱軸，由頂點連到對邊的中點。',
      bad: '等腰三角形（不是等邊三角形）只有 1 條對稱軸。再試一次。'
    },
    {
      id: 'q8-axes-equilateral',
      type: 'find-axes',
      shapeId: 'equilateralTriangle',
      prompt: '請選出這個等邊三角形的全部對稱軸。',
      lead: '要想一想，是不是只有垂直的那一條？',
      candidates: equilateralCandidates,
      foldAxis: function (sh) { return sh.axes[0]; },
      coincides: true,
      ok: '答對了！等邊三角形有 3 條對稱軸，每一條都由頂點連到對邊的中點。',
      bad: '等邊三角形有 3 條對稱軸，請全部選出。再試一次。'
    },
    {
      id: 'q9-axes-rhombus',
      type: 'find-axes',
      shapeId: 'rhombus',
      prompt: '請選出這個菱形的全部對稱軸。',
      lead: '菱形的對稱軸是它的對角線。',
      candidates: rhombusCandidates,
      foldAxis: function (sh) { return sh.axes[0]; },
      coincides: true,
      ok: '答對了！菱形有 2 條對稱軸，就是兩條對角線。',
      bad: '菱形有 2 條對稱軸，是兩條對角線，不是對邊中點的連線。再試一次。'
    },
    {
      id: 'q10-count-circle',
      type: 'count',
      shapeId: 'circle',
      prompt: '數一數這個圓有多少條對稱軸？',
      lead: '',
      choices: ['1 條', '2 條', '4 條', '無數條'],
      answer: '無數條',
      foldSpecial: 'circle',
      ok: '答對了！圓有無數條對稱軸，每一條直徑都是對稱軸。',
      bad: '再想一想。圓的每一條直徑都是對稱軸，所以有無數條。'
    }
  ];

  root.SymmetryShapes = {
    PALETTE: PALETTE,
    SHAPES: SHAPES,
    QUESTIONS: QUESTIONS,
    renderIdle: renderIdle,
    renderFindAxes: renderFindAxes,
    playFold: playFold,
    playFoldSequence: playFoldSequence,
    playCircleReveal: playCircleReveal,
    cancelFolds: cancelFolds,
    axisEndpoints: axisEndpoints,
    drawAxisLine: drawAxisLine,
    drawShapeFigure: drawShapeFigure,
    emptySvg: emptySvg
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
