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
  Divider
} from '@chakra-ui/react';
import type { AvailableEquipment } from '../../types/reservation';
import type { EquipmentCategory } from '../../types/equipment';

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
  categories
}: Props) {
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
            <VStack spacing={3} align="stretch">
              {equipment.map((item) => (
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
                  <Flex justify="space-between" align="start">
                    <Box flex="1">
                      <HStack mb={1}>
                        <Text fontWeight="bold">{item.name}</Text>
                        {getAvailabilityBadge(item)}
                      </HStack>
                      <Text fontSize="sm" color="gray.600">
                        {item.category?.name || '未分類'}
                      </Text>
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
              ))}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
