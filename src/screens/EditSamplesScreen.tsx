import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function EditSamplesScreen({ navigation }: any) {
  const samples = useLynkoStore((state) => state.samples);
  const updateSample = useLynkoStore((state) => state.updateSample);
  const cocData = useLynkoStore((state) => state.cocData);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const autoFillField = useLynkoStore((state) => state.autoFillField);

  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});
  const [analysis1, setAnalysis1] = useState(cocData.analysis1 || 'Asbestos PLM');
  const [turnaround1, setTurnaround1] = useState(cocData.turnaround1 || 'Next-day rush');
  const [analysis2, setAnalysis2] = useState(cocData.analysis2 || 'Not set');
  const [turnaround2, setTurnaround2] = useState(cocData.turnaround2 || '');

  // Quick Auto-fill modal state
  const [autoFillModalVisible, setAutoFillModalVisible] = useState(false);
  const [autoFillType, setAutoFillType] = useState<'sampleId' | 'description' | 'measurement' | 'unit'>('description');
  const [autoFillInput, setAutoFillInput] = useState('');

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
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

  const handleTriggerAutoFill = (type: 'sampleId' | 'description' | 'measurement' | 'unit') => {
    if (type === 'sampleId') {
      autoFillField('sampleId');
      Alert.alert('Auto Fill', 'Sample IDs sequentially re-numbered (1, 2, 3...).');
    } else {
      setAutoFillType(type);
      setAutoFillInput(type === 'measurement' ? '0' : type === 'unit' ? 'N/A' : '');
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
          <Text style={styles.cardTitle}>Batch Analysis & Turnaround</Text>
        </View>

        <View style={styles.configGrid}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Add Analysis 1</Text>
            <TextInput
              style={styles.input}
              value={analysis1}
              onChangeText={setAnalysis1}
              placeholder="e.g. Asbestos PLM"
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

          <TouchableOpacity 
            style={styles.autoFillBtn} 
            onPress={() => handleTriggerAutoFill('measurement')}
          >
            <Ionicons name="speedometer-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.autoFillBtnText}>Measurement</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.autoFillBtn} 
            onPress={() => handleTriggerAutoFill('unit')}
          >
            <Ionicons name="cube-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.autoFillBtnText}>Unit (N/A, L, sq ft)</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.samplesListHeader}>
        <Text style={styles.samplesListTitle}>Individual Sample Records ({samples.length})</Text>
      </View>
    </View>
  );

  const renderSampleItem = ({ item, index }: { item: SampleItem, index: number }) => {
    const showNotes = Boolean(expandedNotes[item.id] || (item.notes && item.notes.length > 0));

    return (
      <View style={styles.sampleCard}>
        {/* Sample Header Row with Badge & Toggles */}
        <View style={styles.sampleCardHeader}>
          <View style={styles.sampleBadge}>
            <Text style={styles.sampleBadgeText}>Sample #{index + 1}</Text>
          </View>

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

        {/* Property & Measurement / Unit */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1.2, marginRight: 8 }]}>
            <Text style={styles.inputLabel}>Property / Material</Text>
            <TextInput
              style={styles.input}
              value={item.property}
              onChangeText={(val) => updateSample(item.id, { property: val })}
              placeholder="None / Bulk"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 0.9, marginRight: 6 }]}>
            <Text style={styles.inputLabel}>Measurement</Text>
            <TextInput
              style={styles.input}
              value={item.measurement}
              onChangeText={(val) => updateSample(item.id, { measurement: val })}
              placeholder="0"
            />
          </View>

          <View style={[styles.inputGroup, { flex: 0.8 }]}>
            <Text style={styles.inputLabel}>Unit</Text>
            <TextInput
              style={styles.input}
              value={item.unit || 'N/A'}
              onChangeText={(val) => updateSample(item.id, { unit: val })}
              placeholder="N/A"
            />
          </View>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* App Themed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Sample Logging</Text>
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
        renderItem={renderSampleItem}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.applyButton} onPress={handleSaveAll}>
          <Ionicons name="checkmark-done" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.applyButtonText}>Save & Done</Text>
        </TouchableOpacity>
      </View>

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
  },
  samplesListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  applyButton: {
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
