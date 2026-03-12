import { useState, useEffect, useRef, useCallback } from 'react';
import { message, Spin } from 'antd';
import dayjs from 'dayjs';
import DownDialog from '../components/DownDialog';
import StoryDialog from '../components/StoryDialog';
import Error from 'next/error';
import Head from 'next/head';

export async function getServerSideProps(context) {
  const { getImageByDate, getAdjacentDates, getRandomImage } = require('../lib/dataStore');
  const { date } = context.query;

  let img;
  if (date === 'random') {
    img = getRandomImage();
  } else {
    img = getImageByDate(date);
  }

  if (!img) {
    return { props: { img: null } };
  }

  const adjacent = getAdjacentDates(img.date);
  const now = dayjs();
  const tomorrow = now.add(1, 'day').startOf('day');

  return {
    props: {
      img: {
        ...img,
        prev: adjacent.prev,
        next: adjacent.next,
        // 兼容前端使用的字段名
        cp: img.copyright,
        cpl: img.copyright_link,
      },
      timeout: tomorrow.diff(now) + 5000,
      nextKey: tomorrow.format('YYYYMMDD'),
    },
  };
}

export default function DatePage({ img, timeout, nextKey }) {
  const [loading, setLoading] = useState(true);
  const [showBottom, setShowBottom] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [downDialogVisible, setDownDialogVisible] = useState(false);
  const [storyDialogVisible, setStoryDialogVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasNext, setHasNext] = useState(img ? img.next : null);

  const checkMode = useCallback(() => {
    setIsMobile(window.innerWidth < 1024 || window.innerWidth < window.innerHeight);
  }, []);

  const loadingImg = useRef();

  const changePosition = useCallback((key) => {
    if (!img) return;
    const target = key === 'next' ? hasNext : img.prev;
    if (!target) {
      return message.warning(
        key === 'prev' ? '没有更早的辣！' : '已经是最新的辣！'
      );
    }
    setLoading(true);
    window.location = `/${target}`;
  }, [img, hasNext]);

  useEffect(() => {
    if (loadingImg.current && loadingImg.current.complete) {
      setLoading(false);
    }
    checkMode();

    const handleKeyUp = ({ keyCode }) => {
      if (keyCode === 37 || keyCode === 39) {
        changePosition({ 39: 'prev', 37: 'next' }[keyCode]);
      }
    };

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', checkMode);

    // 到明天自动设置下一张图的日期
    let timer;
    if (img && !img.next) {
      timer = setTimeout(() => {
        setHasNext(Number(nextKey));
      }, timeout);
    }

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', checkMode);
    };
  }, [checkMode, changePosition, img, nextKey, timeout]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        message.error('全屏模式出错：' + err.message);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        message.error('退出全屏模式出错：' + err.message);
      });
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // 自动隐藏底部信息栏
  const onMouseMove = () => {
    setShowBottom(true);
    setNow(Date.now());
  };

  useEffect(() => {
    const tick = setTimeout(() => setShowBottom(false), 5000);
    return () => clearTimeout(tick);
  }, [now]);

  if (!img || !img.date) return <Error statusCode={404} />;

  const imgDate = dayjs(String(img.date), 'YYYYMMDD');
  const imageTitle = img.title || null;
  const isCurrentYear = imgDate.year() === dayjs().year();

  const getLocationSearchUrl = (copyright) => {
    if (!copyright) return null;
    const match = copyright.split('(')[0].trim();
    if (!match || match.length < 2) return null;
    return `https://earth.google.com/web/search/${encodeURIComponent(match)}`;
  };
  const earthUrl = getLocationSearchUrl(img.cp);

  return (
    <Spin spinning={loading} size="large">
      <div className={`detail-page ${isMobile ? 'mobile-mode' : ''}`} onMouseMove={onMouseMove}>
        <Head>
          <title>
            {imageTitle && imageTitle.trim()
              ? `${imageTitle} - 必应壁纸`
              : '必应壁纸 - 每日精选'}
          </title>
        </Head>
        <img
          className="loading-img"
          ref={loadingImg}
          src={`//cn.bing.com${img.urlbase}_${isMobile ? '768x1280' : '1920x1080'}.jpg`}
          onLoad={() => setLoading(false)}
        />
        <div
          className={`img-content-box ${isFullscreen ? 'fullscreen-mode' : ''}`}
          style={{
            backgroundImage: `url(//cn.bing.com${img.urlbase}_${isMobile ? '768x1280' : '1920x1080'}.jpg)`,
          }}
          onClick={(e) => {
            if (isFullscreen && !e.target.closest('.fullscreen-icon')) {
              toggleFullscreen();
            }
          }}
        >
          {/* 底部渐变遮罩 */}
          {!isFullscreen && <div className={`bottom-gradient ${!showBottom ? 'faded' : ''}`} />}

          {!isMobile && (
            <div
              className={`fullscreen-icon ${(showBottom || isMobile) ? 'actived' : ''} ${isFullscreen ? 'is-fullscreen' : ''}`}
              onClick={toggleFullscreen}
            >
              <img src="/fullscreen-icon.svg" alt="全屏" />
            </div>
          )}

          {!isFullscreen && (
            <>
              {[{ key: 'next', arrow: 'left', target: hasNext }, { key: 'prev', arrow: 'right', target: img.prev }].map(
                ({ key, arrow, target }) =>
                  target ? (
                     <div
                      key={`page-${arrow}`}
                      className={`page-icon icon-${arrow} ${(showBottom || isMobile) ? 'actived' : ''}`}
                      onClick={() => changePosition(key)}
                    >
                      <i className={`iconfont icon-arrow-${arrow}`} />
                    </div>
                  ) : null
              )}

              <div className={`img-info ${!showBottom ? 'collapsed' : ''}`}>
                <div className="img-title">
                  {imageTitle && imageTitle.trim() ? imageTitle : ''}
                </div>
                <div className="img-date-label">
                  {isCurrentYear
                    ? imgDate.format('MMMM D')
                    : imgDate.format('MMMM D, YYYY')}
                </div>
                <div className="img-content">
                  <div className="info-divider" />
                  <div className="img-cp">
                    <div className="img-cp-txt">
                      {img.cp}
                    </div>
                  </div>
                  <div className="action-bar">
                    <a href="/" className="action-item" title="首页">
                      <i className="iconfont icon-bing" />
                    </a>
                    <div className="action-item" onClick={() => setDownDialogVisible(true)} title="下载壁纸">
                      <i className="iconfont icon-download" />
                    </div>
                    <a href="/random" className="action-item" title="随机壁纸">
                      <i className="iconfont icon-touzi" />
                    </a>
                    <div className="action-divider" />
                    {earthUrl && (
                      <a href={earthUrl} target="_blank" rel="noreferrer" className="action-item" title="在地球中探索">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="2" y1="12" x2="22" y2="12" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      </a>
                    )}
                    <div className="action-item" onClick={() => setStoryDialogVisible(true)} title="图片故事">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <DownDialog
        isMobile={isMobile}
        visible={downDialogVisible}
        onHide={() => setDownDialogVisible(false)}
        imgInfo={img}
      />
      <StoryDialog
        visible={storyDialogVisible}
        onHide={() => setStoryDialogVisible(false)}
        imgInfo={img}
      />
    </Spin>
  );
}