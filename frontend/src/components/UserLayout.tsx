import { Box, Flex, Heading, Container } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';

export default function UserLayout() {
  return (
    <Box minH="100vh" bg="gray.50">
      {/* ヘッダー */}
      <Box bg="blue.600" color="white" py={4} shadow="md">
        <Container maxW="container.xl">
          <Heading size="lg">資機材予約システム</Heading>
        </Container>
      </Box>

      {/* メインコンテンツ */}
      <Container maxW="container.xl" py={6}>
        <Outlet />
      </Container>
    </Box>
  );
}
