import { useState, useMemo } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  SimpleGrid,
  Box,
  Text,
  Button,
  Icon,
  HStack,
  VStack,
  Badge,
  Flex,
  Input,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiPackage,
  FiArrowRight,
  FiGrid,
  FiEdit3,
} from "react-icons/fi";
import type { EquipmentCategory } from "../../types/equipment";
import { CATEGORY_SORT_ORDER } from "../../constants/category";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  categories: EquipmentCategory[];
  isLoading?: boolean;
  onProceed: (selectedCategoryIds: string[]) => void;
  onCustomReserve: (name: string) => void;
}

export default function CategorySelectionModal({
  isOpen,
  onClose,
  date,
  categories,
  isLoading,
  onProceed,
  onCustomReserve,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [customEquipmentName, setCustomEquipmentName] = useState("");

  // カラー設定
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorder = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("blue.50", "blue.900");
  const selectedBorder = useColorModeValue("blue.400", "blue.300");
  const hoverBg = useColorModeValue("gray.50", "gray.600");
  const gradientBg = useColorModeValue(
    "linear(to-br, blue.500, purple.500)",
    "linear(to-br, blue.600, purple.600)",
  );

  // 日付フォーマット
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  // カテゴリをソート
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const indexA = CATEGORY_SORT_ORDER.indexOf(a.name);
      const indexB = CATEGORY_SORT_ORDER.indexOf(b.name);
      if (indexA !== -1 && indexB !== -1) return indexA - indexB;
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      return a.name.localeCompare(b.name, "ja");
    });
  }, [categories]);

  // カテゴリ選択/解除
  const toggleCategory = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 全選択/全解除
  const toggleAll = () => {
    if (selectedIds.size === categories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(categories.map((c) => c.id)));
    }
  };

  // 次へ進む
  const handleProceed = () => {
    onProceed(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSelectedIds(new Set());
    setCustomEquipmentName("");
    onClose();
  };

  // カスタム機器予約
  const handleCustomReserve = () => {
    if (customEquipmentName.trim()) {
      onCustomReserve(customEquipmentName.trim());
      setCustomEquipmentName("");
    }
  };

  const isAllSelected = selectedIds.size === categories.length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden">
        {/* ヘッダー（グラデーション背景） */}
        <Box bgGradient={gradientBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiGrid} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              カテゴリを選択
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(date)} に予約する機器のカテゴリを選んでください
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <ModalBody py={6}>
          {/* 全選択ボタン */}
          <Flex justify="flex-end" mb={4}>
            <Button
              size="sm"
              variant="ghost"
              leftIcon={<FiCheck />}
              onClick={toggleAll}
              colorScheme={isAllSelected ? "blue" : "gray"}
            >
              {isAllSelected ? "全て解除" : "全て選択"}
            </Button>
          </Flex>

          {/* カテゴリグリッド */}
          <SimpleGrid columns={{ base: 1, sm: 2, md: 3 }} spacing={4}>
            {sortedCategories.map((category) => {
              const isSelected = selectedIds.has(category.id);
              return (
                <Box
                  key={category.id}
                  as="button"
                  onClick={() => toggleCategory(category.id)}
                  p={4}
                  borderRadius="xl"
                  borderWidth="2px"
                  borderColor={isSelected ? selectedBorder : cardBorder}
                  bg={isSelected ? selectedBg : cardBg}
                  textAlign="left"
                  transition="all 0.2s ease"
                  _hover={{
                    bg: isSelected ? selectedBg : hoverBg,
                    transform: "translateY(-2px)",
                    shadow: "lg",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                  position="relative"
                  overflow="hidden"
                >
                  {/* 選択チェックマーク */}
                  {isSelected && (
                    <Box
                      position="absolute"
                      top={2}
                      right={2}
                      bg="blue.500"
                      color="white"
                      borderRadius="full"
                      p={1}
                    >
                      <Icon as={FiCheck} boxSize={3} />
                    </Box>
                  )}

                  <VStack align="start" spacing={2}>
                    <HStack spacing={2}>
                      <Icon
                        as={FiPackage}
                        boxSize={5}
                        color={isSelected ? "blue.500" : "gray.400"}
                      />
                      <Text
                        fontWeight="bold"
                        fontSize="md"
                        color={isSelected ? "blue.700" : "gray.700"}
                      >
                        {category.name}
                      </Text>
                    </HStack>

                    {category.description && (
                      <Text fontSize="xs" color="gray.500" noOfLines={2}>
                        {category.description}
                      </Text>
                    )}

                    {category.equipmentCount !== undefined && (
                      <Badge
                        colorScheme={isSelected ? "blue" : "gray"}
                        fontSize="xs"
                      >
                        {category.equipmentCount} 機器
                      </Badge>
                    )}
                  </VStack>
                </Box>
              );
            })}
          </SimpleGrid>

          {categories.length === 0 && !isLoading && (
            <Box textAlign="center" py={10}>
              <Icon as={FiPackage} boxSize={12} color="gray.300" mb={4} />
              <Text color="gray.500">カテゴリが登録されていません</Text>
            </Box>
          )}

          {/* その他の機器を予約するセクション */}
          <Divider my={6} />
          <Box
            p={5}
            borderWidth="1px"
            borderRadius="xl"
            borderColor="gray.200"
            borderStyle="dashed"
            bg="gray.50"
          >
            <HStack spacing={2} mb={3}>
              <Icon as={FiEdit3} boxSize={5} color="gray.500" />
              <Text fontWeight="bold" color="gray.700">
                その他の機器を予約する
              </Text>
            </HStack>
            <Text fontSize="sm" color="gray.500" mb={4}>
              リストにない機器を予約したい場合は、機器名を入力してください。
            </Text>
            <HStack>
              <Input
                placeholder="例: 新規トレーニング機器"
                value={customEquipmentName}
                onChange={(e) => setCustomEquipmentName(e.target.value)}
                bg="white"
                borderRadius="lg"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleCustomReserve();
                  }
                }}
              />
              <Button
                colorScheme="gray"
                onClick={handleCustomReserve}
                isDisabled={!customEquipmentName.trim()}
                borderRadius="lg"
              >
                予約
              </Button>
            </HStack>
          </Box>
        </ModalBody>

        <ModalFooter
          borderTopWidth="1px"
          bg={useColorModeValue("gray.50", "gray.800")}
        >
          <HStack spacing={4} w="full" justify="space-between">
            <Text fontSize="sm" color="gray.600">
              {selectedIds.size > 0 ? (
                <>
                  <Text as="span" fontWeight="bold" color="blue.500">
                    {selectedIds.size}
                  </Text>{" "}
                  カテゴリ選択中
                </>
              ) : (
                "カテゴリを選択してください"
              )}
            </Text>

            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleClose}>
                キャンセル
              </Button>
              <Button
                colorScheme="blue"
                rightIcon={<FiArrowRight />}
                onClick={handleProceed}
                isDisabled={selectedIds.size === 0}
                bgGradient={gradientBg}
                _hover={{
                  bgGradient: "linear(to-br, blue.600, purple.600)",
                  transform: "translateY(-1px)",
                  shadow: "lg",
                }}
                _active={{
                  transform: "translateY(0)",
                }}
              >
                機器を選択
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
