import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
    try {
      await signOut(auth);
      clearStore();
      logout();
    } catch (e) {
      console.error(e);
      clearStore();
      logout(); // Force local logout anyway
    }
  };

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle-outline" size={80} color={colors.primaryContainer} style={styles.avatar} />
      <Text style={styles.label}>Logged in as:</Text>
      <Text style={styles.email}>{user?.email || 'Unknown User'}</Text>

      {userData?.role === 'admin' && (
        <TouchableOpacity 
          style={styles.adminButton} 
          onPress={() => navigation.navigate('AdminDashboard')}
        >
          <Ionicons name="shield-checkmark" size={20} color="#fff" />
          <Text style={styles.adminButtonText}>Admin Dashboard</Text>
        </TouchableOpacity>
      )}
      
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
