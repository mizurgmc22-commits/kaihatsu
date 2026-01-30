import { useEffect } from "react";
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
  Select,
  Textarea,
  VStack,
  HStack,
  Text,
  Box,
  useToast,
  Icon,
  Divider,
  useColorModeValue,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FiCalendar,
  FiUser,
  FiMapPin,
  FiFileText,
  FiArrowLeft,
  FiCheck,
} from "react-icons/fi";
import { createReservation } from "../../api/reservation";
import type { AvailableEquipment } from "../../types/reservation";
import type { ReservationInput } from "../../types/reservation";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: AvailableEquipment[];
  selectedDate: string | null;
  onComplete: () => void;
  onBack: () => void;
  customEquipmentName: string | null;
  quantities: Record<string, number>;
}

interface FormData {
  department: string;
  applicantName: string;
  contactInfo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  purpose: string;
  location: string;
  notes: string;
}

export default function ReservationFormModal({
  isOpen,
  onClose,
  equipment,
  selectedDate,
  onComplete,
  onBack,
  customEquipmentName,
  quantities,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const gradientBg = useColorModeValue(
    "linear(to-br, green.500, teal.500)",
    "linear(to-br, green.600, teal.600)"
  );

  const {
    register,
    handleSubmit,
    reset,
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
      purpose: "",
      location: "",
      notes: "",
    },
  });

  // フォームリセット
  useEffect(() => {
    if (isOpen && selectedDate) {
      reset({
        department: "",
        applicantName: "",
        contactInfo: "",
        startDate: selectedDate,
        startTime: "09:00",
        endDate: selectedDate,
        endTime: "18:00",
        purpose: "",
        location: "",
        notes: "",
      });
    }
  }, [isOpen, selectedDate, reset]);

  // 予約作成
  const createMutation = useMutation({
    mutationFn: async (reservations: ReservationInput[]) => {
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
      reservations = equipment.map((eq) => ({
        ...baseReservation,
        equipmentId: eq.id,
        quantity: quantities[eq.id] || 1,
      }));
    } else {
      reservations = [
        {
          ...baseReservation,
          customEquipmentName: customEquipmentName?.trim() || "",
          quantity: quantities["custom"] || 1,
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
            <Icon as={FiUser} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              予約者情報を入力
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(selectedDate)} の予約者情報を入力してください
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
                onClick={onBack}
              >
                選択機器に戻る
              </Button>

              <HStack spacing={3}>
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  rightIcon={<FiCheck />}
                  isLoading={createMutation.isPending}
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
