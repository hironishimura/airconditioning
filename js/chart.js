/*
 * chart.js — 空気線図（t-x 線図）を SVG で描画する
 * 依存: psychro.js (グローバル Psy)
 */
(function (root) {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var FONT = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic', sans-serif";

  var COLORS = {
    bg: '#ffffff',
    frame: '#1f2d3d',
    grid: '#c9d1da',
    gridMajor: '#97a3b1',
    sat: '#1f2d3d',
    rh: '#2b74b8',
    wb: '#2e9e5b',
    h: '#c2412d',
    v: '#8a4fb0',
    text: '#2b3440',
    sub: '#5c6876',
    shf: '#e08a00'
  };

  var POINT_COLORS = ['#d7263d', '#1b998b', '#3f51b5', '#f46036', '#6a4c93', '#2e86ab', '#c5283d', '#5f9e2f'];

  function f(n) { return Math.round(n * 100) / 100; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function PsyChart(svg) {
    this.svg = svg;
    this.W = 1100;
    this.H = 720;
    this.m = { l: 56, r: 74, t: 28, b: 54 };
    this.P = Psy.STD_P;
    this.range = { tMin: -10, tMax: 50, xMax: 0.030 };
    this.layers = { db: true, x: true, rh: true, wb: true, h: true, v: true };
    this.data = { points: [], processes: [], shf: [] };
    this.cursor = null;
    this.selected = null;

    svg.setAttribute('viewBox', '0 0 ' + this.W + ' ' + this.H);
    svg.setAttribute('xmlns', SVGNS);
    svg.innerHTML =
      '<defs id="psy-defs"></defs>' +
      '<g id="psy-base"></g>' +
      '<g id="psy-data"></g>' +
      '<g id="psy-cursor" pointer-events="none"></g>';
    this.gDefs = svg.querySelector('#psy-defs');
    this.gBase = svg.querySelector('#psy-base');
    this.gData = svg.querySelector('#psy-data');
    this.gCursor = svg.querySelector('#psy-cursor');
  }

  PsyChart.COLORS = COLORS;
  PsyChart.POINT_COLORS = POINT_COLORS;

  var proto = PsyChart.prototype;

  proto.plot = function () {
    return { x0: this.m.l, x1: this.W - this.m.r, y0: this.m.t, y1: this.H - this.m.b };
  };

  proto.px = function (t) {
    var p = this.plot(), r = this.range;
    return p.x0 + (t - r.tMin) / (r.tMax - r.tMin) * (p.x1 - p.x0);
  };

  proto.py = function (x) {
    var p = this.plot();
    return p.y1 - x / this.range.xMax * (p.y1 - p.y0);
  };

  /** SVG 座標 → (t, x) */
  proto.toData = function (sx, sy) {
    var p = this.plot(), r = this.range;
    return {
      t: r.tMin + (sx - p.x0) / (p.x1 - p.x0) * (r.tMax - r.tMin),
      x: (p.y1 - sy) / (p.y1 - p.y0) * r.xMax
    };
  };

  /** マウスイベント → SVG 座標 */
  proto.eventPoint = function (evt) {
    var pt = this.svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    var m = this.svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    var r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  };

  proto.inPlot = function (sx, sy) {
    var p = this.plot();
    return sx >= p.x0 && sx <= p.x1 && sy >= p.y0 && sy <= p.y1;
  };

  proto.isValid = function (t, x) {
    var r = this.range;
    return t >= r.tMin && t <= r.tMax && x >= 0 && x <= r.xMax && x <= Psy.satHumRatio(t, this.P);
  };

  proto.setPressure = function (P) { this.P = P; };
  proto.setRange = function (r) { this.range = r; };
  proto.setLayers = function (l) { this.layers = l; };
  proto.setData = function (d) { this.data = d; };

  proto.path = function (pts) {
    var self = this;
    return pts.map(function (p, i) {
      return (i ? 'L' : 'M') + f(self.px(p[0])) + ' ' + f(self.py(p[1]));
    }).join('');
  };

  /** 飽和絶対湿度が xMax に達する温度 */
  proto.tSatTop = function () {
    var r = this.range, P = this.P;
    if (Psy.satHumRatio(r.tMax, P) <= r.xMax) return r.tMax;
    return Psy.bisect(function (t) { return Psy.satHumRatio(t, P) - r.xMax; }, r.tMin, r.tMax, 1e-6);
  };

  proto.render = function () {
    this.renderBase();
    this.renderData();
    this.renderCursor();
  };

  proto.renderBase = function () {
    var self = this, r = this.range, P = this.P, L = this.layers;
    var p = this.plot();
    var tTop = this.tSatTop();
    var out = [];
    var i, t, x, d;

    // 飽和曲線
    var sat = [];
    for (t = r.tMin; t < tTop; t += 0.25) sat.push([t, Psy.satHumRatio(t, P)]);
    sat.push([tTop, Psy.satHumRatio(tTop, P)]);

    // 不飽和域のクリップ
    var region = [[r.tMin, 0]].concat(sat);
    if (tTop < r.tMax) region.push([r.tMax, r.xMax]);
    region.push([r.tMax, 0]);
    this.gDefs.innerHTML =
      '<clipPath id="psy-clip"><path d="' + this.path(region) + 'Z"/></clipPath>' +
      '<clipPath id="psy-clip-plot"><rect x="' + p.x0 + '" y="' + p.y0 + '" width="' + (p.x1 - p.x0) +
      '" height="' + (p.y1 - p.y0) + '"/></clipPath>';

    out.push('<rect x="0" y="0" width="' + this.W + '" height="' + this.H + '" fill="' + COLORS.bg + '"/>');
    out.push('<g clip-path="url(#psy-clip)" fill="none">');

    // 乾球温度線
    if (L.db) {
      for (t = Math.ceil(r.tMin); t <= r.tMax; t++) {
        var major = t % 5 === 0;
        out.push('<line x1="' + f(this.px(t)) + '" y1="' + p.y1 + '" x2="' + f(this.px(t)) + '" y2="' + p.y0 +
          '" stroke="' + (major ? COLORS.gridMajor : COLORS.grid) + '" stroke-width="' + (major ? 0.9 : 0.5) + '"/>');
      }
    }
    // 絶対湿度線
    var xStep = this.xStep();
    if (L.x) {
      for (i = 1; i * xStep <= r.xMax * 1000 + 1e-9; i++) {
        x = i * xStep / 1000;
        var majorX = (i * xStep) % 5 === 0;
        out.push('<line x1="' + p.x0 + '" y1="' + f(this.py(x)) + '" x2="' + p.x1 + '" y2="' + f(this.py(x)) +
          '" stroke="' + (majorX ? COLORS.gridMajor : COLORS.grid) + '" stroke-width="' + (majorX ? 0.9 : 0.5) + '"/>');
      }
    }
    // 比容積線
    if (L.v) {
      var vMin = Math.floor(Psy.volume(r.tMin, 0, P) * 100) / 100;
      var vMax = Math.ceil(Psy.volume(r.tMax, r.xMax, P) * 100) / 100;
      for (var v = vMin; v <= vMax + 1e-9; v += 0.01) {
        d = [];
        for (i = 0; i <= 6; i++) {
          x = r.xMax * i / 6;
          d.push([Psy.tFromVX(v, x, P), x]);
        }
        out.push('<path d="' + this.path(d) + '" stroke="' + COLORS.v + '" stroke-width="0.7" stroke-dasharray="6 3"/>');
      }
    }
    // 比エンタルピー線
    if (L.h) {
      var hMin = Math.floor(Psy.enthalpy(r.tMin, 0) / 5) * 5;
      var hMax = Math.ceil(Psy.enthalpy(tTop, r.xMax) / 5) * 5;
      for (var h = hMin; h <= hMax; h += 5) {
        d = [];
        for (i = 0; i <= 6; i++) {
          x = r.xMax * i / 6;
          d.push([Psy.tFromHX(h, x), x]);
        }
        out.push('<path d="' + this.path(d) + '" stroke="' + COLORS.h + '" stroke-width="' + (h % 10 === 0 ? 0.8 : 0.45) + '"/>');
      }
    }
    // 湿球温度線
    if (L.wb) {
      for (var tw = Math.floor(r.tMin - 15); tw <= Math.ceil(tTop); tw++) {
        var tEnd = Psy.wetBulbLineEnd(tw, P);
        d = [];
        for (i = 0; i <= 6; i++) {
          t = tw + (tEnd - tw) * i / 6;
          d.push([t, Math.max(0, Psy.humRatioFromWetBulb(t, tw, P))]);
        }
        var wbMajor = tw % 5 === 0;
        out.push('<path d="' + this.path(d) + '" stroke="' + COLORS.wb + '" stroke-width="' + (wbMajor ? 0.8 : 0.45) +
          '" stroke-dasharray="' + (wbMajor ? '' : '3 3') + '"/>');
      }
    }
    // 相対湿度線
    if (L.rh) {
      for (var rh = 10; rh < 100; rh += 10) {
        d = [];
        for (t = r.tMin; t <= r.tMax + 1e-9; t += 0.25) {
          x = Psy.humRatioFromRH(t, rh / 100, P);
          d.push([t, x]);
          if (x > r.xMax) break;
        }
        out.push('<path d="' + this.path(d) + '" stroke="' + COLORS.rh + '" stroke-width="' + (rh === 50 ? 1.1 : 0.8) + '"/>');
      }
    }
    out.push('</g>');

    // 飽和曲線
    out.push('<path d="' + this.path(sat) + '" fill="none" stroke="' + COLORS.sat + '" stroke-width="2"/>');

    // 外枠（下辺・右辺・上辺の右側）
    out.push('<path d="M' + f(this.px(r.tMin)) + ' ' + f(this.py(Psy.satHumRatio(r.tMin, P))) + 'L' + p.x0 + ' ' + p.y1 +
      'L' + p.x1 + ' ' + p.y1 + 'L' + p.x1 + ' ' + (tTop < r.tMax ? p.y0 + 'L' + f(this.px(tTop)) + ' ' + p.y0 : f(this.py(Psy.satHumRatio(r.tMax, P)))) +
      '" fill="none" stroke="' + COLORS.frame + '" stroke-width="1.4"/>');

    out.push('<g font-family="' + FONT + '" fill="' + COLORS.text + '">');

    // 乾球温度目盛
    for (t = Math.ceil(r.tMin); t <= r.tMax; t++) {
      var X = f(this.px(t));
      var len = t % 5 === 0 ? 6 : 3;
      out.push('<line x1="' + X + '" y1="' + p.y1 + '" x2="' + X + '" y2="' + (p.y1 + len) + '" stroke="' + COLORS.frame + '" stroke-width="0.8"/>');
      if (t % 5 === 0) out.push('<text x="' + X + '" y="' + (p.y1 + 19) + '" font-size="12" text-anchor="middle">' + t + '</text>');
    }
    out.push('<text x="' + f((p.x0 + p.x1) / 2) + '" y="' + (p.y1 + 42) + '" font-size="13" text-anchor="middle" font-weight="600">乾球温度 t [°C]</text>');

    // 絶対湿度目盛
    for (i = 1; i * xStep <= r.xMax * 1000 + 1e-9; i++) {
      var g = i * xStep;
      var Y = f(this.py(g / 1000));
      out.push('<line x1="' + p.x1 + '" y1="' + Y + '" x2="' + (p.x1 + 5) + '" y2="' + Y + '" stroke="' + COLORS.frame + '" stroke-width="0.8"/>');
      out.push('<text x="' + (p.x1 + 8) + '" y="' + (Y + 4) + '" font-size="11">' + g + '</text>');
    }
    out.push('<text transform="translate(' + (this.W - 18) + ' ' + f((p.y0 + p.y1) / 2) + ') rotate(90)" font-size="13" text-anchor="middle" font-weight="600">絶対湿度 x [g/kg(DA)]</text>');

    // 相対湿度ラベル
    if (L.rh) {
      for (rh = 10; rh < 100; rh += 10) {
        var tl = r.tMax - 1.2;
        var xl = Psy.humRatioFromRH(tl, rh / 100, P);
        if (xl > r.xMax * 0.93) {
          xl = r.xMax * 0.93;
          tl = Psy.bisect(function (tt) { return Psy.humRatioFromRH(tt, rh / 100, P) - xl; }, r.tMin, r.tMax, 1e-6);
        }
        if (tl < r.tMin + 1) continue;
        out.push(this.label(this.px(tl) + 3, this.py(xl) - 3, rh + '%', COLORS.rh, 11, 'start', true));
      }
    }

    // 飽和温度（湿球・露点）ラベル
    for (t = Math.ceil(r.tMin / 5) * 5; t <= tTop; t += 5) {
      x = Psy.satHumRatio(t, P);
      if (x > r.xMax * 0.96) continue;
      out.push(this.label(this.px(t) - 5, this.py(x) - 3, t, COLORS.sat, 11, 'end', true));
    }

    // 比エンタルピーラベル（飽和曲線の外側）
    if (L.h) {
      for (h = Math.ceil(Psy.enthalpy(r.tMin, 0) / 10) * 10; h <= hMax; h += 10) {
        var pos = this.satIntersect(function (xx) { return Psy.tFromHX(h, xx); });
        if (!pos) continue;
        var ax = this.px(Psy.tFromHX(h, 0)), ay = this.py(0);
        var bx = this.px(pos[0]), by = this.py(pos[1]);
        var dl = Math.hypot(bx - ax, by - ay) || 1;
        var ux = (bx - ax) / dl, uy = (by - ay) / dl;
        out.push('<line x1="' + f(bx) + '" y1="' + f(by) + '" x2="' + f(bx + ux * 12) + '" y2="' + f(by + uy * 12) +
          '" stroke="' + COLORS.h + '" stroke-width="0.8"/>');
        out.push(this.label(bx + ux * 22, by + uy * 22 + 3, h, COLORS.h, 10.5, 'end', true));
      }
      var hl = this.satIntersect(function (xx) { return Psy.tFromHX(Psy.enthalpy(r.tMin + (tTop - r.tMin) * 0.45, 0), xx); });
      if (hl) {
        out.push('<text x="' + f(Math.max(this.px(hl[0]) - 40, p.x0 + 175)) + '" y="' + f(this.py(hl[1]) - 26) + '" font-size="12" fill="' + COLORS.h +
          '" text-anchor="end" font-weight="600">比エンタルピー h [kJ/kg(DA)]</text>');
      }
    }

    // 比容積ラベル（下辺付近）
    if (L.v) {
      for (v = vMin; v <= vMax + 1e-9; v += 0.01) {
        var tv = Psy.tFromVX(v, r.xMax * 0.012, P);
        if (tv < r.tMin + 0.5 || tv > r.tMax - 0.5) continue;
        out.push(this.label(this.px(tv) + 2, this.py(r.xMax * 0.012) - 4, v.toFixed(2), COLORS.v, 9.5, 'start', true));
      }
    }

    // 圧力表記
    out.push('<text x="' + (p.x0 + 6) + '" y="' + (p.y0 - 9) + '" font-size="11" fill="' + COLORS.sub + '">大気圧 ' + this.P.toFixed(3) +
      ' kPa ／ 実線(青):相対湿度 ／ 緑:湿球温度 ／ 赤:比エンタルピー ／ 紫破線:比容積 [m³/kg(DA)]</text>');
    out.push('</g>');

    this.gBase.innerHTML = out.join('');
  };

  proto.xStep = function () {
    var g = this.range.xMax * 1000;
    if (g <= 35) return 1;
    if (g <= 70) return 2;
    return 5;
  };

  /** 白縁付きテキスト */
  proto.label = function (x, y, txt, color, size, anchor, halo) {
    var common = ' x="' + f(x) + '" y="' + f(y) + '" font-size="' + size + '" text-anchor="' + anchor + '"';
    var s = '';
    if (halo) s += '<text' + common + ' fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round">' + esc(txt) + '</text>';
    return s + '<text' + common + ' fill="' + color + '">' + esc(txt) + '</text>';
  };

  /** x を引数として t を返す線と飽和曲線（または上辺）の交点 */
  proto.satIntersect = function (tOfX) {
    var P = this.P, r = this.range;
    var g = function (x) { return Psy.satHumRatio(tOfX(x), P) - x; };
    if (g(0) <= 0) return null;
    if (g(r.xMax) > 0) return [tOfX(r.xMax), r.xMax];
    var x = Psy.bisect(g, 0, r.xMax, 1e-8);
    var t = tOfX(x);
    if (t < r.tMin || t > r.tMax) return null;
    return [t, x];
  };

  proto.renderData = function () {
    var self = this, d = this.data, P = this.P;
    var byId = {};
    d.points.forEach(function (p) { byId[p.id] = p; });
    var out = ['<g font-family="' + FONT + '" clip-path="url(#psy-clip-plot)">'];

    // 矢印マーカー（色ごと。context-stroke は書き出し先での互換性が低いため使わない）
    var markers = {};
    var markerId = function (color) {
      var id = 'psy-arrow-' + color.replace(/[^0-9a-z]/gi, '');
      markers[id] = color;
      return id;
    };

    // SHF 線
    d.shf.forEach(function (s) {
      var p = byId[s.point];
      if (!p) return;
      var adp = Psy.shfLine(p.t, p.x, s.shf, P);
      if (!adp) return;
      // 点の反対側にも少し延長
      var ext = 4;
      var t2 = p.t + ext, x2 = p.x + adp.slope * ext;
      out.push('<path d="' + self.path([[adp.t, adp.x], [t2, x2]]) + '" stroke="' + COLORS.shf +
        '" stroke-width="1.6" stroke-dasharray="7 4" fill="none"/>');
      out.push('<circle cx="' + f(self.px(adp.t)) + '" cy="' + f(self.py(adp.x)) + '" r="4" fill="#fff" stroke="' + COLORS.shf + '" stroke-width="2"/>');
      out.push(self.label(self.px(adp.t) - 8, self.py(adp.x) + 16, 'ADP ' + adp.t.toFixed(1) + '°C (SHF ' + s.shf + ')', COLORS.shf, 11.5, 'start', true));
    });

    // 状態変化線
    d.processes.forEach(function (pr) {
      var a = byId[pr.from], b = byId[pr.to];
      if (!a || !b) return;
      var color = pr.kind === 'mix' ? '#55606e' : (b.color || '#333');
      out.push('<path d="' + self.path([[a.t, a.x], [b.t, b.x]]) + '" stroke="' + color + '" stroke-width="2.2" fill="none"' +
        (pr.kind === 'mix' ? ' stroke-dasharray="6 4"' : ' marker-end="url(#' + markerId(color) + ')"') + '/>');
    });

    // 状態点
    d.points.forEach(function (p) {
      var X = f(self.px(p.t)), Y = f(self.py(p.x));
      var sel = self.selected === p.id;
      out.push('<g class="psy-point" data-id="' + esc(p.id) + '" style="cursor:move">');
      out.push('<circle cx="' + X + '" cy="' + Y + '" r="14" fill="transparent"/>');
      out.push('<circle cx="' + X + '" cy="' + Y + '" r="' + (sel ? 7 : 5.5) + '" fill="' + p.color + '" stroke="#fff" stroke-width="2"/>');
      out.push(self.label(self.px(p.t) + 9, self.py(p.x) - 8, p.name, p.color, 14, 'start', true).replace(/<text/g, '<text font-weight="700"'));
      out.push('</g>');
    });
    out.push('</g>');
    var defs = Object.keys(markers).map(function (id) {
      return '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
        '<path d="M0 0L10 5L0 10z" fill="' + markers[id] + '"/></marker>';
    }).join('');
    this.gData.innerHTML = '<defs>' + defs + '</defs>' + out.join('');
  };

  proto.setCursor = function (c) {
    this.cursor = c;
    this.renderCursor();
  };

  proto.renderCursor = function () {
    var c = this.cursor;
    if (!c || !this.isValid(c.t, c.x)) { this.gCursor.innerHTML = ''; return; }
    var p = this.plot(), P = this.P;
    var X = f(this.px(c.t)), Y = f(this.py(c.x));
    var st = Psy.stateTX(c.t, c.x, P);
    var col = '#ff5a1f';
    var s = '';
    s += '<line x1="' + X + '" y1="' + p.y1 + '" x2="' + X + '" y2="' + Y + '" stroke="' + col + '" stroke-width="0.8" stroke-dasharray="3 3"/>';
    s += '<line x1="' + X + '" y1="' + Y + '" x2="' + p.x1 + '" y2="' + Y + '" stroke="' + col + '" stroke-width="0.8" stroke-dasharray="3 3"/>';
    // RH 曲線
    var d = [];
    for (var t = this.range.tMin; t <= this.range.tMax; t += 0.5) {
      var x = Psy.humRatioFromRH(t, st.rh, P);
      d.push([t, x]);
      if (x > this.range.xMax) break;
    }
    s += '<path d="' + this.path(d) + '" fill="none" stroke="' + col + '" stroke-width="0.8" stroke-dasharray="3 3" clip-path="url(#psy-clip)"/>';
    s += '<circle cx="' + X + '" cy="' + Y + '" r="3.5" fill="' + col + '"/>';
    this.gCursor.innerHTML = s;
  };

  /** 書き出し用 SVG 文字列 */
  proto.toSVGString = function () {
    var clone = this.svg.cloneNode(true);
    clone.querySelector('#psy-cursor').innerHTML = '';
    clone.setAttribute('width', this.W);
    clone.setAttribute('height', this.H);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  };

  root.PsyChart = PsyChart;
})(this);
