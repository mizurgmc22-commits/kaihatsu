import { useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  useToast,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createReservation } from '../../api/reservation';
import type { AvailableEquipment } from '../../types/reservation';
import type { ReservationInput } from '../../types/reservation';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: AvailableEquipment | null;
  selectedDate: string | null;
  onComplete: () => void;
}

interface FormData {
  department: string;
  applicantName: string;
  contactInfo: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  quantity: number;
  purpose: string;
  location: string;
  notes: string;
}

export default function ReservationFormModal({
  isOpen,
  onClose,
  equipment,
  selectedDate,
  onComplete
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      department: '',
      applicantName: '',
      contactInfo: '',
      startDate: '',
      startTime: '09:00',
      endDate: '',
      endTime: '18:00',
      quantity: 1,
      purpose: '',
      location: '',
      notes: ''
    }
  });

  const watchQuantity = watch('quantity');
  const watchEndDate = watch('endDate');

  // フォームリセット
  useEffect(() => {
    if (isOpen && selectedDate) {
      reset({
        department: '',
        applicantName: '',
        contactInfo: '',
        startDate: selectedDate,
        startTime: '09:00',
        endDate: selectedDate,
        endTime: '18:00',
        quantity: 1,
        purpose: '',
        location: '',
        notes: ''
      });
    }
  }, [isOpen, selectedDate, reset]);

  // 予約作成
  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['availableEquipment'] });
      toast({
        title: '予約を登録しました',
        description: '予約が正常に作成されました。',
        status: 'success',
        duration: 3000
      });
      onComplete();
    },
    onError: (error: any) => {
      toast({
        title: '予約に失敗しました',
        description: error.response?.data?.message || 'エラーが発生しました',
        status: 'error',
        duration: 5000
      });
    }
  });

  const onSubmit = (data: FormData) => {
    if (!equipment) return;

    const reservationData: ReservationInput = {
      equipmentId: equipment.id,
      department: data.department,
      applicantName: data.applicantName,
      contactInfo: data.contactInfo,
      startTime: `${data.startDate}T${data.startTime}:00`,
      endTime: `${data.endDate}T${data.endTime}:00`,
      quantity: data.quantity,
      purpose: data.purpose || undefined,
      location: data.location || undefined,
      notes: data.notes || undefined
    };

    createMutation.mutate(reservationData);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!equipment) return null;

  // 無制限の場合は数量超過チェックをスキップ
  const isQuantityExceeded = !equipment.isUnlimited && watchQuantity > equipment.remainingQuantity;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>予約登録</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4} align="stretch">
              {/* 機器情報 */}
              <Box p={4} bg="blue.50" borderRadius="md">
                <HStack justify="space-between">
                  <Box>
                    <Text fontWeight="bold" fontSize="lg">
                      {equipment.name}
                    </Text>
                    <Text fontSize="sm" color="gray.600">
                      {equipment.category?.name || '未分類'}
                    </Text>
                  </Box>
                  {!equipment.isUnlimited && (
                    <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                      残り {equipment.remainingQuantity}
                    </Badge>
                  )}
                </HStack>
              </Box>

              {/* 申請者情報 */}
              <FormControl isRequired>
                <FormLabel>部署</FormLabel>
                <Input
                  {...register('department', { required: '部署は必須です' })}
                  placeholder="例: 看護部"
                />
              </FormControl>

              <HStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>氏名</FormLabel>
                  <Input
                    {...register('applicantName', { required: '氏名は必須です' })}
                    placeholder="例: 山田 太郎"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>連絡先（内線/PHS）</FormLabel>
                  <Input
                    {...register('contactInfo', { required: '連絡先は必須です' })}
                    placeholder="例: 内線1234 / PHS 5678"
                  />
                </FormControl>
              </HStack>

              {/* 利用期間 */}
              <HStack spacing={4}>
                <FormControl isRequired flex={2}>
                  <FormLabel>利用開始日</FormLabel>
                  <Input
                    type="date"
                    {...register('startDate', { required: '開始日は必須です' })}
                  />
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel>開始時間</FormLabel>
                  <Select {...register('startTime', { required: true })}>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = String(i).padStart(2, '0');
                      return (
                        <option key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </option>
                      );
                    })}
                  </Select>
                </FormControl>
              </HStack>

              <HStack spacing={4}>
                <FormControl isRequired flex={2}>
                  <FormLabel>利用終了日</FormLabel>
                  <Input
                    type="date"
                    {...register('endDate', { required: '終了日は必須です' })}
                  />
                </FormControl>
                <FormControl isRequired flex={1}>
                  <FormLabel>終了時間</FormLabel>
                  <Select {...register('endTime', { required: true })}>
                    {Array.from({ length: 24 }, (_, i) => {
                      const hour = String(i).padStart(2, '0');
                      return (
                        <option key={hour} value={`${hour}:00`}>
                          {hour}:00
                        </option>
                      );
                    })}
                  </Select>
                </FormControl>
              </HStack>

              {/* 数量 */}
              <FormControl isRequired isInvalid={isQuantityExceeded}>
                <FormLabel>数量</FormLabel>
                <Controller
                  name="quantity"
                  control={control}
                  rules={{
                    required: true,
                    min: 1,
                    max: equipment.isUnlimited ? undefined : equipment.remainingQuantity
                  }}
                  render={({ field }) => (
                    <NumberInput
                      min={1}
                      max={equipment.isUnlimited ? undefined : equipment.remainingQuantity}
                      value={field.value}
                      onChange={(_, val) => field.onChange(val || 1)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
                {isQuantityExceeded && (
                  <Alert status="error" mt={2} size="sm">
                    <AlertIcon />
                    予約可能数を超えています（最大: {equipment.remainingQuantity}）
                  </Alert>
                )}
              </FormControl>

              {/* 利用目的 */}
              <FormControl>
                <FormLabel>利用目的</FormLabel>
                <Textarea
                  {...register('purpose')}
                  placeholder="例: 新人研修でのCPR訓練"
                  rows={2}
                />
              </FormControl>

              {/* 利用場所 */}
              <FormControl>
                <FormLabel>利用場所</FormLabel>
                <Input
                  {...register('location')}
                  placeholder="例: 3階 研修室A"
                />
              </FormControl>

              {/* 備考 */}
              <FormControl>
                <FormLabel>備考</FormLabel>
                <Textarea
                  {...register('notes')}
                  placeholder="その他連絡事項があれば記入してください"
                  rows={2}
                />
              </FormControl>
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              キャンセル
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={createMutation.isPending}
              isDisabled={isQuantityExceeded}
            >
              予約する
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
