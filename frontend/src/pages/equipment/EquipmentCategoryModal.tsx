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
  VStack,
  List,
  ListItem,
  Text,
  useToast,
  Spinner
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCategories, createCategory } from '../../api/equipment';
import type { EquipmentCategory, CategoryInput } from '../../types/equipment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function EquipmentCategoryModal({ isOpen, onClose }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<CategoryInput>({
    defaultValues: {
      name: '',
      description: ''
    }
  });

  const { data: categories, isLoading } = useQuery<EquipmentCategory[]>({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'カテゴリを追加しました', status: 'success', duration: 3000 });
      reset({ name: '', description: '' });
    },
    onError: () => {
      toast({ title: 'カテゴリの追加に失敗しました', status: 'error', duration: 3000 });
    }
  });

  const onSubmit = (data: CategoryInput) => {
    createMutation.mutate(data);
  };

  const handleClose = () => {
    reset({ name: '', description: '' });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>カテゴリ管理</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel>既存カテゴリ</FormLabel>
              {isLoading ? (
                <Spinner />
              ) : (
                <List spacing={2} maxH="200px" overflowY="auto" borderWidth="1px" borderRadius="md" p={2}>
                  {categories && categories.length > 0 ? (
                    categories.map((cat) => (
                      <ListItem key={cat.id}>
                        <Text fontWeight="medium">{cat.name}</Text>
                        {cat.description && (
                          <Text fontSize="sm" color="gray.600">{cat.description}</Text>
                        )}
                      </ListItem>
                    ))
                  ) : (
                    <Text color="gray.500">カテゴリが登録されていません</Text>
                  )}
                </List>
              )}
            </FormControl>

            <form onSubmit={handleSubmit(onSubmit)}>
              <VStack align="stretch" spacing={3}>
                <FormControl isRequired>
                  <FormLabel>カテゴリ名</FormLabel>
                  <Input
                    {...register('name', { required: true })}
                    placeholder="例: 蘇生トレーニング資機材"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>説明</FormLabel>
                  <Textarea
                    {...register('description')}
                    placeholder="カテゴリの説明（任意）"
                    rows={2}
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={isSubmitting || createMutation.isPending}
                  alignSelf="flex-end"
                >
                  追加
                </Button>
              </VStack>
            </form>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            閉じる
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
