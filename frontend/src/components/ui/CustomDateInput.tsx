import { forwardRef } from "react";
import { InputGroup, Input, InputRightElement, Icon } from "@chakra-ui/react";
import { FiCalendar } from "react-icons/fi";

interface CustomInputProps {
  value?: string;
  onClick?: () => void;
  placeholder?: string;
}

export const CustomDateInput = forwardRef<HTMLInputElement, CustomInputProps>(
  ({ value, onClick, placeholder }, ref) => (
    <InputGroup>
      <Input
        ref={ref}
        value={value}
        onClick={onClick}
        placeholder={placeholder}
        readOnly
        borderRadius="lg"
        cursor="pointer"
        bg="white"
      />
      <InputRightElement>
        <Icon as={FiCalendar} color="gray.400" />
      </InputRightElement>
    </InputGroup>
  )
);
CustomDateInput.displayName = "CustomDateInput";
