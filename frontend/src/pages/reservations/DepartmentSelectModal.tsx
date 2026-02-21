import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  SimpleGrid,
  useColorModeValue,
  Collapse,
} from "@chakra-ui/react";
import {
  FiBriefcase,
  FiArrowLeft,
  FiArrowRight,
  FiChevronLeft,
} from "react-icons/fi";

export interface DepartmentData {
  department: string;
  category: string;
}

// 部署カテゴリと各科のマッピング
const DEPARTMENT_CATEGORIES: Record<string, string[]> = {
  "医師・診療局": [
    "総合内科・感染症内科",
    "糖尿病・内分泌代謝内科",
    "腎臓内科",
    "血液内科",
    "脳神経内科",
    "循環器内科",
    "呼吸器内科",
    "消化器内科",
    "乳腺内分泌外科",
    "消化器外科",
    "脳神経外科",
    "心臓血管外科",
    "整形外科",
    "形成外科",
    "呼吸器外科",
    "小児科",
    "産婦人科",
    "泌尿器科",
    "眼科",
    "耳鼻咽喉科・頭頸部外科",
    "口腔外科",
    "放射線科",
    "麻酔科",
    "救急科",
    "救命診療科",
  ],
  看護局: [
    "Aブロック",
    "Bブロック",
    "Cブロック",
    "Dブロック",
    "Eブロック",
    "Fブロック",
    "Hブロック",
    "Iブロック",
    "Jブロック",
    "救急外来",
    "ICU/CCU",
    "りんくう手術室",
    "5S病棟",
    "5M病棟",
    "HCU病棟",
    "6S病棟",
    "6M病棟",
    "NICU/GCU",
    "7S病棟",
    "7M病棟",
    "8S病棟",
    "8M病棟",
    "救命初療/手術室",
    "救命ICU",
    "感染症センター",
    "滅菌室",
  ],
  診療支援局: [
    "薬剤部門",
    "検査部門",
    "放射線部門",
    "臨床工学・技術部門",
    "リハビリテーション部門",
    "栄養部門",
  ],
  事務局: [
    "経営企画室",
    "総務課",
    "会計課",
    "医療マネジメント課",
    "医療相談室",
  ],
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onProceed: (data: DepartmentData) => void;
  onBack: () => void;
  initialData?: DepartmentData;
}

