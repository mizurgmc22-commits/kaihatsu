import { useEffect, useCallback, forwardRef } from "react";
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
  Select,
  VStack,
  HStack,
  Text,
  Box,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  Input,
  InputGroup,
  InputRightElement,
} from "@chakra-ui/react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { FiCalendar, FiArrowLeft, FiArrowRight, FiInfo } from "react-icons/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

// 日本語ロケールを登録
registerLocale("ja", ja);

export interface UsagePeriodData {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string | null;
  onProceed: (data: UsagePeriodData) => void;
  onBack: () => void;
  initialData?: UsagePeriodData;
}

// 平日判定（月〜金）
const isWeekday = (date: Date): boolean => {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0=日曜, 6=土曜
};

// 次の平日を取得（土日の場合は翌週月曜日）
const getNextWeekday = (date: Date): Date => {
  const result = new Date(date);
  const day = result.getDay();
  if (day === 0) {
    // 日曜日 → 月曜日（+1日）
    result.setDate(result.getDate() + 1);
  } else if (day === 6) {
    // 土曜日 → 月曜日（+2日）
    result.setDate(result.getDate() + 2);
  }
  return result;
};

// 開始日から1週間後の返却日を計算（土日なら翌週月曜日）
const calculateEndDate = (startDate: Date): Date => {
  // 1週間後
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  // 土日なら翌週月曜日に調整
  return getNextWeekday(endDate);
};

// Date を YYYY-MM-DD 形式の文字列に変換
const formatDateToString = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// YYYY-MM-DD 形式の文字列を Date に変換
const parseStringToDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  return new Date(dateStr);
};

// 営業時間（9:00〜17:00）
const BUSINESS_HOURS = Array.from({ length: 9 }, (_, i) => {
  const hour = String(i + 9).padStart(2, "0");
  return { value: `${hour}:00`, label: `${hour}:00` };
});

// カスタム DatePicker Input コンポーネント
interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

const CustomDateInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <InputGroup>
      <Input
        ref={ref}
        value={value}
        onClick={onClick}
        placeholder={placeholder}
        readOnly
        borderRadius="lg"
        cursor="pointer"
        bg="white"
      />
      <InputRightElement>
        <Icon as={FiCalendar} color="gray.400" />
      </InputRightElement>
    </InputGroup>
  )
);
CustomDateInput.displayName = "CustomDateInput";

