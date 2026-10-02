// Excel 原表のキャッシュ値と計算エンジンの結果を照合するテスト
// 実行: node test/calc.test.js
const C = require('../load/calc.js');
const P = require('../load/presets.js');
let fail = 0, pass = 0;
function eq(label, got, want) {
  const ok = Math.abs(got - want) <= 1e-6 * Math.max(1, Math.abs(want));
  if (ok) pass++; else { fail++; console.log('NG', label, 'got', got, 'want', want); }
}
// 原表「基本」
{
  const s = P.build('basic');
  const r = C.calcAll(s), L = r.load, A = r.ac;
  eq('H30', L.xIn, 6.525953448016198); eq('H31', L.xOut, 3.463376785413751);
  eq('B6', L.dhS, -20.12); eq('H6', L.dhL, -7.82203521390637);
  eq('E7', L.ventS, -0.06733601070950469); eq('K7', L.ventL, -0.02617816336648718);
  eq('H8', L.humid, -5.845133085688049); eq('K8', L.humidW, 0);
  eq('K13', L.lat.bathL, -192.9172545491955); eq('Q20', r.evap.bathW, 192.9172545491955);
  eq('O20', r.evap.water, 5.845977410581682);
  eq('E20', L.inflow, 20.4); eq('E21', L.partition, 55); eq('E31', L.envelope, -55);
  eq('B32', L.totalS, 20.332663989290495); eq('H32', L.totalL, -192.943432712562);
  eq('D33', L.total, -172.6107687232715); eq('K33', L.shf, -0.11779487537007437);
  eq('H19', L.breakdown[0].value, -192.9172545491955); eq('H21', L.breakdown[2].value, 75.4);
  eq('O12', A.airflow, 864); eq('N2', A.room.q, 863.99);
  eq('O3', A.oa.t, 12); eq('P3', A.oa.rh, 0.4); eq('Q3', A.oa.x, 3.4633767854137516);
  eq('O4', A.mix.t, 19.999907407407406); eq('P4', A.mix.rh, 0.4500001603108042); eq('Q4', A.mix.x, 6.525918001527049);
  eq('P7', A.intake.rh, 0.4500001603108042); eq('Q7', A.intake.x, 6.525918001527049);
  eq('P8', A.supply.rh, 0.2783235750576966); eq('Q8', A.supply.x, 6.5259180015270495);
  eq('P13', A.reach, 2.58); eq('Q13', A.drop, -0.48707097600000004);
  eq('O15', A.capS, 2327.1594645247665); eq('Q15', A.capL, 27.248774925198447);
  eq('O16', A.capT, 2354.408239449965); eq('Q16', A.shf, 0.9884264867627357);
  eq('Q17', A.energy, 2.354408239449965);
}
// 原表「輻射暖房」
{
  const s = P.build('radiant');
  const r = C.calcAll(s), L = r.load;
  eq('H30', L.xIn, 9.055128027563065); eq('H31', L.xOut, 4.311758630378105);
  eq('B6', L.dhS, -14.084); eq('H6', L.dhL, -12.16354942729105);
  eq('E7', L.ventS, -214.93654618473897); eq('K7', L.ventL, -288.2126169518763);
  eq('H8', L.humid, 3.1142916195966093); eq('K8', L.humidW, -81.43872585245133);
  eq('H19', L.breakdown[0].value, -273); eq('H21', L.breakdown[2].value, 354);
  eq('H23', L.breakdown[4].value, 247.5); eq('E31', L.envelope, -1274);
  eq('B32', L.totalS, -887.436546184739); eq('H32', L.totalL, -642.6513428043277);
  eq('D33', L.total, -1530.0878889890666); eq('K33', L.shf, 0.5799905695424272);
  eq('P6', r.pipe.perM, 0.7031151124337591); eq('P10', r.pipe.heat, 2109.3453373012776);
  eq('Q13', r.air.a1.x, 6.891112709447067); eq('Q14', r.air.a2.x, 6.98365693973787);
  eq('O18', r.air.airflow, 253.8); eq('O20', r.air.dS, 921.999); eq('Q20', r.air.dL, 28.129469081033168);
  eq('O21', r.air.dT, 950.1284690810331); eq('Q21', r.air.shf, 0.9703940361788759);
  eq('Q22', r.air.energy, 22.803083257944795); eq('Q23', r.air.water, 0.6554714134271359);
  eq('O28', r.floor.toRoom, 1200); eq('Q28', r.floor.loss, -211.2);
}
console.log(`pass ${pass} / fail ${fail}`);
process.exit(fail ? 1 : 0);
