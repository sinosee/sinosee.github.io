/* Exact grid geometry for P4 shape division and composition.
   Coordinates stay rational. Floats are only used to sort angles. */
(function (root) {
  'use strict';

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a || 1;
  }
  function Q(n, d) {
    if (d === undefined) d = 1;
    if (d < 0) { n = -n; d = -d; }
    if (n === 0) return { n: 0, d: 1 };
    const g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  const Q0 = Q(0), Q1 = Q(1), Q2 = Q(2);
  function qAdd(a, b) { return Q(a.n * b.d + b.n * a.d, a.d * b.d); }
  function qSub(a, b) { return Q(a.n * b.d - b.n * a.d, a.d * b.d); }
  function qMul(a, b) { return Q(a.n * b.n, a.d * b.d); }
  function qDiv(a, b) { return Q(a.n * b.d, a.d * b.n); }
  function qNeg(a) { return Q(-a.n, a.d); }
  function qCmp(a, b) { return a.n * b.d - b.n * a.d; }
  function qEq(a, b) { return a.n === b.n && a.d === b.d; }
  function qNum(a) { return a.n / a.d; }
  function qStr(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }

  function pt(x, y) {
    if (x && typeof x === 'object' && x.x) return { x: x.x, y: x.y };
    return { x: Q(x), y: Q(y) };
  }
  function P(x, y) { return pt(x, y); }
  function samePt(a, b) { return qEq(a.x, b.x) && qEq(a.y, b.y); }
  function pkey(p) { return qStr(p.x) + ',' + qStr(p.y); }
  function cross(ax, ay, bx, by) { return qSub(qMul(ax, by), qMul(ay, bx)); }
  function dot(ax, ay, bx, by) { return qAdd(qMul(ax, bx), qMul(ay, by)); }
  function sub(a, b) { return { x: qSub(a.x, b.x), y: qSub(a.y, b.y) }; }

  function toPts(poly) {
    const p = poly.map(function (v) { return pt(v[0], v[1]); });
    if (p.length > 1 && samePt(p[0], p[p.length - 1])) p.pop();
    return p;
  }

  function signedArea2(pts) {
    let s = Q0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      s = qAdd(s, qSub(qMul(a.x, b.y), qMul(b.x, a.y)));
    }
    return s;
  }
  function ensureCCW(pts) {
    if (qCmp(signedArea2(pts), Q0) < 0) return pts.slice().reverse();
    return pts.slice();
  }

  function simplify(pts) {
    let p = pts.filter(function (v, i) {
      return i === 0 || !samePt(v, pts[i - 1]);
    });
    if (p.length > 1 && samePt(p[0], p[p.length - 1])) p.pop();
    let guard = 0;
    while (p.length >= 3 && guard++ < 30) {
      let removed = false;
      for (let i = 0; i < p.length; i++) {
        const prev = p[(i - 1 + p.length) % p.length];
        const cur = p[i];
        const next = p[(i + 1) % p.length];
        if (samePt(prev, cur) || samePt(cur, next)) {
          p.splice(i, 1); removed = true; break;
        }
        const c = cross(qSub(cur.x, prev.x), qSub(cur.y, prev.y), qSub(next.x, cur.x), qSub(next.y, cur.y));
        if (qEq(c, Q0)) { p.splice(i, 1); removed = true; break; }
      }
      if (!removed) break;
    }
    return p;
  }

  function onSeg(a, b, p) {
    const c = cross(qSub(b.x, a.x), qSub(b.y, a.y), qSub(p.x, a.x), qSub(p.y, a.y));
    if (!qEq(c, Q0)) return false;
    const minx = qCmp(a.x, b.x) <= 0 ? a.x : b.x;
    const maxx = qCmp(a.x, b.x) <= 0 ? b.x : a.x;
    const miny = qCmp(a.y, b.y) <= 0 ? a.y : b.y;
    const maxy = qCmp(a.y, b.y) <= 0 ? b.y : a.y;
    return qCmp(p.x, minx) >= 0 && qCmp(p.x, maxx) <= 0 && qCmp(p.y, miny) >= 0 && qCmp(p.y, maxy) <= 0;
  }

  /* 0 outside, 1 inside, 2 boundary */
  function pointInPoly(p, poly) {
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      if (onSeg(poly[i], poly[(i + 1) % n], p)) return 2;
    }
    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const a = poly[j], b = poly[i];
      const ay = a.y, by = b.y;
      if ((qCmp(ay, p.y) > 0) !== (qCmp(by, p.y) > 0)) {
        const t = qDiv(qSub(p.y, ay), qSub(by, ay));
        const xint = qAdd(a.x, qMul(t, qSub(b.x, a.x)));
        if (qCmp(p.x, xint) < 0) inside = !inside;
      }
    }
    return inside ? 1 : 0;
  }

  function segHits(a, b, c, d) {
    const rx = qSub(b.x, a.x), ry = qSub(b.y, a.y);
    const sx = qSub(d.x, c.x), sy = qSub(d.y, c.y);
    const denom = cross(rx, ry, sx, sy);
    const acx = qSub(c.x, a.x), acy = qSub(c.y, a.y);
    if (qEq(denom, Q0)) {
      if (!qEq(cross(acx, acy, rx, ry), Q0)) return [];
      const pts = [];
      if (onSeg(c, d, a)) pts.push(a);
      if (onSeg(c, d, b)) pts.push(b);
      if (onSeg(a, b, c)) pts.push(c);
      if (onSeg(a, b, d)) pts.push(d);
      return uniqPts(pts);
    }
    const t = qDiv(cross(acx, acy, sx, sy), denom);
    const u = qDiv(cross(acx, acy, rx, ry), denom);
    if (qCmp(t, Q0) >= 0 && qCmp(t, Q1) <= 0 && qCmp(u, Q0) >= 0 && qCmp(u, Q1) <= 0) {
      return [{ x: qAdd(a.x, qMul(t, rx)), y: qAdd(a.y, qMul(t, ry)) }];
    }
    return [];
  }

  function uniqPts(pts) {
    const m = new Map();
    pts.forEach(function (p) { m.set(pkey(p), p); });
    return Array.from(m.values());
  }

  function paramT(a, b, p) {
    const dx = qSub(b.x, a.x), dy = qSub(b.y, a.y);
    if (!qEq(dx, Q0)) return qDiv(qSub(p.x, a.x), dx);
    if (!qEq(dy, Q0)) return qDiv(qSub(p.y, a.y), dy);
    return Q0;
  }

  function segmentInside(poly, a, b) {
    if (samePt(a, b)) return false;
    if (pointInPoly(a, poly) === 0 || pointInPoly(b, poly) === 0) return false;
    const ts = [Q0, Q1];
    for (let i = 0; i < poly.length; i++) {
      const hits = segHits(a, b, poly[i], poly[(i + 1) % poly.length]);
      hits.forEach(function (h) { ts.push(paramT(a, b, h)); });
    }
    ts.sort(qCmp);
    const clean = [];
    ts.forEach(function (t) {
      if (qCmp(t, Q0) < 0 || qCmp(t, Q1) > 0) return;
      if (!clean.length || !qEq(clean[clean.length - 1], t)) clean.push(t);
    });
    for (let i = 0; i < clean.length - 1; i++) {
      if (qEq(clean[i], clean[i + 1])) continue;
      const tm = qDiv(qAdd(clean[i], clean[i + 1]), Q2);
      const pm = {
        x: qAdd(a.x, qMul(tm, qSub(b.x, a.x))),
        y: qAdd(a.y, qMul(tm, qSub(b.y, a.y)))
      };
      if (pointInPoly(pm, poly) === 0) return false;
    }
    return true;
  }

  function onBoundary(poly, p) {
    for (let i = 0; i < poly.length; i++) {
      if (onSeg(poly[i], poly[(i + 1) % poly.length], p)) return true;
    }
    return false;
  }

  function interiorPoint(pts) {
    const n = pts.length;
    let sx = Q0, sy = Q0;
    for (let i = 0; i < n; i++) { sx = qAdd(sx, pts[i].x); sy = qAdd(sy, pts[i].y); }
    const c = { x: qDiv(sx, Q(n)), y: qDiv(sy, Q(n)) };
    if (pointInPoly(c, pts) === 1) return c;
    for (let i = 0; i < n; i++) {
      const prev = pts[(i - 1 + n) % n], cur = pts[i], next = pts[(i + 1) % n];
      const p = {
        x: qDiv(qAdd(qAdd(qMul(Q(4), cur.x), prev.x), next.x), Q(6)),
        y: qDiv(qAdd(qAdd(qMul(Q(4), cur.y), prev.y), next.y), Q(6))
      };
      if (pointInPoly(p, pts) === 1) return p;
    }
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const mx = qDiv(qAdd(a.x, b.x), Q2), my = qDiv(qAdd(a.y, b.y), Q2);
      const dx = qSub(b.x, a.x), dy = qSub(b.y, a.y);
      for (let K = 4; K <= 128; K *= 2) {
        const p = { x: qAdd(mx, qDiv(qNeg(dy), Q(K))), y: qAdd(my, qDiv(dx, Q(K))) };
        if (pointInPoly(p, pts) === 1) return p;
      }
    }
    return c;
  }

  function arrangement(segments) {
    const splitSegs = segments.map(function (seg) {
      let pts = [seg[0], seg[1]];
      segments.forEach(function (other) {
        if (other === seg) return;
        segHits(seg[0], seg[1], other[0], other[1]).forEach(function (h) { pts.push(h); });
      });
      pts = uniqPts(pts);
      pts.sort(function (a, b) { return qCmp(paramT(seg[0], seg[1], a), paramT(seg[0], seg[1], b)); });
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        if (!samePt(pts[i], pts[i + 1])) out.push([pts[i], pts[i + 1]]);
      }
      return out;
    });
    const edges = [];
    const seen = new Set();
    splitSegs.forEach(function (list) {
      list.forEach(function (e) {
        const ka = pkey(e[0]), kb = pkey(e[1]);
        const k = ka < kb ? ka + '~' + kb : kb + '~' + ka;
        if (seen.has(k)) return;
        seen.add(k);
        edges.push(e);
      });
    });
    return edges;
  }

  function facesFromEdges(edges) {
    const adj = new Map();
    const verts = new Map();
    function addDir(a, b) {
      const ka = pkey(a), kb = pkey(b);
      verts.set(ka, a);
      if (!adj.has(ka)) adj.set(ka, []);
      if (!adj.get(ka).some(function (e) { return e.key === kb; })) {
        adj.get(ka).push({
          key: kb,
          ang: Math.atan2(qNum(qSub(b.y, a.y)), qNum(qSub(b.x, a.x)))
        });
      }
    }
    edges.forEach(function (e) { addDir(e[0], e[1]); addDir(e[1], e[0]); });
    adj.forEach(function (nbs) { nbs.sort(function (a, b) { return a.ang - b.ang; }); });

    const used = new Set();
    const faces = [];
    adj.forEach(function (nbs, ka) {
      nbs.forEach(function (nb) {
        const start = ka + '->' + nb.key;
        if (used.has(start)) return;
        const faceKeys = [ka];
        let prev = ka, curr = nb.key;
        used.add(start);
        let guard = 0;
        while (curr !== ka && guard++ < 5000) {
          faceKeys.push(curr);
          const nbs2 = adj.get(curr);
          const idx = nbs2.findIndex(function (e) { return e.key === prev; });
          if (idx < 0) return;
          const next = nbs2[(idx - 1 + nbs2.length) % nbs2.length];
          const dk = curr + '->' + next.key;
          if (used.has(dk)) break;
          used.add(dk);
          prev = curr;
          curr = next.key;
        }
        if (curr !== ka || faceKeys.length < 3) return;
        const pts = simplify(faceKeys.map(function (k) { return verts.get(k); }));
        if (pts.length < 3) return;
        if (qCmp(signedArea2(pts), Q0) <= 0) return;
        faces.push(ensureCCW(pts));
      });
    });
    return faces;
  }

  function xyOf(pts) {
    return pts.map(function (p) { return [qNum(p.x), qNum(p.y)]; });
  }

  function classifyPts(raw) {
    const p = ensureCCW(simplify(raw));
    const n = p.length;
    if (n < 3) return { name: '未完成', n: n, convex: false, pts: p };
    const e = [];
    for (let i = 0; i < n; i++) e.push(sub(p[(i + 1) % n], p[i]));
    const lenSq = e.map(function (v) { return qAdd(qMul(v.x, v.x), qMul(v.y, v.y)); });
    let convex = true;
    for (let i = 0; i < n; i++) {
      const c = cross(e[i].x, e[i].y, e[(i + 1) % n].x, e[(i + 1) % n].y);
      if (qCmp(c, Q0) <= 0) convex = false;
    }
    const allEqual = lenSq.every(function (L) { return qEq(L, lenSq[0]); });
    function rightAt(i) {
      return qEq(dot(e[i].x, e[i].y, e[(i + 1) % n].x, e[(i + 1) % n].y), Q0);
    }
    if (n === 3) {
      const eq01 = qEq(lenSq[0], lenSq[1]), eq12 = qEq(lenSq[1], lenSq[2]), eq02 = qEq(lenSq[0], lenSq[2]);
      let right = false, rightIso = false;
      for (let i = 0; i < 3; i++) {
        if (rightAt(i)) {
          right = true;
          if (qEq(lenSq[i], lenSq[(i + 1) % 3])) rightIso = true;
        }
      }
      let name = '三角形';
      if (eq01 && eq12) name = '等邊三角形';
      else if (rightIso) name = '等腰直角三角形';
      else if (right) name = '直角三角形';
      else if (eq01 || eq12 || eq02) name = '等腰三角形';
      return { name: name, n: 3, convex: convex, pts: p, lenSq: lenSq };
    }
    if (n === 4) {
      const p02 = qEq(cross(e[0].x, e[0].y, e[2].x, e[2].y), Q0);
      const p13 = qEq(cross(e[1].x, e[1].y, e[3].x, e[3].y), Q0);
      let allRight = true;
      for (let i = 0; i < 4; i++) if (!rightAt(i)) allRight = false;
      let name = '四邊形';
      if (convex && p02 && p13) {
        if (allRight && allEqual) name = '正方形';
        else if (allRight) name = '長方形';
        else if (allEqual) name = '菱形';
        else name = '平行四邊形';
      } else if (convex && (p02 !== p13)) name = '梯形';
      else if (!convex) name = '凹四邊形';
      return { name: name, n: 4, convex: convex, pts: p, lenSq: lenSq };
    }
    const polyName = { 5: '五邊形', 6: '六邊形', 7: '七邊形', 8: '八邊形' };
    return { name: polyName[n] || (n + '邊形'), n: n, convex: convex, pts: p, lenSq: lenSq };
  }

  function angleSeq(raw) {
    const p = ensureCCW(simplify(raw));
    const n = p.length;
    const s = [];
    for (let i = 0; i < n; i++) {
      const prev = p[(i + n - 1) % n], cur = p[i], next = p[(i + 1) % n];
      const e1x = qNum(qSub(cur.x, prev.x)), e1y = qNum(qSub(cur.y, prev.y));
      const e2x = qNum(qSub(next.x, cur.x)), e2y = qNum(qSub(next.y, cur.y));
      const lenSq = qStr(qAdd(qMul(qSub(next.x, cur.x), qSub(next.x, cur.x)), qMul(qSub(next.y, cur.y), qSub(next.y, cur.y))));
      const ang = Math.atan2(e1x * e2y - e1y * e2x, e1x * e2x + e1y * e2y);
      s.push({ lenSq: lenSq, ang: ang });
    }
    return s;
  }
  function angDiff(a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return Math.abs(d);
  }
  function seqMatch(a, b) {
    if (a.length !== b.length) return false;
    const n = a.length;
    for (let r = 0; r < n; r++) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        const u = a[i], v = b[(i + r) % n];
        if (u.lenSq !== v.lenSq || angDiff(u.ang, v.ang) > 1e-6) { ok = false; break; }
      }
      if (ok) return true;
    }
    return false;
  }
