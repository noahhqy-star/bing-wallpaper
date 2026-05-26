import { getImageList, getAdjacentDates } from '../../lib/dataStore';
import { normalizeLocale } from '../../lib/locale';

export default async function handler(req, res) {
  const { date = '0', count = '12', locale = 'zh-CN' } = req.query;
  const dateNum = Number(date);
  const countNum = Number(count);
  const normalizedLocale = normalizeLocale(locale);

  const images = await getImageList({ beforeDate: dateNum, count: countNum, locale: normalizedLocale });

  // 为每张图片附加 prev/next 导航信息
  const data = await Promise.all(images.map(async (img) => {
    const { prev, next } = await getAdjacentDates(img.date, normalizedLocale);
    return {
      ...img,
      prev,
      next,
      // 兼容前端使用的字段名
      cp: img.copyright,
      cpl: img.copyright_link,
    };
  }));

  res.json({ data });
}
