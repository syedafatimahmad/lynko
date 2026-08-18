import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  User as FirebaseUser,
  onAuthStateChanged
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

  switch (code) {
    case 'auth/email-already-in-use':
      return {
        message: 'This email is already registered in Lynko. Please sign in with your password.',
        actionType: 'switchToLogin'
      };
    case 'auth/user-not-found':
    case 'auth/invalid-credential':
      return {
        message: 'Invalid email/password, or no account exists with this email address.',
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
 * Creates a new user, sends email verification, and returns the user object
 */
export const signUpWithEmail = async (email: string, pass: string): Promise<FirebaseUser> => {
  const cleanEmail = email.trim();
  const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  // Send official verification email
  try {
    await sendEmailVerification(user);
  } catch (verifErr) {
    console.warn('Verification email dispatch notice:', verifErr);
  }

  // Create initial user document in Firestore
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

  return user;
};

/**
 * Signs in user with email & password, checks verification, and syncs profile
 */
export const signInWithEmail = async (
  email: string, 
  pass: string, 
  requireVerification: boolean = true
): Promise<{ user: FirebaseUser; profile: UserProfile; isVerified: boolean }> => {
  const cleanEmail = email.trim();
  const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
  const user = userCredential.user;

  // Fetch the latest verification status from Firebase servers
  await user.reload();
  const isVerified = user.emailVerified;

  if (requireVerification && !isVerified) {
    return { user, profile: null as any, isVerified: false };
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

  return { user, profile, isVerified: true };
};

/**
 * Resends the official verification link email
 */
export const resendVerificationEmail = async (userOrEmail?: FirebaseUser | string, pass?: string): Promise<void> => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
  } else if (typeof userOrEmail === 'string' && pass) {
    const cred = await signInWithEmailAndPassword(auth, userOrEmail.trim(), pass);
    await sendEmailVerification(cred.user);
  } else if (typeof userOrEmail === 'string') {
    await sendPasswordResetEmail(auth, userOrEmail.trim());
  } else {
    throw new Error('No user session available to send verification email.');
  }
};

/**
 * Sends a password reset email link
 */
export const resetPassword = async (email: string): Promise<void> => {
  const cleanEmail = email.trim();
  await sendPasswordResetEmail(auth, cleanEmail);
};

/**
 * Universal Google Sign-In
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
