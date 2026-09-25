var SCORE_THRESHOLD_ = 0.6;

function buildAllowedBasis_(values, timePart, weather) {
  values = values || {};
  var common = ['時段：' + timePart];
  if (weather && weather.rain) common.push('天氣：' + weather.text);
  if (values.tryNew) common.push('本月想嘗試：' + values.tryNew);

  var byCat = { food: [], cloth: [], stay: [], move: [], learn: [], fun: [] };
  Object.keys(byCat).forEach(function (cat) { byCat[cat] = common.slice(); });

  (values.taste || []).forEach(function (v) { byCat.food.push('口味：' + v); });
  if (values.foodBudget) byCat.food.push('預算：' + values.foodBudget + ' 元內');
  if (values.foodMood && values.foodMood !== '都可以') byCat.food.push('氣氛：' + values.foodMood);

  (values.style || []).forEach(function (v) { byCat.cloth.push('風格：' + v); });
  if (values.clothBudget) byCat.cloth.push('預算：' + values.clothBudget + ' 元內');
  (values.shopType || []).forEach(function (v) { byCat.cloth.push('店型：' + v); });

  (values.stayType || []).forEach(function (v) { byCat.stay.push('住宿：' + v); });
  if (values.stayBudget) byCat.stay.push('預算：' + values.stayBudget + ' 元內');
  if (values.stayMood && values.stayMood !== '都可以') byCat.stay.push('氣氛：' + values.stayMood);

  (values.transport || []).forEach(function (v) { byCat.move.push('交通：' + v); });
  if (values.walkMax) byCat.move.push('步行：' + values.walkMax + ' 分內');

  (values.topics || []).forEach(function (v) { byCat.learn.push('主題：' + v); });

  (values.activity || []).forEach(function (v) { byCat.fun.push('活動：' + v); });
  if (values.place && values.place !== '都可以') byCat.fun.push('場所：' + values.place);
  if (values.people && values.people !== '都可以') byCat.fun.push('人數：' + values.people);

  return byCat;
}

function validatePicks_(rawPicks, candidatesByCat, allowedBasisByCat, threshold) {
  threshold = typeof threshold === 'number' ? threshold : SCORE_THRESHOLD_;
  var result = {};

  Object.keys(candidatesByCat).forEach(function (cat) {
    var validCand = {};
    candidatesByCat[cat].forEach(function (c) { validCand[c.id] = c; });
    var allowedSet = {};
    (allowedBasisByCat[cat] || []).forEach(function (b) { allowedSet[b] = true; });

    var picks = (rawPicks && rawPicks[cat]) || [];
    var out = [];

    picks.forEach(function (p) {
      if (!p || typeof p.id !== 'string') return;
      var cand = validCand[p.id];
      if (!cand) return;
      if (typeof p.score !== 'number' || p.score < threshold) return;
      if (typeof p.reason !== 'string' || !p.reason.trim()) return;
      if (typeof p.kapi !== 'string' || !p.kapi.trim()) return;
      var basis = Array.isArray(p.basis) ? p.basis.filter(function (b) { return allowedSet[b]; }) : [];
      if (basis.length === 0) return;

      out.push({
        id: cand.id,
        name: cand.name,
        kind: cand.kind,
        walk: cand.walk,
        m: cand.m,
        score: p.score,
        reason: p.reason.trim(),
        basis: basis,
        kapi: p.kapi.trim(),
        uncertain: cand.hasOpeningHours ? undefined : '營業時間我沒有把握，出門前再確認一下。',
      });
    });

    out.sort(function (a, b) { return b.score - a.score; });
    result[cat] = out.slice(0, 5).map(function (it) {
      var copy = {};
      Object.keys(it).forEach(function (k) {
        if (k !== 'score') copy[k] = it[k];
      });
      return copy;
    });
  });

  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildAllowedBasis_: buildAllowedBasis_, validatePicks_: validatePicks_, SCORE_THRESHOLD_: SCORE_THRESHOLD_ };
}
