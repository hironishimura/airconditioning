/* 画面の組み立てと入出力。計算は calc.js（LoadCalc）、初期値は presets.js（LoadPresets） */
(function () {
  'use strict';
  var C = window.LoadCalc;
  var P = window.LoadPresets;
  var STORE_KEY = 'airconditioning-load-v1';

  /* ---------------- 入力項目の定義 ---------------- */
  // 単純な入力欄
  var F = {
    tIn: { label: '室温', unit: '℃', step: 0.5, hint: '目標とする室内温度' },
    rhIn: { label: '室内の相対湿度', unit: '%', step: 1, hint: '目標とする室内湿度' },
    tOut: { label: '想定外気温', unit: '℃', step: 0.5, hint: '設計に使う外気温' },
    rhOut: { label: '外気の相対湿度', unit: '%', step: 1 },
    tNext: { label: '隣室温度', unit: '℃', step: 0.5, hint: '暖冷気流入・間仕切りの計算に使う（家全体なら室温と同じでよい）' },
    tCollect: { label: '空気集熱温度（任意）', unit: '℃', step: 1, optional: true,
      hint: '空欄なら外気温で計算。OMソーラー等を使う場合は 45～60℃ を入力し、\n換気量を 300～500㎥/h、熱交換効率を 0% にする' },
    vent: { label: '換気量', unit: '㎥/h', step: 1, hint: '24時間換気の風量。0.5回/h × 気積 が目安' },
    effS: { label: '熱交換率（顕熱）', unit: '%', step: 1, hint: '第1種熱交換換気の温度交換効率。熱交換なしは 0' },
    effL: { label: '熱交換率（潜熱）', unit: '%', step: 1, hint: '湿度（エンタルピー）交換効率。顕熱のみ交換するタイプは 0' },
    people: { label: '在室人数', unit: '人', step: 1 },
    peopleS: { label: '1人あたり顕熱', unit: 'W/人', step: 5, hint: '40～200W/人（安静時 60W 程度）' },
    peopleL: { label: '1人あたり潜熱', unit: 'W/人', step: 5, hint: '30～300W/人（安静時 30～50W 程度）' },
    inflowQ: { label: '隣室からの空気流入量', unit: '㎥/h', step: 1, hint: '隣室の暖気・冷気が流れ込む風量' },
    partitionA: { label: '間仕切りの面積', unit: '㎡', step: 0.1, hint: '隣室と接する壁・建具の面積（熱貫流率 2.5W/㎡K として計算）' },
    envArea: { label: '外皮面積', unit: '㎡', step: 0.1, hint: '屋根・外壁・床・窓の合計面積' },
    ua: { label: 'UA値（外皮平均熱貫流率）', unit: 'W/㎡K', step: 0.01, hint: '省エネ計算書の値。窓を含む' },
    evapWind: { label: '水面の風速', unit: 'm/s', step: 0.1, hint: '浴槽の水面を流れる風の速さ' },
    evapArea: { label: '水面積', unit: '㎡', step: 0.1, hint: '浴槽のふたを開けた面積など' },
    // エアコン
    tSupply: { label: '吹出し温度', unit: '℃', step: 0.5, hint: '冷房は吸込み −10～15℃、暖房は吸込み +20℃ 程度' },
    ductL: { label: '吹出口 長辺', unit: 'm', step: 0.01, hint: '円形の吹出口なら 0 にして直径を入力' },
    ductS: { label: '吹出口 短辺', unit: 'm', step: 0.01, hint: '気流の降下量の計算にも使う' },
    ductD: { label: '吹出口 直径 Φ', unit: 'mm', step: 1, hint: '長辺が 0 のときだけ使用' },
    vel: { label: '吹出し風速', unit: 'm/s', step: 0.1 },
    hours: { label: '運転時間', unit: 'h', step: 1, hint: '総熱量・総水量の計算に使う' },
    vTerm: { label: '到達とみなす風速', unit: 'm/s', step: 0.1, hint: '気流がこの速さまで落ちた距離を「到達距離」とする（0.5m/s が目安）' },
    // 空気の比較
    a1T: { label: '空気① 温度', unit: '℃', step: 0.5, hint: '例：室内の空気' },
    a1RH: { label: '空気① 相対湿度', unit: '%', step: 1 },
    a2T: { label: '空気② 温度', unit: '℃', step: 0.5, hint: '例：床ガラリから出る空気' },
    a2RH: { label: '空気② 相対湿度', unit: '%', step: 1 },
    ductL2: { label: 'ガラリ 長辺', unit: 'm', step: 0.01, hint: '円形なら 0 にして直径を入力' },
    ductS2: { label: 'ガラリ 短辺', unit: 'm', step: 0.005 },
    ductD2: { label: '直径 Φ', unit: 'mm', step: 1, hint: '長辺が 0 のときだけ使用' },
    vel2: { label: '風速', unit: 'm/s', step: 0.1 },
    hours2: { label: '時間', unit: 'h', step: 1 },
    // 配管
    pipeOD: { label: 'パイプ外径', unit: 'mm', step: 0.5 },
    pipeID: { label: 'パイプ内径', unit: 'mm', step: 0.5 },
    hIn: { label: '管内の総合熱伝達率', unit: 'W/㎡K', step: 100, hint: '管内を流れる温水側。流速があれば 4000 程度' },
    hOut: { label: '管表面の総合熱伝達率', unit: 'W/㎡K', step: 0.1, hint: '空気側（対流＋放射）。自然対流で 9.3 程度' },
    lambda: { label: 'パイプの熱伝導率', unit: 'W/mK', step: 0.01, hint: '架橋ポリエチレン管で 0.38～0.41 程度' },
    pipeLen: { label: 'パイプの長さ', unit: 'm', step: 1 },
    tWater: { label: '水温', unit: '℃', step: 1 },
    tAir: { label: 'パイプ周りの気温', unit: '℃', step: 1, hint: '床下空間の温度' },
    // 床・基礎
    floorA: { label: '床面積', unit: '㎡', step: 1 },
    floorU: { label: '床のU値', unit: 'W/㎡K', step: 0.1, hint: '床下から室内へ熱が抜ける床の熱貫流率' },
    tUnder: { label: '床下温度', unit: '℃', step: 0.5 },
    psi: { label: '基礎の線熱貫流率 ψ', unit: 'W/mK', step: 0.01 },
    foundLen: { label: '基礎の外周長さ', unit: 'm', step: 0.5 }
  };

  // 内部発熱（顕熱）：W/台 × 台数
  var SENS_ROWS = [
    { k: 'tv', label: 'TV・プロジェクター', range: '100～800W' },
    { k: 'pc', label: 'PC', range: '30～600W', hint: 'デスクトップ型は電源ユニットを確認。1000W級もある' },
    { k: 'cook', label: '料理', range: '500～1200W', hint: 'ガスコンロ・IHだけで 400～800W 程度。\nレンジ・トースター・ホットプレートも忘れずに' },
    { k: 'pcon', label: 'パワコン', range: '100～600W', hint: '容量 ×（1 − 変換効率）。日照時のみなので注意' },
    { k: 'fridge', label: '冷蔵庫', range: '30～100W', hint: 'カタログ値の倍程度' },
    { k: 'dish', label: '食洗機', range: '150～250W', hint: '顕熱 200W・潜熱 50W 程度' },
    { k: 'washer', label: '洗濯乾燥機', range: '50～500W', hint: 'ヒートポンプ式：顕熱 500W・潜熱 200W\nガス乾燥機（乾太くん）：顕熱 500W' },
    { k: 'light', label: '照明器具', range: '10～50W', hint: 'LED 5～10W/個、蛍光灯 20～30W/個、白熱灯 30～100W/個' },
    { k: 'reheat', label: '再熱機器', range: '100～4000W', hint: '除湿のための再熱ヒーター、補助暖房など' }
  ];
  // 内部発熱（潜熱）
  var LAT_ROWS = [
    { k: 'dishL', label: '食洗機', range: '25～75W', unit: '台' },
    { k: 'dryL', label: '室内干し', range: '50～500W', unit: '回', hint: '気化熱 678.3Wh/kg、10時間で乾くとして洗濯物1kgあたり 31.4W。\n8kg の洗濯機なら 251W。顕熱側には同じ量のマイナスが自動で入る' },
    { k: 'bathL', label: '浴室', range: '30～600W', unit: '回', hint: 'ドア開放 50W、風呂ふた開放 100W、サーキュレーター 200W～', bath: true },
    { k: 'tankL', label: '水槽', range: '20～100W', unit: '台', hint: '冷水 66W/㎡、温水 100W/㎡（水面の面積あたり）' },
    { k: 'envL', label: '外皮（湿気貫流）', range: '', unit: '日', hint: '1日の湿気流入量（L）× 26.1' }
  ];

  /* ---------------- 状態 ---------------- */
  var state = loadState() || P.build('basic');

  function loadState() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      var base = P.build('basic');
      Object.keys(obj).forEach(function (k) { if (k in base) base[k] = obj[k]; });
      return base;
    } catch (e) { return null; }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 保存できない環境では何もしない */ }
  }

  /* ---------------- 表示用ユーティリティ ---------------- */
  function el(tag, attrs, children) {
    var e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'html') e.innerHTML = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function fmt(v, d) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    if (d === undefined) d = 0;
    var s = v.toLocaleString('ja-JP', { minimumFractionDigits: d, maximumFractionDigits: d });
    return s === '-0' ? '0' : s;
  }
  function signClass(v) {
    if (!isFinite(v) || Math.abs(v) < 0.5) return 'zero';
    return v > 0 ? 'hot' : 'cold';
  }

  function numberInput(key, extra) {
    var f = F[key] || {};
    var inp = el('input', { type: 'number', id: 'in-' + key, 'data-key': key, inputmode: 'decimal', step: (extra && extra.step) || f.step || 'any' });
    if (f.optional) inp.placeholder = '空欄＝外気温';
    if (extra && extra.aria) inp.setAttribute('aria-label', extra.aria);
    return inp;
  }
  function field(key, opts) {
    var f = F[key];
    opts = opts || {};
    var wrap = el('div', { class: 'field' + (opts.full ? ' full' : '') });
    wrap.appendChild(el('label', { for: 'in-' + key, text: f.label }));
    var row = el('div', { class: 'inrow' }, [numberInput(key), el('span', { class: 'unit', text: f.unit })]);
    if (opts.out) {
      var o = el('span', { class: 'inline-out', 'data-out': opts.out[0], 'data-unit': opts.out[1] || '', 'data-d': opts.out[2] || 0, 'data-prefix': opts.out[3] || '' });
      row.appendChild(o);
    }
    wrap.appendChild(row);
    if (f.hint) wrap.appendChild(el('span', { class: 'hint', text: f.hint }));
    return wrap;
  }
  function fields(keys) {
    return el('div', { class: 'fields' }, keys.map(function (k) { return field(k); }));
  }
  function results(list) {
    // list: [ラベル, 出力パス, 単位, 強調するか, 小数桁]
    return el('div', { class: 'results' }, list.map(function (it) {
      var out = el('span', { class: 'out', 'data-out': it[1], 'data-unit': it[2] || '' });
      if (it[4] !== undefined) out.setAttribute('data-d', it[4]);
      return el('div', { class: 'r' + (it[3] ? ' big' : '') }, [el('span', { text: it[0] }), out]);
    }));
  }
  function card(title, tag, lead, body, cls, helpKey) {
    var h = el('h2', null, [title]);
    if (tag) h.appendChild(el('span', { class: 'tag', text: tag }));
    if (helpKey) h.appendChild(helpButton(helpKey));
    var c = el('section', { class: 'card' + (cls ? ' ' + cls : '') }, [h]);
    if (lead) c.appendChild(el('p', { class: 'lead', text: lead }));
    body.forEach(function (b) { if (b) c.appendChild(b); });
    return c;
  }

  // 機器の行（W/台 × 台数 = W）
  function equipRows(rows, kind) {
    var box = el('div', { class: 'rows' });
    box.appendChild(el('div', { class: 'row head' }, [
      el('span', { text: '項目（目安）' }), el('span', { text: kind === 'lat' ? 'W/台・回' : 'W/台' }),
      el('span', { text: '数量' }), el('span', { text: '負荷' })
    ]));
    rows.forEach(function (r) {
      var name = el('div', { class: 'name' }, [el('b', { text: r.label + (r.range ? '（' + r.range + '）' : '') })]);
      if (r.hint) name.appendChild(el('span', { class: 'hint', text: r.hint }));
      var wKey = r.k + 'W', nKey = r.k + 'N';
      var wIn = numberInput(wKey, { step: 1, aria: r.label + ' 1台あたりのワット数' });
      var nIn = numberInput(nKey, { step: 1, aria: r.label + ' の数量' });
      var row = el('div', { class: 'row' }, [
        name,
        el('div', { class: 'cellin' }, [wIn, el('span', { class: 'unit', text: 'W' })]),
        el('div', { class: 'cellin' }, [nIn, el('span', { class: 'unit', text: r.unit || '台' })]),
        el('span', { class: 'out', 'data-out': (kind === 'lat' ? 'lat.' : 'sens.') + r.k, 'data-unit': 'W' })
      ]);
      if (r.bath) {
        var cb = el('input', { type: 'checkbox', id: 'in-bathAuto', 'data-key': 'bathAuto' });
        var sub = el('div', { class: 'sub-fields' }, [
          el('label', { class: 'check', for: 'in-bathAuto' }, [cb, '水面からの蒸発量で自動計算する']),
          el('span', { class: 'hint', html: '自動計算値：<b class="out" data-out="evap.bathW" data-unit="W"></b>（蒸発量 <span class="out" data-out="evap.water" data-unit="kg/日" data-d="2"></span>）' }),
          field('evapWind'), field('evapArea')
        ]);
        sub.setAttribute('data-bath-sub', '');
        row.appendChild(sub);
      }
      box.appendChild(row);
    });
    return box;
  }


  /* ---------------- 枠ごとの説明ポップアップ ---------------- */
  var HELP = window.LoadHelp || {};
  function closeHelps(except) {
    document.querySelectorAll('.help-pop').forEach(function (p) {
      if (p !== except) { p.hidden = true; var b = p._btn; if (b) b.setAttribute('aria-expanded', 'false'); }
    });
  }
  function helpButton(key) {
    var h = HELP[key];
    var btn = el('button', { type: 'button', class: 'help-btn', 'aria-expanded': 'false', 'aria-label': (h ? h.title : '説明') + 'の説明を表示', title: '説明を表示' }, ['?']);
    var pop = null;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (!pop) {
        pop = el('div', { class: 'help-pop', role: 'dialog', 'aria-label': h ? h.title : '説明' });
        var close = el('button', { type: 'button', class: 'help-close', 'aria-label': '閉じる' }, ['×']);
        close.addEventListener('click', function () { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); btn.focus(); });
        pop.appendChild(el('div', { class: 'help-head' }, [el('b', { text: h ? h.title : '' }), close]));
        pop.appendChild(el('div', { class: 'help-body', html: h ? h.html : '' }));
        pop.addEventListener('click', function (ev) { ev.stopPropagation(); });
        pop._btn = btn;
        pop.hidden = true;
        btn.parentNode.parentNode.appendChild(pop);
      }
      var willOpen = pop.hidden;
      closeHelps(pop);
      pop.hidden = !willOpen;
      btn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    });
    return btn;
  }
  document.addEventListener('click', function () { closeHelps(null); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeHelps(null); });

  /* ---------------- 負荷計算タブ ---------------- */
  function buildLoadPanel(root) {
    var g = el('div', { class: 'grid2' });

    g.appendChild(card('室内と外気の条件', '基本', '設計したい室内の温湿度と、その時の外気を入れます。季節や時間帯ごとにファイルを分けて計算します。', [
      el('div', { class: 'fields' }, [field('tIn'), field('rhIn', { out: ['load.xIn', 'g/kg', 2, '絶対湿度'] }),
        field('tOut'), field('rhOut', { out: ['load.xOut', 'g/kg', 2, '絶対湿度'] }), field('tNext'), field('tCollect')]),
      results([['室温と外気の温度差', 'load.dtOut', 'K', false, 1]])
    ], null, 'cond'));

    g.appendChild(card('換気', '顕熱＋潜熱', '換気で入れ替わる空気が持ち込む熱と湿気です。熱交換換気なら効率を入れます。', [
      fields(['vent', 'effS', 'effL']),
      results([['顕熱エンタルピー差', 'load.dhS', 'kJ/kg', false, 2], ['潜熱エンタルピー差', 'load.dhL', 'kJ/kg', false, 2],
        ['換気の顕熱負荷', 'load.ventS', 'W', true], ['換気の潜熱負荷', 'load.ventL', 'W', true]])
    ], null, 'vent'));

    g.appendChild(card('内部発熱（顕熱）', '顕熱', '家電や調理で室内に出る熱。使っている台数だけ数量に入れます（使わない機器は 0）。', [
      equipRows(SENS_ROWS, 'sens'),
      results([['内部発熱（顕熱）小計', 'sensSum', 'W', true]])
    ], null, 'intS'));

    g.appendChild(card('内部発熱（潜熱）', '潜熱', '室内に出る水蒸気を熱量に換算した値。外気が乾燥している時（換気の潜熱がマイナス）は自動でマイナス扱いになります。', [
      equipRows(LAT_ROWS, 'lat'),
      results([['内部発熱（潜熱）小計', 'latSum', 'W', true]])
    ], null, 'intL'));

    g.appendChild(card('人体', '顕熱＋潜熱', '人の体から出る熱と水蒸気です。', [
      fields(['people', 'peopleS', 'peopleL']),
      results([['人体の顕熱', 'load.peopleS', 'W'], ['人体の潜熱', 'load.peopleL', 'W']])
    ], null, 'people'));

    g.appendChild(card('隣室・間仕切り', '顕熱', '部屋単位で計算する時に、隣の部屋との温度差で出入りする熱です。家全体なら 0 でかまいません。', [
      fields(['inflowQ', 'partitionA']),
      results([['隣室との温度差', 'load.dtNext', 'K', false, 1], ['暖冷気の流入', 'load.inflow', 'W'], ['間仕切りの熱貫流', 'load.partition', 'W'], ['室内干し（顕熱・自動）', 'load.dryS', 'W']])
    ], null, 'room'));

    var solar = el('div', { class: 'rows' });
    solar.appendChild(el('div', { class: 'row head' }, [el('span', { text: '方位（目安）' }), el('span', { text: 'W/㎡' }), el('span', { text: '窓面積' }), el('span', { text: '負荷' })]));
    [['solarS', '南面', '20～150W/㎡'], ['solarEW', '東西面', '100～300W/㎡']].forEach(function (s) {
      solar.appendChild(el('div', { class: 'row' }, [
        el('div', { class: 'name' }, [el('b', { text: s[1] + '（' + s[2] + '）' })]),
        el('div', { class: 'cellin' }, [numberInput(s[0] + 'W', { step: 1, aria: s[1] + ' 日射 W/㎡' }), el('span', { class: 'unit', text: 'W' })]),
        el('div', { class: 'cellin' }, [numberInput(s[0] + 'Area', { step: 0.1, aria: s[1] + ' 窓面積' }), el('span', { class: 'unit', text: '㎡' })]),
        el('span', { class: 'out', 'data-out': 'load.' + s[0], 'data-unit': 'W' })
      ]));
    });
    g.appendChild(card('窓からの日射取得', '顕熱', '窓 1㎡ あたりに入る日射熱 × 窓面積。日射遮蔽（庇・ブラインド）を考えた値を入れます。', [solar], null, 'solar'));

    g.appendChild(card('外皮（壁・屋根・床・窓）', '顕熱', '外皮面積 × UA値 × 温度差 で、建物の外側を通って出入りする熱を求めます。', [
      fields(['envArea', 'ua']),
      results([['外皮の熱損失・熱取得', 'load.envelope', 'W', true]])
    ], null, 'env'));

    var lh = el('div', { class: 'field full' }, [
      el('label', { for: 'in-latentHeat', text: '水の蒸発潜熱（加湿負荷の換算に使用）' }),
      el('div', { class: 'inrow' }, [
        (function () {
          var s = el('select', { id: 'in-latentHeat', 'data-key': 'latentHeat', 'data-num': '1' });
          s.appendChild(el('option', { value: '678.3', text: '678.3 Wh/kg（原表「基本」シート）' }));
          s.appendChild(el('option', { value: '627.6', text: '627.6 Wh/kg（原表「輻射暖房」シート）' }));
          return s;
        })()
      ])
    ]);
    g.appendChild(card('加湿・除湿', '潜熱', '室内の湿度を保つために必要な水の量です。プラスなら加湿、マイナスなら除湿が必要です。', [
      el('div', { class: 'fields' }, [lh]),
      results([['必要な加湿／除湿量', 'load.humid', 'L/日', true, 2], ['加湿に使う熱（加湿時のみ）', 'load.humidW', 'W']])
    ], null, 'humid'));

    root.appendChild(g);
  }

  /* ---------------- エアコン吹出タブ ---------------- */
  function buildAcPanel(root) {
    var g = el('div', { class: 'grid2' });
    var src = el('div', { class: 'field full' }, [
      el('label', { for: 'in-acSource', text: 'エアコンが吸い込む空気' }),
      (function () {
        var s = el('select', { id: 'in-acSource', 'data-key': 'acSource' });
        s.appendChild(el('option', { value: 'mix', text: '混合気（吸込み口の近くに換気の給気口がある）' }));
        s.appendChild(el('option', { value: 'room', text: '内気（室内の空気だけを吸い込む）' }));
        return s;
      })(),
      el('span', { class: 'hint', text: '吸込み口の上に給気口がある場合は「混合気」を選びます' })
    ]);
    g.appendChild(card('Step 1　空気の状態を決める', null,
      '室内と外気の条件・換気量・熱交換率は「負荷計算」タブの値を使います。ここでは吸込み空気と吹出し温度を決めます。', [
        el('div', { class: 'fields' }, [src, field('tSupply')])
      ], null, 'ac1'));
    g.appendChild(card('Step 2　風量を決める', null, '吹出口の大きさと風速から風量を求めます。', [
      fields(['ductL', 'ductS', 'ductD', 'vel', 'hours', 'vTerm']),
      results([['風量', 'ac.airflow', '㎥/h', true, 0], ['到達距離', 'ac.reach', 'm', false, 2], ['気流の降下量（＋降下／−上昇）', 'ac.drop', 'm', false, 2]])
    ], null, 'ac2'));

    var tbl = el('table', { class: 'states' });
    tbl.innerHTML = '<thead><tr><th>空気</th><th>風量 ㎥/h</th><th>温度 ℃</th><th>相対湿度 %</th><th>絶対湿度 g/kg</th></tr></thead><tbody>' +
      [['室内空気', 'room'], ['換気（熱交換後の外気）', 'oa'], ['混合気', 'mix'], ['吸込み空気', 'intake'], ['吹出し空気', 'supply']].map(function (r) {
        return '<tr' + (r[1] === 'intake' || r[1] === 'supply' ? ' class="em"' : '') + '><td>' + r[0] + '</td>' +
          '<td data-out="ac.' + r[1] + '.q" data-d="0"></td><td data-out="ac.' + r[1] + '.t" data-d="1"></td>' +
          '<td data-out="ac.' + r[1] + '.rhPct" data-d="1"></td><td data-out="ac.' + r[1] + '.x" data-d="2"></td></tr>';
      }).join('') + '</tbody>';
    g.appendChild(card('Step 3　空気と水の状態を知る', null,
      '吸込み空気を吹出し温度まで冷やす（温める）時に、エアコンが空気に与える熱と、取り除く水の量です。冷房時の吹出し空気は相対湿度 100%、暖房時は絶対湿度一定として計算します。', [
        el('div', { class: 'table-scroll' }, [tbl]),
        results([['エアコンの顕熱能力', 'ac.capS', 'W'], ['エアコンの潜熱能力', 'ac.capL', 'W'], ['エアコンの全熱能力', 'ac.capT', 'W', true],
          ['顕熱比 SHF', 'ac.shfPct', '%', true, 1], ['建物の顕熱比（負荷計算）', 'load.shfPct', '%', false, 1],
          ['負荷に対する能力の比', 'ac.ratioPct', '%', false, 0],
          ['空気が運んだ総熱量', 'ac.energy', 'kWh', false, 2], ['空気が運んだ総水量（除湿量）', 'ac.water', 'L', false, 2]]),
        el('p', { class: 'hint', text: 'エアコンの顕熱比はおおむね 50～80% の間で動きます。夏はエアコンの顕熱比を建物の顕熱比に合わせるように風量・吹出し温度を調整します。冬は顕熱比は無視してかまいません。' })
      ], 'span2', 'ac3'));
    var psySvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    psySvg.id = 'psy';
    psySvg.setAttribute('role', 'img');
    psySvg.setAttribute('aria-label', 'エアコンの空気の状態変化を示した空気線図');
    g.appendChild(card('空気線図で見る空調の動き', null,
      '横軸が乾球温度、縦軸が絶対湿度です。外気と室内空気が混ざって吸込み空気になり（点線）、エアコンで吹出し空気になり（矢印）、室内の負荷を受けて室内空気に戻ります。', [
        el('div', { class: 'psy-wrap' }, [psySvg]),
        el('p', { class: 'hint', id: 'psy-note' })
      ], 'span2', 'psy'));
    root.appendChild(g);
  }

  /* ---------------- 輻射暖房・床下タブ ---------------- */
  function buildRadiantPanel(root) {
    var g = el('div', { class: 'grid2' });
    g.appendChild(card('床下温水配管の長さ検討', null, '床下に這わせた温水パイプから、1m あたり・全体でどれだけ放熱するかを求めます。', [
      fields(['pipeOD', 'pipeID', 'hIn', 'hOut', 'lambda', 'pipeLen', 'tWater', 'tAir']),
      results([['1m あたりの熱通過率', 'pipe.perM', 'W/mK', false, 3], ['水温と気温の差', 'pipe.dT', 'K', false, 1], ['パイプからの放熱量', 'pipe.heat', 'W', true],
        ['暖房負荷に対する割合', 'pipe.ratioPct', '%', false, 0]])
    ], null, 'pipe'));
    g.appendChild(card('床・基礎の熱収支', null, '温めた床下から床を通って室内へ移る熱と、基礎の外周から外へ逃げる熱です。室温・外気温は「負荷計算」タブの値を使います。', [
      fields(['floorA', 'floorU', 'tUnder', 'psi', 'foundLen']),
      results([['床から室内へ移る熱', 'floor.toRoom', 'W', true], ['基礎から逃げる熱', 'floor.loss', 'W', true]])
    ], null, 'floor'));
    g.appendChild(card('床ガラリからの熱供給（2つの空気の比較）', null, '2つの空気の温湿度と風量から、運ばれる熱と水の量を求めます。床ガラリの吹出しと室内の比較などに使います。', [
      fields(['a1T', 'a1RH', 'a2T', 'a2RH', 'ductL2', 'ductS2', 'ductD2', 'vel2', 'hours2']),
      results([['空気① 絶対湿度', 'air.a1.x', 'g/kg', false, 2], ['空気② 絶対湿度', 'air.a2.x', 'g/kg', false, 2], ['風量', 'air.airflow', '㎥/h', false, 1],
        ['顕熱差', 'air.dS', 'W'], ['潜熱差', 'air.dL', 'W'], ['全熱差', 'air.dT', 'W', true], ['顕熱比', 'air.shfPct', '%', false, 1],
        ['空気が運んだ総熱量', 'air.energy', 'kWh', false, 2], ['空気が運んだ総水量', 'air.water', 'L', false, 2]])
    ], 'span2', 'air'));
    root.appendChild(g);
  }

  /* ---------------- サマリーと円グラフ ---------------- */
  // 項目ごとに固定の色（並び順は色覚多様性に配慮して検証済みの順）
  var SLOT = { intL: 1, ventL: 2, intS: 3, ventS: 4, solar: 5, env: 6, humidW: 7, dryS: 8 };

  function arcPath(cx, cy, r0, r1, a0, a1) {
    var p = function (r, a) { return (cx + r * Math.sin(a)).toFixed(2) + ' ' + (cy - r * Math.cos(a)).toFixed(2); };
    var large = a1 - a0 > Math.PI ? 1 : 0;
    return 'M' + p(r1, a0) + ' A' + r1 + ' ' + r1 + ' 0 ' + large + ' 1 ' + p(r1, a1) +
      ' L' + p(r0, a1) + ' A' + r0 + ' ' + r0 + ' 0 ' + large + ' 0 ' + p(r0, a0) + ' Z';
  }

  function renderPie(items, total) {
    var host = document.getElementById('chart');
    var list = items.filter(function (it) { return Math.abs(it.value) >= 0.5; });
    var sum = list.reduce(function (a, it) { return a + Math.abs(it.value); }, 0);
    if (!sum) { host.innerHTML = '<p class="hint">熱の出入りがありません。条件を入力してください。</p>'; return; }
    var C = 110, R1 = 104, R0 = 64;
    var svg = '<svg viewBox="0 0 220 220" role="img" aria-label="熱負荷の内訳の円グラフ。合計 ' + signed(total) + '">' +
      '<defs><pattern id="pie-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<rect class="hatch-bg" width="7" height="7" fill-opacity="0"/><line class="hatch" x1="0" y1="0" x2="0" y2="7" stroke-width="3"/></pattern></defs>';
    var a = 0;
    list.forEach(function (it) {
      var span = Math.abs(it.value) / sum * Math.PI * 2;
      var pct = Math.abs(it.value) / sum * 100;
      var tip = '<title>' + it.label + '　' + signed(it.value) + '（' + fmt(pct, 1) + '%）</title>';
      var parts = span >= Math.PI * 2 - 1e-6 ? [[a, a + Math.PI], [a + Math.PI, a + Math.PI * 2]] : [[a, a + span]];
      parts.forEach(function (pr) {
        var d = arcPath(C, C, R0, R1, pr[0], pr[1]);
        svg += '<path class="slice s' + SLOT[it.key] + '" d="' + d + '">' + tip + '</path>';
        if (it.value < 0) svg += '<path class="slice-hatch" d="' + d + '" fill="url(#pie-hatch)">' + tip + '</path>';
      });
      a += span;
    });
    var tc = signClass(total);
    svg += '<text class="pie-lbl" x="110" y="96" text-anchor="middle">合計</text>' +
      '<text class="pie-total t-' + tc + '" x="110" y="122" text-anchor="middle">' + signed(total) + '</text>' +
      '<text class="pie-lbl" x="110" y="142" text-anchor="middle">' + (tc === 'hot' ? '冷房が必要' : tc === 'cold' ? '暖房が必要' : '負荷ほぼゼロ') + '</text></svg>';
    var legend = '<ul class="pie-legend">' + list.map(function (it) {
      var pct = Math.abs(it.value) / sum * 100;
      return '<li><span class="sw s' + SLOT[it.key] + (it.value < 0 ? ' neg' : '') + '"></span>' +
        '<span class="lg-name">' + it.label + '</span>' +
        '<span class="lg-val out ' + signClass(it.value) + '">' + signed(it.value) + '</span>' +
        '<span class="lg-pct">' + fmt(pct, 0) + '%</span></li>';
    }).join('') + '</ul>';
    host.innerHTML = '<div class="pie-wrap"><div class="pie">' + svg + '</div>' + legend + '</div>' +
      '<p class="hint">円の割合は各項目の影響の大きさ（プラス・マイナスを問わない絶対値）です。<b>斜線</b>の項目は熱が逃げて室内が寒くなる方向（マイナス）、斜線なしは熱が入って暑くなる方向（プラス）です。</p>';
  }

  /* ---------------- 家のイラスト ---------------- */
  function signed(v) {
    if (!isFinite(v)) return '—';
    var s = fmt(v, 0);
    return (v >= 0.5 ? '+' : '') + s + ' W';
  }
  // テキスト幅の見積もり（全角 ≈ 13px、半角 ≈ 7.5px、数値用フォント ≈ 8.6px）
  function tw(str, mono) {
    var w = 0;
    for (var i = 0; i < str.length; i++) w += mono ? 8.6 : (str.charCodeAt(i) > 0x2e80 ? 13 : 7.5);
    return w;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  // 先細りの矢印。太さは値の大きさ、色は符号
  function tArrow(x1, y1, x2, y2, v, max) {
    var c = signClass(v);
    if (c === 'zero') return '<line class="a-zero" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '"/>';
    var f = Math.min(1, Math.abs(v) / max);
    var tail = 2 + 7 * f, head = 13 + 11 * f, hl = 14 + 8 * f;
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
    var bx = x2 - ux * hl, by = y2 - uy * hl;
    var P = function (x, y) { return x.toFixed(1) + ',' + y.toFixed(1); };
    var pts = [P(x1 + nx * tail / 2, y1 + ny * tail / 2), P(bx + nx * tail / 2, by + ny * tail / 2), P(bx + nx * head / 2, by + ny * head / 2),
      P(x2, y2), P(bx - nx * head / 2, by - ny * head / 2), P(bx - nx * tail / 2, by - ny * tail / 2), P(x1 - nx * tail / 2, y1 - ny * tail / 2)].join(' ');
    return '<polygon class="h-' + c + '" points="' + pts + '"/>';
  }
  // 外 (ox,oy) と内 (ix,iy)。プラスは外→内（熱が入る）、マイナスは内→外（熱が逃げる）
  function flow(ox, oy, ix, iy, v, max) {
    return v >= 0 ? tArrow(ox, oy, ix, iy, v, max) : tArrow(ix, iy, ox, oy, v, max);
  }
  // 丸い札。lines: [{t:文字, c:クラス}]
  function pill(cx, cy, lines, cls) {
    var w = 0; lines.forEach(function (l) { w = Math.max(w, tw(l.t, l.c === 'num')); });
    w += 18; var lh = 16, h = lines.length * lh + 10;
    var s = '<g class="pill ' + (cls || '') + '"><rect x="' + (cx - w / 2) + '" y="' + (cy - h / 2) + '" width="' + w + '" height="' + h + '" rx="7"/>';
    lines.forEach(function (l, i) {
      s += '<text class="' + (l.c || '') + '" x="' + cx + '" y="' + (cy - h / 2 + 5 + lh * (i + 1) - 4) + '" text-anchor="middle">' + esc(l.t) + '</text>';
    });
    return s + '</g>';
  }
  function valPill(cx, cy, label, v) {
    return pill(cx, cy, [{ t: label, c: 'lbl' }, { t: signed(v), c: 'num ' + signClass(v) }]);
  }

  function renderHouse(L) {
    var b = {};
    L.breakdown.forEach(function (it) { b[it.key] = it.value; });
    var max = Math.max.apply(null, L.breakdown.map(function (i) { return Math.abs(i.value); }).concat([1]));
    var extras = L.breakdown.filter(function (it) { return it.extra && Math.abs(it.value) >= 0.5; });
    var W = 640, G = 380, H = G + 28 + extras.length * 22;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="家の断面図で熱の出入りを示した熱負荷の内訳。合計 ' + signed(L.total) + '">';
    s += '<defs>' +
      '<linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky-a"/><stop offset="1" class="sky-b"/></linearGradient>' +
      '<linearGradient id="g-ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="grd-a"/><stop offset="1" class="grd-b"/></linearGradient>' +
      '<linearGradient id="g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="gl-a"/><stop offset="1" class="gl-b"/></linearGradient>' +
      '<linearGradient id="g-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="wt-a"/><stop offset="1" class="wt-b"/></linearGradient>' +
      '<radialGradient id="g-sun"><stop offset="0" class="sun-a"/><stop offset="0.55" class="sun-a"/><stop offset="1" class="sun-b"/></radialGradient>' +
      '<radialGradient id="g-glow"><stop offset="0" class="glow-a"/><stop offset="1" class="glow-b"/></radialGradient>' +
      '<filter id="f-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-opacity="0.22"/></filter>' +
      '<filter id="f-soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.5" flood-opacity="0.25"/></filter>' +
      '</defs>';

    // 空・地面
    s += '<rect x="0" y="0" width="' + W + '" height="' + G + '" fill="url(#g-sky)"/>';
    s += '<rect x="0" y="' + G + '" width="' + W + '" height="' + (H - G) + '" fill="url(#g-ground)"/>';
    s += '<line class="ground" x1="0" y1="' + G + '" x2="' + W + '" y2="' + G + '"/>';
    // 雲
    s += '<g class="cloud"><ellipse cx="560" cy="58" rx="30" ry="12"/><ellipse cx="540" cy="52" rx="18" ry="11"/><ellipse cx="582" cy="52" rx="16" ry="9"/></g>';
    // 木
    s += '<g class="tree"><rect x="600" y="340" width="7" height="40"/><circle cx="603" cy="318" r="22"/><circle cx="590" cy="332" r="15"/><circle cx="617" cy="332" r="15"/></g>';

    // 太陽
    s += '<circle cx="58" cy="72" r="46" fill="url(#g-glow)"/>';
    for (var i = 0; i < 12; i++) {
      var a = i * Math.PI / 6, c1 = Math.cos(a), s1 = Math.sin(a);
      s += '<line class="ray" x1="' + (58 + c1 * 30) + '" y1="' + (72 + s1 * 30) + '" x2="' + (58 + c1 * (i % 2 ? 36 : 40)) + '" y2="' + (72 + s1 * (i % 2 ? 36 : 40)) + '"/>';
    }
    s += '<circle cx="58" cy="72" r="23" fill="url(#g-sun)"/>';

    // 建物（基礎・壁・屋根）
    s += '<g filter="url(#f-shadow)">';
    s += '<rect class="found" x="150" y="' + G + '" width="340" height="22"/>';
    s += '<rect class="wall" x="150" y="190" width="340" height="' + (G - 190) + '"/>';
    s += '<rect class="room" x="160" y="190" width="320" height="' + (G - 198) + '"/>';
    s += '<rect class="slab" x="150" y="' + (G - 8) + '" width="340" height="8"/>';
    s += '<polygon class="roof" points="118,202 320,66 522,202 522,194 320,58 118,194"/>';
    s += '<polygon class="roof-under" points="118,202 320,66 522,202 500,202 320,88 140,202"/>';
    s += '<polygon class="attic" points="150,190 320,80 490,190"/>';
    s += '<rect class="chimney" x="412" y="86" width="22" height="40"/>';
    s += '</g>';
    // 窓（南の壁、断面）
    s += '<rect class="frame" x="147" y="232" width="16" height="76" rx="2"/><rect x="150" y="236" width="10" height="68" fill="url(#g-glass)"/>';

    // 換気ユニットとダクト
    s += '<rect class="unit" x="444" y="210" width="36" height="84" rx="4"/>';
    s += '<circle class="fan" cx="462" cy="252" r="11"/><path class="fan-blade" d="M462 252 l0 -9 a9 9 0 0 1 8 5 z M462 252 l8 5 a9 9 0 0 1 -8 4 z M462 252 l-8 4 a9 9 0 0 1 0 -9 z"/>';
    s += '<rect class="duct" x="480" y="218" width="36" height="12" rx="2"/><rect class="duct" x="480" y="274" width="36" height="12" rx="2"/>';

    // 室内の様子：ソファと人、テレビ、ランプ
    var F = G - 8; // 床面
    s += '<g class="furn">';
    s += '<rect class="fill" x="176" y="' + (F - 10) + '" width="26" height="4"/><rect x="188" y="' + (F - 82) + '" width="3" height="72" class="solid"/><polygon class="shade" points="176,' + (F - 82) + ' 202,' + (F - 82) + ' 196,' + (F - 100) + ' 182,' + (F - 100) + '"/>';
    s += '<rect class="sofa" x="214" y="' + (F - 44) + '" width="84" height="22" rx="7"/><rect class="sofa" x="214" y="' + (F - 30) + '" width="84" height="24" rx="6"/><rect class="sofa-arm" x="210" y="' + (F - 36) + '" width="12" height="30" rx="5"/><rect class="sofa-arm" x="290" y="' + (F - 36) + '" width="12" height="30" rx="5"/>';
    s += '<circle class="skin" cx="254" cy="' + (F - 66) + '" r="9"/><path class="body" d="M243 ' + (F - 52) + ' h22 v20 h-6 v10 h-10 v-10 h-6 z"/>';
    s += '<rect class="tv" x="320" y="' + (F - 70) + '" width="52" height="32" rx="3"/><rect x="323" y="' + (F - 67) + '" width="46" height="26" fill="url(#g-glass)"/><rect class="solid" x="344" y="' + (F - 38) + '" width="4" height="10"/><rect class="solid" x="332" y="' + (F - 28) + '" width="28" height="3"/>';
    s += '<rect class="fill" x="314" y="' + (F - 20) + '" width="64" height="20" rx="2"/>';
    s += '</g>';
    // 間仕切り（腰壁）
    s += '<rect class="wall" x="388" y="' + (F - 90) + '" width="6" height="90"/>';
    // 洗濯物と浴槽
    s += '<g class="wet">';
    s += '<line class="rope" x1="400" y1="' + (F - 108) + '" x2="440" y2="' + (F - 108) + '"/>';
    [404, 424].forEach(function (x) {
      s += '<path class="shirt" d="M' + x + ' ' + (F - 106) + ' h12 l5 4 l-2 5 l-3 -1 v14 h-12 v-14 l-3 1 l-2 -5 z"/>';
      s += '<path class="drop" d="M' + (x + 6) + ' ' + (F - 80) + ' q-3 5 0 7 q3 -2 0 -7 z"/>';
    });
    s += '<path class="tub" d="M402 ' + (F - 34) + ' h72 v18 q0 12 -12 12 h-48 q-12 0 -12 -12 z"/><rect x="406" y="' + (F - 32) + '" width="64" height="12" fill="url(#g-water)"/>';
    s += '<path class="solid" d="M470 ' + (F - 48) + ' v14 M470 ' + (F - 48) + ' h-8"/>';
    [416, 436, 456].forEach(function (x, k) {
      s += '<path class="steam" d="M' + x + ' ' + (F - 40) + ' c-5 -6 5 -10 0 -16 c-4 -5 3 -8 0 -12" style="animation-delay:' + (k * 0.4) + 's"/>';
    });
    s += '</g>';

    // --- 熱の矢印 ---
    // 日射：太陽 → 窓
    s += flow(92, 100, 158, 262, Math.max(0, b.solar), max);
    s += valPill(150, 52, '日射取得', b.solar);
    // 外皮：屋根と左壁
    s += flow(360, 96, 360, 180, b.env, max);
    s += flow(64, 340, 158, 340, b.env, max);
    s += valPill(470, 48, '外皮（壁・屋根・窓）', b.env);
    s += '<text class="lbl-s" x="66" y="320">外皮</text>';
    // 換気：右の壁
    s += flow(610, 224, 518, 224, b.ventS, max);
    s += flow(610, 280, 518, 280, b.ventL, max);
    s += valPill(566, 190, '換気・顕熱', b.ventS);
    s += valPill(566, 314, '換気・潜熱', b.ventL);
    // 内部発熱（顕熱・潜熱）：家具から上へ
    s += (b.intS >= 0 ? tArrow(254, F - 112, 254, 276, b.intS, max) : tArrow(254, 276, 254, F - 112, b.intS, max));
    s += (b.intL >= 0 ? tArrow(436, F - 126, 436, 276, b.intL, max) : tArrow(436, 276, 436, F - 126, b.intL, max));
    s += valPill(254, 254, '内部発熱・顕熱', b.intS);
    s += valPill(436, 254, '内部発熱・潜熱', b.intL);

    // 室内・屋外の温湿度
    var cond = function (t, rh) { return fmt(t, 1) + '℃　' + fmt(rh, 0) + '%'; };
    s += pill(320, 206, [{ t: '室内　' + cond(state.tIn, state.rhIn) + '　' + fmt(L.xIn, 1) + ' g/kg', c: 'cond' }], 'cond-pill');
    s += pill(72, 262, [{ t: '屋外', c: 'lbl' }, { t: cond(state.tOut, state.rhOut), c: 'cond' }, { t: fmt(L.xOut, 1) + ' g/kg', c: 'lbl' }], 'cond-pill');

    // 合計（屋根裏）
    var tc = signClass(L.total);
    s += '<text class="lbl-s" x="320" y="124" text-anchor="middle">合計</text>';
    s += '<text class="total t-' + tc + '" x="320" y="152" text-anchor="middle">' + signed(L.total) + '</text>';
    s += '<text class="lbl-s" x="320" y="172" text-anchor="middle">' + (tc === 'hot' ? '冷房が必要' : tc === 'cold' ? '暖房が必要' : '負荷ほぼゼロ') + '</text>';

    // 原表のグラフにない項目（0 でないときだけ）
    extras.forEach(function (it, k) {
      var y = G + 20 + k * 22;
      s += '<text x="12" y="' + y + '">' + esc(it.label) + '</text><text class="num ' + signClass(it.value) + '" x="' + (12 + tw(it.label) + 10) + '" y="' + y + '">' + signed(it.value) + '</text>';
    });
    s += '</svg>';
    document.getElementById('house').innerHTML = s;
  }

  /* ---------------- 空気線図 ---------------- */
  var psy = null;
  function renderPsy(r) {
    if (!psy) return;
    var A = r.ac, L = r.load;
    var note = document.getElementById('psy-note');
    var pts = [], procs = [];
    var ok = function (p) { return isFinite(p.t) && isFinite(p.x); };
    var add = function (id, name, t, xg, color) {
      var p = { id: id, name: name, t: t, x: xg / 1000, color: color };
      if (ok(p)) pts.push(p);
      return p;
    };
    var ra = add('ra', '室内空気 ' + fmt(state.tIn, 1) + '℃ ' + fmt(state.rhIn, 0) + '%', state.tIn, L.xIn, '#2a78d6');
    var oa = add('oa', '外気 ' + fmt(state.tOut, 1) + '℃ ' + fmt(state.rhOut, 0) + '%', state.tOut, L.xOut, '#eb6834');
    var hasVent = state.vent > 0;
    var hx = hasVent && (state.effS > 0 || state.effL > 0);
    var oa2 = hx ? add('oa2', '換気（熱交換後）', A.oa.t, A.oa.x, '#c98500') : oa;
    var isMix = state.acSource !== 'room' && hasVent && A.room.q > 0;
    var ma = isMix ? add('ma', '混合気＝吸込み', A.mix.t, A.mix.x, '#1baf7a') : ra;
    var sa = add('sa', '吹出し ' + fmt(A.supply.t, 1) + '℃ ' + fmt(A.supply.rh * 100, 0) + '%', A.supply.t, A.supply.x, '#e34948');
    if (hx && ok(oa) && ok(oa2)) procs.push({ from: 'oa', to: 'oa2', kind: 'process' });
    if (isMix && ok(oa2) && ok(ra)) procs.push({ from: oa2.id, to: 'ra', kind: 'mix' });
    if (ok(ma) && ok(sa)) procs.push({ from: ma.id, to: 'sa', kind: 'process' });
    if (ok(sa) && ok(ra)) procs.push({ from: 'sa', to: 'ra', kind: 'process' });
    if (!ok(ra) || !ok(sa)) {
      psy.setData({ points: [], processes: [], shf: [] }); psy.render();
      note.textContent = '室内・外気の条件と風量を入力すると、状態点が表示されます。';
      return;
    }
    var ts = pts.map(function (p) { return p.t; }), xs = pts.map(function (p) { return p.x; });
    var tMin = Math.floor((Math.min.apply(null, ts) - 5) / 5) * 5, tMax = Math.ceil((Math.max.apply(null, ts) + 7) / 5) * 5;
    if (tMax - tMin < 25) { tMax = tMin + 25; }
    var xMax = Math.max(0.012, Math.ceil(Math.max.apply(null, xs) * 1.3 * 1000 / 4) * 4 / 1000);
    psy.setRange({ tMin: tMin, tMax: tMax, xMax: xMax });
    psy.setData({ points: pts, processes: procs, shf: [] });
    psy.render();
    var mode = A.heating ? '暖房' : '冷房';
    note.textContent = mode + '運転：吸込み ' + fmt(ma.t, 1) + '℃・' + fmt(ma.x * 1000, 2) + ' g/kg → 吹出し ' + fmt(sa.t, 1) + '℃・' + fmt(sa.x * 1000, 2) + ' g/kg。' +
      (A.heating ? '暖房では絶対湿度が変わらないため、横に動くだけです（相対湿度は下がります）。' :
        '冷房では吹出し空気が飽和線（相対湿度 100%）まで冷やされ、絶対湿度の差の分が除湿量になります。') +
      ' 吹出し→室内空気の矢印が、室内の負荷（顕熱比 ' + fmt(L.shf * 100, 0) + '%）で空気が戻る変化です。';
  }

  var VIEW_KEY = 'airconditioning-view';
  var view = (function () { try { return localStorage.getItem(VIEW_KEY) || 'house'; } catch (e) { return 'house'; } })();
  function applyView() {
    document.getElementById('house-fig').hidden = view !== 'house';
    document.getElementById('chart').hidden = view === 'house';
    document.getElementById('view-house').setAttribute('aria-pressed', view === 'house' ? 'true' : 'false');
    document.getElementById('view-pie').setAttribute('aria-pressed', view !== 'house' ? 'true' : 'false');
    if (lastLoad && view !== 'house') renderPie(lastLoad.breakdown, lastLoad.total);
  }
  function setupView() {
    ['house', 'pie'].forEach(function (v) {
      document.getElementById('view-' + v).addEventListener('click', function () {
        view = v;
        try { localStorage.setItem(VIEW_KEY, v); } catch (e) { /* 保存できなくても表示は切り替える */ }
        applyView();
      });
    });
    applyView();
  }

  var lastLoad = null;

  function renderSummary(r) {
    var L = r.load;
    var tot = document.getElementById('sum-total');
    tot.innerHTML = fmt(L.total, 0) + '<small>W</small>';
    tot.style.color = 'var(--' + (signClass(L.total) === 'zero' ? 'ink' : signClass(L.total)) + ')';
    var pill = document.getElementById('sum-pill');
    if (signClass(L.total) === 'hot') { pill.className = 'pill hot'; pill.textContent = '冷房負荷（室内が暑くなる）'; }
    else if (signClass(L.total) === 'cold') { pill.className = 'pill cold'; pill.textContent = '暖房負荷（室内が寒くなる）'; }
    else { pill.className = 'pill neutral'; pill.textContent = '負荷はほぼゼロ'; }
    document.getElementById('sum-kw').textContent = fmt(Math.abs(L.total) / 1000, 2);
    var hp = document.getElementById('sum-humid-pill');
    if (L.humid > 0.005) { hp.className = 'pill warn'; hp.textContent = '加湿が必要'; }
    else if (L.humid < -0.005) { hp.className = 'pill cold'; hp.textContent = '除湿が必要'; }
    else { hp.className = 'pill neutral'; hp.textContent = '調湿不要'; }
    var meta = [state.season, state.place, state.time].filter(Boolean).join('・');
    document.getElementById('sum-meta').textContent = meta ? '条件：' + meta : '条件：未設定';
    lastLoad = L;
    renderHouse(L);
    if (view !== 'house') renderPie(L.breakdown, L.total);
  }

  /* ---------------- 値の反映 ---------------- */
  function getPath(obj, path) {
    return path.split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function compute() {
    var r = C.calcAll(state);
    var L = r.load;
    // 画面用の派生値
    r.sensSum = Object.keys(L.sens).reduce(function (a, k) { return a + L.sens[k]; }, 0);
    r.latSum = Object.keys(L.lat).reduce(function (a, k) { return a + L.lat[k]; }, 0);
    L.shfPct = L.shf * 100;
    ['mix', 'intake', 'supply'].forEach(function (k) { r.ac[k].q = r.ac.airflow; });
    ['room', 'oa', 'mix', 'intake', 'supply'].forEach(function (k) { r.ac[k].rhPct = r.ac[k].rh * 100; });
    r.ac.shfPct = r.ac.shf * 100;
    r.ac.ratioPct = L.total !== 0 ? r.ac.capT / Math.abs(L.total) * 100 : NaN;
    r.air.shfPct = r.air.shf * 100;
    r.pipe.ratioPct = L.total < 0 ? r.pipe.heat / Math.abs(L.total) * 100 : NaN;
    return r;
  }

  var SIGNED = /^(load\.(ventS|ventL|peopleS|peopleL|inflow|partition|dryS|solarS|solarEW|envelope|humidW|total|totalS|totalL)|sens\.|lat\.|sensSum|latSum|floor\.)/;

  function render() {
    var r = compute();
    document.querySelectorAll('[data-out]').forEach(function (node) {
      var path = node.getAttribute('data-out');
      var v = path.indexOf('sens.') === 0 || path.indexOf('lat.') === 0 ? getPath(r.load, path) : getPath(r, path);
      var d = node.getAttribute('data-d');
      var digits = d !== null ? +d : 0;
      var unit = node.getAttribute('data-unit') || '';
      var prefix = node.getAttribute('data-prefix');
      node.textContent = (prefix ? prefix + ' ' : '') + fmt(v, digits) + (unit ? ' ' + unit : '');
      if (SIGNED.test(path)) {
        node.classList.remove('hot', 'cold', 'zero');
        node.classList.add(signClass(v));
      }
    });
    document.getElementById('sum-sens').textContent = fmt(r.load.totalS, 0);
    document.getElementById('sum-lat').textContent = fmt(r.load.totalL, 0);
    document.getElementById('sum-shf').textContent = fmt(r.load.shf * 100, 1);
    document.getElementById('sum-humid').textContent = fmt(r.load.humid, 2);
    renderSummary(r);
    renderPsy(r);
    // 浴室の自動計算行の表示切替
    var bathW = document.getElementById('in-bathLW');
    if (bathW) {
      bathW.disabled = !!state.bathAuto;
      if (state.bathAuto) bathW.value = (Math.round(r.evap.bathW * 10) / 10).toString();
    }
    document.querySelectorAll('[data-bath-sub] .field').forEach(function (f) { f.hidden = !state.bathAuto; });
  }

  function syncInputs() {
    document.querySelectorAll('[data-key]').forEach(function (inp) {
      var k = inp.getAttribute('data-key');
      var v = state[k];
      if (inp.type === 'checkbox') inp.checked = !!v;
      else if (inp.tagName === 'SELECT') {
        var sv = v === null || v === undefined ? '' : String(v);
        if (!Array.prototype.some.call(inp.options, function (o) { return o.value === sv; }) && sv !== '') {
          inp.appendChild(el('option', { value: sv, text: sv }));
        }
        inp.value = sv;
      } else inp.value = v === null || v === undefined ? '' : v;
    });
  }

  function onInput(e) {
    var inp = e.target;
    var k = inp.getAttribute && inp.getAttribute('data-key');
    if (!k) return;
    if (inp.type === 'checkbox') state[k] = inp.checked;
    else if (inp.type === 'number') {
      if (inp.value === '') state[k] = F[k] && F[k].optional ? null : 0;
      else { var v = parseFloat(inp.value); if (!isFinite(v)) return; state[k] = v; }
    } else if (inp.getAttribute('data-num')) state[k] = parseFloat(inp.value);
    else state[k] = inp.value;
    saveState();
    render();
  }

  /* ---------------- 保存・読み込み ---------------- */
  function setupIO() {
    var area = document.getElementById('io-text');
    var msg = document.getElementById('io-msg');
    var box = document.getElementById('io');
    document.getElementById('btn-io').addEventListener('click', function () {
      box.hidden = !box.hidden;
      if (!box.hidden) { area.value = JSON.stringify(state, null, 1); msg.textContent = '入力内容をテキストにしました。コピーして保存するか、保存しておいたテキストを貼り付けて「読み込む」を押してください。'; }
    });
    document.getElementById('btn-copy').addEventListener('click', function () {
      var text = JSON.stringify(state, null, 1);
      area.value = text;
      var done = function () { msg.textContent = 'コピーしました。メモ帳などに貼り付けて保存してください。'; };
      try {
        navigator.clipboard.writeText(text).then(done, function () { area.select(); msg.textContent = '自動コピーできませんでした。選択された文字をコピーしてください。'; });
      } catch (e) { area.select(); msg.textContent = '自動コピーできませんでした。選択された文字をコピーしてください。'; }
    });
    document.getElementById('btn-load').addEventListener('click', function () {
      try {
        var obj = JSON.parse(area.value);
        var base = P.build('blank');
        Object.keys(obj).forEach(function (k) { if (k in base) base[k] = obj[k]; });
        state = base;
        saveState(); syncInputs(); render();
        msg.textContent = '読み込みました。';
      } catch (e) {
        msg.textContent = '読み込めませんでした。「コピー」で保存したテキストをそのまま貼り付けてください。';
      }
    });
  }

  function setupPresets() {
    var sel = document.getElementById('preset');
    Object.keys(P.presets).forEach(function (k) { sel.appendChild(el('option', { value: k, text: P.presets[k].name })); });
    var confirmBox = document.getElementById('preset-confirm');
    document.getElementById('btn-preset').addEventListener('click', function () { confirmBox.hidden = false; });
    document.getElementById('btn-preset-no').addEventListener('click', function () { confirmBox.hidden = true; });
    document.getElementById('btn-preset-yes').addEventListener('click', function () {
      state = P.build(sel.value);
      saveState(); syncInputs(); render();
      confirmBox.hidden = true;
    });
  }

  /* ---------------- タブ ---------------- */
  function setupTabs() {
    var tabs = document.querySelectorAll('.tabs [role="tab"]');
    function show(id, push) {
      var found = false;
      tabs.forEach(function (t) {
        var on = t.getAttribute('aria-controls') === id;
        if (on) found = true;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      var isDoc = id === 'guide' || id === 'formula';
      document.getElementById('summary').hidden = isDoc;
      document.getElementById('toolbar').hidden = isDoc;
      if (!found) show('load');
      else if (push) { try { history.replaceState(null, '', '#' + id); } catch (e) { /* noop */ } }
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () { show(t.getAttribute('aria-controls'), true); window.scrollTo(0, 0); });
    });
    document.querySelectorAll('[data-goto]').forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); show(a.getAttribute('data-goto'), true); window.scrollTo(0, 0); });
    });
    var h = (location.hash || '').replace('#', '');
    show(h || 'load');
  }

  /* ---------------- 起動 ---------------- */
  function init() {
    buildLoadPanel(document.getElementById('load-cards'));
    buildAcPanel(document.getElementById('aircon-cards'));
    buildRadiantPanel(document.getElementById('radiant-cards'));
    if (window.PsyChart && window.Psy) {
      psy = new PsyChart(document.getElementById('psy'));
      psy.setLayers({ db: true, x: true, rh: true, wb: false, h: true, v: false });
    }
    syncInputs();
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    setupPresets();
    setupIO();
    setupTabs();
    setupView();
    document.getElementById('sum-help').appendChild(helpButton('summary'));
    document.querySelector('.chart-head h2').appendChild(helpButton('chart'));
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
