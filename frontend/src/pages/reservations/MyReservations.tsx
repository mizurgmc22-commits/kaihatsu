import { useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Input,
  Button,
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
  Spinner,
  Icon,
  Divider,
} from "@chakra-ui/react";
import { FiClock, FiPackage, FiCalendar, FiUsers, FiHash, FiX } from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyReservations, cancelMyReservation } from "../../api/reservation";
import type { Reservation } from "../../types/reservation";
import PageHeader from "../../components/PageHeader";

export default function MyReservations() {
  const [contactInfo, setContactInfo] = useState("");
  const [searchedContact, setSearchedContact] = useState("");
  const [page, setPage] = useState(1);
  const [selectedReservation, setSelectedReservation] =
    useState<Reservation | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  // 予約履歴取得
  const { data, isLoading, error } = useQuery({
    queryKey: ["myReservations", searchedContact, page],
    queryFn: () => getMyReservations({ contactInfo: searchedContact }),
    enabled: !!searchedContact,
  });

  // キャンセルミューテーション
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelMyReservation(id, searchedContact),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReservations"] });
      toast({
        title: "予約をキャンセルしました",
        status: "success",
        duration: 3000,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "キャンセルに失敗しました",
        description: error.response?.data?.message || "エラーが発生しました",
        status: "error",
        duration: 5000,
      });
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInfo.trim()) {
      toast({
        title: "連絡先を入力してください",
        status: "warning",
        duration: 3000,
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
    const styles = {
      pending: { bg: "orange.100", color: "orange.700", text: "承認待ち" },
      approved: { bg: "green.100", color: "green.700", text: "承認済み" },
      rejected: { bg: "red.100", color: "red.700", text: "却下" },
      cancelled: { bg: "gray.100", color: "gray.600", text: "キャンセル" },
      completed: { bg: "blue.100", color: "blue.700", text: "完了" },
    };
    const style = styles[status as keyof typeof styles] || { bg: "gray.100", color: "gray.600", text: status };
    return (
      <Badge
        px={3}
        py={1}
        borderRadius="full"
        bg={style.bg}
        color={style.color}
        fontWeight="semibold"
        fontSize="xs"
        textTransform="none"
      >
        {style.text}
      </Badge>
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "orange.400";
      case "approved": return "green.400";
      case "rejected": return "red.400";
      case "cancelled": return "gray.400";
      case "completed": return "blue.400";
      default: return "gray.400";
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canCancel = (reservation: Reservation): boolean => {
    if (!["pending", "approved"].includes(reservation.status)) {
      return false;
    }
    const now = new Date();
    const startTime = new Date(reservation.startTime);
    return startTime > now;
  };

  return (
    <Box>
      <PageHeader
        title="予約履歴"
        description="過去の予約履歴を確認できます。連絡先を入力して検索してください。"
        icon={FiClock}
      />

      {/* 検索フォーム */}
      <Card mb={6}>
        <CardBody>
          <VStack as="form" onSubmit={handleSearch} spacing={4} align="stretch">
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              予約時に入力した連絡先（内線/PHS）を入力して検索してください。
            </Alert>
            <HStack>
              <FormControl>
                <FormLabel>連絡先</FormLabel>
                <Input
                  placeholder="例: 1234 / 内線1234 / PHS 5678"
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
                <VStack spacing={4} align="stretch">
                  {data?.items.map((r) => (
                    <Box
                      key={r.id}
                      bg="white"
                      borderRadius="xl"
                      shadow="md"
                      overflow="hidden"
                      _hover={{ shadow: "lg", transform: "translateY(-2px)" }}
                      transition="all 0.3s ease"
                    >
                      {/* カード上部: ステータスバー */}
                      <Box
                        h="4px"
                        bgGradient={`linear(to-r, ${getStatusColor(r.status)}, ${getStatusColor(r.status)})`}
                      />
                      
                      <Box p={5}>
                        <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
                          {/* 左側: メイン情報 */}
                          <Box flex="1" minW="280px">
                            {/* ヘッダー: ステータス + 機材名 */}
                            <HStack spacing={3} mb={3}>
                              {getStatusBadge(r.status)}
                            </HStack>
                            
                            <HStack spacing={2} mb={3}>
                              <Icon as={FiPackage} color="blue.500" boxSize={5} />
                              <Text fontWeight="bold" fontSize="xl" color="gray.800">
                                {r.equipment?.name ||
                                  r.customEquipmentName ||
                                  "未設定"}
                              </Text>
                            </HStack>

                            <Divider mb={3} />
                            
                            {/* 詳細情報 */}
                            <VStack align="start" spacing={2}>
                              {r.equipment?.category?.name && (
                                <HStack fontSize="sm" color="gray.600">
                                  <Icon as={FiPackage} boxSize={4} />
                                  <Text>カテゴリ: {r.equipment.category.name}</Text>
                                </HStack>
                              )}
                              <HStack fontSize="sm" color="gray.600">
                                <Icon as={FiUsers} boxSize={4} />
                                <Text>部署: {r.department || "未設定"}</Text>
                              </HStack>
                              <HStack fontSize="sm" color="gray.600">
                                <Icon as={FiHash} boxSize={4} />
                                <Text>数量: {r.quantity} 個</Text>
                              </HStack>
                            </VStack>
                          </Box>

                          {/* 右側: 期間 + ボタン */}
                          <VStack align="stretch" spacing={4}>
                            {/* 期間ボックス */}
                            <Box
                              bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                              bgGradient="linear(135deg, blue.500, purple.500)"
                              p={4}
                              borderRadius="lg"
                              minW="200px"
                              color="white"
                            >
                              <HStack mb={2}>
                                <Icon as={FiCalendar} boxSize={4} />
                                <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wide">
                                  利用期間
                                </Text>
                              </HStack>
                              <VStack align="start" spacing={1}>
                                <Text fontSize="sm" fontWeight="bold">
                                  {formatDateTime(r.startTime)}
                                </Text>
                                <Text fontSize="xs" opacity={0.8}>〜</Text>
                                <Text fontSize="sm" fontWeight="bold">
                                  {formatDateTime(r.endTime)}
                                </Text>
                              </VStack>
                            </Box>

                            {/* キャンセルボタン */}
                            {canCancel(r) && (
                              <Button
                                size="md"
                                colorScheme="red"
                                variant="outline"
                                leftIcon={<FiX />}
                                onClick={() => handleCancelClick(r)}
                                _hover={{ bg: "red.50" }}
                              >
                                キャンセル
                              </Button>
                            )}
                          </VStack>
                        </Flex>
                      </Box>
                    </Box>
                  ))}
                </VStack>

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
                    {selectedReservation.equipment?.name ||
                      selectedReservation.customEquipmentName}
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    期間: {formatDateTime(selectedReservation.startTime)} 〜{" "}
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
