import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { DataProvider } from './context/DataContext';
import AppRoutes from './routes/AppRoutes';
import AuthRoutes from './routes/AuthRoutes';

const AppRouter = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-gray-100">Carregando sessão...</div>;
  }

  return user ? <AppRoutes /> : <AuthRoutes />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <DataProvider>
          <CartProvider>
            <AppRouter />
          </CartProvider>
        </DataProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

