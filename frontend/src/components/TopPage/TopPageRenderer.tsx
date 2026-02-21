import { Link as RouterLink } from "react-router-dom";
import {
  Box,
  SimpleGrid,
  Flex,
  Heading,
  Text,
  Icon,
  HStack,
  VStack,
  Badge,
  Button,
  Grid,
  GridItem,
  Card,
  CardBody,
  Divider,
  Link,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  IconButton,
  Tooltip,
} from "@chakra-ui/react";
import {
  FiHome,
  FiFileText,
  FiExternalLink,
  FiInfo,
  FiBook,
  FiArrowRight,
  FiCalendar,
  FiClock,
  FiDownload,
  FiEdit2,
  FiTrash2,
  FiPlus,
} from "react-icons/fi";
import { type DashboardContent } from "../../api/topPageContent";

// デザイン定数
const THEME_COLOR = "#0091ea";
const DARK_BLUE = "#005b9f";
const ACCENT_COLOR = "#ff9800";

// 統計カードコンポーネント (Removed)

interface TopPageRendererProps {
  today: string;
  period: "today" | "month";
  setPeriod: (period: "today" | "month") => void;
  announcements: DashboardContent[];
  guides: DashboardContent[];
  flows: DashboardContent[];
  pdfs: DashboardContent[];
  links: DashboardContent[];
  todayReservations: any; // 型定義は別途調整
  formatDateTime: (dateStr: string) => string;
  getStatusBadge: (status: string) => JSX.Element;
  isEditable?: boolean;
  onEdit?: (content: DashboardContent) => void;
  onDelete?: (content: DashboardContent) => void;
  onAdd?: (type: DashboardContent["type"]) => void;
}

