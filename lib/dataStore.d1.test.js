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
  { date: 20260312, url: '/a', urlbase: '/a', copyright: 'A' },
  { date: 20260311, url: '/b', urlbase: '/b', copyright: 'B' },
  { date: 20260310, url: '/c', urlbase: '/c', copyright: 'C' },
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
          if (sql.includes('WHERE date < ?')) {
            const [beforeDate, count] = params;
            return {
              results: data
                .filter((row) => row.date < beforeDate)
                .sort((a, b) => b.date - a.date)
                .slice(0, count),
            };
          }

          const [count] = params;
          return {
            results: data
              .slice()
              .sort((a, b) => b.date - a.date)
              .slice(0, count),
          };
        },
        async first() {
          if (sql.includes('WHERE date = ?')) {
            return data.find((row) => row.date === Number(params[0])) || null;
          }

          if (sql.includes('WHERE date < ?')) {
            return data
              .filter((row) => row.date < Number(params[0]))
              .sort((a, b) => b.date - a.date)[0] || null;
          }

          if (sql.includes('WHERE date > ?')) {
            return data
              .filter((row) => row.date > Number(params[0]))
              .sort((a, b) => a.date - b.date)[0] || null;
          }

          if (sql.includes('ORDER BY RANDOM()')) {
            return data[1];
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

  assert.deepEqual(list.map((row) => row.date), [20260312, 20260311]);
  assert.equal(image.copyright, 'B');
  assert.deepEqual(adjacent, { prev: 20260310, next: 20260312 });
  assert.equal(random.date, 20260311);
});
