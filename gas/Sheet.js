function getSheet_(name, headers) {
  var ss = SpreadsheetApp.openById(getConfig_().sheetId);
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
  }
  return sh;
}

function getPrefs_() {
  var sh = getSheet_('Prefs', ['savedAt', 'valuesJSON']);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var row = sh.getRange(last, 1, 1, 2).getValues()[0];
  var savedAt = row[0], valuesJSON = row[1];
  if (!savedAt || !valuesJSON) return null;
  try {
    return {
      savedAt: savedAt instanceof Date ? savedAt.toISOString() : String(savedAt),
      values: JSON.parse(valuesJSON),
    };
  } catch (e) {
    return null;
  }
}

function savePrefs_(prefs) {
  var sh = getSheet_('Prefs', ['savedAt', 'valuesJSON']);
  sh.appendRow([prefs.savedAt, JSON.stringify(prefs.values)]);
}

function feedbackHeaders_() {
  return ['timestamp', 'placeId', 'name', 'category', 'kind', 'type'];
}

function reduceFeedbackRows_(rows) {
  var map = {};
  rows.forEach(function (r) {
    var placeId = r[1], type = r[5];
    if (!placeId) return;
    if (type === 'clear') {
      delete map[placeId];
    } else {
      map[placeId] = { name: r[2] || '', category: r[3] || '', kind: r[4] || '', type: type };
    }
  });
  return map;
}

function getFeedbackMap_() {
  var sh = getSheet_('Feedback', feedbackHeaders_());
  var last = sh.getLastRow();
  if (last < 2) return {};
  var rows = sh.getRange(2, 1, last - 1, 6).getValues();
  return reduceFeedbackRows_(rows);
}

function appendFeedback_(entry) {
  var sh = getSheet_('Feedback', feedbackHeaders_());
  sh.appendRow([
    new Date().toISOString(),
    entry.id,
    entry.name || '',
    entry.category || '',
    entry.kind || '',
    entry.type,
  ]);
}

function getCache_(key) {
  var sh = getSheet_('Cache', ['key', 'json', 'expiresAt']);
  var last = sh.getLastRow();
  if (last < 2) return null;
  var keys = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = keys.length - 1; i >= 0; i--) {
    if (keys[i][0] !== key) continue;
    var row = sh.getRange(i + 2, 2, 1, 2).getValues()[0];
    if (new Date(row[1]) <= new Date()) return null;
    try {
      return JSON.parse(row[0]);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function setCache_(key, value, ttlMs) {
  var json = JSON.stringify(value);
  if (json.length > 45000) return;

  var sh = getSheet_('Cache', ['key', 'json', 'expiresAt']);
  var expiresAt = new Date(Date.now() + ttlMs).toISOString();
  var last = sh.getLastRow();
  if (last >= 2) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (keys[i][0] === key) {
        sh.getRange(i + 2, 2, 1, 2).setValues([[json, expiresAt]]);
        return;
      }
    }
  }
  sh.appendRow([key, json, expiresAt]);
}

function appendLog_(summary) {
  var sh = getSheet_('Log', ['timestamp', 'inputSummary', 'outputSummary']);
  sh.appendRow([new Date().toISOString(), summary.input || '', summary.output || '']);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { reduceFeedbackRows_: reduceFeedbackRows_ };
}
