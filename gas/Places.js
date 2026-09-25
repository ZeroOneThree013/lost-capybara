function buildOverpassQuery_(lat, lng, radius) {
  var around = 'around:' + radius + ',' + lat + ',' + lng;
  var byKey = {};
  OSM_RULES_.forEach(function (r) {
    if (!byKey[r.key]) byKey[r.key] = [];
    if (byKey[r.key].indexOf(r.value) === -1) byKey[r.key].push(r.value);
  });

  var parts = [];
  Object.keys(byKey).forEach(function (key) {
    var filter = '["' + key + '"~"^(' + byKey[key].join('|') + ')$"]["name"]';
    parts.push('node' + filter + '(' + around + ');');
    parts.push('way' + filter + '(' + around + ');');
  });
  return '[out:json][timeout:25];(' + parts.join('') + ');out center;';
}

function elementToCandidate_(el) {
  var tags = el.tags || {};
  var name = tags.name;
  if (!name) return null;
  var info = categorize_(tags);
  if (!info) return null;
  var lat = el.type === 'node' ? el.lat : el.center && el.center.lat;
  var lng = el.type === 'node' ? el.lon : el.center && el.center.lon;
  if (lat == null || lng == null) return null;
  return {
    id: el.type + '/' + el.id,
    name: name,
    cat: info.cat,
    outdoor: info.outdoor,
    kind: info.kind,
    lat: lat,
    lng: lng,
    hasOpeningHours: !!tags.opening_hours,
  };
}

function buildCandidateLists_(candidates, origin, opts) {
  opts = opts || {};
  var rain = !!opts.rain;
  var feedbackMap = opts.feedbackMap || {};
  var limit = opts.limit || 15;
  var byCat = { food: [], cloth: [], stay: [], move: [], learn: [], fun: [] };

  candidates.forEach(function (c) {
    if (!byCat[c.cat]) return;
    if (rain && c.outdoor) return;
    var fb = feedbackMap[c.id];
    if (fb && fb.type === 'dislike') return;
    var m = Math.round(haversineMeters_(origin.lat, origin.lng, c.lat, c.lng));
    byCat[c.cat].push({
      id: c.id,
      name: c.name,
      kind: c.kind,
      m: m,
      walk: walkMinutes_(m),
      hasOpeningHours: c.hasOpeningHours,
    });
  });

  Object.keys(byCat).forEach(function (cat) {
    byCat[cat].sort(function (a, b) { return a.m - b.m; });
    byCat[cat] = byCat[cat].slice(0, limit);
  });
  return byCat;
}

function cachePlaceInfo_(candidates) {
  candidates.forEach(function (c) {
    setCache_('place:' + c.id, { name: c.name, kind: c.kind, cat: c.cat }, 30 * 24 * 60 * 60 * 1000);
  });
}

var OVERPASS_ENDPOINTS_ = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

function fetchOverpassJson_(query) {
  var lastProblem = '沒有可用的伺服器';

  for (var i = 0; i < OVERPASS_ENDPOINTS_.length; i++) {
    var endpoint = OVERPASS_ENDPOINTS_[i];
    var text;
    try {
      var resp = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        payload: 'data=' + encodeURIComponent(query),
        headers: { Accept: 'application/json' },
        muteHttpExceptions: true,
      });
      if (resp.getResponseCode() !== 200) {
        lastProblem = endpoint + ' 回應 HTTP ' + resp.getResponseCode();
        continue;
      }
      text = resp.getContentText();
    } catch (err) {
      lastProblem = endpoint + ' 連線失敗：' + err.message;
      continue;
    }

    if (text.charAt(0) !== '{') {
      lastProblem = endpoint + ' 回傳的不是 JSON：' + text.slice(0, 160).replace(/\s+/g, ' ');
      continue;
    }

    var json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      lastProblem = endpoint + ' 的 JSON 解析失敗';
      continue;
    }

    if (json.remark && !(json.elements || []).length) {
      lastProblem = endpoint + ' 回報：' + json.remark;
      continue;
    }
    return json;
  }

  throw new Error('Overpass 全部失敗，最後一個問題：' + lastProblem);
}

function fetchOverpassCandidates_(lat, lng, radius) {
  var key = 'places:' + lat.toFixed(3) + ',' + lng.toFixed(3) + ':' + radius;
  var cached = getCache_(key);
  if (cached) return cached;

  var json = fetchOverpassJson_(buildOverpassQuery_(lat, lng, radius));
  var candidates = (json.elements || []).map(elementToCandidate_).filter(Boolean);
  setCache_(key, candidates, 12 * 60 * 60 * 1000);
  return candidates;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildOverpassQuery_: buildOverpassQuery_,
    elementToCandidate_: elementToCandidate_,
    buildCandidateLists_: buildCandidateLists_,
  };
}
