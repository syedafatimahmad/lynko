import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  Platform, 
  Switch, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generatePDF } from '../utils/pdfGenerator';
import SignatureModal from '../components/SignatureModal';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { formatPhoneNumber, formatZipCode, formatPONumber } from '../utils/formatters';

export default function ChainOfCustodyScreen({ navigation }: any) {
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const samples = useLynkoStore((state) => state.samples);
  const [showSignature, setShowSignature] = useState(false);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const photos = cocData.photos || [];

  const handleSaveSignature = (sig: string) => {
    updateCoCData({ inspectorSignature: sig });
    setShowSignature(false);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera access is required to take site photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const dataUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      updateCoCData({ photos: [...photos, dataUri] });
    }
  };

  const handlePickPhoto = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Photo library access is required to select photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => (a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri));
      updateCoCData({ photos: [...photos, ...newUris] });
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    updateCoCData({ photos: updated });
  };

  const handlePreviewCoC = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const uri = await generatePDF(null, cocData, samples);
      if (uri && Platform.OS !== 'web') {
        // Native Mobile: Open full-screen native Android/iOS PDF Previewer & Spooler directly
        await Print.printAsync({ uri });
      }
    } catch (err: any) {
      console.error('Error previewing PDF:', err);
      Alert.alert('Preview Notice', 'Could not open PDF viewer on this device.');
    } finally {
      setPreviewing(false);
    }
  };

  const handleSubmit = () => {
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
      Alert.alert('Missing Information', 'Please provide a Courier Signature before submitting.');
      return;
    }
    
    navigation.navigate('SubmitCoC');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chain of Custody</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.projectContext}>Project: {cocData.description || 'Alpha Environmental Site'}</Text>

        {/* Card 1: Project Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Information</Text>
          <Text style={styles.cardSubtitle}>Alpha Environmental Field Operations</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PO NUMBER</Text>
            <TextInput
              style={styles.input}
              value={cocData.poNumber}
              onChangeText={(text) => updateCoCData({ poNumber: formatPONumber(text) })}
              placeholder="e.g. 47674"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              value={cocData.description}
              onChangeText={(text) => updateCoCData({ description: text })}
              placeholder="e.g. Commercial Asbestos & Lead Inspection"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ZIP CODE</Text>
            <TextInput
              style={styles.input}
              value={cocData.zipCode}
              onChangeText={(text) => updateCoCData({ zipCode: formatZipCode(text) })}
              placeholder="e.g. 92101"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>

        {/* Card 2: Contact Information */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Contact Information</Text>
            <TouchableOpacity onPress={() => setIsEditingContacts(!isEditingContacts)}>
              <Text style={styles.linkText}>{isEditingContacts ? 'Done' : 'Edit Contacts'}</Text>
            </TouchableOpacity>
          </View>

          {isEditingContacts ? (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>COMPANY NAME</Text>
                <TextInput
                  style={styles.input}
                  value={cocData.contactName}
                  onChangeText={(text) => updateCoCData({ contactName: text })}
                  placeholder="Alpha Environmental Inc."
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>ADDRESS</Text>
                <TextInput
                  style={styles.input}
                  value={cocData.contactAddress}
                  onChangeText={(text) => updateCoCData({ contactAddress: text })}
                  placeholder="San Diego, CA 92101"
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PHONE NUMBER</Text>
                <TextInput
                  style={styles.input}
                  value={cocData.contactPhone}
                  onChangeText={(text) => updateCoCData({ contactPhone: formatPhoneNumber(text) })}
                  placeholder="(619) 555-0199"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          ) : (
            <View style={styles.contactDetailsBox}>
              <Text style={styles.contactCompany}>{cocData.contactName || 'Alpha Environmental'}</Text>
              <Text style={styles.contactSub}>{cocData.contactAddress || 'Field Inspection Branch'}</Text>
              <Text style={styles.contactSub}>{cocData.contactPhone || 'Direct Lab Dispatch'}</Text>
            </View>
          )}

          <View style={[styles.inputGroup, { marginTop: 8 }]}>
            <Text style={styles.label}>SAMPLED BY (INSPECTOR NAME)</Text>
            <TextInput
              style={styles.input}
              value={cocData.sampledBy}
              onChangeText={(text) => updateCoCData({ sampledBy: text })}
              placeholder="e.g. Ali Saleh"
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        {/* Card 3: Project Photos */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Project Photos ({photos.length})</Text>
              <Text style={styles.cardSubtitle}>Attach site context and sample location images</Text>
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={18} color={colors.primaryContainer} />
                <Text style={styles.photoActionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoActionBtn, { marginLeft: 8 }]} onPress={handlePickPhoto}>
                <Ionicons name="images" size={18} color={colors.primaryContainer} />
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <View key={index} style={styles.photoThumbWrapper}>
                  <Image source={{ uri }} style={styles.photoThumbnail} resizeMode="cover" />
                  <TouchableOpacity style={styles.photoDeleteBtn} onPress={() => handleRemovePhoto(index)}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.photoBadge}>#{index + 1}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPhotosText}>No site photos attached yet. Tap above to attach building or inspection photos.</Text>
          )}
        </View>

        {/* Card 4: Samples */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Samples</Text>

          {/* Top trigger: Edit Samples > (Opens SampleTypes) */}
          <TouchableOpacity 
            style={styles.editSamplesRow} 
            onPress={() => navigation.navigate('SampleTypes')}
          >
            <Text style={styles.editSamplesText}>Edit Samples</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Batch Card */}
          <TouchableOpacity 
            style={styles.batchCard} 
            onPress={() => navigation.navigate('EditSamples')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.batchCountTitle}>{samples.length} Bulk sample</Text>
              <Text style={styles.batchAnalysisText}>{cocData.analysis1 || 'Asbestos PLM'}</Text>
              <Text style={styles.batchTurnaroundText}>{cocData.turnaround1 || 'Next-day rush'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
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
            <Image source={{ uri: cocData.inspectorSignature }} style={styles.signatureImage} resizeMode="contain" />
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
            onPress={handlePreviewCoC}
            disabled={previewing}
          >
            {previewing ? (
              <ActivityIndicator color={colors.primaryContainer} size="small" />
            ) : (
              <Text style={styles.previewButtonText}>Preview CoC</Text>
            )}
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: colors.onSurface },
  scrollContent: { padding: 16, paddingBottom: 100 },
  projectContext: { fontSize: 14, color: colors.secondary, fontWeight: '500', marginBottom: 12 },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.secondary, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 12 },
  linkText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 14 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.onSurface },
  row: { flexDirection: 'row' },
  contactDetailsBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  contactCompany: { fontSize: 15, fontWeight: 'bold', color: colors.onSurface, marginBottom: 2 },
  contactSub: { fontSize: 13, color: colors.secondary },
  photoActionsRow: { flexDirection: 'row' },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  photoActionText: { marginLeft: 4, fontSize: 12, fontWeight: '600', color: colors.primaryContainer },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  photoThumbWrapper: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', position: 'relative' },
  photoThumbnail: { width: '100%', height: '100%' },
  photoDeleteBtn: { position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(0,0,0,0.65)', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  photoBadge: { position: 'absolute', bottom: 3, left: 3, backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 4, borderRadius: 4 },
  emptyPhotosText: { fontSize: 13, color: colors.outline, fontStyle: 'italic', marginTop: 6 },
  editSamplesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  editSamplesText: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  batchCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  batchCountTitle: { fontSize: 15, fontWeight: 'bold', color: colors.primaryContainer, marginBottom: 2 },
  batchAnalysisText: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  batchTurnaroundText: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  signButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12 },
  signButtonText: { color: colors.primaryContainer, fontWeight: '700', fontSize: 14 },
  signatureImage: { height: 100, width: '100%', backgroundColor: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleLabel: { fontSize: 14, color: colors.onSurface, flex: 1 },
  underline: { textDecorationLine: 'underline' },
  infoValue: { fontSize: 14, color: colors.secondary, fontWeight: '500' },
  actionButtonsRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  actionButton: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewButton: { backgroundColor: '#F1F5F9', borderWidth: 1.5, borderColor: colors.primaryContainer },
  previewButtonText: { color: colors.primaryContainer, fontWeight: '700', fontSize: 15 },
  submitButton: { backgroundColor: colors.primaryContainer },
  submitButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
