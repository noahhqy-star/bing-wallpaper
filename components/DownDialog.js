import { useEffect, useState, useRef } from 'react';
import { Modal, Radio, Spin, Select, Button, message } from 'antd';
import download from '../util/download';

const DownDialog = ({ isMobile, visible, imgInfo, onHide }) => {
  const [size, setSize] = useState('1920x1080');
  const [imgLoading, setImgLoading] = useState(true);

  const sizeMap = [
    ['UHD', '1920x1200', '1920x1080', '1366x768', '1280x768'],
    ['768x1280', '720x1280', '480x800'],
  ];

  const updateSize = (val) => {
    window.localStorage.setItem('bing_down_size', val);
    setImgLoading(true);
    setSize(val);
  };

  const onClickDown = () => {
    const { urlbase, date } = imgInfo;
    if (size === 'UHD') {
      download(`//cn.bing.com${urlbase}_UHD.jpg`, `bing_${date}_4K.jpg`);
    } else {
      download(`//cn.bing.com${urlbase}_${size}.jpg`, `bing_${date}_${size}.jpg`);
    }
    message.info('加入下载！');
  };

  useEffect(() => {
    let defaultSize = window.localStorage.getItem('bing_down_size') || '1920x1080';
    if (isMobile) defaultSize = '768x1280';
    setSize(defaultSize);
  }, [isMobile]);

  const downImg = useRef();
  useEffect(() => {
    if (downImg.current && downImg.current.complete) {
      setImgLoading(false);
    }
  }, [imgInfo]);

  const imgSrc =
    size === 'UHD'
      ? `//cn.bing.com${imgInfo.urlbase}_UHD.jpg`
      : `//cn.bing.com${imgInfo.urlbase}_${size}.jpg`;

  return (
    <Modal
      open={visible}
      onClose={onHide}
      onCancel={onHide}
      footer={null}
      wrapClassName={`down-dialog mode-${isMobile ? 'mobile' : ''}`}
    >
      <div className="down-dialog-content">
        {imgInfo && (
          <div>
            <Spin spinning={imgLoading}>
              <img
                ref={downImg}
                onLoad={() => setImgLoading(false)}
                className="down-img"
                src={imgSrc}
              />
            </Spin>

            {isMobile ? (
              <div className="select-size-container">
                <Select value={size} onChange={(v) => updateSize(v)}>
                  {sizeMap.flat().map((s) => (
                    <Select.Option key={`size-${s}`} value={s}>
                      {s}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            ) : (
              <div className="select-size-container">
                {sizeMap.map((arr, i) => (
                  <div className="size-row" key={`size-type-${i}`}>
                    <i
                      className={`iconfont type-icon icon-${['pc', 'mobile'][i]} ${arr.includes(size) ? 'actived' : ''}`}
                    />
                    <Radio.Group value={size} onChange={(e) => updateSize(e.target.value)}>
                      {arr.map((s) => (
                        <Radio.Button key={`${i}-${s}`} value={s}>
                          {s}
                        </Radio.Button>
                      ))}
                    </Radio.Group>
                  </div>
                ))}
              </div>
            )}
            <Button type="primary" className="down-icon" onClick={onClickDown}>
              <i className="iconfont icon-download" />
              {isMobile ? '' : '下载'}
            </Button>
          </div>
        )}
        <a
          href={imgSrc}
          download={size === 'UHD' ? `bing_${imgInfo.date}_4K.jpg` : `bing_${imgInfo.date}_${size}.jpg`}
          style={{ display: 'none' }}
        />
      </div>
    </Modal>
  );
};

export default DownDialog;
