// Palette, spaziature e font dell'app.
// I colori vengono scelti a runtime da ThemeContext (chiaro / scuro / sistema).

export const lightColors = {
  background: '#F4F5F7',
  card: '#FFFFFF',
  border: '#E3E6EB',
  accent: '#F5A000',      // ambra: sfondi, icone, bottoni
  accentText: '#B26A00',  // ambra scuro: testi e link (leggibile su bianco)
  green: '#2E9E4F',
  red: '#D63B3B',
  text: '#14181F',
  textMuted: '#6B7280',
  inputBg: '#F0F2F5',
};

export const darkColors = {
  background: '#121417',
  card: '#1C1F24',
  border: '#2C3138',
  accent: '#FFB300',
  accentText: '#FFB300',
  green: '#66BB6A',
  red: '#EF5350',
  text: '#F2F3F5',
  textMuted: '#8A919B',
  inputBg: '#24282E',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, full: 999 };

// Font Inter (pacchetto @expo-google-fonts/inter): un nome per ogni peso
export const fonts = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
  '800': 'Inter_800ExtraBold',
};

// Colori per distinguere gli utenti (stesso utente = stesso colore ovunque)
export const userPalette = ['#3B82F6', '#A855F7', '#EC4899', '#14B8A6', '#F97316', '#84CC16', '#06B6D4', '#EF4444'];
export function userColor(userId) {
  return userPalette[Math.abs(Number(userId) || 0) % userPalette.length];
}