export default function DepartmentSelectModal({
  isOpen,
  onClose,
  selectedDate,
  onProceed,
  onBack,
  initialData,
}: Props) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    initialData?.category || null,
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>(
    initialData?.department || "",
  );
  const [customDepartment, setCustomDepartment] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const gradientBg = useColorModeValue(
    "linear(to-br, teal.500, cyan.500)",
    "linear(to-br, teal.600, cyan.600)",
  );

  const categoryButtonBg = useColorModeValue("white", "gray.700");
  const categoryButtonHoverBg = useColorModeValue("teal.50", "teal.900");
  const selectedCategoryBg = useColorModeValue("teal.500", "teal.400");
  const departmentButtonBg = useColorModeValue("gray.50", "gray.600");
  const departmentButtonHoverBg = useColorModeValue("teal.100", "teal.800");
  const selectedDepartmentBg = useColorModeValue("teal.500", "teal.400");

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

  const handleCategorySelect = (category: string) => {
    if (category === "選択にない所属の方はこちら" || category === "委員会") {
      setSelectedCategory(category);
      setShowCustomInput(true);
      setSelectedDepartment("");
    } else {
      setSelectedCategory(category);
      setShowCustomInput(false);
      setSelectedDepartment("");
    }
  };

  const handleDepartmentSelect = (dept: string) => {
    setSelectedDepartment(dept);
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedDepartment("");
    setShowCustomInput(false);
    setCustomDepartment("");
  };

  const handleProceed = () => {
    if (showCustomInput && customDepartment) {
      onProceed({
        category: "その他",
        department: customDepartment,
      });
    } else if (selectedDepartment) {
      onProceed({
        category: selectedCategory || "",
        department: selectedDepartment,
      });
    }
  };

  const canProceed =
    (showCustomInput && customDepartment.trim()) ||
    (!showCustomInput && selectedDepartment);

  const categories = [
    ...Object.keys(DEPARTMENT_CATEGORIES),
    "委員会",
    "選択にない所属の方はこちら",
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden" maxH="90vh">
        {/* ヘッダー */}
        <Box bgGradient={gradientBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiBriefcase} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              部署を選択
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(selectedDate)} の予約 - ステップ 1/4
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <ModalBody py={6} overflowY="auto">
          <VStack spacing={5} align="stretch">
            {/* カテゴリ未選択時: メインカテゴリボタン */}
            <Collapse in={!selectedCategory} animateOpacity>
              <VStack spacing={4} align="stretch">
                <Text fontWeight="semibold" fontSize="lg">
                  部門を選択してください
                </Text>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                  {categories.map((category) => (
                    <Button
                      key={category}
                      h="auto"
                      py={4}
                      px={3}
                      bg={categoryButtonBg}
                      border="2px solid"
                      borderColor="gray.200"
                      borderRadius="xl"
                      fontWeight="medium"
                      whiteSpace="normal"
                      textAlign="center"
                      _hover={{
                        bg: categoryButtonHoverBg,
                        borderColor: "teal.400",
                        transform: "translateY(-2px)",
                        shadow: "md",
                      }}
                      transition="all 0.2s"
                      onClick={() => handleCategorySelect(category)}
                    >
                      {category}
                    </Button>
                  ))}
                </SimpleGrid>
              </VStack>
            </Collapse>

            {/* カテゴリ選択後: 各科ボタン */}
            <Collapse
              in={!!selectedCategory && !showCustomInput}
              animateOpacity
            >
              <VStack spacing={4} align="stretch">
                <HStack>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiChevronLeft />}
                    onClick={handleBackToCategories}
                  >
                    部門選択に戻る
                  </Button>
                </HStack>
                <Box
                  bg={selectedCategoryBg}
                  color="white"
                  px={4}
                  py={2}
                  borderRadius="lg"
                  fontWeight="semibold"
                >
                  {selectedCategory}
                </Box>
                <Text fontWeight="medium" color="gray.600">
                  所属を選択してください
                </Text>
                <SimpleGrid columns={{ base: 2, md: 3 }} spacing={2}>
                  {selectedCategory &&
                    DEPARTMENT_CATEGORIES[selectedCategory]?.map((dept) => (
                      <Button
                        key={dept}
                        size="sm"
                        h="auto"
                        py={3}
                        bg={
                          selectedDepartment === dept
                            ? selectedDepartmentBg
                            : departmentButtonBg
                        }
                        color={
                          selectedDepartment === dept ? "white" : "inherit"
                        }
                        border="1px solid"
                        borderColor={
                          selectedDepartment === dept ? "teal.500" : "gray.200"
                        }
                        borderRadius="lg"
                        fontWeight="normal"
                        whiteSpace="normal"
                        textAlign="center"
                        _hover={{
                          bg:
                            selectedDepartment === dept
                              ? selectedDepartmentBg
                              : departmentButtonHoverBg,
                          borderColor: "teal.400",
                        }}
                        onClick={() => handleDepartmentSelect(dept)}
                      >
                        {dept}
                      </Button>
                    ))}
                </SimpleGrid>
              </VStack>
            </Collapse>

            {/* カスタム入力 */}
            <Collapse in={showCustomInput} animateOpacity>
              <VStack spacing={4} align="stretch">
                <HStack>
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiChevronLeft />}
                    onClick={handleBackToCategories}
                  >
                    部門選択に戻る
                  </Button>
                </HStack>
                <FormControl>
                  <FormLabel fontWeight="semibold">
                    {selectedCategory === "委員会"
                      ? "委員会名を入力"
                      : "所属を入力"}
                  </FormLabel>
                  <Input
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder={
                      selectedCategory === "委員会"
                        ? "例: 医療安全管理委員会"
                        : "例: ⚪︎⚪︎センター など"
                    }
                    size="lg"
                    borderRadius="lg"
                  />
                  <Text
                    fontSize="xs"
                    color="red.500"
                    mt={2}
                    fontWeight="semibold"
                  >
                    {selectedCategory === "委員会"
                      ? "※ 委員会名を正確に記載してください"
                      : "※ 所属を正確に記載してください"}
                  </Text>
                </FormControl>
              </VStack>
            </Collapse>
          </VStack>
        </ModalBody>

        <ModalFooter
          borderTopWidth="1px"
          bg={useColorModeValue("gray.50", "gray.800")}
        >
          <HStack spacing={4} w="full" justify="space-between">
            <Button variant="ghost" leftIcon={<FiArrowLeft />} onClick={onBack}>
              機器確認に戻る
            </Button>

            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              <Button
                rightIcon={<FiArrowRight />}
                bgGradient={gradientBg}
                color="white"
                isDisabled={!canProceed}
                _hover={{
                  bgGradient: "linear(to-br, teal.600, cyan.600)",
                  transform: "translateY(-1px)",
                  shadow: "lg",
                }}
                _active={{
                  transform: "translateY(0)",
                }}
                _disabled={{
                  opacity: 0.5,
                  cursor: "not-allowed",
                  _hover: {
                    transform: "none",
                    shadow: "none",
                  },
                }}
                onClick={handleProceed}
              >
                次へ：申請者
              </Button>
            </HStack>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
