import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput, Alert, Modal, Image, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import ImageEditorModal from '../components/ImageEditorModal';

export default function EditSamplesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const samples = useLynkoStore((state) => state.samples);
  const addSample = useLynkoStore((state) => state.addSample);
  const updateSample = useLynkoStore((state) => state.updateSample);
  const deleteSample = useLynkoStore((state) => state.deleteSample);
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const autoFillField = useLynkoStore((state) => state.autoFillField);

  const isAsbestos = cocData.projectType === 'Asbestos';

  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
  const [analysis1, setAnalysis1] = useState(cocData.analysis1 || (isAsbestos ? 'Asbestos Bulk Analysis' : 'Asbestos PLM'));
  const [turnaround1, setTurnaround1] = useState(cocData.turnaround1 || 'Next-day rush');
  const [analysis2, setAnalysis2] = useState(cocData.analysis2 || 'Not set');
  const [turnaround2, setTurnaround2] = useState(cocData.turnaround2 || '');

  // Quick Auto-fill modal state
  const [autoFillModalVisible, setAutoFillModalVisible] = useState(false);
  const [autoFillType, setAutoFillType] = useState<'sampleId' | 'description'>('description');
  const [autoFillInput, setAutoFillInput] = useState('');

  // Image Editor Modal state (CompanyCam style markup)
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorImageUri, setEditorImageUri] = useState('');
  const [editorTarget, setEditorTarget] = useState<{
    sampleId: string;
    photoIndex?: number;
    rawUri?: string;
  } | null>(null);

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddNewSample = () => {
    const nextNum = samples.length + 1;
    const newSample: SampleItem = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: `${nextNum}`,
      analysis1Enabled: true,
      analysis2Enabled: false,
      description: '',
      notes: '',
      photoUris: [],
    };
    addSample(newSample);
  };

  const handleDeleteSample = (sampleId: string, sampleName: string) => {
    Alert.alert(
      'Delete Sample',
      `Are you sure you want to remove Sample #${sampleName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteSample(sampleId),
        },
      ]
    );
  };

  const handleTakeSamplePhoto = async (sampleId: string) => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Camera access is required to take sample photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        // Immediately launch CompanyCam-style photo markup editor
        setEditorImageUri(uri);
        setEditorTarget({ sampleId, rawUri: uri });
        setEditorVisible(true);
      }
    } catch (error: any) {
      console.error('Error taking photo for sample:', error);
      Alert.alert('Camera Error', error?.message || 'Failed to open camera.');
    }
  };

  const handleOpenPhotoEditor = (sampleId: string, photoIndex: number, uri: string) => {
    setEditorImageUri(uri);
    setEditorTarget({ sampleId, photoIndex, rawUri: uri });
    setEditorVisible(true);
  };

  const handleEditorSave = (editedUri: string) => {
    if (!editorTarget) return;
    const { sampleId, photoIndex } = editorTarget;
    const currentSample = samples.find(s => s.id === sampleId);
    const currentPhotos = currentSample?.photoUris || [];

    if (photoIndex !== undefined && photoIndex >= 0) {
      // Update existing photo with annotations
      const updated = [...currentPhotos];
      updated[photoIndex] = editedUri;
      updateSample(sampleId, { photoUris: updated });
    } else {
      // Save newly taken annotated photo
      updateSample(sampleId, { photoUris: [...currentPhotos, editedUri] });
    }

    setEditorVisible(false);
    setEditorTarget(null);
  };

  const handleEditorCancel = () => {
    if (!editorTarget) {
      setEditorVisible(false);
      return;
    }
    // If it was a newly captured photo, ask if user wants to keep original unedited or discard
    if (editorTarget.photoIndex === undefined && editorTarget.rawUri) {
      Alert.alert(
        'Keep Original Photo?',
        'Do you want to keep the captured photo without markups, or discard it?',
        [
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              setEditorVisible(false);
              setEditorTarget(null);
            },
          },
          {
            text: 'Keep Unedited',
            onPress: () => {
              const { sampleId, rawUri } = editorTarget;
              if (rawUri) {
                const currentSample = samples.find(s => s.id === sampleId);
                const currentPhotos = currentSample?.photoUris || [];
                updateSample(sampleId, { photoUris: [...currentPhotos, rawUri] });
              }
              setEditorVisible(false);
              setEditorTarget(null);
            },
          },
        ]
      );
    } else {
      setEditorVisible(false);
      setEditorTarget(null);
    }
  };

  const handlePickSamplePhoto = async (sampleId: string) => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Photo library access is required to select photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newUris = result.assets.map(a => a.uri);
        const currentSample = samples.find(s => s.id === sampleId);
        const currentPhotos = currentSample?.photoUris || [];
        updateSample(sampleId, { photoUris: [...currentPhotos, ...newUris] });
      }
    } catch (error: any) {
      console.error('Error picking photo for sample:', error);
      Alert.alert('Gallery Error', error?.message || 'Failed to open photo library.');
    }
  };

  const handleRemoveSamplePhoto = (sampleId: string, photoIndex: number) => {
    const currentSample = samples.find(s => s.id === sampleId);
    const currentPhotos = currentSample?.photoUris || [];
    const updated = currentPhotos.filter((_, idx) => idx !== photoIndex);
    updateSample(sampleId, { photoUris: updated });
  };

  const handleSaveAll = async () => {
    await updateCoCData({
      analysis1,
      turnaround1,
      analysis2,
      turnaround2,
    });
    navigation.goBack();
  };

  const handleTriggerAutoFill = (type: 'sampleId' | 'description') => {
    if (type === 'sampleId') {
      autoFillField('sampleId');
      Alert.alert('Auto Fill', 'Sample IDs sequentially re-numbered (1, 2, 3...).');
    } else {
      setAutoFillType(type);
      setAutoFillInput('');
      setAutoFillModalVisible(true);
    }
  };

  const submitAutoFillModal = async () => {
    await autoFillField(autoFillType, autoFillInput);
    setAutoFillModalVisible(false);
  };

  const renderHeader = () => (
    <View style={styles.headerSectionsWrapper}>
      {/* Card 1: Batch Analysis & Turnaround Configuration */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="flask-outline" size={20} color={colors.primaryContainer} style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>
            {isAsbestos ? 'Asbestos Bulk Analysis & Turnaround' : 'Batch Analysis & Turnaround'}
          </Text>
        </View>

        <View style={styles.configGrid}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{isAsbestos ? 'Bulk Analysis Type' : 'Add Analysis 1'}</Text>
            <TextInput
              style={styles.input}
              value={analysis1}
              onChangeText={setAnalysis1}
              placeholder={isAsbestos ? "e.g. Asbestos Bulk (PLM)" : "e.g. Asbestos PLM"}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Turnaround Time (TAT)</Text>
            <TextInput
              style={styles.input}
              value={turnaround1}
              onChangeText={setTurnaround1}
              placeholder="e.g. Next-day rush"
            />
          </View>

          {!isAsbestos && (
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.inputLabel}>Add Analysis 2</Text>
                <TextInput
                  style={styles.input}
                  value={analysis2}
                  onChangeText={setAnalysis2}
                  placeholder="Not set"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.inputLabel}>Turnaround 2</Text>
                <TextInput
                  style={styles.input}
                  value={turnaround2}
                  onChangeText={setTurnaround2}
                  placeholder="Optional"
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Card 2: Auto Fill Quick Tools */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="flash-outline" size={18} color={colors.primaryContainer} style={{ marginRight: 8 }} />
          <Text style={styles.cardTitle}>Auto-Fill Tools (1-Tap Mass Fill)</Text>
        </View>

        <View style={styles.autoFillGrid}>
          <TouchableOpacity 
            style={styles.autoFillBtn} 
            onPress={() => handleTriggerAutoFill('sampleId')}
          >
            <Ionicons name="list-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.autoFillBtnText}>Sample ID (1..N)</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.autoFillBtn} 
            onPress={() => handleTriggerAutoFill('description')}
          >
            <Ionicons name="text-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.autoFillBtnText}>Description</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.samplesListHeader}>
        <Text style={styles.samplesListTitle}>
          {isAsbestos ? `Asbestos Bulk Samples (${samples.length})` : `Individual Sample Records (${samples.length})`}
        </Text>
        <TouchableOpacity style={styles.addSampleHeaderBtn} onPress={handleAddNewSample} activeOpacity={0.7}>
          <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.addSampleHeaderBtnText}>Add Sample</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSampleItem = ({ item, index }: { item: SampleItem, index: number }) => {
    const showNotes = Boolean(expandedNotes[item.id] || (item.notes && item.notes.length > 0));

    return (
      <View style={styles.sampleCard}>
        {/* Sample Header Row with Badge, Delete button, and optional Analysis Toggles */}
        <View style={styles.sampleCardHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.sampleBadge}>
              <Text style={styles.sampleBadgeText}>Sample #{index + 1}</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteSampleBtn}
              onPress={() => handleDeleteSample(item.id, item.name || `${index + 1}`)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="trash-outline" size={17} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {!isAsbestos && (
            <View style={styles.togglesContainer}>
              <View style={styles.toggleItem}>
                <Text style={styles.toggleItemLabel}>Analysis 1</Text>
                <Switch
                  value={item.analysis1Enabled}
                  onValueChange={(val) => updateSample(item.id, { analysis1Enabled: val })}
                  trackColor={{ true: colors.primaryContainer, false: '#CBD5E1' }}
                />
              </View>

              <View style={styles.toggleItem}>
                <Text style={styles.toggleItemLabel}>Analysis 2</Text>
                <Switch
                  value={item.analysis2Enabled}
                  onValueChange={(val) => updateSample(item.id, { analysis2Enabled: val })}
                  trackColor={{ true: colors.primaryContainer, false: '#CBD5E1' }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Sample ID & Description Inputs */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { width: 110, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Sample ID</Text>
            <TextInput
              style={styles.input}
              value={item.name}
              onChangeText={(val) => updateSample(item.id, { name: val })}
              placeholder={`${index + 1}`}
            />
          </View>

          <View style={[styles.inputGroup, { flex: 1 }]}>
            <Text style={styles.inputLabel}>Description / Location</Text>
            <TextInput
              style={styles.input}
              value={item.description}
              onChangeText={(val) => updateSample(item.id, { description: val })}
              placeholder="e.g. Master Bedroom Ceiling"
            />
          </View>
        </View>

        {/* Specific Sample Photos Section */}
        <View style={styles.samplePhotoSection}>
          <View style={styles.samplePhotoHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="images-outline" size={15} color={colors.primaryContainer} style={{ marginRight: 5 }} />
              <Text style={styles.samplePhotoSectionTitle}>
                Sample Photos ({item.photoUris?.length || 0})
              </Text>
            </View>
            <View style={styles.samplePhotoActions}>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={() => handleTakeSamplePhoto(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={13} color={colors.primaryContainer} style={{ marginRight: 3 }} />
                <Text style={styles.photoActionBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionBtn}
                onPress={() => handlePickSamplePhoto(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="images" size={13} color={colors.primaryContainer} style={{ marginRight: 3 }} />
                <Text style={styles.photoActionBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {item.photoUris && item.photoUris.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbnailScroll}>
              {item.photoUris.map((uri, pIdx) => (
                <View key={`${uri}-${pIdx}`} style={styles.thumbnailWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleOpenPhotoEditor(item.id, pIdx, uri)}
                  >
                    <Image source={{ uri }} style={styles.sampleThumbnail} />
                    <View style={styles.thumbnailEditBadge}>
                      <Ionicons name="brush" size={10} color="#FFFFFF" />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeThumbnailBtn}
                    onPress={() => handleRemoveSamplePhoto(item.id, pIdx)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="close" size={12} color="#FFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noPhotosText}>No photos attached to this sample yet. Take a photo to open markup.</Text>
          )}
        </View>

        {/* Expandable Notes Link */}
        <TouchableOpacity style={styles.notesToggleRow} onPress={() => toggleNotes(item.id)}>
          <Ionicons 
            name={showNotes ? "document-text" : "chatbubble-ellipses-outline"} 
            size={16} 
            color={colors.primaryContainer} 
            style={{ marginRight: 6 }} 
          />
          <Text style={styles.notesToggleText}>
            {showNotes ? 'Hide inspection notes' : '+ Add inspection notes'}
          </Text>
        </TouchableOpacity>

        {/* Expandable Notes Area */}
        {showNotes ? (
          <View style={[styles.inputGroup, { marginTop: 6 }]}>
            <TextInput
              style={[styles.input, styles.notesArea]}
              value={item.notes}
              onChangeText={(val) => updateSample(item.id, { notes: val })}
              placeholder="Detailed comments, condition, sampling technique notes..."
              multiline
            />
          </View>
        ) : null}
      </View>
    );
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name="cube-outline" size={36} color={colors.primaryContainer} />
      </View>
      <Text style={styles.emptyTitle}>No Samples Logged Yet</Text>
      <Text style={styles.emptySubtitle}>
        {isAsbestos
          ? 'Start logging bulk samples for this asbestos inspection project.'
          : 'Add sample items to configure media records and photos.'}
      </Text>
      <TouchableOpacity style={styles.addFirstSampleBtn} onPress={handleAddNewSample} activeOpacity={0.8}>
        <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
        <Text style={styles.addFirstSampleBtnText}>
          {isAsbestos ? '+ Add First Bulk Sample' : '+ Add First Sample'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* App Themed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>{isAsbestos ? 'Asbestos Bulk Samples' : 'Sample Logging'}</Text>
          <Text style={styles.headerSubtitle}>{samples.length} Samples in Batch</Text>
        </View>
        <TouchableOpacity onPress={handleSaveAll} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={samples}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyList}
        renderItem={renderSampleItem}
        contentContainerStyle={[
          styles.scrollList,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 90 : 90 }
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 }]}>
        <TouchableOpacity style={styles.bottomAddBtn} onPress={handleAddNewSample} activeOpacity={0.8}>
          <Ionicons name="add-circle-outline" size={20} color={colors.primaryContainer} style={{ marginRight: 6 }} />
          <Text style={styles.bottomAddBtnText}>+ Add Sample</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.applyButton} onPress={handleSaveAll} activeOpacity={0.8}>
          <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.applyButtonText}>Save & Done</Text>
        </TouchableOpacity>
      </View>

      {/* CompanyCam Style Image Markup & Notes Editor Modal */}
      <ImageEditorModal
        visible={editorVisible}
        imageUri={editorImageUri}
        onSave={handleEditorSave}
        onCancel={handleEditorCancel}
      />

      {/* Quick Auto-fill Modal */}
      <Modal visible={autoFillModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Auto-fill {autoFillType.charAt(0).toUpperCase() + autoFillType.slice(1)}
            </Text>
            <Text style={styles.modalSubtitle}>
              Enter value to apply across all samples in this batch:
            </Text>
            <TextInput
              style={styles.modalInput}
              value={autoFillInput}
              onChangeText={setAutoFillInput}
              placeholder="e.g. Master Bedroom"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalCancelBtn} 
                onPress={() => setAutoFillModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalApplyBtn} 
                onPress={submitAutoFillModal}
              >
                <Text style={styles.modalApplyText}>Apply to All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    height: 64,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: { padding: 8, borderRadius: 20 },
  headerTitleGroup: { alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  headerSubtitle: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  saveHeaderBtn: { 
    backgroundColor: colors.primaryContainer, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 6 
  },
  saveHeaderText: { color: colors.onPrimary, fontSize: 14, fontWeight: '700' },
  scrollList: { padding: 16, paddingBottom: 110 },
  headerSectionsWrapper: { marginBottom: 6 },
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  configGrid: { gap: 10 },
  inputGroup: { marginBottom: 4 },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colors.onSurface,
  },
  row: { flexDirection: 'row' },
  autoFillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F7',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  autoFillBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  samplesListHeader: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  samplesListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  addSampleHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addSampleHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sampleCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 8,
  },
  sampleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
    marginBottom: 4,
  },
  sampleBadge: {
    backgroundColor: '#E6F8F7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#b2ebe5',
  },
  sampleBadgeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  deleteSampleBtn: {
    marginLeft: 10,
    padding: 4,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  togglesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleItemLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  samplePhotoSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  samplePhotoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  samplePhotoSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  samplePhotoActions: {
    flexDirection: 'row',
    gap: 6,
  },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  photoActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryContainer,
  },
  photoThumbnailScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  thumbnailWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  sampleThumbnail: {
    width: 62,
    height: 62,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  thumbnailEditBadge: {
    position: 'absolute',
    bottom: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeThumbnailBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  noPhotosText: {
    fontSize: 11,
    color: colors.outline,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  notesToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginTop: 2,
  },
  notesToggleText: {
    color: colors.primaryContainer,
    fontSize: 13,
    fontWeight: '600',
  },
  notesArea: {
    minHeight: 56,
    textAlignVertical: 'top',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 18,
  },
  addFirstSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addFirstSampleBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
    borderRadius: 8,
    backgroundColor: '#F0FDFA',
  },
  bottomAddBtnText: {
    color: colors.primaryContainer,
    fontSize: 14,
    fontWeight: '700',
  },
  applyButton: {
    flex: 1,
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 360,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: colors.secondary, marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.onSurface,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  modalCancelText: { color: colors.secondary, fontSize: 14, fontWeight: '500' },
  modalApplyBtn: { backgroundColor: colors.primaryContainer, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  modalApplyText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
});
