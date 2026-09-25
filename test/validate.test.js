const assert = require('assert');
const { buildAllowedBasis_, validatePicks_, SCORE_THRESHOLD_ } = require('../gas/Validate.js');

function run() {
  // --- buildAllowedBasis_ ---
  const values = {
    taste: ['日式', '台式'],
    foodBudget: 200,
    foodMood: '安靜',
    activity: ['電影'],
    place: '室內',
    people: '都可以',
    tryNew: '想找一間好逛的獨立書店',
  };
  const weather = { text: '小雨', rain: true };
  const basis = buildAllowedBasis_(values, '晚上', weather);

  assert.ok(basis.food.includes('時段：晚上'));
  assert.ok(basis.food.includes('天氣：小雨'));
  assert.ok(basis.food.includes('本月想嘗試：想找一間好逛的獨立書店'));
  assert.ok(basis.food.includes('口味：日式'));
  assert.ok(basis.food.includes('口味：台式'));
  assert.ok(basis.food.includes('預算：200 元內'));
  assert.ok(basis.food.includes('氣氛：安靜'));

  assert.ok(basis.fun.includes('活動：電影'));
  assert.ok(basis.fun.includes('場所：室內'));
  assert.ok(!basis.fun.some(b => b.startsWith('人數：')), '人數為都可以時不應出現在允許依據');

  assert.ok(basis.cloth.includes('時段：晚上'), '共通依據應套用到所有類別');
  assert.strictEqual(basis.cloth.filter(b => b.startsWith('口味：')).length, 0);

  // --- validatePicks_ ---
  const candidatesByCat = {
    food: [
      { id: 'f1', name: '山茶花拉麵屋', kind: '日式', m: 480, walk: 6, hasOpeningHours: true },
      { id: 'f2', name: '阿嬤的滷肉飯', kind: '台式', m: 320, walk: 4, hasOpeningHours: false },
    ],
    fun: [],
  };
  const allowedBasisByCat = {
    food: ['口味：日式', '口味：台式', '時段：晚上'],
    fun: [],
  };

  const rawPicks = {
    food: [
      { id: 'f1', score: 0.9, reason: '日式又在晚上營業', basis: ['口味：日式', '時段：晚上'], kapi: '湯頭聽起來好香' },
      { id: 'f2', score: 0.9, reason: '編造的依據', basis: ['評價：五星'], kapi: '好吃' }, // basis 不在允許清單，整筆丟掉
      { id: 'ghost', score: 0.9, reason: '不存在的候選', basis: ['口味：日式'], kapi: '？？？' }, // id 不在候選清單，丟掉
      { id: 'f1', score: 0.4, reason: '分數太低', basis: ['口味：日式'], kapi: '普通' }, // 但 f1 已經有更高分的版本會保留較高分那筆
    ],
    fun: [
      { id: 'nope', score: 0.9, reason: 'x', basis: ['活動：電影'], kapi: 'x' },
    ],
  };

  const result = validatePicks_(rawPicks, candidatesByCat, allowedBasisByCat, SCORE_THRESHOLD_);

  assert.strictEqual(result.food.length, 1);
  assert.strictEqual(result.food[0].id, 'f1');
  assert.strictEqual(result.food[0].name, '山茶花拉麵屋');
  assert.deepStrictEqual(result.food[0].basis, ['口味：日式', '時段：晚上']);
  assert.strictEqual(result.food[0].uncertain, undefined);
  assert.strictEqual(result.fun.length, 0);

  // uncertain 由程式決定：候選沒有營業時間資料時一定要出現
  const rawPicks2 = { food: [
    { id: 'f2', score: 0.9, reason: '台式小吃', basis: ['口味：台式'], kapi: '好吃' },
  ], fun: [] };
  const result2 = validatePicks_(rawPicks2, candidatesByCat, allowedBasisByCat, SCORE_THRESHOLD_);
  assert.strictEqual(result2.food[0].uncertain, '營業時間我沒有把握，出門前再確認一下。');

  // 超過 5 筆時，只保留分數最高的 5 筆
  const manyCandidates = { food: Array.from({ length: 7 }, (_, i) => ({
    id: 'x' + i, name: 'n' + i, kind: 'k', m: 100, walk: 1, hasOpeningHours: true,
  })) };
  const manyAllowed = { food: ['口味：日式'] };
  const manyPicks = { food: Array.from({ length: 7 }, (_, i) => ({
    id: 'x' + i, score: 0.6 + i * 0.01, reason: 'r', basis: ['口味：日式'], kapi: 'k',
  })) };
  const manyResult = validatePicks_(manyPicks, manyCandidates, manyAllowed, SCORE_THRESHOLD_);
  assert.strictEqual(manyResult.food.length, 5);
  assert.strictEqual(manyResult.food[0].id, 'x6');
  assert.strictEqual(manyResult.food[4].id, 'x2');

  console.log('validate.test.js OK');
}

run();
