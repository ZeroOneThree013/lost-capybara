var GROQ_MODEL_ = 'qwen/qwen3.8-27b';

function buildSystemPrompt_() {
  return [
    '你是「卡皮」，一隻沒有方向感、個性悠哉溫暖的卡皮巴拉，負責從候選清單中幫使用者挑出最適合的地點。',
    '規則：',
    '1. 只能從使用者提供的候選清單中挑選，絕對不能編造清單以外的地點或 id。',
    '2. 每一筆的 basis 只能使用使用者提供的「允許依據」清單裡的字串，必須一字不差照抄，不能自己創造新的依據，也不能省略成別的說法。',
    '3. 不能編造候選清單裡沒有的資訊（例如店家的口味、評價、氣氛），只能根據候選清單本身（名稱、類型、距離）與使用者的偏好、情境來說話。',
    '4. reason 用繁體中文，40 字以內，說明為什麼推薦這個地方。',
    '5. kapi 是卡皮的第一人稱台詞，繁體中文、語氣悠哉溫暖、30 字以內；可以自嘲不認路，但絕對不能提供任何路線或方向指引。',
    '6. score 是 0～1 的信心分數，只有真的有把握符合使用者偏好或情境時才給高分。',
    '7. 如果某一類完全沒有合適的候選，該類就回傳空陣列，不要硬選。',
    '8. 每一類最多輸出 5 筆，且只能輸出候選清單中出現過的 id。',
  ].join('\n');
}

function unique_(arr) {
  var seen = {}, out = [];
  arr.forEach(function (v) { if (!seen[v]) { seen[v] = true; out.push(v); } });
  return out;
}

function summarizeFeedback_(feedbackMap) {
  var liked = [], disliked = [];
  Object.keys(feedbackMap || {}).forEach(function (id) {
    var f = feedbackMap[id];
    if (!f || !f.kind) return;
    if (f.type === 'like' || f.type === 'been') liked.push(f.kind);
    else if (f.type === 'dislike') disliked.push(f.kind);
  });
  var parts = [];
  if (liked.length) parts.push('喜歡過：' + unique_(liked).join('、'));
  if (disliked.length) parts.push('不喜歡過：' + unique_(disliked).join('、'));
  return parts.join('；');
}

function buildUserPrompt_(ctx) {
  var lines = [];
  lines.push('現在時間：' + ctx.timePart + ' ' + ctx.clock);
  lines.push('天氣：' + ctx.weather.text + ' ' + ctx.weather.temp + '°C' + (ctx.weather.rain ? '（下雨，候選清單已經先排除明顯的戶外地點）' : ''));
  if (ctx.feedbackSummary) lines.push('使用者過去的回饋：' + ctx.feedbackSummary);
  lines.push('');

  Object.keys(ctx.candidatesByCat).forEach(function (cat) {
    var basisList = ctx.allowedBasisByCat[cat] || [];
    lines.push('【' + cat + '】允許依據：' + (basisList.length ? basisList.join('、') : '（無）'));
    var compact = ctx.candidatesByCat[cat].map(function (c) {
      return { id: c.id, name: c.name, kind: c.kind, walk: c.walk };
    });
    lines.push('候選清單：' + JSON.stringify(compact));
    lines.push('');
  });

  return lines.join('\n');
}

function buildResponseSchema_() {
  var pickItem = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      score: { type: 'number' },
      reason: { type: 'string' },
      basis: { type: 'array', items: { type: 'string' } },
      kapi: { type: 'string' },
    },
    required: ['id', 'score', 'reason', 'basis', 'kapi'],
    additionalProperties: false,
  };
  var cats = ['food', 'cloth', 'stay', 'move', 'learn', 'fun'];
  var properties = {};
  cats.forEach(function (c) { properties[c] = { type: 'array', items: pickItem }; });
  return {
    type: 'object',
    properties: properties,
    required: cats,
    additionalProperties: false,
  };
}

function callGroq_(systemPrompt, userPrompt) {
  var cfg = getConfig_();
  var resp = UrlFetchApp.fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + cfg.groqApiKey },
    payload: JSON.stringify({
      model: GROQ_MODEL_,
      reasoning_effort: 'low',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'kapi_recs', strict: true, schema: buildResponseSchema_() },
      },
    }),
    muteHttpExceptions: true,
  });

  var code = resp.getResponseCode();
  var body = JSON.parse(resp.getContentText());
  if (code < 200 || code >= 300) {
    throw new Error('Groq 呼叫失敗：' + (body.error && body.error.message ? body.error.message : code));
  }
  return JSON.parse(body.choices[0].message.content);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSystemPrompt_: buildSystemPrompt_,
    buildUserPrompt_: buildUserPrompt_,
    buildResponseSchema_: buildResponseSchema_,
    summarizeFeedback_: summarizeFeedback_,
  };
}
