import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout.tsx';
import DashboardPage from '../pages/DashboardPage.tsx';
import UserManagementPage from '../pages/UserManagementPage.tsx';
import FinancialControlPage from '../pages/FinancialControlPage.tsx';
import ApprovalPanelPage from '../pages/ApprovalPanelPage.tsx';
import CatalogPage from '../pages/CatalogPage.tsx';
import CartPage from '../pages/CartPage.tsx';
import OrderDetailPage from '../pages/OrderDetailPage.tsx';
import AllOrdersPage from '../pages/AllOrdersPage.tsx';

// Estas são as suas rotas antigas, agora num ficheiro separado
const AppRoutes = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/gerenciamento-usuarios" element={<UserManagementPage />} />
        <Route path="/controle-financeiro" element={<FinancialControlPage />} />
        <Route path="/painel-aprovacao" element={<ApprovalPanelPage />} />
        <Route path="/pedidos" element={<AllOrdersPage />} />
        <Route path="/catalogo-produtos" element={<CatalogPage />} />
        <Route path="/carrinho" element={<CartPage />} />
        <Route path="/pedido/:id" element={<OrderDetailPage />} />
        {/* Rota padrão para utilizadores autenticados */}
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </Layout>
  );
};

export default AppRoutes;

