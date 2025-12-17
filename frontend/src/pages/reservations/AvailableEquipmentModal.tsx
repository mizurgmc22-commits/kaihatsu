import { useMemo, useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Box,
  Text,
  Badge,
  Button,
  Select,
  Spinner,
  Flex,
  Divider,
  Input,
  FormControl,
  FormLabel,
  Image
} from '@chakra-ui/react';
import type { AvailableEquipment } from '../../types/reservation';
import type { EquipmentCategory } from '../../types/equipment';
import { resolveEquipmentImage } from '../../constants/equipmentImageOverrides';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  equipment: AvailableEquipment[];
  isLoading: boolean;
  onSelect: (equipment: AvailableEquipment) => void;
  categoryFilter: string;
  onCategoryChange: (value: string) => void;
  categories: EquipmentCategory[];
  onCustomReserve: (name: string) => void;
}

export default function AvailableEquipmentModal({
  isOpen,
  onClose,
  date,
  equipment,
  isLoading,
  onSelect,
  categoryFilter,
  onCategoryChange,
  categories,
  onCustomReserve
}: Props) {
  const [customName, setCustomName] = useState('');
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  };

  const getAvailabilityBadge = (item: AvailableEquipment) => {
    if (!item.isAvailable) {
      return <Badge colorScheme="red">予約不可</Badge>;
    }
    // 無制限の場合は予約可能のみ表示
    if (item.isUnlimited) {
      return <Badge colorScheme="green">予約可能</Badge>;
    }
    if (item.remainingQuantity <= 2) {
      return <Badge colorScheme="yellow">残り{item.remainingQuantity}</Badge>;
    }
    return <Badge colorScheme="green">予約可能（残り{item.remainingQuantity}）</Badge>;
  };

  const CATEGORY_ORDER = ['蘇生講習資機材', 'トレーニング資機材', '機械類', '消耗品', 'その他'];

  const groupedEquipment = useMemo(() => {
    const map: Record<string, AvailableEquipment[]> = {};
    equipment.forEach((item) => {
      const key = item.category?.name || '未分類';
      if (!map[key]) {
        map[key] = [];
      }
      map[key].push(item);
    });
    return map;
  }, [equipment]);

  const orderedCategoryNames = useMemo(() => {
    const present = Object.keys(groupedEquipment);
    const ordered = CATEGORY_ORDER.filter((name) => present.includes(name));
    const rest = present.filter((name) => !CATEGORY_ORDER.includes(name)).sort((a, b) => a.localeCompare(b, 'ja'));
    return [...ordered, ...rest];
  }, [groupedEquipment]);

  const handleCustomReserve = () => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    onCustomReserve(trimmed);
    setCustomName('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="80vh">
        <ModalHeader>
          <Text>{formatDate(date)} の予約可能機器</Text>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <Box mb={4}>
            <Select
              aria-label="カテゴリフィルタ"
              title="カテゴリフィルタ"
              placeholder="すべてのカテゴリ"
              value={categoryFilter}
              onChange={(e) => onCategoryChange(e.target.value)}
              size="sm"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </Select>
          </Box>

          <Divider mb={4} />

          {isLoading ? (
            <Flex justify="center" py={10}>
              <Spinner size="lg" />
            </Flex>
          ) : equipment.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={10}>
              予約可能な機器がありません
            </Text>
          ) : (
            <VStack spacing={6} align="stretch">
              {orderedCategoryNames.map((categoryName) => (
                <Box key={categoryName}>
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold">{categoryName}</Text>
                    <Badge colorScheme="blue">{groupedEquipment[categoryName]?.length ?? 0} 件</Badge>
                  </HStack>
                  <VStack spacing={3} align="stretch">
                    {groupedEquipment[categoryName]?.map((item) => {
                      const imageSrc = resolveEquipmentImage(item.name, item.imageUrl);
                      return (
                        <Box
                          key={item.id}
                          p={4}
                          borderWidth="1px"
                          borderRadius="md"
                          bg={item.isAvailable ? 'white' : 'gray.50'}
                          opacity={item.isAvailable ? 1 : 0.7}
                          _hover={item.isAvailable ? { borderColor: 'blue.300', shadow: 'sm' } : {}}
                          transition="all 0.2s"
                        >
                          <Flex justify="space-between" align="start" gap={4}>
                            {imageSrc && (
                              <Image
                                src={imageSrc}
                                alt={`${item.name}の画像`}
                                boxSize="64px"
                                objectFit="cover"
                                borderRadius="md"
                                backgroundColor="white"
                              />
                            )}
                            <Box flex="1">
                              <HStack mb={1}>
                                <Text fontWeight="bold">{item.name}</Text>
                                {getAvailabilityBadge(item)}
                              </HStack>
                              {item.location && (
                                <Text fontSize="sm" color="gray.500">
                                  保管場所: {item.location}
                                </Text>
                              )}
                              {!item.isUnlimited && (
                                <Text fontSize="sm" color="gray.500">
                                  保有数: {item.quantity} / 残り: {item.remainingQuantity}
                                </Text>
                              )}
                            </Box>
                            <Button
                              colorScheme="blue"
                              size="sm"
                              isDisabled={!item.isAvailable}
                              onClick={() => onSelect(item)}
                            >
                              予約する
                            </Button>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                </Box>
              ))}

              <Box borderWidth="1px" borderRadius="md" p={4} bg="gray.50">
                <FormControl>
                  <FormLabel fontWeight="bold">その他の機器を予約する</FormLabel>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    予約したい機器名を直接入力してください。
                  </Text>
                  <HStack spacing={3} align="flex-end">
                    <Input
                      placeholder="例: 新規トレーニング機器"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                    />
                    <Button colorScheme="blue" onClick={handleCustomReserve} isDisabled={!customName.trim()}>
                      予約する
                    </Button>
                  </HStack>
                </FormControl>
              </Box>
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
