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
    return jsonOutput_({ error: 'server_error', message: '卡皮的腦袋打結了，等一下再試試。' });
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function handleFeedback_(body) {
  if (!body.id || !body.type) throw new Error('缺少 id 或 type');
  appendFeedback_({ id: body.id, type: body.type });
  return { ok: true };
}

function handleSavePrefs_(body) {
  if (!body.prefs || !body.prefs.savedAt || !body.prefs.values) throw new Error('缺少 prefs');
  savePrefs_(body.prefs);
  return { ok: true };
}

function handleRecommend_(body) {
  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') throw new Error('缺少座標');

  var weather = fetchWeather_(body.lat, body.lng);
  var rawCandidates = fetchOverpassCandidates_(body.lat, body.lng, 1500);
  var feedbackMap = getFeedbackMap_();
  var lists = buildCandidateLists_(rawCandidates, { lat: body.lat, lng: body.lng }, {
    rain: weather.rain,
    feedbackMap: feedbackMap,
    limit: 15,
  });

  var recs = {};
  Object.keys(lists).forEach(function (cat) {
    recs[cat] = lists[cat].slice(0, 5).map(function (it) {
      return {
        id: it.id,
        name: it.name,
        kind: it.kind,
        walk: it.walk,
        m: it.m,
        reason: '（階段 3 才會由 AI 產生推薦理由）',
        basis: [],
        kapi: '（階段 3 才會有卡皮的話）',
        uncertain: it.hasOpeningHours ? undefined : '營業時間我沒有把握，出門前再確認一下。',
      };
    });
  });

  return { weather: weather, recs: recs };
}
