/*
 * app.js — 空気線図アプリの UI
 * 依存: psychro.js (Psy), chart.js (PsyChart)
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'psychro-chart-v1';
  var $ = function (id) { return document.getElementById(id); };

  var MODES = {
    'db-rh': ['乾球温度 [°C]', '相対湿度 [%]'],
    'db-wb': ['乾球温度 [°C]', '湿球温度 [°C]'],
    'db-x': ['乾球温度 [°C]', '絶対湿度 [g/kg(DA)]'],
    'db-dp': ['乾球温度 [°C]', '露点温度 [°C]'],
    'db-h': ['乾球温度 [°C]', '比エンタルピー [kJ/kg(DA)]'],
    'wb-rh': ['湿球温度 [°C]', '相対湿度 [%]'],
    'h-rh': ['比エンタルピー [kJ/kg(DA)]', '相対湿度 [%]'],
    'h-x': ['比エンタルピー [kJ/kg(DA)]', '絶対湿度 [g/kg(DA)]']
  };

  function defaults() {
    return {
      altitude: 0,
      P: Psy.STD_P,
      range: { tMin: -10, tMax: 50, xMax: 0.030 },
      layers: { db: true, x: true, rh: true, wb: true, h: true, v: true },
      points: [],
      processes: [],
      shf: [],
      seq: 0
    };
  }

  var state = load();
  var selected = null;
  var chart = new PsyChart($('chart'));

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (s && s.points) return Object.assign(defaults(), s);
    } catch (e) { /* 使えない環境では既定値 */ }
    return defaults();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* 無視 */ }
  }

  function nextId() { state.seq += 1; return 'p' + state.seq; }

  function autoName() {
    var used = {};
    state.points.forEach(function (p) { used[p.name] = true; });
    for (var i = 0; i < 26 * 4; i++) {
      var n = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
      if (!used[n]) return n;
    }
    return 'P' + state.seq;
  }

  function nextColor() {
    var c = PsyChart.POINT_COLORS;
    return c[state.points.length % c.length];
  }

  function uniqueName(name) {
    if (!name) return autoName();
    var used = {};
    state.points.forEach(function (p) { used[p.name] = true; });
    if (!used[name]) return name;
    for (var i = 2; ; i++) if (!used[name + i]) return name + i;
  }

  function addPoint(name, t, x) {
    var p = { id: nextId(), name: uniqueName(name), t: t, x: x, color: nextColor() };
    state.points.push(p);
    return p;
  }

  function findPoint(id) {
    for (var i = 0; i < state.points.length; i++) if (state.points[i].id === id) return state.points[i];
    return null;
  }

  // ---- 表示 -----------------------------------------------------------

  function n(v, d) { return isFinite(v) ? v.toFixed(d) : '—'; }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function refresh() {
    chart.setPressure(state.P);
    chart.setRange(state.range);
    chart.setLayers(state.layers);
    chart.setData({ points: state.points, processes: state.processes, shf: state.shf });
    chart.selected = selected;
    chart.render();
    renderTables();
    renderSelects();
    renderShfList();
    $('pt-update').disabled = !selected;
    save();
  }

  function refreshData() {
    chart.setData({ points: state.points, processes: state.processes, shf: state.shf });
    chart.selected = selected;
    chart.renderData();
    renderTables();
  }

  function renderTables() {
    var P = state.P;
    var rows = state.points.map(function (p) {
      var s = Psy.stateTX(p.t, p.x, P);
      return '<tr data-id="' + p.id + '"' + (p.id === selected ? ' class="selected"' : '') + '>' +
        '<td><span class="dot" style="background:' + p.color + '"></span>' + esc(p.name) + '</td>' +
        '<td>' + n(s.t, 1) + '</td><td>' + n(s.tw, 1) + '</td><td>' + n(s.rh * 100, 1) + '</td>' +
        '<td>' + n(s.x * 1000, 2) + '</td><td>' + n(s.td, 1) + '</td><td>' + n(s.h, 1) + '</td>' +
        '<td>' + n(s.v, 4) + '</td><td>' + n(s.pw, 3) + '</td>' +
        '<td><button type="button" class="icon" data-del-point="' + p.id + '" title="削除" aria-label="削除">×</button></td></tr>';
    });
    $('tbl-points').tBodies[0].innerHTML = rows.join('') ||
      '<tr><td class="empty" colspan="10">状態点はまだありません。左のフォームから追加するか、「サンプル」を読み込んでください。</td></tr>';

    var prow = state.processes.map(function (pr, i) {
      var a = findPoint(pr.from), b = findPoint(pr.to);
      if (!a || !b) return '';
      var label = esc(a.name) + (pr.kind === 'mix' ? ' ⇄ ' : ' → ') + esc(b.name);
      if (pr.kind === 'mix') {
        return '<tr><td>' + label + '（混合線）</td><td colspan="9" style="text-align:left;color:var(--muted)">' +
          '混合比 ' + n(pr.ratio * 100, 0) + ' : ' + n((1 - pr.ratio) * 100, 0) + '（質量流量比）</td>' +
          '<td><button type="button" class="icon" data-del-proc="' + i + '" title="削除" aria-label="削除">×</button></td></tr>';
      }
      var r = Psy.processLoad(a, b, pr.flow, P);
      return '<tr><td>' + label + '</td><td>' + n(r.dt, 1) + '</td><td>' + n(r.dx * 1000, 2) + '</td>' +
        '<td>' + n(r.dh, 2) + '</td><td>' + n(r.shf, 2) + '</td><td>' + (pr.flow ? pr.flow.toLocaleString() : '—') + '</td>' +
        '<td>' + n(r.q, 2) + '</td><td>' + n(r.qs, 2) + '</td><td>' + n(r.ql, 2) + '</td><td>' + n(r.water, 2) + '</td>' +
        '<td><button type="button" class="icon" data-del-proc="' + i + '" title="削除" aria-label="削除">×</button></td></tr>';
    });
    $('tbl-procs').tBodies[0].innerHTML = prow.join('') ||
      '<tr><td class="empty" colspan="11">状態変化はまだありません。</td></tr>';
  }

  function renderSelects() {
    var opts = state.points.map(function (p) {
      return '<option value="' + p.id + '">' + esc(p.name) + '</option>';
    }).join('');
    ['pr-from', 'pr-to', 'mx-a', 'mx-b', 'shf-pt'].forEach(function (id, i) {
      var el = $(id), prev = el.value;
      el.innerHTML = opts;
      if (findPoint(prev)) el.value = prev;
      else if (state.points.length) {
        // 既定値: 終点・空気2 は 2 番目の点
        var idx = (id === 'pr-to' || id === 'mx-b') ? Math.min(1, state.points.length - 1) : 0;
        el.value = state.points[idx].id;
      }
    });
  }

  function renderShfList() {
    $('shf-list').innerHTML = state.shf.map(function (s, i) {
      var p = findPoint(s.point);
      return '<li>' + esc(p ? p.name : '?') + ' / SHF ' + s.shf +
        '<button type="button" class="icon" data-del-shf="' + i + '" aria-label="削除">×</button></li>';
    }).join('');
  }

  function showReadout(t, x) {
    var el = $('readout');
    if (t === null || !chart.isValid(t, x)) { el.hidden = true; return; }
    var s = Psy.stateTX(t, x, state.P);
    el.innerHTML = '<table>' +
      '<tr><th>乾球温度</th><td>' + n(s.t, 1) + ' °C</td></tr>' +
      '<tr><th>湿球温度</th><td>' + n(s.tw, 1) + ' °C</td></tr>' +
      '<tr><th>相対湿度</th><td>' + n(s.rh * 100, 1) + ' %</td></tr>' +
      '<tr><th>絶対湿度</th><td>' + n(s.x * 1000, 2) + ' g/kg(DA)</td></tr>' +
      '<tr><th>露点温度</th><td>' + n(s.td, 1) + ' °C</td></tr>' +
      '<tr><th>比エンタルピー</th><td>' + n(s.h, 1) + ' kJ/kg(DA)</td></tr>' +
      '<tr><th>比容積</th><td>' + n(s.v, 4) + ' m³/kg(DA)</td></tr>' +
      '</table>';
    el.hidden = false;
  }

  // ---- 線図の操作 -------------------------------------------------------

  var svg = $('chart');
  var drag = null;

  function clampToChart(t, x) {
    var r = state.range;
    t = Math.min(r.tMax, Math.max(r.tMin, t));
    x = Math.max(0, Math.min(x, r.xMax, Psy.satHumRatio(t, state.P)));
    return { t: t, x: x };
  }

  svg.addEventListener('pointerdown', function (e) {
    var g = e.target.closest && e.target.closest('.psy-point');
    if (!g) return;
    var p = findPoint(g.getAttribute('data-id'));
    if (!p) return;
    e.preventDefault();
    svg.setPointerCapture(e.pointerId);
    drag = { id: p.id, moved: false };
    selectPoint(p.id);
  });

  svg.addEventListener('pointermove', function (e) {
    var sp = chart.eventPoint(e);
    var d = chart.toData(sp.x, sp.y);
    if (drag) {
      var p = findPoint(drag.id);
      var c = clampToChart(d.t, d.x);
      p.t = Math.round(c.t * 10) / 10;
      p.x = c.x;
      drag.moved = true;
      refreshData();
      chart.setCursor(null);
      showReadout(p.t, p.x);
      return;
    }
    if (chart.inPlot(sp.x, sp.y)) {
      chart.setCursor(d);
      showReadout(d.t, d.x);
    } else {
      chart.setCursor(null);
      showReadout(null);
    }
  });

  svg.addEventListener('pointerup', function (e) {
    if (drag) {
      drag = null;
      refresh();
      return;
    }
    if (!$('click-add').checked) return;
    var sp = chart.eventPoint(e);
    var d = chart.toData(sp.x, sp.y);
    if (!chart.isValid(d.t, d.x)) return;
    var p = addPoint('', Math.round(d.t * 10) / 10, Math.round(d.x * 1e5) / 1e5);
    selected = p.id;
    refresh();
  });

  svg.addEventListener('pointerleave', function () {
    if (drag) return;
    chart.setCursor(null);
    showReadout(null);
  });

  $('click-add').addEventListener('change', function () {
    svg.classList.toggle('adding', this.checked);
  });

  function selectPoint(id) {
    selected = selected === id && !drag ? null : id;
    var p = findPoint(selected);
    if (p) {
      // フォームに乾球温度 + 相対湿度で反映
      $('pt-name').value = p.name;
      $('pt-mode').value = 'db-rh';
      updateModeLabels();
      $('pt-a').value = p.t.toFixed(1);
      $('pt-b').value = (Psy.relHumidity(p.t, p.x, state.P) * 100).toFixed(1);
    }
    chart.selected = selected;
    chart.renderData();
    renderTables();
    $('pt-update').disabled = !selected;
  }

  // ---- フォーム -------------------------------------------------------

  function updateModeLabels() {
    var m = MODES[$('pt-mode').value];
    $('pt-a-label').textContent = m[0];
    $('pt-b-label').textContent = m[1];
  }
  $('pt-mode').addEventListener('change', updateModeLabels);

  function readPointForm() {
    $('pt-error').textContent = '';
    var a = parseFloat($('pt-a').value), b = parseFloat($('pt-b').value);
    if (!isFinite(a) || !isFinite(b)) throw new Error('数値を入力してください');
    return Psy.solve($('pt-mode').value, a, b, state.P);
  }

  $('form-point').addEventListener('submit', function (e) {
    e.preventDefault();
    try {
      var r = readPointForm();
      var p = addPoint($('pt-name').value.trim(), r.t, r.x);
      selected = p.id;
      $('pt-name').value = '';
      refresh();
    } catch (err) {
      $('pt-error').textContent = err.message;
    }
  });

  $('pt-update').addEventListener('click', function () {
    var p = findPoint(selected);
    if (!p) return;
    try {
      var r = readPointForm();
      p.t = r.t;
      p.x = r.x;
      var name = $('pt-name').value.trim();
      if (name) p.name = name;
      refresh();
    } catch (err) {
      $('pt-error').textContent = err.message;
    }
  });

  $('form-proc').addEventListener('submit', function (e) {
    e.preventDefault();
    var from = $('pr-from').value, to = $('pr-to').value;
    if (!from || !to || from === to) { alert('異なる 2 点を選択してください'); return; }
    state.processes.push({ from: from, to: to, flow: parseFloat($('pr-flow').value) || 0, kind: 'process' });
    refresh();
  });

  $('form-mix').addEventListener('submit', function (e) {
    e.preventDefault();
    var a = findPoint($('mx-a').value), b = findPoint($('mx-b').value);
    var qa = parseFloat($('mx-qa').value), qb = parseFloat($('mx-qb').value);
    if (!a || !b || a === b) { alert('異なる 2 点を選択してください'); return; }
    if (!(qa >= 0 && qb >= 0 && qa + qb > 0)) { alert('風量を正しく入力してください'); return; }
    // 風量 → 乾き空気質量流量
    var ma = qa / Psy.volume(a.t, a.x, state.P);
    var mb = qb / Psy.volume(b.t, b.x, state.P);
    var m = Psy.mix(a, ma, b, mb);
    var p = addPoint($('mx-name').value.trim() || 'MA', m.t, m.x);
    state.processes.push({ from: a.id, to: b.id, kind: 'mix', ratio: ma / (ma + mb) });
    selected = p.id;
    refresh();
  });

  $('form-shf').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('shf-pt').value, v = parseFloat($('shf-val').value);
    if (!findPoint(id)) return;
    if (!(v > 0.2 && v <= 1)) { alert('SHF は 0.2〜1.0 の範囲で入力してください'); return; }
    state.shf.push({ point: id, shf: v });
    refresh();
  });

  // 削除ボタン・行選択
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t.dataset.delPoint) {
      var id = t.dataset.delPoint;
      state.points = state.points.filter(function (p) { return p.id !== id; });
      state.processes = state.processes.filter(function (p) { return p.from !== id && p.to !== id; });
      state.shf = state.shf.filter(function (s) { return s.point !== id; });
      if (selected === id) selected = null;
      refresh();
      return;
    }
    if (t.dataset.delProc) { state.processes.splice(+t.dataset.delProc, 1); refresh(); return; }
    if (t.dataset.delShf) { state.shf.splice(+t.dataset.delShf, 1); refresh(); return; }
    var tr = t.closest && t.closest('#tbl-points tbody tr[data-id]');
    if (tr) selectPoint(tr.getAttribute('data-id'));
  });

  // ---- 設定 -----------------------------------------------------------

  function syncSettingsForm() {
    $('set-alt').value = Math.round(state.altitude);
    $('set-p').value = state.P.toFixed(3);
    $('set-tmin').value = state.range.tMin;
    $('set-tmax').value = state.range.tMax;
    $('set-xmax').value = Math.round(state.range.xMax * 1000);
    document.querySelectorAll('[data-layer]').forEach(function (el) {
      el.checked = !!state.layers[el.dataset.layer];
    });
  }

  $('set-alt').addEventListener('change', function () {
    var z = parseFloat(this.value);
    if (!isFinite(z) || z < -500 || z > 8000) { syncSettingsForm(); return; }
    state.altitude = z;
    state.P = Psy.pressureFromAltitude(z);
    syncSettingsForm();
    refresh();
  });

  $('set-p').addEventListener('change', function () {
    var P = parseFloat(this.value);
    if (!isFinite(P) || P < 30 || P > 120) { syncSettingsForm(); return; }
    state.P = P;
    state.altitude = Psy.altitudeFromPressure(P);
    syncSettingsForm();
    refresh();
  });

  ['set-tmin', 'set-tmax', 'set-xmax'].forEach(function (id) {
    $(id).addEventListener('change', function () {
      var tMin = parseFloat($('set-tmin').value), tMax = parseFloat($('set-tmax').value);
      var xMax = parseFloat($('set-xmax').value) / 1000;
      if (isFinite(tMin) && isFinite(tMax) && tMax - tMin >= 10 && tMin >= -40 && tMax <= 100 &&
          isFinite(xMax) && xMax >= 0.005 && xMax <= 0.2) {
        state.range = { tMin: tMin, tMax: tMax, xMax: xMax };
        refresh();
      }
      syncSettingsForm();
    });
  });

  document.querySelectorAll('[data-layer]').forEach(function (el) {
    el.addEventListener('change', function () {
      state.layers[el.dataset.layer] = el.checked;
      refresh();
    });
  });

  $('set-reset').addEventListener('click', function () {
    var d = defaults();
    state.altitude = d.altitude;
    state.P = d.P;
    state.range = d.range;
    state.layers = d.layers;
    syncSettingsForm();
    refresh();
  });

  // ---- ツールバー -----------------------------------------------------

  $('btn-sample').addEventListener('click', function () {
    if (state.points.length && !confirm('現在の状態点を消去してサンプルを読み込みますか？')) return;
    var keep = { altitude: state.altitude, P: state.P, range: state.range, layers: state.layers };
    state = Object.assign(defaults(), keep);
    var P = state.P;
    var s;
    s = Psy.solve('db-rh', 34, 60, P); var oa = addPoint('OA', s.t, s.x);
    s = Psy.solve('db-rh', 26, 50, P); var ra = addPoint('RA', s.t, s.x);
    var qo = 3000, qr = 7000;
    var mo = qo / Psy.volume(oa.t, oa.x, P), mr = qr / Psy.volume(ra.t, ra.x, P);
    s = Psy.mix(oa, mo, ra, mr); var ma = addPoint('MA', s.t, s.x);
    s = Psy.solve('db-rh', 15, 93, P); var sa = addPoint('SA', s.t, s.x);
    state.processes.push({ from: oa.id, to: ra.id, kind: 'mix', ratio: mo / (mo + mr) });
    state.processes.push({ from: ma.id, to: sa.id, flow: qo + qr, kind: 'process' });
    state.processes.push({ from: sa.id, to: ra.id, flow: qo + qr, kind: 'process' });
    state.shf.push({ point: ra.id, shf: 0.8 });
    selected = null;
    refresh();
  });

  $('btn-clear').addEventListener('click', function () {
    if (!confirm('状態点・変化線・SHF 線をすべて消去しますか？')) return;
    state.points = [];
    state.processes = [];
    state.shf = [];
    selected = null;
    refresh();
  });

  function download(name, blob) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  function stamp() {
    var d = new Date();
    var z = function (v) { return ('0' + v).slice(-2); };
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '-' + z(d.getHours()) + z(d.getMinutes());
  }

  $('btn-svg').addEventListener('click', function () {
    download('空気線図-' + stamp() + '.svg', new Blob([chart.toSVGString()], { type: 'image/svg+xml' }));
  });

  $('btn-png').addEventListener('click', function () {
    var scale = 2;
    var img = new Image();
    var url = URL.createObjectURL(new Blob([chart.toSVGString()], { type: 'image/svg+xml' }));
    img.onload = function () {
      var c = document.createElement('canvas');
      c.width = chart.W * scale;
      c.height = chart.H * scale;
      var ctx = c.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function (b) { download('空気線図-' + stamp() + '.png', b); }, 'image/png');
    };
    img.onerror = function () { URL.revokeObjectURL(url); alert('PNG の生成に失敗しました'); };
    img.src = url;
  });

  $('btn-csv').addEventListener('click', function () {
    var P = state.P;
    var lines = ['# 大気圧 [kPa],' + P.toFixed(3),
      '名称,乾球温度[°C],湿球温度[°C],相対湿度[%],絶対湿度[g/kg(DA)],露点温度[°C],比エンタルピー[kJ/kg(DA)],比容積[m3/kg(DA)],水蒸気分圧[kPa]'];
    var q = function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; };
    state.points.forEach(function (p) {
      var s = Psy.stateTX(p.t, p.x, P);
      lines.push([q(p.name), s.t.toFixed(2), s.tw.toFixed(2), (s.rh * 100).toFixed(2), (s.x * 1000).toFixed(3),
        s.td.toFixed(2), s.h.toFixed(2), s.v.toFixed(4), s.pw.toFixed(4)].join(','));
    });
    lines.push('');
    lines.push('変化,Δt[K],Δx[g/kg(DA)],Δh[kJ/kg(DA)],SHF,風量[m3/h],全熱[kW],顕熱[kW],潜熱[kW],水分量[kg/h]');
    state.processes.forEach(function (pr) {
      var a = findPoint(pr.from), b = findPoint(pr.to);
      if (!a || !b || pr.kind === 'mix') return;
      var r = Psy.processLoad(a, b, pr.flow, P);
      var o = function (v, d) { return isFinite(v) ? v.toFixed(d) : ''; };
      lines.push([q(a.name + '→' + b.name), o(r.dt, 2), o(r.dx * 1000, 3), o(r.dh, 2), o(r.shf, 3), pr.flow || '',
        o(r.q, 3), o(r.qs, 3), o(r.ql, 3), o(r.water, 3)].join(','));
    });
    // Excel で文字化けしないよう BOM を付ける
    download('空気線図-' + stamp() + '.csv', new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' }));
  });

  $('btn-print').addEventListener('click', function () { window.print(); });

  // ---- 起動 -----------------------------------------------------------

  syncSettingsForm();
  updateModeLabels();
  refresh();
})();
