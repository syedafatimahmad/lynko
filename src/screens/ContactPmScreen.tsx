import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export default function ContactPmScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.title}>Contact PM</Text>
          <Text style={styles.subtitle}>Direct line to Project Manager</Text>
        </View>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="settings-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AS</Text>
          </View>
          
          <Text style={styles.name}>Ali Saleh</Text>
          <Text style={styles.role}>Project Manager • Alpha Environmental</Text>
          
          <Text style={styles.phone}>📞 214-994-9874</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.button, styles.callButton]}>
              <Ionicons name="call" size={20} color={colors.onPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Call PM</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.emailButton]}>
              <Ionicons name="mail" size={20} color={colors.onPrimary} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Email PM</Text>
            </TouchableOpacity>
          </View>
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
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#1e293b', // slate-800
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 4,
  },
  role: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  phone: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primaryContainer,
    marginBottom: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 16,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '600',
  },
});
