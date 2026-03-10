import { getImageByDate } from '../../lib/dataStore';

export default function handler(req, res) {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ error: '需要提供日期参数' });
  }

  try {
    const imgData = getImageByDate(date);

    if (!imgData) {
      return res.status(404).json({ error: '未找到该日期的图片数据' });
    }

    res.status(200).json({
      success: true,
      data: {
        imgdetail: imgData.imgdetail || null,
        title: imgData.title || null,
      },
    });
  } catch (error) {
    console.error('获取图片故事数据失败:', error);
    res.status(500).json({ error: '获取图片故事数据失败' });
  }
}