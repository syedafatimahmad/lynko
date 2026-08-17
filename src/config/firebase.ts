import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

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

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
