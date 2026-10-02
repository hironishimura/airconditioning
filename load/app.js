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
    wrap.appendChild(el('div', { class: 'inrow' }, [numberInput(key), el('span', { class: 'unit', text: f.unit })]));
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
  function card(title, tag, lead, body, cls) {
    var h = el('h2', null, [title]);
    if (tag) h.appendChild(el('span', { class: 'tag', text: tag }));
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

  /* ---------------- 負荷計算タブ ---------------- */
  function buildLoadPanel(root) {
    var g = el('div', { class: 'grid2' });

    g.appendChild(card('室内と外気の条件', '基本', '設計したい室内の温湿度と、その時の外気を入れます。季節や時間帯ごとにファイルを分けて計算します。', [
      fields(['tIn', 'rhIn', 'tOut', 'rhOut', 'tNext', 'tCollect']),
      results([['室内の絶対湿度', 'load.xIn', 'g/kg', false, 2], ['外気の絶対湿度', 'load.xOut', 'g/kg', false, 2], ['室温と外気の温度差', 'load.dtOut', 'K', false, 1]])
    ]));

    g.appendChild(card('換気', '顕熱＋潜熱', '換気で入れ替わる空気が持ち込む熱と湿気です。熱交換換気なら効率を入れます。', [
      fields(['vent', 'effS', 'effL']),
      results([['顕熱エンタルピー差', 'load.dhS', 'kJ/kg', false, 2], ['潜熱エンタルピー差', 'load.dhL', 'kJ/kg', false, 2],
        ['換気の顕熱負荷', 'load.ventS', 'W', true], ['換気の潜熱負荷', 'load.ventL', 'W', true]])
    ]));

    g.appendChild(card('内部発熱（顕熱）', '顕熱', '家電や調理で室内に出る熱。使っている台数だけ数量に入れます（使わない機器は 0）。', [
      equipRows(SENS_ROWS, 'sens'),
      results([['内部発熱（顕熱）小計', 'sensSum', 'W', true]])
    ]));

    g.appendChild(card('内部発熱（潜熱）', '潜熱', '室内に出る水蒸気を熱量に換算した値。外気が乾燥している時（換気の潜熱がマイナス）は自動でマイナス扱いになります。', [
      equipRows(LAT_ROWS, 'lat'),
      results([['内部発熱（潜熱）小計', 'latSum', 'W', true]])
    ]));

    g.appendChild(card('人体', '顕熱＋潜熱', '人の体から出る熱と水蒸気です。', [
      fields(['people', 'peopleS', 'peopleL']),
      results([['人体の顕熱', 'load.peopleS', 'W'], ['人体の潜熱', 'load.peopleL', 'W']])
    ]));

    g.appendChild(card('隣室・間仕切り', '顕熱', '部屋単位で計算する時に、隣の部屋との温度差で出入りする熱です。家全体なら 0 でかまいません。', [
      fields(['inflowQ', 'partitionA']),
      results([['隣室との温度差', 'load.dtNext', 'K', false, 1], ['暖冷気の流入', 'load.inflow', 'W'], ['間仕切りの熱貫流', 'load.partition', 'W'], ['室内干し（顕熱・自動）', 'load.dryS', 'W']])
    ]));

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
    g.appendChild(card('窓からの日射取得', '顕熱', '窓 1㎡ あたりに入る日射熱 × 窓面積。日射遮蔽（庇・ブラインド）を考えた値を入れます。', [solar]));

    g.appendChild(card('外皮（壁・屋根・床・窓）', '顕熱', '外皮面積 × UA値 × 温度差 で、建物の外側を通って出入りする熱を求めます。', [
      fields(['envArea', 'ua']),
      results([['外皮の熱損失・熱取得', 'load.envelope', 'W', true]])
    ]));

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
    ]));

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
      ]));
    g.appendChild(card('Step 2　風量を決める', null, '吹出口の大きさと風速から風量を求めます。', [
      fields(['ductL', 'ductS', 'ductD', 'vel', 'hours', 'vTerm']),
      results([['風量', 'ac.airflow', '㎥/h', true, 0], ['到達距離', 'ac.reach', 'm', false, 2], ['気流の降下量（＋降下／−上昇）', 'ac.drop', 'm', false, 2]])
    ]));

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
      ], 'span2'));
    root.appendChild(g);
  }

  /* ---------------- 輻射暖房・床下タブ ---------------- */
  function buildRadiantPanel(root) {
    var g = el('div', { class: 'grid2' });
    g.appendChild(card('床下温水配管の長さ検討', null, '床下に這わせた温水パイプから、1m あたり・全体でどれだけ放熱するかを求めます。', [
      fields(['pipeOD', 'pipeID', 'hIn', 'hOut', 'lambda', 'pipeLen', 'tWater', 'tAir']),
      results([['1m あたりの熱通過率', 'pipe.perM', 'W/mK', false, 3], ['水温と気温の差', 'pipe.dT', 'K', false, 1], ['パイプからの放熱量', 'pipe.heat', 'W', true],
        ['暖房負荷に対する割合', 'pipe.ratioPct', '%', false, 0]])
    ]));
    g.appendChild(card('床・基礎の熱収支', null, '温めた床下から床を通って室内へ移る熱と、基礎の外周から外へ逃げる熱です。室温・外気温は「負荷計算」タブの値を使います。', [
      fields(['floorA', 'floorU', 'tUnder', 'psi', 'foundLen']),
      results([['床から室内へ移る熱', 'floor.toRoom', 'W', true], ['基礎から逃げる熱', 'floor.loss', 'W', true]])
    ]));
    g.appendChild(card('床ガラリからの熱供給（2つの空気の比較）', null, '2つの空気の温湿度と風量から、運ばれる熱と水の量を求めます。床ガラリの吹出しと室内の比較などに使います。', [
      fields(['a1T', 'a1RH', 'a2T', 'a2RH', 'ductL2', 'ductS2', 'ductD2', 'vel2', 'hours2']),
      results([['空気① 絶対湿度', 'air.a1.x', 'g/kg', false, 2], ['空気② 絶対湿度', 'air.a2.x', 'g/kg', false, 2], ['風量', 'air.airflow', '㎥/h', false, 1],
        ['顕熱差', 'air.dS', 'W'], ['潜熱差', 'air.dL', 'W'], ['全熱差', 'air.dT', 'W', true], ['顕熱比', 'air.shfPct', '%', false, 1],
        ['空気が運んだ総熱量', 'air.energy', 'kWh', false, 2], ['空気が運んだ総水量', 'air.water', 'L', false, 2]])
    ], 'span2'));
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
  // 矢印（線＋三角）。太さは値の大きさ、色は符号
  function arrow(x1, y1, x2, y2, v, max) {
    var c = signClass(v);
    if (c === 'zero') {
      return '<line class="a-zero" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke-width="1.5"/>';
    }
    var sw = 3 + 9 * Math.min(1, Math.abs(v) / max);
    var head = Math.max(11, sw * 2.1);
    var dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx * dx + dy * dy);
    var ux = dx / len, uy = dy / len;
    var bx = x2 - ux * head, by = y2 - uy * head; // 三角の底辺の中心
    var hw = head * 0.6;
    var pts = [x2 + ',' + y2, (bx - uy * hw) + ',' + (by + ux * hw), (bx + uy * hw) + ',' + (by - ux * hw)].join(' ');
    var ex = x2 - ux * head * 0.8, ey = y2 - uy * head * 0.8;
    return '<line class="a-' + c + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + ex + '" y2="' + ey + '" stroke-width="' + sw.toFixed(1) + '"/>' +
      '<polygon class="h-' + c + '" points="' + pts + '"/>';
  }
  // 家の外 (ox,oy) と内 (ix,iy) を結ぶ流れ。プラスは外→内、マイナスは内→外
  function flow(ox, oy, ix, iy, v, max) {
    return v >= 0 ? arrow(ox, oy, ix, iy, v, max) : arrow(ix, iy, ox, oy, v, max);
  }
  function num(x, y, v, anchor) {
    return '<text class="num ' + signClass(v) + '" x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + signed(v) + '</text>';
  }
  function txt(x, y, s, cls, anchor) {
    return '<text' + (cls ? ' class="' + cls + '"' : '') + ' x="' + x + '" y="' + y + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + '>' + s + '</text>';
  }

  function renderHouse(L) {
    var b = {};
    L.breakdown.forEach(function (it) { b[it.key] = it.value; });
    var max = Math.max.apply(null, L.breakdown.map(function (i) { return Math.abs(i.value); }).concat([1]));
    var extras = L.breakdown.filter(function (it) { return it.extra && Math.abs(it.value) >= 0.5; });
    var W = 480, H = 398 + extras.length * 22;
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="家の断面図で熱の出入りを示した熱負荷の内訳。合計 ' + signed(L.total) + '">';

    // 地面・建物
    s += '<line class="ground" x1="0" y1="386" x2="' + W + '" y2="386"/>';
    s += '<rect class="bldg" x="110" y="165" width="260" height="221"/>';
    s += '<polygon class="roof" points="90,170 240,72 390,170"/>';
    s += '<rect class="glass" x="104" y="200" width="12" height="62"/>'; // 南の窓

    // 太陽と日射取得
    s += '<circle class="sun" cx="40" cy="46" r="15"/>';
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, c1 = Math.cos(a), s1 = Math.sin(a);
      s += '<line class="ray" x1="' + (40 + c1 * 20) + '" y1="' + (46 + s1 * 20) + '" x2="' + (40 + c1 * 27) + '" y2="' + (46 + s1 * 27) + '"/>';
    }
    s += txt(72, 38, '日射取得') + num(72, 58, b.solar);
    s += b.solar >= 0.5 ? arrow(58, 66, 122, 214, b.solar, max) : arrow(58, 66, 122, 214, 0, max);

    // 外皮（屋根と壁を貫く矢印）
    s += flow(352, 96, 352, 196, b.env, max);
    s += flow(26, 290, 128, 290, b.env, max);
    s += txt(372, 30, '外皮') + txt(372, 47, '壁・屋根・窓', 'lbl-s') + num(372, 68, b.env);
    s += txt(8, 272, '外皮', 'lbl-s');

    // 換気（右の壁のダクト）
    s += '<rect class="duct" x="362" y="226" width="30" height="12" rx="2"/>';
    s += '<rect class="duct" x="362" y="296" width="30" height="12" rx="2"/>';
    s += flow(472, 232, 352, 232, b.ventS, max);
    s += flow(472, 302, 352, 302, b.ventL, max);
    s += txt(398, 188, '換気・顕熱', 'lbl-s') + num(398, 208, b.ventS);
    s += txt(398, 258, '換気・潜熱', 'lbl-s') + num(398, 278, b.ventL);

    // 合計（屋根裏）
    var tc = signClass(L.total);
    s += txt(240, 112, '合計', 'lbl-s', 'middle');
    s += '<text class="total t-' + tc + '" x="240" y="140" text-anchor="middle">' + signed(L.total) + '</text>';
    s += txt(240, 159, tc === 'hot' ? '冷房が必要' : tc === 'cold' ? '暖房が必要' : '負荷ほぼゼロ', 'lbl-s', 'middle');

    // 屋内・屋外の温湿度
    var cond = function (t, rh) { return fmt(t, 1) + '℃・' + fmt(rh, 0) + '%'; };
    s += '<text class="cond" x="240" y="190" text-anchor="middle"><tspan class="lbl-s">室内　</tspan>' + cond(state.tIn, state.rhIn) +
      '<tspan class="lbl-s">　' + fmt(L.xIn, 1) + ' g/kg</tspan></text>';
    s += txt(8, 332, '屋外', 'lbl-s') + '<text class="cond" x="8" y="352">' + cond(state.tOut, state.rhOut) + '</text>' +
      txt(8, 370, fmt(L.xOut, 1) + ' g/kg', 'lbl-s');

    s += '<g transform="translate(0,26)">';
    // 内部発熱（顕熱）：人・テレビ
    s += txt(180, 192, '内部発熱・顕熱', 'lbl-s', 'middle') + num(180, 212, b.intS, 'middle');
    s += b.intS >= 0 ? arrow(180, 290, 180, 226, b.intS, max) : arrow(180, 226, 180, 290, b.intS, max);
    s += '<circle class="icon" cx="148" cy="300" r="7"/>';
    s += '<path class="icon" d="M148 308 V334 M136 318 H160 M148 334 L139 352 M148 334 L157 352"/>';
    s += '<rect class="icon" x="194" y="306" width="34" height="23" rx="2"/><path class="icon" d="M211 329 V340 M201 342 H221"/>';

    // 内部発熱（潜熱）：洗濯物・浴槽・湯気
    s += txt(296, 192, '内部発熱・潜熱', 'lbl-s', 'middle') + num(296, 212, b.intL, 'middle');
    s += b.intL >= 0 ? arrow(296, 290, 296, 226, b.intL, max) : arrow(296, 226, 296, 290, b.intL, max);
    s += '<path class="icon" d="M258 300 H334"/>';
    [266, 290, 314].forEach(function (x) {
      s += '<path class="icon" d="M' + (x - 6) + ' 300 v14 h14 v-14"/>';
      s += '<path class="drop" d="M' + (x + 1) + ' 318 q-4 6 0 8 q4 -2 0 -8z"/>';
    });
    s += '<path class="icon" d="M262 334 H332 V342 Q332 352 322 352 H272 Q262 352 262 342 Z"/>';
    s += '</g>';

    // 原表のグラフにない項目（0 でないときだけ）
    extras.forEach(function (it, k) {
      var y = 410 + k * 22;
      s += txt(8, y, it.label) + num(150, y, it.value);
    });
    s += '</svg>';
    document.getElementById('house').innerHTML = s;
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
      node.textContent = fmt(v, digits) + (unit ? ' ' + unit : '');
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
    syncInputs();
    document.addEventListener('input', onInput);
    document.addEventListener('change', onInput);
    setupPresets();
    setupIO();
    setupTabs();
    setupView();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
