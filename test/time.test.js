const assert = require('assert');
const { timePartFromClock_ } = require('../gas/Time.js');

function run() {
  assert.strictEqual(timePartFromClock_('03:00'), '凌晨');
  assert.strictEqual(timePartFromClock_('05:59'), '凌晨');
  assert.strictEqual(timePartFromClock_('06:00'), '早上');
  assert.strictEqual(timePartFromClock_('10:59'), '早上');
  assert.strictEqual(timePartFromClock_('11:00'), '中午');
  assert.strictEqual(timePartFromClock_('13:59'), '中午');
  assert.strictEqual(timePartFromClock_('14:00'), '下午');
  assert.strictEqual(timePartFromClock_('17:59'), '下午');
  assert.strictEqual(timePartFromClock_('18:00'), '晚上');
  assert.strictEqual(timePartFromClock_('23:59'), '晚上');
  assert.strictEqual(timePartFromClock_(''), '中午');
  assert.strictEqual(timePartFromClock_(undefined), '中午');
  assert.strictEqual(timePartFromClock_('not-a-time'), '中午');

  console.log('time.test.js OK');
}

run();
