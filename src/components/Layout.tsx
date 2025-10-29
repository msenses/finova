import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { HealthCheck } from './HealthCheck';
import { AuthPanel } from './AuthPanel';

export function Layout() {
  return (
    <div>
      <header className="header container">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img src="/finova_logo.png" alt="Finova" width={36} height={36} />
          <div style={{ color: 'var(--brand-700)', fontWeight: 700 }}>Finova</div>
        </Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Cari</NavLink>
          <NavLink to="/items" className={({ isActive }) => (isActive ? 'active' : '')}>Stok</NavLink>
          <NavLink to="/invoices" className={({ isActive }) => (isActive ? 'active' : '')}>Faturalar</NavLink>
          <NavLink to="/cash-bank" className={({ isActive }) => (isActive ? 'active' : '')}>Kasa/Banka</NavLink>
          <NavLink to="/collections" className={({ isActive }) => (isActive ? 'active' : '')}>Tahsilat</NavLink>
        </nav>
      </header>
      <main className="container">
        <HealthCheck />
        <AuthPanel />
        <div className="card" style={{ marginTop: 16 }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}


