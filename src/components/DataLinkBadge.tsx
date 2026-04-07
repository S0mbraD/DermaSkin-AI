import React from 'react';
import { Tag, Tooltip } from 'antd';
import { ExperimentOutlined, DatabaseOutlined } from '@ant-design/icons';

interface Props {
  isReal: boolean;
  style?: React.CSSProperties;
}

const DataLinkBadge: React.FC<Props> = ({ isReal, style }) => {
  if (isReal) {
    return (
      <Tooltip title="数据来源：AI 视频分析">
        <Tag
          icon={<ExperimentOutlined />}
          style={{
            background: 'linear-gradient(135deg, #4361EE18, #7C3AED18)',
            color: '#7C3AED', border: 'none', fontSize: 10, fontWeight: 600, ...style,
          }}
        >
          AI 分析
        </Tag>
      </Tooltip>
    );
  }
  return (
    <Tooltip title="数据来源：训练记录">
      <Tag
        icon={<DatabaseOutlined />}
        style={{
          background: '#F0F0F0', color: '#8C8C8C', border: 'none', fontSize: 10, ...style,
        }}
      >
        训练数据
      </Tag>
    </Tooltip>
  );
};

export default DataLinkBadge;
