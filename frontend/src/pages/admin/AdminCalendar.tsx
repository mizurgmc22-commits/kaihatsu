import { useState, useCallback, useRef } from 'react';
import {
  Box,
  Heading,
  Flex,
  Select,
  HStack,
  Badge,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Text,
  Button,
  useToast,
  Spinner
} from '@chakra-ui/react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCalendarEvents,
  type CalendarEvent,
  updateReservation
} from '../../api/reservation';
import { ReservationStatus } from '../../types/reservation';

export default function AdminCalendar() {
  const [currentView, setCurrentView] = useState<'dayGridMonth' | 'timeGridWeek' | 'timeGridDay'>('dayGridMonth');
  const [dateRange, setDateRange] = useState<{ start: string; end: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendarEvents', 'admin', dateRange?.start, dateRange?.end],
    queryFn: () => getCalendarEvents(dateRange!.start, dateRange!.end),
    enabled: !!dateRange
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ReservationStatus }) =>
      updateReservation(id, { status } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarEvents'] });
      toast({
        title: '予約を更新しました',
        status: 'success',
        duration: 2000
      });
      onClose();
      setSelectedEvent(null);
    },
    onError: () => {
      toast({
        title: '更新に失敗しました',
        status: 'error',
        duration: 3000
      });
    }
  });

  const handleDatesSet = useCallback((dateInfo: { startStr: string; endStr: string }) => {
    setDateRange({ start: dateInfo.startStr, end: dateInfo.endStr });
  }, []);

  const handleEventClick = useCallback((clickInfo: any) => {
    const event: CalendarEvent = clickInfo.event.extendedProps.fullData || {
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      extendedProps: clickInfo.event.extendedProps,
      backgroundColor: clickInfo.event.backgroundColor,
      borderColor: clickInfo.event.borderColor
    };
    setSelectedEvent(event);
    onOpen();
  }, [onOpen]);

  const handleApprove = () => {
    if (!selectedEvent) return;
    updateMutation.mutate({ id: Number(selectedEvent.id), status: ReservationStatus.APPROVED });
  };

  const handleReject = () => {
    if (!selectedEvent) return;
    updateMutation.mutate({ id: Number(selectedEvent.id), status: ReservationStatus.REJECTED });
  };

  const handleViewChange = (view: 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay') => {
    setCurrentView(view);
    const calendarApi = calendarRef.current?.getApi();
    calendarApi?.changeView(view);
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">管理カレンダー</Heading>
        <HStack spacing={3}>
          <Select
            aria-label="カレンダービュー切り替え"
            title="カレンダービュー切り替え"
            value={currentView}
            onChange={(e) => handleViewChange(e.target.value as 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay')}
            maxW="200px"
            bg="white"
          >
            <option value="dayGridMonth">月表示</option>
            <option value="timeGridWeek">週表示</option>
            <option value="timeGridDay">日表示</option>
          </Select>
        </HStack>
      </Flex>

      <Box bg="white" p={4} borderRadius="md" shadow="sm">
        <HStack mb={4} spacing={4}>
          <Badge colorScheme="yellow">承認待ち</Badge>
          <Badge colorScheme="green">承認済み</Badge>
          <Badge colorScheme="red">却下</Badge>
          <Badge colorScheme="gray">キャンセル</Badge>
        </HStack>

        {isLoading && !events ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : (
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView={currentView}
            locale="ja"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{
              today: '今日',
              month: '月',
              week: '週',
              day: '日'
            }}
            height="auto"
            events={events || []}
            datesSet={handleDatesSet}
            eventClick={handleEventClick}
          />
        )}
      </Box>

      <Modal isOpen={isOpen && !!selectedEvent} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>予約詳細</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {selectedEvent && (
              <Box>
                <Text fontWeight="bold" mb={2}>
                  {selectedEvent.title}
                </Text>
                <Text fontSize="sm" mb={1}>
                  機材: {selectedEvent.extendedProps.equipmentName}
                </Text>
                <Text fontSize="sm" mb={1}>
                  部署: {selectedEvent.extendedProps.department}
                </Text>
                <Text fontSize="sm" mb={1}>
                  申請者: {selectedEvent.extendedProps.applicantName}
                </Text>
                <Text fontSize="sm" mb={1}>
                  数量: {selectedEvent.extendedProps.quantity}
                </Text>
                <Text fontSize="sm" mb={1}>
                  期間: {selectedEvent.start} 〜 {selectedEvent.end}
                </Text>
                <Text fontSize="sm" mb={1}>
                  ステータス: {selectedEvent.extendedProps.status}
                </Text>
              </Box>
            )}
          </ModalBody>
          <ModalFooter>
            {selectedEvent && selectedEvent.extendedProps.status === ReservationStatus.PENDING && (
              <HStack spacing={3}>
                <Button
                  colorScheme="green"
                  onClick={handleApprove}
                  isLoading={updateMutation.isPending}
                >
                  承認
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleReject}
                  isLoading={updateMutation.isPending}
                >
                  却下
                </Button>
              </HStack>
            )}
            <Button ml={3} variant="ghost" onClick={onClose}>
              閉じる
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
