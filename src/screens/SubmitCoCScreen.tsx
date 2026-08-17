import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generatePDF } from '../utils/pdfGenerator';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export default function SubmitCoCScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const cocData = useLynkoStore((state) => state.cocData);
  const samples = useLynkoStore((state) => state.samples);
  const recipientHistory = useLynkoStore((state) => state.recipientHistory);
  const addRecipientEmail = useLynkoStore((state) => state.addRecipientEmail);

  const defaultTo = recipientHistory.length > 0 ? recipientHistory[0] : 'info@alphaenvironmental.us';
  const [recipientEmail, setRecipientEmail] = useState(defaultTo);
  const [subject, setSubject] = useState(`Chain of Custody - ${cocData.poNumber || 'New Inspection'}`);
  const [message, setMessage] = useState(
`Hello,

Please find attached the official Chain of Custody for PO #${cocData.poNumber || 'N/A'} (${cocData.description || 'Inspection Project'}).

This document includes:
• Complete Sample Log (${samples.length} samples)
• Project Site Photos Appendix (${(cocData.photos || []).length} photos attached)
• Digital Courier Signature

Sampled By: ${cocData.sampledBy || 'Field Inspector'}
Sampling Date: ${cocData.samplingDate || new Date().toLocaleDateString()}

Best regards,
${user?.displayName || user?.email?.split('@')[0] || 'Field Inspector'}`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const cleanTo = recipientEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!cleanTo || !emailRegex.test(cleanTo)) {
      Alert.alert('Invalid Email', 'Please enter a valid recipient email address.');
      return;
    }

    setSending(true);
    try {
      // Save recipient into persistent history
      await addRecipientEmail(cleanTo);

      // Generate the official PDF
      const pdfUri = await generatePDF(null, cocData, samples);
      
      if (!pdfUri) {
        Alert.alert('Error', 'Failed to generate PDF. Please check your data and try again.');
        setSending(false);
        return;
      }

      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: [cleanTo],
          subject: subject,
          body: message,
          attachments: [pdfUri],
        });
      } else {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: subject,
          UTI: '.pdf',
        });
      }

      Alert.alert(
        'Chain of Custody Ready',
        `Dispatched to ${cleanTo}. Your submission has been recorded.`,
        [{ text: 'OK', onPress: () => navigation.navigate('AppTabs') }]
      );
    } catch (err: any) {
      console.error('Error sending CoC:', err);
      Alert.alert('Notice', err.message || 'Action completed.');
    } finally {
      setSending(false);
    }
  };

  const handleQuickPreview = async () => {
    const pdfUri = await generatePDF(null, cocData, samples);
    if (pdfUri) {
      await Sharing.shareAsync(pdfUri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Submit Chain of Custody</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Card 1: Sender Context */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>FROM (AUTHENTICATED GOOGLE SENDER)</Text>
          <View style={styles.senderRow}>
            <Ionicons name="logo-google" size={18} color="#4285F4" style={{ marginRight: 8 }} />
            <Text style={styles.senderEmail}>{user?.email || 'inspector@gmail.com'}</Text>
          </View>
        </View>

        {/* Card 2: Recipient Email & History */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TO (RECIPIENT LAB / CLIENT EMAIL)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={colors.outline} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. info@alphaenvironmental.us"
              value={recipientEmail}
              onChangeText={setRecipientEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          {recipientHistory.length > 0 && (
            <View style={styles.historyContainer}>
              <Text style={styles.historyTitle}>Recent Recipients:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {recipientHistory.map((email, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.chip, recipientEmail.toLowerCase() === email.toLowerCase() && styles.chipActive]}
                    onPress={() => setRecipientEmail(email)}
                  >
                    <Text style={[styles.chipText, recipientEmail.toLowerCase() === email.toLowerCase() && styles.chipTextActive]}>
                      {email}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Card 3: Subject & Body */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>SUBJECT</Text>
          <TextInput
            style={[styles.input, styles.subjectInput]}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={[styles.cardLabel, { marginTop: 14 }]}>MESSAGE BODY</Text>
          <TextInput
            style={[styles.input, styles.messageInput]}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Card 4: Document Attachment Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>ATTACHED INSPECTION DOCUMENT</Text>
          <View style={styles.attachmentBox}>
            <View style={styles.attachmentIconBox}>
              <Ionicons name="document-text" size={28} color={colors.primaryContainer} />
            </View>
            <View style={styles.attachmentDetails}>
              <Text style={styles.attachmentTitle}>ChainOfCustody_{cocData.poNumber || 'Report'}.pdf</Text>
              <Text style={styles.attachmentSubtitle}>
                {samples.length} Samples Logged • {(cocData.photos || []).length} Site Photos (8/page)
              </Text>
            </View>
            <TouchableOpacity style={styles.previewIconBtn} onPress={handleQuickPreview}>
              <Ionicons name="eye-outline" size={20} color={colors.primaryContainer} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} disabled={sending}>
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={styles.sendButtonContent}>
              <Ionicons name="send" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>Send Chain of Custody</Text>
            </View>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  cardLabel: { fontSize: 11, fontWeight: '700', color: colors.secondary, marginBottom: 8, letterSpacing: 0.5 },
  senderRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0' },
  senderEmail: { fontSize: 14, fontWeight: '600', color: colors.onSurface },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, backgroundColor: colors.surfaceContainerLowest },
  input: { flex: 1, paddingVertical: 10, fontSize: 14, color: colors.onSurface },
  historyContainer: { marginTop: 12 },
  historyTitle: { fontSize: 12, fontWeight: '600', color: colors.secondary, marginBottom: 6 },
  chipsRow: { gap: 6, paddingVertical: 2 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#E6F8F7', borderColor: colors.primaryContainer },
  chipText: { fontSize: 12, color: colors.onSurfaceVariant, fontWeight: '500' },
  chipTextActive: { color: colors.primaryContainer, fontWeight: '700' },
  subjectInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14 },
  messageInput: { minHeight: 120, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, lineHeight: 18 },
  attachmentBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  attachmentIconBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#E6F8F7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  attachmentDetails: { flex: 1 },
  attachmentTitle: { fontSize: 14, fontWeight: 'bold', color: colors.onSurface },
  attachmentSubtitle: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  previewIconBtn: { padding: 8 },
  sendButton: { backgroundColor: colors.primaryContainer, height: 50, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: colors.primaryContainer, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
  sendButtonContent: { flexDirection: 'row', alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
