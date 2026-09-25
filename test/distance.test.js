const assert = require('assert');
const { haversineMeters_, walkMinutes_ } = require('../gas/Distance.js');

function run() {
  // 台北車站 -> 台北 101，直線距離約 5 公里
  const m = haversineMeters_(25.0478, 121.5170, 25.0338, 121.5645);
  assert.ok(m > 4900 && m < 5100, `距離應接近 5km，實際 ${m}`);

  assert.strictEqual(haversineMeters_(25, 121, 25, 121), 0);

  assert.strictEqual(walkMinutes_(0), 1);
  assert.strictEqual(walkMinutes_(80), 1);
  assert.strictEqual(walkMinutes_(400), 5);
  assert.strictEqual(walkMinutes_(790), 10);

  console.log('distance.test.js OK');
}

run();
