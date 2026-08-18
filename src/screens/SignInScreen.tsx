import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  Platform,
  ScrollView,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  
  const setUser = useAuthStore((state) => state.setUser);
  const setUserData = useAuthStore((state) => state.setUserData);
  const syncFromFirestore = useLynkoStore((state) => state.syncFromFirestore);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const finishLogin = async (firebaseUser: any) => {
    try {
      const defaultUserData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Field Inspector',
        photoURL: firebaseUser.photoURL || null,
        role: 'user',
      };

      // 1. Set user state so app navigation activates
      setUser(firebaseUser);
      setUserData(defaultUserData);

      // 2. Synchronize Firestore document in background without blocking login
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          await setDoc(userDocRef, { ...defaultUserData, createdAt: serverTimestamp() }, { merge: true });
        }

        await syncFromFirestore();
      } catch (firestoreErr) {
        console.warn('Background Firestore sync deferred:', firestoreErr);
      }
    } catch (err: any) {
      console.error('Error during finishLogin:', err);
      setUser(firebaseUser);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    const cleanEmail = email.trim();
    
    // Validation Checks
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email format (e.g. name@domain.com).');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      if (isRegistering) {
        // 1. Create Account
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        // 2. Send Email Verification Link
        try {
          await sendEmailVerification(userCredential.user);
        } catch (verifErr) {
          console.warn('Email verification dispatch notice:', verifErr);
        }

        setLoading(false);

        // 3. User Notification & Proceed
        Alert.alert(
          'Account Created & Verification Sent',
          `A verification link has been dispatched to ${cleanEmail}.\n\nPlease check your inbox (or spam folder) to verify your address.`,
          [
            { 
              text: 'Continue to App', 
              onPress: () => finishLogin(userCredential.user) 
            }
          ]
        );
      } else {
        // Sign in existing account
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        await finishLogin(userCredential.user);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const code = err.code || '';

      if (code === 'auth/user-not-found') {
        setError('No inspector account found with this email. Tap "Create Account" above to register.');
      } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Incorrect password or email. If you forgot your password, tap "Forgot Password?" below.');
      } else if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please switch to the "Sign In" tab.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address format. Please check for typos.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait a few minutes or reset your password.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network connection error. Please check your Wi-Fi or mobile data.');
      } else {
        setError(err.message || 'Authentication failed. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please type your email address in the box above, then tap "Forgot Password?".');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setError('Please enter a valid email format to receive your reset link.');
      return;
    }

    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setLoading(false);
      setInfoMessage(`Password reset link sent to ${cleanEmail}. Please check your inbox.`);
      Alert.alert(
        'Password Reset Link Sent',
        `A password reset link has been dispatched to ${cleanEmail}.\n\nPlease check your email (and spam folder) to set your new password.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      setLoading(false);
      const code = err.code || '';
      if (code === 'auth/user-not-found') {
        setError('No inspector account exists with this email address.');
      } else {
        setError(err.message || 'Could not send reset email. Please try again.');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      if (Platform.OS === 'web') {
        const userCredential = await signInWithPopup(auth, provider);
        await finishLogin(userCredential.user);
      } else {
        try {
          const userCredential = await signInWithPopup(auth, provider);
          await finishLogin(userCredential.user);
        } catch (popupErr: any) {
          if (popupErr.code === 'auth/popup-blocked') {
            await signInWithRedirect(auth, provider);
          } else {
            setError('Google sign-in popup is not supported directly in Expo Go. Please use Email & Password above to sign in or create an account.');
            setLoading(false);
          }
        }
      }
    } catch (err: any) {
      console.error('Google Sign in error:', err);
      const code = err.code || '';
      if (code === 'auth/popup-closed-by-user') {
        setError('Google sign-in was cancelled.');
      } else if (code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email. Please sign in with your email and password.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'Could not sign in with Google. Please use email & password.');
      }
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            {/* Logo & Header */}
            <View style={styles.header}>
              <Image 
                source={require('../../assets/lynko-logo.jpg')} 
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Field Inspector Portal</Text>
              <Text style={styles.subtitle}>
                {isRegistering ? 'Create your new inspector account' : 'Sign in to access Chain of Custody & Projects'}
              </Text>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.alertBannerError}>
                <Ionicons name="alert-circle" size={20} color={colors.error} style={{ marginRight: 8 }} />
                <Text style={styles.alertTextError}>{error}</Text>
              </View>
            ) : null}

            {/* Info / Success Banner */}
            {infoMessage ? (
              <View style={styles.alertBannerSuccess}>
                <Ionicons name="checkmark-circle" size={20} color="#047857" style={{ marginRight: 8 }} />
                <Text style={styles.alertTextSuccess}>{infoMessage}</Text>
              </View>
            ) : null}

            {/* Mode Switcher Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity 
                style={[styles.tabBtn, !isRegistering && styles.tabBtnActive]} 
                onPress={() => { setIsRegistering(false); setError(''); setInfoMessage(''); }}
              >
                <Text style={[styles.tabBtnText, !isRegistering && styles.tabBtnTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, isRegistering && styles.tabBtnActive]} 
                onPress={() => { setIsRegistering(true); setError(''); setInfoMessage(''); }}
              >
                <Text style={[styles.tabBtnText, isRegistering && styles.tabBtnTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Email Address Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(val) => { setEmail(val); if (error) setError(''); }}
                  placeholder="e.g. inspector@alphaenvironmental.us"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={(val) => { setPassword(val); if (error) setError(''); }}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={colors.secondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password Link (Sign In Mode only) */}
            {!isRegistering ? (
              <TouchableOpacity style={styles.forgotPasswordBtn} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            ) : null}

            {/* Primary Action Button (Sign In / Register) */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleEmailAuth} 
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>
                  {isRegistering ? 'Create Inspector Account' : 'Sign In'}
                </Text>
              )}
            </TouchableOpacity>

            {/* OR Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign-In Button */}
            <TouchableOpacity 
              style={styles.googleButton} 
              onPress={handleGoogleSignIn} 
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={18} color="#4285F4" style={{ marginRight: 10 }} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteText}>
                Lynko • Alpha Environmental Field Suite
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 16,
    paddingVertical: 24,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    height: 75,
    width: '100%',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 14,
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
    borderColor: '#a7f3d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertTextSuccess: {
    flex: 1,
    color: '#047857',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 6,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  tabBtnTextActive: {
    color: colors.primaryContainer,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4,
  },
  forgotPasswordText: {
    color: colors.primaryContainer,
    fontSize: 13,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 12,
    color: colors.outline,
  },
});
