import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  const [infoMessage, setInfoMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const clearStore = useLynkoStore((state) => state.clearStore);

  const checkVerification = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setInfoMessage('');
    setErrorMessage('');
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        setUser({ ...auth.currentUser });
      } else {
        setErrorMessage('Email is not verified yet. Please click the link in your email (check Spam folder if needed).');
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Could not verify status. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!auth.currentUser) return;
    
    setResending(true);
    setInfoMessage('');
    setErrorMessage('');
    try {
      await sendEmailVerification(auth.currentUser);
      setInfoMessage('A fresh verification link has been sent to your email. Please check your Inbox and Spam/Junk folder.');
    } catch (error: any) {
      if (error.code === 'auth/too-many-requests') {
        setErrorMessage('Verification email already sent recently. Please check your spam folder or wait 1-2 minutes.');
      } else {
        setErrorMessage(error.message || 'Failed to resend verification email.');
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
          <Ionicons name="mail-unread-outline" size={72} color={colors.primaryContainer} />
        </View>
        
        <Text style={styles.title}>Verify your email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to:
        </Text>
        <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
        
        <Text style={styles.instructions}>
          Please tap the confirmation link in the email to activate your account and access the Lynko inspection suite.
        </Text>

        {/* In-app Notification Banners */}
        {infoMessage ? (
          <View style={styles.alertBannerSuccess}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" style={{ marginRight: 8 }} />
            <Text style={styles.alertTextSuccess}>{infoMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.alertBannerError}>
            <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.alertTextError}>{errorMessage}</Text>
          </View>
        ) : null}

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
          style={styles.devBypassButton}
          onPress={() => {
            if (auth.currentUser) {
              setUser({ ...auth.currentUser, emailVerified: true } as any);
            }
          }}
        >
          <Text style={styles.devBypassText}>[DEV MODE] Instant Test Access</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
          <Text style={styles.logoutText}>Sign Out / Switch Account</Text>
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
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#e6fbf9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#c2f4ee',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  emailText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryContainer,
    marginTop: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  alertBannerSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  alertTextSuccess: {
    flex: 1,
    color: '#065f46',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  alertBannerError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    width: '100%',
  },
  alertTextError: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primaryContainer,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  secondaryButtonText: {
    color: colors.primaryContainer,
    fontSize: 15,
    fontWeight: '600',
  },
  devBypassButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  devBypassText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: 20,
    padding: 8,
  },
  logoutText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
