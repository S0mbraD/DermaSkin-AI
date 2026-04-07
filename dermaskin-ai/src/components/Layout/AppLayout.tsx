import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import FloatingAIBall from '../FloatingAIBall';
import UpdateNotification from '../UpdateNotification';

const AppLayout: React.FC = () => {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{
        flex: 1,
        overflow: 'auto',
        background: 'var(--bg-main)',
        padding: '20px 24px',
      }}>
        <UpdateNotification />
        <Outlet />
      </div>
      <FloatingAIBall />
    </div>
  );
};

export default AppLayout;
