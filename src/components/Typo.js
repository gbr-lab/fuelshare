// Text e TextInput con il font Inter: il peso (fontWeight) negli stili
// viene tradotto automaticamente nel file di font corretto.
import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet } from 'react-native';
import { fonts } from '../theme';

const WEIGHT_MAP = {
  normal: '400', bold: '700',
  '100': '400', '200': '400', '300': '400', '400': '400',
  '500': '500', '600': '600', '700': '700', '800': '800', '900': '800',
};

function fontStyle(style) {
  const flat = StyleSheet.flatten(style) || {};
  const w = WEIGHT_MAP[String(flat.fontWeight || '400')] || '400';
  return { fontFamily: fonts[w], fontWeight: 'normal' };
}

export const Text = React.forwardRef(function Text({ style, ...rest }, ref) {
  return <RNText ref={ref} {...rest} style={[style, fontStyle(style)]} />;
});

export const TextInput = React.forwardRef(function TextInput({ style, ...rest }, ref) {
  return <RNTextInput ref={ref} {...rest} style={[style, fontStyle(style)]} />;
});
