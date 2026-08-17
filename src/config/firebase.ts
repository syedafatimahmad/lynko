import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const decodeBase64 = (str: string) => {
  try {
    if (typeof atob !== 'undefined') {
      return atob(str);
    }
  } catch {}
  return 'AIzaSyA7Txnij795e9RXR7_Fdreo764gzWeI6Ow';
};

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || decodeBase64('QUl6YVN5QTdUeG5pajc5NWU5UlhSN19GZHJlbzc2NGd6V2VJNk93'),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "lynko-e42be.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "lynko-e42be",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "lynko-e42be.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "630479584378",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:630479584378:web:ec0fd16230704b337f8fc3"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
    // Dynamically require React Native persistence to eliminate RN persistence warning
    // and satisfy TypeScript public web typings
    const authModule = require('firebase/auth');
    const getRNPersistence = authModule.getReactNativePersistence;
    
    if (typeof getRNPersistence === 'function') {
      auth = initializeAuth(app, {
        persistence: getRNPersistence(AsyncStorage)
      });
    } else {
      auth = getAuth(app);
    }
  } catch (e) {
    auth = getAuth(app);
  }
}

export { auth };
export const db = getFirestore(app);
