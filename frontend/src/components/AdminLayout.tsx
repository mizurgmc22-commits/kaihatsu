import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Flex flex="1">
        <AdminSidebar />
        <Box flex="1" bg="gray.50" p={6} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Box>
  );
}
