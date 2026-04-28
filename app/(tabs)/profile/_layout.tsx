import { Stack } from 'expo-router';
import { Colors } from '../../../constants/colors';

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="photo-editor" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
