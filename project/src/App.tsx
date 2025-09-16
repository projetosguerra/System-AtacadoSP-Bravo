import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import UserManagementPage from './pages/UserManagementPage';
import FinancialControlPage from './pages/FinancialControlPage';
import ApprovalPanelPage from './pages/ApprovalPanelPage';
import CatalogPage from './pages/CatalogPage';
import CartPage from './pages/CartPage';
import OrderDetailPage from './pages/OrderDetailPage';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

function App() {
  return (
    <AuthProvider>
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
            </Routes>
          </Layout>
        </Router>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
