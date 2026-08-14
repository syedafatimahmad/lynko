import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, SafeAreaView, Platform, Switch, Alert } from 'react-native';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generatePDF } from '../utils/pdfGenerator';
import SignatureModal from '../components/SignatureModal';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as MailComposer from 'expo-mail-composer';

export default function ChainOfCustodyScreen({ navigation }: any) {
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const samples = useLynkoStore((state) => state.samples);
  const [showSignature, setShowSignature] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);

  const handleSaveSignature = (sig: string) => {
    updateCoCData({ inspectorSignature: sig });
    setShowSignature(false);
  };

  const handleSubmit = async () => {
    if (!cocData.poNumber || !cocData.description || !cocData.zipCode) {
      Alert.alert('Missing Information', 'Please provide PO number, Description, and Zipcode.');
      return;
    }
    if (!cocData.sampledBy) {
      Alert.alert('Missing Information', 'Please provide the Contact (Sampled by).');
      return;
    }
    if (samples.length === 0) {
      Alert.alert('Missing Information', 'Please add at least one sample in the Edit Samples screen.');
      return;
    }
    if (!cocData.inspectorSignature) {
      Alert.alert('Missing Information', 'Please provide a Courier Signature.');
      return;
    }
    
    // Validation passed
    const uri = await generatePDF(null, cocData, samples);
    if (uri) {
      const isAvailable = await MailComposer.isAvailableAsync();
      if (isAvailable) {
        await MailComposer.composeAsync({
          recipients: ['info@alphaenvironmental.us'],
          subject: `Chain of Custody - ${cocData.poNumber}`,
          body: 'Please find the attached Chain of Custody PDF.',
          attachments: [uri],
        });
      } else {
        await Sharing.shareAsync(uri);
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chain of Custody</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="settings-outline" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.projectContext}>PO #: {cocData.poNumber || 'New'} • {cocData.accountInfo || 'Alpha Environmental'}</Text>
        
        {/* Card 1: Project Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Info</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Mold & Asbestos Inspection" 
              value={cocData.description} 
              onChangeText={(text) => updateCoCData({ description: text })} 
            />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>PO #</Text>
              <TextInput 
                style={styles.input} 
                placeholder="PO-99482"
                value={cocData.poNumber} 
                onChangeText={(text) => updateCoCData({ poNumber: text })} 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Zipcode</Text>
              <TextInput 
                style={styles.input} 
                placeholder="75208"
                value={cocData.zipCode} 
                onChangeText={(text) => updateCoCData({ zipCode: text })} 
              />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Sampling date</Text>
              <TextInput 
                style={styles.input} 
                value={cocData.samplingDate} 
                onChangeText={(text) => updateCoCData({ samplingDate: text })} 
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Sampling time</Text>
              <TextInput 
                style={styles.input} 
                value={cocData.samplingTime} 
                onChangeText={(text) => updateCoCData({ samplingTime: text })} 
              />
            </View>
          </View>
        </View>

        {/* Card 2: Contact Info */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Contact Info</Text>
            <TouchableOpacity onPress={() => setIsEditingContacts(!isEditingContacts)}>
              <Text style={styles.linkText}>{isEditingContacts ? "Done" : "Edit Contacts"}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.infoBox}>
            {isEditingContacts ? (
              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.label}>Account</Text>
                  <TextInput style={styles.input} value={cocData.accountInfo} onChangeText={t => updateCoCData({ accountInfo: t })} />
                </View>
                <View>
                  <Text style={styles.label}>Contacts</Text>
                  <TextInput style={styles.input} value={cocData.contactName} onChangeText={t => updateCoCData({ contactName: t })} />
                </View>
                <View>
                  <Text style={styles.label}>Address</Text>
                  <TextInput style={styles.input} value={cocData.contactAddress} onChangeText={t => updateCoCData({ contactAddress: t })} />
                </View>
                <View>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput style={styles.input} value={cocData.contactPhone} onChangeText={t => updateCoCData({ contactPhone: t })} />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Account</Text><Text style={styles.infoValue}>{cocData.accountInfo || 'None'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Contacts</Text><Text style={styles.infoValue}>{cocData.contactName || 'None'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Address</Text><Text style={[styles.infoValue, {flex:1, textAlign:'right'}]}>{cocData.contactAddress || 'None'}</Text></View>
                <View style={styles.infoRow}><Text style={styles.infoLabel}>Phone</Text><Text style={styles.infoValue}>{cocData.contactPhone || 'None'}</Text></View>
              </>
            )}
          </View>
          
          <View style={[styles.inputGroup, {marginTop: 16}]}>
            <Text style={styles.label}>Sampled by</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Enter name"
              value={cocData.sampledBy} 
              onChangeText={t => updateCoCData({ sampledBy: t })} 
            />
          </View>
        </View>

        {/* Card 4: Samples */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Samples</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditSamples')}>
              <Text style={styles.linkText}>Edit Samples &gt;</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.samplesBox} onPress={() => navigation.navigate('EditSamples')}>
            <View>
              <Text style={styles.samplesBoxTitle}>{samples.length} Logged Samples</Text>
              <Text style={styles.samplesBoxSubtitle}>Asbestos PLM • Next-day rush</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={colors.secondary} />
          </TouchableOpacity>
        </View>

        {/* Card 5: Review & Submit */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Review and Submit</Text>
          
          <TouchableOpacity style={styles.signButton} onPress={() => setShowSignature(true)}>
            <Ionicons name="pencil" size={20} color={colors.primaryContainer} style={{marginRight: 8}} />
            <Text style={styles.signButtonText}>
              {cocData.inspectorSignature ? 'Edit Courier Signature' : 'Add Courier Signature'}
            </Text>
          </TouchableOpacity>
          {cocData.inspectorSignature && (
            <Image source={{ uri: cocData.inspectorSignature }} style={styles.signatureImage} />
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Resampling notification:</Text>
            <Text style={styles.infoValue}>None</Text>
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, styles.underline]}>I have read and agree to the Terms of Service</Text>
            <Switch value={tosAgreed} onValueChange={setTosAgreed} trackColor={{ true: colors.primaryContainer }} />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Save as template for future projects</Text>
            <Switch value={saveTemplate} onValueChange={setSaveTemplate} trackColor={{ true: colors.primaryContainer }} />
          </View>
        </View>
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.previewButton]}
            onPress={async () => {
              const uri = await generatePDF(null, cocData, samples);
              if (uri) {
                await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
              }
            }}
          >
            <Text style={styles.previewButtonText}>Preview CoC</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.submitButton]}
            onPress={handleSubmit}
          >
            <Text style={styles.submitButtonText}>Submit CoC</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {showSignature && (
        <SignatureModal
          visible={showSignature}
          onOK={handleSaveSignature}
          onCancel={() => setShowSignature(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 24 : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, height: 64, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, zIndex: 50 },
  iconButton: { padding: 8, borderRadius: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.onSurface },
  scrollContent: { padding: 16, paddingBottom: 100 },
  projectContext: { fontSize: 14, color: colors.secondary, fontWeight: '500', marginBottom: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 12 },
  linkText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 14 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.onSurface },
  row: { flexDirection: 'row' },
  infoBox: { backgroundColor: '#F1F5F9', borderRadius: 4, padding: 12, gap: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { color: colors.secondary, fontWeight: '500', fontSize: 14 },
  infoValue: { color: colors.onSurface, fontWeight: '600', fontSize: 14 },
  samplesBox: { backgroundColor: '#F1F5F9', borderRadius: 8, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  samplesBoxTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  samplesBoxSubtitle: { fontSize: 14, color: colors.secondary, marginTop: 2 },
  signButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E6F8F7', borderWidth: 1, borderColor: colors.primaryContainer, borderRadius: 8, paddingVertical: 12, marginBottom: 12 },
  signButtonText: { color: colors.primaryContainer, fontWeight: 'bold', fontSize: 15 },
  signatureImage: { height: 100, width: '100%', resizeMode: 'contain', backgroundColor: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  toggleLabel: { fontSize: 16, color: colors.onSurface, flex: 1 },
  underline: { textDecorationLine: 'underline', textDecorationColor: colors.primaryContainer },
  actionButtonsRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  actionButton: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewButton: { borderWidth: 1, borderColor: colors.primaryContainer },
  previewButtonText: { color: colors.primaryContainer, fontWeight: 'bold', fontSize: 15 },
  submitButton: { backgroundColor: colors.primaryContainer, shadowColor: '#000', shadowOffset: {width:0, height:1}, shadowOpacity:0.2, shadowRadius:2, elevation:2 },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
