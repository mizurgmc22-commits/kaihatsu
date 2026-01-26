import {
  Box,
  VStack,
  Link,
  Icon,
  Text,
  Flex,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
  FiHome,
  FiCalendar,
  FiPackage,
  FiClock,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

interface NavItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate?: () => void;
}

function NavItem({
  to,
  icon,
  label,
  isActive,
  isCollapsed,
  onNavigate,
}: NavItemProps) {
  return (
    <Link
      as={RouterLink}
      to={to}
      display="flex"
      alignItems="center"
      justifyContent={isCollapsed ? "center" : "flex-start"}
      px={isCollapsed ? 0 : 4}
      py={3}
      borderRadius="md"
      bg={isActive ? "blue.50" : "transparent"}
      color={isActive ? "blue.600" : "gray.700"}
      fontWeight={isActive ? "semibold" : "normal"}
      _hover={{ bg: "blue.50", color: "blue.600", textDecoration: "none" }}
      transition="all 0.2s"
      onClick={onNavigate}
    >
      <Icon as={icon} boxSize={5} />
      {!isCollapsed && <Text ml={3}>{label}</Text>}
    </Link>
  );
}

interface UserSidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}

export default function UserSidebar({
  isCollapsed = false,
  onToggleCollapse,
  onNavigate,
}: UserSidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { to: "/", icon: FiHome, label: "トップページ" },
    { to: "/calendar", icon: FiCalendar, label: "予約カレンダー" },
    { to: "/equipment", icon: FiPackage, label: "資機材一覧" },
    { to: "/history", icon: FiClock, label: "予約履歴" },
  ];

  return (
    <Box
      w={isCollapsed ? "72px" : "240px"}
      bg="white"
      borderRight="1px"
      borderColor="gray.200"
      py={4}
      flexShrink={0}
      transition="width 0.2s ease"
    >
      <Flex
        align="center"
        justify={isCollapsed ? "center" : "space-between"}
        px={isCollapsed ? 0 : 4}
        mb={4}
      >
        {!isCollapsed && (
          <Text fontSize="sm" fontWeight="bold" color="gray.600">
            メニュー
          </Text>
        )}
        {onToggleCollapse && (
          <Tooltip
            label={isCollapsed ? "展開" : "折りたたむ"}
            placement="right"
          >
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
        {navItems.map((item) => (
          <NavItem
            key={item.to}
            to={item.to}
            icon={item.icon}
            label={item.label}
            isActive={
              item.to === "/"
                ? currentPath === "/"
                : currentPath.startsWith(item.to)
            }
            isCollapsed={isCollapsed}
            onNavigate={onNavigate}
          />
        ))}
      </VStack>
    </Box>
  );
}
