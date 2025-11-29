import { Box, VStack, Link, Icon, Text, Divider } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { 
  FiHome, 
  FiCalendar, 
  FiPackage, 
  FiSettings,
  FiList
} from 'react-icons/fi';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
}

function NavItem({ to, icon, label, isActive }: NavItemProps) {
  return (
    <Link
      as={RouterLink}
      to={to}
      display="flex"
      alignItems="center"
      px={4}
      py={3}
      borderRadius="md"
      bg={isActive ? 'blue.50' : 'transparent'}
      color={isActive ? 'blue.600' : 'gray.700'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={{ bg: 'blue.50', color: 'blue.600', textDecoration: 'none' }}
      transition="all 0.2s"
    >
      <Icon as={icon} mr={3} boxSize={5} />
      <Text>{label}</Text>
    </Link>
  );
}

export default function AdminSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: '/admin', icon: FiHome, label: 'ダッシュボード' },
    { to: '/admin/reservations', icon: FiCalendar, label: '予約管理' },
    { to: '/admin/equipment', icon: FiPackage, label: '資機材管理' },
    { to: '/admin/settings', icon: FiSettings, label: '設定' },
  ];

  return (
    <Box
      w="240px"
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={4}
      flexShrink={0}
    >
      <VStack spacing={1} align="stretch" px={2}>
        <Text px={4} py={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
          管理メニュー
        </Text>
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={
              item.to === '/admin' 
                ? currentPath === '/admin' 
                : currentPath.startsWith(item.to)
            }
          />
        ))}
      </VStack>

      <Divider my={4} />

      <VStack spacing={1} align="stretch" px={2}>
        <Text px={4} py={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
          ユーザー向け
        </Text>
        <NavItem
          to="/"
          icon={FiList}
          label="予約カレンダー"
          isActive={false}
        />
      </VStack>
    </Box>
  );
}
