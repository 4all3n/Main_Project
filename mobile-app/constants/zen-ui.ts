/**
 * ZEN_PALETTE — now maps directly to Everforest Light/Dark colour tokens.
 * Kept for backward-compat with screens that still import it (insights, journal).
 * All glass / glow entries return transparent so they have zero visible effect.
 */
import { EverforestLight, EverforestDark } from './theme';

export const ZEN_PALETTE = {
  light: {
    // Legacy glass/glow — transparent so no effect
    glowA: 'transparent',
    glowB: 'transparent',
    glowC: 'transparent',
    glass: 'transparent',
    glassBorder: EverforestLight.bg3,
    heroStart: EverforestLight.blue,
    heroMid: EverforestLight.aqua,
    heroEnd: EverforestLight.bg0,

    // Text
    textSoft: EverforestLight.grey2,

    // Accents
    accentSteps:    '#3A94C5',
    accentBurn:     '#F57D26',
    accentDistance: '#35A77C',
    accentSleep:    '#DF69BA',
    accentHeart:    '#F85552',

    // Tab bar
    tabBg: EverforestLight.bg0,
  },
  dark: {
    glowA: 'transparent',
    glowB: 'transparent',
    glowC: 'transparent',
    glass: 'transparent',
    glassBorder: EverforestDark.bg4,
    heroStart: EverforestDark.blue,
    heroMid: EverforestDark.aqua,
    heroEnd: EverforestDark.bg1,

    textSoft: EverforestDark.grey1,

    accentSteps:    EverforestDark.blue,
    accentBurn:     EverforestDark.orange,
    accentDistance: EverforestDark.aqua,
    accentSleep:    EverforestDark.purple,
    accentHeart:    EverforestDark.red,

    tabBg: EverforestDark.bg0,
  },
};
