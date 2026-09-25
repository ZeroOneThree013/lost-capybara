function timePartFromClock_(hhmm) {
  var h = 12;
  if (typeof hhmm === 'string' && /^\d{1,2}:\d{2}$/.test(hhmm)) {
    h = parseInt(hhmm.split(':')[0], 10);
  }
  if (h < 6) return '凌晨';
  if (h < 11) return '早上';
  if (h < 14) return '中午';
  if (h < 18) return '下午';
  return '晚上';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { timePartFromClock_: timePartFromClock_ };
}
