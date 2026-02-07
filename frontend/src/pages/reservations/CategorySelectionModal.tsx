import { useState, useMemo, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
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
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  SimpleGrid,
  Image,
  Spinner,
  Checkbox,
} from "@chakra-ui/react";
import {
  FiCheck,
  FiPackage,
  FiArrowRight,
  FiGrid,
  FiEdit3,
  FiShoppingCart,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import type { EquipmentCategory, Equipment } from "../../types/equipment";
import { getEquipmentList } from "../../api/equipment";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";
import { CATEGORY_SORT_ORDER } from "../../constants/category";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  categories: EquipmentCategory[];
  isLoading?: boolean;
  onProceed: (selectedCategoryIds: string[]) => void;
  onCustomReserve: (name: string) => void;
  // 新しいコールバック：機器を直接選択した場合
  onEquipmentSelected?: (equipment: Equipment[]) => void;
}

export default function CategorySelectionModal({
  isOpen,
  onClose,
  date,
  categories,
  isLoading,
  onProceed,
  onCustomReserve,
  onEquipmentSelected,
}: Props) {
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState<Set<string>>(
    new Set(),
  );
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
  const floatingBg = useColorModeValue("white", "gray.800");

  // 機材一覧取得
  const { data: equipmentData, isLoading: isLoadingEquipment } = useQuery({
    queryKey: ["equipment", { isActive: true }],
    queryFn: () => getEquipmentList({ isActive: true }),
    enabled: isOpen,
  });

  // モーダルが開くたびに選択状態をリセット
  useEffect(() => {
    if (isOpen) {
      setSelectedEquipmentIds(new Set());
      setCustomEquipmentName("");
    }
  }, [isOpen]);

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

  // カテゴリ別にグループ化
  const groupedEquipment = useMemo(() => {
    const map: Record<string, Equipment[]> = {};
    (equipmentData?.items || []).forEach((item) => {
      const key = item.category?.name || "その他";
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });
    return map;
  }, [equipmentData]);

  // 機器選択/解除
  const toggleEquipment = (id: string) => {
    setSelectedEquipmentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // カテゴリ内の選択された機器数を取得
  const getSelectedCountInCategory = (categoryName: string) => {
    const items = groupedEquipment[categoryName] || [];
    return items.filter((item) => selectedEquipmentIds.has(item.id)).length;
  };

  // 選択された機器リストを取得
  const getSelectedEquipment = (): Equipment[] => {
    return (equipmentData?.items || []).filter((item) =>
      selectedEquipmentIds.has(item.id),
    );
  };

  // 次へ進む
  const handleProceed = () => {
    const selectedEquipment = getSelectedEquipment();
    if (onEquipmentSelected && selectedEquipment.length > 0) {
      // 機器が直接選択されている場合は、新しいコールバックを使用
      onEquipmentSelected(selectedEquipment);
    } else {
      // 従来の動作：カテゴリIDを渡す（後方互換性のため）
      const categoryIds = sortedCategories
        .filter((cat) => getSelectedCountInCategory(cat.name) > 0)
        .map((cat) => cat.id);
      onProceed(categoryIds);
    }
    setSelectedEquipmentIds(new Set());
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSelectedEquipmentIds(new Set());
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

  const totalSelectedCount = selectedEquipmentIds.size;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="4xl"
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden" maxH="90vh">
        {/* ヘッダー（グラデーション背景） */}
        <Box bgGradient={gradientBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiGrid} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              機材を選択
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(date)} に予約する機材を選んでください
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <ModalBody py={6} pb="100px">
          {isLoadingEquipment ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" color="blue.500" />
            </Flex>
          ) : (
            <>
              {/* アコーディオン形式のカテゴリ・機材一覧 */}
              <Accordion allowMultiple defaultIndex={[]}>
                {sortedCategories.map((category) => {
                  const categoryItems = groupedEquipment[category.name] || [];
                  const selectedInCategory = getSelectedCountInCategory(
                    category.name,
                  );

                  if (categoryItems.length === 0) return null;

                  return (
                    <AccordionItem
                      key={category.id}
                      border="1px solid"
                      borderColor="gray.200"
                      borderRadius="lg"
                      mb={3}
                      overflow="hidden"
                    >
                      <AccordionButton
                        py={4}
                        px={5}
                        bg="white"
                        _hover={{ bg: "gray.50" }}
                        _expanded={{
                          bg: "blue.50",
                          borderBottom: "1px solid",
                          borderColor: "blue.100",
                        }}
                      >
                        <HStack flex={1} spacing={3}>
                          <Icon as={FiPackage} color="blue.500" />
                          <Text fontWeight="bold" fontSize="md">
                            {category.name}
                          </Text>
                          <Badge colorScheme="gray" fontSize="xs">
                            {categoryItems.length} 件
                          </Badge>
                          {selectedInCategory > 0 && (
                            <Badge colorScheme="green" fontSize="xs">
                              <Icon as={FiCheck} mr={1} />
                              {selectedInCategory} 選択中
                            </Badge>
                          )}
                        </HStack>
                        <AccordionIcon />
                      </AccordionButton>

                      <AccordionPanel pb={4} pt={4} bg="gray.50">
                        <SimpleGrid
                          columns={{ base: 2, sm: 3, md: 4 }}
                          spacing={3}
                        >
                          {categoryItems.map((equipment) => {
                            const imageSrc = resolveEquipmentImage(
                              equipment.name,
                              equipment.imageUrl,
                            );
                            const isSelected = selectedEquipmentIds.has(
                              equipment.id,
                            );

                            return (
                              <Box
                                key={equipment.id}
                                as="button"
                                onClick={() => toggleEquipment(equipment.id)}
                                bg={isSelected ? selectedBg : cardBg}
                                borderWidth="2px"
                                borderColor={
                                  isSelected ? selectedBorder : cardBorder
                                }
                                borderRadius="lg"
                                overflow="hidden"
                                textAlign="left"
                                transition="all 0.2s ease"
                                _hover={{
                                  transform: "translateY(-2px)",
                                  shadow: "md",
                                  borderColor: isSelected
                                    ? selectedBorder
                                    : "blue.300",
                                }}
                                _active={{
                                  transform: "translateY(0)",
                                }}
                                position="relative"
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
                                    zIndex={1}
                                  >
                                    <Icon as={FiCheck} boxSize={3} />
                                  </Box>
                                )}

                                {/* 画像 */}
                                <Box h="80px" bg="gray.100" position="relative">
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
                                      <Icon as={FiPackage} boxSize={6} />
                                    </Flex>
                                  )}
                                </Box>

                                {/* 情報 */}
                                <Box p={2}>
                                  <Text
                                    fontWeight="bold"
                                    fontSize="xs"
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
                      </AccordionPanel>
                    </AccordionItem>
                  );
                })}
              </Accordion>

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
            </>
          )}
        </ModalBody>

        {/* フローティングフッター */}
        <ModalFooter
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          borderTopWidth="1px"
          bg={floatingBg}
          shadow="lg"
          py={4}
        >
          <Flex w="full" justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FiShoppingCart} boxSize={5} color="blue.500" />
              <Text fontSize="sm" color="gray.600">
                {totalSelectedCount > 0 ? (
                  <>
                    <Text
                      as="span"
                      fontWeight="bold"
                      color="blue.500"
                      fontSize="lg"
                    >
                      {totalSelectedCount}
                    </Text>{" "}
                    点選択中
                  </>
                ) : (
                  "機材を選択してください"
                )}
              </Text>
            </HStack>

            <HStack spacing={3}>
              <Button variant="ghost" onClick={handleClose}>
                キャンセル
              </Button>
              <Button
                colorScheme="blue"
                rightIcon={<FiArrowRight />}
                onClick={handleProceed}
                isDisabled={totalSelectedCount === 0}
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
                次へ：予約情報を入力
              </Button>
            </HStack>
          </Flex>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
