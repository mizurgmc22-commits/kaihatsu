import { useEffect } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  useToast,
  Alert,
  AlertIcon,
  Image,
  Icon,
  SimpleGrid,
  Flex,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiCalendar,
  FiUser,
  FiMapPin,
  FiFileText,
  FiArrowLeft,
  FiCheck,
  FiPackage,
} from "react-icons/fi";
import { createReservation } from "../../api/reservation";
import type { AvailableEquipment } from "../../types/reservation";
import type { ReservationInput } from "../../types/reservation";
import { resolveEquipmentImage } from "../../constants/equipmentImageOverrides";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: AvailableEquipment[]; // 複数機器対応
  selectedDate: string | null;
  onComplete: () => void;
  onBack: () => void;
  customEquipmentName: string | null;
}

interface FormData {
  department: string;
  applicantName: string;
  contactInfo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  quantities: Record<string, number>;
  purpose: string;
  location: string;
  notes: string;
  customEquipmentName: string;
}

export default function ReservationFormModal({
  isOpen,
  onClose,
  equipment,
  selectedDate,
  onComplete,
  onBack,
  customEquipmentName,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  // カラー設定
  const cardBg = useColorModeValue("white", "gray.700");
  const sectionBg = useColorModeValue("gray.50", "gray.800");
  const gradientBg = useColorModeValue(
    "linear(to-br, green.500, teal.500)",
    "linear(to-br, green.600, teal.600)",
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      department: "",
      applicantName: "",
      contactInfo: "",
      startDate: "",
      startTime: "09:00",
      endDate: "",
      endTime: "18:00",
      quantities: {},
      purpose: "",
      location: "",
      notes: "",
      customEquipmentName: "",
    },
  });

  const watchQuantities = watch("quantities");

  // フォームリセット
  useEffect(() => {
    if (isOpen && selectedDate) {
      const initialQuantities: Record<string, number> = {};
      if (equipment.length > 0) {
        equipment.forEach((eq) => {
          initialQuantities[eq.id] = 1;
        });
      } else {
        initialQuantities["custom"] = 1;
      }

      reset({
        department: "",
        applicantName: "",
        contactInfo: "",
        startDate: selectedDate,
        startTime: "09:00",
        endDate: selectedDate,
        endTime: "18:00",
        quantities: initialQuantities,
        purpose: "",
        location: "",
        notes: "",
        customEquipmentName: customEquipmentName || "",
      });
    }
  }, [isOpen, selectedDate, customEquipmentName, reset, equipment]);

  // 予約作成
  const createMutation = useMutation({
    mutationFn: async (reservations: ReservationInput[]) => {
      // 複数機器の場合は順次作成
      for (const reservation of reservations) {
        await createReservation(reservation);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservations"] });
      queryClient.invalidateQueries({ queryKey: ["availableEquipment"] });
      toast({
        title: "予約を登録しました",
        description:
          equipment.length > 1
            ? `${equipment.length}件の機器の予約が正常に作成されました。`
            : "予約が正常に作成されました。",
        status: "success",
        duration: 3000,
      });
      onComplete();
    },
    onError: (error: any) => {
      console.error("Reservation Error:", error);
      toast({
        title: "予約に失敗しました",
        description:
          error.response?.data?.message ||
          error.message ||
          "エラーが発生しました",
        status: "error",
        duration: 5000,
      });
    },
  });

  const onSubmit = (data: FormData) => {
    // カスタム機器の場合
    if (equipment.length === 0 && !data.customEquipmentName.trim()) {
      toast({
        title: "機器名を入力してください",
        status: "error",
        duration: 3000,
      });
      return;
    }

    const baseReservation = {
      department: data.department,
      applicantName: data.applicantName,
      contactInfo: data.contactInfo,
      startTime: `${data.startDate}T${data.startTime}:00`,
      endTime: `${data.endDate}T${data.endTime}:00`,
      purpose: data.purpose || null,
      location: data.location || null,
      notes: data.notes || null,
    };

    let reservations: ReservationInput[];

    if (equipment.length > 0) {
      // 選択した機器ごとに予約を作成
      reservations = equipment.map((eq) => ({
        ...baseReservation,
        equipmentId: eq.id,
        quantity: data.quantities[eq.id] || 1,
      }));
    } else {
      // カスタム機器
      reservations = [
        {
          ...baseReservation,
          customEquipmentName: data.customEquipmentName.trim(),
          quantity: data.quantities["custom"] || 1,
        },
      ];
    }

    createMutation.mutate(reservations);
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

  // 数量超過チェックのロジックは各Control内で実施するため、ここではグローバルのフラグだけ計算（Submitボタン無効化用）
  const isAnyQuantityExceeded =
    equipment.length > 0 &&
    equipment.some((eq) => {
      if (eq.isUnlimited) return false;
      const qty = watchQuantities?.[eq.id] || 0;
      return qty > eq.remainingQuantity;
    });

  // カスタム機器の数量チェック（カスタムの場合は制限なしだが、念のため）
  const isCustomQuantityInvalid =
    equipment.length === 0 && (watchQuantities?.["custom"] || 0) < 1;

  const isSubmitDisabled = isAnyQuantityExceeded || isCustomQuantityInvalid;

  // 戻る
  const handleBack = () => {
    onBack();
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
            <Icon as={FiCalendar} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              予約情報を入力
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(selectedDate)} の予約情報を入力してください
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <Box
          as="form"
          onSubmit={handleSubmit(onSubmit)}
          display="flex"
          flexDirection="column"
          flex={1}
          overflow="hidden"
        >
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
                      const imageSrc = resolveEquipmentImage(
                        eq.name,
                        eq.imageUrl,
                      );
                      const currentQty = watchQuantities?.[eq.id] || 1;
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
                            <Text
                              fontWeight="medium"
                              fontSize="sm"
                              noOfLines={1}
                            >
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
                            <Controller
                              name={`quantities.${eq.id}`}
                              control={control}
                              rules={{
                                required: true,
                                min: 1,
                                max: eq.isUnlimited
                                  ? undefined
                                  : eq.remainingQuantity,
                              }}
                              render={({ field }) => (
                                <NumberInput
                                  min={1}
                                  max={
                                    eq.isUnlimited
                                      ? undefined
                                      : eq.remainingQuantity
                                  }
                                  value={field.value}
                                  onChange={(_, val) =>
                                    field.onChange(val || 1)
                                  }
                                  size="sm"
                                  isInvalid={isExceeded}
                                >
                                  <NumberInputField borderRadius="md" />
                                  <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                  </NumberInputStepper>
                                </NumberInput>
                              )}
                            />
                          </Box>
                        </HStack>
                      );
                    })}
                  </SimpleGrid>
                </Box>
              )}

              {/* カスタム機器名入力 */}
              {equipment.length === 0 && (
                <Box p={4} bg="purple.50" borderRadius="xl">
                  <FormControl isRequired>
                    <FormLabel fontWeight="bold">
                      <HStack spacing={2}>
                        <Icon as={FiPackage} />
                        <Text>予約機器名</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      placeholder="予約したい機器名を入力"
                      {...register("customEquipmentName", {
                        required: "機器名は必須です",
                      })}
                      bg="white"
                      borderRadius="lg"
                    />
                  </FormControl>
                </Box>
              )}

              <Divider />

              {/* 申請者情報セクション */}
              <Box>
                <HStack mb={3} spacing={2}>
                  <Icon as={FiUser} color="gray.500" />
                  <Text fontWeight="bold" fontSize="md">
                    申請者情報
                  </Text>
                </HStack>

                <VStack spacing={4} align="stretch">
                  <FormControl isRequired>
                    <FormLabel>部署</FormLabel>
                    <Input
                      {...register("department", {
                        required: "部署は必須です",
                      })}
                      placeholder="例: 看護部"
                      borderRadius="lg"
                    />
                  </FormControl>

                  <HStack spacing={4}>
                    <FormControl isRequired>
                      <FormLabel>氏名</FormLabel>
                      <Input
                        {...register("applicantName", {
                          required: "氏名は必須です",
                        })}
                        placeholder="例: 山田 太郎"
                        borderRadius="lg"
                      />
                    </FormControl>
                    <FormControl isRequired>
                      <FormLabel>連絡先（内線/PHS）</FormLabel>
                      <Input
                        {...register("contactInfo", {
                          required: "連絡先は必須です",
                        })}
                        placeholder="例: 内線1234 / PHS 5678"
                        borderRadius="lg"
                      />
                    </FormControl>
                  </HStack>
                </VStack>
              </Box>

              <Divider />

              {/* 利用期間セクション */}
              <Box>
                <HStack mb={3} spacing={2}>
                  <Icon as={FiCalendar} color="gray.500" />
                  <Text fontWeight="bold" fontSize="md">
                    利用期間
                  </Text>
                </HStack>

                <VStack spacing={4} align="stretch">
                  <HStack spacing={4}>
                    <FormControl isRequired flex={2}>
                      <FormLabel>利用開始日</FormLabel>
                      <Input
                        type="date"
                        {...register("startDate", {
                          required: "開始日は必須です",
                        })}
                        borderRadius="lg"
                      />
                    </FormControl>
                    <FormControl isRequired flex={1}>
                      <FormLabel>開始時間</FormLabel>
                      <Select
                        {...register("startTime", { required: true })}
                        borderRadius="lg"
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = String(i).padStart(2, "0");
                          return (
                            <option key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </option>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </HStack>

                  <HStack spacing={4}>
                    <FormControl isRequired flex={2}>
                      <FormLabel>利用終了日</FormLabel>
                      <Input
                        type="date"
                        {...register("endDate", {
                          required: "終了日は必須です",
                        })}
                        borderRadius="lg"
                      />
                    </FormControl>
                    <FormControl isRequired flex={1}>
                      <FormLabel>終了時間</FormLabel>
                      <Select
                        {...register("endTime", { required: true })}
                        borderRadius="lg"
                      >
                        {Array.from({ length: 24 }, (_, i) => {
                          const hour = String(i).padStart(2, "0");
                          return (
                            <option key={hour} value={`${hour}:00`}>
                              {hour}:00
                            </option>
                          );
                        })}
                      </Select>
                    </FormControl>
                  </HStack>
                </VStack>
              </Box>

              {/* 数量（カスタム機器のみ） */}
              {equipment.length === 0 && (
                <>
                  <Divider />
                  <FormControl isRequired>
                    <FormLabel>
                      <HStack spacing={2}>
                        <Icon as={FiPackage} color="gray.500" />
                        <Text fontWeight="bold">数量</Text>
                      </HStack>
                    </FormLabel>
                    <Controller
                      name="quantities.custom"
                      control={control}
                      rules={{
                        required: true,
                        min: 1,
                      }}
                      render={({ field }) => (
                        <NumberInput
                          min={1}
                          value={field.value}
                          onChange={(_, val) => field.onChange(val || 1)}
                          maxW="150px"
                        >
                          <NumberInputField borderRadius="lg" />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      )}
                    />
                  </FormControl>
                </>
              )}

              <Divider />

              {/* 利用詳細セクション */}
              <Box>
                <HStack mb={3} spacing={2}>
                  <Icon as={FiFileText} color="gray.500" />
                  <Text fontWeight="bold" fontSize="md">
                    利用詳細
                  </Text>
                </HStack>

                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>利用目的</FormLabel>
                    <Textarea
                      {...register("purpose")}
                      placeholder="例: 新人研修でのCPR訓練"
                      rows={2}
                      borderRadius="lg"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>
                      <HStack spacing={2}>
                        <Icon as={FiMapPin} />
                        <Text>利用場所</Text>
                      </HStack>
                    </FormLabel>
                    <Input
                      {...register("location")}
                      placeholder="例: 3階 研修室A"
                      borderRadius="lg"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>備考</FormLabel>
                    <Textarea
                      {...register("notes")}
                      placeholder="その他連絡事項があれば記入してください"
                      rows={2}
                      borderRadius="lg"
                    />
                  </FormControl>
                </VStack>
              </Box>
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
                onClick={handleBack}
              >
                機器選択に戻る
              </Button>

              <HStack spacing={3}>
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  rightIcon={<FiCheck />}
                  isLoading={createMutation.isPending}
                  isDisabled={isSubmitDisabled}
                  bgGradient={gradientBg}
                  color="white"
                  _hover={{
                    bgGradient: "linear(to-br, green.600, teal.600)",
                    transform: "translateY(-1px)",
                    shadow: "lg",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                >
                  予約を確定
                </Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </Box>
      </ModalContent>
    </Modal>
  );
}
