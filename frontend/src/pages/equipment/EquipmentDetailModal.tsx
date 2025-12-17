import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Badge,
  VStack,
  HStack,
  Text,
  Divider,
  Box,
  Image
} from '@chakra-ui/react';
import type { Equipment } from '../../types/equipment';
import { resolveEquipmentImage } from '../../constants/equipmentImageOverrides';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
}

export default function EquipmentDetailModal({ isOpen, onClose, equipment }: Props) {
  if (!equipment) return null;
  const imageSrc = resolveEquipmentImage(equipment.name, equipment.imageUrl);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          <HStack>
            <Text>{equipment.name}</Text>
            <Badge colorScheme={equipment.isActive ? 'green' : 'gray'}>
              {equipment.isActive ? '有効' : '無効'}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody pb={6}>
          <VStack align="stretch" spacing={4}>
            {imageSrc && (
              <Box>
                <Image
                  src={imageSrc}
                  alt={`${equipment.name}の画像`}
                  borderRadius="md"
                  maxH="250px"
                  objectFit="cover"
                  w="100%"
                />
              </Box>
            )}
            <Box>
              <Text fontWeight="bold" color="gray.600" fontSize="sm">
                カテゴリ
              </Text>
              <Text>{equipment.category?.name || '未分類'}</Text>
            </Box>

            <Divider />

            <HStack spacing={8}>
              <Box>
                <Text fontWeight="bold" color="gray.600" fontSize="sm">
                  保有数
                </Text>
                <Text fontSize="xl" fontWeight="bold">
                  {equipment.quantity}
                </Text>
              </Box>
              <Box>
                <Text fontWeight="bold" color="gray.600" fontSize="sm">
                  保管場所
                </Text>
                <Text>{equipment.location || '-'}</Text>
              </Box>
            </HStack>

            <Divider />

            <Box>
              <Text fontWeight="bold" color="gray.600" fontSize="sm">
                説明
              </Text>
              <Text whiteSpace="pre-wrap">
                {equipment.description || '説明なし'}
              </Text>
            </Box>

            {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
              <>
                <Divider />
                <Box>
                  <Text fontWeight="bold" color="gray.600" fontSize="sm" mb={2}>
                    仕様
                  </Text>
                  <VStack align="stretch" spacing={1}>
                    {Object.entries(equipment.specifications).map(([key, value]) => (
                      <HStack key={key} justify="space-between">
                        <Text color="gray.600">{key}</Text>
                        <Text>{String(value)}</Text>
                      </HStack>
                    ))}
                  </VStack>
                </Box>
              </>
            )}

            <Divider />

            <HStack justify="space-between" fontSize="sm" color="gray.500">
              <Text>作成日: {new Date(equipment.createdAt).toLocaleDateString('ja-JP')}</Text>
              <Text>更新日: {new Date(equipment.updatedAt).toLocaleDateString('ja-JP')}</Text>
            </HStack>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
