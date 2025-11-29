import { Box, VStack, Link, Icon, Text, HStack } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { FiHome, FiBox, FiCalendar, FiSettings } from 'react-icons/fi';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'ダッシュボード', path: '/', icon: FiHome },
  { label: '資機材管理', path: '/equipment', icon: FiBox },
  { label: '予約カレンダー', path: '/reservations', icon: FiCalendar },
  { label: '設定', path: '/settings', icon: FiSettings },
];

const Sidebar = () => {
  const location = useLocation();

  return (
    <Box
      as="nav"
      w="240px"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={6}
      minH="calc(100vh - 64px)"
    >
      <VStack spacing={1} align="stretch" px={3}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              as={RouterLink}
              to={item.path}
              px={4}
              py={3}
              borderRadius="md"
              bg={isActive ? 'blue.50' : 'transparent'}
              color={isActive ? 'blue.600' : 'gray.700'}
              fontWeight={isActive ? 'semibold' : 'normal'}
              _hover={{
                bg: isActive ? 'blue.50' : 'gray.100',
                textDecoration: 'none',
              }}
            >
              <HStack spacing={3}>
                <Icon as={item.icon} boxSize={5} />
                <Text>{item.label}</Text>
              </HStack>
            </Link>
          );
        })}
      </VStack>
    </Box>
  );
};

export default Sidebar;
