/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#3A94C5'; // blue
const tintColorDark = '#7FBBB3'; // blue

export const EverforestLight = {
  bg_dim: '#F2EFDF',
  bg0: '#FFFBEF',
  bg1: '#F8F5E4',
  bg2: '#F2EFDF',
  bg3: '#EDEADA',
  bg4: '#E8E5D5',
  bg5: '#BEC5B2',
  fg: '#5C6A72',
  bg_red: '#FFE7DE',
  bg_green: '#F3F5D9',
  bg_blue: '#ECF5ED',
  bg_purple: '#FCECED',
  bg_yellow: '#FEF2D5',
  bg_visual: '#F0F2D4',
  red: '#F85552',
  yellow: '#DFA000',
  green: '#8DA101',
  blue: '#3A94C5',
  purple: '#DF69BA',
  aqua: '#35A77C',
  orange: '#F57D26',
  grey0: '#A6B0A0',
  grey1: '#939F91',
  grey2: '#829181',
  statusline1: '#93B259',
  statusline2: '#708089',
  statusline3: '#E66868',
};

export const EverforestDark = {
  bg_dim: '#1E2326',
  bg0: '#272E33',
  bg1: '#2E383C',
  bg2: '#374145',
  bg3: '#414B50',
  bg4: '#495156',
  bg5: '#4F5B58',
  fg: '#D3C6AA',
  bg_red: '#493B40',
  bg_green: '#3C4841',
  bg_blue: '#384B55',
  bg_purple: '#463F48',
  bg_yellow: '#45443C',
  bg_visual: '#4C3743',
  red: '#E67E80',
  yellow: '#DBBC7F',
  green: '#A7C080',
  blue: '#7FBBB3',
  purple: '#D699B6',
  aqua: '#83C092',
  orange: '#E69875',
  grey0: '#7A8478',
  grey1: '#859289',
  grey2: '#9DA9A0',
  statusline1: '#A7C080',
  statusline2: '#D3C6AA',
  statusline3: '#E67E80',
};

export const Colors = {
  light: {
    text: EverforestLight.fg,
    background: EverforestLight.bg_dim,
    tint: tintColorLight,
    icon: EverforestLight.grey1,
    tabIconDefault: EverforestLight.grey1,
    tabIconSelected: tintColorLight,
    ...EverforestLight,
  },
  dark: {
    text: EverforestDark.fg,
    background: EverforestDark.bg_dim,
    tint: tintColorDark,
    icon: EverforestDark.grey1,
    tabIconDefault: EverforestDark.grey1,
    tabIconSelected: tintColorDark,
    ...EverforestDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