function reflectY(pts) {
  return pts.map(function (p) { return { x: qNeg(p.x), y: p.y }; });
}
function congruent(A, B) {
  const a = angleSeq(A);
  if (seqMatch(a, angleSeq(B))) return true;
  /* Mirror images: one axis reflection, then the cyclic match covers rotation. */
  return seqMatch(a, angleSeq(reflectY(B)));
}
  function allCongruent(pieces) {
    if (pieces.length <= 1) return true;
    for (let i = 1; i < pieces.length; i++) {
      if (!congruent(pieces[0].pts, pieces[i].pts)) return false;
    }
    return true;
  }

  const TRI = { '三角形': 1, '等腰三角形': 1, '直角三角形': 1, '等腰直角三角形': 1, '等邊三角形': 1 };
  function nameMatches(actual, expected) {
    if (actual === expected) return true;
    if (expected === '三角形' && TRI[actual]) return true;
    return false;
  }
  function partsMatch(actualNames, parts) {
    const exp = [];
    parts.forEach(function (part) {
      for (let i = 0; i < part.count; i++) exp.push(part.name);
    });
    if (actualNames.length !== exp.length) return false;
    const used = exp.map(function () { return false; });
    const names = actualNames.slice();
    names.sort();
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < names.length; i++) {
        if (names[i] == null) continue;
        const idx = exp.findIndex(function (e, j) {
          if (used[j]) return false;
          return pass === 0 ? e === names[i] : nameMatches(names[i], e);
        });
        if (idx >= 0) { used[idx] = true; names[i] = null; }
      }
    }
    return used.every(Boolean);
  }

  function countLabel(names) {
    const order = [];
    const map = new Map();
    names.forEach(function (n) {
      if (!map.has(n)) { map.set(n, 0); order.push(n); }
      map.set(n, map.get(n) + 1);
    });
    return order.map(function (n) { return map.get(n) + ' 個' + n; }).join('、');
  }

  function splitPolygon(polyIn, cutsIn) {
    const poly = ensureCCW(simplify(toPts(polyIn)));
    if (poly.length < 3) return { ok: false, code: 'bad-shape' };
    const cuts = (cutsIn || []).map(function (c) { return [pt(c[0][0], c[0][1]), pt(c[1][0], c[1][1])]; });
    for (let i = 0; i < cuts.length; i++) {
      const a = cuts[i][0], b = cuts[i][1];
      if (samePt(a, b)) return { ok: false, code: 'short' };
      if (!segmentInside(poly, a, b)) return { ok: false, code: 'outside' };
      const aOk = onBoundary(poly, a) || cuts.some(function (c, j) { return j !== i && onSeg(c[0], c[1], a); });
      const bOk = onBoundary(poly, b) || cuts.some(function (c, j) { return j !== i && onSeg(c[0], c[1], b); });
      if (!aOk || !bOk) return { ok: false, code: 'dangling' };
    }
    const segs = [];
    for (let i = 0; i < poly.length; i++) segs.push([poly[i], poly[(i + 1) % poly.length]]);
    cuts.forEach(function (c) { segs.push(c); });
    let edges = arrangement(segs);
    edges = edges.filter(function (e) {
      const m = {
        x: qDiv(qAdd(e[0].x, e[1].x), Q2),
        y: qDiv(qAdd(e[0].y, e[1].y), Q2)
      };
      return pointInPoly(m, poly) !== 0;
    });
    const faces = facesFromEdges(edges).filter(function (f) {
      const ip = interiorPoint(f);
      return pointInPoly(ip, poly) === 1;
    });
    if (faces.length < 2) return { ok: false, code: 'not-split', pieces: faces.map(pack) };
    const pieces = faces.map(pack);
    const area = pieces.reduce(function (s, p) { return qAdd(s, p.area2); }, Q0);
    if (!qEq(area, signedArea2(poly))) return { ok: false, code: 'area', pieces: pieces };
    return { ok: true, pieces: pieces };
  }

  function pack(pts) {
    const info = classifyPts(pts);
    return {
      pts: info.pts,
      xy: xyOf(info.pts),
      name: info.name,
      n: info.n,
      convex: info.convex,
      area2: signedArea2(info.pts)
    };
  }

  function checkSplit(poly, cuts, spec) {
    const res = splitPolygon(poly, cuts);
    if (!res.ok) return res;
    const names = res.pieces.map(function (p) { return p.name; });
    const okNames = partsMatch(names, spec.parts);
    const cong = !spec.congruent || allCongruent(res.pieces);
    return {
      ok: okNames && cong,
      okNames: okNames,
      congruent: cong,
      pieces: res.pieces,
      label: countLabel(names),
      code: okNames && cong ? 'ok' : (!okNames ? 'names' : 'size')
    };
  }

  /* ---------- equilateral triangle grid (axial) ---------- */
  function upVerts(p, q) { return [[p, q], [p + 1, q], [p, q + 1]]; }
  function downVerts(p, q) { return [[p + 1, q], [p + 1, q + 1], [p, q + 1]]; }
  function cellVerts(c) { return c.down ? downVerts(c.p, c.q) : upVerts(c.p, c.q); }

  function triAnalyze(cells) {
    if (!cells.length) return { ok: false, code: 'empty' };
    const ids = cells.map(function (c) { return c.p + ',' + c.q + ',' + (c.down ? 1 : 0); });
    if (new Set(ids).size !== ids.length) return { ok: false, code: 'overlap' };
    const edgeMap = new Map();
    cells.forEach(function (c) {
      const v = cellVerts(c);
      for (let i = 0; i < 3; i++) {
        const a = v[i], b = v[(i + 1) % 3];
        const ka = a[0] + ',' + a[1], kb = b[0] + ',' + b[1];
        const k = ka < kb ? ka + '|' + kb : kb + '|' + ka;
        if (!edgeMap.has(k)) edgeMap.set(k, { a: a, b: b, n: 0 });
        edgeMap.get(k).n++;
      }
    });
    const boundary = [];
    let bad = false;
    edgeMap.forEach(function (e) {
      if (e.n === 1) boundary.push(e);
      else if (e.n !== 2) bad = true;
    });
    if (bad || !boundary.length) return { ok: false, code: 'overlap' };
    const adj = new Map();
    function vk(p) { return p[0] + ',' + p[1]; }
    boundary.forEach(function (e) {
      const ka = vk(e.a), kb = vk(e.b);
      if (!adj.has(ka)) adj.set(ka, []);
      if (!adj.has(kb)) adj.set(kb, []);
      adj.get(ka).push(e.b);
      adj.get(kb).push(e.a);
    });
    let simple = true;
    adj.forEach(function (nbs) { if (nbs.length !== 2) simple = false; });
    if (!simple) return { ok: false, code: 'not-simple' };
    const start = boundary[0].a;
    const loop = [start];
    let prev = null, cur = start;
    let guard = 0;
    while (guard++ < 100) {
      const nbs = adj.get(vk(cur));
      let nxt = nbs[0];
      if (prev && nxt[0] === prev[0] && nxt[1] === prev[1]) nxt = nbs[1];
      if (nxt[0] === start[0] && nxt[1] === start[1]) break;
      loop.push(nxt);
      prev = cur;
      cur = nxt;
    }
    if (loop.length !== adj.size) return { ok: false, code: 'disconnected' };
    const cls = classifyAxial(loop);
    return { ok: true, name: cls.name, n: cls.n, convex: cls.convex, loop: loop };
  }

  const DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  function unitDir(di, dj) {
    for (let k = 0; k < 6; k++) if (DIRS[k][0] === di && DIRS[k][1] === dj) return k;
    return -1;
  }
  function axialDot2(ax, ay, bx, by) {
    return 2 * ax * bx + 2 * ay * by + ax * by + ay * bx;
  }
  function classifyAxial(loop) {
    const steps = [];
    for (let i = 0; i < loop.length; i++) {
      const a = loop[i], b = loop[(i + 1) % loop.length];
      const di = b[0] - a[0], dj = b[1] - a[1];
      const dir = unitDir(di, dj);
      if (dir < 0) return { name: '多邊形', n: 0, convex: false };
      steps.push(dir);
    }
    const sides = [];
    steps.forEach(function (dir) {
      if (sides.length && sides[sides.length - 1].dir === dir) sides[sides.length - 1].len++;
      else sides.push({ dir: dir, len: 1 });
    });
    if (sides.length > 1 && sides[0].dir === sides[sides.length - 1].dir) {
      sides[0].len += sides[sides.length - 1].len;
      sides.pop();
    }
    const n = sides.length;
    const vec = sides.map(function (s) {
      return [DIRS[s.dir][0] * s.len, DIRS[s.dir][1] * s.len, s.len, s.dir];
    });
    let convex = true;
    for (let i = 0; i < n; i++) {
      const turn = (vec[(i + 1) % n][3] - vec[i][3] + 6) % 6;
      if (turn === 0 || turn >= 3) convex = false;
    }
    if (n === 3 && vec.every(function (v) { return v[2] === vec[0][2]; })) {
      return { name: '等邊三角形', n: 3, convex: convex };
    }
    if (n === 3) return { name: '三角形', n: 3, convex: convex };
    if (n === 4) {
      const para = function (i, j) { return (vec[i][3] - vec[j][3] + 6) % 6 === 3; };
      const p02 = para(0, 2), p13 = para(1, 3);
      const allEq = vec.every(function (v) { return v[2] === vec[0][2]; });
      let allRight = true;
      for (let i = 0; i < 4; i++) {
        if (axialDot2(vec[i][0], vec[i][1], vec[(i + 1) % 4][0], vec[(i + 1) % 4][1]) !== 0) allRight = false;
      }
      if (convex && p02 && p13) {
        if (allRight && allEq) return { name: '正方形', n: 4, convex: true };
        if (allRight) return { name: '長方形', n: 4, convex: true };
        if (allEq) return { name: '菱形', n: 4, convex: true };
        return { name: '平行四邊形', n: 4, convex: true };
      }
      if (convex && (p02 !== p13)) return { name: '梯形', n: 4, convex: true };
      return { name: convex ? '四邊形' : '凹四邊形', n: 4, convex: convex };
    }
    const polyName = { 5: '五邊形', 6: '六邊形' };
    return { name: polyName[n] || (n + '邊形'), n: n, convex: convex };
  }

  function worldTri(i, j) {
    return { x: i + j * 0.5, y: j * Math.sqrt(3) / 2 };
  }
  function cellWorld(c) {
    return cellVerts(c).map(function (v) { return worldTri(v[0], v[1]); });
  }
  function cellCenter(c) {
    const w = cellWorld(c);
    return { x: (w[0].x + w[1].x + w[2].x) / 3, y: (w[0].y + w[1].y + w[2].y) / 3 };
  }

  /* ---------- square-grid composition ---------- */
  function rotPoint(x, y, k) {
    k = ((k % 4) + 4) % 4;
    for (let i = 0; i < k; i++) { const nx = -y; y = x; x = nx; }
    return [x, y];
  }
  function placePoly(local, k, tx, ty) {
    return local.map(function (v) {
      const r = rotPoint(v[0], v[1], k);
      return [r[0] + tx, r[1] + ty];
    });
  }

