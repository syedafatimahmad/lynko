import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const setUser = useAuthStore((state) => state.setUser);
  const setUserData = useAuthStore((state) => state.setUserData);
  const syncFromFirestore = useLynkoStore((state) => state.syncFromFirestore);

  const finishLogin = async (firebaseUser: any) => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(userDocRef);
      
      let userDataObj: any;
      if (docSnap.exists()) {
        userDataObj = docSnap.data();
      } else {
        userDataObj = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
          photoURL: firebaseUser.photoURL || null,
          role: 'user',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, userDataObj);
      }

      await syncFromFirestore();
      setUser(firebaseUser);
      setUserData(userDataObj);
    } catch (err: any) {
      console.error('Error saving user data:', err);
      setUser(firebaseUser);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');

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
            throw popupErr;
          }
        }
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'Could not sign in with Google. Please try again.');
      }
      setLoading(false);
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
            <Text style={styles.title}>Field Inspector Portal</Text>
            <Text style={styles.subtitle}>Sign in with your Google Account</Text>
          </View>

          {error ? (
            <View style={styles.alertBannerError}>
              <Ionicons name="alert-circle" size={18} color={colors.error} style={{ marginRight: 8 }} />
              <Text style={styles.alertTextError}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.primaryContainer} />
            <Text style={styles.infoText}>
              All Chain of Custody submissions and inspection logs will be securely authenticated and dispatched using your Google account email.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.googleButton} 
            onPress={handleGoogleSignIn} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.primaryContainer} />
            ) : (
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={22} color="#4285F4" style={{ marginRight: 12 }} />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>
              Lynko • Alpha Environmental Inspection Suite
            </Text>
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
    padding: 20,
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    height: 90,
    width: '100%',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 6,
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
    marginBottom: 18,
  },
  alertTextError: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F7',
    borderRadius: 8,
    padding: 14,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#b2ebe5',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#004d40',
    lineHeight: 18,
  },
  googleButton: {
    backgroundColor: '#FFFFFF',
    height: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleButtonText: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  footerNote: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerNoteText: {
    fontSize: 12,
    color: colors.outline,
  },
});
