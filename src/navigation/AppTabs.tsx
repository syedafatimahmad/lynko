import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ProjectsScreen from '../screens/ProjectsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChainOfCustodyScreen from '../screens/ChainOfCustodyScreen';
import ContactPmScreen from '../screens/ContactPmScreen';
import { colors } from '../theme/colors';
import { View } from 'react-native';

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          
          if (route.name === 'Projects') {
            iconName = focused ? 'document-text' : 'document-text-outline';
          } else if (route.name === 'Contact PM') {
            iconName = focused ? 'call' : 'call-outline';
          } else if (route.name === 'Chain of Custody') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline';
          }

          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              {focused && (
                <View 
                  style={{
                    position: 'absolute',
                    top: -10, // Adjust based on HTML active indicator Line
                    width: 32,
                    height: 3,
                    backgroundColor: colors.primaryContainer,
                    borderBottomLeftRadius: 2,
                    borderBottomRightRadius: 2,
                  }} 
                />
              )}
              <Ionicons name={iconName} size={24} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primaryContainer,
        tabBarInactiveTintColor: colors.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.outlineVariant,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'Inter',
        }
      })}
    >
      <Tab.Screen name="Projects" component={ProjectsScreen} />
      <Tab.Screen name="Contact PM" component={ContactPmScreen} />
      <Tab.Screen name="Chain of Custody" component={ChainOfCustodyScreen} />
      <Tab.Screen name="More" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
