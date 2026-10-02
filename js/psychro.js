/*
 * psychro.js — 湿り空気の状態量計算（SI 単位）
 *
 * 出典: ASHRAE Handbook — Fundamentals (2017) Chapter 1 Psychrometrics
 *   - 飽和水蒸気圧: Hyland–Wexler 式 (式 5, 6)
 *   - 湿球温度: 式 33/35
 *   - 標準大気圧の高度補正: 式 3
 *
 * 単位:
 *   温度 t [°C], 絶対湿度 x [kg/kg(DA)], 圧力 P [kPa],
 *   比エンタルピー h [kJ/kg(DA)], 比容積 v [m³/kg(DA)], 相対湿度 rh [0..1]
 *
 * ブラウザではグローバル `Psy`、Node では module.exports として公開する。
 */
(function (root) {
  'use strict';

  var EPS = 0.621945;          // 水蒸気と乾き空気の分子量比
  var RDA = 0.287042;          // 乾き空気のガス定数 [kJ/(kg·K)]
  var STD_P = 101.325;         // 標準大気圧 [kPa]

  function bisect(f, lo, hi, tol, maxIter) {
    tol = tol || 1e-9;
    maxIter = maxIter || 200;
    var flo = f(lo);
    for (var i = 0; i < maxIter; i++) {
      var mid = (lo + hi) / 2;
      var fm = f(mid);
      if ((fm > 0) === (flo > 0)) { lo = mid; flo = fm; } else { hi = mid; }
      if (hi - lo < tol) break;
    }
    return (lo + hi) / 2;
  }

  /** 飽和水蒸気圧 [kPa]（0 °C 未満は氷面） */
  function satPressure(t) {
    var T = t + 273.15;
    var ln;
    if (t >= 0) {
      ln = -5.8002206e3 / T + 1.3914993 - 4.8640239e-2 * T + 4.1764768e-5 * T * T
        - 1.4452093e-8 * T * T * T + 6.5459673 * Math.log(T);
    } else {
      ln = -5.6745359e3 / T + 6.3925247 - 9.677843e-3 * T + 6.2215701e-7 * T * T
        + 2.0747825e-9 * T * T * T - 9.484024e-13 * T * T * T * T + 4.1635019 * Math.log(T);
    }
    return Math.exp(ln) / 1000;
  }

  /** 標高 z [m] から大気圧 [kPa] */
  function pressureFromAltitude(z) {
    return STD_P * Math.pow(1 - 2.25577e-5 * z, 5.2559);
  }

  /** 大気圧 [kPa] から標高 [m] */
  function altitudeFromPressure(P) {
    return (1 - Math.pow(P / STD_P, 1 / 5.2559)) / 2.25577e-5;
  }

  function humRatioFromPw(pw, P) { return EPS * pw / (P - pw); }
  function pwFromHumRatio(x, P) { return P * x / (EPS + x); }
  function satHumRatio(t, P) { return humRatioFromPw(satPressure(t), P); }

  /** 比エンタルピー [kJ/kg(DA)] */
  function enthalpy(t, x) { return 1.006 * t + x * (2501 + 1.86 * t); }

  /** h と x から乾球温度 */
  function tFromHX(h, x) { return (h - 2501 * x) / (1.006 + 1.86 * x); }

  /** 比容積 [m³/kg(DA)] */
  function volume(t, x, P) { return RDA * (t + 273.15) * (1 + 1.607858 * x) / P; }

  /** v と x から乾球温度 */
  function tFromVX(v, x, P) { return v * P / (RDA * (1 + 1.607858 * x)) - 273.15; }

  /** 相対湿度 [0..1] */
  function relHumidity(t, x, P) { return pwFromHumRatio(x, P) / satPressure(t); }

  function humRatioFromRH(t, rh, P) { return humRatioFromPw(rh * satPressure(t), P); }

  /** 露点温度 [°C] */
  function dewPoint(x, P) {
    if (x <= 0) return -Infinity;
    var pw = pwFromHumRatio(x, P);
    return bisect(function (t) { return satPressure(t) - pw; }, -100, 200, 1e-7);
  }

  /** 乾球温度 t と湿球温度 tw から絶対湿度 */
  function humRatioFromWetBulb(t, tw, P) {
    var xs = satHumRatio(tw, P);
    if (tw >= 0) {
      return ((2501 - 2.326 * tw) * xs - 1.006 * (t - tw)) / (2501 + 1.86 * t - 4.186 * tw);
    }
    return ((2830 - 0.24 * tw) * xs - 1.006 * (t - tw)) / (2830 + 1.86 * t - 2.1 * tw);
  }

  /** 湿球温度 [°C] */
  function wetBulb(t, x, P) {
    var lo = x > 0 ? dewPoint(x, P) - 1 : -100;
    return bisect(function (tw) { return humRatioFromWetBulb(t, tw, P) - x; }, lo, t + 1e-6, 1e-7);
  }

  /** 湿球温度 tw の線と x=0 の交点の乾球温度 */
  function wetBulbLineEnd(tw, P) {
    var xs = satHumRatio(tw, P);
    if (tw >= 0) return tw + (2501 - 2.326 * tw) * xs / 1.006;
    return tw + (2830 - 0.24 * tw) * xs / 1.006;
  }

  /** (t, x) から全状態量 */
  function stateTX(t, x, P) {
    var pw = pwFromHumRatio(x, P);
    var ps = satPressure(t);
    var v = volume(t, x, P);
    return {
      t: t,
      x: x,
      rh: pw / ps,
      tw: wetBulb(t, x, P),
      td: dewPoint(x, P),
      h: enthalpy(t, x),
      v: v,
      rho: (1 + x) / v,
      pw: pw,
      ps: ps,
      xs: humRatioFromPw(ps, P)
    };
  }

  /**
   * 2 つの状態量から (t, x) を求める。
   * mode: 'db-rh' | 'db-wb' | 'db-x' | 'db-dp' | 'db-h' | 'wb-rh' | 'h-rh' | 'h-x'
   * a, b はそれぞれの値（rh は %、x は g/kg(DA)）。
   * 戻り値 {t, x} または例外。
   */
  function solve(mode, a, b, P) {
    var t, x;
    switch (mode) {
      case 'db-rh': t = a; x = humRatioFromRH(t, b / 100, P); break;
      case 'db-wb':
        if (b > a + 1e-9) throw new Error('湿球温度が乾球温度を超えています');
        t = a; x = humRatioFromWetBulb(t, b, P); break;
      case 'db-x': t = a; x = b / 1000; break;
      case 'db-dp':
        if (b > a + 1e-9) throw new Error('露点温度が乾球温度を超えています');
        t = a; x = satHumRatio(b, P); break;
      case 'db-h': t = a; x = (b - 1.006 * t) / (2501 + 1.86 * t); break;
      case 'h-x': x = b / 1000; t = tFromHX(a, x); break;
      case 'wb-rh':
        // 湿球温度一定線上で RH が b になる乾球温度を探す
        t = bisect(function (tt) {
          return relHumidity(tt, humRatioFromWetBulb(tt, a, P), P) - b / 100;
        }, a, wetBulbLineEnd(a, P), 1e-7);
        x = humRatioFromWetBulb(t, a, P);
        break;
      case 'h-rh':
        t = bisect(function (tt) {
          var xx = (a - 1.006 * tt) / (2501 + 1.86 * tt);
          return relHumidity(tt, xx, P) - b / 100;
        }, -60, tFromHX(a, 0), 1e-7);
        x = (a - 1.006 * t) / (2501 + 1.86 * t);
        break;
      default: throw new Error('未対応の入力モード: ' + mode);
    }
    if (!isFinite(t) || !isFinite(x)) throw new Error('計算できませんでした');
    if (x < -1e-9) throw new Error('絶対湿度が負になります（入力値を確認してください）');
    if (x > satHumRatio(t, P) * 1.0005) throw new Error('過飽和（相対湿度 100% 超）の状態です');
    return { t: t, x: Math.max(0, x) };
  }

  /** 2 状態の質量流量比による混合（m1, m2 は乾き空気質量流量） */
  function mix(s1, m1, s2, m2) {
    var m = m1 + m2;
    var x = (s1.x * m1 + s2.x * m2) / m;
    var h = (enthalpy(s1.t, s1.x) * m1 + enthalpy(s2.t, s2.x) * m2) / m;
    return { t: tFromHX(h, x), x: x };
  }

  /**
   * 状態変化の熱量。
   * flow: 風量 [m³/h]（入口側の比容積で質量流量に換算）
   */
  function processLoad(s1, s2, flow, P) {
    var h1 = enthalpy(s1.t, s1.x), h2 = enthalpy(s2.t, s2.x);
    var dh = h2 - h1;
    // 顕熱分: x を入口側一定として温度変化分、潜熱分: 残り
    var hs = enthalpy(s2.t, s1.x) - h1;
    var hl = dh - hs;
    var r = {
      dt: s2.t - s1.t,
      dx: s2.x - s1.x,
      dh: dh,
      dhs: hs,
      dhl: hl,
      shf: Math.abs(dh) > 1e-9 ? hs / dh : NaN
    };
    if (flow > 0) {
      var G = flow / volume(s1.t, s1.x, P) / 3600;   // kg(DA)/s
      r.mass = G * 3600;                              // kg(DA)/h
      r.q = G * dh;                                   // kW
      r.qs = G * hs;
      r.ql = G * hl;
      r.water = G * 3600 * r.dx;                      // kg/h
    }
    return r;
  }

  /**
   * 点 (t0, x0) から SHF 一定線を冷却方向へ引き、飽和曲線との交点（装置露点）を返す。
   */
  function shfLine(t0, x0, shf, P) {
    // 微小変化: hs = cp·dt, hl = r0·dx, shf = hs/(hs+hl)
    var cp = 1.006 + 1.86 * x0;
    var k = cp * (1 / shf - 1) / (2501 + 1.86 * t0); // dx/dt
    var f = function (dt) {
      var t = t0 - dt, x = x0 - k * dt;
      return x - satHumRatio(t, P);
    };
    if (f(0) >= 0) return { t: t0, x: x0, slope: k };
    var hi = 0.5;
    while (f(hi) < 0 && hi < 200) hi *= 2;
    if (f(hi) < 0) return null;
    var dt = bisect(f, 0, hi, 1e-7);
    return { t: t0 - dt, x: x0 - k * dt, slope: k };
  }

  var Psy = {
    STD_P: STD_P,
    bisect: bisect,
    satPressure: satPressure,
    pressureFromAltitude: pressureFromAltitude,
    altitudeFromPressure: altitudeFromPressure,
    humRatioFromPw: humRatioFromPw,
    pwFromHumRatio: pwFromHumRatio,
    satHumRatio: satHumRatio,
    enthalpy: enthalpy,
    tFromHX: tFromHX,
    volume: volume,
    tFromVX: tFromVX,
    relHumidity: relHumidity,
    humRatioFromRH: humRatioFromRH,
    dewPoint: dewPoint,
    humRatioFromWetBulb: humRatioFromWetBulb,
    wetBulb: wetBulb,
    wetBulbLineEnd: wetBulbLineEnd,
    stateTX: stateTX,
    solve: solve,
    mix: mix,
    processLoad: processLoad,
    shfLine: shfLine
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = Psy;
  else root.Psy = Psy;
})(this);
