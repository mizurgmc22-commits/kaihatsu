import { Box, Heading, Text, HStack, Icon } from "@chakra-ui/react";
import { IconType } from "react-icons";

interface PageHeaderProps {
  title: string;
  description: string;
  icon?: IconType;
}

export default function PageHeader({
  title,
  description,
  icon,
}: PageHeaderProps) {
  return (
    <Box mb={6}>
      <HStack spacing={3} mb={2}>
        {icon && <Icon as={icon} boxSize={6} color="blue.500" />}
        <Heading as="h1" size="lg">
          {title}
        </Heading>
      </HStack>
      <Text color="gray.600" fontSize="md">
        {description}
      </Text>
    </Box>
  );
}
