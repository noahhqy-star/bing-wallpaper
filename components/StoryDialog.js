import { useEffect, useState, useRef } from 'react';

const StoryDialog = ({ visible, imgInfo, onHide }) => {
  const [title, setTitle] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);
  const overlayRef = useRef();

  useEffect(() => {
    if (imgInfo) {
      if (imgInfo.title) setTitle(imgInfo.title);
      setStoryContent(imgInfo.imgdetail || '');
    }
  }, [imgInfo]);

  // 进场/退场动画
  useEffect(() => {
    if (visible) {
      // 下一帧触发动画
      requestAnimationFrame(() => setShow(true));
    } else {
      setShow(false);
    }
  }, [visible]);

  // 对话框可见时从 API 获取最新故事数据
  useEffect(() => {
    if (visible && imgInfo && imgInfo.date) {
      setLoading(true);
      fetch(`/api/story?date=${imgInfo.date}`)
        .then((response) => {
          if (!response.ok) throw new Error('获取故事数据失败');
          return response.json();
        })
        .then((data) => {
          if (data.success && data.data) {
            if (data.data.title) setTitle(data.data.title);
            if (data.data.imgdetail) setStoryContent(data.data.imgdetail);
          }
        })
        .catch((error) => {
          console.error('获取故事数据出错:', error);
        })
        .finally(() => setLoading(false));
    }
  }, [visible, imgInfo]);

  const formatStoryContent = (htmlContent) => {
    if (!htmlContent || typeof window === 'undefined') return htmlContent || '';
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      doc.querySelectorAll('p').forEach((p) => {
        p.innerHTML = p.innerHTML.trim();
      });
      return doc.body.innerHTML;
    } catch {
      return htmlContent;
    }
  };

  // ESC 关闭
  useEffect(() => {
    if (!visible) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onHide();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [visible, onHide]);

  // 点击遮罩关闭
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onHide();
  };

  if (!visible) return null;

  return (
    <div
      className={`story-overlay ${show ? 'visible' : ''}`}
      ref={overlayRef}
      onClick={handleOverlayClick}
    >
      <div className={`story-panel ${show ? 'visible' : ''}`}>
        {/* 关闭按钮 */}
        <button className="story-close" onClick={onHide} aria-label="关闭">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* 标题区 */}
        <div className="story-header">
          <div className="story-label">图片故事</div>
          <h2 className="story-title">{title || '未知标题'}</h2>
          <div className="story-divider" />
        </div>

        {/* 内容区 */}
        <div className="story-body">
          {loading ? (
            <div className="story-loading">
              <div className="loading-dots">
                <span /><span /><span />
              </div>
            </div>
          ) : storyContent ? (
            <div
              className="story-text"
              dangerouslySetInnerHTML={{ __html: formatStoryContent(storyContent) }}
            />
          ) : (
            <p className="story-empty">暂无图片故事</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoryDialog;