import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || Buffer.from('QUl6YVN5QTdUeG5pajc5NWU5UlhSN19GZHJlbzc2NGd6V2VJNk93', 'base64').toString('ascii'),
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "lynko-e42be.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "lynko-e42be",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "lynko-e42be.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "630479584378",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:630479584378:web:ec0fd16230704b337f8fc3"
};

const app = initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
}

export const db = getFirestore(app);
export { auth };
