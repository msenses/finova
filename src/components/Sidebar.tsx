import React from 'react';
import { NavLink } from 'react-router-dom';

export function Sidebar() {
  return (
    <aside className="sidebar" style={{ width: 240, padding: 16, borderRight: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <img src="/finova_logo.png" alt="Finova" width={28} height={28} />
        <div style={{ color: 'var(--brand-700)', fontWeight: 700 }}>Finova</div>
      </div>
      <nav className="nav" style={{ display: 'flex', flexDirection: 'column' }}>
        <NavLink to="/app" end className={({ isActive }) => (isActive ? 'active' : '')}>Dashboard</NavLink>
        <NavLink to="/app/customers" className={({ isActive }) => (isActive ? 'active' : '')}>Cari Hesaplar</NavLink>
        <NavLink to="/app/items" className={({ isActive }) => (isActive ? 'active' : '')}>Stok / Ürünler</NavLink>
        <NavLink to="/app/invoices" className={({ isActive }) => (isActive ? 'active' : '')}>Faturalar</NavLink>
        <NavLink to="/app/cash-bank" className={({ isActive }) => (isActive ? 'active' : '')}>Kasa / Banka</NavLink>
        <NavLink to="/app/collections" className={({ isActive }) => (isActive ? 'active' : '')}>Tahsilat</NavLink>
      </nav>
    </aside>
  );
}


