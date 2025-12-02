import { useState } from 'react';
import {
  Box,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  HStack,
  Select,
  Input,
  Card,
  CardBody,
  useToast,
  IconButton,
  Tooltip,
  Text,
  Flex,
  FormControl,
  FormLabel
} from '@chakra-ui/react';
import { FiCheck, FiX, FiEye } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReservations, updateReservation } from '../../api/reservation';

export default function ReservationManagement() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', 'admin', statusFilter, page],
    queryFn: () => getReservations({ 
      status: statusFilter || undefined, 
      page, 
      limit: 20 
    })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      updateReservation(id, { status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({
        title: '予約を更新しました',
        status: 'success',
        duration: 2000
      });
    },
    onError: () => {
      toast({
        title: '更新に失敗しました',
        status: 'error',
        duration: 3000
      });
    }
  });

  const handleApprove = (id: number) => {
    updateMutation.mutate({ id, status: 'approved' });
  };

  const handleReject = (id: number) => {
    updateMutation.mutate({ id, status: 'rejected' });
  };

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
      case 'completed':
        return <Badge colorScheme="blue">完了</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">予約管理</Heading>
        <Button
          colorScheme="blue"
          variant="outline"
          size="sm"
          onClick={() => {
            // TODO: CSVエクスポートAPIと接続
          }}
        >
          CSVダウンロード
        </Button>
      </Flex>

      {/* フィルター */}
      <Card mb={6}>
        <CardBody>
          <HStack spacing={4}>
            <FormControl maxW="200px">
              <FormLabel htmlFor="status-filter" srOnly>
                ステータスフィルタ
              </FormLabel>
              <Select
                id="status-filter"
                aria-label="ステータスフィルタ"
                placeholder="すべてのステータス"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="pending">承認待ち</option>
                <option value="approved">承認済み</option>
                <option value="rejected">却下</option>
                <option value="cancelled">キャンセル</option>
                <option value="completed">完了</option>
              </Select>
            </FormControl>
          </HStack>
        </CardBody>
      </Card>

      {/* 予約一覧 */}
      <Card>
        <CardBody>
          {isLoading ? (
            <Text>読み込み中...</Text>
          ) : data?.items.length === 0 ? (
            <Text color="gray.500">予約がありません</Text>
          ) : (
            <>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>ID</Th>
                    <Th>機材</Th>
                    <Th>部署</Th>
                    <Th>申請者</Th>
                    <Th>連絡先</Th>
                    <Th>期間</Th>
                    <Th>数量</Th>
                    <Th>状態</Th>
                    <Th>操作</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.items.map((r) => (
                    <Tr key={r.id}>
                      <Td>{r.id}</Td>
                      <Td>{r.equipment?.name || r.customEquipmentName || '未設定'}</Td>
                      <Td>{r.department}</Td>
                      <Td>{r.applicantName}</Td>
                      <Td>{r.contactInfo}</Td>
                      <Td fontSize="xs">
                        {formatDateTime(r.startTime)}
                        <br />
                        〜 {formatDateTime(r.endTime)}
                      </Td>
                      <Td>{r.quantity}</Td>
                      <Td>{getStatusBadge(r.status)}</Td>
                      <Td>
                        <HStack spacing={1}>
                          {r.status === 'pending' && (
                            <>
                              <Tooltip label="承認">
                                <IconButton
                                  aria-label="承認"
                                  icon={<FiCheck />}
                                  size="sm"
                                  colorScheme="green"
                                  onClick={() => handleApprove(r.id)}
                                />
                              </Tooltip>
                              <Tooltip label="却下">
                                <IconButton
                                  aria-label="却下"
                                  icon={<FiX />}
                                  size="sm"
                                  colorScheme="red"
                                  onClick={() => handleReject(r.id)}
                                />
                              </Tooltip>
                            </>
                          )}
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>

              {/* ページネーション */}
              {data && data.pagination.totalPages > 1 && (
                <Flex justify="center" mt={4}>
                  <HStack>
                    <Button
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      isDisabled={page === 1}
                    >
                      前へ
                    </Button>
                    <Text>
                      {page} / {data.pagination.totalPages}
                    </Text>
                    <Button
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      isDisabled={page >= data.pagination.totalPages}
                    >
                      次へ
                    </Button>
                  </HStack>
                </Flex>
              )}
            </>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
