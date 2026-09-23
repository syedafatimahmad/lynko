import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import ImageEditorModal from '../components/ImageEditorModal';

export default function SampleLoggerScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const activeProjectId = useLynkoStore((state) => state.activeProjectId);
  const projects = useLynkoStore((state) => state.projects);
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const samples = useLynkoStore((state) => state.samples);
  const addSample = useLynkoStore((state) => state.addSample);
  const updateSample = useLynkoStore((state) => state.updateSample);

  // If editing an existing sample
  const editSampleId = route.params?.sampleId;
  const existingSample = samples.find((s) => s.id === editSampleId);

  const isMold = activeProject?.projectType === 'Mold';
  const prefix = isMold ? 'M' : 'A';

  // Helper to generate next sample number (e.g. A-01, M-01)
  const getNextSampleNumber = () => {
    if (existingSample) return existingSample.name;
    const nextIdx = samples.length + 1;
    return `${prefix}-${String(nextIdx).padStart(2, '0')}`;
  };

  const [sampleNumber, setSampleNumber] = useState(existingSample?.name || getNextSampleNumber());
  const [sampleCode, setSampleCode] = useState(existingSample?.sampleCode || (isMold ? `Cassette ${samples.length + 1}` : ''));
  const [flowRate, setFlowRate] = useState(existingSample?.flowRate || '15');
  const [duration, setDuration] = useState(existingSample?.duration || '5');
  const [description, setDescription] = useState(existingSample?.description || '');
  const [photoUris, setPhotoUris] = useState<string[]>(existingSample?.photoUris || []);

  // Image editor modal
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorUri, setEditorUri] = useState('');
  const [editorPhotoIdx, setEditorPhotoIdx] = useState<number | null>(null);

  // Auto-calculated volume: flow rate x duration
  const numericFlow = parseFloat(flowRate) || 0;
  const numericDuration = parseFloat(duration) || 0;
  const calculatedVolume = (numericFlow * numericDuration).toFixed(0);

  // When switching or resetting
  useEffect(() => {
    if (existingSample) {
      setSampleNumber(existingSample.name);
      setSampleCode(existingSample.sampleCode || '');
      setFlowRate(existingSample.flowRate || '15');
      setDuration(existingSample.duration || '5');
      setDescription(existingSample.description || '');
      setPhotoUris(existingSample.photoUris || []);
    }
  }, [existingSample]);

  // Check if sample number is unique
  const isDuplicate = samples.some(
    (s) => s.name.trim().toLowerCase() === sampleNumber.trim().toLowerCase() && s.id !== existingSample?.id
  );

  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to snap inspection photos.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (!res.canceled && res.assets && res.assets[0]) {
        const uri = res.assets[0].uri;
        setEditorUri(uri);
        setEditorPhotoIdx(null); // new photo
        setEditorVisible(true);
      }
    } catch (e: any) {
      Alert.alert('Camera Error', e?.message || 'Could not open camera.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Required', 'Gallery access is needed to pick photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsMultipleSelection: true });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUris = res.assets.map((a) => a.uri);
        setPhotoUris((prev) => [...prev, ...newUris]);
      }
    } catch (e: any) {
      Alert.alert('Gallery Error', e?.message || 'Could not open gallery.');
    }
  };

  const handleEditorSave = (editedUri: string) => {
    if (editorPhotoIdx !== null) {
      setPhotoUris((prev) => {
        const updated = [...prev];
        updated[editorPhotoIdx] = editedUri;
        return updated;
      });
    } else {
      setPhotoUris((prev) => [...prev, editedUri]);
    }
    setEditorVisible(false);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCurrentSample = () => {
    if (!sampleNumber.trim()) {
      Alert.alert('Sample ID Required', 'Please enter a sample identifier (e.g. A-01 or M-01).');
      return false;
    }

    const item: SampleItem = {
      id: existingSample?.id || `sample_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: sampleNumber.trim(),
      sampleCode: isMold ? sampleCode.trim() : undefined,
      description: description.trim(),
      flowRate: isMold ? flowRate : undefined,
      duration: isMold ? duration : undefined,
      volume: isMold ? `${calculatedVolume} L` : undefined,
      photoUris,
    };

    if (existingSample) {
      updateSample(existingSample.id, item);
    } else {
      addSample(item);
    }
    return true;
  };

  const handleDoneNextSample = () => {
    const success = saveCurrentSample();
    if (!success) return;

    // Reset form for next sample
    const nextIdx = samples.length + (existingSample ? 1 : 2);
    setSampleNumber(`${prefix}-${String(nextIdx).padStart(2, '0')}`);
    setSampleCode(isMold ? `Cassette ${nextIdx}` : '');
    setDescription('');
    setPhotoUris([]);
  };

  const handleSaveAndReview = () => {
    if (sampleNumber.trim() || description.trim() || photoUris.length > 0) {
      const success = saveCurrentSample();
      if (!success) return;
    }
    navigation.navigate('ProjectSamples');
  };

  const currentSampleIndex = existingSample
    ? samples.findIndex((s) => s.id === existingSample.id) + 1
    : samples.length + 1;

  const addressDisplay = activeProject?.address || activeProject?.title || 'Job Site';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.navigate('ProjectSamples')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
          <Text style={styles.backBtnText}>All samples</Text>
        </TouchableOpacity>

        <Text style={styles.topAddressText} numberOfLines={1}>
          {addressDisplay}
        </Text>

        <View style={styles.badgeTop}>
          <Text style={styles.badgeTopText}>
            {isMold ? `MOLD • #${currentSampleIndex}` : `ASBESTOS • #${currentSampleIndex}`}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom > 0 ? insets.bottom + 90 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.mainTitle}>{isMold ? 'Air sample' : 'New sample'}</Text>

          {/* Previous samples pills (if any) */}
          {samples.length > 0 && !existingSample && (
            <View style={styles.takenPillsRow}>
              <Text style={styles.takenLabel}>Taken:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {samples.map((s) => (
                  <View key={s.id} style={styles.takenPill}>
                    <Text style={styles.takenPillText}>{s.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Sample Identifiers Row */}
          {isMold ? (
            <View style={styles.row}>
              <View style={[styles.fieldCol, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Sample number</Text>
                <TextInput
                  style={styles.input}
                  value={sampleNumber}
                  onChangeText={setSampleNumber}
                  placeholder="e.g. M-01"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={[styles.fieldCol, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Sample code</Text>
                <View style={styles.codeContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                    value={sampleCode}
                    onChangeText={setSampleCode}
                    placeholder="Cassette ID"
                    placeholderTextColor="#94A3B8"
                  />
                  <Ionicons name="barcode-outline" size={20} color="#64748B" />
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.fieldCol}>
              <View style={styles.sampleNumHeaderRow}>
                <Text style={styles.inputLabel}>Sample number</Text>
                {sampleNumber.trim().length > 0 && !isDuplicate && (
                  <View style={styles.uniqueBadge}>
                    <Ionicons name="checkmark" size={12} color="#16A34A" />
                    <Text style={styles.uniqueBadgeText}>Unique</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.input}
                value={sampleNumber}
                onChangeText={setSampleNumber}
                placeholder="e.g. A-01"
                placeholderTextColor="#94A3B8"
              />
              <Text style={styles.inputHint}>Your own ID — must be unique in this project</Text>
            </View>
          )}

          {/* MOLD ONLY: PUMP READINGS CARD */}
          {isMold && (
            <View style={styles.pumpCard}>
              <Text style={styles.pumpCardHeader}>PUMP READINGS</Text>

              <View style={styles.row}>
                <View style={[styles.pumpInputCol, { marginRight: 8 }]}>
                  <Text style={styles.pumpFieldLabel}>Flow rate</Text>
                  <View style={styles.unitInputRow}>
                    <TextInput
                      style={styles.unitInput}
                      value={flowRate}
                      onChangeText={setFlowRate}
                      keyboardType="numeric"
                      placeholder="15"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.unitLabel}>L/min</Text>
                  </View>
                </View>

                <View style={[styles.pumpInputCol, { marginLeft: 8 }]}>
                  <Text style={styles.pumpFieldLabel}>Duration</Text>
                  <View style={styles.unitInputRow}>
                    <TextInput
                      style={styles.unitInput}
                      value={duration}
                      onChangeText={setDuration}
                      keyboardType="numeric"
                      placeholder="5"
                      placeholderTextColor="#94A3B8"
                    />
                    <Text style={styles.unitLabel}>min</Text>
                  </View>
                </View>
              </View>

              {/* Black Auto-calculated Volume Banner */}
              <View style={styles.volumeBanner}>
                <View>
                  <Text style={styles.volumeTitle}>Volume (auto)</Text>
                  <Text style={styles.volumeSubtitle}>flow × duration</Text>
                </View>
                <Text style={styles.volumeValue}>{calculatedVolume} L</Text>
              </View>
            </View>
          )}

          {/* Description / Location */}
          <View style={[styles.fieldCol, { marginTop: 12 }]}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, styles.descInput]}
              value={description}
              onChangeText={setDescription}
              placeholder={
                isMold
                  ? 'Location / conditions — e.g. master bedroom, near stained ceiling'
                  : 'Material, location, condition — e.g. 2x4 ceiling tile, hallway, water-stained'
              }
              placeholderTextColor="#94A3B8"
              multiline
            />
          </View>

          {/* Photo Section */}
          <View style={[styles.fieldCol, { marginTop: 14 }]}>
            <Text style={styles.inputLabel}>
              Photo {photoUris.length > 0 ? `• ${photoUris.length} attached` : '• at least 1 required'}
            </Text>

            {photoUris.length === 0 ? (
              <View style={styles.photoDashedBox}>
                <TouchableOpacity
                  style={styles.photoCaptureBtn}
                  onPress={handleTakePhoto}
                  activeOpacity={0.8}
                >
                  <View style={styles.cameraIconCircle}>
                    <Ionicons name="camera" size={24} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cameraBtnText}>Take photo</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePickPhoto} style={styles.chooseLibraryBtn}>
                  <Ionicons name="images-outline" size={16} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.chooseLibraryText}>Choose from library</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoAttachedContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                  {photoUris.map((uri, idx) => (
                    <View key={`${uri}-${idx}`} style={styles.photoThumbCard}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                          setEditorUri(uri);
                          setEditorPhotoIdx(idx);
                          setEditorVisible(true);
                        }}
                      >
                        <Image source={{ uri }} style={styles.photoThumbImage} />
                        <View style={styles.retakeBadge}>
                          <Text style={styles.retakeText}>Retake / Edit</Text>
                        </View>
                        <View style={styles.photoTimestampBadge}>
                          <Text style={styles.photoTimestampText}>
                            {sampleNumber} • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.photoDeleteBtn}
                        onPress={() => handleRemovePhoto(idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}

                  {/* + Add extra photo button */}
                  <TouchableOpacity
                    style={styles.addMorePhotoBtn}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={24} color="#64748B" />
                    <Text style={styles.addMorePhotoText}>Add</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Bottom Actions */}
      <View
        style={[
          styles.bottomActionBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.doneNextBtn}
          onPress={handleDoneNextSample}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.doneNextBtnText}>✓ Done — next sample</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveReviewLink}
          onPress={handleSaveAndReview}
          activeOpacity={0.7}
        >
          <Text style={styles.saveReviewLinkText}>Save & review all samples</Text>
        </TouchableOpacity>
      </View>

      {/* Snapchat-Style Photo Markup Editor */}
      <ImageEditorModal
        visible={editorVisible}
        imageUri={editorUri}
        onSave={handleEditorSave}
        onCancel={() => setEditorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  backBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  topAddressText: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  badgeTop: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeTopText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  scrollContent: {
    padding: 16,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  takenPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  takenLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginRight: 8,
  },
  takenPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 6,
  },
  takenPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
  },
  fieldCol: {
    marginBottom: 8,
  },
  sampleNumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  uniqueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  uniqueBadgeText: {
    fontSize: 11,
    color: '#16A34A',
    fontWeight: '700',
    marginLeft: 2,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  descInput: {
    minHeight: 76,
    textAlignVertical: 'top',
  },

  // Pump Readings Card (Mold)
  pumpCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  pumpCardHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pumpInputCol: {
    flex: 1,
  },
  pumpFieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  unitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  unitInput: {
    flex: 1,
    height: 42,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  unitLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  volumeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 12,
  },
  volumeTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  volumeSubtitle: {
    color: '#94A3B8',
    fontSize: 11,
  },
  volumeValue: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },

  // Photo Box
  photoDashedBox: {
    borderWidth: 2,
    borderColor: '#F87171',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCaptureBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#B91C1C',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  cameraBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  chooseLibraryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  chooseLibraryText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },

  // Photos Attached Preview
  photoAttachedContainer: {
    marginTop: 4,
  },
  photoScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  photoThumbCard: {
    position: 'relative',
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#0F172A',
  },
  photoThumbImage: {
    width: 140,
    height: 140,
    borderRadius: 10,
  },
  retakeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  photoTimestampBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoTimestampText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '600',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  addMorePhotoBtn: {
    width: 90,
    height: 140,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMorePhotoText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },

  // Bottom Action Bar
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  doneNextBtn: {
    width: '100%',
    height: 50,
    backgroundColor: '#881337', // Elegant deep burgundy matching client prototype
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#881337',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  doneNextBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  saveReviewLink: {
    marginTop: 10,
    paddingVertical: 4,
  },
  saveReviewLinkText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});
