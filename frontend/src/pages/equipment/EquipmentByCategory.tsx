import { useMemo } from "react";
import {
  Box,
  Heading,
  VStack,
  Text,
  Badge,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Spinner,
  Flex,
  Divider,
} from "@chakra-ui/react";
import { useQuery } from "@tanstack/react-query";
import { getEquipmentList } from "../../api/equipment";
import type { Equipment } from "../../types/equipment";

import { CATEGORY_SORT_ORDER } from "../../constants/category";

export default function EquipmentByCategory() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment", { view: "by-category" }],
    queryFn: () => getEquipmentList(),
  });

  const grouped = useMemo(() => {
    const map: Record<string, Equipment[]> = {};
    (data?.items || []).forEach((e) => {
      const name = e.category?.name || "その他";
      if (!map[name]) map[name] = [];
      map[name].push(e);
    });
    return map;
  }, [data]);

  if (error) {
    return <Text color="red.500">エラーが発生しました</Text>;
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        資機材カテゴリ別一覧
      </Heading>

      {isLoading && !data ? (
        <Flex justify="center" py={10}>
          <Spinner size="lg" />
        </Flex>
      ) : (
        <Box bg="white" p={4} borderRadius="md" shadow="sm">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>名称</Th>
                <Th isNumeric>保有数</Th>
                <Th>保管場所</Th>
                <Th>状態</Th>
              </Tr>
            </Thead>
            <Tbody>
              {CATEGORY_SORT_ORDER.map((catName) => {
                const items = grouped[catName] || [];
                if (items.length === 0) return null;

                return (
                  <>
                    <Tr key={`header-${catName}`} bg="gray.50">
                      <Td colSpan={4}>
                        <Flex align="center" justify="space-between">
                          <Box fontWeight="bold">{catName}</Box>
                          <Badge colorScheme="blue">{items.length} 件</Badge>
                        </Flex>
                      </Td>
                    </Tr>
                    {items.map((e) => (
                      <Tr key={e.id}>
                        <Td fontWeight="medium">{e.name}</Td>
                        <Td isNumeric>{e.quantity}</Td>
                        <Td>{e.location || "-"}</Td>
                        <Td>
                          <Badge colorScheme={e.isActive ? "green" : "gray"}>
                            {e.isActive ? "有効" : "無効"}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </>
                );
              })}

              {/* ORDER にないカテゴリ（将来追加されたもの） */}
              {Object.entries(grouped)
                .filter(([name]) => !CATEGORY_SORT_ORDER.includes(name))
                .map(([name, items]) => (
                  <>
                    <Tr key={`header-${name}`} bg="gray.50">
                      <Td colSpan={4}>
                        <Flex align="center" justify="space-between">
                          <Box fontWeight="bold">{name}</Box>
                          <Badge colorScheme="blue">{items.length} 件</Badge>
                        </Flex>
                      </Td>
                    </Tr>
                    {items.map((e) => (
                      <Tr key={e.id}>
                        <Td fontWeight="medium">{e.name}</Td>
                        <Td isNumeric>{e.quantity}</Td>
                        <Td>{e.location || "-"}</Td>
                        <Td>
                          <Badge colorScheme={e.isActive ? "green" : "gray"}>
                            {e.isActive ? "有効" : "無効"}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </>
                ))}
            </Tbody>
          </Table>

          {data && data.items.length === 0 && (
            <Text mt={4} color="gray.500">
              資機材が登録されていません
            </Text>
          )}
        </Box>
      )}
    </Box>
  );
}
