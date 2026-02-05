import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/theme';
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '../types';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { JobDetailsScreen } from '../screens/JobDetailsScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Placeholder screens
const Placeholder = ({ name }: { name: string }) => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <Text style={{ fontSize: 18, color: COLORS.textMain }}>{name} Coming Soon</Text>
    </View>
);

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
                    else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                    else if (route.name === 'Notifications') iconName = focused ? 'notifications' : 'notifications-outline';
                    else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';

                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                headerShown: false,
                tabBarStyle: {
                    borderTopColor: COLORS.borderLight,
                    elevation: 0,
                    shadowOpacity: 0,
                    height: 60,
                    paddingBottom: 10,
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Messages" component={() => <Placeholder name="Messages" />} />
            <Tab.Screen name="Notifications" component={() => <Placeholder name="Notifications" />} />
            <Tab.Screen name="Profile" component={() => <Placeholder name="Profile" />} />
        </Tab.Navigator>
    );
};

export const Navigation = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Auth" component={LoginScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
                name="JobDetails"
                component={JobDetailsScreen}
                options={{ presentation: 'card' }}
            />
        </Stack.Navigator>
    );
};
