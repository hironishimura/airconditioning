// node test/psychro.test.js
'use strict';
var assert = require('assert');
var Psy = require('../js/psychro.js');

var P = Psy.STD_P;
var failures = 0;

function near(actual, expected, tol, label) {
  try {
    assert.ok(Math.abs(actual - expected) <= tol,
      label + ': ' + actual + ' (期待値 ' + expected + ' ± ' + tol + ')');
    console.log('  ok  ' + label);
  } catch (e) {
    failures++;
    console.log('  NG  ' + e.message);
  }
}

console.log('飽和水蒸気圧 (ASHRAE 表 3)');
near(Psy.satPressure(0), 0.61121, 0.0005, 'ps(0°C)');
near(Psy.satPressure(20), 2.3392, 0.001, 'ps(20°C)');
near(Psy.satPressure(25), 3.1699, 0.001, 'ps(25°C)');
near(Psy.satPressure(40), 7.3849, 0.003, 'ps(40°C)');
near(Psy.satPressure(-10), 0.25987, 0.0005, 'ps(-10°C, 氷面)');

console.log('飽和絶対湿度（理想気体、増加係数なし）');
near(Psy.satHumRatio(20, P), 0.014699, 0.00002, 'xs(20°C)');
near(Psy.satHumRatio(30, P), 0.027210, 0.00004, 'xs(30°C)');

console.log('大気圧');
near(Psy.pressureFromAltitude(0), 101.325, 1e-9, 'P(0 m)');
near(Psy.pressureFromAltitude(1000), 89.875, 0.01, 'P(1000 m)');
near(Psy.altitudeFromPressure(89.875), 1000, 1, 'z(89.875 kPa)');

console.log('状態量');
var s = Psy.solve('db-rh', 26, 50, P);
var st = Psy.stateTX(s.t, s.x, P);
near(st.x * 1000, 10.5, 0.05, '26°C 50% x [g/kg]');
near(st.h, 52.9, 0.15, '26°C 50% h');
near(st.tw, 18.7, 0.1, '26°C 50% 湿球');
near(st.td, 14.8, 0.1, '26°C 50% 露点');
near(st.v, 0.8617, 0.001, '26°C 50% v');

console.log('逆算の整合');
var modes = [
  ['db-wb', st.t, st.tw],
  ['db-x', st.t, st.x * 1000],
  ['db-dp', st.t, st.td],
  ['db-h', st.t, st.h],
  ['h-x', st.h, st.x * 1000],
  ['wb-rh', st.tw, st.rh * 100],
  ['h-rh', st.h, st.rh * 100]
];
modes.forEach(function (m) {
  var r = Psy.solve(m[0], m[1], m[2], P);
  near(r.t, st.t, 1e-4, m[0] + ' → t');
  near(r.x, st.x, 1e-7, m[0] + ' → x');
});

console.log('混合');
var a = { t: 35, x: 0.020 }, b = { t: 26, x: 0.0105 };
var m = Psy.mix(a, 3, b, 7);
near(m.x, 0.01335, 1e-6, '混合 x');
near(Psy.enthalpy(m.t, m.x),
  0.3 * Psy.enthalpy(a.t, a.x) + 0.7 * Psy.enthalpy(b.t, b.x), 1e-9, '混合 h');

console.log('SHF 線');
var adp = Psy.shfLine(26, st.x, 0.8, P);
near(Psy.relHumidity(adp.t, adp.x, P), 1, 1e-4, 'ADP は飽和曲線上');
var load = Psy.processLoad({ t: 26, x: st.x }, adp, 1000, P);
near(load.shf, 0.8, 0.02, 'ADP までの SHF ≒ 0.8');

console.log('例外');
assert.throws(function () { Psy.solve('db-rh', 20, 120, P); });
assert.throws(function () { Psy.solve('db-wb', 20, 25, P); });
console.log('  ok  過飽和・不正入力で例外');

if (failures) {
  console.log('\n' + failures + ' 件失敗');
  process.exit(1);
}
console.log('\nすべて成功');
