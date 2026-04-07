import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  SafetyCertificateOutlined,
  BookOutlined,
  VideoCameraOutlined,
  TeamOutlined,
  RobotOutlined,
  FileTextOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MedicineBoxOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import SettingsDrawer from '../SettingsDrawer';

interface NavItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'eval', icon: <SafetyCertificateOutlined />, label: '评估中心', path: '/' },
  { key: 'evidence', icon: <BookOutlined />, label: '循证教学', path: '/evidence' },
  { key: 'video', icon: <VideoCameraOutlined />, label: '视频工作台', path: '/video' },
  { key: 'students', icon: <TeamOutlined />, label: '学员管理', path: '/students' },
  { key: 'ai', icon: <RobotOutlined />, label: 'AI 助手', path: '/ai' },
  { key: 'reports', icon: <FileTextOutlined />, label: '报告中心', path: '/reports' },
];

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = NAV_ITEMS.find(item => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  })?.key ?? 'eval';

  const width = collapsed ? 64 : 220;

  return (
    <div style={{
      width,
      minWidth: width,
      height: '100vh',
      background: '#FFFFFF',
      borderRight: '1px solid var(--border-light)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.25s ease',
      position: 'relative',
      zIndex: 10,
    }}>
      <div style={{
        height: 56,
        display: 'flex',
        alignItems: 'center',
        padding: collapsed ? '0 12px' : '0 18px',
        borderBottom: '1px solid var(--border-light)',
        gap: 10,
        cursor: 'pointer',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }} onClick={() => navigate('/')}>
        <div style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #4361EE, #7C3AED)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 16,
          flexShrink: 0,
        }}>
          <MedicineBoxOutlined />
        </div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.2 }}>
              DermaSkin AI
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 0.5 }}>
              皮肤科技能评估系统
            </div>
          </div>
        )}
      </div>

      <div style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(item => {
          const isActive = item.key === activeKey;
          const btn = (
            <div
              key={item.key}
              onClick={() => navigate(item.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: collapsed ? '10px 0' : '10px 14px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                marginBottom: 4,
                borderRadius: 10,
                cursor: 'pointer',
                background: isActive ? '#4361EE0F' : 'transparent',
                color: isActive ? '#4361EE' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = '#F4F7FE';
              }}
              onMouseLeave={e => {
                if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </div>
          );
          return collapsed ? <Tooltip key={item.key} title={item.label} placement="right">{btn}</Tooltip> : btn;
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--border-light)' }}>
        <Tooltip title={collapsed ? '系统设置' : ''} placement="right">
          <div
            onClick={() => setSettingsOpen(true)}
            style={{
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '0' : '0 18px',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              fontSize: 13,
              gap: 10,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#4361EE'; e.currentTarget.style.background = '#4361EE08'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <SettingOutlined style={{ fontSize: 15, flexShrink: 0 }} />
            {!collapsed && <span style={{ fontWeight: 500 }}>系统设置</span>}
          </div>
        </Tooltip>
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            height: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderTop: '1px solid var(--border-light)',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: 14,
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      </div>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
};

export default Sidebar;
