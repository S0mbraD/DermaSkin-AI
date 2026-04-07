import React, { useState, useEffect, useCallback } from 'react';
import { Alert, Button, Progress, Space } from 'antd';
import { CloudDownloadOutlined, SyncOutlined, RocketOutlined } from '@ant-design/icons';
import { isElectron } from '@/services/dbService';

interface UpdateInfo {
  version?: string;
  releaseNotes?: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

const UpdateNotification: React.FC = () => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isElectron()) return;
    const updater = (window as any).electronAPI?.updater;
    if (!updater) return;

    const cleanups: (() => void)[] = [];

    cleanups.push(updater.onAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setDismissed(false);
    }));

    cleanups.push(updater.onProgress((p: DownloadProgress) => {
      setProgress(p);
    }));

    cleanups.push(updater.onDownloaded((info: UpdateInfo) => {
      setDownloading(false);
      setDownloaded(true);
      if (info?.version) setUpdateInfo(prev => ({ ...prev, version: info.version }));
    }));

    cleanups.push(updater.onError(() => {
      setDownloading(false);
    }));

    return () => { cleanups.forEach(fn => fn()); };
  }, []);

  const handleDownload = useCallback(async () => {
    const updater = (window as any).electronAPI?.updater;
    if (!updater) return;
    setDownloading(true);
    setProgress({ percent: 0, bytesPerSecond: 0, transferred: 0, total: 0 });
    await updater.download();
  }, []);

  const handleInstall = useCallback(() => {
    (window as any).electronAPI?.updater?.install();
  }, []);

  if (!isElectron() || dismissed || !updateInfo) return null;

  const versionLabel = updateInfo.version ? `v${updateInfo.version}` : '';

  if (downloaded) {
    return (
      <div style={wrapperStyle}>
        <Alert
          type="success"
          banner
          showIcon={false}
          style={alertStyle}
          message={
            <div style={messageRow}>
              <RocketOutlined style={{ fontSize: 16, marginRight: 8 }} />
              <span>更新 {versionLabel} 已就绪，重启后生效</span>
              <Space style={{ marginLeft: 'auto' }}>
                <Button size="small" type="primary" onClick={handleInstall}>
                  立即重启
                </Button>
                <Button size="small" onClick={() => setDismissed(true)}>
                  稍后
                </Button>
              </Space>
            </div>
          }
        />
      </div>
    );
  }

  if (downloading && progress) {
    return (
      <div style={wrapperStyle}>
        <Alert
          type="info"
          banner
          showIcon={false}
          style={alertStyle}
          message={
            <div style={messageRow}>
              <SyncOutlined spin style={{ fontSize: 16, marginRight: 8 }} />
              <span>正在下载更新 {versionLabel}…</span>
              <div style={{ flex: 1, maxWidth: 220, marginLeft: 12 }}>
                <Progress
                  percent={progress.percent}
                  size="small"
                  strokeColor={{ from: '#4F6EF7', to: '#38B2AC' }}
                />
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <Alert
        type="info"
        banner
        showIcon={false}
        style={alertStyle}
        message={
          <div style={messageRow}>
            <CloudDownloadOutlined style={{ fontSize: 16, marginRight: 8 }} />
            <span>发现新版本 {versionLabel}</span>
            <Space style={{ marginLeft: 'auto' }}>
              <Button size="small" type="primary" onClick={handleDownload}>
                下载更新
              </Button>
              <Button size="small" onClick={() => setDismissed(true)}>
                忽略
              </Button>
            </Space>
          </div>
        }
      />
    </div>
  );
};

const wrapperStyle: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 999,
  marginBottom: 8,
  animation: 'slideDown 0.3s ease-out',
};

const alertStyle: React.CSSProperties = {
  borderRadius: 8,
  background: 'linear-gradient(135deg, #EBF0FF 0%, #E8FBF5 100%)',
  border: '1px solid #D6E0FF',
};

const messageRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  fontSize: 13,
};

export default UpdateNotification;
