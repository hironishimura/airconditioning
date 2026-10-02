/*
 * 入力値のプリセット（原表の各シートに入っていた数値）
 */
(function (root) {
  'use strict';

  // 補助計算（エアコン吹出・空気比較・配管・床下）の初期値。どのプリセットでも共通。
  var tools = {
    // エアコン吹出（原表 基本）
    acSource: 'mix', tSupply: 28, ductL: 0.8, ductS: 0.1, ductD: 100, vel: 3, hours: 1, vTerm: 0.5,
    // 水面からの蒸発（原表 基本）
    evapWind: 0.3, evapArea: 1,
    // 空気の比較（原表 輻射暖房）
    a1T: 22, a1RH: 42, a2T: 35, a2RH: 20, ductL2: 0.47, ductS2: 0.075, ductD2: 0, vel2: 2, hours2: 24,
    // 床下温水配管（原表 輻射暖房）
    pipeOD: 13, pipeID: 10, hIn: 4000, hOut: 9.3, lambda: 0.41, pipeLen: 120, tWater: 50, tAir: 25,
    // 床ガラリ・基礎（原表 輻射暖房）
    floorA: 50, floorU: 3, tUnder: 30, psi: 0.3, foundLen: 32
  };

  var presets = {
    basic: {
      name: '原表「基本」シートの値（夏・家全体・昼）',
      values: {
        season: '夏', place: '家全体', time: '昼',
        tNext: 22, tCollect: 0, tIn: 20, rhIn: 45, tOut: 12, rhOut: 40,
        vent: 0.01, effS: 0, effL: 0, latentHeat: 678.3,
        peopleS: 60, people: 0, peopleL: 30,
        tvW: 100, tvN: 0, pcW: 60, pcN: 0, cookW: 600, cookN: 0, pconW: 300, pconN: 0,
        fridgeW: 70, fridgeN: 0, dishW: 200, dishN: 0, washerW: 500, washerN: 0,
        lightW: 8, lightN: 0, reheatW: 400, reheatN: 0,
        inflowQ: 30, partitionA: 11,
        dishLW: 50, dishLN: 0, dryLW: 200, dryLN: 0, bathAuto: true, bathLW: 100, bathLN: 1,
        tankLW: 50, tankLN: 0, envLW: 0, envLN: 0,
        solarSW: 0, solarSArea: 8, solarEWW: 0, solarEWArea: 1.8,
        envArea: 13.7, ua: 0.5
      }
    },
    radiant: {
      name: '原表「輻射暖房」シートの値（冬・家全体・季節平均）',
      values: {
        season: '冬', place: '家全体', time: '季節平均',
        tNext: 22, tCollect: null, tIn: 22, rhIn: 55, tOut: 8, rhOut: 65,
        vent: 120, effS: 62, effL: 41, latentHeat: 627.6,
        peopleS: 60, people: 2, peopleL: 30,
        tvW: 100, tvN: 1, pcW: 60, pcN: 1, cookW: 600, cookN: 0, pconW: 400, pconN: 0,
        fridgeW: 50, fridgeN: 1, dishW: 200, dishN: 0, washerW: 500, washerN: 0,
        lightW: 8, lightN: 3, reheatW: 1200, reheatN: 0,
        inflowQ: 15, partitionA: 10,
        dishLW: 50, dishLN: 1, dryLW: 100, dryLN: 1, bathAuto: false, bathLW: 100, bathLN: 1,
        tankLW: 50, tankLN: 0, envLW: 183, envLN: 1,
        solarSW: 20, solarSArea: 12, solarEWW: 15, solarEWArea: 0.5,
        envArea: 350, ua: 0.26
      }
    },
    blank: {
      name: '空欄（手計算用・すべて0）',
      values: {
        season: '', place: '', time: '',
        tNext: 0, tCollect: null, tIn: 0, rhIn: 0, tOut: 0, rhOut: 0,
        vent: 0, effS: 0, effL: 0, latentHeat: 678.3,
        peopleS: 0, people: 0, peopleL: 0,
        tvW: 0, tvN: 0, pcW: 0, pcN: 0, cookW: 0, cookN: 0, pconW: 0, pconN: 0,
        fridgeW: 0, fridgeN: 0, dishW: 0, dishN: 0, washerW: 0, washerN: 0,
        lightW: 0, lightN: 0, reheatW: 0, reheatN: 0,
        inflowQ: 0, partitionA: 0,
        dishLW: 0, dishLN: 0, dryLW: 0, dryLN: 0, bathAuto: false, bathLW: 0, bathLN: 0,
        tankLW: 0, tankLN: 0, envLW: 0, envLN: 0,
        solarSW: 0, solarSArea: 0, solarEWW: 0, solarEWArea: 0,
        envArea: 0, ua: 0
      }
    }
  };

  function build(key) {
    var out = {};
    Object.keys(tools).forEach(function (k) { out[k] = tools[k]; });
    var v = presets[key].values;
    Object.keys(v).forEach(function (k) { out[k] = v[k]; });
    return out;
  }

  var api = { presets: presets, tools: tools, build: build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LoadPresets = api;
})(this);
