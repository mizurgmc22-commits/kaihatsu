import { useState, FormEvent } from 'react';
import {
  Box,
  Heading,
  Card,
  CardBody,
  FormControl,
  FormLabel,
  Input,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  VStack,
  useToast,
  Divider,
  Stack,
  Badge,
  Collapse,
  Flex
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  department: string;
  role: 'admin' | 'system_admin';
  lastLoginAt?: string;
  createdAt: string;
}

interface AdminForm {
  name: string;
  email: string;
  password: string;
  department: string;
}

const initialForm: AdminForm = {
  name: '',
  email: '',
  password: '',
  department: ''
};

const formatDate = (value?: string) => {
  if (!value) return '未ログイン';
  const date = new Date(value);
  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function AdminSettings() {
  const [formState, setFormState] = useState<AdminForm>(initialForm);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const adminsQuery = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const response = await apiClient.get<AdminUser[]>('/auth/admins');
      return response.data;
    }
  });

  const createAdminMutation = useMutation({
    mutationFn: async (data: AdminForm) => {
      const response = await apiClient.post('/auth/admins', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setFormState(initialForm);
      toast({
        title: '管理者を登録しました',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    },
    onError: (error: any) => {
      toast({
        title: '登録に失敗しました',
        description: error.response?.data?.message || '時間をおいて再度お試しください',
        status: 'error',
        duration: 4000,
        isClosable: true
      });
    }
  });

  const handleChange = (field: keyof AdminForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    createAdminMutation.mutate(formState);
  };

  const isSubmitDisabled =
    !formState.name || !formState.email || !formState.password || !formState.department;

  return (
    <Box>
      <Heading size="lg" mb={6}>
        システム設定
      </Heading>

      <Stack spacing={6}>
        <Card>
          <CardBody>
            <Stack spacing={4} divider={<Divider />}>
              <Flex align={{ base: 'stretch', md: 'center' }} justify="space-between" gap={4} flexDir={{ base: 'column', md: 'row' }}>
                <Box>
                  <Heading size="md">登録済み管理者</Heading>
                  <Text fontSize="sm" color="gray.600">
                    登録済みの管理者アカウント一覧です。
                  </Text>
                </Box>
                <Button
                  alignSelf={{ base: 'flex-start', md: 'center' }}
                  colorScheme="blue"
                  onClick={() => setIsFormOpen((prev) => !prev)}
                >
                  {isFormOpen ? '登録フォームを閉じる' : '管理者を追加'}
                </Button>
              </Flex>
              {adminsQuery.isLoading ? (
                <Text color="gray.500">読み込み中...</Text>
              ) : adminsQuery.isError ? (
                <Text color="red.500">一覧の取得に失敗しました。</Text>
              ) : adminsQuery.data?.length ? (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>氏名</Th>
                        <Th>メール</Th>
                        <Th>部署</Th>
                        <Th>権限</Th>
                        <Th>最終ログイン</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {adminsQuery.data.map((admin) => (
                        <Tr key={admin.id}>
                          <Td>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="semibold">{admin.name}</Text>
                              <Text fontSize="xs" color="gray.500">
                                登録日: {formatDate(admin.createdAt)}
                              </Text>
                            </VStack>
                          </Td>
                          <Td>{admin.email}</Td>
                          <Td>{admin.department}</Td>
                          <Td>
                            <Badge colorScheme={admin.role === 'system_admin' ? 'purple' : 'blue'}>
                              {admin.role === 'system_admin' ? 'システム管理者' : '管理者'}
                            </Badge>
                          </Td>
                          <Td>{formatDate(admin.lastLoginAt)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Text color="gray.500">登録済みの管理者がまだいません。</Text>
              )}
            </Stack>
          </CardBody>
        </Card>

        <Collapse in={isFormOpen} animateOpacity>
          <Card>
            <CardBody>
              <Heading size="md" mb={4}>
                管理者メールアドレス登録
              </Heading>
              <Text fontSize="sm" color="gray.600" mb={6}>
                管理権限を付与したい職員の情報を入力してください。
              </Text>
              <VStack as="form" spacing={4} align="stretch" onSubmit={handleSubmit}>
                <FormControl isRequired>
                  <FormLabel>氏名</FormLabel>
                  <Input value={formState.name} onChange={handleChange('name')} placeholder="例: 管理 太郎" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>メールアドレス</FormLabel>
                  <Input
                    type="email"
                    value={formState.email}
                    onChange={handleChange('email')}
                    placeholder="admin@example.com"
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>部署</FormLabel>
                  <Input value={formState.department} onChange={handleChange('department')} placeholder="例: 医療安全管理室" />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>初期パスワード</FormLabel>
                  <Input
                    type="password"
                    value={formState.password}
                    onChange={handleChange('password')}
                    placeholder="英数字8文字以上"
                  />
                </FormControl>
                <Button
                  type="submit"
                  colorScheme="blue"
                  width="full"
                  isDisabled={isSubmitDisabled}
                  isLoading={createAdminMutation.isPending}
                  loadingText="登録中"
                >
                  管理者を登録
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </Collapse>
      </Stack>
    </Box>
  );
}
