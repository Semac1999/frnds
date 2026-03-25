import { Tabs } from 'expo-router';
import { Colors } from '../../constants/colors';
import { TabBar } from '../../components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: Colors.bg },
      }}
    >
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="discover" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
