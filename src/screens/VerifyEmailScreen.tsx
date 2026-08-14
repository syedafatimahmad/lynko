import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { sendEmailVerification } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const clearStore = useLynkoStore((state) => state.clearStore);

  const checkVerification = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setUser({ ...auth.currentUser });
      } else {
        Alert.alert("Not Verified", "Your email is still not verified. Please check your inbox and spam folder.");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    
    setResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert("Sent!", "A new verification link has been sent to your email.");
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        Alert.alert("Wait a moment", "We already sent an email recently. Please wait a bit before requesting another.");
      } else {
        Alert.alert("Error", error.message);
      }
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      clearStore();
      logout();
    } catch (error) {
      console.error(error);
      clearStore();
      logout();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={colors.primaryContainer} />
        </View>
        
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to:
        </Text>
        <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
        
        <Text style={styles.instructions}>
          Please click the link in that email to verify your account and access the app.
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.primaryButton} onPress={checkVerification} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>I have verified my email</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleResend} disabled={resending}>
            {resending ? <ActivityIndicator color={colors.primaryContainer} /> : <Text style={styles.secondaryButtonText}>Resend Verification Link</Text>}
          </TouchableOpacity>
        </View>

        {/* --- DEV BYPASS --- */}
        <TouchableOpacity 
          style={{ marginTop: 20, padding: 10, backgroundColor: '#ffebee', borderRadius: 8 }}
          onPress={() => {
            if (auth.currentUser) {
              setUser({ ...auth.currentUser, emailVerified: true } as any);
            }
          }}
        >
          <Text style={{ color: '#c62828', fontWeight: 'bold' }}>[DEV MODE] Bypass Verification</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primaryContainer + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.onSurface,
    marginTop: 4,
    marginBottom: 24,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  actions: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: colors.primaryContainer,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  secondaryButtonText: {
    color: colors.primaryContainer,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 40,
    padding: 12,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '500',
  },
});
