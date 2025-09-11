import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import FinancialControlPage from './pages/FinancialControlPage';
import ApprovalPanelPage from './pages/ApprovalPanelPage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import OrderDetailPage from './pages/OrderDetailPage';
import AllOrdersPage from './pages/AllOrdersPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <CartProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/gerenciamento-usuarios" element={<UserManagementPage />} />
                <Route path="/controle-financeiro" element={<FinancialControlPage />} />
                <Route path="/painel-aprovacao" element={<ApprovalPanelPage />} />
                <Route path="/catalogo-produtos" element={<CatalogPage />} />
                <Route path="/carrinho" element={<CartPage />} />
                <Route path="/pedido/:id" element={<OrderDetailPage />} />
                <Route path="/todos-pedidos" element={<AllOrdersPage />} />
              </Routes>
            </Layout>
          </Router>
        </CartProvider>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
