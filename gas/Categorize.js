var OSM_RULES_ = [
  { key: 'amenity', value: 'restaurant', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'fast_food', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'cafe', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'bar', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'pub', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'food_court', cat: 'food', outdoor: false },
  { key: 'amenity', value: 'ice_cream', cat: 'food', outdoor: false },

  { key: 'shop', value: 'clothes', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'boutique', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'shoes', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'accessories', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'department_store', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'mall', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'second_hand', cat: 'cloth', outdoor: false },
  { key: 'shop', value: 'variety_store', cat: 'cloth', outdoor: false },

  { key: 'tourism', value: 'hotel', cat: 'stay', outdoor: false },
  { key: 'tourism', value: 'guest_house', cat: 'stay', outdoor: false },
  { key: 'tourism', value: 'hostel', cat: 'stay', outdoor: false },
  { key: 'tourism', value: 'motel', cat: 'stay', outdoor: false },
  { key: 'tourism', value: 'apartment', cat: 'stay', outdoor: false },
  { key: 'tourism', value: 'camp_site', cat: 'stay', outdoor: true },

  { key: 'amenity', value: 'bicycle_rental', cat: 'move', outdoor: true },
  { key: 'highway', value: 'bus_stop', cat: 'move', outdoor: true },
  { key: 'public_transport', value: 'platform', cat: 'move', outdoor: true },
  { key: 'railway', value: 'station', cat: 'move', outdoor: false },
  { key: 'railway', value: 'subway_entrance', cat: 'move', outdoor: false },
  { key: 'amenity', value: 'taxi', cat: 'move', outdoor: true },

  { key: 'shop', value: 'books', cat: 'learn', outdoor: false },
  { key: 'amenity', value: 'library', cat: 'learn', outdoor: false },
  { key: 'tourism', value: 'museum', cat: 'learn', outdoor: false },
  { key: 'tourism', value: 'gallery', cat: 'learn', outdoor: false },
  { key: 'amenity', value: 'arts_centre', cat: 'learn', outdoor: false },
  { key: 'amenity', value: 'community_centre', cat: 'learn', outdoor: false },

  { key: 'amenity', value: 'cinema', cat: 'fun', outdoor: false },
  { key: 'amenity', value: 'theatre', cat: 'fun', outdoor: false },
  { key: 'amenity', value: 'nightclub', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'fitness_centre', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'sports_centre', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'bowling_alley', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'amusement_arcade', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'escape_game', cat: 'fun', outdoor: false },
  { key: 'leisure', value: 'park', cat: 'fun', outdoor: true },
  { key: 'leisure', value: 'playground', cat: 'fun', outdoor: true },
  { key: 'tourism', value: 'attraction', cat: 'fun', outdoor: true },
];

var CUISINE_LABELS_ = {
  japanese: '日式', korean: '韓式', chinese: '中式', taiwanese: '台式',
  italian: '義式', french: '法式', american: '美式', thai: '泰式',
  vietnamese: '越式', indian: '印度', mexican: '墨西哥',
  coffee_shop: '咖啡', ice_cream: '甜點', dessert: '甜點',
  seafood: '海鮮', vegetarian: '素食', vegan: '素食',
  burger: '漢堡', pizza: '披薩', noodle: '麵食', ramen: '拉麵',
};

var DEFAULT_LABELS_ = {
  restaurant: '餐廳', fast_food: '速食', cafe: '咖啡', bar: '酒吧', pub: '酒館',
  food_court: '美食街', ice_cream: '冰品甜點',
  clothes: '服飾店', boutique: '選物店', shoes: '鞋店', accessories: '配件店',
  department_store: '百貨公司', mall: '購物中心', second_hand: '二手店', variety_store: '選物店',
  hotel: '旅館', guest_house: '民宿', hostel: '青年旅館', motel: '汽車旅館',
  apartment: '公寓式住宿', camp_site: '露營地',
  bicycle_rental: '腳踏車借還', bus_stop: '公車站', platform: '運輸站台',
  station: '車站', subway_entrance: '捷運站', taxi: '排班計程車',
  books: '書店', library: '圖書館', museum: '博物館', gallery: '展覽',
  arts_centre: '藝文中心', community_centre: '活動中心',
  cinema: '電影院', theatre: '劇場', nightclub: '夜店',
  fitness_centre: '健身房', sports_centre: '運動中心', bowling_alley: '保齡球館',
  amusement_arcade: '遊藝場', escape_game: '密室逃脫', park: '公園',
  playground: '遊樂場', attraction: '景點',
};

function kindLabel_(tags, rule) {
  if (rule.cat === 'food' && tags.cuisine) {
    var first = String(tags.cuisine).split(';')[0].trim().toLowerCase();
    if (CUISINE_LABELS_[first]) return CUISINE_LABELS_[first];
  }
  return DEFAULT_LABELS_[rule.value] || rule.cat;
}

function categorize_(tags) {
  if (!tags) return null;
  for (var i = 0; i < OSM_RULES_.length; i++) {
    var r = OSM_RULES_[i];
    if (tags[r.key] === r.value) {
      return { cat: r.cat, outdoor: r.outdoor, kind: kindLabel_(tags, r) };
    }
  }
  return null;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { categorize_: categorize_, OSM_RULES_: OSM_RULES_ };
}
