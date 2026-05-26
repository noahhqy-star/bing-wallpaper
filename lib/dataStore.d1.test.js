const assert = require('node:assert/strict');
const test = require('node:test');

const {
  _clearD1ForTests,
  _setD1ForTests,
  getAdjacentDates,
  getImageByDate,
  getImageList,
  getRandomImage,
} = require('./dataStore');

const rows = [
  { date: 20260312, locale: 'zh-CN', url: '/a', urlbase: '/a', copyright: 'A' },
  { date: 20260311, locale: 'zh-CN', url: '/b', urlbase: '/b', copyright: 'B' },
  { date: 20260310, locale: 'zh-CN', url: '/c', urlbase: '/c', copyright: 'C' },
  { date: 20260312, locale: 'en-US', url: '/en-a', urlbase: '/en-a', copyright: 'EN A' },
];

function createFakeD1(data) {
  return {
    prepare(sql) {
      const params = [];
      return {
        bind(...values) {
          params.push(...values);
          return this;
        },
        async all() {
          if (sql.includes('date < ?')) {
            const [locale, beforeDate, count] = params;
            return {
              results: data
                .filter((row) => row.locale === locale && row.date < beforeDate)
                .sort((a, b) => b.date - a.date)
                .slice(0, count),
            };
          }

          const [locale, count] = params;
          return {
            results: data
              .filter((row) => row.locale === locale)
              .slice()
              .sort((a, b) => b.date - a.date)
              .slice(0, count),
          };
        },
        async first() {
          if (sql.includes('date = ?')) {
            return data.find((row) => row.date === Number(params[0]) && row.locale === params[1]) || null;
          }

          if (sql.includes('date < ?')) {
            const [locale, date] = params;
            return data
              .filter((row) => row.locale === locale && row.date < Number(date))
              .sort((a, b) => b.date - a.date)[0] || null;
          }

          if (sql.includes('date > ?')) {
            const [locale, date] = params;
            return data
              .filter((row) => row.locale === locale && row.date > Number(date))
              .sort((a, b) => a.date - b.date)[0] || null;
          }

          if (sql.includes('ORDER BY RANDOM()')) {
            return data.find((row) => row.locale === params[0] && row.date === 20260311);
          }

          return null;
        },
      };
    },
  };
}

test.afterEach(() => {
  _clearD1ForTests();
});

test('reads image records from a D1 binding', async () => {
  _setD1ForTests(createFakeD1(rows));

  const list = await getImageList({ beforeDate: 0, count: 2 });
  const image = await getImageByDate(20260311);
  const adjacent = await getAdjacentDates(20260311);
  const random = await getRandomImage();
  const enList = await getImageList({ beforeDate: 0, count: 2, locale: 'en-US' });

  assert.deepEqual(list.map((row) => row.date), [20260312, 20260311]);
  assert.equal(image.copyright, 'B');
  assert.deepEqual(adjacent, { prev: 20260310, next: 20260312 });
  assert.equal(random.date, 20260311);
  assert.deepEqual(enList.map((row) => row.copyright), ['EN A']);
});
