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
  useColorModeValue,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { FiUser, FiArrowLeft, FiArrowRight } from "react-icons/fi";

export interface ApplicantData {
  department: string;
  applicantName: string;
  contactInfo: string;
}

// 名前・連絡先のみのフォームデータ
interface ApplicantFormData {
  applicantName: string;
  contactInfo: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  department: string; // 前のステップで選択された部署
  onProceed: (data: ApplicantData) => void;
  onBack: () => void;
  initialData?: { applicantName?: string; contactInfo?: string };
}

export default function ApplicantInfoModal({
  isOpen,
  onClose,
  selectedDate,
  department,
  onProceed,
  onBack,
  initialData,
}: Props) {
  const gradientBg = useColorModeValue(
    "linear(to-br, green.500, teal.500)",
    "linear(to-br, green.600, teal.600)",
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicantFormData>({
    defaultValues: initialData || {
      applicantName: "",
      contactInfo: "",
    },
  });

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

  const onSubmit = (data: ApplicantFormData) => {
    // 部署情報と合わせて完全なApplicantDataを作成
    onProceed({
      department,
      applicantName: data.applicantName,
      contactInfo: data.contactInfo,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      motionPreset="slideInBottom"
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="xl" overflow="hidden">
        {/* ヘッダー */}
        <Box bgGradient={gradientBg} color="white" py={6} px={6}>
          <HStack spacing={3} mb={2}>
            <Icon as={FiUser} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              申請者情報を入力
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDate(selectedDate)} の予約 - ステップ 2/4
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalBody py={6}>
            <VStack spacing={5} align="stretch">
              {/* 選択された部署を表示 */}
              <Box
                bg={useColorModeValue("gray.100", "gray.700")}
                p={3}
                borderRadius="lg"
              >
                <Text fontSize="sm" color="gray.500" mb={1}>
                  所属部署
                </Text>
                <Text fontWeight="semibold">{department}</Text>
              </Box>

              <HStack spacing={4} align="start">
                <FormControl isRequired isInvalid={!!errors.applicantName}>
                  <FormLabel>氏名</FormLabel>
                  <Input
                    {...register("applicantName", {
                      required: "氏名は必須です",
                    })}
                    placeholder="例: 山田 太郎"
                    borderRadius="lg"
                  />
                </FormControl>
                <FormControl isRequired isInvalid={!!errors.contactInfo}>
                  <FormLabel>連絡先（内線/PHS）</FormLabel>
                  <Input
                    {...register("contactInfo", {
                      required: "連絡先は必須です",
                    })}
                    placeholder="例: 1234 / 内線1234 / PHS 5678"
                    borderRadius="lg"
                  />
                  <Text fontSize="xs" color="gray.500" mt={1}>
                    ※ 予約確認に連絡先を使用します。忘れないようにお願いします。
                  </Text>
                </FormControl>
              </HStack>
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
                部署選択に戻る
              </Button>

              <HStack spacing={3}>
                <Button variant="ghost" onClick={onClose}>
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  rightIcon={<FiArrowRight />}
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
                  次へ：利用期間
                </Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </Box>
      </ModalContent>
    </Modal>
  );
}
