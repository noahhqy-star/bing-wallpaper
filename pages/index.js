import { useState, useEffect, useRef, useCallback } from 'react';
import dayjs from 'dayjs';
import Head from 'next/head';

export default function IndexPage() {
  const [list, setList] = useState([]);
  const [nextDate, setNextDate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [isEmpty, setIsEmpty] = useState(false);

  const pageRef = useRef();
  const loadingRef = useRef(false);

  const checkMode = useCallback(() => {
    const mobile = window.innerWidth < 1024 || window.innerWidth < window.innerHeight;
    setIsMobile(mobile);
    return mobile;
  }, []);

  const queryList = useCallback((date, mobile) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);

    fetch(`/api/list?date=${date}&count=10`)
      .then((res) => res.json())
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setIsEmpty(true);
          setLoading(false);
          loadingRef.current = false;
          return;
        }

        let count = 0;
        const maxCount = mobile ? 0 : 2;
        data.forEach((item, i) => {
          let span = 1;
          if (count < maxCount && maxCount) span = Math.ceil(Math.random() * 2);
          if ((maxCount - count) === (10 - i) && maxCount) span = 2;
          if (span === 2) count += 1;
          item.style = {
            gridColumnStart: `span ${span}`,
            gridRowStart: `span ${span}`,
          };
          item.dateStr = dayjs(String(item.date), 'YYYYMMDD').format('YY.MM.DD');
          item.span = span;
        });

        const last = data[data.length - 1];
        setList((prev) => {
          const existingDates = new Set(prev.map((item) => item.date));
          const unique = data.filter((item) => !existingDates.has(item.date));
          return [...prev, ...unique];
        });

        if (!last.prev) setIsEmpty(true);
        setNextDate(last.prev);
        setLoading(false);
        loadingRef.current = false;
      })
      .catch(() => {
        setLoading(false);
        loadingRef.current = false;
      });
  }, []);

  // 滚动加载
  useEffect(() => {
    const handleScroll = () => {
      if (loadingRef.current || isEmpty) return;
      setShowTop(document.documentElement.scrollTop > 700);
      if (
        pageRef.current &&
        document.documentElement.clientHeight + document.documentElement.scrollTop + 50 >
        pageRef.current.clientHeight
      ) {
        queryList(nextDate, isMobile);
      }
    };

    window.addEventListener('scroll', handleScroll);
    // 首次检查是否需要加载更多
    setTimeout(handleScroll, 0);

    return () => window.removeEventListener('scroll', handleScroll);
  }, [nextDate, isMobile, isEmpty, queryList]);

  // 初始化
  useEffect(() => {
    const mobile = checkMode();
    queryList(0, mobile);
  }, [checkMode, queryList]);

  return (
    <div className={`index-page ${isMobile ? 'mobile-page' : ''}`} ref={pageRef}>
      <Head>
        <title>必应壁纸 - 每日精选</title>
      </Head>
      <div id="head" />
      <div
        className="img-list"
        style={{
          gridTemplateRows: isMobile
            ? `repeat(${list.length}, 75vw)`
            : `repeat(${Math.ceil(list.length / 10) * 4}, 19vw)`,
        }}
      >
        {list.map((img) => (
          <div className="img-item" style={img.style} key={img.date}>
            <div className="cover">
              <a className="iconfont icon-eye" href={`/${img.date}`} />
              <span className="text">{img.copyright}</span>
            </div>
            <div className={`date-str size-${img.span}`}>{img.dateStr}</div>
            <div
              className="img-bg"
              style={{
                backgroundImage: `url('//cn.bing.com${img.urlbase}_1024x768.jpg')`,
              }}
            />
          </div>
        ))}
      </div>
      {isEmpty && <div className="empty-text">—— 到底啦 ——</div>}
      <div className="floating-actions">
        <div
          className={`float-btn to-top ${!showTop ? 'hide' : ''}`}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          title="返回顶部"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </div>
        <a href="/random" className="float-btn" title="随机壁纸">
          <i className="iconfont icon-touzi" />
        </a>
      </div>
    </div>
  );
}