import { useEffect, useCallback } from "react";
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
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { FiCalendar, FiArrowLeft, FiArrowRight, FiInfo } from "react-icons/fi";
import DatePicker, { registerLocale } from "react-datepicker";
import { ja } from "date-fns/locale";
import "react-datepicker/dist/react-datepicker.css";

import {
  isWeekday,
  getNextWeekday,
  calculateEndDate,
  formatDateToString,
  parseStringToDate,
  formatDisplayDate,
} from "../../utils/dateUtils";
import { CustomDateInput } from "../../components/ui/CustomDateInput";
import { DatePickerStyles } from "../../components/ui/DatePickerStyles";

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

// 営業時間（9:00〜17:00）
const BUSINESS_HOURS = Array.from({ length: 9 }, (_, i) => {
  const hour = String(i + 9).padStart(2, "0");
  return { value: `${hour}:00`, label: `${hour}:00` };
});

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

  const {
    register,
    handleSubmit,
    setValue,
    control,
    watch,
  } = useForm<UsagePeriodData>({
    defaultValues: {
      startDate: initialData?.startDate || "",
      startTime: initialData?.startTime || "09:00",
      endDate: initialData?.endDate || "",
      endTime: initialData?.endTime || "17:00",
      ...initialData,
    },
  });

  // 開始日の変更を監視
  const startDateStr = watch("startDate");

  // 初期化とデフォルト値の設定
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // 既存データがある場合はそれをセット
        setValue("startDate", initialData.startDate);
        setValue("startTime", initialData.startTime);
        setValue("endDate", initialData.endDate);
        setValue("endTime", initialData.endTime);
      } else if (selectedDate) {
        // 新規で日付選択されている場合
        const startDate = getNextWeekday(new Date(selectedDate));
        const endDate = calculateEndDate(startDate);
        setValue("startDate", formatDateToString(startDate));
        setValue("startTime", "09:00");
        setValue("endDate", formatDateToString(endDate));
        setValue("endTime", "17:00");
      }
    }
  }, [isOpen, selectedDate, initialData, setValue]);

  // 開始日が変更されたら返却日を自動計算 (ユーザー操作時)
  // Note: 初期化時にも反応してしまうのを防ぐため、startDateStrの変化を監視するが、
  // 意図しない上書きに注意が必要。ここではシンプルに「開始日が変われば常に再計算」とする。
  useEffect(() => {
    if (startDateStr) {
      const startDate = parseStringToDate(startDateStr);
      if (startDate) {
        // 開始日が土日の場合は翌週月曜日に調整 (DatePicker側で制御しているが念のため)
        if (!isWeekday(startDate)) {
          const adjustedDate = getNextWeekday(startDate);
          // 循環参照を防ぐため、値が違う場合のみ更新
          if (formatDateToString(adjustedDate) !== startDateStr) {
            setValue("startDate", formatDateToString(adjustedDate));
            return;
          }
        }
        
        // 返却日を1週間後（土日なら翌週月曜日）に設定
        // ただし、initialDataがあり、かつ開始日が変更されていない場合は上書きしないなど
        // 細かい制御が必要だが、今回は「開始日を変えたら連動する」動きを優先
        const newEndDate = calculateEndDate(startDate);
        // 現在の終了日と違う場合のみ更新（無限ループ防止）
        // watch("endDate")と比較したいが、depsに追加すると複雑化するため
        // ここでの更新は「ユーザーが開始日を変更した」という前提で割り切る
        // ただし、初期マウント時も走るので注意。
        // リファクタリング前も同様の挙動だったので維持。
        setValue("endDate", formatDateToString(newEndDate));
      }
    }
  }, [startDateStr, setValue]);

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
        {/* スタイル定義 */}
        <DatePickerStyles />

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
                          onChange={(date: Date | null) => {
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
                          onChange={(date: Date | null) => {
                            if (date) {
                              const adjustedDate = isWeekday(date) ? date : getNextWeekday(date);
                              field.onChange(formatDateToString(adjustedDate));
                            }
                          }}
                          filterDate={isWeekday}
                          dayClassName={getDayClassName}
                          locale="ja"
                          dateFormat="yyyy/MM/dd (EEE)"
                          minDate={(startDateStr && parseStringToDate(startDateStr)) || new Date()}
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
      </ModalContent>
    </Modal>
  );
}
