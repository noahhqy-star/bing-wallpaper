const assert = require('node:assert/strict');
const test = require('node:test');

let refreshModule;

async function getRefreshModule() {
  if (!refreshModule) {
    refreshModule = await import('./refresh.js');
  }
  return refreshModule;
}

function createFakeD1(rows) {
  const updates = [];

  return {
    updates,
    prepare(sql) {
      const params = [];
      return {
        bind(...values) {
          params.push(...values);
          return this;
        },
        async all() {
          if (sql.includes('SELECT date, urlbase, imgdetail')) {
            return {
              results: rows
                .filter((row) => row.locale === 'zh-CN')
                .slice()
                .sort((a, b) => b.date - a.date)
                .slice(0, 10),
            };
          }

          return { results: [] };
        },
        async run() {
          if (sql.includes('UPDATE images SET imgdetail')) {
            const [imgdetail, updatedAt, date] = params;
            const row = rows.find((item) => item.date === date && item.locale === 'zh-CN');
            if (row) {
              row.imgdetail = imgdetail;
              row.updated_at = updatedAt;
            }
            updates.push({ imgdetail, updatedAt, date });
          }
        },
      };
    },
  };
}

function mockStoryFetch(payloadByDate) {
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    const date = new URL(url).searchParams.get('date');
    return {
      ok: true,
      async json() {
        return payloadByDate[date] || {};
      },
    };
  };
  return () => {
    global.fetch = originalFetch;
  };
}

test('story matching rejects a payload for a different Bing image', async () => {
  const { _test } = await getRefreshModule();

  assert.equal(_test.storyMatchesImage(
    {
      date: '2026/06/01',
      imageKey: 'OHR.OlivaPalermo',
      imgdetail: '<p>Palermo</p>',
    },
    {
      date: 20260602,
      urlbase: '/th?id=OHR.Qinghai_ZH-CN9899656327',
    }
  ), false);
});

test('refreshRecentStories skips mismatched story payloads', async (t) => {
  const { refreshRecentStories } = await getRefreshModule();
  const rows = [{
    date: 20260602,
    locale: 'zh-CN',
    urlbase: '/th?id=OHR.Qinghai_ZH-CN9899656327',
    imgdetail: '',
  }];
  const db = createFakeD1(rows);
  const restoreFetch = mockStoryFetch({
    20260602: {
      date: '2026/06/01',
      imgurl: 'https://cn.bing.com/th?id=OHR.OlivaPalermo_ZH-CN9639920195_1920x1080.jpg',
      imgdetail: '<p>Palermo</p>',
    },
  });
  t.after(restoreFetch);

  await refreshRecentStories(db, '2026-06-01 16:15:44');

  assert.equal(rows[0].imgdetail, '');
  assert.equal(db.updates.length, 0);
});

test('refreshRecentStories repairs stale stories when the source later matches the image', async (t) => {
  const { refreshRecentStories } = await getRefreshModule();
  const rows = [{
    date: 20260602,
    locale: 'zh-CN',
    urlbase: '/th?id=OHR.Qinghai_ZH-CN9899656327',
    imgdetail: '<p>Palermo</p>',
  }];
  const db = createFakeD1(rows);
  const restoreFetch = mockStoryFetch({
    20260602: {
      date: '2026/06/02',
      imgurl: 'https://cn.bing.com/th?id=OHR.Qinghai_ZH-CN9899656327_1920x1080.jpg',
      imgdetail: '<p>Qinghai</p>',
    },
  });
  t.after(restoreFetch);

  await refreshRecentStories(db, '2026-06-02 06:30:00');

  assert.equal(rows[0].imgdetail, '<p>Qinghai</p>');
  assert.deepEqual(db.updates, [{
    imgdetail: '<p>Qinghai</p>',
    updatedAt: '2026-06-02 06:30:00',
    date: 20260602,
  }]);
});