function edgeList(polyPts) {
  const segs = [];
  for (let i = 0; i < polyPts.length; i++) segs.push([polyPts[i], polyPts[(i + 1) % polyPts.length]]);
  return segs;
}

function coverageFaces(polys) {
  const segs = [];
  polys.forEach(function (p) { edgeList(p).forEach(function (e) { segs.push(e); }); });
  const faces = facesFromEdges(arrangement(segs));
  return faces.map(function (f) {
    const ip = interiorPoint(f);
    let cov = 0;
    for (let i = 0; i < polys.length; i++) {
      if (pointInPoly(ip, polys[i]) === 1) cov++;
    }
    return { pts: f, ip: ip, cov: cov, area2: signedArea2(f) };
  });
}

function fillsTarget(target, pieces) {
  if (!pieces.length) return { ok: false, code: 'empty' };
  const t = ensureCCW(simplify(toPts(target)));
  const ps = pieces.map(function (poly) { return ensureCCW(simplify(toPts(poly))); });
  const faces = coverageFaces(ps.concat([t]));
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i];
    const inT = pointInPoly(f.ip, t) === 1;
    let cov = 0;
    for (let j = 0; j < ps.length; j++) {
      if (pointInPoly(f.ip, ps[j]) === 1) cov++;
    }
    if (inT && cov !== 1) return { ok: false, code: cov === 0 ? 'gap' : 'overlap' };
    if (!inT && cov !== 0) return { ok: false, code: 'outside' };
  }
  return { ok: true, code: 'ok' };
}

