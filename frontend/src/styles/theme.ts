import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  fonts: {
    heading: 'Noto Sans JP, sans-serif',
    body: 'Noto Sans JP, sans-serif',
  },
  colors: {
    brand: {
      50: '#e6f7f7',
      100: '#b3e8e8',
      200: '#80d9d9',
      300: '#4dc9c9',
      400: '#26bdbd',
      500: '#00b0b0',
      600: '#00a3a3',
      700: '#009393',
      800: '#008383',
      900: '#006666',
    },
  },
  styles: {
    global: {
      body: {
        bg: 'gray.50',
      },
    },
  },
});

export default theme;