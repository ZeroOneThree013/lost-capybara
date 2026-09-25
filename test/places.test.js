const assert = require('assert');
const { categorize_, OSM_RULES_ } = require('../gas/Categorize.js');
const { haversineMeters_, walkMinutes_ } = require('../gas/Distance.js');

global.categorize_ = categorize_;
global.OSM_RULES_ = OSM_RULES_;
global.haversineMeters_ = haversineMeters_;
global.walkMinutes_ = walkMinutes_;

const { buildOverpassQuery_, elementToCandidate_, buildCandidateLists_ } = require('../gas/Places.js');

function run() {
  const q = buildOverpassQuery_(25.03, 121.56, 1200);
  assert.ok(q.includes('around:1200,25.03,121.56'));
  assert.ok(q.includes('out center;'));
  assert.ok(q.includes('restaurant|'), '查詢要明確列出我們認得的 amenity 值');
  assert.ok(q.includes('bus_stop'));
  assert.ok(!/\["amenity"\]\(/.test(q), '不可以抓「所有 amenity」，那會讓 Overpass 逾時');
  assert.strictEqual((q.match(/\["name"\]/g) || []).length, 14, '每個標籤條件都要要求有 name，server 端就先濾掉無名地點');
  OSM_RULES_.forEach(r => {
    assert.ok(q.includes(r.value), `查詢應涵蓋分類表裡的 ${r.key}=${r.value}`);
  });

  const node = elementToCandidate_({
    type: 'node', id: 1, lat: 25.03, lon: 121.56,
    tags: { name: '山茶花拉麵屋', amenity: 'restaurant', cuisine: 'japanese' },
  });
  assert.deepStrictEqual(node, {
    id: 'node/1', name: '山茶花拉麵屋', cat: 'food', outdoor: false,
    kind: '日式', lat: 25.03, lng: 121.56, hasOpeningHours: false,
  });

  const way = elementToCandidate_({
    type: 'way', id: 2, center: { lat: 25.04, lon: 121.57 },
    tags: { name: '巷口二手書店', shop: 'books', opening_hours: 'Mo-Su 10:00-20:00' },
  });
  assert.strictEqual(way.id, 'way/2');
  assert.strictEqual(way.hasOpeningHours, true);

  assert.strictEqual(elementToCandidate_({ type: 'node', id: 3, lat: 1, lon: 1, tags: { amenity: 'restaurant' } }), null);
  assert.strictEqual(elementToCandidate_({ type: 'node', id: 4, lat: 1, lon: 1, tags: { name: 'x', amenity: 'fuel' } }), null);

  const origin = { lat: 25.03, lng: 121.56 };
  const candidates = [
    { id: 'a', name: '近的餐廳', cat: 'food', outdoor: false, kind: '餐廳', lat: 25.0305, lng: 121.5605, hasOpeningHours: true },
    { id: 'b', name: '遠的餐廳', cat: 'food', outdoor: false, kind: '餐廳', lat: 25.05, lng: 121.58, hasOpeningHours: false },
    { id: 'c', name: '公園', cat: 'fun', outdoor: true, kind: '公園', lat: 25.031, lng: 121.561, hasOpeningHours: false },
    { id: 'd', name: '被討厭的店', cat: 'food', outdoor: false, kind: '餐廳', lat: 25.0301, lng: 121.5601, hasOpeningHours: true },
  ];

  const normal = buildCandidateLists_(candidates, origin, { rain: false, feedbackMap: {}, limit: 15 });
  assert.strictEqual(normal.food.length, 3);
  assert.strictEqual(normal.food[0].id, 'd');
  assert.strictEqual(normal.fun.length, 1);

  const rainy = buildCandidateLists_(candidates, origin, { rain: true, feedbackMap: {}, limit: 15 });
  assert.strictEqual(rainy.fun.length, 0);

  const withDislike = buildCandidateLists_(candidates, origin, {
    rain: false, feedbackMap: { d: { type: 'dislike' } }, limit: 15,
  });
  assert.strictEqual(withDislike.food.length, 2);
  assert.ok(!withDislike.food.some(it => it.id === 'd'));

  const limited = buildCandidateLists_(candidates, origin, { rain: false, feedbackMap: {}, limit: 1 });
  assert.strictEqual(limited.food.length, 1);
  assert.strictEqual(limited.food[0].id, 'd');

  console.log('places.test.js OK');
}

run();
