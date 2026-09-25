const assert = require('assert');
const {
  buildUserPrompt_,
  buildResponseSchema_,
  summarizeFeedback_,
  extractGeminiText_,
} = require('../gas/Gemini.js');

function run() {
  const schema = buildResponseSchema_();
  assert.strictEqual(schema.type, 'object');
  assert.deepStrictEqual(schema.required.sort(), ['cloth', 'food', 'fun', 'learn', 'move', 'stay'].sort());
  assert.ok(!('additionalProperties' in schema), 'Gemini 的 responseSchema 不支援 additionalProperties');
  const pickItem = schema.properties.food.items;
  assert.deepStrictEqual(pickItem.required.sort(), ['basis', 'id', 'kapi', 'reason', 'score'].sort());
  assert.ok(!('additionalProperties' in pickItem));
  assert.strictEqual(pickItem.properties.basis.items.type, 'string');

  const summary = summarizeFeedback_({
    f1: { kind: '日式', type: 'like' },
    f2: { kind: '日式', type: 'been' },
    f3: { kind: '速食', type: 'dislike' },
    f4: { kind: '', type: 'like' },
  });
  assert.strictEqual(summary, '喜歡過：日式；不喜歡過：速食');
  assert.strictEqual(summarizeFeedback_({}), '');

  const prompt = buildUserPrompt_({
    timePart: '晚上',
    clock: '19:30',
    weather: { text: '小雨', temp: 22, rain: true },
    feedbackSummary: '喜歡過：日式',
    candidatesByCat: { food: [{ id: 'f1', name: '山茶花拉麵屋', kind: '日式', walk: 6, m: 480, hasOpeningHours: true }], cloth: [] },
    allowedBasisByCat: { food: ['口味：日式'], cloth: [] },
  });
  assert.ok(prompt.includes('晚上 19:30'));
  assert.ok(prompt.includes('小雨 22°C'));
  assert.ok(prompt.includes('已經先排除明顯的戶外地點'));
  assert.ok(prompt.includes('喜歡過：日式'));
  assert.ok(prompt.includes('山茶花拉麵屋'));
  assert.ok(prompt.includes('【cloth】允許依據：（無）'));
  assert.ok(!prompt.includes('"m":480'), '候選清單傳給模型時不應包含 m/hasOpeningHours 這種它用不到的欄位');
  assert.ok(!prompt.includes('hasOpeningHours'));

  assert.strictEqual(
    extractGeminiText_({ candidates: [{ content: { parts: [{ text: '{"food":[]}' }] } }] }),
    '{"food":[]}'
  );
  assert.strictEqual(
    extractGeminiText_({ candidates: [{ content: { parts: [{ text: '想一下…', thought: true }, { text: '{"a":1}' }] } }] }),
    '{"a":1}',
    '模型的思考內容不應混進 JSON'
  );
  assert.strictEqual(
    extractGeminiText_({ candidates: [{ content: { parts: [{ text: '{"a"' }, { text: ':1}' }] } }] }),
    '{"a":1}',
    '多個文字片段要接起來'
  );
  assert.strictEqual(extractGeminiText_({}), '');
  assert.strictEqual(extractGeminiText_({ candidates: [] }), '');
  assert.strictEqual(extractGeminiText_({ candidates: [{ content: {} }] }), '');

  console.log('gemini.test.js OK');
}

run();
