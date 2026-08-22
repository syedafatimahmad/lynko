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
import ImageEditorModal from '../components/ImageEditorModal';
import MapAddressPickerModal from '../components/MapAddressPickerModal';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { formatPhoneNumber, formatZipCode, formatPONumber } from '../utils/formatters';

export default function ChainOfCustodyScreen({ navigation }: any) {
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const samples = useLynkoStore((state) => state.samples);
  const [showSignature, setShowSignature] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingPhotoIndex, setEditingPhotoIndex] = useState<number | null>(null);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const photos = cocData.photos || [];

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveSignature = (sig: string) => {
    updateCoCData({ inspectorSignature: sig });
    clearError('signature');
    setShowSignature(false);
  };

  const handleTakePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Required", "Camera access is required to take site photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateCoCData({ photos: [...photos, result.assets[0].uri] });
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
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map(a => a.uri);
      updateCoCData({ photos: [...photos, ...newUris] });
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updated = photos.filter((_, i) => i !== index);
    updateCoCData({ photos: updated });
  };

  const handleOpenPhotoEditor = (index: number) => {
    setEditingPhotoIndex(index);
    setShowImageEditor(true);
  };

  const handleSaveEditedPhoto = (editedUri: string) => {
    if (editingPhotoIndex !== null && editingPhotoIndex >= 0) {
      const updated = [...photos];
      updated[editingPhotoIndex] = editedUri;
      updateCoCData({ photos: updated });
    }
    setShowImageEditor(false);
    setEditingPhotoIndex(null);
  };

  const handlePreviewCoC = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const uri = await generatePDF(null, cocData, samples);
      if (uri && Platform.OS !== 'web') {
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
    const newErrors: { [key: string]: string } = {};

    if (!cocData.poNumber?.trim()) {
      newErrors.poNumber = 'PO Number is required';
    }
    if (!cocData.description?.trim()) {
      newErrors.description = 'Project Description is required';
    }
    if (!cocData.zipCode?.trim()) {
      newErrors.zipCode = 'Zip Code is required';
    }
    if (!cocData.sampledBy?.trim()) {
      newErrors.sampledBy = 'Sampled By (Inspector Name) is required';
    }
    if (samples.length === 0) {
      newErrors.samples = 'At least 1 sample is required before submitting.';
    }
    if (!cocData.inspectorSignature) {
      newErrors.signature = 'Courier signature is required before submitting.';
    }
    if (!tosAgreed) {
      newErrors.tos = 'You must agree to the Terms of Service before submitting.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert(
        'Incomplete Chain of Custody',
        'Please complete the highlighted required fields before submitting.',
        [{ text: 'OK' }]
      );
      return;
    }

    setErrors({});
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
        {/* Top Validation Warning Banner */}
        {Object.keys(errors).length > 0 && (
          <View style={styles.topErrorBanner}>
            <Ionicons name="alert-circle" size={22} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={styles.topErrorBannerText}>
              Please fill in the {Object.keys(errors).length} highlighted required fields below to submit.
            </Text>
          </View>
        )}

        <Text style={styles.projectContext}>Project: {cocData.description || 'Lynko Inspection Site'}</Text>

        {/* Card 1: Project Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Project Information</Text>
          <Text style={styles.cardSubtitle}>Lynko Field Operations</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              PO NUMBER <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.poNumber ? styles.inputError : null]}
              value={cocData.poNumber}
              onChangeText={(text) => {
                clearError('poNumber');
                updateCoCData({ poNumber: formatPONumber(text) });
              }}
              placeholder="e.g. 47674"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
            />
            {errors.poNumber && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.poNumber}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              DESCRIPTION <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.description ? styles.inputError : null]}
              value={cocData.description}
              onChangeText={(text) => {
                clearError('description');
                updateCoCData({ description: text });
              }}
              placeholder="e.g. Commercial Asbestos & Lead Inspection"
              placeholderTextColor="#94A3B8"
            />
            {errors.description && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.description}</Text>
              </View>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              ZIP CODE <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.zipCode ? styles.inputError : null]}
              value={cocData.zipCode}
              onChangeText={(text) => {
                clearError('zipCode');
                updateCoCData({ zipCode: formatZipCode(text) });
              }}
              placeholder="e.g. 92101"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={5}
            />
            {errors.zipCode && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.zipCode}</Text>
              </View>
            )}
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
                  placeholder="Lynko Operations Inc."
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.label}>ADDRESS / LOCATION</Text>
                  <TouchableOpacity 
                    style={{ flexDirection: 'row', alignItems: 'center' }} 
                    onPress={() => setShowMapPicker(true)}
                  >
                    <Ionicons name="map-outline" size={15} color={colors.primaryContainer} style={{ marginRight: 3 }} />
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryContainer }}>Pick on Map</Text>
                  </TouchableOpacity>
                </View>
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
              <Text style={styles.contactCompany}>{cocData.contactName || 'Lynko'}</Text>
              <Text style={styles.contactSub}>{cocData.contactAddress || 'Field Inspection Branch'}</Text>
              <Text style={styles.contactSub}>{cocData.contactPhone || 'Direct Lab Dispatch'}</Text>
            </View>
          )}

          <View style={[styles.inputGroup, { marginTop: 8 }]}>
            <Text style={styles.label}>
              SAMPLED BY (INSPECTOR NAME) <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, errors.sampledBy ? styles.inputError : null]}
              value={cocData.sampledBy}
              onChangeText={(text) => {
                clearError('sampledBy');
                updateCoCData({ sampledBy: text });
              }}
              placeholder="e.g. Ali Saleh"
              placeholderTextColor="#94A3B8"
            />
            {errors.sampledBy && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
                <Text style={styles.errorText}>{errors.sampledBy}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Card 3: Project Photos */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, paddingRight: 6 }}>
              <Text style={styles.cardTitle}>Project Photos ({photos.length})</Text>
              <Text style={styles.cardSubtitle} numberOfLines={1}>Attach site context images</Text>
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={15} color={colors.primaryContainer} />
                <Text style={styles.photoActionText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.photoActionBtn, { marginLeft: 6 }]} onPress={handlePickPhoto}>
                <Ionicons name="images" size={15} color={colors.primaryContainer} />
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((uri, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.photoThumbWrapper}
                  onPress={() => handleOpenPhotoEditor(index)}
                  activeOpacity={0.85}
                >
                  <Image source={{ uri }} style={styles.photoThumbnail} resizeMode="cover" />
                  <View style={{ position: 'absolute', top: 3, left: 3, backgroundColor: 'rgba(13, 148, 136, 0.85)', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 }}>
                    <Ionicons name="pencil" size={10} color="#fff" />
                  </View>
                  <TouchableOpacity 
                    style={styles.photoDeleteBtn} 
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    onPress={() => handleRemovePhoto(index)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                  <Text style={styles.photoBadge}>#{index + 1}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyPhotosText}>No site photos attached yet. Tap above to attach building or inspection photos.</Text>
          )}
        </View>

        {/* Card 4: Samples */}
        <View style={[styles.card, errors.samples ? styles.cardError : null]}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>
              Samples ({samples.length}) <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            {errors.samples && (
              <View style={styles.badgeError}>
                <Text style={styles.badgeErrorText}>Required</Text>
              </View>
            )}
          </View>

          {/* Top trigger: Edit Samples > (Opens SampleTypes) */}
          <TouchableOpacity 
            style={styles.editSamplesRow} 
            onPress={() => {
              clearError('samples');
              navigation.navigate('SampleTypes');
            }}
          >
            <Text style={styles.editSamplesText}>Edit Samples</Text>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          {/* Batch Card */}
          <TouchableOpacity 
            style={[styles.batchCard, errors.samples ? styles.batchCardError : null]} 
            onPress={() => {
              clearError('samples');
              navigation.navigate('EditSamples');
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.batchCountTitle}>{samples.length} Bulk sample</Text>
              <Text style={styles.batchAnalysisText}>{cocData.analysis1 || 'Asbestos PLM'}</Text>
              <Text style={styles.batchTurnaroundText}>{cocData.turnaround1 || 'Next-day rush'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
          </TouchableOpacity>

          {errors.samples && (
            <View style={[styles.errorRow, { marginTop: 8 }]}>
              <Ionicons name="alert-circle" size={14} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errors.samples}</Text>
            </View>
          )}
        </View>

        {/* Card 5: Review & Submit */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Review and Submit</Text>
          
          <TouchableOpacity 
            style={[styles.signButton, errors.signature ? styles.signButtonError : null]} 
            onPress={() => {
              clearError('signature');
              setShowSignature(true);
            }}
          >
            <Ionicons name="pencil" size={20} color={errors.signature ? colors.error : colors.primaryContainer} style={{marginRight: 8}} />
            <Text style={[styles.signButtonText, errors.signature ? { color: colors.error } : null]}>
              {cocData.inspectorSignature ? 'Edit Courier Signature' : 'Add Courier Signature *'}
            </Text>
          </TouchableOpacity>

          {errors.signature && (
            <View style={[styles.errorRow, { marginTop: -6, marginBottom: 10 }]}>
              <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errors.signature}</Text>
            </View>
          )}

          {cocData.inspectorSignature && (
            <Image source={{ uri: cocData.inspectorSignature }} style={styles.signatureImage} resizeMode="contain" />
          )}

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Resampling notification:</Text>
            <Text style={styles.infoValue}>None</Text>
          </View>

          <View style={[styles.toggleRow, errors.tos ? styles.toggleRowError : null]}>
            <Text style={[styles.toggleLabel, styles.underline, errors.tos ? { color: colors.error, fontWeight: '700' } : null]}>
              I have read and agree to the Terms of Service <Text style={styles.requiredAsterisk}>*</Text>
            </Text>
            <Switch 
              value={tosAgreed} 
              onValueChange={(val) => {
                clearError('tos');
                setTosAgreed(val);
              }} 
              trackColor={{ true: colors.primaryContainer, false: '#CBD5E1' }} 
            />
          </View>
          {errors.tos && (
            <View style={[styles.errorRow, { marginTop: -4, marginBottom: 8 }]}>
              <Ionicons name="alert-circle" size={13} color={colors.error} style={{ marginRight: 4 }} />
              <Text style={styles.errorText}>{errors.tos}</Text>
            </View>
          )}

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

      {showMapPicker && (
        <MapAddressPickerModal
          visible={showMapPicker}
          initialAddress={cocData.contactAddress}
          onConfirm={(address, zip) => {
            updateCoCData({ contactAddress: address, zipCode: zip });
            setShowMapPicker(false);
          }}
          onCancel={() => setShowMapPicker(false)}
        />
      )}

      {showImageEditor && editingPhotoIndex !== null && photos[editingPhotoIndex] && (
        <ImageEditorModal
          visible={showImageEditor}
          imageUri={photos[editingPhotoIndex]}
          onSave={handleSaveEditedPhoto}
          onCancel={() => {
            setShowImageEditor(false);
            setEditingPhotoIndex(null);
          }}
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
  topErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
  },
  topErrorBannerText: {
    flex: 1,
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  requiredAsterisk: {
    color: colors.error,
    fontWeight: 'bold',
  },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 8, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardError: {
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    backgroundColor: '#FFFBFB',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: colors.secondary, marginBottom: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingBottom: 8, marginBottom: 12 },
  linkText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 14 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.secondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.onSurface, backgroundColor: '#FFFFFF' },
  inputError: {
    borderColor: colors.error,
    borderWidth: 1.5,
    backgroundColor: '#FEF2F2',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  badgeError: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  badgeErrorText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '700',
  },
  row: { flexDirection: 'row' },
  contactDetailsBox: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#E2E8F0' },
  contactCompany: { fontSize: 15, fontWeight: 'bold', color: colors.onSurface, marginBottom: 2 },
  contactSub: { fontSize: 13, color: colors.secondary },
  photoActionsRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  photoActionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1' },
  photoActionText: { marginLeft: 3, fontSize: 11, fontWeight: '700', color: colors.primaryContainer },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  photoThumbWrapper: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1', position: 'relative' },
  photoThumbnail: { width: '100%', height: '100%' },
  photoDeleteBtn: { position: 'absolute', top: 3, right: 3, backgroundColor: 'rgba(220, 38, 38, 0.9)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  photoBadge: { position: 'absolute', bottom: 3, left: 3, backgroundColor: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 4, borderRadius: 4 },
  emptyPhotosText: { fontSize: 13, color: colors.outline, fontStyle: 'italic', marginTop: 6 },
  editSamplesRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  editSamplesText: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  batchCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 14, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  batchCardError: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
  },
  batchCountTitle: { fontSize: 15, fontWeight: 'bold', color: colors.primaryContainer, marginBottom: 2 },
  batchAnalysisText: { fontSize: 13, color: colors.onSurface, fontWeight: '500' },
  batchTurnaroundText: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  signButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', marginBottom: 12 },
  signButtonError: {
    backgroundColor: '#FEF2F2',
    borderColor: colors.error,
    borderWidth: 1.5,
  },
  signButtonText: { color: colors.primaryContainer, fontWeight: '700', fontSize: 14 },
  signatureImage: { height: 100, width: '100%', backgroundColor: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  toggleRowError: { backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 6, borderWidth: 1, borderColor: '#FCA5A5' },
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
