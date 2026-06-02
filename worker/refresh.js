const BING_FEEDS = [
  {
    locale: 'zh-CN',
    url: 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN&cc=cn&setlang=zh-CN&pid=hp',
    acceptLanguage: 'zh-CN,zh;q=0.9',
  },
  {
    locale: 'en-US',
    url: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN&cc=cn&setlang=en-US&ensearch=1&pid=hp',
    acceptLanguage: 'en-US,en;q=0.9',
  },
];
const STORY_API_URL = 'https://bing.ee123.net/img/';

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function imageKey(urlbase = '') {
  const match = urlbase.match(/id=(OHR\.[^_&]+)/);
  return match ? match[1] : urlbase;
}

async function fetchBingFeed(feed) {
  const response = await fetch(feed.url, {
    headers: {
      'accept-language': feed.acceptLanguage,
      'user-agent': 'bing-wallpaper-refresh/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Bing API failed for ${feed.locale}: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.images)) {
    throw new Error(`Bing API returned an unexpected payload for ${feed.locale}`);
  }
  return data.images;
}

async function fetchStory(date) {
  const url = `${STORY_API_URL}?date=${date}&size=1920x1080&imgtype=jpg&type=json`;
  const response = await fetch(url);

  if (!response.ok) return { imgdetail: '' };

  const data = await response.json();
  return {
    imgdetail: data && data.imgdetail ? data.imgdetail : '',
    date: data && data.date ? data.date : '',
    imageKey: imageKey((data && (data.imgurl || data.urlbase || data.url)) || ''),
  };
}

function dateKey(value) {
  return String(value || '').replace(/\D/g, '');
}

function storyMatchesImage(story, image) {
  const expectedImageKey = imageKey(image.urlbase || '');
  const expectedDate = dateKey(image.date);
  const storyDate = dateKey(story.date);

  if (storyDate && expectedDate && storyDate !== expectedDate) return false;
  if (!story.imageKey || !expectedImageKey) return false;

  return story.imageKey === expectedImageKey;
}

async function upsertImage(db, img, now, locale, dateOverride = null) {
  await db.prepare(`
    INSERT INTO images (date, locale, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date, locale) DO UPDATE SET
      url = excluded.url,
      urlbase = excluded.urlbase,
      copyright = excluded.copyright,
      copyright_link = excluded.copyright_link,
      title = excluded.title,
      imgdetail = CASE WHEN excluded.imgdetail != '' THEN excluded.imgdetail ELSE images.imgdetail END,
      updated_at = excluded.updated_at
  `).bind(
    Number(dateOverride || img.enddate),
    locale,
    img.url || '',
    img.urlbase || '',
    img.copyright || '',
    img.copyrightlink || '',
    img.title || '',
    '',
    now,
    now
  ).run();
}

export async function refreshRecentStories(db, now) {
  const { results } = await db.prepare(
    "SELECT date, urlbase, imgdetail FROM images WHERE locale = 'zh-CN' ORDER BY date DESC LIMIT 10"
  ).all();

  for (const row of results || []) {
    const story = await fetchStory(row.date);
    if (!story.imgdetail) continue;
    if (!storyMatchesImage(story, row)) continue;
    if (story.imgdetail === (row.imgdetail || '')) continue;

    await db.prepare("UPDATE images SET imgdetail = ?, updated_at = ? WHERE date = ? AND locale = 'zh-CN'")
      .bind(story.imgdetail, now, row.date)
      .run();
  }
}

export async function refreshBingImages(env) {
  if (!env.DB) {
    throw new Error('Missing D1 binding: DB');
  }

  const now = timestamp();
  const zhImages = await fetchBingFeed(BING_FEEDS[0]);
  const zhDateByKey = new Map(zhImages.map((img) => [imageKey(img.urlbase), Number(img.enddate)]));

  for (const img of zhImages) {
    await upsertImage(env.DB, img, now, 'zh-CN');
  }

  const enImages = await fetchBingFeed(BING_FEEDS[1]);
  for (const img of enImages) {
    const matchedDate = zhDateByKey.get(imageKey(img.urlbase));
    if (matchedDate) {
      await upsertImage(env.DB, img, now, 'en-US', matchedDate);
    }
  }

  await refreshRecentStories(env.DB, now);

  return {
    updated: zhImages.length + enImages.length,
  };
}

export const _test = {
  dateKey,
  imageKey,
  storyMatchesImage,
};
