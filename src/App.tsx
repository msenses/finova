import React from 'react';
import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RequireAuth } from './components/RequireAuth';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Items from './pages/Items';
import Invoices from './pages/Invoices';
import CashBank from './pages/CashBank';
import Collections from './pages/Collections';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="items" element={<Items />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="cash-bank" element={<CashBank />} />
        <Route path="collections" element={<Collections />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
