function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOutput_({ error: 'bad_request', message: '請求格式錯誤，卡皮看不懂。' });
  }

  var cfg = getConfig_();
  if (!cfg.appToken || body.token !== cfg.appToken) {
    return jsonOutput_({ error: 'unauthorized', message: '通關碼不對喔，卡皮不認識你。' });
  }

  try {
    switch (body.action) {
      case 'recommend':
        return jsonOutput_(handleRecommend_(body));
      case 'feedback':
        return jsonOutput_(handleFeedback_(body));
      case 'savePrefs':
        return jsonOutput_(handleSavePrefs_(body));
      default:
        return jsonOutput_({ error: 'unknown_action', message: '卡皮看不懂這個請求。' });
    }
  } catch (err) {
    return jsonOutput_({ error: 'server_error', message: '卡皮的腦袋打結了，等一下再試試。', debug: String(err && err.stack || err) });
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleFeedback_(body) {
  if (!body.id || !body.type) throw new Error('缺少 id 或 type');
  appendFeedback_({ id: body.id, type: body.type, name: body.name, category: body.category, kind: body.kind });
  return { ok: true };
}

function handleSavePrefs_(body) {
  if (!body.prefs || !body.prefs.savedAt || !body.prefs.values) throw new Error('缺少 prefs');
  savePrefs_(body.prefs);
  return { ok: true };
}

function emptyRecs_() {
  return { food: [], cloth: [], stay: [], move: [], learn: [], fun: [] };
}

function handleRecommend_(body) {
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') throw new Error('缺少座標');

  var weather = fetchWeather_(body.lat, body.lng);
  var rawCandidates = fetchOverpassCandidates_(body.lat, body.lng, 1200);
  var feedbackMap = getFeedbackMap_();
  var lists = buildCandidateLists_(rawCandidates, { lat: body.lat, lng: body.lng }, {
    rain: weather.rain,
    feedbackMap: feedbackMap,
    limit: 15,
  });

  var hasAnyCandidate = Object.keys(lists).some(function (cat) { return lists[cat].length > 0; });
  if (!hasAnyCandidate) {
    return { weather: weather, recs: emptyRecs_() };
  }

  var values = (body.prefs && body.prefs.values) || {};
  var timePart = timePartFromClock_(body.time);
  var allowedBasisByCat = buildAllowedBasis_(values, timePart, weather);
  var feedbackSummary = summarizeFeedback_(feedbackMap);

  var userPrompt = buildUserPrompt_({
    timePart: timePart,
    clock: body.time,
    weather: weather,
    feedbackSummary: feedbackSummary,
    candidatesByCat: lists,
    allowedBasisByCat: allowedBasisByCat,
  });

  var raw;
  try {
    raw = callGemini_(buildSystemPrompt_(), userPrompt);
  } catch (err) {
    appendLog_({ input: userPrompt.slice(0, 2000), output: 'ERROR: ' + err.message });
    return { weather: weather, recs: emptyRecs_() };
  }

  var recs = validatePicks_(raw, lists, allowedBasisByCat, SCORE_THRESHOLD_);
  appendLog_({ input: userPrompt.slice(0, 2000), output: JSON.stringify(recs).slice(0, 2000) });
  return { weather: weather, recs: recs };
}
