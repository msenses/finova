import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function Layout() {
  return (
    <div className="app-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main className="container" style={{ flex: 1 }}>
        <div className="card">
          <Outlet />
        </div>
      </main>
    </div>
  );
}


