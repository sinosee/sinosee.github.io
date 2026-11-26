/* 軸對稱平面圖形 — geometry helpers (browser + Node). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SymmetryGeo = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var EPS = 1e-6;
  var INF = Infinity;

  function almostEqual(a, b, eps) {
    return Math.abs(a - b) <= (eps == null ? EPS : eps);
  }

  function pointsEqual(p, q, eps) {
    var e = eps == null ? EPS : eps;
    return almostEqual(p.x, q.x, e) && almostEqual(p.y, q.y, e);
  }

  function mid(p, q) {
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
  }

  function dist(p, q) {
    var dx = p.x - q.x, dy = p.y - q.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function sub(p, q) { return { x: p.x - q.x, y: p.y - q.y }; }
  function add(p, q) { return { x: p.x + q.x, y: p.y + q.y }; }
  function scale(p, s) { return { x: p.x * s, y: p.y * s }; }
  function dot(p, q) { return p.x * q.x + p.y * q.y; }
  function cross(p, q) { return p.x * q.y - p.y * q.x; }

  function hypot(x, y) { return Math.sqrt(x * x + y * y); }

  function verticalAxis(x) {
    return { kind: 'vertical', x: x };
  }

  function horizontalAxis(y) {
    return { kind: 'horizontal', y: y };
  }

  /* y = slope * x + intercept, slope is +1 or -1 (45° on a square grid). */
  function diagonalAxis(slope, intercept) {
    return { kind: 'diagonal', slope: slope, intercept: intercept };
  }

  function lineAxis(p1, p2) {
    return { kind: 'line', p1: { x: p1.x, y: p1.y }, p2: { x: p2.x, y: p2.y } };
  }

  function aPointOnAxis(axis) {
    if (axis.kind === 'vertical') return { x: axis.x, y: 0 };
    if (axis.kind === 'horizontal') return { x: 0, y: axis.y };
    if (axis.kind === 'diagonal') return { x: 0, y: axis.intercept };
    return { x: axis.p1.x, y: axis.p1.y };
  }

  /* Direction angle of the axis, in radians, in the same coord system as the points. */
  function axisDirectionAngle(axis) {
    if (axis.kind === 'vertical') return Math.PI / 2;
    if (axis.kind === 'horizontal') return 0;
    if (axis.kind === 'diagonal') {
      return axis.slope >= 0 ? Math.PI / 4 : -Math.PI / 4;
    }
    return Math.atan2(axis.p2.y - axis.p1.y, axis.p2.x - axis.p1.x);
  }

  function axisUnit(axis) {
    var a = axisDirectionAngle(axis);
    return { x: Math.cos(a), y: Math.sin(a) };
  }

  /* Signed distance: left of the directed axis is positive (CCW). */
  function signedDistance(p, axis) {
    if (axis.kind === 'vertical') return p.x - axis.x;
    if (axis.kind === 'horizontal') return p.y - axis.y;
    if (axis.kind === 'diagonal') {
      /* For y = sx + c, (s=±1), a unit normal is related to (s, -1) / √2.
         Use (p.y - (s*p.x + c)) / √2 so the sign follows "above the line". */
      var raw = p.y - (axis.slope * p.x + axis.intercept);
      return raw / Math.SQRT2;
    }
    var u = axisUnit(axis);
    var a = axis.p1;
    return u.x * (p.y - a.y) - u.y * (p.x - a.x);
  }

  function pointOnAxis(p, axis, eps) {
    return Math.abs(signedDistance(p, axis)) <= (eps == null ? EPS : eps);
  }

  function projectToAxis(p, axis) {
    var a = aPointOnAxis(axis);
    var u = axisUnit(axis);
    var ap = sub(p, a);
    return add(a, scale(u, dot(ap, u)));
  }

  function reflectPoint(p, axis) {
    if (axis.kind === 'vertical') {
      return { x: 2 * axis.x - p.x, y: p.y };
    }
    if (axis.kind === 'horizontal') {
      return { x: p.x, y: 2 * axis.y - p.y };
    }
    if (axis.kind === 'diagonal') {
      if (axis.slope === 1 || axis.slope === +1) {
        /* y = x + c  →  (y - c, x + c) */
        var c = axis.intercept;
        return { x: p.y - c, y: p.x + c };
      }
      /* y = -x + c  →  (c - y, c - x) */
      var k = axis.intercept;
      return { x: k - p.y, y: k - p.x };
    }
    var foot = projectToAxis(p, axis);
    return { x: 2 * foot.x - p.x, y: 2 * foot.y - p.y };
  }

  function reflectPoints(pts, axis) {
    var out = [];
    for (var i = 0; i < pts.length; i++) out.push(reflectPoint(pts[i], axis));
    return out;
  }

  /* Whole number of grid squares from a lattice point to the axis.
     For 45° axes, this is the number of diagonal steps, and is an integer
     only when the perpendicular foot lands on a grid point. */
  function countSquaresToAxis(p, axis) {
    if (axis.kind === 'vertical') return Math.abs(p.x - axis.x);
    if (axis.kind === 'horizontal') return Math.abs(p.y - axis.y);
    if (axis.kind === 'diagonal') {
      if (axis.slope === 1 || axis.slope === +1) {
        return Math.abs(p.y - (p.x + axis.intercept)) / 2;
      }
      return Math.abs(p.y - (-p.x + axis.intercept)) / 2;
    }
    return Math.abs(signedDistance(p, axis));
  }

  function intersectSegmentAxis(a, b, axis) {
    var da = signedDistance(a, axis);
    var db = signedDistance(b, axis);
    if (almostEqual(da, db)) return mid(a, b);
    var t = da / (da - db);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }

  /* Clip a polygon to one side of an axis (Sutherland–Hodgman).
     side = +1 keeps positive signed distance; -1 keeps negative.
     Points on the axis are kept. */
  function clipPolygonHalf(vertices, axis, side) {
    var out = [];
    var n = vertices.length;
    if (!n) return out;
    var eps = 1e-8;
    for (var i = 0; i < n; i++) {
      var a = vertices[i];
      var b = vertices[(i + 1) % n];
      var da = signedDistance(a, axis);
      var db = signedDistance(b, axis);
      var aIn = da * side >= -eps;
      var bIn = db * side >= -eps;
      if (aIn && bIn) {
        out.push({ x: b.x, y: b.y });
      } else if (aIn && !bIn) {
        out.push(intersectSegmentAxis(a, b, axis));
      } else if (!aIn && bIn) {
        out.push(intersectSegmentAxis(a, b, axis));
        out.push({ x: b.x, y: b.y });
      }
    }
    return out;
  }

  function isAxisOfPolygon(vertices, axis, eps) {
    var e = eps == null ? 1e-4 : eps;
    for (var i = 0; i < vertices.length; i++) {
      var r = reflectPoint(vertices[i], axis);
      var ok = false;
      for (var j = 0; j < vertices.length; j++) {
        if (pointsEqual(r, vertices[j], e)) { ok = true; break; }
      }
      if (!ok) return false;
    }
    return true;
  }

  function isAxisOfCircle(axis, center, eps) {
    return pointOnAxis(center, axis, eps == null ? 1e-4 : eps);
  }

  /* Implicit line nx*x + ny*y = c, with (nx,ny) unit and nx>0, or nx=0 and ny>0. */
  function lineKey(axis) {
    var p = aPointOnAxis(axis);
    var ang = axisDirectionAngle(axis);
    /* Normal is direction + 90°. */
    var nx = Math.cos(ang + Math.PI / 2);
    var ny = Math.sin(ang + Math.PI / 2);
    if (nx < -1e-9 || (Math.abs(nx) <= 1e-9 && ny < 0)) {
      nx = -nx; ny = -ny;
    }
    var c = nx * p.x + ny * p.y;
    return { nx: nx, ny: ny, c: c };
  }

  function sameAxis(a, b, eps) {
    var e = eps == null ? 1e-4 : eps;
    var ka = lineKey(a);
    var kb = lineKey(b);
    return almostEqual(ka.nx, kb.nx, e) &&
      almostEqual(ka.ny, kb.ny, e) &&
      almostEqual(ka.c, kb.c, e * 10);
  }

  function dedupeAxes(axes, eps) {
    var out = [];
    for (var i = 0; i < axes.length; i++) {
      var found = false;
      for (var j = 0; j < out.length; j++) {
        if (sameAxis(axes[i], out[j], eps)) { found = true; break; }
      }
      if (!found) out.push(axes[i]);
    }
    return out;
  }

  function uniquePoints(pts, eps) {
    var out = [];
    var e = eps == null ? 1e-6 : eps;
    for (var i = 0; i < pts.length; i++) {
      var found = false;
      for (var j = 0; j < out.length; j++) {
        if (pointsEqual(pts[i], out[j], e)) { found = true; break; }
      }
      if (!found) out.push(pts[i]);
    }
    return out;
  }

  /* Candidate fold lines for a simple polygon: midlines and vertex-to-side lines. */
  function candidateAxesForPolygon(vertices) {
    var n = vertices.length;
    var cands = [];
    var mids = [];
    for (var i = 0; i < n; i++) {
      mids.push(mid(vertices[i], vertices[(i + 1) % n]));
    }
    /* Vertex to any other vertex (diagonals and sides). */
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        if (dist(vertices[i], vertices[j]) > EPS) {
          cands.push(lineAxis(vertices[i], vertices[j]));
        }
      }
    }
    /* Vertex to midpoints of sides not incident to that vertex. */
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        if (j === i || (j + 1) % n === i) continue;
        cands.push(lineAxis(vertices[i], mids[j]));
      }
    }
    /* Midpoint to midpoint of other sides. */
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        if (dist(mids[i], mids[j]) > EPS) {
          cands.push(lineAxis(mids[i], mids[j]));
        }
      }
    }
    return cands;
  }

  function findAxesOfPolygon(vertices, eps) {
    var cands = candidateAxesForPolygon(vertices);
    var good = [];
    for (var i = 0; i < cands.length; i++) {
      if (isAxisOfPolygon(vertices, cands[i], eps)) good.push(cands[i]);
    }
    return dedupeAxes(good, eps);
  }

  function countAxes(shape, eps) {
    if (shape.type === 'circle') return INF;
    return findAxesOfPolygon(shape.vertices, eps).length;
  }

  /* Curriculum facts used by tests and the lesson catalog. */
  var AXIS_COUNTS = {
    square: 4,
    rectangle: 2,
    isoscelesTriangle: 1,
    equilateralTriangle: 3,
    rhombus: 2,
    circle: INF,
    parallelogram: 0,
    scaleneTriangle: 0,
    trapezium: 0,
    isoscelesTrapezium: 1
  };

  function starsFor(correct, total) {
    var n = total || 10;
    var c = Math.round(Number(correct) || 0);
    if (n === 10) {
      if (c >= 9) return 3;
      if (c >= 7) return 2;
      if (c >= 5) return 1;
      return 0;
    }
    var p = n ? c / n : 0;
    if (p >= 0.9) return 3;
    if (p >= 0.7) return 2;
    if (p >= 0.5) return 1;
    return 0;
  }

  /* Closed-form sample polygons in a convenient local frame (center ~ origin).
     Tests use these; the game may translate/scale them for drawing. */
  function sampleShapes() {
    var eq = 180 / Math.sqrt(3);
    var eqH = 180 * Math.sqrt(3) / 2;
    /* Non-square rhombus with horizontal sides: slanted diagonal axes. */
    var s = 160, h = 120;
    var o = Math.sqrt(s * s - h * h);
    var rh = [
      { x: -80, y: -h / 2 },
      { x: 80, y: -h / 2 },
      { x: 80 + o, y: h / 2 },
      { x: -80 + o, y: h / 2 }
    ];
    var cx = (rh[0].x + rh[2].x) / 2;
    for (var i = 0; i < 4; i++) rh[i] = { x: rh[i].x - cx, y: rh[i].y };

    return {
      square: {
        type: 'polygon',
        vertices: [
          { x: -80, y: -80 }, { x: 80, y: -80 },
          { x: 80, y: 80 }, { x: -80, y: 80 }
        ]
      },
      rectangle: {
        type: 'polygon',
        vertices: [
          { x: -100, y: -60 }, { x: 100, y: -60 },
          { x: 100, y: 60 }, { x: -100, y: 60 }
        ]
      },
      isoscelesTriangle: {
        type: 'polygon',
        vertices: [
          { x: 0, y: -90 }, { x: -100, y: 70 }, { x: 100, y: 70 }
        ]
      },
      equilateralTriangle: {
        type: 'polygon',
        vertices: [
          { x: 0, y: eq - eqH }, /* top */
          { x: -90, y: eq - eqH + eqH },
          { x: 90, y: eq - eqH + eqH }
        ]
        /* The above places top at eq-eqH and base at eq. Better: centroid at origin. */
      },
      rhombus: { type: 'polygon', vertices: rh },
      circle: { type: 'circle', center: { x: 0, y: 0 }, radius: 100 },
      parallelogram: {
        type: 'polygon',
        vertices: [
          { x: -100, y: -50 }, { x: 80, y: -50 },
          { x: 130, y: 50 }, { x: -50, y: 50 }
        ]
      },
      scaleneTriangle: {
        type: 'polygon',
        vertices: [
          { x: -110, y: 70 }, { x: 90, y: 80 }, { x: 20, y: -90 }
        ]
      },
      trapezium: {
        type: 'polygon',
        vertices: [
          { x: -100, y: 60 }, { x: 100, y: 60 },
          { x: 40, y: -60 }, { x: -80, y: -60 }
        ]
      },
      isoscelesTrapezium: {
        type: 'polygon',
        vertices: [
          { x: -60, y: -50 }, { x: 60, y: -50 },
          { x: 110, y: 50 }, { x: -110, y: 50 }
        ]
      }
    };
  }

  /* Rebuild equilateral triangle with centroid at the origin. */
  function equilateralVertices(side) {
    var s = side == null ? 180 : side;
    var h = s * Math.sqrt(3) / 2;
    /* Centroid is 2/3 of the median from a vertex, i.e. h/3 above the base. */
    return [
      { x: 0, y: -(2 * h / 3) },
      { x: -s / 2, y: h / 3 },
      { x: s / 2, y: h / 3 }
    ];
  }

  function allSampleShapes() {
    var s = sampleShapes();
    s.equilateralTriangle = { type: 'polygon', vertices: equilateralVertices(180) };
    return s;
  }

  function foldTransform(axis, scaleY) {
    var p = aPointOnAxis(axis);
    /* For vertical/horizontal/diagonal, pick a point near the shape center
       by projecting the origin, which is more stable in SVG. */
    var originFoot = projectToAxis({ x: 0, y: 0 }, axis);
    p = originFoot;
    var deg = axisDirectionAngle(axis) * 180 / Math.PI;
    return 'translate(' + p.x + ',' + p.y + ') rotate(' + deg + ') scale(1,' + scaleY + ') rotate(' + (-deg) + ') translate(' + (-p.x) + ',' + (-p.y) + ')';
  }

  function foldTransformAt(axis, scaleY, around) {
    var p = projectToAxis(around, axis);
    var deg = axisDirectionAngle(axis) * 180 / Math.PI;
    return 'translate(' + p.x + ',' + p.y + ') rotate(' + deg + ') scale(1,' + scaleY + ') rotate(' + (-deg) + ') translate(' + (-p.x) + ',' + (-p.y) + ')';
  }

  return {
    EPS: EPS,
    INF: INF,
    almostEqual: almostEqual,
    pointsEqual: pointsEqual,
    mid: mid,
    dist: dist,
    sub: sub,
    add: add,
    scale: scale,
    dot: dot,
    cross: cross,
    hypot: hypot,
    verticalAxis: verticalAxis,
    horizontalAxis: horizontalAxis,
    diagonalAxis: diagonalAxis,
    lineAxis: lineAxis,
    aPointOnAxis: aPointOnAxis,
    axisDirectionAngle: axisDirectionAngle,
    axisUnit: axisUnit,
    signedDistance: signedDistance,
    pointOnAxis: pointOnAxis,
    projectToAxis: projectToAxis,
    reflectPoint: reflectPoint,
    reflectPoints: reflectPoints,
    countSquaresToAxis: countSquaresToAxis,
    intersectSegmentAxis: intersectSegmentAxis,
    clipPolygonHalf: clipPolygonHalf,
    isAxisOfPolygon: isAxisOfPolygon,
    isAxisOfCircle: isAxisOfCircle,
    sameAxis: sameAxis,
    dedupeAxes: dedupeAxes,
    uniquePoints: uniquePoints,
    candidateAxesForPolygon: candidateAxesForPolygon,
    findAxesOfPolygon: findAxesOfPolygon,
    countAxes: countAxes,
    AXIS_COUNTS: AXIS_COUNTS,
    starsFor: starsFor,
    sampleShapes: allSampleShapes,
    equilateralVertices: equilateralVertices,
    foldTransform: foldTransform,
    foldTransformAt: foldTransformAt
  };
});
