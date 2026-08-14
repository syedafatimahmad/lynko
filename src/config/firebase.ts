import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: "AIzaSyAHTiXUqTDj60F9d7aPOjIlCYtg2cZv3yM",
  authDomain: "lynko-e42be.firebaseapp.com",
  projectId: "lynko-e42be",
  storageBucket: "lynko-e42be.firebasestorage.app",
  messagingSenderId: "630479584378",
  appId: "1:630479584378:web:ec0fd16230704b337f8fc3"
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
