import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const setUser = useAuthStore((state) => state.setUser);
  const setUserData = useAuthStore((state) => state.setUserData);
  const syncFromFirestore = useLynkoStore((state) => state.syncFromFirestore);

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }
    
    // Basic email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let userCredential;
      let userDataObj: any;

      if (isRegistering) {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUserData = {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          username: email.split('@')[0], 
          role: 'user', 
          createdAt: serverTimestamp()
        };
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(userDocRef, newUserData);
        userDataObj = newUserData;
        
        // Send email verification
        await sendEmailVerification(userCredential.user);
        Alert.alert("Verify Email", "We've sent a verification link to your email. Please check your inbox.");
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first to reset your password');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Check your email", "A password reset link has been sent to " + email);
    } catch (err: any) {
      setError(err.message);
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
              <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                <Text style={styles.linkText}>
                  {isRegistering ? 'sign in to existing account' : 'create a new account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
                  onChangeText={setEmail}
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
                  onChangeText={setPassword}
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

            <TouchableOpacity 
              style={styles.devButton}
              onPress={() => {
                setUser({ email: 'admin@lynko.inc', uid: 'dev-admin-123' });
                setUserData({ role: 'admin', email: 'admin@lynko.inc', username: 'SuperAdmin' });
              }}
            >
              <Text style={styles.devButtonText}>[DEV MODE] Bypass Login as Admin</Text>
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
    padding: 32,
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
    marginBottom: 32,
  },
  logo: {
    height: 96,
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
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
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    gap: 4,
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
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerLowest,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
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
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  error: {
    color: colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  devButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  devButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
});