export default function TopPageRenderer({
  today,
  period,
  setPeriod,
  announcements,
  guides,
  flows,
  pdfs,
  links,
  todayReservations,
  formatDateTime,
  getStatusBadge,
  isEditable = false,
  onEdit,
  onDelete,
  onAdd,
}: TopPageRendererProps) {
  const EditControls = ({ content }: { content: DashboardContent }) => {
    if (!isEditable) return null;
    return (
      <HStack position="absolute" top={1} right={1} spacing={1} zIndex={10}>
        <Tooltip label="編集">
          <IconButton
            aria-label="編集"
            icon={<FiEdit2 />}
            size="xs"
            colorScheme="blue"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(content);
            }}
          />
        </Tooltip>
        <Tooltip label="削除">
          <IconButton
            aria-label="削除"
            icon={<FiTrash2 />}
            size="xs"
            colorScheme="red"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(content);
            }}
          />
        </Tooltip>
      </HStack>
    );
  };

  const AddButton = ({
    type,
    label,
  }: {
    type: DashboardContent["type"];
    label: string;
  }) => {
    if (!isEditable) return null;
    return (
      <Button
        size="sm"
        leftIcon={<FiPlus />}
        colorScheme="gray"
        variant="outline"
        onClick={() => onAdd?.(type)}
        w="full"
        borderStyle="dashed"
        mt={2}
      >
        {label}を追加
      </Button>
    );
  };

  return (
    <Box bg="#e0f2f1" minH="calc(100vh - 64px)" p={4}>
      {/* ヘッダー */}
      <Flex mb={4} justify="space-between" align="center" wrap="wrap" gap={4}>
        <HStack>
          <Icon as={FiHome} boxSize={6} color={DARK_BLUE} />
          <Heading size="lg" color={DARK_BLUE}>
            トップページ
          </Heading>
        </HStack>

        <Flex align="center" gap={3}>
          <HStack
            spacing={2}
            bg="white"
            p={1}
            borderRadius="full"
            boxShadow="sm"
          >
            <Button
              size="sm"
              colorScheme="blue"
              variant={period === "today" ? "solid" : "ghost"}
              borderRadius="full"
              onClick={() => setPeriod("today")}
              px={6}
            >
              今日
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              variant={period === "month" ? "solid" : "ghost"}
              borderRadius="full"
              onClick={() => setPeriod("month")}
              px={6}
            >
              今月
            </Button>
          </HStack>
          <Badge
            colorScheme="blue"
            fontSize="md"
            px={4}
            py={1}
            borderRadius="full"
          >
            {period === "today" ? today : `${new Date().getMonth() + 1}月`}
          </Badge>
        </Flex>
      </Flex>

      {/* 新規予約バナー */}
      <Box
        as={RouterLink}
        to="/calendar"
        display="block"
        mb={6}
        bgGradient="linear(to-r, #ff6d00, #ff9100)"
        borderRadius="xl"
        px={8}
        py={5}
        boxShadow="lg"
        _hover={{
          bgGradient: "linear(to-r, #e65100, #ff6d00)",
          transform: "translateY(-2px)",
          boxShadow: "xl",
        }}
        transition="all 0.2s"
        cursor="pointer"
        textDecoration="none"
      >
        <Flex align="center" justify="center" gap={4}>
          <Icon as={FiCalendar} boxSize={10} color="white" />
          <VStack spacing={0} align="start">
            <Text
              fontSize="2xl"
              fontWeight="extrabold"
              color="white"
              letterSpacing="wide"
            >
              新規予約
            </Text>
            <Text fontSize="sm" color="whiteAlpha.900">
              予約カレンダーを開いて日付を選択してください
            </Text>
          </VStack>
          <Icon as={FiArrowRight} boxSize={7} color="white" ml={2} />
        </Flex>
      </Box>

      <Grid
        templateColumns={{ base: "1fr", lg: "3fr 1fr" }}
        gap={6}
        alignItems="start"
      >
        {/* 左側メインエリア */}
        <GridItem>
          {/* 予約フロー & ガイド (カード形式) */}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mb={6}>
            {/* 予約フロー */}
            <Card
              borderTop={`4px solid ${DARK_BLUE}`}
              borderRadius="lg"
              boxShadow="md"
            >
              <CardBody>
                <Flex align="center" mb={3}>
                  <Icon as={FiArrowRight} color="blue.500" mr={2} />
                  <Heading size="sm" color="gray.700">
                    予約の流れ
                  </Heading>
                </Flex>
                <VStack align="stretch" spacing={3}>
                  {flows.length > 0 ? (
                    flows.map((item, index) => (
                      <HStack
                        key={item.id}
                        align="start"
                        spacing={3}
                        position="relative"
                        p={isEditable ? 2 : 0}
                        bg={isEditable ? "gray.50" : "transparent"}
                        borderRadius="md"
                        _hover={isEditable ? { bg: "gray.100" } : undefined}
                      >
                        <EditControls content={item} />
                        <Badge
                          colorScheme="blue"
                          borderRadius="full"
                          boxSize="20px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          {index + 1}
                        </Badge>
                        <Box>
                          <Text fontWeight="bold" fontSize="sm">
                            {item.title}
                          </Text>
                          {item.content && (
                            <Text fontSize="xs" color="gray.500">
                              {item.content}
                            </Text>
                          )}
                        </Box>
                      </HStack>
                    ))
                  ) : (
                    <Text fontSize="sm" color="gray.500">
                      情報がありません
                    </Text>
                  )}
                  <AddButton type="flow" label="予約フロー" />
                </VStack>
              </CardBody>
            </Card>

            {/* 資料ダウンロード & ガイド */}
            <Card
              borderTop={`4px solid ${ACCENT_COLOR}`}
              borderRadius="lg"
              boxShadow="md"
            >
              <CardBody>
                <Flex align="center" mb={3}>
                  <Icon as={FiDownload} color="orange.500" mr={2} />
                  <Heading size="sm" color="gray.700">
                    資料・ガイド
                  </Heading>
                </Flex>
                <VStack align="stretch" spacing={2}>
                  {pdfs.map((item) => (
                    <Box key={item.id} position="relative">
                      <EditControls content={item} />
                      <Button
                        as="a"
                        href={isEditable ? undefined : item.fileUrl || "#"}
                        target={isEditable ? undefined : "_blank"}
                        size="sm"
                        variant="outline"
                        colorScheme="blue"
                        leftIcon={<FiFileText />}
                        justifyContent="flex-start"
                        w="full"
                        pointerEvents={isEditable ? "none" : "auto"}
                        opacity={isEditable ? 0.7 : 1}
                      >
                        {item.title}
                      </Button>
                    </Box>
                  ))}
                  <AddButton type="pdf" label="PDF資料" />

                  <Divider my={1} />

                  {guides.map((item) => (
                    <Box
                      key={item.id}
                      position="relative"
                      p={isEditable ? 2 : 0}
                      bg={isEditable ? "gray.50" : "transparent"}
                      borderRadius="md"
                      _hover={isEditable ? { bg: "gray.100" } : undefined}
                    >
                      <EditControls content={item} />
                      <Text
                        fontWeight="bold"
                        fontSize="sm"
                        color="blue.600"
                        mb={1}
                      >
                        <Icon as={FiBook} mr={1} />
                        {item.title}
                      </Text>
                      <Text fontSize="xs" color="gray.600" noOfLines={2}>
                        {item.content}
                      </Text>
                    </Box>
                  ))}
                  <AddButton type="guide" label="使い方ガイド" />

                  {pdfs.length === 0 && guides.length === 0 && (
                    <Text fontSize="sm" color="gray.500">
                      資料がありません
                    </Text>
                  )}
                </VStack>
              </CardBody>
            </Card>
          </SimpleGrid>

          {/* 本日の予約テーブル */}
          <Card borderRadius="lg" boxShadow="md" overflow="hidden">
            <Box
              bg="white"
              px={4}
              py={3}
              borderBottom="1px solid"
              borderColor="gray.100"
            >
              <Heading size="sm" color="gray.700">
                本日の予約状況
              </Heading>
            </Box>
            <Box overflowX="auto">
              {todayReservations?.items.length === 0 ? (
                <Box p={6} textAlign="center">
                  <Text color="gray.500">本日の予約はありません</Text>
                </Box>
              ) : (
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr bg="gray.50">
                      <Th>時間</Th>
                      <Th>機材</Th>
                      <Th>部署</Th>
                      <Th>申請者</Th>
                      <Th>状態</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {todayReservations?.items.map((r: any) => (
                      <Tr key={r.id}>
                        <Td fontSize="sm">
                          {formatDateTime(r.startTime)}
                          <br />
                          {formatDateTime(r.endTime)}
                        </Td>
                        <Td fontWeight="medium">
                          {r.equipment?.name ||
                            r.customEquipmentName ||
                            "未設定"}
                        </Td>
                        <Td fontSize="sm">{r.department}</Td>
                        <Td fontSize="sm">{r.applicantName}</Td>
                        <Td>{getStatusBadge(r.status)}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Box>
          </Card>
        </GridItem>

        {/* 右側サイドパネル（お知らせ等） */}
        <GridItem>
          <Box
            bgGradient={`linear(to-b, ${THEME_COLOR}, ${DARK_BLUE})`}
            borderRadius="lg"
            p={5}
            color="white"
            boxShadow="lg"
            minH="400px"
          >
            <Flex align="center" mb={6} justify="center">
              <Icon as={FiInfo} w={6} h={6} mr={2} />
              <Heading size="md" letterSpacing="wide">
                SAZAN INFO
              </Heading>
            </Flex>

            <VStack
              spacing={6}
              align="stretch"
              divider={<Divider borderColor="whiteAlpha.400" />}
            >
              {/* 近況・お知らせ */}
              <Box>
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  opacity={0.8}
                  mb={2}
                  letterSpacing="wider"
                >
                  NEWS & TOPICS
                </Text>
                <VStack align="stretch" spacing={3}>
                  {announcements.length > 0 ? (
                    announcements.map((item) => (
                      <Box
                        key={item.id}
                        bg="whiteAlpha.200"
                        p={3}
                        borderRadius="md"
                        _hover={{ bg: "whiteAlpha.300", cursor: "pointer" }}
                        position="relative"
                      >
                        <EditControls content={item} />
                        <Text fontWeight="bold" fontSize="sm" mb={1}>
                          {item.title}
                        </Text>
                        <Text fontSize="xs" opacity={0.9} noOfLines={3}>
                          {item.content}
                        </Text>
                        <Text
                          fontSize="xs"
                          mt={2}
                          opacity={0.6}
                          textAlign="right"
                        >
                          {new Date(item.updatedAt).toLocaleDateString()}
                        </Text>
                      </Box>
                    ))
                  ) : (
                    <Text fontSize="sm" opacity={0.7}>
                      お知らせはありません
                    </Text>
                  )}
                  <AddButton type="announcement" label="お知らせ" />
                </VStack>
              </Box>

              {/* 関連リンク */}
              <Box>
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  opacity={0.8}
                  mb={2}
                  letterSpacing="wider"
                >
                  LINKS
                </Text>
                <VStack align="stretch" spacing={2}>
                  {links.length > 0 &&
                    links.map((item) => (
                      <Box key={item.id} position="relative">
                        <EditControls content={item} />
                        <Link
                          href={isEditable ? undefined : item.linkUrl || "#"}
                          isExternal={!isEditable}
                          fontSize="sm"
                          display="flex"
                          alignItems="center"
                          _hover={{ textDecoration: "none", opacity: 0.8 }}
                          pointerEvents={isEditable ? "none" : "auto"}
                        >
                          <Icon as={FiExternalLink} mr={2} />
                          {item.title}
                        </Link>
                      </Box>
                    ))}
                  <AddButton type="link" label="リンク" />
                </VStack>
              </Box>
            </VStack>
          </Box>
        </GridItem>
      </Grid>
    </Box>
  );
}
