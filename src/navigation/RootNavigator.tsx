import React, { useEffect } from 'react';
import { AppState } from 'react-native';
import { useLynkoStore } from '../store/lynkoStore';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';

import AppTabs from './AppTabs';
import SignInScreen from '../screens/SignInScreen';
import NewProjectScreen from '../screens/NewProjectScreen';
import ChainOfCustodyScreen from '../screens/ChainOfCustodyScreen';
import SampleTypesScreen from '../screens/SampleTypesScreen';
import EditSamplesScreen from '../screens/EditSamplesScreen';
import SampleLoggerScreen from '../screens/SampleLoggerScreen';
import ProjectSamplesScreen from '../screens/ProjectSamplesScreen';
import SubmitCoCScreen from '../screens/SubmitCoCScreen';
import SubmittedCoCScreen from '../screens/SubmittedCoCScreen';
import RecoveredSamplesScreen from '../screens/RecoveredSamplesScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const user = useAuthStore((state) => state.user);
  useEffect(() => {
    if (!user?.uid) return;
    const sync = () => {
      if (!useLynkoStore.persist.hasHydrated()) return;
      void useLynkoStore.getState().syncFromFirestore();
    };
    const retry = () => {
      if (!useLynkoStore.persist.hasHydrated()) return;
      const store = useLynkoStore.getState();
      if (store.needsProjectMigration) void store.syncFromFirestore();
      else void store.flushPendingWrites();
    };
    const unsubscribe = useLynkoStore.persist.onFinishHydration(sync);
    sync();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') retry(); });
    const interval = setInterval(retry, 30000);
    return () => { unsubscribe(); subscription.remove(); clearInterval(interval); };
  }, [user?.uid]);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="AppTabs" component={AppTabs} />
            <Stack.Screen name="NewProject" component={NewProjectScreen} options={{ presentation: 'modal' }} />
            <Stack.Screen name="SampleLogger" component={SampleLoggerScreen} />
            <Stack.Screen name="ProjectSamples" component={ProjectSamplesScreen} />
            <Stack.Screen name="RecoveredSamples" component={RecoveredSamplesScreen} />
            <Stack.Screen name="ChainOfCustody" component={ChainOfCustodyScreen} />
            <Stack.Screen name="SampleTypes" component={SampleTypesScreen} />
            <Stack.Screen name="EditSamples" component={ProjectSamplesScreen} />
            <Stack.Screen name="SubmitCoC" component={SubmitCoCScreen} />
            <Stack.Screen name="SubmittedCoC" component={SubmittedCoCScreen} />
          </>
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
