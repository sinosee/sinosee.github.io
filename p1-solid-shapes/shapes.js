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
      { id: 'tall-up', axis: 'y', radius: 0.86, height: 1.78, spin: 0, pitch: 0.46 },
      { id: 'wide-up', axis: 'y', radius: 1.16, height: 1.18, spin: 0, pitch: 0.52 },
      { id: 'down', axis: 'y', radius: 0.96, height: 1.58, spin: Math.PI, pitch: 0.5 },
      { id: 'lie', axis: 'x', radius: 0.7, height: 1.9, spin: 0, pitch: 0.34 }
    ],
    cylinder: [
      { id: 'tall', axis: 'y', radius: 0.62, height: 1.78, pitch: 0.56 },
      { id: 'short', axis: 'y', radius: 0.74, height: 1.16, pitch: 0.64 },
      { id: 'roll', axis: 'x', radius: 0.58, height: 1.95, pitch: 0.38 },
      { id: 'wide', axis: 'y', radius: 0.88, height: 0.72, pitch: 0.74 }
    ],
    sphere: [
      { id: 'plain', scale: 1, yaw: 0.4 },
      { id: 'large', scale: 1.08, yaw: 1.2 },
      { id: 'small', scale: 0.84, yaw: 2.4 },
      { id: 'side', scale: 1, yaw: 2.8 }
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

  function specFromVariant(variant, yaw) {
    return {
      shape: variant.base === 'pyramid' ? 'pyramid' : 'prism',
      variant: variant.id,
      axis: variant.axis || 'y',
      spin: variant.spin || 0,
      modelYaw: variant.modelYaw || 0,
      pitch: variant.pitch == null ? 0.58 : variant.pitch,
      scale: variant.scale || 1,
      sides: variant.sides,
      radius: variant.radius,
      height: variant.height,
      w: variant.w,
      h: variant.h,
      d: variant.d,
      base: variant.base,
      yaw: yaw
    };
  }

  /* A pyramid only counts when two faces meet in a clear ridge.
     A single front face is just a flat triangle, which P1 students
     cannot tell apart from a prism end. */
  function pyramidLooksSolid(spec) {
    var faces = meshFor(spec);
    var vis = [];
    faces.forEach(function (face, idx) {
      var viewPts = face.map(function (p) { return viewOf(p, spec); });
      var nrm = cross(sub(viewPts[1], viewPts[0]), sub(viewPts[2], viewPts[0]));
      var spts = viewPts.map(function (v) { return { x: v.x, y: -v.y }; });
      var area = 0;
      for (var i = 0; i < spts.length; i++) {
        var p = spts[i], q = spts[(i + 1) % spts.length];
        area += p.x * q.y - q.x * p.y;
      }
      area = Math.abs(area) * 0.5;
      if (nrm.z > 0.18 && area > 0.05) {
        vis.push({ area: area, pts: spts, lateral: idx !== faces.length - 1 });
      }
    });
    if (vis.length < 2) return false;
    var sum = 0;
    var lateral = 0;
    vis.forEach(function (f) {
      sum += f.area;
      if (f.lateral) lateral += 1;
    });
    if (lateral < 1 || sum <= 0) return false;
    vis.sort(function (a, b) { return b.area - a.area; });
    if (vis[0].area > sum * 0.82) return false;
    if (vis[1].area < sum * 0.14) return false;
    function vkey(p) { return p.x.toFixed(3) + ',' + p.y.toFixed(3); }
    var seen = {};
    var maxShare = 0;
    vis.forEach(function (f) {
      for (var i = 0; i < f.pts.length; i++) {
        var a = vkey(f.pts[i]);
        var b = vkey(f.pts[(i + 1) % f.pts.length]);
        var id = a < b ? a + '|' + b : b + '|' + a;
        var dx = f.pts[i].x - f.pts[(i + 1) % f.pts.length].x;
        var dy = f.pts[i].y - f.pts[(i + 1) % f.pts.length].y;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (seen[id]) {
          if (len > maxShare) maxShare = len;
        } else {
          seen[id] = true;
        }
      }
    });
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    vis.forEach(function (f) {
      f.pts.forEach(function (p) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      });
    });
    var span = Math.max(maxX - minX, maxY - minY) || 1;
    return maxShare > span * 0.24;
  }

  function pickPyramidYaw(variant, rng) {
    var good = [];
    var steps = 48;
    for (var i = 0; i < steps; i++) {
      var yaw = (i / steps) * Math.PI * 2;
      if (pyramidLooksSolid(specFromVariant(variant, yaw))) good.push(yaw);
    }
    if (!good.length) return null;
    var yaw = good[Math.floor(rng() * good.length)];
    var jittered = yaw + (rng() * 0.06 - 0.03);
    if (pyramidLooksSolid(specFromVariant(variant, jittered))) return jittered;
    return yaw;
  }

  function pickYaw(spec, rng) {
    if (spec.base === 'pyramid') {
      var solid = pickPyramidYaw(spec, rng);
      if (solid != null) return solid;
    }
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
      sp.choices = NAMES.map(function (n) { return n.id; });
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
        if (spec.base === 'pyramid') {
          var safeYaw = pickPyramidYaw(variant, mulberry32(2000 + pi * 13 + i));
          if (safeYaw != null) spec.yaw = safeYaw;
        } else if (spec.axis === 'x') spec.yaw = YAW_LIE[i % YAW_LIE.length];
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

  function pathOf(points, close) {
    if (!points.length) return '';
    var d = 'M ' + points[0].x.toFixed(2) + ' ' + points[0].y.toFixed(2);
    for (var i = 1; i < points.length; i++) {
      d += ' L ' + points[i].x.toFixed(2) + ' ' + points[i].y.toFixed(2);
    }
    if (close) d += ' Z';
    return d;
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

  /* Ground contact only. Radii stay in the same unit space as the solid
     (about 1–2), so the oval cannot fill the viewBox as a pink card. */
  function shadowGeom(b) {
    var span = Math.max(b.width, b.height, 0.2);
    var rx = span * 0.34;
    var ry = rx * 0.22;
    return { cx: b.cx, cy: b.bottom + ry * 0.2, rx: rx, ry: ry };
  }

  function shadowEl(sh) {
    return '<ellipse class="shadow" cx="' + sh.cx.toFixed(2) + '" cy="' + sh.cy.toFixed(2) +
      '" rx="' + sh.rx.toFixed(2) + '" ry="' + sh.ry.toFixed(2) + '" fill="#d9cfe4" opacity="0.42"/>';
  }

  function wrapSvg(parts, points, uid) {
    var b = boundsOf(points, 0.12);
    var sh = shadowGeom(b);
    var minX = Math.min(b.minX, sh.cx - sh.rx);
    var maxX = Math.max(b.maxX, sh.cx + sh.rx);
    var minY = b.minY;
    var maxY = Math.max(b.maxY, sh.cy + sh.ry);
    var vb = [minX, minY, maxX - minX, maxY - minY].map(function (n) { return n.toFixed(2); }).join(' ');
    return '<svg class="solid" data-uid="' + uid + '" viewBox="' + vb + '" role="img" aria-label="立體圖形">' +
      shadowEl(sh) + parts.join('') + '</svg>';
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

  /* Orthographic circle: center on the Y axis, radius in XZ.
     Returned ellipse uses smooth SVG geometry, never a polyline. */
  function circleEllipse(y, radius, spec) {
    var c = screenOf({ x: 0, y: y, z: 0 }, spec);
    var ax = screenOf({ x: radius, y: 0, z: 0 }, spec);
    var bx = screenOf({ x: 0, y: 0, z: radius }, spec);
    var A = { x: ax.x, y: ax.y };
    var B = { x: bx.x, y: bx.y };
    var aa = A.x * A.x + B.x * B.x;
    var bb = A.y * A.y + B.y * B.y;
    var cc = A.x * A.y + B.x * B.y;
    var disc = Math.sqrt(Math.max(0, (aa - bb) * (aa - bb) + 4 * cc * cc));
    var major = Math.max(0, (aa + bb + disc) / 2);
    var minor = Math.max(0, (aa + bb - disc) / 2);
    return {
      cx: c.x,
      cy: c.y,
      rx: Math.sqrt(major),
      ry: Math.sqrt(minor),
      rot: 0.5 * Math.atan2(2 * cc, aa - bb),
      A: A,
      B: B
    };
  }

  function ellipsePoint(ell, t) {
    var c = Math.cos(ell.rot), s = Math.sin(ell.rot);
    var x = Math.cos(t) * ell.rx;
    var y = Math.sin(t) * ell.ry;
    return { x: ell.cx + x * c - y * s, y: ell.cy + x * s + y * c };
  }

  function ellipseTheta(ell, p) {
    var c = Math.cos(ell.rot), s = Math.sin(ell.rot);
    var dx = p.x - ell.cx, dy = p.y - ell.cy;
    var x = dx * c + dy * s;
    var y = -dx * s + dy * c;
    return Math.atan2(y / Math.max(ell.ry, 1e-4), x / Math.max(ell.rx, 1e-4));
  }

  function ellipseSamples(ell) {
    var pts = [];
    for (var i = 0; i < 8; i++) pts.push(ellipsePoint(ell, i / 8 * Math.PI * 2));
    return pts;
  }

  function supportPoint(ell, n) {
    var an = ell.A.x * n.x + ell.A.y * n.y;
    var bn = ell.B.x * n.x + ell.B.y * n.y;
    var L = Math.sqrt(an * an + bn * bn) || 1;
    return {
      x: ell.cx + (an * ell.A.x + bn * ell.B.x) / L,
      y: ell.cy + (an * ell.A.y + bn * ell.B.y) / L
    };
  }

  function perp2(d) {
    var len = Math.sqrt(d.x * d.x + d.y * d.y) || 1;
    return { x: -d.y / len, y: d.x / len };
  }

  function outerDelta(ell, tA, tB, awayFrom) {
    var d1 = tB - tA;
    while (d1 > Math.PI) d1 -= Math.PI * 2;
    while (d1 < -Math.PI) d1 += Math.PI * 2;
    var d2 = d1 > 0 ? d1 - Math.PI * 2 : d1 + Math.PI * 2;
    function score(delta) {
      var mid = ellipsePoint(ell, tA + delta / 2);
      var dx = mid.x - awayFrom.x, dy = mid.y - awayFrom.y;
      return dx * dx + dy * dy;
    }
    return score(d1) >= score(d2) ? d1 : d2;
  }

  function xy(p) { return p.x.toFixed(4) + ' ' + p.y.toFixed(4); }

  function appendArc(cmds, ell, t0, delta) {
    var steps = Math.max(1, Math.ceil(Math.abs(delta) / (Math.PI / 2)));
    var step = delta / steps;
    var t = t0;
    for (var i = 0; i < steps; i++) {
      var d = step;
      var k = (4 / 3) * Math.tan(d / 4);
      var p0 = ellipsePoint(ell, t);
      var p3 = ellipsePoint(ell, t + d);
      function deriv(th) {
        var c = Math.cos(ell.rot), s = Math.sin(ell.rot);
        var dx = -ell.rx * Math.sin(th);
        var dy = ell.ry * Math.cos(th);
        return { x: dx * c - dy * s, y: dx * s + dy * c };
      }
      var d0 = deriv(t), d1 = deriv(t + d);
      cmds.push('C ' + xy({ x: p0.x + k * d0.x, y: p0.y + k * d0.y }) +
        ' ' + xy({ x: p3.x - k * d1.x, y: p3.y - k * d1.y }) +
        ' ' + xy(p3));
      t += d;
    }
  }

  function ellipseTag(ell, fill, stroke, sw) {
    var deg = (ell.rot * 180 / Math.PI).toFixed(3);
    var rx = Math.max(ell.rx, 0.012);
    var ry = Math.max(ell.ry, 0.012);
    return '<ellipse cx="' + ell.cx.toFixed(4) + '" cy="' + ell.cy.toFixed(4) +
      '" rx="' + rx.toFixed(4) + '" ry="' + ry.toFixed(4) +
      '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + sw +
      '" transform="rotate(' + deg + ' ' + ell.cx.toFixed(4) + ' ' + ell.cy.toFixed(4) + ')"/>';
  }

  function coneTangents(apex, ell) {
    var c = Math.cos(ell.rot), s = Math.sin(ell.rot);
    var dx = apex.x - ell.cx, dy = apex.y - ell.cy;
    var x = (dx * c + dy * s) / Math.max(ell.rx, 1e-4);
    var y = (-dx * s + dy * c) / Math.max(ell.ry, 1e-4);
    var d2 = x * x + y * y;
    if (d2 <= 1.002) return null;
    var beta = Math.atan2(y, x);
    var alpha = Math.acos(Math.min(1, 1 / Math.sqrt(d2)));
    return [beta + alpha, beta - alpha];
  }

  function radiusAt(spec, y) {
    var h2 = spec.height / 2;
    if (spec.shape !== 'cone') return spec.radius;
    var t = (h2 - y) / (spec.height || 1);
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return spec.radius * t;
  }

  /* A point just outside the surface is closer to the camera when this
     generator faces us. +z is toward the camera. */
  function surfaceFaces(spec, theta, y) {
    var rad = Math.max(radiusAt(spec, y), 0.04);
    var c = Math.cos(theta), s = Math.sin(theta);
    var on = viewOf({ x: c * rad, y: y, z: s * rad }, spec);
    var out = viewOf({ x: c * (rad + 0.4), y: y, z: s * (rad + 0.4) }, spec);
    return out.z > on.z;
  }

  function rollPoint(spec, theta, y) {
    var rad = radiusAt(spec, y) * 0.93;
    return screenOf({ x: Math.cos(theta) * rad, y: y, z: Math.sin(theta) * rad }, spec);
  }

  /* Stripe around the cylinder/cone axis. The outline stays still;
     only this band moves, so the solid rolls on its side. */
  function rollBandPaths(spec, theta, width, y0, y1) {
    var steps = 16;
    var yMid = y0 + (y1 - y0) * 0.45;
    var runs = [];
    var run = null;
    for (var i = 0; i <= steps; i++) {
      var th = theta - width / 2 + width * (i / steps);
      if (surfaceFaces(spec, th, yMid)) {
        if (!run) run = [];
        run.push(th);
      } else if (run) {
        runs.push(run);
        run = null;
      }
    }
    if (run) runs.push(run);
    var paths = [];
    runs.forEach(function (samples) {
      if (samples.length < 2) return;
      var a = samples[0];
      var b = samples[samples.length - 1];
      var n = 6;
      var bot = [];
      var top = [];
      for (var k = 0; k <= n; k++) {
        var th = a + (b - a) * (k / n);
        bot.push(rollPoint(spec, th, y0));
        top.push(rollPoint(spec, th, y1));
      }
      var d = 'M ' + xy(bot[0]);
      for (var bi = 1; bi < bot.length; bi++) d += ' L ' + xy(bot[bi]);
      for (var ti = top.length - 1; ti >= 0; ti--) d += ' L ' + xy(top[ti]);
      paths.push(d + ' Z');
    });
    return paths;
  }

  function appendRollBands(parts, spec, pal) {
    if (spec.roll == null || !isFinite(+spec.roll)) return;
    if (spec.shape !== 'cone' && spec.shape !== 'cylinder') return;
    var h2 = spec.height / 2;
    var width = spec.shape === 'cone' ? 0.52 : 0.6;
    [0, Math.PI].forEach(function (shift) {
      rollBandPaths(spec, +spec.roll + shift, width, -h2, h2).forEach(function (d) {
        parts.push('<path class="rollBand" d="' + d + '" fill="' + pal.edge + '" fill-opacity="0.72" stroke="none"/>');
      });
    });
  }

  function renderRound(spec, uid) {
    var pal = palette(spec.palette);
    var h2 = spec.height / 2;
    var r = spec.radius;
    var isCone = spec.shape === 'cone';
    var parts = [];
    var all = [];
    var sw = 0.05;
    var base = circleEllipse(-h2, r, spec);
    var apex = isCone ? screenOf({ x: 0, y: h2, z: 0 }, spec) : null;
    var top = isCone ? null : circleEllipse(h2, r, spec);
    var gid = 'g' + uid;
    parts.push(
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="0.15">' +
      '<stop offset="0" stop-color="' + pal.dark + '"/>' +
      '<stop offset="0.42" stop-color="' + pal.light + '"/>' +
      '<stop offset="0.72" stop-color="' + pal.mid + '"/>' +
      '<stop offset="1" stop-color="' + mix(pal.mid, pal.dark, 0.45) + '"/>' +
      '</linearGradient></defs>'
    );

    if (isCone) {
      var ts = coneTangents(apex, base);
      if (ts) {
        var p0 = ellipsePoint(base, ts[0]);
        var outer = outerDelta(base, ts[0], ts[1], apex);
        var cmds = ['M ' + xy(apex), 'L ' + xy(p0)];
        appendArc(cmds, base, ts[0], outer);
        cmds.push('Z');
        parts.push('<path class="body" d="' + cmds.join(' ') + '" fill="url(#' + gid + ')" stroke="' + pal.edge + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"/>');
        all.push(apex, p0, ellipsePoint(base, ts[1]));
      }
      all = all.concat(ellipseSamples(base));
    } else {
      var axis = { x: top.cx - base.cx, y: top.cy - base.cy };
      var n = perp2(axis);
      var a0 = supportPoint(base, n);
      var a1 = supportPoint(top, n);
      var b0 = supportPoint(base, { x: -n.x, y: -n.y });
      var b1 = supportPoint(top, { x: -n.x, y: -n.y });
      var cmdsC = ['M ' + xy(a0), 'L ' + xy(a1)];
      appendArc(cmdsC, top, ellipseTheta(top, a1), outerDelta(top, ellipseTheta(top, a1), ellipseTheta(top, b1), { x: base.cx, y: base.cy }));
      cmdsC.push('L ' + xy(b0));
      appendArc(cmdsC, base, ellipseTheta(base, b0), outerDelta(base, ellipseTheta(base, b0), ellipseTheta(base, a0), { x: top.cx, y: top.cy }));
      cmdsC.push('Z');
      parts.push('<path class="body" d="' + cmdsC.join(' ') + '" fill="url(#' + gid + ')" stroke="' + pal.edge + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"/>');
      all.push(a0, a1, b0, b1);
      all = all.concat(ellipseSamples(base), ellipseSamples(top));
    }

    appendRollBands(parts, spec, pal);

    function capFacing(dir) {
      return viewOf(dir, spec).z;
    }
    if (isCone) {
      var face = capFacing({ x: 0, y: -1, z: 0 });
      if (face > 0.14) {
        parts.push(ellipseTag(base, mix(pal.light, '#ffffff', 0.35), pal.edge, sw * 0.85));
      } else if (apex && coneTangents(apex, base)) {
        var tang = coneTangents(apex, base);
        var inner = outerDelta(base, tang[0], tang[1], apex);
        inner = inner > 0 ? inner - Math.PI * 2 : inner + Math.PI * 2;
        var rim = ['M ' + xy(ellipsePoint(base, tang[0]))];
        appendArc(rim, base, tang[0], inner);
        parts.push('<path class="rim" d="' + rim.join(' ') + '" fill="none" stroke="' + pal.edge + '" stroke-width="' + (sw * 0.7) + '" stroke-linecap="round"/>');
      }
    } else {
      var caps = [
        { ell: top, facing: capFacing({ x: 0, y: 1, z: 0 }), fill: pal.light },
        { ell: base, facing: capFacing({ x: 0, y: -1, z: 0 }), fill: mix(pal.mid, pal.dark, 0.25) }
      ];
      caps.sort(function (a, b) { return a.facing - b.facing; });
      caps.forEach(function (cap) {
        if (cap.facing > 0.12) parts.push(ellipseTag(cap.ell, cap.fill, pal.edge, sw * 0.85));
      });
    }
    return { parts: parts, points: all };
  }

  function renderSphere(spec, uid) {
    var pal = palette(spec.palette);
    var R = 1 * (spec.scale || 1);
    var yaw = spec.yaw || 0;
    var gid = 'gs' + uid;
    var hx = 32 + Math.round(Math.cos(yaw) * 6);
    var hy = 28 + Math.round(Math.sin(yaw) * 4);
    var parts = [];
    parts.push('<defs>');
    parts.push('<radialGradient id="' + gid + '" cx="' + hx + '%" cy="' + hy + '%" r="72%">');
    parts.push('<stop offset="0" stop-color="#ffffff"/>');
    parts.push('<stop offset="16%" stop-color="' + pal.light + '"/>');
    parts.push('<stop offset="58%" stop-color="' + pal.mid + '"/>');
    parts.push('<stop offset="100%" stop-color="' + pal.dark + '"/>');
    parts.push('</radialGradient>');
    parts.push('</defs>');
    parts.push('<circle cx="0" cy="0" r="' + R.toFixed(3) + '" fill="url(#' + gid + ')" stroke="' + pal.edge + '" stroke-width="0.055"/>');
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
