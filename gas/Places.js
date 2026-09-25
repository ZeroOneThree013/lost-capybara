function buildOverpassQuery_(lat, lng, radius) {
  var around = 'around:' + radius + ',' + lat + ',' + lng;
  var parts = [];
  ['amenity', 'shop', 'tourism', 'leisure'].forEach(function (k) {
    parts.push('node["' + k + '"](' + around + ');');
    parts.push('way["' + k + '"](' + around + ');');
  });
  parts.push('node["highway"="bus_stop"](' + around + ');');
  parts.push('node["railway"](' + around + ');');
  parts.push('node["public_transport"="platform"](' + around + ');');
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

function fetchOverpassCandidates_(lat, lng, radius) {
  var key = 'places:' + lat.toFixed(3) + ',' + lng.toFixed(3) + ':' + radius;
  var cached = getCache_(key);
  if (cached) return cached;

  var query = buildOverpassQuery_(lat, lng, radius);
  var resp = UrlFetchApp.fetch('https://overpass-api.de/api/interpreter', {
    method: 'post',
    payload: 'data=' + encodeURIComponent(query),
    muteHttpExceptions: true,
  });
  var json = JSON.parse(resp.getContentText());
  var candidates = (json.elements || []).map(elementToCandidate_).filter(Boolean);
  setCache_(key, candidates, 12 * 60 * 60 * 1000);
  cachePlaceInfo_(candidates);
  return candidates;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    buildOverpassQuery_: buildOverpassQuery_,
    elementToCandidate_: elementToCandidate_,
    buildCandidateLists_: buildCandidateLists_,
  };
}
