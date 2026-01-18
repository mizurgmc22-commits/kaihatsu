import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  useToast,
  Text,
  Container,
  Alert,
  AlertIcon,
  Link,
} from "@chakra-ui/react";
import { useAuth } from "../../contexts/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const toast = useToast();
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      console.log("Login successful, Navigating to /admin...");
      toast({
        title: "ログインに成功しました",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "ログインに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={20}>
      <Container maxW="md">
        <Box p={8} bg="white" rounded="lg" shadow="lg">
          <Heading as="h1" size="lg" mb={6} textAlign="center">
            管理者ログイン
          </Heading>

          {error && (
            <Alert status="error" mb={4} borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl id="email" isRequired>
                <FormLabel>メールアドレス</FormLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </FormControl>
              <FormControl id="password" isRequired>
                <FormLabel>パスワード</FormLabel>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                />
              </FormControl>
              <Button
                type="submit"
                colorScheme="blue"
                width="100%"
                mt={4}
                isLoading={isLoading}
                loadingText="ログイン中..."
              >
                ログイン
              </Button>
            </VStack>
          </form>

          <Text mt={6} textAlign="center" fontSize="sm" color="gray.500">
            ユーザー向け予約画面は{" "}
            <Link href="/" color="blue.500">
              こちら
            </Link>
          </Text>
        </Box>
      </Container>
    </Box>
  );
};

export default Login;
