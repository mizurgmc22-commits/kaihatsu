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
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  VStack,
  Switch,
  FormHelperText,
  useToast
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createEquipment, updateEquipment, getCategories } from '../../api/equipment';
import type { Equipment, EquipmentInput } from '../../types/equipment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  isEditMode: boolean;
}

export default function EquipmentFormModal({ isOpen, onClose, equipment, isEditMode }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm<EquipmentInput>({
    defaultValues: {
      name: '',
      description: '',
      quantity: 1,
      location: '',
      categoryId: undefined,
      isActive: true
    }
  });

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // フォームリセット
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && equipment) {
        reset({
          name: equipment.name,
          description: equipment.description || '',
          quantity: equipment.quantity,
          location: equipment.location || '',
          categoryId: equipment.category?.id,
          isActive: equipment.isActive
        });
      } else {
        reset({
          name: '',
          description: '',
          quantity: 1,
          location: '',
          categoryId: undefined,
          isActive: true
        });
      }
    }
  }, [isOpen, isEditMode, equipment, reset]);

  // 作成処理
  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: '資機材を登録しました', status: 'success', duration: 3000 });
      onClose();
    },
    onError: () => {
      toast({ title: '登録に失敗しました', status: 'error', duration: 3000 });
    }
  });

  // 更新処理
  const updateMutation = useMutation({
    mutationFn: (data: EquipmentInput) => updateEquipment(equipment!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast({ title: '資機材を更新しました', status: 'success', duration: 3000 });
      onClose();
    },
    onError: () => {
      toast({ title: '更新に失敗しました', status: 'error', duration: 3000 });
    }
  });

  const onSubmit = (data: EquipmentInput) => {
    // categoryIdが空文字の場合はnullに変換
    const submitData = {
      ...data,
      categoryId: data.categoryId ? Number(data.categoryId) : null
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>{isEditMode ? '資機材編集' : '資機材登録'}</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel>名称</FormLabel>
                <Input
                  {...register('name', { required: '名称は必須です' })}
                  placeholder="例: AED"
                />
              </FormControl>

              <FormControl>
                <FormLabel>カテゴリ</FormLabel>
                <Select
                  {...register('categoryId')}
                  placeholder="カテゴリを選択"
                >
                  {categories?.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </FormControl>

              <FormControl isRequired isInvalid={!!errors.quantity}>
                <FormLabel>保有数</FormLabel>
                <Controller
                  name="quantity"
                  control={control}
                  rules={{ required: true, min: 0 }}
                  render={({ field }) => (
                    <NumberInput
                      min={0}
                      value={field.value}
                      onChange={(_, val) => field.onChange(val)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
              </FormControl>

              <FormControl>
                <FormLabel>保管場所</FormLabel>
                <Input
                  {...register('location')}
                  placeholder="例: 医療安全管理室"
                />
              </FormControl>

              <FormControl>
                <FormLabel>説明</FormLabel>
                <Textarea
                  {...register('description')}
                  placeholder="資機材の説明や注意事項"
                  rows={3}
                />
              </FormControl>

              {isEditMode && (
                <FormControl display="flex" alignItems="center">
                  <FormLabel mb={0}>有効</FormLabel>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <Switch
                        isChecked={field.value}
                        onChange={field.onChange}
                        colorScheme="green"
                      />
                    )}
                  />
                  <FormHelperText ml={2} mb={0}>
                    無効にすると予約できなくなります
                  </FormHelperText>
                </FormControl>
              )}
            </VStack>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              キャンセル
            </Button>
            <Button
              type="submit"
              colorScheme="blue"
              isLoading={isSubmitting || createMutation.isPending || updateMutation.isPending}
            >
              {isEditMode ? '更新' : '登録'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
