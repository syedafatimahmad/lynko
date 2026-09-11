import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

declare const process: any;

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDTwKmQx9NLiC9sHSutYoNe5sw5m3wd340",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "lynko-797df.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "lynko-797df",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "lynko-797df.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "12808282527",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:12808282527:web:9bf5cccc9e9fd2d6a7ddaa"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let auth: ReturnType<typeof getAuth>;

if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  try {
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
