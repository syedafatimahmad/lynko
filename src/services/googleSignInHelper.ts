import { Platform, TurboModuleRegistry } from 'react-native';

let GoogleSigninInstance: any = null;
let statusCodesInstance: any = {
  SIGN_IN_CANCELLED: '12501',
  IN_PROGRESS: '12502',
  PLAY_SERVICES_NOT_AVAILABLE: '12500',
  SIGN_IN_REQUIRED: '4',
};

/**
 * Checks if the native RNGoogleSignin module is registered in the current binary.
 * In Expo Go, this returns false because custom native modules are not precompiled.
 * In Development Builds / APKs, this returns true.
 */
export const isNativeGoogleSigninAvailable = (): boolean => {
  if (Platform.OS === 'web') return false;
  try {
    if (typeof TurboModuleRegistry !== 'undefined' && TurboModuleRegistry.get) {
      return TurboModuleRegistry.get('RNGoogleSignin') != null;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Lazily loads GoogleSignin only if the native binary supports it.
 */
export const getGoogleSignin = () => {
  if (!GoogleSigninInstance && isNativeGoogleSigninAvailable()) {
    try {
      // Dynamic require avoids TurboModuleRegistry.getEnforcing crash at startup in Expo Go
      const module = require('@react-native-google-signin/google-signin');
      GoogleSigninInstance = module.GoogleSignin;
      if (module.statusCodes) {
        statusCodesInstance = module.statusCodes;
      }
    } catch (e) {
      console.warn('RNGoogleSignin could not be loaded:', e);
    }
  }
  return GoogleSigninInstance;
};

export const getStatusCodes = () => statusCodesInstance;

export const configureGoogleSignin = (webClientId: string) => {
  const gSignin = getGoogleSignin();
  if (gSignin) {
    try {
      gSignin.configure({
        webClientId,
        offlineAccess: false,
      });
    } catch (e) {
      console.warn('GoogleSignin configure warning:', e);
    }
  }
};
