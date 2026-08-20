import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  TextInput, 
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import { useLynkoStore, Project } from '../store/lynkoStore';
import { generatePDF } from '../utils/pdfGenerator';
import { colors } from '../theme/colors';

export default function ProjectsScreen({ navigation }: any) {
  const projects = useLynkoStore((state) => state.projects);
  const cocData = useLynkoStore((state) => state.cocData);
  const samples = useLynkoStore((state) => state.samples);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const deleteProject = useLynkoStore((state) => state.deleteProject);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Submitted'>('All');

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesFilter = 
      statusFilter === 'All' ? true :
      statusFilter === 'Draft' ? (p.status === 'Draft' || !p.status) :
      p.status === 'Submitted';

    return matchesSearch && matchesFilter;
  });

  const handleOpenPdf = async (item: Project) => {
    try {
      if (item.pdfUri) {
        await Print.printAsync({ uri: item.pdfUri });
      } else {
        // Generate on-the-fly if legacy record
        const uri = await generatePDF(null, {
          ...cocData,
          poNumber: item.poNumber,
          description: item.description || item.title,
          zipCode: item.zipCode,
        }, samples);
        if (uri) {
          await Print.printAsync({ uri });
        }
      }
    } catch (e: any) {
      console.error('Error opening PDF:', e);
      Alert.alert('Notice', 'Could not open PDF viewer on device.');
    }
  };

  const handleEditProject = (item: Project) => {
    updateCoCData({
      poNumber: item.poNumber,
      description: item.description || item.title || '',
      zipCode: item.zipCode || '',
    });
    navigation.navigate('ChainOfCustody');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Clean Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>Manage drafts and submitted Chains of Custody</Text>
      </View>

      <View style={styles.container}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO #, description, address..."
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.secondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3 Simple, Clear Tabs */}
        <View style={styles.filterRow}>
          {[
            { key: 'All' as const, label: 'All', count: projects.length },
            { key: 'Draft' as const, label: 'Drafts', count: projects.filter(p => p.status === 'Draft' || !p.status).length },
            { key: 'Submitted' as const, label: 'Submitted', count: projects.filter(p => p.status === 'Submitted').length },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, statusFilter === tab.key && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text style={[styles.filterChipText, statusFilter === tab.key && styles.filterChipTextActive]}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Projects List */}
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons 
                name={statusFilter === 'Submitted' ? 'checkmark-circle-outline' : 'folder-open-outline'} 
                size={48} 
                color="#CBD5E1" 
              />
              <Text style={styles.emptyTitle}>
                {statusFilter === 'All' ? 'No Projects Found' : 
                 statusFilter === 'Submitted' ? 'No Submitted CoCs Yet' : 'No Draft Projects'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {statusFilter === 'Submitted'
                  ? "When you finish and submit a Chain of Custody, it will appear here with its PDF document."
                  : "Tap the '+' button below to start a new Chain of Custody inspection."}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSubmitted = item.status === 'Submitted';

            return (
              <View style={[styles.card, isSubmitted && styles.cardSubmitted]}>
                {/* Header Row: PO # & Status Badge & Delete */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.poBadge}>
                    <Text style={styles.poNumber}>PO #{item.poNumber || 'N/A'}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[
                      styles.statusBadge,
                      isSubmitted ? styles.statusBadgeSubmitted : styles.statusBadgeDraft
                    ]}>
                      <Ionicons 
                        name={isSubmitted ? "checkmark-circle" : "create-outline"} 
                        size={12} 
                        color="#FFFFFF" 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={styles.statusBadgeText}>
                        {isSubmitted ? 'Submitted' : 'Draft'}
                      </Text>
                    </View>

                    <TouchableOpacity 
                      style={styles.deleteButton} 
                      onPress={() => {
                        Alert.alert(
                          'Delete Project',
                          `Are you sure you want to remove PO #${item.poNumber || 'this project'}?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteProject(item.id) }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Project Title & Details */}
                <Text style={styles.cardTitle}>{item.title || item.description || 'Field Inspection'}</Text>
                {item.description && item.description !== item.title ? (
                  <Text style={styles.descriptionText}>{item.description}</Text>
                ) : null}
                
                <Text style={styles.address}>📍 {item.address || 'Field Location'}</Text>
                
                {isSubmitted && (
                  <View style={styles.submissionMetaBox}>
                    <Ionicons name="paper-plane-outline" size={14} color={colors.primaryContainer} style={{ marginRight: 6 }} />
                    <Text style={styles.submissionMetaText} numberOfLines={1}>
                      Sent to <Text style={{ fontWeight: '700' }}>{item.recipientEmail || 'Testing Lab'}</Text>
                      {item.submittedAt ? ` • ${item.submittedAt}` : ''}
                    </Text>
                  </View>
                )}

                {/* Footer Action Buttons */}
                <View style={styles.cardFooter}>
                  <Text style={styles.samplesCount}>🧪 {item.samplesCount || 0} Samples</Text>

                  <View style={styles.actionButtonsRow}>
                    {isSubmitted ? (
                      <TouchableOpacity 
                        style={styles.viewPdfButton} 
                        onPress={() => handleOpenPdf(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="document-text" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.viewPdfButtonText}>View PDF</Text>
                      </TouchableOpacity>
                    ) : null}

                    <TouchableOpacity 
                      style={isSubmitted ? styles.editOutlineButton : styles.continueDraftButton} 
                      onPress={() => handleEditProject(item)}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={isSubmitted ? "open-outline" : "arrow-forward-circle"} 
                        size={14} 
                        color={isSubmitted ? colors.primary : "#FFFFFF"} 
                        style={{ marginRight: 4 }} 
                      />
                      <Text style={isSubmitted ? styles.editOutlineButtonText : styles.continueDraftButtonText}>
                        {isSubmitted ? 'Edit CoC' : 'Continue'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Floating Add Project Action Button */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => navigation.navigate('NewProject')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color={colors.onPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 2,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainer,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.onSurface,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  filterChipTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 88,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardSubmitted: {
    borderColor: '#CCFBF1',
    backgroundColor: '#FAFDFD',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  poNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.secondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeDraft: {
    backgroundColor: '#F59E0B',
  },
  statusBadgeSubmitted: {
    backgroundColor: colors.primaryContainer,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 13,
    color: colors.secondary,
    marginBottom: 6,
  },
  address: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  submissionMetaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  submissionMetaText: {
    fontSize: 11,
    color: '#0F766E',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 4,
  },
  samplesCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  viewPdfButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  continueDraftButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  continueDraftButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  editOutlineButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
});
