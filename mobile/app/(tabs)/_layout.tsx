import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Platform } from 'react-native'
import useAuthStore from '@/store/authStore'

type IoniconsName = React.ComponentProps<typeof Ionicons>['name']

function TabIcon({ name, focused }: { name: IoniconsName; focused: boolean }) {
  return <Ionicons name={name} size={22} color={focused ? '#f97316' : '#6b7280'} />
}

export default function TabLayout() {
  const { user } = useAuthStore()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a1a1a',
          borderTopColor: 'rgba(255,255,255,0.05)',
          paddingBottom: Platform.OS === 'ios' ? 0 : 8,
          height: Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarActiveTintColor: '#f97316',
        tabBarInactiveTintColor: '#6b7280',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'home' : 'home-outline'} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="releases"
        options={{
          title: 'Uscite',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'disc' : 'disc-outline'} focused={focused} />,
        }}
      />
      {user && (
        <Tabs.Screen
          name="create"
          options={{
            title: 'Review',
            tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'add-circle' : 'add-circle-outline'} focused={focused} />,
          }}
        />
      )}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name={focused ? 'person' : 'person-outline'} focused={focused} />,
        }}
      />
      {/* Hidden tabs (accessible via navigation but not shown in bar) */}
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  )
}
