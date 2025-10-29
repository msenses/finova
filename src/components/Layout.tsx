import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { HealthCheck } from './HealthCheck';
import { AuthPanel } from './AuthPanel';

export function Layout() {
  const linkStyle: React.CSSProperties = {
    padding: '8px 12px',
    borderRadius: 8,
    textDecoration: 'none',
    color: '#0b3a85'
  };

  const activeStyle: React.CSSProperties = {
    ...linkStyle,
    background: 'rgba(11,58,133,0.08)'
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #eef3fb 0%, #ffffff 100%)' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 16 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/finova_logo.png" alt="Finova" width={36} height={36} />
          <div style={{ color: '#0b3a85', fontWeight: 700 }}>Finova</div>
        </Link>
        <nav style={{ display: 'flex', gap: 8 }}>
          <NavLink to="/" end style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>Cari</NavLink>
          <NavLink to="/items" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>Stok</NavLink>
          <NavLink to="/invoices" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>Faturalar</NavLink>
          <NavLink to="/cash-bank" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>Kasa/Banka</NavLink>
          <NavLink to="/collections" style={({ isActive }) => (isActive ? activeStyle : linkStyle)}>Tahsilat</NavLink>
        </nav>
      </header>
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: 16 }}>
        <HealthCheck />
        <AuthPanel />
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}


