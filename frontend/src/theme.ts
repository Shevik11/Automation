import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  colors: {
    brand: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    accent: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#e5e5e5',
      300: '#d4d4d4',
      400: '#a3a3a3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
  },
  styles: {
    global: {
      'html, body': {
        bg: '#f8fafc',
        color: 'gray.800',
      },
      '*::selection': {
        bg: 'brand.100',
        color: 'brand.900',
      },
    },
  },
  shadows: {
    card: '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    cardHover: '0 10px 25px -5px rgba(239, 68, 68, 0.15), 0 8px 10px -6px rgba(239, 68, 68, 0.1)',
    soft: '0 2px 8px -2px rgba(0, 0, 0, 0.08)',
    glow: '0 0 20px rgba(239, 68, 68, 0.15)',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'xl',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      variants: {
        brand: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
            transform: 'translateY(-1px)',
            shadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          },
          _active: {
            bg: 'brand.700',
            transform: 'translateY(0)',
          },
        },
        brandOutline: {
          bg: 'transparent',
          color: 'brand.600',
          border: '1.5px solid',
          borderColor: 'brand.200',
          _hover: {
            bg: 'brand.50',
            borderColor: 'brand.400',
            transform: 'translateY(-1px)',
          },
          _active: {
            bg: 'brand.100',
            transform: 'translateY(0)',
          },
        },
        ghost: {
          _hover: {
            bg: 'gray.100',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '2xl',
          border: '1px solid',
          borderColor: 'gray.100',
          bg: 'white',
          shadow: 'card',
          overflow: 'hidden',
        },
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          field: {
            borderRadius: 'xl',
            borderColor: 'gray.200',
            _hover: {
              borderColor: 'gray.300',
            },
            _focus: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        },
      },
    },
    Textarea: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: {
          borderRadius: 'xl',
          borderColor: 'gray.200',
          _hover: {
            borderColor: 'gray.300',
          },
          _focus: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '2xl',
          shadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        },
        overlay: {
          bg: 'blackAlpha.600',
          backdropFilter: 'blur(4px)',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '600',
        textTransform: 'capitalize',
      },
    },
    Tabs: {
      variants: {
        line: {
          tab: {
            _selected: {
              color: 'brand.600',
              borderColor: 'brand.500',
            },
          },
        },
      },
    },
    Table: {
      variants: {
        simple: {
          th: {
            borderColor: 'gray.200',
            fontWeight: '600',
            textTransform: 'none',
            letterSpacing: 'normal',
            fontSize: 'xs',
            color: 'gray.500',
          },
          td: {
            borderColor: 'gray.100',
          },
        },
      },
    },
    Tooltip: {
      baseStyle: {
        borderRadius: 'lg',
        px: 3,
        py: 2,
        fontSize: 'sm',
        bg: 'gray.800',
        shadow: 'lg',
      },
    },
  },
});

export default theme;
