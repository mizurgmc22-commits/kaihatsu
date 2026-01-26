import { useEffect, useState } from "react";
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
  useToast,
  Image,
  Checkbox,
  Text,
  Box,
} from "@chakra-ui/react";
import { useForm, Controller } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createEquipment,
  updateEquipment,
  getCategories,
  convertGoogleDriveUrl,
} from "../../api/equipment";
import type { Equipment, EquipmentInput } from "../../types/equipment";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  equipment: Equipment | null;
  isEditMode: boolean;
}

export default function EquipmentFormModal({
  isOpen,
  onClose,
  equipment,
  isEditMode,
}: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EquipmentInput>({
    defaultValues: {
      name: "",
      description: "",
      quantity: 1,
      location: "",
      categoryId: undefined,
      isActive: true,
      imageUrl: "",
      removeImage: false,
    },
  });

  const watchImageUrl = watch("imageUrl");

  // カテゴリ一覧取得
  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });

  // フォームリセット
  useEffect(() => {
    if (isOpen) {
      if (isEditMode && equipment) {
        reset({
          name: equipment.name,
          description: equipment.description || "",
          quantity: equipment.quantity,
          location: equipment.location || "",
          categoryId: equipment.category?.id,
          isActive: equipment.isActive,
          imageUrl: equipment.imageUrl || "",
          removeImage: false,
        });
        setPreviewUrl(equipment.imageUrl || null);
      } else {
        reset({
          name: "",
          description: "",
          quantity: 1,
          location: "",
          categoryId: undefined,
          isActive: true,
          imageUrl: "",
          removeImage: false,
        });
        setPreviewUrl(null);
      }
    }
  }, [isOpen, isEditMode, equipment, reset]);

  // 画像URLプレビュー更新
  useEffect(() => {
    if (watchImageUrl) {
      const converted = convertGoogleDriveUrl(watchImageUrl);
      setPreviewUrl(converted);
    } else if (!isEditMode || !equipment?.imageUrl) {
      setPreviewUrl(null);
    }
  }, [watchImageUrl, isEditMode, equipment]);

  const buildFormData = (data: EquipmentInput) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("quantity", String(data.quantity));

    if (data.description) {
      formData.append("description", data.description);
    }
    if (data.location) {
      formData.append("location", data.location);
    }
    if (data.categoryId !== undefined && data.categoryId !== null) {
      formData.append("categoryId", String(data.categoryId));
    } else if (data.categoryId === null) {
      formData.append("categoryId", "");
    }
    if (typeof data.isActive === "boolean") {
      formData.append("isActive", String(data.isActive));
    }
    if (data.specifications) {
      formData.append("specifications", JSON.stringify(data.specifications));
    }
    // Google Drive画像URL
    if (data.imageUrl !== undefined) {
      formData.append("imageUrl", data.imageUrl || "");
    }
    if (data.removeImage) {
      formData.append("removeImage", "true");
    }

    return formData;
  };

  // 作成処理
  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "資機材を登録しました",
        status: "success",
        duration: 3000,
      });
      onClose();
    },
    onError: () => {
      toast({ title: "登録に失敗しました", status: "error", duration: 3000 });
    },
  });

  // 更新処理
  const updateMutation = useMutation({
    mutationFn: (data: FormData) => updateEquipment(equipment!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      toast({
        title: "資機材を更新しました",
        status: "success",
        duration: 3000,
      });
      onClose();
    },
    onError: () => {
      toast({ title: "更新に失敗しました", status: "error", duration: 3000 });
    },
  });

  const onSubmit = (data: EquipmentInput) => {
    const normalizedCategoryId =
      data.categoryId === undefined ? undefined : data.categoryId || null;

    const formData = buildFormData({
      ...data,
      categoryId: normalizedCategoryId,
    });

    if (isEditMode) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ModalHeader>{isEditMode ? "資機材編集" : "資機材登録"}</ModalHeader>
          <ModalCloseButton />

          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired isInvalid={!!errors.name}>
                <FormLabel>名称</FormLabel>
                <Input
                  {...register("name", { required: "名称は必須です" })}
                  placeholder="例: AED"
                />
              </FormControl>

              <FormControl>
                <FormLabel>カテゴリ</FormLabel>
                <Select
                  {...register("categoryId")}
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
                  {...register("location")}
                  placeholder="例: 医療安全管理室"
                />
              </FormControl>

              <FormControl>
                <FormLabel>説明</FormLabel>
                <Textarea
                  {...register("description")}
                  placeholder="資機材の説明や注意事項"
                  rows={3}
                />
              </FormControl>

              <FormControl>
                <FormLabel>画像URL（Google Drive）</FormLabel>
                <Textarea
                  {...register("imageUrl")}
                  placeholder="Google Drive共有URLまたはファイルID"
                  rows={2}
                  fontSize="sm"
                  fontFamily="monospace"
                  resize="vertical"
                />
                <FormHelperText>
                  Google
                  Driveで「リンクを知っている全員が閲覧可」に設定した画像のURLを入力
                </FormHelperText>
                {previewUrl && (
                  <VStack align="flex-start" spacing={2} mt={3} w="100%">
                    <Box
                      borderRadius="md"
                      overflow="hidden"
                      border="1px solid"
                      borderColor="gray.200"
                    >
                      <Image
                        src={previewUrl}
                        alt="資機材画像プレビュー"
                        maxH="200px"
                        objectFit="cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </Box>
                    <Text fontSize="xs" color="gray.500">
                      プレビュー（共有設定が正しくない場合は表示されません）
                    </Text>
                    {isEditMode && equipment?.imageUrl && (
                      <Checkbox {...register("removeImage")}>
                        画像URLを削除する
                      </Checkbox>
                    )}
                  </VStack>
                )}
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
              isLoading={
                isSubmitting ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {isEditMode ? "更新" : "登録"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
