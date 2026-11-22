// Cerchietto con l'iniziale del nome, colorato in modo stabile per utente
import React from 'react';
import { View } from 'react-native';
import { Text } from './Typo';
import { userColor } from '../theme';

export default function Avatar({ id, name, size = 32 }) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: userColor(id),
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.45 }}>{initial}</Text>
    </View>
  );
}
