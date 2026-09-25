const assert = require('assert');
const { categorize_ } = require('../gas/Categorize.js');

function run() {
  assert.deepStrictEqual(
    categorize_({ amenity: 'restaurant', cuisine: 'japanese' }),
    { cat: 'food', outdoor: false, kind: '日式' }
  );

  assert.deepStrictEqual(
    categorize_({ amenity: 'restaurant' }),
    { cat: 'food', outdoor: false, kind: '餐廳' }
  );

  assert.deepStrictEqual(
    categorize_({ shop: 'books' }),
    { cat: 'learn', outdoor: false, kind: '書店' }
  );

  assert.deepStrictEqual(
    categorize_({ leisure: 'park' }),
    { cat: 'fun', outdoor: true, kind: '公園' }
  );

  assert.deepStrictEqual(
    categorize_({ highway: 'bus_stop' }),
    { cat: 'move', outdoor: true, kind: '公車站' }
  );

  assert.strictEqual(categorize_({ amenity: 'fuel' }), null);
  assert.strictEqual(categorize_(null), null);
  assert.strictEqual(categorize_({}), null);

  console.log('categorize.test.js OK');
}

run();
