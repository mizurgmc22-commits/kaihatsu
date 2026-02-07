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
  医師: [
    "内科",
    "外科",
    "整形外科",
    "小児科",
    "産婦人科",
    "眼科",
    "耳鼻咽喉科",
    "皮膚科",
    "泌尿器科",
    "精神科",
    "放射線科",
    "麻酔科",
    "救急科",
    "循環器内科",
    "消化器内科",
    "呼吸器内科",
    "脳神経外科",
    "心臓血管外科",
  ],
  看護局: [
    "外来",
    "1病棟",
    "2病棟",
    "3病棟",
    "4病棟",
    "5病棟",
    "ICU",
    "HCU",
    "手術室",
    "救急外来",
    "透析室",
    "内視鏡室",
  ],
  診療支援局: [
    "薬剤部",
    "検査部",
    "放射線部",
    "リハビリテーション部",
    "栄養管理部",
    "ME機器管理室",
    "臨床工学部",
    "病理部",
    "輸血部",
  ],
  "総務・事務": [
    "総務課",
    "経理課",
    "人事課",
    "医事課",
    "情報システム課",
    "施設管理課",
    "地域連携室",
  ],
  委員会: [
    "医療安全管理委員会",
    "感染対策委員会",
    "褥瘡対策委員会",
    "栄養サポートチーム",
    "緩和ケアチーム",
    "ICT委員会",
    "教育委員会",
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
    if (category === "選択にない部署") {
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

  const categories = [...Object.keys(DEPARTMENT_CATEGORIES), "選択にない部署"];

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
                  <FormLabel fontWeight="semibold">部署名を入力</FormLabel>
                  <Input
                    value={customDepartment}
                    onChange={(e) => setCustomDepartment(e.target.value)}
                    placeholder="例: 総合診療科、地域医療部"
                    size="lg"
                    borderRadius="lg"
                  />
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    ※ リストにない部署の場合は直接入力してください
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
