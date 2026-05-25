const BING_API_URL = 'https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&pid=hp';
const STORY_API_URL = 'https://bing.ee123.net/img/';

function timestamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function fetchStory(date) {
  const url = `${STORY_API_URL}?date=${date}&size=1920x1080&imgtype=jpg&type=json`;
  const response = await fetch(url);

  if (!response.ok) return '';

  const data = await response.json();
  return data && data.imgdetail ? data.imgdetail : '';
}

async function upsertImage(db, img, now) {
  await db.prepare(`
    INSERT INTO images (date, url, urlbase, copyright, copyright_link, title, imgdetail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      url = excluded.url,
      urlbase = excluded.urlbase,
      copyright = excluded.copyright,
      copyright_link = excluded.copyright_link,
      title = excluded.title,
      imgdetail = CASE WHEN excluded.imgdetail != '' THEN excluded.imgdetail ELSE images.imgdetail END,
      updated_at = excluded.updated_at
  `).bind(
    Number(img.enddate),
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

async function fetchMissingStories(db, now) {
  const { results } = await db.prepare(
    "SELECT date FROM images WHERE (imgdetail IS NULL OR imgdetail = '') ORDER BY date DESC LIMIT 10"
  ).all();

  for (const row of results || []) {
    const story = await fetchStory(row.date);
    if (!story) continue;

    await db.prepare('UPDATE images SET imgdetail = ?, updated_at = ? WHERE date = ?')
      .bind(story, now, row.date)
      .run();
  }
}

export async function refreshBingImages(env) {
  if (!env.DB) {
    throw new Error('Missing D1 binding: DB');
  }

  const response = await fetch(BING_API_URL, {
    headers: {
      'user-agent': 'bing-wallpaper-refresh/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Bing API failed: ${response.status}`);
  }

  const data = await response.json();
  if (!data || !Array.isArray(data.images)) {
    throw new Error('Bing API returned an unexpected payload');
  }

  const now = timestamp();
  for (const img of data.images) {
    await upsertImage(env.DB, img, now);
  }

  await fetchMissingStories(env.DB, now);

  return {
    updated: data.images.length,
  };
}
