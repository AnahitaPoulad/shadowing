import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { Text } from "react-native";

import LessonListScreen from "./src/screens/LessonListScreen";
import PracticeScreen from "./src/screens/PracticeScreen";
import StatsScreen from "./src/screens/StatsScreen";
import { colors } from "./src/theme";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.surface,
    text: colors.text,
    border: colors.surface2,
    notification: colors.accent2,
  },
};

function LessonsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Stack.Screen name="LessonList" component={LessonListScreen} options={{ title: "Lessons" }} />
      <Stack.Screen name="Practice" component={PracticeScreen} options={{ title: "Practice" }} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.surface2 },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.muted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
        }}
      >
        <Tab.Screen
          name="Lessons"
          component={LessonsStack}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📚</Text> }}
        />
        <Tab.Screen
          name="Stats"
          component={StatsScreen}
          options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text>,
            headerShown: true,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
