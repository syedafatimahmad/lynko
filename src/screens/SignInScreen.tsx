import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

function getFriendlyErrorMessage(err: any): string {
  if (!err) return '';
  const code = err.code || '';
  const msg = err.message || '';

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Invalid email or password. Please verify your credentials or tap "Forgot password?" below.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please tap "sign in to existing account" above.';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address format (e.g. inspector@lynko.inc).';
  }
  if (code === 'auth/too-many-requests') {
    return 'Access temporarily disabled due to many failed attempts. Please wait a minute or reset your password.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  
  // Clean up any remaining Firebase prefixes
  return msg.replace(/^Firebase:\s*Error\s*\([^)]*\)\s*:?\s*/i, '').trim() || 'Authentication failed. Please try again.';
}

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setUserData = useAuthStore((state) => state.setUserData);
  const syncFromFirestore = useLynkoStore((state) => state.syncFromFirestore);

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email address and password.');
      setSuccessMessage('');
      return;
    }
    
    // Email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address (e.g. name@company.com).');
      setSuccessMessage('');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      let userCredential;
      let userDataObj: any;

      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const newUserData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: email.trim().split('@')[0], 
          role: 'user', 
          createdAt: serverTimestamp()
        };
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, newUserData);
        userDataObj = newUserData;
        
        // Send email verification
        try {
          await sendEmailVerification(userCredential.user);
          setSuccessMessage('Account created! A verification link has been sent to your email.');
        } catch (emailErr) {
          console.log('Email verification send notice:', emailErr);
        }
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          userDataObj = docSnap.data();
        }
      }
      
      // Load user's data from Firestore into local store BEFORE letting them in
      await syncFromFirestore();
      
      setUser(userCredential.user);
      setUserData(userDataObj);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address above to receive a password reset link.');
      setSuccessMessage('');
      return;
    }
    setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage(`Password reset email sent to ${email.trim()}. Please check your inbox and spam folder.`);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Image 
              source={require('../../assets/lynko-logo.jpg')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{isRegistering ? 'Create an account' : 'Sign in to your account'}</Text>
            <View style={styles.subtitleRow}>
              <Text style={styles.subtitle}>Or </Text>
              <TouchableOpacity onPress={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setSuccessMessage('');
              }}>
                <Text style={styles.linkText}>
                  {isRegistering ? 'sign in to existing account' : 'create a new account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Styled Error Banner */}
          {error ? (
            <View style={styles.alertBannerError}>
              <Ionicons name="alert-circle" size={18} color={colors.error} style={styles.bannerIcon} />
              <Text style={styles.alertTextError}>{error}</Text>
            </View>
          ) : null}

          {/* Styled Success Banner */}
          {successMessage ? (
            <View style={styles.alertBannerSuccess}>
              <Ionicons name="checkmark-circle" size={18} color="#059669" style={styles.bannerIcon} />
              <Text style={styles.alertTextSuccess}>{successMessage}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="inspector@lynko.inc"
                  placeholderTextColor={colors.outline}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.outline} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.outline}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.actionsRow}>
              <View style={styles.checkboxRow}>
                <View style={styles.checkbox} />
                <Text style={styles.rememberText}>Remember me</Text>
              </View>
              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isRegistering ? 'Register' : 'Sign In'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
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
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    height: 84,
    width: '100%',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitleRow: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  linkText: {
    fontSize: 14,
    color: colors.primaryContainer,
    fontWeight: '600',
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
  },
  alertTextError: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
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
  },
  alertTextSuccess: {
    flex: 1,
    color: '#065f46',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  bannerIcon: {
    marginRight: 8,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 6,
    backgroundColor: colors.surfaceContainerLowest,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.onSurface,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: 4,
  },
  rememberText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  button: {
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
