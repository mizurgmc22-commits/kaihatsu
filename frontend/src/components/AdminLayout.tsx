import {
  Box,
  Flex,
  IconButton,
  Drawer,
  DrawerContent,
  DrawerOverlay,
  useDisclosure,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { FiMenu } from 'react-icons/fi';
import Navbar from './Navbar';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const disclosure = useDisclosure();
  const isDesktop = useBreakpointValue({ base: false, lg: true });

  useEffect(() => {
    if (!isDesktop) {
      setIsCollapsed(false);
    } else {
      disclosure.onClose();
    }
  }, [isDesktop, disclosure]);

  const handleNavigate = () => {
    if (!isDesktop) {
      disclosure.onClose();
    }
  };

  return (
    <Box minH="100vh" display="flex" flexDirection="column">
      <Navbar />
      <Flex flex="1" bg="gray.50" position="relative">
        {isDesktop ? (
          <AdminSidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
            onNavigate={handleNavigate}
          />
        ) : (
          <>
            <Drawer isOpen={disclosure.isOpen} placement="left" onClose={disclosure.onClose} size="xs">
              <DrawerOverlay />
              <DrawerContent maxW="240px" pt={4} pb={6} px={0}>
                <AdminSidebar onNavigate={handleNavigate} />
              </DrawerContent>
            </Drawer>
            <IconButton
              aria-label="open sidebar"
              icon={<FiMenu />}
              position="fixed"
              top="80px"
              left="16px"
              colorScheme="blue"
              boxShadow="lg"
              display={{ base: 'flex', lg: 'none' }}
              zIndex={1200}
              onClick={disclosure.onOpen}
            />
          </>
        )}

        <Box flex="1" p={{ base: 4, md: 6 }} overflowY="auto">
          <Outlet />
        </Box>
      </Flex>
    </Box>
  );
}
