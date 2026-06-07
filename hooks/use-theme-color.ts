/**
 * ============================================================================
 * MODULE: hooks/use-theme-color.ts
 * LAYER: Presentation / Core hooks Layer
 * DESCRIPTION: Selects active colors from context based on light/dark modes.
 * ============================================================================
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'light';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
