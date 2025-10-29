import React from 'react';
import './App.css';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import Customers from './pages/Customers';
import Items from './pages/Items';
import Invoices from './pages/Invoices';
import CashBank from './pages/CashBank';
import Collections from './pages/Collections';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Customers />} />
        <Route path="items" element={<Items />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="cash-bank" element={<CashBank />} />
        <Route path="collections" element={<Collections />} />
      </Route>
    </Routes>
  );
}

export default App;
