import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore, SubmissionRecord } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generatePDF } from '../utils/emailDispatcher';

export default function SubmitCoCScreen({ route, navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const cocData = useLynkoStore((state) => state.cocData);
  const samples = useLynkoStore((state) => state.samples);
  const recipientHistory = useLynkoStore((state) => state.recipientHistory);
  const addRecipientEmail = useLynkoStore((state) => state.addRecipientEmail);
  const addSubmission = useLynkoStore((state) => state.addSubmission);

  const initialRecipient = route?.params?.prefillRecipient || (recipientHistory.length > 0 ? recipientHistory[0] : '');
  const [recipientEmail, setRecipientEmail] = useState(initialRecipient);
  const [subject, setSubject] = useState(
    route?.params?.prefillSubject || `Chain of Custody - ${cocData.poNumber ? `PO #${cocData.poNumber}` : 'Alpha Environmental Inspection'}`
  );
  const [message, setMessage] = useState(
    `Hello,\n\nPlease find attached the Chain of Custody document and project inspection details for PO #${cocData.poNumber || '47674'}.\n\nTotal Samples: ${samples.length}\nDate: ${cocData.samplingDate || new Date().toLocaleDateString()}\nSampled By: ${cocData.sampledBy || user?.displayName || 'Ali Saleh'}\n\nThank you,\nAlpha Environmental Inspection Team`
  );
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (route?.params?.prefillRecipient) {
      setRecipientEmail(route.params.prefillRecipient);
    }
  }, [route?.params?.prefillRecipient]);

  const handleSend = async () => {
    const cleanTo = recipientEmail.trim();
    if (!cleanTo) {
      Alert.alert('Missing Recipient', 'Please enter a valid recipient email address.');
      return;
    }

    setSending(true);
    try {
      await addRecipientEmail(cleanTo);

      const pdfUri = await generatePDF(null, cocData, samples);
      if (!pdfUri) {
        Alert.alert('Error', 'Failed to generate Chain of Custody PDF.');
        setSending(false);
        return;
      }

      // 1. Dispatch Email via MailComposer or native Share
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

      // 2. Record Verified Submission into Store & Firestore Archive
      const submissionRecord: SubmissionRecord = {
        id: `${Date.now()}_${cocData.poNumber || 'sub'}`,
        poNumber: cocData.poNumber || 'N/A',
        projectTitle: cocData.description || 'Field Inspection CoC',
        recipientEmail: cleanTo,
        senderEmail: user?.email || '',
        subject: subject,
        submittedAt: `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        samplesCount: samples.length,
        photosCount: (cocData.photos || []).length,
        status: 'Dispatched',
        pdfUri: pdfUri,
        turnaround: cocData.turnaround1 || 'Next-day rush',
        analysisType: cocData.analysis1 || 'Asbestos PLM',
      };

      await addSubmission(submissionRecord);

      // 3. User Success Confirmation
      Alert.alert(
        'Chain of Custody Dispatched',
        `Dispatched to ${cleanTo}. Your submission has been securely recorded and archived in your Submissions History.`,
        [
          { 
            text: 'View Submissions Log', 
            onPress: () => navigation.replace('SubmittedCoC') 
          },
          { 
            text: 'Done', 
            onPress: () => navigation.navigate('AppTabs') 
          }
        ]
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
          <Text style={styles.cardLabel}>FROM (AUTHENTICATED SENDER)</Text>
          <View style={styles.senderRow}>
            <Ionicons name="person-circle" size={22} color={colors.primaryContainer} style={{ marginRight: 8 }} />
            <Text style={styles.senderEmail}>{user?.email || 'inspector@alphaenvironmental.us'}</Text>
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
                    style={[styles.chip, recipientEmail === email && styles.chipActive]}
                    onPress={() => setRecipientEmail(email)}
                  >
                    <Text style={[styles.chipText, recipientEmail === email && styles.chipTextActive]}>
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
          <Text style={styles.cardLabel}>EMAIL SUBJECT</Text>
          <TextInput
            style={styles.subjectInput}
            value={subject}
            onChangeText={setSubject}
          />

          <Text style={[styles.cardLabel, { marginTop: 14 }]}>MESSAGE BODY</Text>
          <TextInput
            style={styles.bodyInput}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* Card 4: Attachment Preview Badge */}
        <View style={styles.attachmentCard}>
          <View style={styles.attachmentInfo}>
            <Ionicons name="document-text" size={28} color={colors.primaryContainer} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.attachmentName}>ChainOfCustody_{cocData.poNumber || '47674'}.pdf</Text>
              <Text style={styles.attachmentSize}>
                {samples.length} Samples • {(cocData.photos || []).length} Site Photos Attached
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.previewBtn} onPress={handleQuickPreview}>
            <Ionicons name="eye-outline" size={18} color={colors.primaryContainer} style={{ marginRight: 4 }} />
            <Text style={styles.previewBtnText}>Preview</Text>
          </TouchableOpacity>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <View style={styles.sendButtonContent}>
              <Ionicons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>Send Chain of Custody</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.viewHistoryLink} 
          onPress={() => navigation.navigate('SubmittedCoC')}
        >
          <Ionicons name="time-outline" size={16} color={colors.primaryContainer} style={{ marginRight: 6 }} />
          <Text style={styles.viewHistoryLinkText}>View Past Submitted CoCs</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backButton: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  scrollContent: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLabel: { fontSize: 11, fontWeight: 'bold', color: colors.secondary, marginBottom: 8, letterSpacing: 0.5 },
  senderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  senderEmail: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    height: 48,
  },
  input: { flex: 1, fontSize: 15, color: colors.onSurface },
  historyContainer: { marginTop: 12 },
  historyTitle: { fontSize: 12, color: colors.secondary, marginBottom: 6, fontWeight: '600' },
  chipsRow: { flexDirection: 'row', gap: 8, paddingBottom: 2 },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#E6F8F7',
    borderColor: colors.primaryContainer,
  },
  chipText: { fontSize: 12, color: colors.secondary, fontWeight: '500' },
  chipTextActive: { color: colors.primary, fontWeight: '700' },
  subjectInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  bodyInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.onSurface,
    minHeight: 120,
  },
  attachmentCard: {
    backgroundColor: '#E6F8F7',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#b2ebe5',
  },
  attachmentInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  attachmentName: { fontSize: 14, fontWeight: 'bold', color: colors.onSurface },
  attachmentSize: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
  },
  previewBtnText: { fontSize: 12, fontWeight: '600', color: colors.primaryContainer },
  sendButton: {
    backgroundColor: colors.primaryContainer,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: { opacity: 0.6 },
  sendButtonContent: { flexDirection: 'row', alignItems: 'center' },
  sendButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  viewHistoryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  viewHistoryLinkText: {
    color: colors.primaryContainer,
    fontSize: 14,
    fontWeight: '600',
  },
});
