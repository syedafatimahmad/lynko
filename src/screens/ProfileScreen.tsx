import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';

export default function ProfileScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const userData = useAuthStore((state) => state.userData);
  const logout = useAuthStore((state) => state.logout);
  const clearStore = useLynkoStore((state) => state.clearStore);

  const handleSignOut = async () => {
    if (useLynkoStore.getState().legacyUnassignedSamples.length > 0) {
      Alert.alert('Review recovered samples first', 'Open Projects and assign the recovered samples to their original projects before signing out. This keeps their records safe.');
      return;
    }
    if (useLynkoStore.getState().needsProjectMigration) await useLynkoStore.getState().syncFromFirestore();
    if (useLynkoStore.getState().needsProjectMigration) {
      Alert.alert('Saving your existing projects', 'Please wait for the project update to finish, then try signing out again.');
      return;
    }
    const synced = await useLynkoStore.getState().flushPendingWrites();
    if (!synced || Object.keys(useLynkoStore.getState().pendingWrites).length > 0) {
      Alert.alert('Work is saved on this device', 'Connect to the internet and let your projects finish syncing before signing out.');
      return;
    }
    try {
      await signOut(auth);
      clearStore();
      logout();
    } catch (error) {
      Alert.alert('Could not sign out', 'Your projects are still saved. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={80} color={colors.primaryContainer} style={styles.avatar} />
      <Text style={styles.label}>Logged in as:</Text>
      <Text style={styles.email}>{user?.email || 'Unknown User'}</Text>

      
      <TouchableOpacity style={styles.button} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 16, color: colors.textSecondary },
  email: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 30 },
  avatar: { marginBottom: 16 },
  adminButton: { 
    backgroundColor: colors.primary, 
    padding: 16, 
    borderRadius: 8, 
    width: '100%', 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8,
    marginBottom: 16 
  },
  adminButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  button: { 
    backgroundColor: colors.error, 
    padding: 16, 
    borderRadius: 8, 
    width: '100%', 
    alignItems: 'center', 
    flexDirection: 'row', 
    justifyContent: 'center', 
    gap: 8 
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
