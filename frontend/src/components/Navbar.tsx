import { Box, Button, Flex, Heading, useColorMode } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { MoonIcon, SunIcon } from '@chakra-ui/icons';

const Navbar = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  return (
    <Box bg="white" px={4} boxShadow="sm">
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Heading as={RouterLink} to="/" size="md" color="brand.500">
          資機材予約システム
        </Heading>
        <Flex alignItems="center" gap={4}>
          <Button onClick={toggleColorMode}>
            {colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
          </Button>
          <Button
            as={RouterLink}
            to="/login"
            colorScheme="brand"
            variant="outline"
          >
            ログイン
          </Button>
        </Flex>
      </Flex>
    </Box>
  );
};

export default Navbar;