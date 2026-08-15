import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

import AppTabs from './AppTabs';
import SignInScreen from '../screens/SignInScreen';
import NewProjectScreen from '../screens/NewProjectScreen';
import ChainOfCustodyScreen from '../screens/ChainOfCustodyScreen';
import EditSamplesScreen from '../screens/EditSamplesScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const user = useAuthStore((state) => state.user);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          user.emailVerified || user.email === 'admin@lynko.inc' ? ( // Bypass for dev admin
            <>
              <Stack.Screen name="AppTabs" component={AppTabs} />
              <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ presentation: 'modal' }} />
              <Stack.Screen name="ChainOfCustody" component={ChainOfCustodyScreen} />
              <Stack.Screen name="EditSamples" component={EditSamplesScreen} />
            </>
          ) : (
            <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
          )
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
