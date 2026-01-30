import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalCloseButton,
  ModalBody,
  ModalFooter,
  Button,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Image,
  Icon,
  SimpleGrid,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  useColorModeValue,
  FormControl,
  FormLabel,
  Input,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import {
  FiArrowLeft,
  FiArrowRight,
  FiPackage,
  FiCheck,
} from "react-icons/fi";
import type { AvailableEquipment } from "../../types/reservation";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: AvailableEquipment[];
  selectedDate: string | null;
  onProceed: (quantities: Record<string, number>) => void;
  onBack: () => void;
  customEquipmentName: string | null;
  onCustomEquipmentNameChange: (name: string) => void;
}

export default function EquipmentConfirmModal({
  isOpen,
  onClose,
  equipment,
  selectedDate,
  onProceed,
  onBack,
  customEquipmentName,
  onCustomEquipmentNameChange,
}: Props) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const cardBg = useColorModeValue("white", "gray.700");
  const sectionBg = useColorModeValue("gray.50", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-br, blue.500, cyan.500)",
    "linear(to-br, blue.600, cyan.600)"
  );

  // 初期化
  useEffect(() => {
    if (isOpen) {
      const initialQuantities: Record<string, number> = {};
      if (equipment.length > 0) {
        equipment.forEach((eq) => {
          initialQuantities[eq.id] = 1;
        });
      } else {
        initialQuantities["custom"] = 1;
      }
      setQuantities(initialQuantities);
    }
  }, [isOpen, equipment]);

  const handleQuantityChange = (id: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: value || 1,
    }));
  };

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

  // 数量超過チェック
  const isAnyQuantityExceeded =
    equipment.length > 0 &&
    equipment.some((eq) => {
      if (eq.isUnlimited) return false;
      const qty = quantities[eq.id] || 0;
      return qty > eq.remainingQuantity;
    });

  const isCustomQuantityInvalid =
    equipment.length === 0 && (quantities["custom"] || 0) < 1;

  const isCustomNameEmpty =
    equipment.length === 0 && !customEquipmentName?.trim();

  const isProceedDisabled =
    isAnyQuantityExceeded || isCustomQuantityInvalid || isCustomNameEmpty;

  const handleProceed = () => {
    onProceed(quantities);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      scrollBehavior="inside"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden" maxH="90vh">
        {/* ヘッダー */}
        <Box bgGradient={gradientBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiPackage} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              選択した機器を確認
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(selectedDate)} の予約機器と数量を確認してください
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* 選択した機器一覧 */}
            {equipment.length > 0 && (
              <Box>
                <HStack mb={3} spacing={2}>
                  <Icon as={FiPackage} color="gray.500" />
                  <Text fontWeight="bold" fontSize="md">
                    選択した機器
                  </Text>
                  <Badge colorScheme="blue">{equipment.length} 件</Badge>
                </HStack>

                <SimpleGrid
                  columns={{ base: 1, md: 2 }}
                  spacing={3}
                  p={4}
                  bg={sectionBg}
                  borderRadius="xl"
                >
                  {equipment.map((eq) => {
                    const imageSrc = resolveEquipmentImage(eq.name, eq.imageUrl);
                    const currentQty = quantities[eq.id] || 1;
                    const isExceeded =
                      !eq.isUnlimited && currentQty > eq.remainingQuantity;

                    return (
                      <HStack
                        key={eq.id}
                        p={3}
                        bg={cardBg}
                        borderRadius="lg"
                        borderWidth="1px"
                        spacing={3}
                        alignItems="center"
                      >
                        {imageSrc && (
                          <Image
                            src={imageSrc}
                            alt={eq.name}
                            boxSize="40px"
                            objectFit="cover"
                            borderRadius="md"
                            bg="white"
                          />
                        )}
                        <Box flex={1}>
                          <Text fontWeight="medium" fontSize="sm" noOfLines={1}>
                            {eq.name}
                          </Text>
                          <HStack spacing={2} align="center" mt={1}>
                            <Text fontSize="xs" color="gray.500">
                              {eq.category?.name || "その他"}
                            </Text>
                            {!eq.isUnlimited && (
                              <Badge colorScheme="green" fontSize="xs">
                                残 {eq.remainingQuantity}
                              </Badge>
                            )}
                          </HStack>
                        </Box>
                        <Box width="80px">
                          <NumberInput
                            min={1}
                            max={eq.isUnlimited ? undefined : eq.remainingQuantity}
                            value={currentQty}
                            onChange={(_, val) => handleQuantityChange(eq.id, val)}
                            size="sm"
                            isInvalid={isExceeded}
                          >
                            <NumberInputField borderRadius="md" />
                            <NumberInputStepper>
                              <NumberIncrementStepper />
                              <NumberDecrementStepper />
                            </NumberInputStepper>
                          </NumberInput>
                        </Box>
                      </HStack>
                    );
                  })}
                </SimpleGrid>
              </Box>
            )}

            {/* カスタム機器入力 */}
            {equipment.length === 0 && (
              <Box p={4} bg="purple.50" borderRadius="xl">
                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel fontWeight="bold">
                      <HStack spacing={2}>
                        <Icon as={FiPackage} />
                        <Text>予約機器名</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      placeholder="予約したい機器名を入力"
                      value={customEquipmentName || ""}
                      onChange={(e) => onCustomEquipmentNameChange(e.target.value)}
                      bg="white"
                      borderRadius="lg"
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel fontWeight="bold">数量</FormLabel>
                    <NumberInput
                      min={1}
                      value={quantities["custom"] || 1}
                      onChange={(_, val) => handleQuantityChange("custom", val)}
                      maxW="150px"
                    >
                      <NumberInputField borderRadius="lg" />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  </FormControl>
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter
          borderTopWidth="1px"
          bg={useColorModeValue("gray.50", "gray.800")}
        >
          <HStack spacing={4} w="full" justify="space-between">
            <Button
              variant="ghost"
              leftIcon={<FiArrowLeft />}
              onClick={onBack}
            >
              機器選択に戻る
            </Button>

            <HStack spacing={3}>
              <Button variant="ghost" onClick={onClose}>
                キャンセル
              </Button>
              <Button
                rightIcon={<FiArrowRight />}
                isDisabled={isProceedDisabled}
                bgGradient="linear(to-br, green.500, teal.500)"
                color="white"
                _hover={{
                  bgGradient: "linear(to-br, green.600, teal.600)",
                  transform: "translateY(-1px)",
                  shadow: "lg",
                }}
                _active={{
                  transform: "translateY(0)",
                }}
                onClick={handleProceed}
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
