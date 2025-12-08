import {
  Box,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Card,
  CardBody,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  VStack
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { getReservations } from '../../api/reservation';

export default function AdminDashboard() {
  const today = new Date().toISOString().split('T')[0];

  // 今日の予約を取得
  const { data: todayReservations } = useQuery({
    queryKey: ['reservations', 'today'],
    queryFn: () => getReservations({ startDate: today, endDate: today, limit: 10 })
  });

  // 承認待ちの予約を取得
  const { data: pendingReservations } = useQuery({
    queryKey: ['reservations', 'pending'],
    queryFn: () => getReservations({ status: 'pending', limit: 10 })
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge colorScheme="yellow">承認待ち</Badge>;
      case 'approved':
        return <Badge colorScheme="green">承認済み</Badge>;
      case 'rejected':
        return <Badge colorScheme="red">却下</Badge>;
      case 'cancelled':
        return <Badge colorScheme="gray">キャンセル</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>管理者ダッシュボード</Heading>

      {/* 統計カード */}
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6} mb={8}>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>本日の予約</StatLabel>
              <StatNumber>{todayReservations?.pagination.total || 0}</StatNumber>
              <StatHelpText>{today}</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>承認待ち</StatLabel>
              <StatNumber color="orange.500">
                {pendingReservations?.pagination.total || 0}
              </StatNumber>
              <StatHelpText>要対応</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <Stat>
              <StatLabel>今月の予約</StatLabel>
              <StatNumber>-</StatNumber>
              <StatHelpText>集計中</StatHelpText>
            </Stat>
          </CardBody>
        </Card>
      </SimpleGrid>

      {/* 承認待ち予約一覧 */}
      <Card mb={6}>
        <CardBody>
          <Heading size="md" mb={4}>承認待ちの予約</Heading>
          {pendingReservations?.items.length === 0 ? (
            <Text color="gray.500">承認待ちの予約はありません</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>機材</Th>
                  <Th>部署</Th>
                  <Th>申請者</Th>
                  <Th>期間</Th>
                  <Th>状態</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pendingReservations?.items.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.equipment?.name || r.customEquipmentName || '未設定'}</Td>
                    <Td>{r.department}</Td>
                    <Td>{r.applicantName}</Td>
                    <Td>
                      {formatDateTime(r.startTime)} 〜 {formatDateTime(r.endTime)}
                    </Td>
                    <Td>{getStatusBadge(r.status)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 本日の予約一覧 */}
      <Card>
        <CardBody>
          <Heading size="md" mb={4}>本日の予約</Heading>
          {todayReservations?.items.length === 0 ? (
            <Text color="gray.500">本日の予約はありません</Text>
          ) : (
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>機材</Th>
                  <Th>部署</Th>
                  <Th>申請者</Th>
                  <Th>時間</Th>
                  <Th>状態</Th>
                </Tr>
              </Thead>
              <Tbody>
                {todayReservations?.items.map((r) => (
                  <Tr key={r.id}>
                    <Td>{r.equipment?.name || r.customEquipmentName || '未設定'}</Td>
                    <Td>{r.department}</Td>
                    <Td>{r.applicantName}</Td>
                    <Td>
                      {formatDateTime(r.startTime)} 〜 {formatDateTime(r.endTime)}
                    </Td>
                    <Td>{getStatusBadge(r.status)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
