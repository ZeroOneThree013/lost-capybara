var WEATHER_TEXT_ = {
  0: '晴天', 1: '晴時多雲', 2: '多雲', 3: '陰天',
  45: '起霧', 48: '起霧',
  51: '毛毛雨', 53: '毛毛雨', 55: '毛毛雨',
  56: '凍雨', 57: '凍雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  66: '凍雨', 67: '凍雨',
  71: '下雪', 73: '下雪', 75: '下雪', 77: '下雪',
  80: '短暫陣雨', 81: '陣雨', 82: '強陣雨',
  85: '陣雪', 86: '陣雪',
  95: '雷雨', 96: '強雷雨', 99: '強雷雨',
};

var RAIN_CODES_ = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];

function weatherCodeToText_(code) {
  return WEATHER_TEXT_[code] || '天氣不明';
}

function isRainCode_(code) {
  return RAIN_CODES_.indexOf(code) !== -1;
}

function fetchWeather_(lat, lng) {
  var key = 'weather:' + lat.toFixed(3) + ',' + lng.toFixed(3);
  var cached = getCache_(key);
  if (cached) return cached;

  var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + lat + '&longitude=' + lng +
    '&current=temperature_2m,precipitation,weather_code&timezone=Asia%2FTaipei';
  var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var json = JSON.parse(resp.getContentText());
  var cur = json.current || {};
  var code = cur.weather_code;
  var result = {
    text: weatherCodeToText_(code),
    temp: typeof cur.temperature_2m === 'number' ? Math.round(cur.temperature_2m) : null,
    rain: isRainCode_(code) || (cur.precipitation || 0) > 0,
  };
  setCache_(key, result, 30 * 60 * 1000);
  return result;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { weatherCodeToText_: weatherCodeToText_, isRainCode_: isRainCode_ };
}