function chainLoops(directed) {
  const adj = new Map();
  function vk(p) { return pkey(p); }
  directed.forEach(function (e) {
    const k = vk(e[0]);
    if (!adj.has(k)) adj.set(k, []);
    adj.get(k).push(e[1]);
  });
  const unused = new Map();
  directed.forEach(function (e) {
    const k = vk(e[0]) + '>' + vk(e[1]);
    unused.set(k, e);
  });
  const loops = [];
  unused.forEach(function (e0, k0) {
    if (!unused.has(k0)) return;
    const loop = [e0[0]];
    let cur = e0[0];
    let guard = 0;
    while (guard++ < 500) {
      const k = vk(cur);
      const opts = adj.get(k) || [];
      let nxt = null;
      for (let i = 0; i < opts.length; i++) {
        const ek = k + '>' + vk(opts[i]);
        if (unused.has(ek)) { nxt = opts[i]; unused.delete(ek); break; }
      }
      if (!nxt) return null;
      if (samePt(nxt, loop[0])) break;
      loop.push(nxt);
      cur = nxt;
    }
    if (loop.length >= 3) loops.push(loop);
  });
  return loops;
}

function unionOutline(pieces) {
  if (!pieces.length) return { ok: false, code: 'empty' };
  const ps = pieces.map(function (poly) { return ensureCCW(simplify(toPts(poly))); });
  const faces = coverageFaces(ps);
  let overlap = false;
  const covered = [];
  faces.forEach(function (f) {
    if (f.cov > 1) overlap = true;
    else if (f.cov === 1) covered.push(f.pts);
  });
  if (overlap) return { ok: false, code: 'overlap' };
  if (!covered.length) return { ok: false, code: 'empty' };
  const count = new Map();
  function dkey(a, b) { return pkey(a) + '>' + pkey(b); }
  covered.forEach(function (f) {
    for (let i = 0; i < f.length; i++) {
      const k = dkey(f[i], f[(i + 1) % f.length]);
      count.set(k, (count.get(k) || 0) + 1);
    }
  });
  const boundary = [];
  covered.forEach(function (f) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      if (!count.has(dkey(b, a))) boundary.push([a, b]);
    }
  });
  const loops = chainLoops(boundary);
  if (!loops || loops.length !== 1) return { ok: false, code: 'disconnected', loops: loops ? loops.length : -1 };
  const info = classifyPts(loops[0]);
  let sum = Q0;
  ps.forEach(function (p) { sum = qAdd(sum, signedArea2(p)); });
  if (!qEq(signedArea2(info.pts), sum)) return { ok: false, code: 'area', name: info.name };
  return { ok: true, name: info.name, n: info.n, convex: info.convex, xy: xyOf(info.pts), pts: info.pts };
}

  function bboxGridPoints(poly) {
    const p = toPts(poly);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    p.forEach(function (v) {
      const x = qNum(v.x), y = qNum(v.y);
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    });
    const polyC = ensureCCW(simplify(p));
    const pts = [];
    for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
      for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
        if (pointInPoly(pt(x, y), polyC) !== 0) pts.push([x, y]);
      }
    }
    return pts;
  }

  root.ShapeGeom = {
    Q: Q, qEq: qEq, qNum: qNum, pt: pt,
    simplify: simplify, pointInPoly: pointInPoly, segmentInside: segmentInside,
    classifyPts: classifyPts, congruent: congruent, allCongruent: allCongruent,
    nameMatches: nameMatches, partsMatch: partsMatch, countLabel: countLabel,
    splitPolygon: splitPolygon, checkSplit: checkSplit,
    triAnalyze: triAnalyze, cellWorld: cellWorld, cellCenter: cellCenter, worldTri: worldTri,
    rotPoint: rotPoint, placePoly: placePoly, fillsTarget: fillsTarget, unionOutline: unionOutline,
    bboxGridPoints: bboxGridPoints
  };
})(typeof window !== 'undefined' ? window : globalThis);
