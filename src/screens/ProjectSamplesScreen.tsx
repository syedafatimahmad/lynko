import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';

export default function ProjectSamplesScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const activeProjectId = useLynkoStore((state) => state.activeProjectId);
  const projects = useLynkoStore((state) => state.projects);
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const samples = useLynkoStore((state) => state.samples);
  const deleteSample = useLynkoStore((state) => state.deleteSample);

  const isMold = activeProject?.projectType === 'Mold';
  const addressDisplay = activeProject?.address || activeProject?.title || 'Job Site Location';
  const inspectionDate = activeProject?.date || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const turnaround = activeProject?.turnaround || '48 hr';
  const inspector = activeProject?.inspectorName || 'Ali Saleh';

  const handleDeleteSample = (id: string, name: string) => {
    Alert.alert('Delete Sample', `Are you sure you want to remove sample ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSample(id) },
    ]);
  };

  const handleEditSample = (id: string) => {
    navigation.navigate('SampleLogger', { sampleId: id });
  };

  const handleAddNewSample = () => {
    navigation.navigate('SampleLogger');
  };

  const handleFinishProject = () => {
    if (samples.length === 0) {
      Alert.alert('No Samples Logged', 'Please log at least one sample before finishing the project.');
      return;
    }
    navigation.navigate('ChainOfCustody');
  };

  const renderSampleItem = ({ item }: { item: SampleItem }) => {
    const hasPhoto = item.photoUris && item.photoUris.length > 0;
    const thumbnailUri = hasPhoto ? item.photoUris![0] : null;

    return (
      <TouchableOpacity
        style={styles.sampleCard}
        onPress={() => handleEditSample(item.id)}
        activeOpacity={0.7}
      >
        {/* Left: Photo Thumbnail or Icon */}
        <View style={styles.thumbWrapper}>
          {thumbnailUri ? (
            <Image source={{ uri: thumbnailUri }} style={styles.thumbImage} />
          ) : (
            <View style={styles.thumbPlaceholder}>
              <Ionicons name="camera-outline" size={24} color="#94A3B8" />
            </View>
          )}
          {hasPhoto && item.photoUris!.length > 1 && (
            <View style={styles.photoCountBadge}>
              <Text style={styles.photoCountText}>{item.photoUris!.length}</Text>
            </View>
          )}
        </View>

        {/* Center: Sample Info */}
        <View style={styles.sampleInfoCol}>
          <View style={styles.sampleIdRow}>
            <Text style={styles.sampleIdText}>{item.name}</Text>
            {item.sampleCode ? (
              <View style={styles.codeBadge}>
                <Text style={styles.codeBadgeText}>{item.sampleCode}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.sampleDescText} numberOfLines={2}>
            {item.description || 'No description added'}
          </Text>

          {/* If Mold: Show Pump readings badge */}
          {item.volume ? (
            <View style={styles.pumpReadingChip}>
              <Ionicons name="speedometer-outline" size={12} color="#0284C7" style={{ marginRight: 4 }} />
              <Text style={styles.pumpReadingChipText}>
                {item.flowRate ? `${item.flowRate} L/min • ` : ''}
                {item.duration ? `${item.duration} min • ` : ''}
                {item.volume}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Right: Actions */}
        <View style={styles.rightActionsRow}>
          <TouchableOpacity
            style={styles.trashBtn}
            onPress={() => handleDeleteSample(item.id, item.name)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={{ marginLeft: 6 }} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerBlock}>
      <Text style={styles.projectAddressText}>{addressDisplay}</Text>

      {/* Metadata 4-Column Card */}
      <View style={styles.metaCard}>
        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Inspection date</Text>
          <Text style={styles.metaValue}>{inspectionDate}</Text>
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Turnaround</Text>
          <Text style={styles.metaValue}>{turnaround}</Text>
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Inspector</Text>
          <Text style={styles.metaValue}>{inspector}</Text>
        </View>

        <View style={styles.metaCol}>
          <Text style={styles.metaLabel}>Samples</Text>
          <Text style={[styles.metaValue, { fontWeight: '800' }]}>{samples.length}</Text>
        </View>
      </View>

      <View style={styles.samplesSectionHeader}>
        <Text style={styles.samplesSectionTitle}>SAMPLES</Text>
        <Text style={styles.samplesSectionCount}>
          {samples.length} {isMold ? 'Air sample' : 'Bulk sample'}{samples.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={48} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>No samples logged yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap '+ Add sample' below to start logging your {isMold ? 'mold air' : 'asbestos bulk'} samples.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backProjectsBtn}
          onPress={() => navigation.navigate('AppTabs')}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={20} color="#0F172A" />
          <Text style={styles.backProjectsText}>Projects</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.editInfoBtn}
          onPress={() => navigation.navigate('NewProject')}
          activeOpacity={0.7}
        >
          <Text style={styles.editInfoText}>Edit info</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={samples}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        renderItem={renderSampleItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 85 : 95 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Bar: + Add Sample & Finish Project */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.addSampleOutlineBtn}
          onPress={handleAddNewSample}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#0F172A" style={{ marginRight: 6 }} />
          <Text style={styles.addSampleOutlineBtnText}>+ Add sample</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.finishProjectBtn}
          onPress={handleFinishProject}
          activeOpacity={0.8}
        >
          <Text style={styles.finishProjectBtnText}>Finish project</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backProjectsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  backProjectsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginLeft: 2,
  },
  editInfoBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  editInfoText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#881337',
  },
  listContent: {
    padding: 16,
  },
  headerBlock: {
    marginBottom: 12,
  },
  projectAddressText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
    lineHeight: 28,
  },
  metaCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  samplesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  samplesSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  samplesSectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  sampleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  thumbWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  thumbImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  photoCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sampleInfoCol: {
    flex: 1,
  },
  sampleIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sampleIdText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginRight: 6,
  },
  codeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  sampleDescText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  pumpReadingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  pumpReadingChipText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '700',
  },
  rightActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  trashBtn: {
    padding: 6,
    borderRadius: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  addSampleOutlineBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  addSampleOutlineBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  finishProjectBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#881337',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#881337',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  finishProjectBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
