import { Box, Flex, Heading, Container, Button } from '@chakra-ui/react';
import { Outlet, useNavigate } from 'react-router-dom';

export default function UserLayout() {
  const navigate = useNavigate();

  return (
    <Box minH="100vh" bg="gray.50">
      {/* ヘッダー */}
      <Box bg="blue.600" color="white" py={4} shadow="md">
        <Container maxW="container.xl">
          <Flex align="center" justify="space-between">
            <Heading size="lg">資機材予約システム</Heading>
            <Button
              variant="outline"
              colorScheme="whiteAlpha"
              size="sm"
              onClick={() => navigate('/login')}
            >
              管理者ページ
            </Button>
          </Flex>
        </Container>
      </Box>

      {/* メインコンテンツ */}
      <Container maxW="container.xl" py={6}>
        <Outlet />
      </Container>
    </Box>
  );
}
