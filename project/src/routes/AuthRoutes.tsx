import { Routes, Route, Navigate } from 'react-router-dom';
import { Login } from '../pages/auth/Login.tsx';
import { SignUp } from '../pages/auth/SignUp.tsx';
import { ForgotPassword } from '../pages/auth/ForgotPassword.tsx';
import { EmailVerification } from '../pages/auth/EmailVerification.tsx';

const AuthRoutes = () => {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Login
            onNavigateToSignUp={() => { window.location.href = '/signup'; }}
            onNavigateToForgotPassword={() => { window.location.href = '/forgot-password'; }}
          />
        }
      />
      <Route
        path="/signup"
        element={
          <SignUp onNavigateToSignIn={() => { window.location.href = '/login'; }} />
        }
      />
      <Route
        path="/forgot-password"
        element={
          <ForgotPassword onNavigateToSignIn={() => { window.location.href = '/login'; }} />
        }
      />
      <Route
        path="/verify-email"
        element={
          <EmailVerification onNavigateToSignIn={() => { window.location.href = '/login'; }} />
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default AuthRoutes;

