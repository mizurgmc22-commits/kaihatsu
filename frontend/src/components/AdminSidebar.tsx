import {
  Box,
  VStack,
  Link,
  Icon,
  Text,
  Divider,
  Flex,
  IconButton,
  Tooltip,
} from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  FiHome,
  FiCalendar,
  FiPackage,
  FiSettings,
  FiList,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function NavItem({ to, icon, label, isActive, isCollapsed, onNavigate }: NavItemProps) {

  return (
    <Link
      as={RouterLink}
      to={to}
      display="flex"
      alignItems="center"
      justifyContent={isCollapsed ? 'center' : 'flex-start'}
      px={isCollapsed ? 0 : 4}
      py={3}
      borderRadius="md"
      bg={isActive ? 'blue.50' : 'transparent'}
      color={isActive ? 'blue.600' : 'gray.700'}
      fontWeight={isActive ? 'semibold' : 'normal'}
      _hover={{ bg: 'blue.50', color: 'blue.600', textDecoration: 'none' }}
      transition="all 0.2s"
      onClick={onNavigate}
    >
      <Icon as={icon} boxSize={5} />
      {!isCollapsed && <Text ml={3}>{label}</Text>}
    </Link>
  );
}

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export default function AdminSidebar({ isCollapsed = false, onToggleCollapse, onNavigate }: AdminSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: '/admin', icon: FiHome, label: 'ダッシュボード' },
    { to: '/admin/reservations', icon: FiCalendar, label: '予約管理' },
    { to: '/admin/calendar', icon: FiCalendar, label: '管理カレンダー' },
    { to: '/admin/gantt', icon: FiCalendar, label: 'ガントチャート' },
    { to: '/admin/equipment', icon: FiPackage, label: '資機材管理' },
    { to: '/admin/settings', icon: FiSettings, label: '設定' }
  ];

  return (
    <Box
      w={isCollapsed ? '72px' : '240px'}
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={4}
      flexShrink={0}
      transition="width 0.2s ease"
    >
      <Flex align="center" justify={isCollapsed ? 'center' : 'space-between'} px={isCollapsed ? 0 : 4} mb={4}>
        {!isCollapsed && (
          <Text fontSize="sm" fontWeight="bold" color="gray.600">
            メニュー
          </Text>
        )}
        {onToggleCollapse && (
          <Tooltip label={isCollapsed ? '展開' : '折りたたむ'} placement="right">
            <IconButton
              aria-label="toggle sidebar"
              icon={isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
              size="sm"
              variant="ghost"
              onClick={onToggleCollapse}
            />
          </Tooltip>
        )}
      </Flex>

      <VStack spacing={1} align="stretch" px={isCollapsed ? 0 : 2}>
        {!isCollapsed && (
          <Text px={4} py={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
            管理メニュー
          </Text>
        )}
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
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </VStack>

      <Divider my={4} />

      <VStack spacing={1} align="stretch" px={isCollapsed ? 0 : 2}>
        {!isCollapsed && (
          <Text px={4} py={2} fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
            ユーザー向け
          </Text>
        )}
        <NavItem
          to="/"
          icon={FiList}
          label="予約カレンダー"
          isActive={false}
          isCollapsed={isCollapsed}
          onNavigate={onNavigate}
        />
      </VStack>
    </Box>
  );
}
