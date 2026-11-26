/* Lesson 2: complete the other half on grid paper by dragging line segments. */
(function (root) {
  'use strict';
  var G = root.SymmetryGeo || (typeof require === 'function' ? require('./geometry.js') : null);
  var S = root.SymmetryShapes;
  var App;
  var TOTAL = 10;
  var GRID = 12; /* points 0..12 */

  var state = {
    index: 0,
    correct: 0,
    locked: false,
    attempts: 0,
    strokes: [], /* undirected student segments {a, b} */
    pending: null, /* click-then-click start point */
    drag: null,
    hintId: null
  };

  function $(id) { return document.getElementById(id); }

  function keyOf(p) { return p.x + ',' + p.y; }
  function parseKey(k) {
    var parts = k.split(',');
    return { x: +parts[0], y: +parts[1] };
  }

  /* 10 items: vertical (1-3), horizontal (4-6), 45° y=x (7-9), 45° y=-x+12 (10). */
  var ITEMS = [
    {
      id: 'v-triangle',
      axis: G.verticalAxis(6),
      axisLabel: '垂直的對稱軸',
      vertices: [{ x: 6, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 9 }, { x: 6, y: 10 }, { x: 9, y: 9 }, { x: 10, y: 4 }],
      given: [0, 3],
      givenOff: [1, 2],
      prompt: '圖形的一半和對稱軸已經畫好。請畫出圖形的另一半。',
      lead: '由一個交叉點拖到另一個交叉點來畫線。可以先數一數每個頂點到對稱軸有幾格。'
    },
    {
      id: 'v-quad',
      axis: G.verticalAxis(6),
      axisLabel: '垂直的對稱軸',
      vertices: [{ x: 6, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 7 }, { x: 6, y: 9 }, { x: 11, y: 7 }, { x: 10, y: 2 }],
      given: [0, 3],
      givenOff: [1, 2],
      prompt: '請補畫這個圖形的另一半。',
      lead: '對摺後兩邊要完全重合。數一數每個頂點到對稱軸有幾格。'
    },
    {
      id: 'v-complex',
      axis: G.verticalAxis(6),
      axisLabel: '垂直的對稱軸',
      vertices: [
        { x: 6, y: 1 }, { x: 4, y: 2 }, { x: 1, y: 4 }, { x: 2, y: 8 },
        { x: 5, y: 11 }, { x: 6, y: 11 }, { x: 7, y: 11 }, { x: 10, y: 8 },
        { x: 11, y: 4 }, { x: 8, y: 2 }
      ],
      given: [0, 5],
      givenOff: [1, 2, 3, 4],
      prompt: '請畫出圖形的另一半，完成這個圖形。',
      lead: '頂點較多，可以逐個數格，再把對稱點連起來。'
    },
    {
      id: 'h-triangle',
      axis: G.horizontalAxis(6),
      axisLabel: '水平的對稱軸',
      vertices: [{ x: 2, y: 6 }, { x: 3, y: 2 }, { x: 8, y: 3 }, { x: 10, y: 6 }, { x: 8, y: 9 }, { x: 3, y: 10 }],
      given: [0, 3],
      givenOff: [1, 2],
      prompt: '對稱軸是水平的。請補畫另一半。',
      lead: '向上或向下數格，距離要相同。'
    },
    {
      id: 'h-quad',
      axis: G.horizontalAxis(6),
      axisLabel: '水平的對稱軸',
      vertices: [{ x: 1, y: 6 }, { x: 2, y: 2 }, { x: 7, y: 1 }, { x: 11, y: 6 }, { x: 7, y: 11 }, { x: 2, y: 10 }],
      given: [0, 3],
      givenOff: [1, 2],
      prompt: '請補畫這個圖形的另一半。',
      lead: '數一數每個頂點到對稱軸有幾格。'
    },
    {
      id: 'h-complex',
      axis: G.horizontalAxis(6),
      axisLabel: '水平的對稱軸',
      vertices: [
        { x: 1, y: 6 }, { x: 1, y: 3 }, { x: 4, y: 1 }, { x: 8, y: 0 },
        { x: 11, y: 2 }, { x: 11, y: 6 }, { x: 11, y: 10 }, { x: 8, y: 12 },
        { x: 4, y: 11 }, { x: 1, y: 9 }
      ],
      given: [0, 5],
      givenOff: [1, 2, 3, 4],
      prompt: '請畫出圖形的另一半，完成這個圖形。',
      lead: '先找出離對稱軸最遠的頂點，數一數有幾格，再畫出對稱的邊。'
    },
    {
      id: 'd-simple',
      axis: G.diagonalAxis(1, 0),
      axisLabel: '傾斜的對稱軸',
      vertices: [{ x: 2, y: 2 }, { x: 2, y: 6 }, { x: 6, y: 6 }, { x: 6, y: 2 }],
      given: [0, 2],
      givenOff: [1],
      prompt: '對稱軸是傾斜的。請畫出圖形的另一半。',
      lead: '由一個交叉點拖到另一個交叉點來畫線。對稱點與原頂點到對稱軸的格數相同。'
    },
    {
      id: 'd-quad',
      axis: G.diagonalAxis(1, 0),
      axisLabel: '傾斜的對稱軸',
      vertices: [{ x: 2, y: 2 }, { x: 2, y: 6 }, { x: 5, y: 9 }, { x: 9, y: 9 }, { x: 9, y: 5 }, { x: 6, y: 2 }],
      given: [0, 3],
      givenOff: [1, 2],
      prompt: '請補畫這個圖形的另一半。',
      lead: '沿著垂直於對稱軸的方向數格。'
    },
    {
      id: 'd-complex',
      axis: G.diagonalAxis(1, 0),
      axisLabel: '傾斜的對稱軸',
      vertices: [
        { x: 1, y: 1 }, { x: 1, y: 5 }, { x: 3, y: 9 }, { x: 7, y: 11 },
        { x: 11, y: 11 }, { x: 11, y: 7 }, { x: 9, y: 3 }, { x: 5, y: 1 }
      ],
      given: [0, 4],
      givenOff: [1, 2, 3],
      prompt: '請畫出圖形的另一半，完成這個圖形。',
      lead: '可以先從離對稱軸最近的頂點開始數格，再畫線。'
    },
    {
      id: 'd2-challenge',
      axis: G.diagonalAxis(-1, 12),
      axisLabel: '傾斜的對稱軸',
      vertices: [
        { x: 3, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 6 }, { x: 5, y: 5 },
        { x: 8, y: 4 }, { x: 7, y: 7 }, { x: 6, y: 10 }, { x: 3, y: 11 }
      ],
      given: [0, 4],
      givenOff: [1, 2, 3],
      prompt: '請補畫這個圖形的另一半。',
      lead: '這條對稱軸向另一邊傾斜。數格的方法一樣。'
    }
  ];

  function itemOf() { return ITEMS[state.index]; }

  function givenIndexSet(item) {
    var set = {};
    (item.given || []).concat(item.givenOff || []).forEach(function (i) {
      set[i] = true;
    });
    return set;
  }

  function givenPoints(item) {
    var set = givenIndexSet(item);
    var out = [];
    item.vertices.forEach(function (p, i) {
      if (set[i]) out.push({ x: p.x, y: p.y, i: i });
    });
    return out;
  }

  function targetPoints(item) {
    var given = givenIndexSet(item);
    var out = [];
    item.vertices.forEach(function (p, i) {
      if (!given[i]) out.push({ x: p.x, y: p.y, i: i });
    });
    return out;
  }

  function isGivenPoint(item, p) {
    return givenPoints(item).some(function (g) { return g.x === p.x && g.y === p.y; });
  }

  function isTargetPoint(item, p) {
    return targetPoints(item).some(function (g) { return g.x === p.x && g.y === p.y; });
  }

  function edgeKey(a, b) {
    var ka = a.x + ',' + a.y;
    var kb = b.x + ',' + b.y;
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  }

  function samePoint(a, b) {
    return a && b && a.x === b.x && a.y === b.y;
  }

  function polygonEdges(vertices) {
    var out = [];
    var n = vertices.length;
    for (var i = 0; i < n; i++) {
      out.push({ a: vertices[i], b: vertices[(i + 1) % n] });
    }
    return out;
  }

  /* Edges of the complete polygon whose two ends already belong to the given half. */
  function givenHalfEdges(item) {
    var given = givenIndexSet(item);
    var verts = item.vertices;
    var out = [];
    for (var i = 0; i < verts.length; i++) {
      var j = (i + 1) % verts.length;
      if (given[i] && given[j]) out.push({ a: verts[i], b: verts[j] });
    }
    return out;
  }

  /* Edges the student must draw: complete-polygon edges not already in the given half. */
  function expectedStudentEdges(item) {
    var given = givenIndexSet(item);
    var verts = item.vertices;
    var out = [];
    for (var i = 0; i < verts.length; i++) {
      var j = (i + 1) % verts.length;
      if (!(given[i] && given[j])) out.push({ a: verts[i], b: verts[j] });
    }
    return out;
  }

  function isGivenEdge(item, a, b) {
    var k = edgeKey(a, b);
    return givenHalfEdges(item).some(function (e) { return edgeKey(e.a, e.b) === k; });
  }

  /* Layout in an SVG viewBox with padding around the 12×12 grid. */
  var PAD = 36;
  var VB = 400;
  var SPAN = VB - PAD * 2;

  function toSvg(p) {
    return { x: PAD + (p.x / GRID) * SPAN, y: PAD + (p.y / GRID) * SPAN };
  }

  function fromSvg(x, y) {
    var gx = (x - PAD) / SPAN * GRID;
    var gy = (y - PAD) / SPAN * GRID;
    return { x: Math.round(gx), y: Math.round(gy) };
  }

  function presentKeys(item) {
    var keys = {};
    givenPoints(item).forEach(function (p) { keys[keyOf(p)] = true; });
    state.strokes.forEach(function (e) {
      keys[keyOf(e.a)] = true;
      keys[keyOf(e.b)] = true;
    });
    return keys;
  }

  function drawGrid(svg) {
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    for (var i = 0; i <= GRID; i++) {
      var a = toSvg({ x: i, y: 0 });
      var b = toSvg({ x: i, y: GRID });
      var c = toSvg({ x: 0, y: i });
      var d = toSvg({ x: GRID, y: i });
      var v = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      v.setAttribute('x1', a.x); v.setAttribute('y1', a.y);
      v.setAttribute('x2', b.x); v.setAttribute('y2', b.y);
      v.setAttribute('stroke', i === 0 || i === GRID ? '#1e2a4a' : '#d8cbb3');
      v.setAttribute('stroke-width', i === 0 || i === GRID ? 2.2 : 1.2);
      var h = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      h.setAttribute('x1', c.x); h.setAttribute('y1', c.y);
      h.setAttribute('x2', d.x); h.setAttribute('y2', d.y);
      h.setAttribute('stroke', i === 0 || i === GRID ? '#1e2a4a' : '#d8cbb3');
      h.setAttribute('stroke-width', i === 0 || i === GRID ? 2.2 : 1.2);
      g.appendChild(v);
      g.appendChild(h);
    }
    svg.appendChild(g);
  }

  function drawAxis(svg, item) {
    /* Extend the axis across the padded grid. */
    var ends;
    if (item.axis.kind === 'vertical') {
      ends = [toSvg({ x: item.axis.x, y: -0.4 }), toSvg({ x: item.axis.x, y: GRID + 0.4 })];
    } else if (item.axis.kind === 'horizontal') {
      ends = [toSvg({ x: -0.4, y: item.axis.y }), toSvg({ x: GRID + 0.4, y: item.axis.y })];
    } else if (item.axis.slope === 1) {
      /* y = x + c. In our items c=0, from (0,0) to (12,12). */
      var c = item.axis.intercept;
      ends = [toSvg({ x: 0, y: c }), toSvg({ x: GRID, y: GRID + c })];
      if (c !== 0) {
        ends = [toSvg({ x: Math.max(0, -c), y: Math.max(0, c) }), toSvg({ x: Math.min(GRID, GRID - c), y: Math.min(GRID, GRID + c) })];
      }
    } else {
      /* y = -x + k, k=12: (0,12) to (12,0) */
      var k = item.axis.intercept;
      ends = [toSvg({ x: 0, y: k }), toSvg({ x: k, y: 0 })];
    }
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', ends[0].x); line.setAttribute('y1', ends[0].y);
    line.setAttribute('x2', ends[1].x); line.setAttribute('y2', ends[1].y);
    line.setAttribute('stroke', '#c98910');
    line.setAttribute('stroke-width', 5);
    line.setAttribute('stroke-dasharray', '12 8');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('pointer-events', 'none');
    svg.appendChild(line);

    var mid = { x: (ends[0].x + ends[1].x) / 2, y: (ends[0].y + ends[1].y) / 2 };
    var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    var lx = mid.x, ly = mid.y;
    if (item.axis.kind === 'vertical') { lx = mid.x + 34; ly = PAD + 14; }
    else if (item.axis.kind === 'horizontal') { lx = PAD + 58; ly = mid.y - 12; }
    else { lx = mid.x + 28; ly = mid.y - 16; }
    label.setAttribute('x', lx);
    label.setAttribute('y', ly);
    label.setAttribute('class', 'axisLabel');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = '對稱軸';
    svg.appendChild(label);
  }

  function vertexOrderPoints(item) {
    return item.vertices;
  }

  function drawSegment(svg, a, b, opt) {
    opt = opt || {};
    var pa = toSvg(a), pb = toSvg(b);
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', pa.x); line.setAttribute('y1', pa.y);
    line.setAttribute('x2', pb.x); line.setAttribute('y2', pb.y);
    line.setAttribute('stroke', opt.stroke || '#1e2a4a');
    line.setAttribute('stroke-width', opt.width || 4);
    line.setAttribute('stroke-linecap', 'round');
    if (opt.dash) line.setAttribute('stroke-dasharray', opt.dash);
    line.setAttribute('pointer-events', 'none');
    if (opt.cls) line.setAttribute('class', opt.cls);
    svg.appendChild(line);
    return line;
  }

  function drawGivenHalf(svg, item, opt) {
    opt = opt || {};
    var verts = item.vertices;
    var givenSet = givenIndexSet(item);
    var half = [];
    verts.forEach(function (p, i) {
      if (givenSet[i]) half.push(p);
    });
    if (half.length >= 3 && !opt.noFill) {
      var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      poly.setAttribute('points', half.map(function (p) {
        var s = toSvg(p); return s.x + ',' + s.y;
      }).join(' '));
      poly.setAttribute('fill', 'rgba(94,201,168,0.45)');
      poly.setAttribute('stroke', 'none');
      poly.setAttribute('pointer-events', 'none');
      svg.appendChild(poly);
    }
    givenHalfEdges(item).forEach(function (e) {
      drawSegment(svg, e.a, e.b, { stroke: '#1e2a4a', width: 4 });
    });
  }

  function drawStudentStrokes(svg, item, review) {
    var expected = {};
    expectedStudentEdges(item).forEach(function (e) {
      expected[edgeKey(e.a, e.b)] = true;
    });
    state.strokes.forEach(function (e) {
      var k = edgeKey(e.a, e.b);
      var ok = expected[k];
      var stroke = '#d64545';
      if (review && review.complete && ok) stroke = '#1a8a5c';
      else if (review && !ok) stroke = '#d64545';
      else if (ok) stroke = '#d64545';
      drawSegment(svg, e.a, e.b, { stroke: stroke, width: 4.5 });
    });
    if (review && review.missing) {
      review.missing.forEach(function (e) {
        drawSegment(svg, e.a, e.b, { stroke: '#1a8a5c', width: 4, dash: '6 5' });
      });
    }
  }

  function drawDots(svg, item, review) {
    givenPoints(item).forEach(function (p) {
      dot(svg, p, '#1e2a4a', 7);
    });
    var seen = {};
    state.strokes.forEach(function (e) {
      [e.a, e.b].forEach(function (p) {
        var k = keyOf(p);
        if (seen[k] || isGivenPoint(item, p)) return;
        seen[k] = true;
        var fill = '#d64545';
        if (review && review.complete) fill = '#1a8a5c';
        dot(svg, p, fill, 7);
      });
    });
    if (state.pending) {
      var s = toSvg(state.pending);
      var halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      halo.setAttribute('cx', s.x); halo.setAttribute('cy', s.y); halo.setAttribute('r', 11);
      halo.setAttribute('fill', 'none');
      halo.setAttribute('stroke', '#d64545');
      halo.setAttribute('stroke-width', 3);
      halo.setAttribute('pointer-events', 'none');
      svg.appendChild(halo);
    }
  }

  function dot(svg, p, fill, r) {
    var s = toSvg(p);
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', s.x); c.setAttribute('cy', s.y); c.setAttribute('r', r);
    c.setAttribute('fill', fill);
    c.setAttribute('stroke', '#fff6e8');
    c.setAttribute('stroke-width', 2);
    c.setAttribute('pointer-events', 'none');
    svg.appendChild(c);
  }

  function drawHint(svg, item) {
    var off = (item.givenOff || [])[0];
    if (off == null) return;
    var p = item.vertices[off];
    var foot = G.projectToAxis(p, item.axis);
    var footG = { x: Math.round(foot.x), y: Math.round(foot.y) };
    var a = toSvg(p);
    var b = toSvg(G.pointsEqual(foot, footG, 0.01) ? footG : foot);
    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
    line.setAttribute('stroke', '#d64545');
    line.setAttribute('stroke-width', 3);
    line.setAttribute('stroke-dasharray', '5 4');
    line.setAttribute('pointer-events', 'none');
    svg.appendChild(line);
    var n = G.countSquaresToAxis(p, item.axis);
    var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    var tnode = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    tnode.setAttribute('x', mid.x + 10);
    tnode.setAttribute('y', mid.y - 6);
    tnode.setAttribute('class', 'hintMark');
    tnode.textContent = '有 ' + n + ' 格';
    svg.appendChild(tnode);
    var halo = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    var s = toSvg(p);
    halo.setAttribute('cx', s.x); halo.setAttribute('cy', s.y); halo.setAttribute('r', 12);
    halo.setAttribute('fill', 'none');
    halo.setAttribute('stroke', '#d64545');
    halo.setAttribute('stroke-width', 3);
    halo.setAttribute('pointer-events', 'none');
    svg.appendChild(halo);
  }

  function render(review) {
    var item = itemOf();
    var mount = $('stage2');
    mount.innerHTML = '';
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 ' + VB + ' ' + VB);
    svg.setAttribute('role', 'img');
    svg.style.touchAction = 'none';

    var paper = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    paper.setAttribute('x', PAD - 8); paper.setAttribute('y', PAD - 8);
    paper.setAttribute('width', SPAN + 16); paper.setAttribute('height', SPAN + 16);
    paper.setAttribute('fill', '#fffdf6');
    paper.setAttribute('stroke', '#e8d2b0');
    paper.setAttribute('stroke-width', 2);
    paper.setAttribute('rx', 8);
    svg.appendChild(paper);

    drawGrid(svg);
    if (review && review.complete) {
      var full = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      full.setAttribute('points', item.vertices.map(function (p) {
        var s = toSvg(p); return s.x + ',' + s.y;
      }).join(' '));
      full.setAttribute('fill', 'rgba(94,201,168,0.5)');
      full.setAttribute('stroke', 'none');
      full.setAttribute('pointer-events', 'none');
      svg.appendChild(full);
    }
    drawGivenHalf(svg, item, { noFill: review && review.complete });
    drawStudentStrokes(svg, item, review);
    if (review && review.complete) {
      polygonEdges(item.vertices).forEach(function (e) {
        drawSegment(svg, e.a, e.b, { stroke: '#1e2a4a', width: 4 });
      });
    }
    drawAxis(svg, item);
    if (state.attempts >= 1 && !state.locked && !review) drawHint(svg, item);
    if (review && review.showHint) drawHint(svg, item);
    drawDots(svg, item, review);

    for (var y = 0; y <= GRID; y++) {
      for (var x = 0; x <= GRID; x++) {
        var pnt = { x: x, y: y };
        if (isGivenPoint(item, pnt)) continue;
        var occupied = state.strokes.some(function (e) {
          return samePoint(e.a, pnt) || samePoint(e.b, pnt);
        });
        if (occupied) continue;
        var s = toSvg(pnt);
        var lattice = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        lattice.setAttribute('cx', s.x); lattice.setAttribute('cy', s.y); lattice.setAttribute('r', 2.2);
        lattice.setAttribute('fill', '#c8b89a');
        lattice.setAttribute('pointer-events', 'none');
        svg.appendChild(lattice);
      }
    }

    var rubber = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    rubber.setAttribute('class', 'rubber');
    rubber.setAttribute('x1', 0); rubber.setAttribute('y1', 0);
    rubber.setAttribute('x2', 0); rubber.setAttribute('y2', 0);
    rubber.setAttribute('stroke', '#d64545');
    rubber.setAttribute('stroke-width', 4);
    rubber.setAttribute('stroke-linecap', 'round');
    rubber.setAttribute('stroke-dasharray', '8 6');
    rubber.setAttribute('pointer-events', 'none');
    rubber.style.display = 'none';
    svg.appendChild(rubber);
    svg._rubber = rubber;

    var catcher = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    catcher.setAttribute('x', 0);
    catcher.setAttribute('y', 0);
    catcher.setAttribute('width', VB);
    catcher.setAttribute('height', VB);
    catcher.setAttribute('fill', 'transparent');
    catcher.style.touchAction = 'none';
    svg.appendChild(catcher);

    if (!state.locked) {
      svg.style.cursor = 'crosshair';
      svg.addEventListener('pointerdown', onPointerDown);
      svg.addEventListener('pointermove', onPointerMove);
      svg.addEventListener('pointerup', onPointerUp);
      svg.addEventListener('pointercancel', onPointerCancel);
    }
    mount.appendChild(svg);
  }

  var SNAP = 0.4;

  function pointerToGrid(svg, ev) {
    var rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return { ok: false };
    var rawX = (ev.clientX - rect.left) / rect.width * VB;
    var rawY = (ev.clientY - rect.top) / rect.height * VB;
    var gx = (rawX - PAD) / SPAN * GRID;
    var gy = (rawY - PAD) / SPAN * GRID;
    var snapped = { x: Math.round(gx), y: Math.round(gy) };
    var dist = Math.hypot(gx - snapped.x, gy - snapped.y);
    var inRange = snapped.x >= 0 && snapped.x <= GRID && snapped.y >= 0 && snapped.y <= GRID && dist <= SNAP;
    return {
      ok: inRange,
      snapped: snapped,
      rawSvg: { x: rawX, y: rawY },
      gx: gx,
      gy: gy,
      dist: dist
    };
  }

  function setRubber(svg, a, bSvg, show) {
    var rubber = svg._rubber;
    if (!rubber) return;
    if (!show) {
      rubber.style.display = 'none';
      return;
    }
    var pa = toSvg(a);
    rubber.setAttribute('x1', pa.x);
    rubber.setAttribute('y1', pa.y);
    rubber.setAttribute('x2', bSvg.x);
    rubber.setAttribute('y2', bSvg.y);
    rubber.style.display = '';
  }

  function addStroke(a, b) {
    if (samePoint(a, b)) return false;
    if (isGivenEdge(itemOf(), a, b)) return false;
    var k = edgeKey(a, b);
    for (var i = 0; i < state.strokes.length; i++) {
      if (edgeKey(state.strokes[i].a, state.strokes[i].b) === k) return false;
    }
    state.strokes.push({ a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } });
    return true;
  }

  function onPointerDown(ev) {
    if (state.locked) return;
    if (ev.button != null && ev.button !== 0) return;
    ev.preventDefault();
    var svg = ev.currentTarget;
    var g = pointerToGrid(svg, ev);
    if (!g.ok) return;
    try { svg.setPointerCapture(ev.pointerId); } catch (err) { /* ignore */ }
    state.drag = {
      start: g.snapped,
      pointerId: ev.pointerId,
      moved: false
    };
    setRubber(svg, g.snapped, toSvg(g.snapped), true);
  }

  function onPointerMove(ev) {
    if (!state.drag || ev.pointerId !== state.drag.pointerId) return;
    ev.preventDefault();
    var svg = ev.currentTarget;
    var g = pointerToGrid(svg, ev);
    var follow = g.ok ? toSvg(g.snapped) : (g.rawSvg || toSvg(state.drag.start));
    var startSvg = toSvg(state.drag.start);
    if (g.rawSvg && Math.hypot(g.rawSvg.x - startSvg.x, g.rawSvg.y - startSvg.y) > 6) {
      state.drag.moved = true;
    }
    setRubber(svg, state.drag.start, follow, true);
  }

  function onPointerUp(ev) {
    if (!state.drag || ev.pointerId !== state.drag.pointerId) return;
    ev.preventDefault();
    var svg = ev.currentTarget;
    var start = state.drag.start;
    var moved = state.drag.moved;
    var g = pointerToGrid(svg, ev);
    state.drag = null;
    setRubber(svg, start, start, false);
    try { svg.releasePointerCapture(ev.pointerId); } catch (err) { /* ignore */ }

    if (moved) {
      state.pending = null;
      if (g.ok && !samePoint(start, g.snapped)) addStroke(start, g.snapped);
      render(state.attempts >= 1 ? { showHint: true } : null);
      return;
    }

    /* Click without a real drag: click-then-click of two points. */
    if (g.ok) {
      if (state.pending && !samePoint(state.pending, g.snapped)) {
        addStroke(state.pending, g.snapped);
        state.pending = null;
        render(state.attempts >= 1 ? { showHint: true } : null);
        return;
      }
      state.pending = g.snapped;
      render(state.attempts >= 1 ? { showHint: true } : null);
      return;
    }
  }

  function onPointerCancel(ev) {
    if (!state.drag || ev.pointerId !== state.drag.pointerId) return;
    state.drag = null;
    var svg = ev.currentTarget;
    setRubber(svg, { x: 0, y: 0 }, { x: 0, y: 0 }, false);
  }

  function compareStrokes(item) {
    var expected = expectedStudentEdges(item);
    var expSet = {};
    expected.forEach(function (e) { expSet[edgeKey(e.a, e.b)] = e; });
    var gotSet = {};
    state.strokes.forEach(function (e) { gotSet[edgeKey(e.a, e.b)] = e; });
    var missing = [];
    var extra = [];
    expected.forEach(function (e) {
      if (!gotSet[edgeKey(e.a, e.b)]) missing.push(e);
    });
    state.strokes.forEach(function (e) {
      if (!expSet[edgeKey(e.a, e.b)]) extra.push(e);
    });
    return { missing: missing, extra: extra, ok: missing.length === 0 && extra.length === 0 };
  }

  function setButtons(which) {
    var play = which === 'play';
    $('btnUndo2').hidden = !play;
    $('btnClear2').hidden = !play;
    $('btnCheck2').hidden = !play;
    $('btnRetry2').hidden = which !== 'retry';
    $('btnNext2').hidden = which !== 'next';
    if (which === 'next') {
      $('btnNext2').textContent = state.index >= TOTAL - 1 ? '查看成績' : '下一題';
    }
  }

  function foldCompleted(item, done) {
    var mount = $('stage2');
    var svg = mount.querySelector('svg');
    if (!svg) { if (done) done(); return; }

    /* Build the completed polygon in SVG coords and fold it. */
    var verts = item.vertices.map(toSvg);
    var axis;
    if (item.axis.kind === 'vertical') {
      axis = G.verticalAxis(toSvg({ x: item.axis.x, y: 0 }).x);
    } else if (item.axis.kind === 'horizontal') {
      axis = G.horizontalAxis(toSvg({ x: 0, y: item.axis.y }).y);
    } else if (item.axis.slope === 1) {
      /* y = x + c in grid → svg: both x,y affine with same scale and pad, intercept maps to? */
      /* svgX = PAD + gridX/GRID*SPAN, svgY = PAD + gridY/GRID*SPAN
         gridY = gridX + c  => svgY = svgX + c*SPAN/GRID */
      axis = G.diagonalAxis(1, item.axis.intercept * SPAN / GRID);
    } else {
      /* grid y = -x + k → svgY - PAD = -(svgX - PAD) + k*SPAN/GRID
         svgY = -svgX + 2*PAD + k*SPAN/GRID */
      axis = G.diagonalAxis(-1, 2 * PAD + item.axis.intercept * SPAN / GRID);
    }

    var stay = G.clipPolygonHalf(verts, axis, -1);
    var flap = G.clipPolygonHalf(verts, axis, 1);
    if (stay.length < 3 || flap.length < 3) { if (done) done(); return; }

    var flapG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    var poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', flap.map(function (p) { return p.x + ',' + p.y; }).join(' '));
    poly.setAttribute('fill', 'rgba(242,193,78,0.75)');
    poly.setAttribute('stroke', '#1e2a4a');
    poly.setAttribute('stroke-width', 3);
    flapG.appendChild(poly);
    svg.appendChild(flapG);

    var around = toSvg({ x: 6, y: 6 });
    function apply(s) {
      flapG.setAttribute('transform', G.foldTransformAt(axis, s, around));
    }
    if (App.prefersReducedMotion()) { apply(-1); if (done) done(); return; }
    var t0 = null;
    function frame(now) {
      if (t0 == null) t0 = now;
      var t = Math.min(1, (now - t0) / 1100);
      var eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      apply(Math.cos(Math.PI * eased));
      if (t < 1) requestAnimationFrame(frame);
      else { apply(-1); if (done) done(); }
    }
    requestAnimationFrame(frame);
  }

  function check() {
    if (state.locked) return;
    var item = itemOf();
    var result = compareStrokes(item);
    state.attempts += 1;
    if (result.ok) {
      state.locked = true;
      state.pending = null;
      if (state.attempts === 1) state.correct += 1;
      $('scorePill2').textContent = '答對 ' + state.correct;
      App.setFeedback($('feedback2'), 'ok', '答對了！沿對稱軸對摺，兩邊能完全重合。');
      App.sfxOk();
      render({ complete: true });
      setButtons('none');
      foldCompleted(item, function () { setButtons('next'); });
      return;
    }

    var hint = '數一數這個頂點到對稱軸有幾格，再在另一邊同樣格數的位置畫出對稱的邊。';
    if (result.extra.length && !result.missing.length) {
      hint = '有些線的位置不正確。數一數這個頂點到對稱軸有幾格，再試一次。';
    } else if (result.missing.length && !result.extra.length) {
      hint = '還有一些邊未畫出。數一數這個頂點到對稱軸有幾格。';
    }

    if (state.attempts === 1) {
      App.setFeedback($('feedback2'), 'bad', hint);
      App.sfxNo();
      setButtons('play');
      $('btnRetry2').hidden = false;
      render({ showHint: true });
      return;
    }

    /* Later miss: reveal missing edges, then play the fold. */
    state.locked = true;
    state.pending = null;
    App.setFeedback($('feedback2'), 'bad', hint);
    App.sfxNo();
    render({ missing: result.missing, extra: result.extra, complete: true });
    setButtons('none');
    foldCompleted(item, function () { setButtons('next'); });
  }

  function retry() {
    if (state.locked) return;
    var item = itemOf();
    var result = compareStrokes(item);
    var extraKeys = {};
    result.extra.forEach(function (e) { extraKeys[edgeKey(e.a, e.b)] = true; });
    state.strokes = state.strokes.filter(function (e) {
      return !extraKeys[edgeKey(e.a, e.b)];
    });
    state.pending = null;
    setButtons('play');
    App.setFeedback($('feedback2'), '', '已留下正確的線。請繼續畫出其餘的邊。');
    render({ showHint: true });
  }

  function undoLast() {
    if (state.locked) return;
    if (state.pending) {
      state.pending = null;
      render(state.attempts >= 1 ? { showHint: true } : null);
      return;
    }
    if (!state.strokes.length) return;
    state.strokes.pop();
    render(state.attempts >= 1 ? { showHint: true } : null);
  }

  function clearAll() {
    if (state.locked) return;
    state.strokes = [];
    state.pending = null;
    render(state.attempts >= 1 ? { showHint: true } : null);
  }

  function showQuestion() {
    var item = itemOf();
    state.locked = false;
    state.attempts = 0;
    state.strokes = [];
    state.pending = null;
    state.drag = null;
    $('prog2').textContent = '第 ' + (state.index + 1) + '／' + TOTAL + ' 題';
    $('scorePill2').textContent = '答對 ' + state.correct;
    $('barFill2').style.width = (state.index / TOTAL * 100) + '%';
    $('prompt2').textContent = item.prompt;
    $('lead2').textContent = (item.axisLabel ? item.axisLabel + '。' : '') + (item.lead || '');
    App.setFeedback($('feedback2'), '', '由一個交叉點拖到另一個交叉點，畫出圖形的另一半。然後按「完成」。');
    setButtons('play');
    render();
  }

  function next() {
    if (state.index >= TOTAL - 1) {
      finish();
      return;
    }
    state.index += 1;
    showQuestion();
  }

  function finish() {
    var stars = G.starsFor(state.correct, TOTAL);
    var html = '';
    for (var i = 0; i < 3; i++) {
      html += i < stars ? '<span class="star on">⭐</span>' : '<span class="star">☆</span>';
    }
    $('end2Stars').innerHTML = html;
    $('end2Title').textContent = stars >= 3 ? '真棒！' : stars === 2 ? '做得好！' : stars === 1 ? '繼續加油！' : '再試一次！';
    $('end2Score').textContent = '答對 ' + state.correct + '／' + TOTAL;
    if (!App.isTeacher()) {
      var best = App.readBest(App.LS_BEST2);
      var improved = !best || state.correct > best.score || (state.correct === best.score && stars > best.stars);
      if (improved) App.writeBest(App.LS_BEST2, state.correct, stars);
      var shown = improved ? { score: state.correct, stars: stars } : best;
      $('end2Best').textContent = shown ? ('這部裝置最高 ' + shown.score + '／' + TOTAL + '　' + App.starsText(shown.stars)) : '';
    } else {
      $('end2Best').textContent = '';
    }
    if (stars >= 2) App.sfxOk();
    App.show('end2');
    App.paintBest();
  }

  function startLesson2() {
    App = window.P6Symmetry;
    App.ensureAudio();
    state.index = 0;
    state.correct = 0;
    App.paintModePill();
    App.show('play2');
    showQuestion();
  }

  function onReady() {
    App = window.P6Symmetry;
    $('btnStart2').addEventListener('click', startLesson2);
    $('btnHome2').addEventListener('click', function () { App.goHome(); });
    $('btnMenu2').addEventListener('click', function () { App.goHome(); });
    $('btnAgain2').addEventListener('click', startLesson2);
    $('btnCheck2').addEventListener('click', check);
    $('btnUndo2').addEventListener('click', undoLast);
    $('btnClear2').addEventListener('click', clearAll);
    $('btnRetry2').addEventListener('click', retry);
    $('btnNext2').addEventListener('click', next);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
    else onReady();
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = {
      ITEMS: ITEMS,
      GRID: GRID,
      edgeKey: edgeKey,
      givenHalfEdges: givenHalfEdges,
      expectedStudentEdges: expectedStudentEdges,
      givenIndexSet: givenIndexSet,
      polygonEdges: polygonEdges
    };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
