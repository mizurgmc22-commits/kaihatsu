import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Heading,
  Flex,
  Button,
  HStack,
  Text,
  Spinner,
  Tooltip,
  Grid,
  GridItem,
  Badge,
  IconButton,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { getCalendarEvents, type CalendarEvent } from "../../api/reservation";
import { getEquipmentList } from "../../api/equipment";
import type { Equipment } from "../../types/equipment";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  max as dateMax,
  min as dateMin,
  parseISO,
  startOfMonth,
} from "date-fns";

interface TimelineEvent extends CalendarEvent {
  laneIndex: number;
}

interface EquipmentTimeline {
  equipmentName: string;
  events: TimelineEvent[];
  laneCount: number;
  categoryName: string;
  maxUnits: number;
  reservationCount: number;
}

interface EquipmentCategoryGroup {
  categoryName: string;
  equipments: EquipmentTimeline[];
}

const statusColorMap: Record<string, string> = {
  pending: "#F6C343",
  approved: "#36B37E",
  rejected: "#E55353",
  cancelled: "#94A3B8",
  completed: "#5B8DEF",
};

const CATEGORY_DISPLAY_ORDER = [
  "蘇生講習資機材",
  "トレーニング資機材",
  "機械類",
  "消耗品",
  "その他",
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  蘇生講習資機材: "#5B8DEF",
  トレーニング資機材: "#44C4A1",
  機械類: "#E76A8A",
  消耗品: "#F6C343",
  その他: "#94A3B8",
};

const DEFAULT_CATEGORY_NAME = "その他";
const DEFAULT_CATEGORY_COLOR = "#94A3B8";

const LEFT_COL_WIDTH = 240;
const DAY_CELL_WIDTH = 56;
const LANE_HEIGHT = 40;
const TRACK_VERTICAL_PADDING = 24;
const TIMELINE_SCROLLBAR_HEIGHT = 14;
const DATE_HEADER_HEIGHT = 56;

const weekdayFormatter = new Intl.DateTimeFormat("ja-JP", { weekday: "short" });

