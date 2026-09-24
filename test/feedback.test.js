const assert = require('assert');
const { reduceFeedbackRows_ } = require('../gas/Sheet.js');

function run() {
  const rows = [
    ['2026-01-01T00:00:00Z', 'f1', '山茶花拉麵屋', 'food', '日式拉麵', 'like'],
    ['2026-01-01T00:01:00Z', 'f2', '阿嬤的滷肉飯', 'food', '台式小吃', 'dislike'],
    ['2026-01-01T00:02:00Z', 'f1', '山茶花拉麵屋', 'food', '日式拉麵', 'been'],
  ];
  const map = reduceFeedbackRows_(rows);
  assert.deepStrictEqual(map, {
    f1: { name: '山茶花拉麵屋', category: 'food', kind: '日式拉麵', type: 'been' },
    f2: { name: '阿嬤的滷肉飯', category: 'food', kind: '台式小吃', type: 'dislike' },
  });

  const cleared = reduceFeedbackRows_(rows.concat([
    ['2026-01-01T00:03:00Z', 'f1', '', '', '', 'clear'],
  ]));
  assert.deepStrictEqual(cleared, {
    f2: { name: '阿嬤的滷肉飯', category: 'food', kind: '台式小吃', type: 'dislike' },
  });

  const noId = reduceFeedbackRows_([
    ['2026-01-01T00:00:00Z', '', '', '', '', 'like'],
  ]);
  assert.deepStrictEqual(noId, {});

  console.log('feedback.test.js OK');
}

run();
