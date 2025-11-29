import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Center, Spinner } from '@chakra-ui/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <Center h="100vh">
        <Spinner size="xl" color="blue.500" />
      </Center>
    );
  }

  // 未ログインの場合
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 管理者権限が必要な場合
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
