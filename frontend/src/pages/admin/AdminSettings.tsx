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
  const [deletingAdminId, setDeletingAdminId] = useState<number | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([
    {
      id: 1,
      name: '管理 太郎',
      email: 'admin@sazan-with.local',
      department: 'システム管理',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }
  ]);
  const [isLoadingAdmins] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();

  const handleChange = (field: keyof AdminForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    const newAdmin: AdminUser = {
      id: admins.length ? Math.max(...admins.map((a) => a.id)) + 1 : 1,
      name: formState.name,
      email: formState.email,
      department: formState.department,
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined
    };
    setAdmins((prev) => [...prev, newAdmin]);
    setFormState(initialForm);
    setIsSubmitting(false);
    toast({
      title: '管理者を登録しました（スタブ）',
      description: 'API連携前の仮データです。',
      status: 'success',
      duration: 3000,
      isClosable: true
    });
  };

  const handleDeleteAdmin = (admin: AdminUser) => {
    const confirmDelete = window.confirm(`${admin.name} さんを削除しますか？`);
    if (!confirmDelete) return;

    setDeletingAdminId(admin.id);
    setAdmins((prev) => prev.filter((a) => a.id !== admin.id));
    toast({
      title: '管理者を削除しました（スタブ）',
      description: 'API連携前の仮データです。',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
    setDeletingAdminId(null);
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
              {isLoadingAdmins ? (
                <Text color="gray.500">読み込み中...</Text>
              ) : admins.length ? (
                <Box overflowX="auto">
                  <Table size="sm">
                    <Thead>
                      <Tr>
                        <Th>氏名</Th>
                        <Th>メール</Th>
                        <Th>部署</Th>
                        <Th>権限</Th>
                        <Th>最終ログイン</Th>
                        <Th textAlign="right">操作</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {admins.map((admin) => (
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
                          <Td textAlign="right">
                            <Button
                              size="sm"
                              colorScheme="red"
                              variant="outline"
                              onClick={() => handleDeleteAdmin(admin)}
                              isLoading={deletingAdminId === admin.id}
                            >
                              削除
                            </Button>
                          </Td>
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
                  isLoading={isSubmitting}
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
