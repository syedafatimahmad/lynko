import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  sendEmailVerification, 
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithCredential,
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

export type SignUpResult = 
  | { success: true; email: string; user: FirebaseUser }
  | { success: false; errorCode: string; message: string; actionType?: 'switchToRegister' | 'switchToLogin' };

export type SignInResult = 
  | { success: true; user: FirebaseUser; profile: UserProfile }
  | { success: false; isUnverified: true; email: string }
  | { success: false; isUnverified: false; errorCode: string; message: string; actionType?: 'switchToRegister' | 'switchToLogin' };

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
 * Creates a new user in Firebase Auth, sends verification email link,
 * and maintains the session token so the verification link remains valid.
 */
export const signUpWithEmail = async (email: string, pass: string): Promise<SignUpResult> => {
  const cleanEmail = email.trim();
  
  try {
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

    return { success: true, email: cleanEmail, user };
  } catch (err: any) {
    const parsed = mapAuthError(err);
    return {
      success: false,
      errorCode: err?.code || 'AUTH_ERROR',
      message: parsed.message,
      actionType: parsed.actionType
    };
  }
};

/**
 * Signs in user with email & password, cleanly handles verification status,
 * and returns structured result without throwing unhandled console errors.
 */
export const signInWithEmail = async (
  email: string, 
  pass: string
): Promise<SignInResult> => {
  const cleanEmail = email.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const user = userCredential.user;

    // Reload user to get newest verification status from Google servers
    await user.reload();

    if (!user.emailVerified) {
      return { success: false, isUnverified: true, email: cleanEmail };
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

    return { success: true, user, profile };
  } catch (err: any) {
    const parsed = mapAuthError(err);
    return {
      success: false,
      isUnverified: false,
      errorCode: err?.code || 'AUTH_ERROR',
      message: parsed.message,
      actionType: parsed.actionType
    };
  }
};

/**
 * Resends the official verification link email
 */
export const resendVerificationEmail = async (email?: string, pass?: string): Promise<void> => {
  if (auth.currentUser) {
    await sendEmailVerification(auth.currentUser);
    return;
  }
  
  if (email && pass) {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    await sendEmailVerification(cred.user);
    return;
  }

  if (email) {
    await sendPasswordResetEmail(auth, email.trim());
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
      throw new Error('Google Sign-In on Android requires configuring Google OAuth in the Firebase Console. You can sign in immediately using your Email and Password above.');
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
 * Signs in user with Google ID Token credential (for Native Android/iOS AuthSession)
 */
export const signInWithGoogleCredential = async (idToken: string): Promise<{ user: FirebaseUser; profile: UserProfile }> => {
  const credential = GoogleAuthProvider.credential(idToken);
  const userCredential = await signInWithCredential(auth, credential);
  const user = userCredential.user;

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
