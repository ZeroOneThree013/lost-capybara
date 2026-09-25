var GEMINI_MODELS_ = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];

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
  };
  var cats = ['food', 'cloth', 'stay', 'move', 'learn', 'fun'];
  var properties = {};
  cats.forEach(function (c) { properties[c] = { type: 'array', items: pickItem }; });
  return {
    type: 'object',
    properties: properties,
    required: cats,
  };
}

function extractGeminiText_(body) {
  var cand = body && body.candidates && body.candidates[0];
  if (!cand) return '';
  var parts = (cand.content && cand.content.parts) || [];
  var out = '';
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].thought) continue;
    if (typeof parts[i].text === 'string') out += parts[i].text;
  }
  return out;
}

function callGemini_(systemPrompt, userPrompt) {
  var cfg = getConfig_();
  var payload = JSON.stringify({
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: buildResponseSchema_(),
    },
  });
  var lastProblem = '沒有可用的模型';

  for (var i = 0; i < GEMINI_MODELS_.length; i++) {
    var model = GEMINI_MODELS_[i];
    var text;
    try {
      var resp = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
        {
          method: 'post',
          contentType: 'application/json',
          headers: { 'x-goog-api-key': cfg.geminiApiKey },
          payload: payload,
          muteHttpExceptions: true,
        }
      );
      text = resp.getContentText();
      if (resp.getResponseCode() < 200 || resp.getResponseCode() >= 300) {
        var errBody = {};
        try { errBody = JSON.parse(text); } catch (ignored) {}
        lastProblem = model + '：' + ((errBody.error && errBody.error.message) || resp.getResponseCode());
        continue;
      }
    } catch (err) {
      lastProblem = model + ' 連線失敗：' + err.message;
      continue;
    }

    var body;
    try {
      body = JSON.parse(text);
    } catch (err) {
      lastProblem = model + ' 回傳的不是 JSON';
      continue;
    }

    var cand = body.candidates && body.candidates[0];
    if (!cand) {
      lastProblem = model + ' 沒有回傳任何結果';
      continue;
    }
    if (cand.finishReason && cand.finishReason !== 'STOP') {
      lastProblem = model + ' 回應不完整：finishReason=' + cand.finishReason;
      continue;
    }

    var content = extractGeminiText_(body);
    if (!content) {
      lastProblem = model + ' 回傳空內容';
      continue;
    }
    try {
      return JSON.parse(content);
    } catch (err) {
      lastProblem = model + ' 的 JSON 內容無法解析';
      continue;
    }
  }

  throw new Error('Gemini 全部失敗，最後一個問題：' + lastProblem);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildSystemPrompt_: buildSystemPrompt_,
    buildUserPrompt_: buildUserPrompt_,
    buildResponseSchema_: buildResponseSchema_,
    summarizeFeedback_: summarizeFeedback_,
    extractGeminiText_: extractGeminiText_,
  };
}
