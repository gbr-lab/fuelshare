import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import PagerView from 'react-native-pager-view';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import {
  useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
} from '@expo-google-fonts/inter';

import { AppProvider, useApp } from './src/context/AppContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { Text } from './src/components/Typo';
import { fonts } from './src/theme';

import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import RecoveryCodeScreen from './src/screens/RecoveryCodeScreen';
import OverviewScreen from './src/screens/OverviewScreen';
import FillUpScreen from './src/screens/FillUpScreen';
import GarageScreen from './src/screens/GarageScreen';
import ServiceScreen from './src/screens/ServiceScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import AddVehicleScreen from './src/screens/AddVehicleScreen';
import AddTripScreen from './src/screens/AddTripScreen';
import AddRefuelScreen from './src/screens/AddRefuelScreen';
import SelectiveClearScreen from './src/screens/SelectiveClearScreen';

const AuthStack = createNativeStackNavigator();
const MainStack = createNativeStackNavigator();

// Le 4 sezioni principali: si cambiano con lo swipe oppure toccando la barra in basso
const TABS = [
  { key: 'Overview', title: 'Overview', icon: 'speedometer-outline', iconActive: 'speedometer', Component: OverviewScreen },
  { key: 'FillUp', title: 'Fill-up', icon: 'water-outline', iconActive: 'water', Component: FillUpScreen },
  { key: 'Garage', title: 'Garage', icon: 'car-sport-outline', iconActive: 'car-sport', Component: GarageScreen },
  { key: 'Service', title: 'Service', icon: 'construct-outline', iconActive: 'construct', Component: ServiceScreen },
];

function MainTabs({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const pagerRef = useRef(null);
  const [page, setPage] = useState(0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.headerTitle}>{TABS[page].title}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="person-circle-outline" size={30} color={colors.accentText} />
        </TouchableOpacity>
      </View>

      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setPage(e.nativeEvent.position)}
      >
        {TABS.map(({ key, Component }) => (
          <View key={key} collapsable={false} style={{ flex: 1 }}>
            <Component navigation={navigation} />
          </View>
        ))}
      </PagerView>

      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {TABS.map((t, i) => {
          const active = i === page;
          return (
            <TouchableOpacity key={t.key} style={styles.barItem} onPress={() => pagerRef.current?.setPage(i)} activeOpacity={0.7}>
              <Ionicons name={active ? t.iconActive : t.icon} size={22} color={active ? colors.accentText : colors.textMuted} />
              <Text style={[styles.barLabel, active && { color: colors.accentText, fontWeight: '700' }]}>{t.title}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// Link di invito: fuelshare://join/CODICE
function DeepLinkHandler() {
  const { user, doJoinByCode } = useApp();
  useEffect(() => {
    if (!user) return;
    const handle = (url) => {
      const match = url && url.match(/join\/([A-Z0-9]+)/i);
      if (!match) return;
      const code = match[1].toUpperCase();
      Alert.alert('Veicolo condiviso', `Vuoi unirti al veicolo con codice ${code}?`, [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Unisciti', onPress: () => { try { doJoinByCode(code); } catch (e) { Alert.alert('Errore', e.message); } } },
      ]);
    };
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    Linking.getInitialURL().then(handle).catch(() => {});
    return () => sub.remove();
  }, [user]);
  return null;
}

function MainApp() {
  const { colors } = useTheme();
  return (
    <MainStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text, fontFamily: fonts['700'] },
        headerTintColor: colors.accentText,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <MainStack.Screen name="Tabs" component={MainTabs} options={{ headerShown: false }} />
      <MainStack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Profilo e impostazioni' }} />
      <MainStack.Screen name="AddVehicle" component={AddVehicleScreen} options={{ title: 'Aggiungi veicolo' }} />
      <MainStack.Screen name="AddTrip" component={AddTripScreen} options={{ title: 'Registra viaggio' }} />
      <MainStack.Screen name="AddRefuel" component={AddRefuelScreen} options={{ title: 'Registra rifornimento' }} />
      <MainStack.Screen name="SelectiveClear" component={SelectiveClearScreen} options={{ title: 'Elimina dati selezionati' }} />
    </MainStack.Navigator>
  );
}

function Root() {
  const { user, loading, pendingRecoveryCode } = useApp();
  const { colors, isDark, ready } = useTheme();
  const [fontsLoaded] = useFonts({
    Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold,
  });

  const navTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: { ...base.colors, background: colors.background, card: colors.card, text: colors.text, border: colors.border, primary: colors.accent },
    };
  }, [isDark, colors]);

  if (loading || !ready || !fontsLoaded) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DeepLinkHandler />
      {user ? (
        pendingRecoveryCode ? <RecoveryCodeScreen /> : <MainApp />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppProvider>
          <Root />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 10, backgroundColor: colors.card,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  bar: {
    flexDirection: 'row', backgroundColor: colors.card, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  barItem: { flex: 1, alignItems: 'center', gap: 2 },
  barLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
});
