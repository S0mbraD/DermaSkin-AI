import React from 'react';
import { Tag } from 'antd';
import { BulbOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

interface Props {
  title?: string;
  insights: string[];
  type?: 'info' | 'success' | 'warning';
  icon?: React.ReactNode;
  style?: React.CSSProperties;
}

const TYPE_STYLES = {
  info: { bg: 'linear-gradient(135deg, #4361EE08, #7C3AED06)', border: '#4361EE20', color: '#4361EE', tagBg: '#4361EE15' },
  success: { bg: 'linear-gradient(135deg, #05CD9908, #10B98106)', border: '#05CD9920', color: '#05CD99', tagBg: '#05CD9915' },
  warning: { bg: 'linear-gradient(135deg, #F59E0B08, #EF444406)', border: '#F59E0B20', color: '#F59E0B', tagBg: '#F59E0B15' },
};

const AIInsightCard: React.FC<Props> = ({ title = 'AI 智能分析', insights, type = 'info', icon, style }) => {
  const ts = TYPE_STYLES[type];
  if (!insights.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        padding: '16px 20px',
        borderRadius: 14,
        background: ts.bg,
        border: `1px solid ${ts.border}`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        {icon ?? <BulbOutlined style={{ color: ts.color, fontSize: 16 }} />}
        <span style={{ fontWeight: 800, color: ts.color, fontSize: 14 }}>{title}</span>
        <Tag style={{ background: ts.tagBg, color: ts.color, border: 'none', fontSize: 10, fontWeight: 600 }}>
          <ThunderboltOutlined style={{ marginRight: 2 }} />AI
        </Tag>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {insights.map((text, i) => (
          <div key={i} style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.8, paddingLeft: 6, borderLeft: `2px solid ${ts.color}30` }}>
            {text}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AIInsightCard;
