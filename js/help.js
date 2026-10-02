/*
 * help.js — 各枠の「?」ボタンで説明をポップアップ表示する
 * 使い方: <button class="help-btn" data-help="キー">?</button>
 */
(function () {
  'use strict';

  var HELP = {
    point: {
      title: '状態点の追加',
      body:
        '<p>湿り空気の状態は、<b>独立した 2 つの状態量</b>を決めると 1 点に定まります。測った値や設計条件に合わせて組み合わせを選んでください。</p>' +
        '<ul>' +
        '<li><b>乾球温度 + 相対湿度</b>: 設計条件（例: 室内 26 °C・50 %）で最もよく使います。</li>' +
        '<li><b>乾球温度 + 湿球温度</b>: 乾湿計（アスマン通風乾湿計など）の読みから求めるときに使います。</li>' +
        '<li><b>乾球温度 + 露点温度</b>: 露点計の値や、結露条件から逆算するときに使います。</li>' +
        '<li><b>比エンタルピー系</b>: 熱量計算の結果から状態を戻すときに使います。</li>' +
        '</ul>' +
        '<p>名称を空欄にすると A, B, C… が自動で付きます。同じ名前があるときは末尾に番号が付きます。</p>' +
        '<p><b>線図クリックで点を追加</b>にチェックを入れると、線図上をクリックした位置に点を置けます。置いた点はドラッグで移動できます。</p>' +
        '<p>一覧の行または点をクリックすると選択状態になり、入力欄に値が入ります。値を直して<b>選択中の点を更新</b>を押すと書き換わります。</p>' +
        '<p class="help-note">相対湿度 100 % を超える（過飽和の）組み合わせはエラーになります。</p>'
    },
    proc: {
      title: '状態変化（熱量計算）',
      body:
        '<p>始点から終点への状態変化を矢印で描き、その変化に必要な熱量を計算します。</p>' +
        '<ul>' +
        '<li><b>全熱</b> = 乾き空気の質量流量 × 比エンタルピー差 Δh</li>' +
        '<li><b>質量流量</b> = 風量 ÷ 始点の比容積</li>' +
        '<li><b>顕熱</b>: 絶対湿度を始点の値に固定したまま、温度だけが変わる分の熱量</li>' +
        '<li><b>潜熱</b>: 全熱から顕熱を引いた残り（水分量の変化に伴う熱量）</li>' +
        '<li><b>SHF</b>（顕熱比）= 顕熱 ÷ 全熱</li>' +
        '<li><b>水分量</b> = 質量流量 × Δx。負の値は除湿量で、冷却コイルのドレン量の目安になります。</li>' +
        '</ul>' +
        '<p>符号は、負が冷却・除湿、正が加熱・加湿です。</p>' +
        '<p class="help-note">例: 混合空気 MA → コイル出口 SA を風量 10,000 m³/h で結ぶと、冷却コイルの能力（全熱・顕熱・潜熱）が求まります。</p>'
    },
    mix: {
      title: '混合',
      body:
        '<p>2 つの空気（例: 外気 OA と還気 RA）を混ぜたときの状態点を求めます。</p>' +
        '<p>混合点は 2 点を結ぶ直線上にあり、<b>質量流量の逆比</b>で内分した位置になります（てこの原理）。' +
        '比エンタルピーと絶対湿度は、それぞれ質量流量で加重平均した値です。</p>' +
        '<p>入力した風量 [m³/h] はそれぞれの比容積で質量流量に換算するため、混合比は体積比とわずかに異なります。一覧の混合線の行に質量流量比を表示します。</p>' +
        '<p class="help-note">外気導入率を検討するときは、外気の風量を変えて混合点の動きを確認してください。</p>'
    },
    shf: {
      title: 'SHF 線・装置露点',
      body:
        '<p><b>SHF</b>（顕熱比）は、室内の顕熱負荷 ÷ 全熱負荷です。</p>' +
        '<p>室内の状態点からこの傾きの線（SHF 線）を引きます。吹出空気の状態がこの線上にあれば、室内を設計条件に保てます。</p>' +
        '<p>SHF 線と飽和曲線の交点が<b>装置露点（ADP）</b>です。冷却コイルを通った空気は、この点に向かって変化します。' +
        '実際のコイル出口は、コイルに触れずに通り抜ける空気（バイパスファクタ）の分だけ、ADP より室内側に寄ります。</p>' +
        '<p class="help-note">潜熱負荷が大きい（SHF が小さい）ほど ADP は低くなります。コイルだけで処理しきれないときは、再熱や除湿機の併用を検討します。</p>'
    },
    settings: {
      title: '線図の設定',
      body:
        '<p><b>標高・大気圧</b>: どちらか一方を入力すると、もう一方を自動で換算します。' +
        '気圧が下がると、同じ温度・相対湿度でも絶対湿度と比容積が大きくなります（空気が薄くなる）。' +
        '標高 1,000 m で約 89.9 kPa です。高地の建物を検討するときに設定してください。</p>' +
        '<p><b>表示範囲</b>: 横軸の温度範囲と、縦軸の絶対湿度の上限を変えられます。冬期の検討では温度下限を下げると見やすくなります。</p>' +
        '<p><b>表示する線</b>: 線が混み合って読みにくいときは、使わない線を非表示にしてください。' +
        'SVG・PNG の書き出しや印刷にも反映されます。</p>'
    },
    chart: {
      title: '空気線図の読み方',
      body:
        '<ul>' +
        '<li><b>横軸</b>: 乾球温度 [°C]（縦の細線）</li>' +
        '<li><b>縦軸（右）</b>: 絶対湿度 [g/kg(DA)]。乾き空気 1 kg あたりの水蒸気量です（横の細線）。</li>' +
        '<li><b>太い曲線</b>: 飽和曲線（相対湿度 100 %）。曲線上の数字は、その点の露点温度（＝湿球温度）です。</li>' +
        '<li><b>青の曲線</b>: 相対湿度一定の線（10 % ごと）</li>' +
        '<li><b>緑の斜線</b>: 湿球温度一定の線</li>' +
        '<li><b>赤の斜線</b>: 比エンタルピー一定の線。目盛は飽和曲線の外側にあります。</li>' +
        '<li><b>紫の破線</b>: 比容積一定の線 [m³/kg(DA)]</li>' +
        '</ul>' +
        '<p>マウスを置くと、その点の状態量を左上に表示します。</p>' +
        '<p><b>代表的な状態変化の向き</b></p>' +
        '<ul>' +
        '<li>加熱: 右へ水平（絶対湿度は変わらない）</li>' +
        '<li>冷却（露点より上）: 左へ水平</li>' +
        '<li>冷却除湿: 飽和曲線に向かって左下へ</li>' +
        '<li>水噴霧加湿: 湿球温度の線に沿って左上へ</li>' +
        '<li>蒸気加湿: ほぼ真上へ</li>' +
        '</ul>'
    },
    points: {
      title: '状態点の一覧',
      body:
        '<ul>' +
        '<li><b>乾球温度</b>: 普通の温度計で測る温度</li>' +
        '<li><b>湿球温度</b>: 水で湿らせた感温部の温度。蒸発で冷やされるため、乾燥しているほど乾球温度より低くなります。</li>' +
        '<li><b>相対湿度</b>: 水蒸気分圧 ÷ その温度の飽和水蒸気圧</li>' +
        '<li><b>絶対湿度</b>: 乾き空気 1 kg あたりの水蒸気量。加熱・冷却（結露なし）では変わりません。</li>' +
        '<li><b>露点温度</b>: この温度以下の表面に触れると結露します。窓ガラスや壁体内の結露判定に使えます。</li>' +
        '<li><b>比エンタルピー</b>: 乾き空気 1 kg あたりの全熱量（0 °C の乾き空気が基準）</li>' +
        '<li><b>比容積</b>: 乾き空気 1 kg あたりの体積。風量を質量流量に換算するときに使います。</li>' +
        '<li><b>水蒸気分圧</b>: 空気中の水蒸気が示す圧力</li>' +
        '</ul>' +
        '<p>行をクリックすると、その点を選択します。× で削除します。点を削除すると、その点を使った変化線と SHF 線も消えます。</p>'
    },
    procs: {
      title: '状態変化の一覧',
      body:
        '<ul>' +
        '<li><b>Δt・Δx・Δh</b>: 終点 − 始点の温度差・絶対湿度差・比エンタルピー差</li>' +
        '<li><b>SHF</b>: 顕熱 ÷ 全熱。1 に近いほど温度だけが変わる変化です。</li>' +
        '<li><b>全熱・顕熱・潜熱 [kW]</b>: 風量を入力した変化だけ計算します。</li>' +
        '<li><b>水分量 [kg/h]</b>: 負は除湿量、正は必要な加湿量です。</li>' +
        '</ul>' +
        '<p>「混合線」の行は、混合フォームで作った 2 点を結ぶ破線です。熱量は計算せず、質量流量比を表示します。</p>' +
        '<p class="help-note">CSV 保存で、この表と状態点の一覧を Excel で開ける形式で書き出せます。</p>'
    }
  };

  var pop = document.createElement('div');
  pop.id = 'help-pop';
  pop.className = 'help-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-modal', 'false');
  pop.setAttribute('aria-labelledby', 'help-pop-title');
  pop.tabIndex = -1;
  pop.hidden = true;
  pop.innerHTML =
    '<div class="help-pop-head"><h3 id="help-pop-title"></h3>' +
    '<button type="button" class="help-pop-close" aria-label="閉じる">×</button></div>' +
    '<div class="help-pop-body"></div>';
  document.body.appendChild(pop);

  var current = null;

  function position(btn) {
    var vw = document.documentElement.clientWidth;
    if (vw < 600) {
      // 狭い画面では画面下部に固定表示
      pop.classList.add('sheet');
      pop.style.left = pop.style.top = '';
      return;
    }
    pop.classList.remove('sheet');
    var r = btn.getBoundingClientRect();
    var w = pop.offsetWidth, h = pop.offsetHeight;
    var left = Math.min(Math.max(16, r.left), vw - w - 16);
    var top = r.bottom + 8;
    // 下に収まらなければ上に出す
    if (top + h > window.innerHeight - 16 && r.top - h - 8 > 16) top = r.top - h - 8;
    pop.style.left = (left + window.scrollX) + 'px';
    pop.style.top = (top + window.scrollY) + 'px';
  }

  function open(btn) {
    var item = HELP[btn.dataset.help];
    if (!item) return;
    if (current) current.setAttribute('aria-expanded', 'false');
    pop.querySelector('h3').textContent = item.title;
    pop.querySelector('.help-pop-body').innerHTML = item.body;
    pop.hidden = false;
    position(btn);
    current = btn;
    btn.setAttribute('aria-expanded', 'true');
    pop.focus({ preventScroll: true });
  }

  function close(returnFocus) {
    if (pop.hidden) return;
    pop.hidden = true;
    if (current) {
      current.setAttribute('aria-expanded', 'false');
      if (returnFocus) current.focus();
    }
    current = null;
  }

  document.querySelectorAll('.help-btn').forEach(function (btn) {
    btn.setAttribute('aria-haspopup', 'dialog');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'help-pop');
    if (!btn.title) btn.title = '説明を表示';
  });

  // summary 内のボタンでも details が開閉しないよう、捕捉段階で処理する
  document.addEventListener('click', function (e) {
    var btn = e.target.closest && e.target.closest('.help-btn');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      if (current === btn) close(false); else open(btn);
      return;
    }
    if (e.target.closest && e.target.closest('.help-pop-close')) { close(true); return; }
    if (!pop.hidden && !pop.contains(e.target)) close(false);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !pop.hidden) close(true);
  });

  window.addEventListener('resize', function () { if (current) position(current); });
})();
