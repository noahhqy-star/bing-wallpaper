import { getImageList, getAdjacentDates } from '../../lib/dataStore';

export default async function handler(req, res) {
  const { date = '0', count = '12' } = req.query;
  const dateNum = Number(date);
  const countNum = Number(count);

  const images = await getImageList({ beforeDate: dateNum, count: countNum });

  // 为每张图片附加 prev/next 导航信息
  const data = await Promise.all(images.map(async (img) => {
    const { prev, next } = await getAdjacentDates(img.date);
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
