import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';

const Layout = () => {
  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Flex flex="1">
        <Sidebar />
        <Box flex="1" bg="gray.50" p={6} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Box>
  );
};

export default Layout;