import React, { useState } from 'react';
import { Segmented } from 'antd';
import { BookOutlined } from '@ant-design/icons';
import FrameworkTab from './FrameworkTab';
import AssessmentTab from './AssessmentTab';
import TrackingTab from './TrackingTab';
import DecisionTab from './DecisionTab';
import TeachingTab from './TeachingTab';

const TABS = [
  { value: 'framework', label: '能力框架' },
  { value: 'teaching', label: '教学分析' },
  { value: 'assessment', label: '循证评估' },
  { value: 'tracking', label: '成效追踪' },
  { value: 'decision', label: '决策支持' },
];

const EvidenceBased: React.FC = () => {
  const [activeTab, setActiveTab] = useState('framework');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>
          <BookOutlined style={{ marginRight: 8, color: 'var(--primary)' }} />
          循证教学中心
        </h2>
        <Segmented
          value={activeTab}
          onChange={v => setActiveTab(v as string)}
          options={TABS}
        />
      </div>
      {activeTab === 'framework' && <FrameworkTab />}
      {activeTab === 'teaching' && <TeachingTab />}
      {activeTab === 'assessment' && <AssessmentTab />}
      {activeTab === 'tracking' && <TrackingTab />}
      {activeTab === 'decision' && <DecisionTab />}
    </div>
  );
};

export default EvidenceBased;
