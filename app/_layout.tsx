/**
 * ============================================================================
 * MODULE: app/_layout.tsx
 * LAYER: Presentation / Core Root Layer
 * DESCRIPTION: Root entry point layout for the Expo application. Imports CSS
 *              global settings and runs initialization side-effects.
 * ============================================================================
 */

import '@/global.css';
import '@/services/backgroundLocation';
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
