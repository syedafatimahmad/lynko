import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Switch, TextInput, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';
import { colors } from '../theme/colors';

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

  // Quick Auto-fill prompt modal state
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
    <View>
      {/* Top Analysis & Turnaround Box matching Screenshot 3 */}
      <View style={styles.configBox}>
        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Add Analysis 1:</Text>
          <TextInput
            style={styles.configInput}
            value={analysis1}
            onChangeText={setAnalysis1}
            placeholder="e.g. Asbestos PLM"
          />
        </View>

        <View style={styles.configRow}>
          <Text style={styles.configSubLabel}>Turnaround:</Text>
          <TextInput
            style={styles.configSubInput}
            value={turnaround1}
            onChangeText={setTurnaround1}
            placeholder="e.g. Next-day rush"
          />
        </View>

        <View style={styles.configRow}>
          <Text style={styles.configLabel}>Add Analysis 2:</Text>
          <TextInput
            style={styles.configInput}
            value={analysis2}
            onChangeText={setAnalysis2}
            placeholder="Not set"
          />
        </View>

        <View style={styles.configRow}>
          <Text style={styles.configSubLabel}>Turnaround:</Text>
          <TextInput
            style={styles.configSubInput}
            value={turnaround2}
            onChangeText={setTurnaround2}
            placeholder="Optional"
          />
        </View>
      </View>

      {/* Auto Fill Section matching Screenshot 3 */}
      <View style={styles.autoFillSection}>
        <Text style={styles.editSamplesHeaderTitle}>Edit Samples</Text>
        <Text style={styles.autoFillHeader}>Auto fill</Text>

        <View style={styles.autoFillGrid}>
          <View style={styles.autoFillCol}>
            <TouchableOpacity 
              style={styles.autoFillBtn} 
              onPress={() => handleTriggerAutoFill('sampleId')}
            >
              <Text style={styles.autoFillBtnText}>Sample ID</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.autoFillBtn} 
              onPress={() => handleTriggerAutoFill('description')}
            >
              <Text style={styles.autoFillBtnText}>Description</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.autoFillCol}>
            <TouchableOpacity 
              style={styles.autoFillBtn} 
              onPress={() => handleTriggerAutoFill('measurement')}
            >
              <Text style={styles.autoFillBtnText}>Measurement</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.autoFillBtn} 
              onPress={() => handleTriggerAutoFill('unit')}
            >
              <Text style={styles.autoFillBtnText}>Unit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderSampleItem = ({ item, index }: { item: SampleItem, index: number }) => {
    const showNotes = Boolean(expandedNotes[item.id] || (item.notes && item.notes.length > 0));

    return (
      <View style={styles.sampleCard}>
        {/* Sample ID Row */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Sample ID</Text>
          <TextInput
            style={[styles.fieldInput, { flex: 1 }]}
            value={item.name}
            onChangeText={(val) => updateSample(item.id, { name: val })}
            placeholder={`${index + 1}`}
          />
        </View>

        {/* Analysis 1 & 2 Toggles */}
        <View style={styles.togglesRow}>
          <View style={styles.toggleGroup}>
            <Text style={styles.toggleText}>Analysis 1:</Text>
            <Switch
              value={item.analysis1Enabled}
              onValueChange={(val) => updateSample(item.id, { analysis1Enabled: val })}
              trackColor={{ true: '#22c55e', false: '#cbd5e1' }}
            />
          </View>

          <View style={styles.toggleGroup}>
            <Text style={styles.toggleText}>Analysis 2:</Text>
            <Switch
              value={item.analysis2Enabled}
              onValueChange={(val) => updateSample(item.id, { analysis2Enabled: val })}
              trackColor={{ true: '#22c55e', false: '#cbd5e1' }}
            />
          </View>
        </View>

        {/* Description Row */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.fieldInput, { flex: 1 }]}
            value={item.description}
            onChangeText={(val) => updateSample(item.id, { description: val })}
            placeholder="e.g. Bedroom"
          />
        </View>

        {/* Property & Add Notes Row */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Property</Text>
          <TextInput
            style={[styles.fieldInput, { width: 120 }]}
            value={item.property}
            onChangeText={(val) => updateSample(item.id, { property: val })}
            placeholder="None"
          />
          <TouchableOpacity style={styles.addNotesBtn} onPress={() => toggleNotes(item.id)}>
            <Text style={styles.addNotesText}>{showNotes ? 'Hide notes' : 'Add notes'}</Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Notes Input */}
        {showNotes ? (
          <View style={[styles.fieldRow, { marginTop: 6 }]}>
            <Text style={styles.fieldLabel}>Notes</Text>
            <TextInput
              style={[styles.fieldInput, styles.notesInput]}
              value={item.notes}
              onChangeText={(val) => updateSample(item.id, { notes: val })}
              placeholder="Inspection comments / notes"
              multiline
            />
          </View>
        ) : null}

        {/* Measurement & Unit Row */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Measurement</Text>
          <TextInput
            style={[styles.fieldInput, styles.smallInput]}
            value={item.measurement}
            onChangeText={(val) => updateSample(item.id, { measurement: val })}
            placeholder="0"
          />
          <TextInput
            style={[styles.fieldInput, styles.unitInput]}
            value={item.unit || 'N/A'}
            onChangeText={(val) => updateSample(item.id, { unit: val })}
            placeholder="N/A"
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Header matching Screenshots 3 & 4 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Bulk sample</Text>
        <TouchableOpacity onPress={handleSaveAll} style={styles.navBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={samples}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderSampleItem}
        ItemSeparatorComponent={() => <View style={styles.cardSeparator} />}
        contentContainerStyle={styles.scrollList}
        showsVerticalScrollIndicator={false}
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
  safeArea: { flex: 1, backgroundColor: '#EDF2F7' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  navBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { color: '#0284c7', fontSize: 16, fontWeight: '500' },
  saveText: { color: '#0284c7', fontSize: 16, fontWeight: '600' },
  navTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  scrollList: { paddingBottom: 60 },
  configBox: {
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 8,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  configLabel: {
    width: 110,
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  configSubLabel: {
    width: 100,
    marginLeft: 10,
    fontSize: 13,
    color: '#64748B',
  },
  configInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1E293B',
  },
  configSubInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1E293B',
  },
  autoFillSection: {
    padding: 16,
    alignItems: 'center',
  },
  editSamplesHeaderTitle: {
    color: '#0284c7',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  autoFillHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  autoFillGrid: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  autoFillCol: {
    flex: 1,
    gap: 8,
  },
  autoFillBtn: {
    borderWidth: 1,
    borderColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
  },
  autoFillBtnText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '600',
  },
  sampleCard: {
    backgroundColor: '#EDF2F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  cardSeparator: {
    height: 2,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fieldLabel: {
    width: 95,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#1E293B',
  },
  smallInput: {
    width: 80,
    textAlign: 'center',
    marginRight: 8,
  },
  unitInput: {
    width: 80,
    textAlign: 'center',
  },
  notesInput: {
    flex: 1,
    minHeight: 50,
    textAlignVertical: 'top',
  },
  togglesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 4,
    paddingRight: 16,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  addNotesBtn: {
    marginLeft: 14,
    paddingVertical: 4,
  },
  addNotesText: {
    color: '#0284c7',
    fontSize: 14,
    fontWeight: '500',
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  modalCancelBtn: { paddingVertical: 8, paddingHorizontal: 14 },
  modalCancelText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  modalApplyBtn: { backgroundColor: '#0284c7', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
  modalApplyText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
