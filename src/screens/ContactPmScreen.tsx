import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import { colors } from '../theme/colors';

const PM_NAME = 'Ali Saleh';
const PM_PHONE = '214-994-9874';
const PM_PHONE_RAW = '2149949874';
const PM_EMAIL = 'thelynkoapp@gmail.com';
const PM_ADDRESS = '539 W Commerce St, #4070 Dallas, TX 75208';

export default function ContactPmScreen({ navigation }: any) {
  const handleCall = async () => {
    const url = `tel:${PM_PHONE_RAW}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Unable to Place Call',
          `Direct phone dialing is not supported on this device/simulator.\n\nProject Manager Phone:\n${PM_PHONE}`
        );
      }
    } catch (err) {
      Alert.alert('Phone Call', `Could not open dialer. Please call: ${PM_PHONE}`);
    }
  };

  const handleEmail = async () => {
    const subject = `Lynko Field Inquiry - Attn: ${PM_NAME}`;
    const body = `Hello Ali,\n\nI am contacting you regarding a Lynko inspection project.\n\nField Inspector: `;
    try {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [PM_EMAIL],
          subject,
          body,
        });
        return;
      }
    } catch (e) {}

    // Fallback to mailto link via Linking
    const mailtoUrl = `mailto:${PM_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    try {
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert(
          'Email Client Unavailable',
          `Native email composer is not configured on this device.\n\nPlease email: ${PM_EMAIL}`
        );
      }
    } catch (e) {
      Alert.alert('Email PM', `Please send an email to: ${PM_EMAIL}`);
    }
  };

  const handleSms = async () => {
    const url = `sms:${PM_PHONE_RAW}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('SMS Unavailable', `SMS is not supported on this device.\n\nPhone: ${PM_PHONE}`);
      }
    } catch (err) {
      Alert.alert('Text PM', `Please send a text to: ${PM_PHONE}`);
    }
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      navigation.navigate('Projects');
    }
  };

  const handleSettings = () => {
    navigation.navigate('More');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Contact PM</Text>
          <Text style={styles.subtitle}>Direct line to Project Manager</Text>
        </View>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={handleSettings}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AS</Text>
          </View>
          
          <Text style={styles.name}>{PM_NAME}</Text>
          <Text style={styles.role}>Project Manager • Lynko Field Ops</Text>

          {/* Contact Details List */}
          <View style={styles.infoContainer}>
            <TouchableOpacity style={styles.infoRow} onPress={handleCall} activeOpacity={0.7}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="call" size={18} color={colors.primaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>DIRECT PHONE</Text>
                <Text style={styles.infoValue}>{PM_PHONE}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.infoRow} onPress={handleEmail} activeOpacity={0.7}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="mail" size={18} color={colors.primaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>EMAIL ADDRESS</Text>
                <Text style={styles.infoValue}>{PM_EMAIL}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.outline} />
            </TouchableOpacity>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.infoIconWrapper}>
                <Ionicons name="business" size={18} color={colors.primaryContainer} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>OFFICE / DISPATCH</Text>
                <Text style={styles.infoValueSub}>{PM_ADDRESS}</Text>
              </View>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.callButton]} 
              onPress={handleCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={20} color={colors.onPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Call PM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.emailButton]} 
              onPress={handleEmail}
              activeOpacity={0.8}
            >
              <Ionicons name="mail" size={20} color={colors.onPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Email PM</Text>
            </TouchableOpacity>
          </View>

          {/* Quick SMS Button */}
          <TouchableOpacity 
            style={styles.smsButton} 
            onPress={handleSms}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primaryContainer} style={styles.buttonIcon} />
            <Text style={styles.smsButtonText}>Send SMS / Text Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: {
    padding: 8,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondary,
  },
  container: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1e293b', // slate-800
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: colors.primaryContainer,
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 2,
  },
  role: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
  },
  infoContainer: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  infoIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  infoValueSub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
    marginBottom: 10,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  callButton: {
    backgroundColor: colors.primaryContainer,
  },
  emailButton: {
    backgroundColor: '#1e293b', // slate-800
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  smsButton: {
    width: '100%',
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
  },
  smsButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
