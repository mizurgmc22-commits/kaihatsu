import { useState, useMemo } from "react";
import {
  Box,
  Badge,
  HStack,
  Input,
  Select,
  Spinner,
  Text,
  Flex,
  InputGroup,
  InputLeftElement,
  Button,
  VStack,
  Image,
  SimpleGrid,
  useDisclosure,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import { FiPackage } from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import { getEquipmentList, getCategories } from "../../api/equipment";
import type { Equipment } from "../../types/equipment";
import EquipmentDetailModal from "../equipment/EquipmentDetailModal";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";
import PageHeader from "../../components/PageHeader";

import { CATEGORY_SORT_ORDER } from "../../constants/category";

export default function EquipmentListView() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 資機材一覧取得（全件取得してカテゴリ別にグループ化）
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "equipment",
      { search, categoryId: categoryFilter, isActive: true },
    ],
    queryFn: () =>
      getEquipmentList({
        search: search || undefined,
        categoryId: categoryFilter || undefined,
        isActive: true,
      }),
  });

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // カテゴリ別にグループ化
  const groupedEquipment = useMemo(() => {
    const map: Record<string, Equipment[]> = {};
    (data?.items || []).forEach((item) => {
      const key = item.category?.name || "ALL";
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });
    return map;
  }, [data]);

  // カテゴリ順序
  const orderedCategoryNames = useMemo(() => {
    const present = Object.keys(groupedEquipment);
    const ordered = CATEGORY_SORT_ORDER.filter((name) =>
      present.includes(name),
    );
    const rest = present
      .filter((name) => !CATEGORY_SORT_ORDER.includes(name))
      .sort((a, b) => a.localeCompare(b, "ja"));
    return [...ordered, ...rest];
  }, [groupedEquipment]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
  };

  const handleEquipmentClick = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    onOpen();
  };

  const handleModalClose = () => {
    onClose();
    setSelectedEquipment(null);
  };

  if (error) {
    return <Text color="red.500">エラーが発生しました</Text>;
  }

  return (
    <Box>
      <PageHeader
        title="資機材一覧"
        description="利用可能な資機材の一覧です。クリックすると詳細情報を確認できます。"
        icon={FiPackage}
      />
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
            bg="white"
          />
        </InputGroup>
        <Select
          aria-label="カテゴリフィルタ"
          placeholder="ALL"
          maxW="200px"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          bg="white"
        >
          {categories
            ?.sort((a, b) => {
              const indexA = CATEGORY_SORT_ORDER.indexOf(a.name);
              const indexB = CATEGORY_SORT_ORDER.indexOf(b.name);
              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
              if (indexA !== -1) return -1;
              if (indexB !== -1) return 1;
              return 0;
            })
            .map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
        </Select>
        <Button type="submit" colorScheme="gray">
          検索
        </Button>
      </HStack>

      {/* カテゴリ別グループ表示 */}
      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : data?.items.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={10}>
          資機材が登録されていません
        </Text>
      ) : (
        <VStack spacing={8} align="stretch">
          {orderedCategoryNames.map((categoryName) => (
            <Box key={categoryName}>
              <HStack justify="space-between" mb={4}>
                <Text fontSize="lg" fontWeight="bold">
                  {categoryName}
                </Text>
                <Badge colorScheme="blue" fontSize="sm" px={2} py={1}>
                  {groupedEquipment[categoryName]?.length ?? 0} 件
                </Badge>
              </HStack>

              <SimpleGrid
                columns={{ base: 2, sm: 3, md: 4, lg: 5 }}
                spacing={4}
              >
                {groupedEquipment[categoryName]?.map((equipment) => {
                  const imageSrc = resolveEquipmentImage(
                    equipment.name,
                    equipment.imageUrl,
                  );
                  return (
                    <Box
                      key={equipment.id}
                      bg="white"
                      borderRadius="lg"
                      shadow="sm"
                      overflow="hidden"
                      cursor="pointer"
                      transition="all 0.2s"
                      _hover={{ shadow: "md", transform: "translateY(-2px)" }}
                      onClick={() => handleEquipmentClick(equipment)}
                    >
                      {/* 画像 */}
                      <Box h="120px" bg="gray.100" position="relative">
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
                          >
                            <Text fontSize="sm">No Image</Text>
                          </Flex>
                        )}
                      </Box>

                      {/* 情報 */}
                      <Box p={3}>
                        <Text
                          fontWeight="bold"
                          fontSize="sm"
                          noOfLines={2}
                          mb={1}
                        >
                          {equipment.name}
                        </Text>
                        <HStack justify="space-between">
                          <Text fontSize="xs" color="gray.500">
                            保有数
                          </Text>
                          <Badge colorScheme="green" fontSize="xs">
                            {equipment.quantity}
                          </Badge>
                        </HStack>
                      </Box>
                    </Box>
                  );
                })}
              </SimpleGrid>
            </Box>
          ))}
        </VStack>
      )}

      {/* 詳細モーダル */}
      <EquipmentDetailModal
        isOpen={isOpen}
        onClose={handleModalClose}
        equipment={selectedEquipment}
      />
    </Box>
  );
}
