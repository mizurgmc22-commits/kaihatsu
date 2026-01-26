import { useState } from "react";
import {
  Box,
  Button,
  VStack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Switch,
  useDisclosure,
  useToast,
  Flex,
  Spinner,
  Badge,
  HStack,
  Text,
  Link,
  Icon,
} from "@chakra-ui/react";
import { FiExternalLink, FiUpload } from "react-icons/fi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAdminTopPageContent,
  createTopPageContent,
  updateTopPageContent,
  deleteTopPageContent,
  uploadTopPageFile,
  contentTypeLabels,
  type DashboardContent,
  type CreateContentInput,
  type UpdateContentInput,
} from "../../api/topPageContent";
import TopPageRenderer from "../../components/TopPage/TopPageRenderer";
import { getReservations } from "../../api/reservation";

const contentTypes = ["announcement", "guide", "flow", "pdf", "link"] as const;

export default function AdminDashboardContent() {
  const [editingContent, setEditingContent] = useState<DashboardContent | null>(
    null,
  );
  const [formData, setFormData] = useState<CreateContentInput>({
    type: "announcement",
    title: "",
    content: "",
    fileUrl: "",
    linkUrl: "",
    order: 0,
    isActive: true,
  });
  const [isUploading, setIsUploading] = useState(false);

  // プレビュー用のダミー状態
  const [period, setPeriod] = useState<"today" | "month">("today");
  const today = new Date().toISOString().split("T")[0];

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  // コンテンツ取得
  const { data: contents, isLoading } = useQuery({
    queryKey: ["top-page-content-admin"],
    queryFn: getAdminTopPageContent,
  });

  // 今日の予約（テーブル表示用）
  const { data: todayReservations } = useQuery({
    queryKey: ["reservations", "today"],
    queryFn: () =>
      getReservations({ startDate: today, endDate: today, limit: 10 }),
  });

  const announcements =
    contents?.filter((c) => c.type === "announcement") || [];
  const guides = contents?.filter((c) => c.type === "guide") || [];
  const flows = contents?.filter((c) => c.type === "flow") || [];
  const pdfs = contents?.filter((c) => c.type === "pdf") || [];
  const links = contents?.filter((c) => c.type === "link") || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createTopPageContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["top-page-content-admin"] });
      toast({ title: "コンテンツを作成しました", status: "success" });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || error.message || "作成に失敗しました";
      toast({
        title: "作成に失敗しました",
        description: message,
        status: "error",
        isClosable: true,
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateContentInput }) =>
      updateTopPageContent(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["top-page-content-admin"] });
      toast({ title: "コンテンツを更新しました", status: "success" });
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || error.message || "更新に失敗しました";
      toast({
        title: "更新に失敗しました",
        description: message,
        status: "error",
        isClosable: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTopPageContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["top-page-content-admin"] });
      toast({ title: "コンテンツを削除しました", status: "success" });
    },
    onError: () => {
      toast({ title: "削除に失敗しました", status: "error" });
    },
  });

  // Handlers
  const handleOpenCreate = (type?: DashboardContent["type"]) => {
    setEditingContent(null);
    setFormData({
      type: type || "announcement",
      title: "",
      content: "",
      fileUrl: "",
      linkUrl: "",
      order: 0,
      isActive: true,
    });
    onOpen();
  };

  const handleOpenEdit = (content: DashboardContent) => {
    setEditingContent(content);
    setFormData({
      type: content.type,
      title: content.title,
      content: content.content || "",
      fileUrl: content.fileUrl || "",
      linkUrl: content.linkUrl || "",
      order: content.order,
      isActive: content.isActive,
    });
    onOpen();
  };

  const handleCloseModal = () => {
    setEditingContent(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "タイトルを入力してください", status: "warning" });
      return;
    }

    if (editingContent) {
      updateMutation.mutate({ id: editingContent.id, input: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (content: DashboardContent) => {
    if (window.confirm(`「${content.title}」を削除しますか？`)) {
      deleteMutation.mutate(content.id);
    }
  };

  // サーバーへアップロード（念のため機能としては残すが、UIではGoogle Drive推奨）
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await uploadTopPageFile(file);
      setFormData((prev) => ({ ...prev, fileUrl: result.fileUrl }));
      toast({ title: "ファイルをアップロードしました", status: "success" });
    } catch {
      toast({ title: "アップロードに失敗しました", status: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  // Helper functions used by TopPageRenderer
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge colorScheme="yellow">承認待ち</Badge>;
      case "approved":
        return <Badge colorScheme="green">承認済み</Badge>;
      case "rejected":
        return <Badge colorScheme="red">却下</Badge>;
      case "cancelled":
        return <Badge colorScheme="gray">キャンセル</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Flex justify="center" align="center" h="500px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  return (
    <Box>
      <Box
        mb={4}
        bg="blue.50"
        p={4}
        borderRadius="md"
        borderLeft="4px solid"
        borderColor="blue.500"
      >
        <VStack align="start" spacing={1}>
          <Box fontWeight="bold">トップページ編集モード</Box>
          <Box fontSize="sm">
            表示されているコンテンツの編集・削除ボタンから直接操作できます。「追加」ボタンで新しいコンテンツを追加できます。
          </Box>
        </VStack>
      </Box>

      {/* 編集モードのレンダラー */}
      <TopPageRenderer
        today={today}
        period={period}
        setPeriod={setPeriod}
        announcements={announcements}
        guides={guides}
        flows={flows}
        pdfs={pdfs}
        links={links}
        todayReservations={todayReservations}
        formatDateTime={formatDateTime}
        getStatusBadge={getStatusBadge}
        isEditable={true}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onAdd={handleOpenCreate}
      />

      {/* 作成・編集モーダル */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {editingContent ? "コンテンツを編集" : "新規コンテンツを作成"}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4} align="stretch">
              <FormControl isRequired isReadOnly={!!editingContent}>
                <FormLabel>タイプ</FormLabel>
                <Select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as DashboardContent["type"],
                    }))
                  }
                  isDisabled={!!editingContent}
                >
                  {contentTypes.map((type) => (
                    <option key={type} value={type}>
                      {contentTypeLabels[type]}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired>
                <FormLabel>タイトル</FormLabel>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="タイトルを入力"
                />
              </FormControl>

              {(formData.type === "announcement" ||
                formData.type === "guide" ||
                formData.type === "flow") && (
                <FormControl>
                  <FormLabel>内容</FormLabel>
                  <Textarea
                    value={formData.content || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="内容を入力（Markdown対応）"
                    rows={6}
                  />
                </FormControl>
              )}

              {formData.type === "pdf" && (
                <FormControl>
                  <FormLabel>PDFファイル (Google Drive推奨)</FormLabel>
                  <VStack align="stretch" spacing={2}>
                    <Textarea
                      value={formData.fileUrl || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          fileUrl: e.target.value,
                        }))
                      }
                      placeholder="Google Driveの共有リンクを貼り付け (https://drive.google.com/...)"
                      rows={3}
                    />
                    <Text fontSize="xs" color="gray.500">
                      アップロードしたPDFを「リンクを知っている全員」に共有し、そのリンクをここに貼り付けてください。
                      <br />※ 閲覧権限があればダウンロードも可能です。
                    </Text>
                  </VStack>
                </FormControl>
              )}

              {formData.type === "link" && (
                <FormControl>
                  <FormLabel>リンクURL</FormLabel>
                  <Input
                    value={formData.linkUrl || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        linkUrl: e.target.value,
                      }))
                    }
                    placeholder="https://example.com"
                  />
                </FormControl>
              )}

              <HStack>
                <FormControl w="auto">
                  <FormLabel>表示順序</FormLabel>
                  <Input
                    type="number"
                    w="100px"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        order: parseInt(e.target.value) || 0,
                      }))
                    }
                  />
                </FormControl>

                <FormControl w="auto">
                  <FormLabel>公開</FormLabel>
                  <Switch
                    isChecked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
                    }
                  />
                </FormControl>
              </HStack>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={handleCloseModal}>
              キャンセル
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingContent ? "更新" : "作成"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
