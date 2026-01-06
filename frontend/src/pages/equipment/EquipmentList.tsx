import { useState } from "react";
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
  Input,
  Select,
  IconButton,
  useDisclosure,
  Spinner,
  Text,
  Flex,
  InputGroup,
  InputLeftElement,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Image,
} from "@chakra-ui/react";
import {
  SearchIcon,
  AddIcon,
  EditIcon,
  DeleteIcon,
  ViewIcon,
} from "@chakra-ui/icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getEquipmentList,
  getCategories,
  deleteEquipment,
} from "../../api/equipment";
import type { Equipment } from "../../types/equipment";
import EquipmentFormModal from "./EquipmentFormModal";
import EquipmentDetailModal from "./EquipmentDetailModal";
import EquipmentCategoryModal from "./EquipmentCategoryModal";
import EquipmentByCategory from "./EquipmentByCategory";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";

export default function EquipmentList() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    isOpen: isFormOpen,
    onOpen: onFormOpen,
    onClose: onFormClose,
  } = useDisclosure();
  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose,
  } = useDisclosure();
  const {
    isOpen: isCategoryOpen,
    onOpen: onCategoryOpen,
    onClose: onCategoryClose,
  } = useDisclosure();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // 資機材一覧取得
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment", { search, categoryId: categoryFilter, page }],
    queryFn: () =>
      getEquipmentList({
        search: search || undefined,
        categoryId: categoryFilter ? Number(categoryFilter) : undefined,
        page,
        limit: 20,
      }),
  });

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // 削除処理
  const deleteMutation = useMutation({
    mutationFn: deleteEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "資機材を無効化しました",
        status: "success",
        duration: 3000,
      });
    },
    onError: () => {
      toast({ title: "削除に失敗しました", status: "error", duration: 3000 });
    },
  });

  const handleAdd = () => {
    setSelectedEquipment(null);
    setIsEditMode(false);
    onFormOpen();
  };

  const handleEdit = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setIsEditMode(true);
    onFormOpen();
  };

  const handleView = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    onDetailOpen();
  };

  const handleDelete = (equipment: Equipment) => {
    if (window.confirm(`「${equipment.name}」を無効化しますか？`)) {
      deleteMutation.mutate(equipment.id);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  if (error) {
    return <Text color="red.500">エラーが発生しました</Text>;
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">資機材管理</Heading>
        <HStack spacing={3}>
          <Button variant="outline" onClick={onCategoryOpen}>
            カテゴリ管理
          </Button>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={handleAdd}>
            新規登録
          </Button>
        </HStack>
      </Flex>

      <Tabs colorScheme="blue">
        <TabList mb={4}>
          <Tab>一覧</Tab>
          <Tab>カテゴリ別</Tab>
        </TabList>
        <TabPanels>
          <TabPanel px={0}>
            {/* 検索・フィルタ */}
            <HStack as="form" onSubmit={handleSearch} mb={6} spacing={4}>
              <InputGroup maxW="300px">
                <InputLeftElement>
                  <SearchIcon color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="資機材名で検索"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </InputGroup>
              <Select
                aria-label="カテゴリフィルタ"
                title="カテゴリフィルタ"
                placeholder="カテゴリで絞り込み"
                maxW="200px"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                {categories?.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </Select>
              <Button type="submit" colorScheme="gray">
                検索
              </Button>
            </HStack>

            {/* テーブル */}
            {isLoading ? (
              <Flex justify="center" py={10}>
                <Spinner size="lg" />
              </Flex>
            ) : (
              <>
                <Table
                  variant="simple"
                  bg="white"
                  borderRadius="md"
                  shadow="sm"
                >
                  <Thead bg="gray.50">
                    <Tr>
                      <Th w="80px">画像</Th>
                      <Th>名称</Th>
                      <Th>カテゴリ</Th>
                      <Th isNumeric>保有数</Th>
                      <Th>保管場所</Th>
                      <Th>状態</Th>
                      <Th>操作</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data?.items.map((equipment) => {
                      const imageSrc = resolveEquipmentImage(
                        equipment.name,
                        equipment.imageUrl
                      );
                      return (
                        <Tr key={equipment.id}>
                          <Td>
                            <Box
                              w="60px"
                              h="45px"
                              borderRadius="md"
                              overflow="hidden"
                              bg="gray.100"
                            >
                              {imageSrc ? (
                                <Image
                                  src={imageSrc}
                                  alt={equipment.name}
                                  w="100%"
                                  h="100%"
                                  objectFit="cover"
                                />
                              ) : (
                                <Flex
                                  w="100%"
                                  h="100%"
                                  align="center"
                                  justify="center"
                                  color="gray.400"
                                  fontSize="xs"
                                >
                                  No Image
                                </Flex>
                              )}
                            </Box>
                          </Td>
                          <Td fontWeight="medium">{equipment.name}</Td>
                          <Td>{equipment.category?.name || "-"}</Td>
                          <Td isNumeric>{equipment.quantity}</Td>
                          <Td>{equipment.location || "-"}</Td>
                          <Td>
                            <Badge
                              colorScheme={
                                equipment.isActive ? "green" : "gray"
                              }
                            >
                              {equipment.isActive ? "有効" : "無効"}
                            </Badge>
                          </Td>
                          <Td>
                            <HStack spacing={1}>
                              <IconButton
                                aria-label="詳細"
                                icon={<ViewIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleView(equipment)}
                              />
                              <IconButton
                                aria-label="編集"
                                icon={<EditIcon />}
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(equipment)}
                              />
                              <IconButton
                                aria-label="削除"
                                icon={<DeleteIcon />}
                                size="sm"
                                variant="ghost"
                                colorScheme="red"
                                onClick={() => handleDelete(equipment)}
                                isDisabled={!equipment.isActive}
                              />
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                    {data?.items.length === 0 && (
                      <Tr>
                        <Td
                          colSpan={7}
                          textAlign="center"
                          py={8}
                          color="gray.500"
                        >
                          資機材が登録されていません
                        </Td>
                      </Tr>
                    )}
                  </Tbody>
                </Table>

                {/* ページネーション */}
                {data && data.pagination.totalPages > 1 && (
                  <Flex justify="center" mt={6} gap={2}>
                    <Button
                      size="sm"
                      isDisabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      前へ
                    </Button>
                    <Text alignSelf="center" px={4}>
                      {page} / {data.pagination.totalPages}
                    </Text>
                    <Button
                      size="sm"
                      isDisabled={page === data.pagination.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      次へ
                    </Button>
                  </Flex>
                )}
              </>
            )}
          </TabPanel>
          <TabPanel px={0}>
            <EquipmentByCategory />
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* モーダル */}
      <EquipmentFormModal
        isOpen={isFormOpen}
        onClose={onFormClose}
        equipment={selectedEquipment}
        isEditMode={isEditMode}
      />
      <EquipmentDetailModal
        isOpen={isDetailOpen}
        onClose={onDetailClose}
        equipment={selectedEquipment}
      />
      <EquipmentCategoryModal
        isOpen={isCategoryOpen}
        onClose={onCategoryClose}
      />
    </Box>
  );
}
