import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@chakra-ui/react';
import UserLayout from './components/UserLayout';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/auth/Login';
import ReservationCalendar from './pages/reservations/ReservationCalendar';
import AdminDashboard from './pages/admin/AdminDashboard';
import ReservationManagement from './pages/admin/ReservationManagement';
import EquipmentList from './pages/equipment/EquipmentList';

function App() {
  return (
    <Box minH="100vh">
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* ユーザー向け - 予約カレンダーのみ（認証不要） */}
        <Route path="/" element={<UserLayout />}>
          <Route index element={<ReservationCalendar />} />
        </Route>

        {/* 管理者向け（認証必須） */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="reservations" element={<ReservationManagement />} />
          <Route path="equipment" element={<EquipmentList />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Box>
  );
}

export default App;