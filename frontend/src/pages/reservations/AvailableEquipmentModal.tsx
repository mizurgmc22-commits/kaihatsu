import { useMemo, useState, useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Button,
  Spinner,
  Flex,
  Divider,
  Input,
  FormControl,
  FormLabel,
  Image,
  Icon,
  Checkbox,
  useColorModeValue,
  IconButton,
} from "@chakra-ui/react";
import {
  FiPackage,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiMapPin,
  FiBox,
} from "react-icons/fi";
import type { AvailableEquipment } from "../../types/reservation";
import type { EquipmentCategory } from "../../types/equipment";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";
import { CATEGORY_SORT_ORDER } from "../../constants/category";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  equipment: AvailableEquipment[];
  isLoading: boolean;
  onProceed: (selectedEquipment: AvailableEquipment[]) => void;
  onBack: () => void;
  selectedCategoryIds: string[];
  categories: EquipmentCategory[];
  onCustomReserve: (name: string) => void;
}

export default function AvailableEquipmentModal({
  isOpen,
  onClose,
  date,
  equipment,
  isLoading,
  onProceed,
  onBack,
  selectedCategoryIds,
  categories,
  onCustomReserve,
}: Props) {
  const [customName, setCustomName] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const headerBg = useColorModeValue(
    "linear(to-br, teal.500, blue.500)",
    "linear(to-br, teal.600, blue.600)",
  );

  // モーダルが開くたびに選択状態をリセット
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set());
    }
  }, [isOpen]);

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

  const getAvailabilityBadge = (item: AvailableEquipment) => {
    if (!item.isAvailable) {
      return <Badge colorScheme="red">予約不可</Badge>;
    }
    if (item.isUnlimited) {
      return <Badge colorScheme="green">予約可能</Badge>;
    }
    if (item.remainingQuantity <= 2) {
      return <Badge colorScheme="yellow">残り{item.remainingQuantity}</Badge>;
    }
    return <Badge colorScheme="green">残り{item.remainingQuantity}</Badge>;
  };

  // 選択されたカテゴリでフィルタリング
  const filteredEquipment = useMemo(() => {
    if (selectedCategoryIds.length === 0) return equipment;
    return equipment.filter(
      (item) =>
        item.category && selectedCategoryIds.includes(item.category.id || ""),
    );
  }, [equipment, selectedCategoryIds]);

  // カテゴリ別にグループ化
  const groupedEquipment = useMemo(() => {
    const map: Record<string, AvailableEquipment[]> = {};
    filteredEquipment.forEach((item) => {
      const key = item.category?.name || "その他";
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });
    return map;
  }, [filteredEquipment]);

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

  // 選択されたカテゴリ名を取得
  const selectedCategoryNames = useMemo(() => {
    return categories
      .filter((c) => selectedCategoryIds.includes(c.id))
      .map((c) => c.name);
  }, [categories, selectedCategoryIds]);

  // 機器選択/解除
  const toggleEquipment = (id: string) => {
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

  // カテゴリ内全選択
  const toggleCategoryAll = (categoryName: string) => {
    const categoryItems =
      groupedEquipment[categoryName]?.filter((item) => item.isAvailable) || [];
    const categoryIds = categoryItems.map((item) => item.id);
    const allSelected = categoryIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        categoryIds.forEach((id) => next.delete(id));
      } else {
        categoryIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleCustomReserve = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onCustomReserve(trimmed);
    setCustomName("");
  };

  // 次へ進む
  const handleProceed = () => {
    const selected = filteredEquipment.filter((item) =>
      selectedIds.has(item.id),
    );
    onProceed(selected);
  };

  // モーダルを閉じる
  const handleClose = () => {
    setSelectedIds(new Set());
    setCustomName("");
    onClose();
  };

  // 戻る
  const handleBack = () => {
    setSelectedIds(new Set());
    onBack();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="3xl"
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden" maxH="85vh">
        {/* ヘッダー */}
        <Box bgGradient={headerBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiPackage} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              機器を選択
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9} mb={3}>
            {formatDate(date)} に予約する機器を選んでください
          </Text>
          <HStack spacing={2} flexWrap="wrap">
            {selectedCategoryNames.map((name) => (
              <Badge
                key={name}
                bg="whiteAlpha.200"
                color="white"
                fontSize="xs"
                px={2}
                py={1}
                borderRadius="full"
              >
                {name}
              </Badge>
            ))}
          </HStack>
        </Box>

        <ModalCloseButton color="white" />

        <ModalBody py={6}>
          {isLoading ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" color="blue.500" thickness="3px" />
            </Flex>
          ) : filteredEquipment.length === 0 ? (
            <Box textAlign="center" py={10}>
              <Icon as={FiBox} boxSize={12} color="gray.300" mb={4} />
              <Text color="gray.500">予約可能な機器がありません</Text>
            </Box>
          ) : (
            <VStack spacing={6} align="stretch">
              {orderedCategoryNames.map((categoryName) => {
                const items = groupedEquipment[categoryName] || [];
                const availableItems = items.filter((item) => item.isAvailable);
                const selectedInCategory = items.filter((item) =>
                  selectedIds.has(item.id),
                ).length;
                const allAvailableSelected =
                  availableItems.length > 0 &&
                  availableItems.every((item) => selectedIds.has(item.id));

                return (
                  <Box key={categoryName}>
                    {/* カテゴリヘッダー */}
                    <HStack justify="space-between" mb={3}>
                      <HStack spacing={2}>
                        <Text fontWeight="bold" fontSize="lg">
                          {categoryName}
                        </Text>
                        <Badge colorScheme="blue" fontSize="xs">
                          {items.length} 件
                        </Badge>
                        {selectedInCategory > 0 && (
                          <Badge colorScheme="green" fontSize="xs">
                            {selectedInCategory} 選択中
                          </Badge>
                        )}
                      </HStack>
                      {availableItems.length > 0 && (
                        <Button
                          size="xs"
                          variant="ghost"
                          leftIcon={<FiCheck />}
                          onClick={() => toggleCategoryAll(categoryName)}
                          colorScheme={allAvailableSelected ? "blue" : "gray"}
                        >
                          {allAvailableSelected ? "解除" : "全選択"}
                        </Button>
                      )}
                    </HStack>

                    {/* 機器リスト */}
                    <VStack spacing={3} align="stretch">
                      {items.map((item) => {
                        const imageSrc = resolveEquipmentImage(
                          item.name,
                          item.imageUrl,
                        );
                        const isSelected = selectedIds.has(item.id);

                        return (
                          <Box
                            key={item.id}
                            as="button"
                            onClick={() =>
                              item.isAvailable && toggleEquipment(item.id)
                            }
                            disabled={!item.isAvailable}
                            p={4}
                            borderWidth="2px"
                            borderRadius="xl"
                            borderColor={
                              isSelected ? selectedBorder : cardBorder
                            }
                            bg={isSelected ? selectedBg : cardBg}
                            opacity={item.isAvailable ? 1 : 0.5}
                            cursor={
                              item.isAvailable ? "pointer" : "not-allowed"
                            }
                            transition="all 0.2s ease"
                            textAlign="left"
                            w="full"
                            _hover={
                              item.isAvailable
                                ? {
                                    borderColor: isSelected
                                      ? selectedBorder
                                      : "blue.300",
                                    bg: isSelected ? selectedBg : hoverBg,
                                    transform: "translateY(-2px)",
                                    shadow: "md",
                                  }
                                : {}
                            }
                            _active={
                              item.isAvailable
                                ? { transform: "translateY(0)" }
                                : {}
                            }
                          >
                            <Flex
                              justify="space-between"
                              align="center"
                              gap={4}
                            >
                              <HStack spacing={4} flex={1}>
                                {/* チェックボックス */}
                                <Checkbox
                                  isChecked={isSelected}
                                  isDisabled={!item.isAvailable}
                                  colorScheme="blue"
                                  size="lg"
                                  pointerEvents="none"
                                />

                                {/* 画像 */}
                                {imageSrc && (
                                  <Image
                                    src={imageSrc}
                                    alt={`${item.name}の画像`}
                                    boxSize="60px"
                                    objectFit="cover"
                                    borderRadius="lg"
                                    backgroundColor="white"
                                    borderWidth="1px"
                                    borderColor="gray.200"
                                  />
                                )}

                                {/* 情報 */}
                                <Box flex={1}>
                                  <HStack mb={1} flexWrap="wrap" spacing={2}>
                                    <Text fontWeight="bold" fontSize="md">
                                      {item.name}
                                    </Text>
                                    {getAvailabilityBadge(item)}
                                  </HStack>

                                  <HStack
                                    spacing={4}
                                    fontSize="sm"
                                    color="gray.500"
                                    flexWrap="wrap"
                                  >
                                    {item.location && (
                                      <HStack spacing={1}>
                                        <Icon as={FiMapPin} boxSize={3} />
                                        <Text>{item.location}</Text>
                                      </HStack>
                                    )}
                                    {!item.isUnlimited && (
                                      <HStack spacing={1}>
                                        <Icon as={FiBox} boxSize={3} />
                                        <Text>
                                          保有: {item.quantity} / 残り:{" "}
                                          {item.remainingQuantity}
                                        </Text>
                                      </HStack>
                                    )}
                                  </HStack>
                                </Box>
                              </HStack>
                            </Flex>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                );
              })}

              <Divider />

              {/* カスタム機器予約 */}
              <Box
                borderWidth="2px"
                borderRadius="xl"
                borderStyle="dashed"
                borderColor="gray.300"
                p={5}
                bg="gray.50"
              >
                <FormControl>
                  <FormLabel fontWeight="bold" fontSize="md">
                    <HStack spacing={2}>
                      <Icon as={FiPackage} />
                      <Text>その他の機器を予約する</Text>
                    </HStack>
                  </FormLabel>
                  <Text fontSize="sm" color="gray.600" mb={3}>
                    リストにない機器を予約したい場合は、機器名を入力してください。
                  </Text>
                  <HStack spacing={3}>
                    <Input
                      placeholder="例: 新規トレーニング機器"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      bg="white"
                      borderRadius="lg"
                    />
                    <Button
                      colorScheme="blue"
                      onClick={handleCustomReserve}
                      isDisabled={!customName.trim()}
                      px={6}
                    >
                      予約
                    </Button>
                  </HStack>
                </FormControl>
              </Box>
            </VStack>
          )}
        </ModalBody>

        <ModalFooter
          borderTopWidth="1px"
          bg={useColorModeValue("gray.50", "gray.800")}
        >
          <HStack spacing={4} w="full" justify="space-between">
            <Button
              variant="ghost"
              leftIcon={<FiArrowLeft />}
              onClick={handleBack}
            >
              カテゴリ選択に戻る
            </Button>

            <HStack spacing={4}>
              <Text fontSize="sm" color="gray.600">
                {selectedIds.size > 0 ? (
                  <>
                    <Text as="span" fontWeight="bold" color="blue.500">
                      {selectedIds.size}
                    </Text>{" "}
                    件選択中
                  </>
                ) : (
                  "機器を選択してください"
                )}
              </Text>

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
                予約情報を入力
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
