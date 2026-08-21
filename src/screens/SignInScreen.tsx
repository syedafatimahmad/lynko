import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  Image, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { 
  signUpWithEmail, 
  signInWithEmail, 
  resetPassword, 
  resendVerificationEmail, 
  signInWithGoogle, 
  signInWithGoogleCredential,
  mapAuthError,
  logoutUser 
} from '../services/authService';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { auth } from '../config/firebase';

if (Platform.OS !== 'web') {
  try {
    GoogleSignin.configure({
      webClientId: '429476843085-69p861nle0eqn9r8mbl2n5d5l9kpia7r.apps.googleusercontent.com',
      offlineAccess: false,
    });
  } catch (e) {
    console.warn('GoogleSignin configure notice:', e);
  }
}

export default function SignInScreen() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [registeredEmailSuccess, setRegisteredEmailSuccess] = useState<string | null>(null);
  const [quickActionType, setQuickActionType] = useState<'switchToRegister' | 'switchToLogin' | null>(null);

  const setUser = useAuthStore((state) => state.setUser);
  const setUserData = useAuthStore((state) => state.setUserData);
  const syncFromFirestore = useLynkoStore((state) => state.syncFromFirestore);

  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleAuth = async () => {
    const cleanEmail = email.trim();
    setQuickActionType(null);
    setError('');
    setInfoMessage('');

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

    if (isRegistering) {
      // 1. Clean Registration handling (Structured result, zero red console errors)
      const res = await signUpWithEmail(cleanEmail, password);
      setLoading(false);

      if (res.success) {
        setRegisteredEmailSuccess(cleanEmail);
      } else {
        setError(res.message);
        if (res.actionType) {
          setQuickActionType(res.actionType);
        }
      }
    } else {
      // 2. Clean Sign In handling (Structured result, zero red console errors)
      const res = await signInWithEmail(cleanEmail, password);
      setLoading(false);

      if (res.success) {
        setUser(res.user);
        setUserData(res.profile);
        await syncFromFirestore();
      } else if (res.isUnverified) {
        // Smoothly transitions directly to the verification window
        setRegisteredEmailSuccess(res.email);
      } else {
        setError(res.message);
        if (res.actionType) {
          setQuickActionType(res.actionType);
        }
      }
    }
  };

  const handleCheckVerification = async () => {
    setCheckingVerification(true);
    try {
      if (auth.currentUser) {
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          const user = auth.currentUser;
          const defaultUserData = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Field Inspector',
            role: 'user',
          };
          setUser(user);
          setUserData(defaultUserData);
          await syncFromFirestore();
          return;
        }
      }

      Alert.alert(
        'Email Not Verified Yet',
        'We have not detected your email verification on Google servers yet.\n\nPlease open your email client, click the activation link, then tap this button again.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Notice', 'Please click the link in your email and try again.');
    } finally {
      setCheckingVerification(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = registeredEmailSuccess || email.trim();
    if (!targetEmail) return;
    
    setResending(true);
    try {
      await resendVerificationEmail(targetEmail, password);
      Alert.alert(
        'Verification Link Sent',
        `A fresh verification link has been dispatched to ${targetEmail}.\nPlease check your inbox (and Spam folder).`
      );
    } catch (err: any) {
      Alert.alert('Notice', 'Could not send verification email at this moment.');
    } finally {
      setResending(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please enter your email address in the box above to receive a password reset link.');
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
      await resetPassword(cleanEmail);
      setLoading(false);
      setInfoMessage(`Password reset link dispatched to ${cleanEmail}. Please check your inbox and spam folder.`);
      Alert.alert(
        'Password Reset Link Sent',
        `A password reset link has been dispatched to ${cleanEmail}.\n\nPlease check your email (and spam folder) to set your new password.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      setLoading(false);
      const parsed = mapAuthError(err);
      setError(parsed.message);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    setInfoMessage('');
    setQuickActionType(null);

    if (Platform.OS === 'web') {
      try {
        const { user, profile } = await signInWithGoogle();
        setUser(user);
        setUserData(profile);
        await syncFromFirestore();
      } catch (err: any) {
        console.error('Google Auth Error:', err);
        const parsed = mapAuthError(err);
        setError(parsed.message);
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await GoogleSignin.signIn();
        
        // Retrieve ID token from response (compatible with both SDK schema versions)
        const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;
        
        if (idToken) {
          const { user, profile } = await signInWithGoogleCredential(idToken);
          setUser(user);
          setUserData(profile);
          await syncFromFirestore();
        } else {
          setError('Google authentication did not return a valid credentials token.');
        }
      } catch (err: any) {
        console.error('Google Native Sign-In Error:', err);
        if (err.code === statusCodes.SIGN_IN_CANCELLED) {
          // User dismissed dialog
        } else if (err.code === statusCodes.IN_PROGRESS) {
          // Sign in is in progress already
        } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          setError('Google Play Services is not available or outdated.');
        } else {
          const parsed = mapAuthError(err);
          setError(parsed.message || 'Google Sign-In failed. Please sign in with email and password.');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // =========================================================================
  // VIEW: Dedicated Verification Screen
  // =========================================================================
  if (registeredEmailSuccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.verificationContainer}>
          <View style={styles.verificationCard}>
            <View style={styles.emailIconCircle}>
              <Ionicons name="mail-open-outline" size={48} color={colors.primaryContainer} />
            </View>

            <Text style={styles.verificationTitle}>Verify Your Email</Text>
            
            <Text style={styles.verificationDesc}>
              We have dispatched an official activation link to:
            </Text>
            
            <View style={styles.emailBadge}>
              <Text style={styles.emailBadgeText}>{registeredEmailSuccess}</Text>
            </View>

            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={20} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.noticeText}>
                Please check your inbox (and <Text style={{ fontWeight: 'bold' }}>Spam/Junk</Text> folder). Click the link in the email, then tap the button below.
              </Text>
            </View>

            {/* Main Action: I Have Clicked the Verification Link */}
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleCheckVerification}
              disabled={checkingVerification}
            >
              {checkingVerification ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>I've Clicked the Verification Link</Text>
              )}
            </TouchableOpacity>

            {/* Resend Link Button */}
            <TouchableOpacity 
              style={[styles.resendLinkBtn, { marginTop: 16 }]}
              onPress={handleResendVerification}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color={colors.primaryContainer} />
              ) : (
                <Text style={styles.resendLinkText}>🔄 Didn't receive it? Resend Link</Text>
              )}
            </TouchableOpacity>

            {/* Back / Sign Out */}
            <TouchableOpacity 
              style={styles.resendLinkBtn}
              onPress={async () => {
                await logoutUser();
                setRegisteredEmailSuccess(null);
                setIsRegistering(false);
                setError('');
              }}
            >
              <Text style={[styles.resendLinkText, { color: colors.secondary, marginTop: 4 }]}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // =========================================================================
  // VIEW: Main Sign In / Create Account Screen
  // =========================================================================
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

            {/* Error Banner with Smart Tab Switchers */}
            {error ? (
              <View style={styles.alertBannerError}>
                <Ionicons name="alert-circle" size={20} color={colors.error} style={{ marginRight: 8, marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTextError}>{error}</Text>
                  
                  {quickActionType === 'switchToLogin' && (
                    <TouchableOpacity 
                      style={styles.switchAlertBtn} 
                      onPress={() => {
                        setIsRegistering(false);
                        setError('');
                        setQuickActionType(null);
                      }}
                    >
                      <Text style={styles.switchAlertBtnText}>👉 Click here to Sign In with this email</Text>
                    </TouchableOpacity>
                  )}

                  {quickActionType === 'switchToRegister' && (
                    <TouchableOpacity 
                      style={styles.switchAlertBtn} 
                      onPress={() => {
                        setIsRegistering(true);
                        setError('');
                        setQuickActionType(null);
                      }}
                    >
                      <Text style={styles.switchAlertBtnText}>👉 Don't have an account? Tap here to Create One</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : null}

            {/* Success Banner */}
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
                onPress={() => { 
                  setIsRegistering(false); 
                  setError(''); 
                  setInfoMessage(''); 
                  setQuickActionType(null);
                }}
              >
                <Text style={[styles.tabBtnText, !isRegistering && styles.tabBtnTextActive]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.tabBtn, isRegistering && styles.tabBtnActive]} 
                onPress={() => { 
                  setIsRegistering(true); 
                  setError(''); 
                  setInfoMessage(''); 
                  setQuickActionType(null);
                }}
              >
                <Text style={[styles.tabBtnText, isRegistering && styles.tabBtnTextActive]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            {/* Email Address Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={(val) => { 
                    setEmail(val); 
                    if (error) setError(''); 
                    if (quickActionType) setQuickActionType(null);
                  }}
                  placeholder="e.g. inspector@lynko.app"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Field */}
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

            {/* Primary Action Button */}
            <TouchableOpacity 
              style={styles.primaryButton} 
              onPress={handleAuth} 
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
              onPress={handleGoogleAuth} 
              disabled={loading}
            >
              <View style={styles.googleButtonContent}>
                <Ionicons name="logo-google" size={18} color="#4285F4" style={{ marginRight: 10 }} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.footerNote}>
              <Text style={styles.footerNoteText}>
                Lynko Field Suite
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
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  alertTextError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  switchAlertBtn: {
    marginTop: 6,
    paddingVertical: 2,
  },
  switchAlertBtnText: {
    color: colors.primaryContainer,
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  // Verification Screen Styles
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  verificationCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  emailIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#b2ebe5',
  },
  verificationTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 8,
  },
  verificationDesc: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 10,
  },
  emailBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#E6F8F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#b2ebe5',
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#004d40',
    lineHeight: 18,
  },
  resendLinkBtn: {
    paddingVertical: 6,
    alignItems: 'center',
  },
  resendLinkText: {
    fontSize: 13,
    color: colors.primaryContainer,
    fontWeight: '700',
  },
});
