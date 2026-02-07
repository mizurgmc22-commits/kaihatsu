import { useState, useMemo } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Spinner,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Icon,
  Image,
  SimpleGrid,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Checkbox,
  useColorModeValue,
} from "@chakra-ui/react";
import { SearchIcon } from "@chakra-ui/icons";
import {
  FiPackage,
  FiShoppingCart,
  FiArrowRight,
  FiCheck,
} from "react-icons/fi";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getEquipmentList, getCategories } from "../../api/equipment";
import type { Equipment } from "../../types/equipment";
import { useReservationCart } from "../../contexts/ReservationCartContext";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";
import PageHeader from "../../components/PageHeader";
import { CATEGORY_SORT_ORDER } from "../../constants/category";

export default function EquipmentSelectionPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { items, addItem, removeItem, hasItem, totalItems, clearCart } =
    useReservationCart();

  // カラー設定
  const cardBg = useColorModeValue("white", "gray.700");
  const cardBorder = useColorModeValue("gray.200", "gray.600");
  const selectedBg = useColorModeValue("blue.50", "blue.900");
  const selectedBorder = useColorModeValue("blue.400", "blue.300");
  const hoverBg = useColorModeValue("gray.50", "gray.600");
  const floatingBg = useColorModeValue("white", "gray.800");

  // 資機材一覧取得
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment", { search, isActive: true }],
    queryFn: () =>
      getEquipmentList({
        search: search || undefined,
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
      const key = item.category?.name || "その他";
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

  // 機材選択/解除
  const toggleEquipment = (equipment: Equipment) => {
    if (hasItem(equipment.id)) {
      removeItem(equipment.id);
    } else {
      addItem(equipment, 1);
    }
  };

  // 次へ進む
  const handleProceed = () => {
    // カレンダーページへ遷移（後で実装）
    navigate("/reserve/calendar");
  };

  if (error) {
    return <Text color="red.500">エラーが発生しました</Text>;
  }

  return (
    <Box pb="100px">
      {" "}
      {/* フローティングカート分のパディング */}
      <PageHeader
        title="機材を選択"
        description="借りたい機材を選択してください。複数選択が可能です。"
        icon={FiPackage}
      />
      {/* 検索 */}
      <HStack mb={6} spacing={4}>
        <InputGroup maxW="400px">
          <InputLeftElement>
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder="機材名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="white"
          />
        </InputGroup>
        {totalItems > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            colorScheme="red"
          >
            選択をクリア
          </Button>
        )}
      </HStack>
      {/* アコーディオン形式のカテゴリ・機材一覧 */}
      {isLoading ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : data?.items.length === 0 ? (
        <Text color="gray.500" textAlign="center" py={10}>
          資機材が登録されていません
        </Text>
      ) : (
        <Accordion allowMultiple defaultIndex={[0]}>
          {orderedCategoryNames.map((categoryName, index) => {
            const categoryItems = groupedEquipment[categoryName] || [];
            const selectedInCategory = categoryItems.filter((item) =>
              hasItem(item.id),
            ).length;

            return (
              <AccordionItem
                key={categoryName}
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
                    <Text fontWeight="bold" fontSize="lg">
                      {categoryName}
                    </Text>
                    <Badge colorScheme="gray" fontSize="sm">
                      {categoryItems.length} 件
                    </Badge>
                    {selectedInCategory > 0 && (
                      <Badge colorScheme="green" fontSize="sm">
                        <Icon as={FiCheck} mr={1} />
                        {selectedInCategory} 選択中
                      </Badge>
                    )}
                  </HStack>
                  <AccordionIcon />
                </AccordionButton>

                <AccordionPanel pb={4} pt={4} bg="gray.50">
                  <SimpleGrid
                    columns={{ base: 1, sm: 2, md: 3, lg: 4 }}
                    spacing={4}
                  >
                    {categoryItems.map((equipment) => {
                      const imageSrc = resolveEquipmentImage(
                        equipment.name,
                        equipment.imageUrl,
                      );
                      const isSelected = hasItem(equipment.id);

                      return (
                        <Box
                          key={equipment.id}
                          as="button"
                          onClick={() => toggleEquipment(equipment)}
                          bg={isSelected ? selectedBg : cardBg}
                          borderWidth="2px"
                          borderColor={isSelected ? selectedBorder : cardBorder}
                          borderRadius="xl"
                          overflow="hidden"
                          textAlign="left"
                          transition="all 0.2s ease"
                          _hover={{
                            transform: "translateY(-2px)",
                            shadow: "lg",
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
                              <Icon as={FiCheck} boxSize={4} />
                            </Box>
                          )}

                          {/* 画像 */}
                          <Box h="100px" bg="gray.100" position="relative">
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
                                <Icon as={FiPackage} boxSize={8} />
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
                </AccordionPanel>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
      {/* フローティングカート */}
      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        bg={floatingBg}
        borderTop="1px solid"
        borderColor="gray.200"
        py={4}
        px={6}
        shadow="lg"
        zIndex={100}
      >
        <Flex justify="space-between" align="center" maxW="1200px" mx="auto">
          <HStack spacing={4}>
            <Icon as={FiShoppingCart} boxSize={6} color="blue.500" />
            <Box>
              <Text fontWeight="bold" fontSize="lg">
                {totalItems > 0 ? (
                  <>
                    <Text as="span" color="blue.500">
                      {totalItems}
                    </Text>{" "}
                    点選択中
                  </>
                ) : (
                  "機材を選択してください"
                )}
              </Text>
              {totalItems > 0 && (
                <Text fontSize="sm" color="gray.500" noOfLines={1}>
                  {items.map((item) => item.name).join(", ")}
                </Text>
              )}
            </Box>
          </HStack>

          <Button
            colorScheme="blue"
            size="lg"
            rightIcon={<FiArrowRight />}
            onClick={handleProceed}
            isDisabled={totalItems === 0}
            bgGradient="linear(to-r, blue.400, blue.600)"
            _hover={{
              bgGradient: "linear(to-r, blue.500, blue.700)",
              transform: "translateY(-1px)",
              shadow: "lg",
            }}
            _active={{
              transform: "translateY(0)",
            }}
          >
            次へ：日程を選択
          </Button>
        </Flex>
      </Box>
    </Box>
  );
}
