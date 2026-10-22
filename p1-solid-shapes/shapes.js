/* P1 solid shapes — pastel 3D illustrations.
   Only these five: 角錐 pyramid, 角柱 prism, 圓錐 cone, 圓柱 cylinder, 球 sphere.
   Orientations and palettes change every question. The SVG never contains the answer name.
*/
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.SolidShapes = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  var NAMES = [
    { id: 'pyramid', name: '角錐' },
    { id: 'prism', name: '角柱' },
    { id: 'cone', name: '圓錐' },
    { id: 'cylinder', name: '圓柱' },
    { id: 'sphere', name: '球' }
  ];
  var NAME_OF = {};
  NAMES.forEach(function (n) { NAME_OF[n.id] = n.name; });

  var PALETTES = [
    { id: 'pink', light: '#ffd4ea', mid: '#ff8ec8', dark: '#e2569a', edge: '#c43b86' },
    { id: 'gold', light: '#fff4c8', mid: '#ffd15c', dark: '#e0a02a', edge: '#c47a10' },
    { id: 'mint', light: '#e7fff5', mid: '#7ddeb3', dark: '#34b888', edge: '#14815a' },
    { id: 'sky', light: '#e5f6ff', mid: '#7ecbff', dark: '#3aa4e6', edge: '#1a6eaa' },
    { id: 'lilac', light: '#f3eeff', mid: '#c9b6ff', dark: '#9b84ea', edge: '#6a4ec4' }
  ];
  var PAL_OF = {};
  PALETTES.forEach(function (p) { PAL_OF[p.id] = p; });

  /* Standing solids can turn freely. Lying solids stay side-on,
     so a cylinder does not turn into a circle. */
  var YAW_STAND = [0.25, 0.7, 1.15, 1.65, 2.15, 2.7, 3.35, 3.9, 4.55, 5.15];
  var YAW_LIE = [-0.62, -0.28, 0.12, 0.48, 2.55, 2.95, 3.4, 3.85];

  var VARIANTS = {
    pyramid: [
      { id: 'sq-tall', base: 'pyramid', sides: 4, radius: 0.92, height: 1.72, pitch: 0.56, modelYaw: 0.18 },
      { id: 'sq-wide', base: 'pyramid', sides: 4, radius: 1.2, height: 1.12, pitch: 0.7, modelYaw: 0.78 },
      { id: 'tri-tall', base: 'pyramid', sides: 3, radius: 1.05, height: 1.62, pitch: 0.58, modelYaw: 0.35 },
      { id: 'tri-low', base: 'pyramid', sides: 3, radius: 1.22, height: 1.05, pitch: 0.74, modelYaw: 1.1 }
    ],
    prism: [
      { id: 'cube', base: 'box', w: 1.2, h: 1.2, d: 1.2, pitch: 0.62, modelYaw: 0.55 },
      { id: 'tall', base: 'box', w: 0.92, h: 1.75, d: 0.92, pitch: 0.52, modelYaw: 0.4 },
      { id: 'long', base: 'box', w: 1.85, h: 0.72, d: 0.88, pitch: 0.72, modelYaw: 0.3 },
      { id: 'tent', base: 'tent', w: 1.75, h: 1.0, d: 1.12, pitch: 0.5, modelYaw: 0.2 },
      { id: 'tri-up', base: 'prism', sides: 3, radius: 1.0, height: 1.38, pitch: 0.66, modelYaw: 0.4 },
      { id: 'pent', base: 'prism', sides: 5, radius: 0.98, height: 1.22, pitch: 0.68, modelYaw: 0.2 }
    ],
    cone: [
      { id: 'tall-up', axis: 'y', radius: 0.86, height: 1.78, spin: 0, pitch: 0.46, vibe: 'plain' },
      { id: 'wide-up', axis: 'y', radius: 1.16, height: 1.18, spin: 0, pitch: 0.52, vibe: 'waffle' },
      { id: 'down', axis: 'y', radius: 0.96, height: 1.58, spin: Math.PI, pitch: 0.5, vibe: 'plain' },
      { id: 'lie', axis: 'x', radius: 0.7, height: 1.9, spin: 0, pitch: 0.34, vibe: 'plain' }
    ],
    cylinder: [
      { id: 'tall', axis: 'y', radius: 0.62, height: 1.78, pitch: 0.56, vibe: 'plain' },
      { id: 'can', axis: 'y', radius: 0.74, height: 1.16, pitch: 0.64, vibe: 'can' },
      { id: 'roll', axis: 'x', radius: 0.58, height: 1.95, pitch: 0.38, vibe: 'plain' },
      { id: 'tin', axis: 'y', radius: 0.88, height: 0.72, pitch: 0.74, vibe: 'can' }
    ],
    sphere: [
      { id: 'plain', vibe: 'plain', scale: 1, yaw: 0.4 },
      { id: 'ball', vibe: 'ball', scale: 1.02, yaw: 1.2 },
      { id: 'small', vibe: 'plain', scale: 0.84, yaw: 2.4 },
      { id: 'beach', vibe: 'beach', scale: 1, yaw: 0.9 }
    ]
  };

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0;
      a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, rng) {
    var arr = list.slice();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  function takeRandom(rng, list) {
    var i = Math.floor(rng() * list.length);
    return list.splice(i, 1)[0];
  }

  function pickYaw(spec, rng) {
    var bank = (spec.axis === 'x') ? YAW_LIE : YAW_STAND;
    return bank[Math.floor(rng() * bank.length)] + (rng() * 0.08 - 0.04);
  }

  function buildSpec(shape, variant, rng) {
    var spec = {
      shape: shape,
      name: NAME_OF[shape],
      variant: variant.id,
      axis: variant.axis || 'y',
      spin: variant.spin || 0,
      modelYaw: variant.modelYaw || 0,
      pitch: variant.pitch == null ? 0.58 : variant.pitch,
      vibe: variant.vibe || 'plain',
      scale: variant.scale || 1,
      sides: variant.sides,
      radius: variant.radius,
      height: variant.height,
      w: variant.w,
      h: variant.h,
      d: variant.d,
      base: variant.base,
      yaw: variant.yaw == null ? pickYaw(variant, rng) : variant.yaw
    };
    return spec;
  }

  function separate(list, rng) {
    var groups = {};
    list.forEach(function (s) {
      if (!groups[s.shape]) groups[s.shape] = [];
      groups[s.shape].push(s);
    });
    var keys = shuffle(Object.keys(groups), rng);
    keys.forEach(function (k) { groups[k] = shuffle(groups[k], rng); });
    var out = [];
    var guard = 0;
    while (guard++ < 12) {
      var added = false;
      keys.forEach(function (k) {
        if (groups[k].length) {
          out.push(groups[k].pop());
          added = true;
        }
      });
      if (!added) break;
    }
    return out;
  }

  function makeRound(seed) {
    var rng = mulberry32((seed == null ? Date.now() : seed) >>> 0);
    var specs = [];
    NAMES.forEach(function (n) {
      var options = VARIANTS[n.id].slice();
      var first = takeRandom(rng, options);
      var second = options.length ? takeRandom(rng, options) : first;
      specs.push(buildSpec(n.id, first, rng));
      specs.push(buildSpec(n.id, second, rng));
    });
    specs = separate(specs, rng);
    var prev = '';
    var used = {};
    specs.forEach(function (sp) {
      var choices = PALETTES.map(function (p) { return p.id; }).filter(function (id) {
        return id !== prev && !(used[sp.shape] && used[sp.shape][id]);
      });
      if (!choices.length) {
        choices = PALETTES.map(function (p) { return p.id; }).filter(function (id) { return id !== prev; });
      }
      if (!choices.length) choices = PALETTES.map(function (p) { return p.id; });
      sp.palette = choices[Math.floor(rng() * choices.length)];
      prev = sp.palette;
      used[sp.shape] = used[sp.shape] || {};
      used[sp.shape][sp.palette] = true;
      sp.choices = shuffle(NAMES.map(function (n) { return n.id; }), rng);
    });
    return specs;
  }

  function catalog() {
    var out = [];
    var pi = 0;
    NAMES.forEach(function (n) {
      VARIANTS[n.id].forEach(function (variant, i) {
        var spec = buildSpec(n.id, variant, mulberry32(1000 + pi * 17 + i));
        spec.palette = PALETTES[(pi + i) % PALETTES.length].id;
        if (spec.axis === 'x') spec.yaw = YAW_LIE[i % YAW_LIE.length];
        else if (n.id !== 'sphere') spec.yaw = YAW_STAND[(i * 3) % YAW_STAND.length];
        spec.choices = NAMES.map(function (item) { return item.id; });
        out.push(spec);
        pi++;
      });
    });
    return out;
  }

  function palette(id) {
    return PAL_OF[id] || PALETTES[0];
  }

  function hexToRgb(hex) {
    var h = String(hex).replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function rgbToHex(rgb) {
    return '#' + rgb.map(function (v) {
      v = Math.round(Math.max(0, Math.min(255, v)));
      var s = v.toString(16);
      return s.length < 2 ? '0' + s : s;
    }).join('');
  }

  function mix(a, b, t) {
    var A = hexToRgb(a);
    var B = hexToRgb(b);
    return rgbToHex([
      A[0] + (B[0] - A[0]) * t,
      A[1] + (B[1] - A[1]) * t,
      A[2] + (B[2] - A[2]) * t
    ]);
  }

  function faceColor(pal, shade) {
    if (shade < 0.5) return mix(pal.dark, pal.mid, shade / 0.5);
    return mix(pal.mid, pal.light, (shade - 0.5) / 0.5);
  }

  function sub(a, b) { return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }; }
  function dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x
    };
  }
  function norm(v) {
    var L = Math.sqrt(dot(v, v)) || 1;
    return { x: v.x / L, y: v.y / L, z: v.z / L };
  }

  function posePoint(p, spec) {
    var x = p.x, y = p.y, z = p.z;
    if (spec.modelYaw) {
      var c0 = Math.cos(spec.modelYaw), s0 = Math.sin(spec.modelYaw);
      var xr = x * c0 + z * s0;
      var zr = -x * s0 + z * c0;
      x = xr;
      z = zr;
    }
    if (spec.axis === 'x') {
      var nx = y;
      var ny = -x;
      x = nx;
      y = ny;
    }
    if (spec.spin) {
      var cs = Math.cos(spec.spin), ss = Math.sin(spec.spin);
      var xs = x * cs - y * ss;
      var ys = x * ss + y * cs;
      x = xs;
      y = ys;
    }
    var c = Math.cos(spec.yaw || 0), s = Math.sin(spec.yaw || 0);
    var x2 = x * c + z * s;
    var z2 = -x * s + z * c;
    return { x: x2, y: y, z: z2 };
  }

  function viewOf(p, spec) {
    var q = posePoint(p, spec);
    var pitch = spec.pitch == null ? 0.58 : spec.pitch;
    var cp = Math.cos(pitch), sp = Math.sin(pitch);
    return {
      x: q.x,
      y: q.y * cp - q.z * sp,
      z: q.y * sp + q.z * cp
    };
  }

  function screenOf(p, spec) {
    var v = viewOf(p, spec);
    return { x: v.x, y: -v.y, z: v.z };
  }

  function centroid(face) {
    var c = { x: 0, y: 0, z: 0 };
    face.forEach(function (p) { c.x += p.x; c.y += p.y; c.z += p.z; });
    var n = face.length || 1;
    c.x /= n; c.y /= n; c.z /= n;
    return c;
  }

  function faceNormal(face) {
    return cross(sub(face[1], face[0]), sub(face[2], face[0]));
  }

  function fixWinding(faces) {
    var c = { x: 0, y: 0, z: 0 };
    var n = 0;
    faces.forEach(function (f) {
      f.forEach(function (p) { c.x += p.x; c.y += p.y; c.z += p.z; n++; });
    });
    c.x /= n; c.y /= n; c.z /= n;
    return faces.map(function (f) {
      var mid = centroid(f);
      var outward = sub(mid, c);
      if (dot(faceNormal(f), outward) < 0) return f.slice().reverse();
      return f.slice();
    });
  }

  function ring(y, radius, seg) {
    var pts = [];
    for (var i = 0; i < seg; i++) {
      var a = i / seg * Math.PI * 2;
      pts.push({ x: Math.cos(a) * radius, y: y, z: Math.sin(a) * radius });
    }
    return pts;
  }

  function boxMesh(w, h, d) {
    var x = w / 2, y = h / 2, z = d / 2;
    var p = {
      lbf: { x: -x, y: -y, z: z }, rbf: { x: x, y: -y, z: z },
      rbb: { x: x, y: -y, z: -z }, lbb: { x: -x, y: -y, z: -z },
      ltf: { x: -x, y: y, z: z }, rtf: { x: x, y: y, z: z },
      rtb: { x: x, y: y, z: -z }, ltb: { x: -x, y: y, z: -z }
    };
    return fixWinding([
      [p.lbf, p.rbf, p.rtf, p.ltf],
      [p.rbf, p.rbb, p.rtb, p.rtf],
      [p.rbb, p.lbb, p.ltb, p.rtb],
      [p.lbb, p.lbf, p.ltf, p.ltb],
      [p.ltf, p.rtf, p.rtb, p.ltb],
      [p.lbb, p.rbb, p.rbf, p.lbf]
    ]);
  }

  function tentMesh(len, wid, hei) {
    var x = len / 2, z = wid / 2, y = hei / 2;
    var fl = { x: -x, y: -y, z: z }, fr = { x: x, y: -y, z: z };
    var bl = { x: -x, y: -y, z: -z }, br = { x: x, y: -y, z: -z };
    var tl = { x: -x, y: y, z: 0 }, tr = { x: x, y: y, z: 0 };
    return fixWinding([
      [fl, fr, tr, tl],
      [bl, tl, tr, br],
      [fl, bl, br, fr],
      [fl, tl, bl],
      [fr, br, tr]
    ]);
  }

  function prismMesh(sides, radius, height) {
    var h2 = height / 2;
    var top = [], bot = [];
    for (var i = 0; i < sides; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / sides;
      top.push({ x: Math.cos(a) * radius, y: h2, z: Math.sin(a) * radius });
      bot.push({ x: Math.cos(a) * radius, y: -h2, z: Math.sin(a) * radius });
    }
    var faces = [];
    for (var k = 0; k < sides; k++) {
      var j = (k + 1) % sides;
      faces.push([bot[k], bot[j], top[j], top[k]]);
    }
    faces.push(top.slice());
    faces.push(bot.slice());
    return fixWinding(faces);
  }

  function pyramidMesh(sides, radius, height) {
    var h2 = height / 2;
    var apex = { x: 0, y: h2, z: 0 };
    var base = [];
    for (var i = 0; i < sides; i++) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / sides;
      base.push({ x: Math.cos(a) * radius, y: -h2, z: Math.sin(a) * radius });
    }
    var faces = [];
    for (var k = 0; k < sides; k++) faces.push([base[k], base[(k + 1) % sides], apex]);
    faces.push(base.slice());
    return fixWinding(faces);
  }

  function meshFor(spec) {
    if (spec.base === 'box') return boxMesh(spec.w, spec.h, spec.d);
    if (spec.base === 'tent') return tentMesh(spec.w, spec.h, spec.d);
    if (spec.base === 'prism') return prismMesh(spec.sides, spec.radius, spec.height);
    if (spec.base === 'pyramid') return pyramidMesh(spec.sides, spec.radius, spec.height);
    return boxMesh(1, 1, 1);
  }

  function hull(points) {
    var pts = points.slice().sort(function (a, b) {
      return a.x === b.x ? a.y - b.y : a.x - b.x;
    });
    if (pts.length < 3) return pts;
    function cross2(o, a, b) {
      return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    }
    var lower = [];
    for (var i = 0; i < pts.length; i++) {
      while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], pts[i]) <= 0) lower.pop();
      lower.push(pts[i]);
    }
    var upper = [];
    for (var j = pts.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], pts[j]) <= 0) upper.pop();
      upper.push(pts[j]);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  function pathOf(points, close) {
    if (!points.length) return '';
    var d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
    for (var i = 1; i < points.length; i++) {
      d += ' L ' + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
    }
    if (close) d += ' Z';
    return d;
  }

  function projectList(pts, spec, tag) {
    return pts.map(function (p, i) {
      var s = screenOf(p, spec);
      s.i = i;
      s.tag = tag;
      return s;
    });
  }

  function boundsOf(points, pad) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(function (p) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    if (!isFinite(minX)) { minX = -1; minY = -1; maxX = 1; maxY = 1; }
    var dx = (maxX - minX) || 1;
    var dy = (maxY - minY) || 1;
    var p = pad == null ? 0.14 : pad;
    var extra = Math.max(dx, dy) * 0.07;
    return {
      minX: minX - dx * p - extra,
      minY: minY - dy * p - extra,
      maxX: maxX + dx * p + extra,
      maxY: maxY + dy * p + extra * 1.8,
      width: dx,
      height: dy,
      cx: (minX + maxX) / 2,
      top: minY,
      bottom: maxY
    };
  }

  function shadowEl(b) {
    var rx = Math.max(18, b.width * 0.34);
    var ry = Math.max(8, rx * 0.28);
    var cy = b.bottom + ry * 0.15;
    return '<ellipse class="shadow" cx="' + b.cx.toFixed(2) + '" cy="' + cy.toFixed(2) +
      '" rx="' + rx.toFixed(2) + '" ry="' + ry.toFixed(2) + '" fill="#f3c3dc" opacity="0.55"/>';
  }

  function wrapSvg(parts, points, uid) {
    var b = boundsOf(points, 0.1);
    var sw = Math.max(b.width, b.height) * 0.034;
    var vb = [b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY].map(function (n) { return n.toFixed(2); }).join(' ');
    return '<svg class="solid" data-uid="' + uid + '" viewBox="' + vb + '" role="img" aria-label="立體圖形">' +
      shadowEl(b) + parts.join('') + '</svg>';
  }

  function lightShade(normal) {
    var L = norm({ x: -0.42, y: 0.78, z: 0.5 });
    var d = Math.max(0, dot(norm(normal), L));
    return 0.22 + 0.78 * d;
  }

  function renderFaceted(spec, uid) {
    var pal = palette(spec.palette);
    var faces = meshFor(spec);
    var drawn = [];
    var allPts = [];
    faces.forEach(function (face) {
      var viewPts = face.map(function (p) { return viewOf(p, spec); });
      var n = cross(sub(viewPts[1], viewPts[0]), sub(viewPts[2], viewPts[0]));
      if (n.z <= 0.04) return;
      var spts = viewPts.map(function (v) { return { x: v.x, y: -v.y, z: v.z }; });
      var area = 0;
      for (var i = 0; i < spts.length; i++) {
        var p = spts[i], q = spts[(i + 1) % spts.length];
        area += p.x * q.y - q.x * p.y;
      }
      if (Math.abs(area) < 0.004) return;
      var z = 0;
      spts.forEach(function (p) { z += p.z; });
      z /= spts.length;
      drawn.push({ pts: spts, z: z, shade: lightShade(n) });
      allPts = allPts.concat(spts);
    });
    drawn.sort(function (a, b) { return a.z - b.z; });
    var sw = 0.045;
    var parts = drawn.map(function (f) {
      return '<path class="face" d="' + pathOf(f.pts, true) + '" fill="' + faceColor(pal, f.shade) +
        '" stroke="' + pal.edge + '" stroke-width="' + sw + '" stroke-linejoin="round"/>';
    });
    return { parts: parts, points: allPts, sw: sw };
  }

  function walkRing(ringPts, from, to, dir) {
    var out = [];
    var n = ringPts.length;
    var i = from;
    var guard = 0;
    while (guard++ <= n) {
      out.push(ringPts[i]);
      if (i === to) break;
      i = (i + dir + n) % n;
    }
    return out;
  }

  function outerInner(ringPts, hullPts) {
    var on = {};
    hullPts.forEach(function (p) {
      if (p.tag === ringPts[0].tag) on[p.i] = true;
    });
    var tangents = [];
    hullPts.forEach(function (p, idx) {
      if (p.tag !== ringPts[0].tag) return;
      var prev = hullPts[(idx - 1 + hullPts.length) % hullPts.length];
      var next = hullPts[(idx + 1) % hullPts.length];
      if (prev.tag !== ringPts[0].tag || next.tag !== ringPts[0].tag) tangents.push(p.i);
    });
    if (tangents.length < 2) {
      return { outer: ringPts.slice(), inner: [] };
    }
    var a = tangents[0], b = tangents[1];
    var w1 = walkRing(ringPts, a, b, 1);
    var w2 = walkRing(ringPts, a, b, -1);
    function score(w) {
      var s = 0;
      w.forEach(function (p) { if (on[p.i]) s++; });
      return s;
    }
    if (score(w1) >= score(w2)) return { outer: w1, inner: w2 };
    return { outer: w2, inner: w1 };
  }

  function frontArc(pts) {
    if (!pts.length) return [];
    var z = 0;
    pts.forEach(function (p) { z += p.z; });
    z /= pts.length;
    var best = [];
    var cur = [];
    function consider() {
      if (cur.length > best.length) best = cur.slice();
    }
    for (var i = 0; i < pts.length; i++) {
      if (pts[i].z >= z - 0.001) cur.push(pts[i]);
      else { consider(); cur = []; }
    }
    if (cur.length) {
      var i0 = 0;
      while (i0 < pts.length && pts[i0].z >= z - 0.001) {
        cur.push(pts[i0]);
        i0++;
      }
      consider();
    }
    return best.length >= 3 ? best : pts;
  }

  function renderRound(spec, uid) {
    var pal = palette(spec.palette);
    var seg = 40;
    var h2 = spec.height / 2;
    var r = spec.radius;
    var isCone = spec.shape === 'cone';
    var parts = [];
    var all = [];
    var yBase = -h2;
    var yTop = h2;
    var baseRing = projectList(ring(isCone ? yBase : -h2, r, seg), spec, 'base');
    var topRing = isCone ? null : projectList(ring(h2, r, seg), spec, 'top');
    var apex = null;
    if (isCone) {
      var a = screenOf({ x: 0, y: yTop, z: 0 }, spec);
      a.tag = 'apex';
      a.i = -1;
      apex = a;
    }

    var gid = 'g' + uid;
    parts.push(
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="0.2">' +
      '<stop offset="0" stop-color="' + pal.dark + '"/>' +
      '<stop offset="0.38" stop-color="' + pal.light + '"/>' +
      '<stop offset="0.72" stop-color="' + pal.mid + '"/>' +
      '<stop offset="1" stop-color="' + mix(pal.mid, pal.dark, 0.45) + '"/>' +
      '</linearGradient></defs>'
    );

    var bodyPts;
    var sw = 0.05;
    if (isCone) {
      bodyPts = hull(baseRing.concat([apex]));
      parts.push('<path class="body" d="' + pathOf(bodyPts, true) + '" fill="url(#' + gid + ')" stroke="' + pal.edge + '" stroke-width="' + sw + '" stroke-linejoin="round"/>');
      all = all.concat(bodyPts);
      if (spec.vibe === 'waffle') {
        [0.3, 0.5, 0.7].forEach(function (t) {
          var y = yBase + (yTop - yBase) * t;
          var rr = r * (1 - t);
          var arc = frontArc(projectList(ring(y, rr, seg), spec, 'band'));
          if (arc.length > 2) {
            parts.push('<path class="waffle" d="' + pathOf(arc, false) + '" fill="none" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.45) + '" stroke-linecap="round" opacity="0.8"/>');
          }
        });
      }
    } else {
      bodyPts = hull(baseRing.concat(topRing));
      parts.push('<path class="body" d="' + pathOf(bodyPts, true) + '" fill="url(#' + gid + ')" stroke="' + pal.edge + '" stroke-width="' + sw + '" stroke-linejoin="round"/>');
      all = all.concat(bodyPts);
      if (spec.vibe === 'can') {
        var y0 = -h2 + spec.height * 0.3;
        var y1 = -h2 + spec.height * 0.7;
        var band = hull(projectList(ring(y0, r * 0.995, seg), spec, 'b0').concat(projectList(ring(y1, r * 0.995, seg), spec, 'b1')));
        parts.push('<path class="label" d="' + pathOf(band, true) + '" fill="#fffef8" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.35) + '" opacity="0.95"/>');
        var mid = projectList(ring((y0 + y1) / 2, r, 24), spec, 'mid');
        var front = mid[0];
        mid.forEach(function (p) { if (p.z > front.z) front = p; });
        var lw = spec.height * 0.34;
        var lh = r * 0.7;
        var labelColor = spec.palette === 'gold' ? '#ff8ec8' : '#ffd15c';
        parts.push('<rect class="sticker" x="' + (front.x - lw / 2).toFixed(2) + '" y="' + (front.y - lh / 2).toFixed(2) +
          '" width="' + lw.toFixed(2) + '" height="' + lh.toFixed(2) + '" rx="' + (lh * 0.22).toFixed(2) +
          '" fill="' + labelColor + '" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.35) + '"/>');
      }
    }

    function capZ(normal) {
      return viewOf(normal, spec).z;
    }
    var caps = [];
    if (isCone) {
      caps.push({ pts: baseRing, facing: capZ({ x: 0, y: -1, z: 0 }), which: 'base' });
    } else {
      caps.push({ pts: topRing, facing: capZ({ x: 0, y: 1, z: 0 }), which: 'top' });
      caps.push({ pts: baseRing, facing: capZ({ x: 0, y: -1, z: 0 }), which: 'base' });
    }
    caps.sort(function (a, b) { return a.facing - b.facing; });
    caps.forEach(function (cap) {
      if (cap.facing > 0.16) {
        var fill = cap.which === 'top' || (isCone && cap.facing > 0) ? pal.light : mix(pal.mid, pal.dark, 0.25);
        if (isCone) fill = mix(pal.light, '#ffffff', 0.35);
        parts.push('<path class="cap" d="' + pathOf(cap.pts, true) + '" fill="' + fill + '" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.85) + '" stroke-linejoin="round"/>');
        all = all.concat(cap.pts);
      } else if (isCone) {
        var split = outerInner(baseRing, bodyPts);
        if (split.inner.length > 2) {
          parts.push('<path class="rim" d="' + pathOf(split.inner, false) + '" fill="none" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round"/>');
        }
      }
    });

    return { parts: parts, points: all };
  }

  function renderSphere(spec, uid) {
    var pal = palette(spec.palette);
    var R = 1 * (spec.scale || 1);
    var yaw = spec.yaw || 0;
    var gid = 'gs' + uid;
    var clip = 'cs' + uid;
    var hx = 32 + Math.round(Math.cos(yaw) * 6);
    var hy = 28 + Math.round(Math.sin(yaw) * 4);
    var rot = Math.round((yaw * 180 / Math.PI) % 360);
    var parts = [];
    parts.push('<defs>');
    parts.push('<radialGradient id="' + gid + '" cx="' + hx + '%" cy="' + hy + '%" r="72%">');
    parts.push('<stop offset="0" stop-color="#ffffff"/>');
    parts.push('<stop offset="16%" stop-color="' + pal.light + '"/>');
    parts.push('<stop offset="58%" stop-color="' + pal.mid + '"/>');
    parts.push('<stop offset="100%" stop-color="' + pal.dark + '"/>');
    parts.push('</radialGradient>');
    parts.push('<clipPath id="' + clip + '"><circle cx="0" cy="0" r="' + R.toFixed(3) + '"/></clipPath>');
    parts.push('</defs>');
    parts.push('<g clip-path="url(#' + clip + ')">');
    parts.push('<circle cx="0" cy="0" r="' + R.toFixed(3) + '" fill="url(#' + gid + ')"/>');
    if (spec.vibe === 'beach') {
      parts.push('<g transform="rotate(' + rot + ')">');
      parts.push('<path d="M -1.2 -0.22 C -0.4 -0.7, 0.4 -0.7, 1.2 -0.22 L 1.2 0.22 C 0.4 0.7, -0.4 0.7, -1.2 0.22 Z" fill="' + mix(pal.light, '#ffffff', 0.35) + '" opacity="0.95"/>');
      parts.push('<path d="M -0.22 -1.2 C -0.7 -0.4, -0.7 0.4, -0.22 1.2 L 0.22 1.2 C 0.7 0.4, 0.7 -0.4, 0.22 -1.2 Z" fill="' + pal.dark + '" opacity="0.55"/>');
      parts.push('</g>');
    } else if (spec.vibe === 'ball') {
      parts.push('<g transform="rotate(' + rot + ')" fill="none" stroke="' + pal.edge + '" stroke-width="0.045" stroke-linecap="round" opacity="0.85">');
      parts.push('<path d="M -0.15 -0.98 C 0.55 -0.45, 0.55 0.45, -0.15 0.98"/>');
      parts.push('<path d="M 0.15 -0.98 C -0.55 -0.45, -0.55 0.45, 0.15 0.98"/>');
      parts.push('</g>');
    }
    parts.push('</g>');
    parts.push('<circle cx="0" cy="0" r="' + R.toFixed(3) + '" fill="none" stroke="' + pal.edge + '" stroke-width="0.055"/>');
    parts.push('<ellipse cx="' + (-R * 0.32).toFixed(3) + '" cy="' + (-R * 0.34).toFixed(3) + '" rx="' + (R * 0.18).toFixed(3) + '" ry="' + (R * 0.1).toFixed(3) + '" fill="#ffffff" opacity="0.85" transform="rotate(-28)"/>');
    var pts = [
      { x: -R, y: -R }, { x: R, y: -R }, { x: R, y: R }, { x: -R, y: R }
    ];
    return wrapSvg(parts, pts, uid);
  }

  function renderSvg(spec, uid) {
    uid = String(uid || 's').replace(/[^A-Za-z0-9_-]/g, '') || 's';
    if (!spec || !NAME_OF[spec.shape]) return '';
    if (spec.shape === 'sphere') return renderSphere(spec, uid);
    var drawn = (spec.shape === 'cone' || spec.shape === 'cylinder') ? renderRound(spec, uid) : renderFaceted(spec, uid);
    if (!drawn.points.length) return '';
    var b = boundsOf(drawn.points, 0.1);
    var sw = Math.max(b.width, b.height) * 0.028;
    var scaled = drawn.parts.map(function (chunk) {
      return chunk.replace(/stroke-width="([0-9.]+)"/g, function (_, n) {
        return 'stroke-width="' + (parseFloat(n) * sw / 0.045).toFixed(2) + '"';
      });
    });
    return wrapSvg(scaled, drawn.points, uid);
  }

  function nameOf(id) { return NAME_OF[id] || ''; }

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

  return {
    NAMES: NAMES,
    PALETTES: PALETTES,
    makeRound: makeRound,
    catalog: catalog,
    renderSvg: renderSvg,
    nameOf: nameOf,
    starsFor: starsFor
  };
});
