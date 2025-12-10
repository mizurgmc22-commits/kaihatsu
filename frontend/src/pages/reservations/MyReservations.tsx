import { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Flex,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  useToast,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  Spinner
} from '@chakra-ui/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMyReservations, cancelMyReservation } from '../../api/reservation';
import type { Reservation } from '../../types/reservation';

export default function MyReservations() {
  const [contactInfo, setContactInfo] = useState('');
  const [searchedContact, setSearchedContact] = useState('');
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 予約履歴取得
  const { data, isLoading, error } = useQuery({
    queryKey: ['myReservations', searchedContact, page],
    queryFn: () => getMyReservations({ contactInfo: searchedContact, page, limit: 10 }),
    enabled: !!searchedContact
  });

  // キャンセルミューテーション
  const cancelMutation = useMutation({
    mutationFn: (id: number) => cancelMyReservation(id, searchedContact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReservations'] });
      toast({
        title: '予約をキャンセルしました',
        status: 'success',
        duration: 3000
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'キャンセルに失敗しました',
        description: error.response?.data?.message || 'エラーが発生しました',
        status: 'error',
        duration: 5000
      });
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) {
      toast({
        title: '連絡先を入力してください',
        status: 'warning',
        duration: 3000
      });
      return;
    }
    setSearchedContact(contactInfo.trim());
    setPage(1);
  };

  const handleCancelClick = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    onOpen();
  };

  const handleConfirmCancel = () => {
    if (selectedReservation) {
      cancelMutation.mutate(selectedReservation.id);
    }
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

  const canCancel = (reservation: Reservation): boolean => {
    if (!['pending', 'approved'].includes(reservation.status)) {
      return false;
    }
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    return startTime > now;
  };

  return (
    <Box>
      <Heading size="lg" mb={6}>
        予約履歴確認
      </Heading>

      {/* 検索フォーム */}
      <Card mb={6}>
        <CardBody>
          <VStack as="form" onSubmit={handleSearch} spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              予約時に入力した連絡先（メールアドレスまたは電話番号）を入力して検索してください。
            </Alert>
            <HStack>
              <FormControl>
                <FormLabel>連絡先</FormLabel>
                <Input
                  placeholder="例: example@hospital.jp または 090-1234-5678"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                />
              </FormControl>
              <Button type="submit" colorScheme="blue" alignSelf="flex-end">
                検索
              </Button>
            </HStack>
          </VStack>
        </CardBody>
      </Card>

      {/* 検索結果 */}
      {searchedContact && (
        <Card>
          <CardBody>
            {isLoading ? (
              <Flex justify="center" py={10}>
                <Spinner size="lg" />
              </Flex>
            ) : error ? (
              <Alert status="error">
                <AlertIcon />
                予約履歴の取得に失敗しました
              </Alert>
            ) : data?.items.length === 0 ? (
              <Text color="gray.500" textAlign="center" py={10}>
                予約履歴がありません
              </Text>
            ) : (
              <>
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>予約ID</Th>
                      <Th>機材</Th>
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
                        <Td>
                          <Text fontWeight="medium">
                            {r.equipment?.name || r.customEquipmentName || '未設定'}
                          </Text>
                          {r.equipment?.category?.name && (
                            <Text fontSize="xs" color="gray.500">
                              {r.equipment.category.name}
                            </Text>
                          )}
                        </Td>
                        <Td fontSize="xs">
                          {formatDateTime(r.startTime)}
                          <br />
                          〜 {formatDateTime(r.endTime)}
                        </Td>
                        <Td>{r.quantity}</Td>
                        <Td>{getStatusBadge(r.status)}</Td>
                        <Td>
                          {canCancel(r) ? (
                            <Button
                              size="xs"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleCancelClick(r)}
                            >
                              キャンセル
                            </Button>
                          ) : (
                            <Text fontSize="xs" color="gray.400">
                              -
                            </Text>
                          )}
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
      )}

      {/* キャンセル確認モーダル */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>予約キャンセルの確認</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedReservation && (
              <VStack align="stretch" spacing={3}>
                <Alert status="warning">
                  <AlertIcon />
                  この予約をキャンセルしますか？
                </Alert>
                <Box p={4} bg="gray.50" borderRadius="md">
                  <Text fontWeight="bold">
                    {selectedReservation.equipment?.name || selectedReservation.customEquipmentName}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    期間: {formatDateTime(selectedReservation.startTime)} 〜{' '}
                    {formatDateTime(selectedReservation.endTime)}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    数量: {selectedReservation.quantity}
                  </Text>
                </Box>
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              戻る
            </Button>
            <Button
              colorScheme="red"
              onClick={handleConfirmCancel}
              isLoading={cancelMutation.isPending}
            >
              キャンセルする
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
