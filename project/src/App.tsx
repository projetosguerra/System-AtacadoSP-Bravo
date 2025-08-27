import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import ApprovalPanelPage from './pages/ApprovalPanelPage';
import FinancialControlPage from './pages/FinancialControlPage';
import CatalogPage from './pages/CatalogPage';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />

          <Route path="/gerenciamento-usuarios" element={<UserManagementPage />} />

          <Route path="/painel-aprovacao" element={<ApprovalPanelPage />} />

          <Route path="/controle-financeiro" element={<FinancialControlPage />} />

          <Route path="/catalogo-produtos" element={<CatalogPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;