const hexToRgba = (hex: string, alpha = 1) => {
  const sanitized = hex.replace("#", "");
  const bigint = parseInt(sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function AdminGantt() {
  const [currentMonth, setCurrentMonth] = useState(() =>
    startOfMonth(new Date()),
  );
  const topScrollRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  const monthStart = currentMonth;
  const monthEnd = useMemo(() => endOfMonth(currentMonth), [currentMonth]);
  const timelineDays = useMemo(
    () => eachDayOfInterval({ start: monthStart, end: monthEnd }),
    [monthStart, monthEnd],
  );

  const { data: events, isLoading } = useQuery({
    queryKey: ["ganttEvents", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () =>
      getCalendarEvents(monthStart.toISOString(), monthEnd.toISOString()),
  });

  const { data: equipmentData, isLoading: isEquipmentLoading } = useQuery({
    queryKey: ["equipment", "gantt-view"],
    queryFn: () => getEquipmentList(),
  });

  const eventsByEquipment = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    (events || []).forEach((event) => {
      const key = event.extendedProps.equipmentName || DEFAULT_CATEGORY_NAME;
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    });
    return map;
  }, [events]);

  const assignLanes = (
    list: CalendarEvent[],
  ): { events: TimelineEvent[]; laneCount: number } => {
    if (!list.length) {
      return { events: [], laneCount: 1 };
    }

    const expandedEvents = list.flatMap((event) => {
      const quantity = Math.max(Number(event.extendedProps?.quantity) || 1, 1);
      if (quantity <= 1) {
        return [event];
      }
      return Array.from({ length: quantity }, (_, idx) => ({
        ...event,
        id: `${event.id}-unit-${idx + 1}`,
      }));
    });

    const sorted = expandedEvents
      .slice()
      .sort(
        (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime(),
      );

    const laneEndTimes: number[] = [];
    const eventsWithLane: TimelineEvent[] = sorted.map((event) => {
      const startTime = parseISO(event.start).getTime();
      const endTime = parseISO(event.end).getTime();

      let laneIndex = laneEndTimes.findIndex((end) => end <= startTime);
      if (laneIndex === -1) {
        laneIndex = laneEndTimes.length;
        laneEndTimes.push(endTime);
      } else {
        laneEndTimes[laneIndex] = endTime;
      }

      return { ...event, laneIndex };
    });

    return {
      events: eventsWithLane,
      laneCount: Math.max(laneEndTimes.length, 1),
    };
  };

  const categoryGroups = useMemo<EquipmentCategoryGroup[]>(() => {
    const groups = new Map<string, EquipmentTimeline[]>();
    const remainingEvents = new Map(eventsByEquipment);

    const equipments = equipmentData?.items ?? [];
    const ensureGroup = (categoryName: string) => {
      if (!groups.has(categoryName)) {
        groups.set(categoryName, []);
      }
      return groups.get(categoryName)!;
    };

    equipments.forEach((equipment: Equipment) => {
      const categoryName = equipment.category?.name || DEFAULT_CATEGORY_NAME;
      const equipmentName = equipment.name;
      const eventList = remainingEvents.get(equipmentName) ?? [];
      const { events: timelineEvents, laneCount } = assignLanes(eventList);
      ensureGroup(categoryName).push({
        equipmentName,
        events: timelineEvents,
        laneCount,
        categoryName,
        maxUnits: Math.max(equipment.quantity ?? 1, 1),
        reservationCount: eventList.length,
      });
      remainingEvents.delete(equipmentName);
    });

    remainingEvents.forEach((list, equipmentName) => {
      const { events: timelineEvents, laneCount } = assignLanes(list);
      ensureGroup(DEFAULT_CATEGORY_NAME).push({
        equipmentName,
        events: timelineEvents,
        laneCount,
        categoryName: DEFAULT_CATEGORY_NAME,
        maxUnits: 1,
        reservationCount: list.length,
      });
    });

    return Array.from(groups.entries())
      .sort((a, b) => {
        const indexA = CATEGORY_DISPLAY_ORDER.indexOf(a[0]);
        const indexB = CATEGORY_DISPLAY_ORDER.indexOf(b[0]);
        const orderA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
        const orderB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;
        if (orderA !== orderB) return orderA - orderB;
        return a[0].localeCompare(b[0], "ja");
      })
      .map(([categoryName, equipments]) => ({
        categoryName,
        equipments: equipments.sort((a, b) =>
          a.equipmentName.localeCompare(b.equipmentName, "ja"),
        ),
      }));
  }, [equipmentData, eventsByEquipment]);

  const flatTimelines = useMemo(
    () => categoryGroups.flatMap((group) => group.equipments),
    [categoryGroups],
  );

  const equipmentColorMap = useMemo(() => {
    const map = new Map<string, string>();
    flatTimelines.forEach((timeline) => {
      const categoryColor =
        CATEGORY_COLOR_MAP[timeline.categoryName] ?? DEFAULT_CATEGORY_COLOR;
      map.set(timeline.equipmentName, categoryColor);
    });
    return map;
  }, [flatTimelines]);

  const totalDuration = monthEnd.getTime() - monthStart.getTime();
  const timelineTrackWidth = timelineDays.length * DAY_CELL_WIDTH;
  const timelineContainerWidth = LEFT_COL_WIDTH + timelineTrackWidth;
  const today = new Date();
  const isTodayInRange = today >= monthStart && today <= monthEnd;
  const todayLeft = isTodayInRange
    ? ((today.getTime() - monthStart.getTime()) / totalDuration) * 100
    : null;

  const getBarPosition = (event: CalendarEvent) => {
    const rawStart = parseISO(event.start);
    const rawEnd = parseISO(event.end);
    const boundedStart = dateMax([rawStart, monthStart]);
    const boundedEnd = dateMin([rawEnd, monthEnd]);

    if (boundedEnd <= boundedStart || totalDuration <= 0) {
      return { left: 0, width: 0 };
    }

    const left =
      ((boundedStart.getTime() - monthStart.getTime()) / totalDuration) * 100;
    const width =
      ((boundedEnd.getTime() - boundedStart.getTime()) / totalDuration) * 100;

    return {
      left: Math.max(0, left),
      width: Math.max(width, 1),
    };
  };

  const handleMonthChange = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => addMonths(prev, direction === "prev" ? -1 : 1));
  };

  const handleResetToToday = () => {
    setCurrentMonth(startOfMonth(new Date()));
  };

  useEffect(() => {
    const top = topScrollRef.current;
    const main = mainScrollRef.current;
    if (!top || !main) return;

    let isSyncing = false;

    const sync = (source: HTMLDivElement, target: HTMLDivElement) => () => {
      if (isSyncing) return;
      isSyncing = true;
      target.scrollLeft = source.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    const handleTop = sync(top, main);
    const handleMain = sync(main, top);
    top.addEventListener("scroll", handleTop, { passive: true });
    main.addEventListener("scroll", handleMain, { passive: true });

    return () => {
      top.removeEventListener("scroll", handleTop);
      main.removeEventListener("scroll", handleMain);
    };
  }, [timelineContainerWidth]);

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">機器ガントチャート</Heading>
        <HStack spacing={2}>
          <IconButton
            aria-label="前月"
            icon={<FiChevronLeft />}
            size="sm"
            variant="ghost"
            onClick={() => handleMonthChange("prev")}
          />
          <Box
            textAlign="center"
            px={4}
            py={2}
            bg="white"
            borderRadius="md"
            shadow="sm"
          >
            <Text fontSize="sm" color="gray.500">
              {format(monthStart, "yyyy年")}
            </Text>
            <Text fontWeight="bold" fontSize="lg">
              {format(monthStart, "M月")}
            </Text>
          </Box>
          <IconButton
            aria-label="次月"
            icon={<FiChevronRight />}
            size="sm"
            variant="ghost"
            onClick={() => handleMonthChange("next")}
          />
          <Button variant="ghost" size="sm" onClick={handleResetToToday}>
            今日へ
          </Button>
        </HStack>
      </Flex>

      <Box bg="white" p={5} borderRadius="2xl" shadow="lg">
        <Flex mb={4} gap={4} flexWrap="wrap">
          <Legend color={statusColorMap.pending} label="承認待ち" />
          <Legend color={statusColorMap.approved} label="承認済み" />
          <Legend color={statusColorMap.rejected} label="却下" />
          <Legend color={statusColorMap.cancelled} label="キャンセル" />
          <Legend color={statusColorMap.completed} label="完了" />
        </Flex>

        {isLoading || isEquipmentLoading ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : flatTimelines.length === 0 ? (
          <Flex justify="center" py={10}>
            <Text color="gray.500">該当期間の予約データがありません。</Text>
          </Flex>
        ) : (
          <Flex>
            {/* 左カラム: 機器情報（固定） */}
            <Box flex={`0 0 ${LEFT_COL_WIDTH}px`} mr={4}>
              {/* ヘッダスペーサー */}
              <Box h="12px" mb={2} />
              <Box h="52px" mb={3} display="flex" alignItems="center">
                <Text fontSize="sm" color="gray.500" pl={2}>
                  機器
                </Text>
              </Box>

              {/* カテゴリ・機器リスト */}
              {categoryGroups.map(({ categoryName, equipments }) => (
                <Box key={`left-${categoryName}`} mb={6}>
                  <Box display="flex" flexDirection="column" gap={4}>
                    {equipments.map(
                      ({
                        equipmentName,
                        laneCount,
                        maxUnits,
                        reservationCount,
                      }) => {
                        const accent =
                          equipmentColorMap.get(equipmentName) ??
                          DEFAULT_CATEGORY_COLOR;
                        const trackHeight =
                          laneCount * LANE_HEIGHT + TRACK_VERTICAL_PADDING;
                        return (
                          <Box
                            key={`left-${categoryName}-${equipmentName}`}
                            borderRadius="xl"
                            bg={hexToRgba(accent, 0.08)}
                            borderLeftWidth="4px"
                            borderColor={accent}
                            p={3}
                            height={`${trackHeight}px`}
                            display="flex"
                            flexDirection="column"
                            justifyContent="center"
                          >
                            <Text
                              fontWeight="semibold"
                              color="gray.800"
                              mb={1}
                              noOfLines={1}
                            >
                              {equipmentName}
                            </Text>
                            <Text fontSize="xs" color="gray.500">
                              予約 {reservationCount} 件 / 保有数 {maxUnits} 台
                            </Text>
                          </Box>
                        );
                      },
                    )}
                  </Box>
                </Box>
              ))}
            </Box>

            {/* 右カラム: タイムライン（横スクロール） */}
            <Box flex="1" overflow="hidden">
              {/* 上部スクロールバー */}
              <Box
                ref={topScrollRef}
                overflowX="auto"
                h="12px"
                mb={2}
                borderRadius="full"
                bg="gray.100"
              >
                <Box minW={`${timelineTrackWidth}px`} h="4px" />
              </Box>

              {/* メインスクロールエリア */}
              <Box ref={mainScrollRef} overflowX="auto">
                <Box minW={`${timelineTrackWidth}px`}>
                  {/* 日付ヘッダ */}
                  <Flex
                    borderRadius="lg"
                    overflow="hidden"
                    border="1px solid"
                    borderColor="gray.200"
                    mb={3}
                  >
                    {timelineDays.map((day) => {
                      const isWeekend =
                        day.getDay() === 0 || day.getDay() === 6;
                      return (
                        <Box
                          key={day.toISOString()}
                          w={`${DAY_CELL_WIDTH}px`}
                          flex="0 0 auto"
                          textAlign="center"
                          py={2}
                          bg={isWeekend ? "gray.50" : "white"}
                        >
                          <Text
                            fontSize="xs"
                            fontWeight="semibold"
                            color={isWeekend ? "red.400" : "gray.700"}
                          >
                            {format(day, "d")}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            {weekdayFormatter.format(day)}
                          </Text>
                        </Box>
                      );
                    })}
                  </Flex>

                  {/* カテゴリ・タイムライン */}
                  {categoryGroups.map(({ categoryName, equipments }) => (
                    <Box key={`timeline-${categoryName}`} mb={6}>
                      <Box display="flex" flexDirection="column" gap={4}>
                        {equipments.map(
                          ({
                            equipmentName,
                            events: equipmentEvents,
                            laneCount,
                          }) => {
                            const accent =
                              equipmentColorMap.get(equipmentName) ??
                              DEFAULT_CATEGORY_COLOR;
                            const trackHeight =
                              laneCount * LANE_HEIGHT + TRACK_VERTICAL_PADDING;
                            const trackBg = `repeating-linear-gradient(to right, rgba(226,232,240,0.6) 0px, rgba(226,232,240,0.6) 1px, transparent 1px, transparent ${DAY_CELL_WIDTH}px)`;
                            return (
                              <Box
                                key={`timeline-${categoryName}-${equipmentName}`}
                                position="relative"
                                height={`${trackHeight}px`}
                                borderRadius="xl"
                                bg="white"
                                border="1px solid"
                                borderColor="gray.200"
                                overflow="hidden"
                                px={2}
                                pt={3}
                                pb={2}
                                style={{ backgroundImage: trackBg }}
                              >
                                {isTodayInRange && todayLeft !== null && (
                                  <Box
                                    position="absolute"
                                    top="6px"
                                    bottom="6px"
                                    left={`calc(${todayLeft}% - 1px)`}
                                    width="2px"
                                    bg="red.400"
                                    borderRadius="full"
                                  />
                                )}
                                {equipmentEvents.map((event) => {
                                  const { left, width } = getBarPosition(event);
                                  const statusColor =
                                    statusColorMap[
                                      event.extendedProps.status
                                    ] || accent;
                                  const topOffset =
                                    12 + event.laneIndex * LANE_HEIGHT;
                                  return (
                                    <Tooltip
                                      key={`${equipmentName}-${event.id}`}
                                      label={
                                        <Box>
                                          <Text fontWeight="bold" mb={1}>
                                            {event.title}
                                          </Text>
                                          <Text fontSize="xs">
                                            部署:{" "}
                                            {event.extendedProps.department}
                                          </Text>
                                          <Text fontSize="xs">
                                            数量: {event.extendedProps.quantity}
                                          </Text>
                                          <Text fontSize="xs">
                                            {format(
                                              parseISO(event.start),
                                              "M/d HH:mm",
                                            )}{" "}
                                            -{" "}
                                            {format(
                                              parseISO(event.end),
                                              "M/d HH:mm",
                                            )}
                                          </Text>
                                        </Box>
                                      }
                                    >
                                      <Box
                                        position="absolute"
                                        top={`${topOffset}px`}
                                        left={`${left}%`}
                                        width={`${width}%`}
                                        minW="64px"
                                        height="34px"
                                        borderRadius="full"
                                        bg={hexToRgba(statusColor, 0.9)}
                                        boxShadow="0 6px 20px rgba(15, 23, 42, 0.15)"
                                        display="flex"
                                        alignItems="center"
                                        px={3}
                                        color="white"
                                        fontSize="xs"
                                        fontWeight="bold"
                                        overflow="hidden"
                                        whiteSpace="nowrap"
                                        textOverflow="ellipsis"
                                        border="1px solid"
                                        borderColor={hexToRgba(
                                          statusColor,
                                          0.3,
                                        )}
                                      >
                                        <HStack
                                          spacing={2}
                                          align="center"
                                          width="100%"
                                        >
                                          <Badge
                                            bg="white"
                                            color={statusColor}
                                            fontSize="0.65rem"
                                            px={2}
                                            borderRadius="full"
                                            fontWeight="bold"
                                          >
                                            {event.laneIndex + 1}
                                          </Badge>
                                          <Text flex="1" noOfLines={1}>
                                            {event.extendedProps.department}
                                          </Text>
                                        </HStack>
                                      </Box>
                                    </Tooltip>
                                  );
                                })}
                              </Box>
                            );
                          },
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          </Flex>
        )}
      </Box>
    </Box>
  );
}

interface LegendProps {
  color: string;
  label: string;
}

function Legend({ color, label }: LegendProps) {
  return (
    <HStack spacing={2}>
      <Badge w="12px" h="12px" borderRadius="full" bg={color} />
      <Text fontSize="sm">{label}</Text>
    </HStack>
  );
}
