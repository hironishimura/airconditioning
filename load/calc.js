/*
 * 冷暖房負荷計算エンジン
 * 原表「冷暖房負荷計算シート（基本／輻射暖房）」の数式をそのまま JavaScript に移植したもの。
 * 各計算の横に、対応する Excel のセル番地をコメントで残している。
 * ブラウザでは window.LoadCalc、Node.js では module.exports として使える。
 */
(function (root) {
  'use strict';

  var P_ATM = 1013.25; // 大気圧 [hPa]

  // 飽和水蒸気圧 [hPa]（水面上：Tetens 型近似式。原表と同じ係数）
  function psWater(t) {
    return 6.116441 * Math.pow(10, (7.591386 * t) / (t + 240.7263));
  }
  // 50℃以上で原表が切り替える係数
  function psHigh(t) {
    return 6.004918 * Math.pow(10, (7.337936 * t) / (t + 229.3975));
  }

  // 絶対湿度 [g/kg(DA)]  t:温度[℃]  phi:相対湿度（0～1）
  // 原表 H30/H31/Q2 等の式
  function absHumidity(t, phi) {
    var ps = t < 50 ? psWater(t) : psHigh(t);
    return (0.622 * ps * phi) / (P_ATM - ps * phi) * 1000;
  }

  // 絶対湿度 x[g/kg] と温度 t から相対湿度（0～1）を逆算（原表 P4/P8 の式）
  function rhFromX(t, x) {
    var ps = psWater(t);
    return (P_ATM * x) / (6.22 * ps + (ps / 100) * x) / 100;
  }

  // 比エンタルピーの水蒸気分（原表 H6 の各項）[kJ/kg]  ※大気圧 1013 を使用（原表どおり）
  function latentEnthalpy(t, rhPct) {
    var ps = psWater(t);
    var x = (0.622 * ps * rhPct) / 100 / (1013 - (ps * rhPct) / 100);
    return x * (2501 + 1.805 * t);
  }

  function isNum(v) {
    return typeof v === 'number' && isFinite(v);
  }
  function n(v) {
    return isNum(v) ? v : 0;
  }

  /* ------------------------------------------------------------------
   * 冷暖房負荷（左側の表）
   * ------------------------------------------------------------------ */
  function calcLoad(s) {
    var r = {};
    var tIn = n(s.tIn), rhIn = n(s.rhIn), tOut = n(s.tOut), rhOut = n(s.rhOut);
    var vent = n(s.vent), effS = n(s.effS), effL = n(s.effL);

    // 室内・外気の絶対湿度  H30, H31
    r.xIn = absHumidity(tIn, rhIn / 100);
    r.xOut = absHumidity(tOut, rhOut / 100);

    // 顕熱エンタルピー差  B6 （空気集熱温度が数値なら外気温の代わりに使う）
    var tSrc = isNum(s.tCollect) ? s.tCollect : tOut;
    r.dhS = 1.006 * tSrc - 1.006 * tIn;
    r.dhS_W = r.dhS / 0.83 / 3.6; // D6  [W/(㎥/h)]
    // 潜熱エンタルピー差  H6
    r.dhL = latentEnthalpy(tOut, rhOut) - latentEnthalpy(tIn, rhIn);
    r.dhL_W = r.dhL / 0.83 / 3.6; // J6

    // 換気負荷  E7, K7
    r.ventS = r.dhS_W * vent * (1 - effS / 100);
    r.ventL = r.dhL_W * vent * (1 - effL / 100);
    var latentSign = r.ventL < 0 ? -1 : 1; // K12～K15 の符号切替

    // 人体  E9, K9
    var people = n(s.people);
    r.peopleS = n(s.peopleS) * people;
    r.peopleL = n(s.peopleL) * people;

    // 内部発熱（顕熱） E11～E19
    var sensKeys = ['tv', 'pc', 'cook', 'pcon', 'fridge', 'dish', 'washer', 'light', 'reheat'];
    r.sens = {};
    sensKeys.forEach(function (k) {
      r.sens[k] = n(s[k + 'W']) * n(s[k + 'N']);
    });

    // 内部発熱（潜熱） K11～K15
    r.bathAutoW = calcEvaporation(s).bathW; // Q20
    var bathW = s.bathAuto ? r.bathAutoW : n(s.bathLW);
    r.bathLWUsed = bathW;
    r.lat = {
      dishL: n(s.dishLW) * n(s.dishLN), // K11 は常に正
      dryL: n(s.dryLW) * n(s.dryLN) * latentSign, // K12
      bathL: bathW * n(s.bathLN) * latentSign, // K13
      tankL: n(s.tankLW) * n(s.tankLN) * latentSign, // K14
      envL: n(s.envLW) * n(s.envLN) * latentSign // K15
    };

    // 暖冷気流入  E20 = 風量 × (隣室温度 − 室温) × 0.34
    r.dtNext = n(s.tNext) - tIn; // C20, C21
    r.inflow = n(s.inflowQ) * r.dtNext * 0.34;
    // 間仕切り熱貫流  E21 = 2.5 × 面積 × 温度差
    r.partition = 2.5 * n(s.partitionA) * r.dtNext;
    // 室内干し（顕熱） E22
    r.dryS = (r.lat.dryL > 0 ? -n(s.dryLW) : 0) * n(s.dryLN);

    // 日射取得  E25, E26
    r.solarS = n(s.solarSArea) * n(s.solarSW);
    r.solarEW = n(s.solarEWArea) * n(s.solarEWW);

    // 外皮  C28, E31
    r.dtOut = tOut - tIn;
    r.envelope = Math.round(r.dtOut * n(s.envArea) * n(s.ua));

    // 必要な加湿/除湿量  H8 [L/日]  （プラス：加湿が必要／マイナス：除湿が必要）
    var avgX = (r.xIn + r.xOut) / 2;
    // 原表は AVERAGE(C4+I4) と記述しているため、実際には「室温＋外気温」の和になる（原表どおり再現）
    var tK = tIn + tOut + 273.15;
    var massFlow = vent / (0.00455 * (0.622 + avgX / 1000) * tK); // 乾き空気の質量流量 [kg/h]
    var ventWater = massFlow * Math.abs(r.xIn - r.xOut) * 24 / 1000 * (1 - effL / 100);
    var L = r.lat;
    if (r.xOut > r.xIn) {
      r.humid = -ventWater - people * 1.1 - L.dishL / 200 - L.dryL / 62.5 - L.bathL / 33 - L.tankL / 33 - L.envL / 26.1;
    } else {
      r.humid = ventWater - people * 0.65 - L.dishL / 200 + L.dryL / 62.5 + L.bathL / 33 + L.tankL / 33;
    }
    // 加湿負荷  K8
    var latentHeat = isNum(s.latentHeat) ? s.latentHeat : 678.3;
    r.humidW = r.humid > 0 ? (-r.humid * latentHeat) / 24 : 0;

    // 合計  B32, H32, D33, K33
    var sensInternal = sensKeys.reduce(function (a, k) { return a + r.sens[k]; }, 0);
    r.totalS = r.peopleS + sensInternal + r.inflow + r.partition + r.dryS + r.solarS + r.solarEW + r.ventS + r.envelope;
    var latInternal = L.dishL + L.dryL + L.bathL + L.tankL + L.envL;
    r.totalL = r.ventL + r.humidW + r.peopleL + latInternal;
    r.total = r.totalS + r.totalL;
    r.shf = r.total !== 0 ? r.totalS / r.total : NaN;

    // グラフ用内訳（原表 G19～H24 ＋ 原表のグラフに含まれない 2 項目）
    r.breakdown = [
      { key: 'intL', label: '内部発熱（潜熱）', value: latInternal + r.peopleL }, // H19
      { key: 'ventL', label: '換気（潜熱）', value: r.ventL }, // H20
      { key: 'intS', label: '内部発熱（顕熱）', value: sensInternal + r.inflow + r.partition + r.peopleS }, // H21
      { key: 'ventS', label: '換気（顕熱）', value: r.ventS }, // H22
      { key: 'solar', label: '日射取得', value: r.solarS + r.solarEW }, // H23
      { key: 'env', label: '外皮（窓含む）', value: r.envelope }, // H24
      { key: 'humidW', label: '加湿に使う熱', value: r.humidW, extra: true }, // K8
      { key: 'dryS', label: '室内干し（顕熱）', value: r.dryS, extra: true } // E22
    ];
    return r;
  }

  /* ------------------------------------------------------------------
   * 水面からの蒸発量（原表 基本 O19～Q20）
   * ------------------------------------------------------------------ */
  function calcEvaporation(s) {
    var tIn = n(s.tIn);
    var xIn = absHumidity(tIn, n(s.rhIn) / 100); // Q2
    var tw = tIn + 2; // 水面温度は室温＋2℃と仮定
    var xSat = (0.622 * psWater(tw) * 1) / (P_ATM - psWater(tw)) * 1000;
    var re = (1.2 * n(s.evapWind) * 0.1) / 1.83e-5; // 代表長さ 0.1m のレイノルズ数
    var h = (0.664 * Math.sqrt(re) * Math.pow(0.72, 1 / 3) * 0.0263) / 0.1; // 平板層流の熱伝達率
    var kg = (0.001 * h) / 1.04; // ルイスの関係による物質伝達率
    var water = kg * (xSat - xIn) * n(s.evapArea) * 3.6 * 24; // O20
    return { xSat: xSat, xIn: xIn, water: water, bathW: water * 33 }; // Q20
  }

  /* ------------------------------------------------------------------
   * エアコンの吸込み・吹出し（原表 基本 N2～Q18）
   * ------------------------------------------------------------------ */
  function calcAircon(s, load) {
    var r = {};
    var tIn = n(s.tIn), tOut = n(s.tOut), vent = n(s.vent);
    var effS = n(s.effS), effL = n(s.effL);
    var xIn = load.xIn, xOut = load.xOut;

    // 風量  O12
    var L = n(s.ductL), S = n(s.ductS), D = n(s.ductD), v = n(s.vel);
    r.round = L === 0;
    r.airflow = r.round ? v * 3600 * Math.pow(D / 1000, 2) * Math.PI / 4 : L * S * v * 3600;

    // 室内空気  O2～Q2
    r.room = { q: r.airflow - vent, t: tIn, rh: n(s.rhIn) / 100, x: xIn };
    // 換気（外気）  O3～Q3
    var oaT = effS === 0 ? tOut : tOut - (tOut - tIn) * (1 - effS / 100);
    var oaRh;
    var xMix = xOut - (xOut - xIn) * (1 - effL / 100);
    if (effL === 0) oaRh = n(s.rhOut) / 100;
    else oaRh = rhFromX(oaT, xMix);
    r.oa = { q: vent, t: oaT, rh: oaRh, x: absHumidity(oaT, oaRh) };
    // 混合気  O4～Q4
    var qSum = r.room.q + r.oa.q;
    var mixT = (r.room.q / qSum) * r.room.t + (r.oa.q / qSum) * r.oa.t;
    var mixX = (r.room.q / qSum) * r.room.x + (r.oa.q / qSum) * r.oa.x;
    r.mix = { t: mixT, x: mixX, rh: rhFromX(mixT, mixX) };

    // 吸込み空気  O7～Q7
    var inT = s.acSource === 'room' ? tIn : mixT;
    var inRh = tIn === inT ? n(s.rhIn) / 100 : r.mix.rh;
    r.intake = { t: inT, rh: inRh, x: absHumidity(inT, inRh) };
    // 吹出し空気  O8～Q8 （暖房は絶対湿度一定、冷房は相対湿度100％）
    var supT = n(s.tSupply);
    var supRh = inT < supT ? rhFromX(supT, r.intake.x) : 1;
    r.supply = { t: supT, rh: supRh, x: absHumidity(supT, supRh) };
    r.heating = inT < supT;

    // 到達距離・降下量  N13, P13, Q13
    var vt = n(s.vTerm);
    r.reach = L > 0 ? (v * 4.3 * S) / vt : (v * 5 * D / 1000) / vt;
    var k = L > 0 ? 4.3 : 5;
    r.drop = (0.42 * (9.8 / 300 * (tIn - supT) * S / (v * v))) / k * Math.pow(r.reach / S, 3) * S;

    // 能力  O15～Q18
    var hIn = r.intake.x * (2501 + 1.805 * r.intake.t);
    var hSup = r.supply.x * (2501 + 1.805 * r.supply.t);
    r.capS = 1.006 * Math.abs(r.intake.t - supT) / 3.6 * r.airflow / 0.83;
    r.capL = Math.abs(hIn - hSup) / 3600 * r.airflow / 0.83;
    r.capT = r.capS + r.capL;
    var sPerKg = 1.006 * Math.abs(r.intake.t - supT) / 3.6;
    r.shf = sPerKg / (Math.abs(hIn - hSup) / 3600 + sPerKg);
    r.energy = r.capT * n(s.hours) / 1000; // kWh
    r.water = Math.abs(r.intake.x - r.supply.x) / 0.86 * r.airflow * n(s.hours) / 1000; // L
    return r;
  }

  /* ------------------------------------------------------------------
   * 2つの空気の比較（原表 輻射暖房 N12～Q23）
   * ------------------------------------------------------------------ */
  function calcAirCompare(s) {
    var r = {};
    r.a1 = { t: n(s.a1T), rh: n(s.a1RH), x: absHumidity(n(s.a1T), n(s.a1RH) / 100) };
    r.a2 = { t: n(s.a2T), rh: n(s.a2RH), x: absHumidity(n(s.a2T), n(s.a2RH) / 100) };
    var L = n(s.ductL2), S = n(s.ductS2), D = n(s.ductD2), v = n(s.vel2);
    r.round = L === 0;
    r.airflow = r.round ? v * 3600 * Math.pow(D / 1000, 2) * Math.PI / 4 : L * S * v * 3600; // O18
    var dT = Math.abs(r.a1.t - r.a2.t);
    var dH = Math.abs(r.a1.x * (2501 + 1.805 * r.a1.t) - r.a2.x * (2501 + 1.805 * r.a2.t));
    r.dS = 1.006 * dT / 3.6 * r.airflow; // O20
    r.dL = dH / 3600 * r.airflow; // Q20
    r.dT = r.dS + r.dL; // O21
    r.shf = (1.006 * dT / 3.6) / (dH / 3600 + 1.006 * dT / 3.6); // Q21
    r.energy = r.dT * n(s.hours2) / 1000; // Q22
    r.water = Math.abs(r.a1.x - r.a2.x) / 0.86 * r.airflow * n(s.hours2) / 1000; // Q23
    return r;
  }

  /* ------------------------------------------------------------------
   * 床下温水配管（原表 輻射暖房 N1～P10）
   * ------------------------------------------------------------------ */
  function calcPipe(s) {
    var r = {};
    var dO = n(s.pipeOD), dI = n(s.pipeID);
    // 1m あたりの熱通過率  P6 [W/(m・K)]
    r.perM = 1 / ((1 / (n(s.hIn) * dI / 1000) + Math.log(dO / dI) / n(s.lambda) + 1 / (n(s.hOut) * dO / 1000)) / (Math.PI * 2));
    r.dT = n(s.tWater) - n(s.tAir);
    r.heat = r.perM * n(s.pipeLen) * r.dT; // P10
    return r;
  }

  /* ------------------------------------------------------------------
   * 床ガラリ・基礎の熱収支（原表 輻射暖房 N25～Q28）
   * ------------------------------------------------------------------ */
  function calcFloor(s) {
    var r = {};
    r.toRoom = n(s.floorA) * n(s.floorU) * (n(s.tUnder) - n(s.tIn)); // O28
    r.loss = (n(s.tOut) - n(s.tUnder)) * n(s.psi) * n(s.foundLen); // Q28
    return r;
  }

  function calcAll(s) {
    var load = calcLoad(s);
    return {
      load: load,
      evap: calcEvaporation(s),
      ac: calcAircon(s, load),
      air: calcAirCompare(s),
      pipe: calcPipe(s),
      floor: calcFloor(s)
    };
  }

  var api = {
    absHumidity: absHumidity,
    rhFromX: rhFromX,
    calcLoad: calcLoad,
    calcEvaporation: calcEvaporation,
    calcAircon: calcAircon,
    calcAirCompare: calcAirCompare,
    calcPipe: calcPipe,
    calcFloor: calcFloor,
    calcAll: calcAll
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LoadCalc = api;
})(this);
