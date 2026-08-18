import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  role: string;
  createdAt?: any;
}

/**
 * Universal error code translator for human-friendly messages
 */
export const mapAuthError = (err: any): { message: string; actionType?: 'switchToRegister' | 'switchToLogin' } => {
  const code = err?.code || '';

  if (err?.message === 'EMAIL_NOT_VERIFIED') {
    return {
      message: 'Your email address is not verified yet. Please check your email inbox (and spam folder) and click the verification link before signing in.'
    };
  }

  switch (code) {
    case 'auth/email-already-in-use':
      return {
        message: 'This email is already registered in Lynko. Please sign in with your password.',
        actionType: 'switchToLogin'
      };
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return {
        message: 'Invalid email or password. If you do not have an account, tap "Create Account" below.',
        actionType: 'switchToRegister'
      };
    case 'auth/wrong-password':
      return {
        message: 'Incorrect password. If you forgot your password, tap "Forgot Password?" below.',
        actionType: 'switchToRegister'
      };
    case 'auth/invalid-email':
      return { message: 'Invalid email address format. Please check for typos (e.g. name@domain.com).' };
    case 'auth/weak-password':
      return { message: 'Password is too weak. Please use at least 6 characters with letters and numbers.' };
    case 'auth/too-many-requests':
      return { message: 'Too many failed attempts. Please wait a minute or reset your password.' };
    case 'auth/network-request-failed':
      return { message: 'Network connection error. Please check your mobile data or Wi-Fi.' };
    case 'auth/popup-closed-by-user':
      return { message: 'Google sign-in window was closed before completing.' };
    case 'auth/account-exists-with-different-credential':
      return { message: 'An account already exists with this email. Please sign in with email and password.' };
    default:
      return { message: err?.message || 'Authentication error. Please check your details and try again.' };
  }
};

/**
 * Creates a new user in Firebase Auth, creates Firestore profile,
 * sends verification email link, and IMMEDIATELY signs out to enforce strict verification.
 */
export const signUpWithEmail = async (email: string, pass: string): Promise<{ email: string }> => {
  const cleanEmail = email.trim();
  
  // 1. Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  // 2. Dispatch official verification link email
  try {
    await sendEmailVerification(user);
  } catch (verifErr) {
    console.warn('Verification email dispatch notice:', verifErr);
  }

  // 3. Initialize Firestore profile
  try {
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, {
      uid: user.uid,
      email: user.email || cleanEmail,
      displayName: user.displayName || cleanEmail.split('@')[0],
      photoURL: user.photoURL || null,
      role: 'user',
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (dbErr) {
    console.warn('Firestore initial user creation deferred:', dbErr);
  }

  // 4. STRICT ENFORCEMENT: Sign out immediately so user cannot access dashboard without verifying
  try {
    await signOut(auth);
  } catch (soErr) {}

  return { email: cleanEmail };
};

/**
 * Signs in user with email & password, STRICTLY checks emailVerified,
 * blocks access if unverified, and returns verified profile.
 */
export const signInWithEmail = async (
  email: string, 
  pass: string
): Promise<{ user: FirebaseUser; profile: UserProfile }> => {
  const cleanEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  // STRICT REFRESH: Reload user to get newest verification status from Google
  await user.reload();

  if (!user.emailVerified) {
    // STRICT GATE: Block access, log out session, and throw error
    await signOut(auth);
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  // Fetch or create user profile
  let profile: UserProfile = {
    uid: user.uid,
    email: user.email || cleanEmail,
    displayName: user.displayName || cleanEmail.split('@')[0],
    photoURL: user.photoURL || null,
    role: 'user',
  };

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    } else {
      await setDoc(userDocRef, { ...profile, createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (dbErr) {
    console.warn('Firestore profile sync deferred:', dbErr);
  }

  return { user, profile };
};

/**
 * Resends the official verification link email
 */
export const resendVerificationEmail = async (email: string, pass?: string): Promise<void> => {
  const cleanEmail = email.trim();
  if (pass) {
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return;
    } catch (e) {}
  }
  
  // Fallback: Send password reset / verification link
  await sendPasswordResetEmail(auth, cleanEmail);
};

/**
 * Sends a password reset email link
 */
export const resetPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim();
  await sendPasswordResetEmail(auth, cleanEmail);
};

/**
 * Universal Google Sign-In (Google accounts are pre-verified by Google)
 */
export const signInWithGoogle = async (): Promise<{ user: FirebaseUser; profile: UserProfile }> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let user: FirebaseUser;

  if (Platform.OS === 'web') {
    const userCredential = await signInWithPopup(auth, provider);
    user = userCredential.user;
  } else {
    try {
      const userCredential = await signInWithPopup(auth, provider);
      user = userCredential.user;
    } catch (popupErr: any) {
      if (popupErr.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, provider);
        throw new Error('Redirecting to Google sign in...');
      } else {
        throw new Error('Google Sign-In is optimized for Web and Native App builds. On mobile Expo Go, please use Email and Password.');
      }
    }
  }

  let profile: UserProfile = {
    uid: user.uid,
    email: user.email || '',
    displayName: user.displayName || user.email?.split('@')[0] || 'Field Inspector',
    photoURL: user.photoURL || null,
    role: 'user',
  };

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      profile = docSnap.data() as UserProfile;
    } else {
      await setDoc(userDocRef, { ...profile, createdAt: serverTimestamp() }, { merge: true });
    }
  } catch (dbErr) {
    console.warn('Firestore profile sync deferred:', dbErr);
  }

  return { user, profile };
};

/**
 * Logs out the active user session
 */
export const logoutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out warning:', e);
  }
};
