import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuthStore } from '../store/authStore';
import { useLynkoStore, SubmissionRecord } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generatePDF } from '../utils/pdfGenerator';
import { mailOutcome } from '../utils/mailOutcome';
import { sampleError } from '../utils/sampleValidation';

export default function SubmitCoCScreen({ route, navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const samples = useLynkoStore((state) => state.samples);
  const recipientHistory = useLynkoStore((state) => state.recipientHistory);
  const addRecipientEmail = useLynkoStore((state) => state.addRecipientEmail);
  const addSubmission = useLynkoStore((state) => state.addSubmission);

  const activeProjectId = useLynkoStore(state => state.activeProjectId);
  const project = useLynkoStore(state => state.projects.find(p => p.id === state.activeProjectId));
  const sendingRef = useRef(false);
  const totalSamplePhotos = samples.reduce((acc, s) => acc + (s.photoUris?.length || 0), 0);

  const buildDefaultMessage = () => {
    let msg = `Hello,\n\nPlease find attached the Chain of Custody document and project inspection details for PO #${cocData.poNumber || '47674'}.\n\nTotal Samples: ${samples.length}\nDate: ${cocData.samplingDate || new Date().toLocaleDateString()}\nSampled By: ${cocData.sampledBy || user?.displayName || 'Ali Saleh'}`;

    msg += `\n\nThank you,\nLynko Inspection Team`;
    return msg;
  };

  const initialRecipient = route?.params?.prefillRecipient || (recipientHistory.length > 0 ? recipientHistory[0] : '');
  const [recipientEmail, setRecipientEmail] = useState(initialRecipient);
  const [subject, setSubject] = useState(
    route?.params?.prefillSubject || `Chain of Custody - ${cocData.poNumber ? `PO #${cocData.poNumber}` : 'Lynko Inspection'}`
  );
  const [message, setMessage] = useState(buildDefaultMessage());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (route?.params?.prefillRecipient) {
      setRecipientEmail(route.params.prefillRecipient);
    }
  }, [route?.params?.prefillRecipient]);

  const handleSend = async () => {
    if (sendingRef.current) return;
    const cleanTo = recipientEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanTo)) {
      Alert.alert('Recipient email', 'Enter a valid email address for the lab or client.');
      return;
    }
    if (!project || !activeProjectId || samples.length === 0) {
      Alert.alert('Choose a project', 'Open a project with samples before preparing its email.');
      return;
    }
    for (const sample of samples) {
      const error = sampleError(sample, samples, project.projectType === 'Mold');
      if (error) { Alert.alert('Review sample ' + sample.name, error); return; }
    }
    sendingRef.current = true;
    setSending(true);
    try {
      const pdfUri = await generatePDF(project, cocData, samples);
      if (!pdfUri) throw new Error('Could not generate the Chain of Custody PDF.');
      if (!await MailComposer.isAvailableAsync()) {
        Alert.alert('Set up an email app', 'Configure an email account on this device, then try again. You can also share the PDF separately.', [
          { text: 'OK' },
          { text: 'Share PDF', onPress: async () => {
            try { if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdfUri); }
            catch { Alert.alert('Share unavailable', 'Please try again.'); }
          } },
        ]);
        return;
      }
      const attachments = [pdfUri];
      const manifest: string[] = [];
      let attachedPhotos = 0;
      if (cocData.attachPhotosToEmail !== false) {
        if (!FileSystem.cacheDirectory) throw new Error('Attachment storage is unavailable.');
        const directory = FileSystem.cacheDirectory + 'email_' + Date.now() + '/';
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        for (const [index, sample] of samples.entries()) {
          const photos = sample.photoUris || (sample.photoUri ? [sample.photoUri] : []);
          const names: string[] = [];
          for (const [photoIndex, uri] of photos.entries()) {
            const info = await FileSystem.getInfoAsync(uri);
            if (!info.exists) throw new Error('A photo for ' + sample.name + ' is missing on this device. Add it again or turn off photo attachments.');
            const extension = uri.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]{2,5})$/)?.[1] || 'jpg';
            const name = 'Sample_' + (index + 1) + '_' + sample.name.replace(/[^a-zA-Z0-9_-]/g, '_') + '_Photo_' + (photoIndex + 1) + '.' + extension;
            const destination = directory + name;
            await FileSystem.copyAsync({ from: uri, to: destination });
            attachments.push(destination); names.push(name); attachedPhotos++;
          }
          if (names.length) manifest.push(sample.name + ': ' + names.join(', '));
        }
      }
      let totalBytes = 0;
      for (const uri of attachments) {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.isDirectory) throw new Error('An attachment is missing. Please prepare the email again.');
        totalBytes += info.size;
      }
      // Leave headroom for MIME encoding and mail-provider limits; never silently omit evidence.
      if (totalBytes > 15 * 1024 * 1024) {
        Alert.alert('Attachments are too large', 'These attachments exceed the 15 MB email limit used by Lynko. Turn off photo attachments to email the PDF, and send the photos separately. Your originals remain saved.');
        return;
      }
      const result = await MailComposer.composeAsync({ recipients: [cleanTo], subject, attachments,
        body: message + (manifest.length ? '\n\nAttached sample photos:\n' + manifest.join('\n') : ''),
      });
      const outcome = mailOutcome(Platform.OS, result.status);
      if (outcome === 'cancelled' || outcome === 'saved') {
        Alert.alert(outcome === 'cancelled' ? 'Email cancelled' : 'Email saved as a draft', 'The project has not been marked as submitted.');
        return;
      }
      const submissionRecord: SubmissionRecord = {
        id: Date.now() + '_' + Math.random().toString(36).slice(2, 8), projectId: activeProjectId,
        poNumber: cocData.poNumber, projectTitle: cocData.description, recipientEmail: cleanTo,
        senderEmail: '', subject, submittedAt: new Date().toLocaleString(),
        samplesCount: samples.length, photosCount: attachedPhotos, pdfUri,
        status: outcome === 'sent' ? 'Dispatched' : 'Email Ready',
        turnaround: cocData.turnaround1, analysisType: project.projectType,
      };
      await addSubmission(submissionRecord);
      void addRecipientEmail(cleanTo);
      Alert.alert(outcome === 'sent' ? 'Email sent' : 'Opened in email app',
        outcome === 'sent' ? 'Your email app reports that the message was sent. Delivery is not confirmed.'
          : 'Complete sending in your email app. Lynko cannot confirm whether the email was sent; this project is marked Email ready.',
        [{ text: 'View projects', onPress: () => navigation.navigate('AppTabs', { screen: 'Projects' }) }]);
    } catch (error: any) {
      Alert.alert('Email not completed', error?.message || 'Please try again.');
    } finally { sendingRef.current = false; setSending(false); }
  };

  const handleQuickPreview = async () => {
    try {
      const pdfUri = await generatePDF(null, cocData, samples);
      if (pdfUri && Platform.OS !== 'web') {
        await Print.printAsync({ uri: pdfUri });
      }
    } catch (err: any) {
      console.error('Error previewing PDF:', err);
      Alert.alert('Notice', 'Could not open PDF preview.');
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
          <Text style={styles.cardLabel}>EMAIL ACCOUNT</Text>
          <View style={styles.senderRow}>
            <Ionicons name="person-circle" size={22} color={colors.primaryContainer} style={{ marginRight: 8 }} />
            <Text style={styles.senderEmail}>Your email app chooses the sending account</Text>
          </View>
        </View>

        {/* Card 2: Recipient Email & History */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>TO (RECIPIENT LAB / CLIENT EMAIL)</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={colors.outline} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.input}
              placeholder="e.g. info@lynko.app"
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

        {/* Card 4: Email Photo Attachment Toggle */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.onSurface }}>Attach Sample Photos to Email</Text>
              <Text style={{ fontSize: 12, color: colors.secondary, marginTop: 2 }}>
                {cocData.attachPhotosToEmail !== false
                  ? `Includes ${totalSamplePhotos} sample photo(s) labeled by Sample ID as standalone email attachments.`
                  : 'Photos excluded from email (remains saved in local project data).'}
              </Text>
            </View>
            <Switch
              value={cocData.attachPhotosToEmail !== false}
              onValueChange={(val: boolean) => updateCoCData({ attachPhotosToEmail: val })}
              trackColor={{ true: colors.primaryContainer, false: '#CBD5E1' }}
            />
          </View>
        </View>

        {/* Card 5: Attachment Preview Badge */}
        <View style={styles.attachmentCard}>
          <View style={styles.attachmentInfo}>
            <Ionicons name="document-text" size={28} color={colors.primaryContainer} />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.attachmentName}>ChainOfCustody_{cocData.poNumber || '47674'}.pdf</Text>
              <Text style={styles.attachmentSize}>
                {samples.length} Samples • {cocData.attachPhotosToEmail === false ? 0 : totalSamplePhotos} Sample Photo(s) Attached
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
          activeOpacity={0.8}
        >
          {sending ? (
            <View style={styles.sendButtonContent}>
              <ActivityIndicator color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>Preparing PDF & Opening Email...</Text>
            </View>
          ) : (
            <View style={styles.sendButtonContent}>
              <Ionicons name="send" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.sendButtonText}>Open email with PDF</Text>
            </View>
          )}
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
