import { useState, useCallback, useRef } from "react";
import {
  Box,
  HStack,
  Badge,
  useDisclosure,
} from "@chakra-ui/react";
import { FiCalendar } from "react-icons/fi";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getCategories } from "../../api/equipment";
import {
  getAvailableEquipment,
  getCalendarEvents,
} from "../../api/reservation";
import type { AvailableEquipment } from "../../types/reservation";
import CategorySelectionModal from "./CategorySelectionModal";
import AvailableEquipmentModal from "./AvailableEquipmentModal";
import EquipmentConfirmModal from "./EquipmentConfirmModal";
import ReservationFormModal from "./ReservationFormModal";
import PageHeader from "../../components/PageHeader";

export default function ReservationCalendar() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedEquipmentList, setSelectedEquipmentList] = useState<
    AvailableEquipment[]
  >([]);
  const [customEquipmentName, setCustomEquipmentName] = useState<string | null>(
    null
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const queryClient = useQueryClient();

  // Step 1: カテゴリ選択モーダル
  const {
    isOpen: isCategoryModalOpen,
    onOpen: onCategoryModalOpen,
    onClose: onCategoryModalClose,
  } = useDisclosure();

  // Step 2: 機器選択モーダル
  const {
    isOpen: isEquipmentModalOpen,
    onOpen: onEquipmentModalOpen,
    onClose: onEquipmentModalClose,
  } = useDisclosure();

  // Step 3: 機器確認モーダル
  const {
    isOpen: isConfirmModalOpen,
    onOpen: onConfirmModalOpen,
    onClose: onConfirmModalClose,
  } = useDisclosure();

  // Step 4: 予約フォームモーダル
  const {
    isOpen: isFormModalOpen,
    onOpen: onFormModalOpen,
    onClose: onFormModalClose,
  } = useDisclosure();

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // 選択日の予約可能機器取得
  const { data: availableEquipment, isLoading: isLoadingEquipment } = useQuery({
    queryKey: ["availableEquipment", selectedDate],
    queryFn: () => getAvailableEquipment(selectedDate!, undefined),
    enabled: !!selectedDate,
  });

  // カレンダーイベント取得
  const { data: calendarEvents } = useQuery({
    queryKey: ["calendarEvents", dateRange?.start, dateRange?.end],
    queryFn: () => getCalendarEvents(dateRange!.start, dateRange!.end),
    enabled: !!dateRange,
  });

  // カレンダーの日付範囲変更時
  const handleDatesSet = useCallback(
    (dateInfo: { startStr: string; endStr: string }) => {
      setDateRange({ start: dateInfo.startStr, end: dateInfo.endStr });
    },
    []
  );

  // 日付クリック時 → Step 1: カテゴリ選択モーダルを開く
  const handleDateClick = useCallback(
    (info: { dateStr: string }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const clickedDate = new Date(info.dateStr);

      if (clickedDate < today) {
        return;
      }

      setSelectedDate(info.dateStr);
      setSelectedCategoryIds([]);
      setSelectedEquipmentList([]);
      setCustomEquipmentName(null);
      setQuantities({});
      onCategoryModalOpen();
    },
    [onCategoryModalOpen]
  );

  // Step 1 → Step 2: カテゴリ選択後、機器選択モーダルへ
  const handleCategoryProceed = (categoryIds: string[]) => {
    setSelectedCategoryIds(categoryIds);
    onCategoryModalClose();
    onEquipmentModalOpen();
  };

  // Step 2 → Step 3: 機器選択後、機器確認モーダルへ
  const handleEquipmentProceed = (equipment: AvailableEquipment[]) => {
    setCustomEquipmentName(null);
    setSelectedEquipmentList(equipment);
    onEquipmentModalClose();
    onConfirmModalOpen();
  };

  // Step 2: カスタム機器予約 → Step 3
  const handleCustomReserve = (name: string) => {
    setSelectedEquipmentList([]);
    setCustomEquipmentName(name);
    onEquipmentModalClose();
    onConfirmModalOpen();
  };

  // Step 1: カテゴリモーダルからカスタム機器予約 → Step 3
  const handleCustomReserveFromCategory = (name: string) => {
    setSelectedEquipmentList([]);
    setCustomEquipmentName(name);
    onCategoryModalClose();
    onConfirmModalOpen();
  };

  // Step 2 → Step 1: 戻る
  const handleEquipmentBack = () => {
    onEquipmentModalClose();
    onCategoryModalOpen();
  };

  // Step 3 → Step 2: 戻る
  const handleConfirmBack = () => {
    onConfirmModalClose();
    onEquipmentModalOpen();
  };

  // Step 3 → Step 4: 機器確認後、予約フォームへ
  const handleConfirmProceed = (newQuantities: Record<string, number>) => {
    setQuantities(newQuantities);
    onConfirmModalClose();
    onFormModalOpen();
  };

  // Step 4 → Step 3: 戻る
  const handleFormBack = () => {
    onFormModalClose();
    onConfirmModalOpen();
  };

  // モーダルを閉じる
  const handleFormModalClose = () => {
    onFormModalClose();
    setSelectedEquipmentList([]);
    setCustomEquipmentName(null);
    setQuantities({});
  };

  const handleConfirmModalClose = () => {
    onConfirmModalClose();
    setSelectedEquipmentList([]);
    setCustomEquipmentName(null);
  };

  // 予約完了時
  const handleReservationComplete = () => {
    handleFormModalClose();
    setSelectedCategoryIds([]);
    queryClient.invalidateQueries({ queryKey: ["calendarEvents"] });
  };

  // カスタム機器名変更
  const handleCustomEquipmentNameChange = (name: string) => {
    setCustomEquipmentName(name);
  };

  return (
    <Box>
      <PageHeader
        title="予約カレンダー"
        description="カレンダーから日付を選択して資機材を予約できます。日付をクリックして利用可能な機材を確認してください。"
        icon={FiCalendar}
      />

      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        <HStack mb={4} spacing={4}>
          <Badge colorScheme="green" px={2} py={1}>
            予約可能
          </Badge>
          <Badge colorScheme="yellow" px={2} py={1}>
            残りわずか
          </Badge>
          <Badge colorScheme="gray" px={2} py={1}>
            過去の日付
          </Badge>
        </HStack>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,dayGridWeek",
          }}
          buttonText={{
            today: "今日",
            month: "月",
            week: "週",
          }}
          height="auto"
          events={calendarEvents || []}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventDisplay="block"
          dayCellClassNames={(arg) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (arg.date < today) {
              return ["past-date"];
            }
            return ["future-date"];
          }}
        />
      </Box>

      {/* Step 1: カテゴリ選択モーダル */}
      <CategorySelectionModal
        isOpen={isCategoryModalOpen}
        onClose={onCategoryModalClose}
        date={selectedDate}
        categories={categories || []}
        onProceed={handleCategoryProceed}
        onCustomReserve={handleCustomReserveFromCategory}
      />

      {/* Step 2: 機器選択モーダル */}
      <AvailableEquipmentModal
        isOpen={isEquipmentModalOpen}
        onClose={onEquipmentModalClose}
        date={selectedDate}
        equipment={availableEquipment || []}
        isLoading={isLoadingEquipment}
        onProceed={handleEquipmentProceed}
        onBack={handleEquipmentBack}
        selectedCategoryIds={selectedCategoryIds}
        categories={categories || []}
        onCustomReserve={handleCustomReserve}
      />

      {/* Step 3: 機器確認モーダル */}
      <EquipmentConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={handleConfirmModalClose}
        equipment={selectedEquipmentList}
        selectedDate={selectedDate}
        onProceed={handleConfirmProceed}
        onBack={handleConfirmBack}
        customEquipmentName={customEquipmentName}
        onCustomEquipmentNameChange={handleCustomEquipmentNameChange}
      />

      {/* Step 4: 予約フォームモーダル */}
      <ReservationFormModal
        isOpen={isFormModalOpen}
        onClose={handleFormModalClose}
        equipment={selectedEquipmentList}
        selectedDate={selectedDate}
        onComplete={handleReservationComplete}
        onBack={handleFormBack}
        customEquipmentName={customEquipmentName}
        quantities={quantities}
      />

      <style>{`
        .fc-daygrid-day.past-date {
          background-color: #f7fafc;
          cursor: not-allowed;
        }
        .fc-daygrid-day.future-date {
          cursor: pointer;
        }
        .fc-daygrid-day.future-date:hover {
          background-color: #ebf8ff;
        }
        .fc-day-today {
          background-color: #bee3f8 !important;
        }
      `}</style>
    </Box>
  );
}