export default function UsagePeriodModal({
  isOpen,
  onClose,
  selectedDate,
  onProceed,
  onBack,
  initialData,
}: Props) {
  const gradientBg = useColorModeValue(
    "linear(to-br, green.500, teal.500)",
    "linear(to-br, green.600, teal.600)"
  );

  const getInitialStartDate = useCallback(() => {
    if (initialData?.startDate) {
      return parseStringToDate(initialData.startDate);
    }
    if (selectedDate) {
      const date = new Date(selectedDate);
      return getNextWeekday(date);
    }
    return null;
  }, [initialData, selectedDate]);

  const getInitialEndDate = useCallback(() => {
    if (initialData?.endDate) {
      return parseStringToDate(initialData.endDate);
    }
    const startDate = getInitialStartDate();
    if (startDate) {
      return calculateEndDate(startDate);
    }
    return null;
  }, [initialData, getInitialStartDate]);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
  } = useForm<UsagePeriodData>({
    defaultValues: {
      startDate: initialData?.startDate || (selectedDate ? formatDateToString(getNextWeekday(new Date(selectedDate))) : ""),
      startTime: initialData?.startTime || "09:00",
      endDate: initialData?.endDate || "",
      endTime: initialData?.endTime || "17:00",
    },
  });

  // 開始日の変更を監視
  const startDateStr = watch("startDate");

  // 開始日が変更されたら返却日を自動計算
  useEffect(() => {
    if (startDateStr) {
      const startDate = parseStringToDate(startDateStr);
      if (startDate) {
        // 開始日が土日の場合は翌週月曜日に調整
        if (!isWeekday(startDate)) {
          const adjustedDate = getNextWeekday(startDate);
          setValue("startDate", formatDateToString(adjustedDate));
        } else {
          // 返却日を1週間後（土日なら翌週月曜日）に設定
          const newEndDate = calculateEndDate(startDate);
          setValue("endDate", formatDateToString(newEndDate));
        }
      }
    }
  }, [startDateStr, setValue]);

  // 初期化
  useEffect(() => {
    if (isOpen && selectedDate && !initialData) {
      const startDate = getNextWeekday(new Date(selectedDate));
      const endDate = calculateEndDate(startDate);
      setValue("startDate", formatDateToString(startDate));
      setValue("startTime", "09:00");
      setValue("endDate", formatDateToString(endDate));
      setValue("endTime", "17:00");
    }
  }, [isOpen, selectedDate, initialData, setValue]);

  const formatDisplayDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
  };

  const onSubmit = (data: UsagePeriodData) => {
    onProceed(data);
  };

  // 土日のスタイルを設定
  const getDayClassName = (date: Date) => {
    if (!isWeekday(date)) {
      return "weekend-day";
    }
    return "";
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
            <Icon as={FiCalendar} boxSize={6} />
            <Text fontSize="xl" fontWeight="bold">
              利用期間を入力
            </Text>
          </HStack>
          <Text fontSize="sm" opacity={0.9}>
            {formatDisplayDate(selectedDate)} の予約 - ステップ 2/3
          </Text>
        </Box>

        <ModalCloseButton color="white" />

        <Box as="form" onSubmit={handleSubmit(onSubmit)}>
          <ModalBody py={6}>
            <VStack spacing={4} align="stretch">
              {/* 注意事項 */}
              <Alert status="info" borderRadius="lg" bg="blue.50">
                <AlertIcon as={FiInfo} color="blue.500" />
                <Box>
                  <Text fontWeight="bold" fontSize="sm" color="blue.700">
                    貸出・返却について
                  </Text>
                  <Text fontSize="sm" color="blue.600">
                    貸出・返却は<Text as="span" fontWeight="bold">平日（月〜金）9:00〜17:00</Text>のみ対応しております。
                    貸与期間は<Text as="span" fontWeight="bold">1週間</Text>です。
                    返却日が土日となる場合は、自動的に翌週月曜日に設定されます。
                  </Text>
                </Box>
              </Alert>

              {/* 貸出日 */}
              <Box>
                <Text fontWeight="bold" fontSize="md" mb={3} color="gray.700">
                  📦 貸出日
                </Text>
                <HStack spacing={4}>
                  <FormControl isRequired flex={2}>
                    <FormLabel>貸出日（平日のみ）</FormLabel>
                    <Controller
                      control={control}
                      name="startDate"
                      rules={{ required: "貸出日は必須です" }}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value ? parseStringToDate(field.value) : null}
                          onChange={(date) => {
                            if (date) {
                              const adjustedDate = isWeekday(date) ? date : getNextWeekday(date);
                              field.onChange(formatDateToString(adjustedDate));
                            }
                          }}
                          filterDate={isWeekday}
                          dayClassName={getDayClassName}
                          locale="ja"
                          dateFormat="yyyy/MM/dd (EEE)"
                          minDate={new Date()}
                          customInput={<CustomDateInput />}
                          popperPlacement="bottom-start"
                          showPopperArrow={false}
                        />
                      )}
                    />
                  </FormControl>
                  <FormControl isRequired flex={1}>
                    <FormLabel>貸出時間</FormLabel>
                    <Select
                      {...register("startTime", { required: true })}
                      borderRadius="lg"
                    >
                      {BUSINESS_HOURS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
              </Box>

              {/* 返却日 */}
              <Box>
                <Text fontWeight="bold" fontSize="md" mb={3} color="gray.700">
                  📥 返却日（貸出日から1週間後）
                </Text>
                <HStack spacing={4}>
                  <FormControl isRequired flex={2}>
                    <FormLabel>返却日（平日のみ）</FormLabel>
                    <Controller
                      control={control}
                      name="endDate"
                      rules={{ required: "返却日は必須です" }}
                      render={({ field }) => (
                        <DatePicker
                          selected={field.value ? parseStringToDate(field.value) : null}
                          onChange={(date) => {
                            if (date) {
                              const adjustedDate = isWeekday(date) ? date : getNextWeekday(date);
                              field.onChange(formatDateToString(adjustedDate));
                            }
                          }}
                          filterDate={isWeekday}
                          dayClassName={getDayClassName}
                          locale="ja"
                          dateFormat="yyyy/MM/dd (EEE)"
                          minDate={startDateStr ? parseStringToDate(startDateStr) : new Date()}
                          customInput={<CustomDateInput />}
                          popperPlacement="bottom-start"
                          showPopperArrow={false}
                        />
                      )}
                    />
                  </FormControl>
                  <FormControl isRequired flex={1}>
                    <FormLabel>返却時間</FormLabel>
                    <Select
                      {...register("endTime", { required: true })}
                      borderRadius="lg"
                    >
                      {BUSINESS_HOURS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
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
                申請者情報に戻る
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
                  次へ：利用詳細
                </Button>
              </HStack>
            </HStack>
          </ModalFooter>
        </Box>

        {/* DatePicker のカスタムスタイル */}
        <style>{`
          .react-datepicker {
            font-family: inherit;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }
          .react-datepicker__header {
            background: linear-gradient(to right, #38A169, #319795);
            border-bottom: none;
            border-radius: 12px 12px 0 0;
            padding-top: 12px;
          }
          .react-datepicker__current-month {
            color: white;
            font-weight: bold;
            font-size: 1rem;
          }
          .react-datepicker__day-name {
            color: white;
            font-weight: 500;
          }
          .react-datepicker__day {
            border-radius: 8px;
            transition: all 0.2s;
          }
          .react-datepicker__day:hover {
            background-color: #EDF2F7;
          }
          .react-datepicker__day--selected {
            background-color: #38A169 !important;
            color: white !important;
          }
          .react-datepicker__day--keyboard-selected {
            background-color: #68D391;
          }
          .react-datepicker__day--disabled {
            color: #CBD5E0 !important;
            background-color: #F7FAFC !important;
            cursor: not-allowed;
          }
          .weekend-day {
            color: #A0AEC0 !important;
            background-color: #F7FAFC !important;
          }
          .react-datepicker__navigation {
            top: 12px;
          }
          .react-datepicker__navigation-icon::before {
            border-color: white;
          }
          .react-datepicker__triangle {
            display: none;
          }
        `}</style>
      </ModalContent>
    </Modal>
  );
}
