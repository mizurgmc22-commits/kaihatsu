import { Box, SimpleGrid, Stat, StatLabel, StatNumber, Heading } from '@chakra-ui/react';
import { FiCalendar, FiPackage, FiUsers, FiClock } from 'react-icons/fi';

const Dashboard = () => {
  // ダミーデータ
  const stats = [
    { label: '本日の予約', value: 5, icon: FiCalendar, color: 'blue.500' },
    { label: '利用可能な機材', value: 12, icon: FiPackage, color: 'green.500' },
    { label: '利用中の機材', value: 8, icon: FiClock, color: 'orange.500' },
    { label: '登録ユーザー', value: 42, icon: FiUsers, color: 'purple.500' },
  ];

  return (
    <Box>
      <Heading as="h1" size="lg" mb={6}>
        ダッシュボード
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4} mb={8}>
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Box
              key={stat.label}
              p={5}
              shadow="md"
              borderWidth="1px"
              rounded="md"
              bg="white"
            >
              <Stat>
                <Box display="flex" alignItems="center" mb={2}>
                  <Box
                    as={Icon}
                    size="24px"
                    color={stat.color}
                    mr={2}
                    p={1}
                    bg={`${stat.color}10`}
                    borderRadius="md"
                  />
                  <StatLabel fontSize="sm" color="gray.600">
                    {stat.label}
                  </StatLabel>
                </Box>
                <StatNumber fontSize="2xl">{stat.value}</StatNumber>
              </Stat>
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
};

export default Dashboard;