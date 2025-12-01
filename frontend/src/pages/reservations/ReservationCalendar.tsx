import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Heading,
  Flex,
  Select,
  useDisclosure,
  Spinner,
  Text,
  HStack,
  Badge
} from '@chakra-ui/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCategories } from '../../api/equipment';
import { getAvailableEquipment, getCalendarEvents, type CalendarEvent } from '../../api/reservation';
import type { AvailableEquipment } from '../../types/reservation';
import AvailableEquipmentModal from './AvailableEquipmentModal';
import ReservationFormModal from './ReservationFormModal';

export default function ReservationCalendar() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [selectedEquipment, setSelectedEquipment] = useState<AvailableEquipment | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const calendarRef = useRef<FullCalendar>(null);
  const queryClient = useQueryClient();

  const {
    isOpen: isEquipmentModalOpen,
    onOpen: onEquipmentModalOpen,
    onClose: onEquipmentModalClose
  } = useDisclosure();

  const {
    isOpen: isFormModalOpen,
    onOpen: onFormModalOpen,
    onClose: onFormModalClose
  } = useDisclosure();

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // 選択日の予約可能機器取得
  const { data: availableEquipment, isLoading: isLoadingEquipment } = useQuery({
    queryKey: ['availableEquipment', selectedDate, categoryFilter],
    queryFn: () =>
      getAvailableEquipment(
        selectedDate!,
        categoryFilter ? Number(categoryFilter) : undefined
      ),
    enabled: !!selectedDate
  });

  // カレンダーイベント取得
  const { data: calendarEvents } = useQuery({
    queryKey: ['calendarEvents', dateRange?.start, dateRange?.end],
    queryFn: () => getCalendarEvents(dateRange!.start, dateRange!.end),
    enabled: !!dateRange
  });

  // カレンダーの日付範囲変更時
  const handleDatesSet = useCallback((dateInfo: { startStr: string; endStr: string }) => {
    setDateRange({ start: dateInfo.startStr, end: dateInfo.endStr });
  }, []);

  // 日付クリック時
  const handleDateClick = useCallback((info: { dateStr: string }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const clickedDate = new Date(info.dateStr);

    // 過去の日付は選択不可
    if (clickedDate < today) {
      return;
    }

    setSelectedDate(info.dateStr);
    onEquipmentModalOpen();
  }, [onEquipmentModalOpen]);

  // 機器選択時
  const handleEquipmentSelect = (equipment: AvailableEquipment) => {
    setSelectedEquipment(equipment);
    onEquipmentModalClose();
    onFormModalOpen();
  };

  // 予約完了時
  const handleReservationComplete = () => {
    onFormModalClose();
    setSelectedEquipment(null);
    // カレンダーイベントを再取得
    queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">予約カレンダー</Heading>
        <HStack spacing={4}>
          <Select
            aria-label="カテゴリフィルタ"
            title="カテゴリフィルタ"
            placeholder="カテゴリで絞り込み"
            maxW="200px"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            bg="white"
          >
            {categories?.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </HStack>
      </Flex>

      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        <HStack mb={4} spacing={4}>
          <Badge colorScheme="green" px={2} py={1}>予約可能</Badge>
          <Badge colorScheme="yellow" px={2} py={1}>残りわずか</Badge>
          <Badge colorScheme="gray" px={2} py={1}>過去の日付</Badge>
        </HStack>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ja"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
          buttonText={{
            today: '今日',
            month: '月',
            week: '週'
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
              return ['past-date'];
            }
            return ['future-date'];
          }}
        />
      </Box>

      {/* 予約可能機器モーダル */}
      <AvailableEquipmentModal
        isOpen={isEquipmentModalOpen}
        onClose={onEquipmentModalClose}
        date={selectedDate}
        equipment={availableEquipment || []}
        isLoading={isLoadingEquipment}
        onSelect={handleEquipmentSelect}
        categoryFilter={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories || []}
      />

      {/* 予約フォームモーダル */}
      <ReservationFormModal
        isOpen={isFormModalOpen}
        onClose={onFormModalClose}
        equipment={selectedEquipment}
        selectedDate={selectedDate}
        onComplete={handleReservationComplete}
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
