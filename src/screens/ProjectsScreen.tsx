import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';

export default function ProjectsScreen({ navigation }: any) {
  const projects = useLynkoStore((state) => state.projects);
  const submissions = useLynkoStore((state) => state.submissions);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const deleteProject = useLynkoStore((state) => state.deleteProject);
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Draft' | 'Dispatched' | 'Completed'>('All');

  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (p.poNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = statusFilter === 'All' ? true : p.status === statusFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Submissions History shortcut */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Projects</Text>
          <Text style={styles.subtitle}>Manage and search inspection jobs</Text>
        </View>

        <TouchableOpacity 
          style={styles.submissionsBtn} 
          onPress={() => navigation.navigate('SubmittedCoC')}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.submissionsBtnText}>Submitted CoCs</Text>
          {submissions.length > 0 && (
            <View style={styles.submissionsCountBadge}>
              <Text style={styles.submissionsCountText}>{submissions.length}</Text>
            </View>
          )}
        </TouchableOpacity>
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

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          {(['All', 'Draft', 'Dispatched', 'Completed'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterChip, statusFilter === tab && styles.filterChipActive]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text style={[styles.filterChipText, statusFilter === tab && styles.filterChipTextActive]}>
                {tab === 'All' ? `All (${projects.length})` : tab}
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
              <Ionicons name="folder-open-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptySubtitle}>
                Tap the '+' button below to start a new Chain of Custody inspection.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.card}
              onPress={() => {
                updateCoCData({
                  poNumber: item.poNumber,
                  description: item.description || '',
                  zipCode: item.zipCode || '',
                });
                navigation.navigate('ChainOfCustody');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.poBadge}>
                  <Text style={styles.poNumber}>PO #{item.poNumber || 'N/A'}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteProject(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.descriptionText}>{item.description}</Text> : null}
              <Text style={styles.address}>📍 {item.address || 'No address specified'}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.samplesCount}>🧪 {item.samplesCount || 0} Samples</Text>
                
                <View style={[
                  styles.statusBadge,
                  item.status === 'Completed' ? styles.statusBadgeCompleted :
                  item.status === 'Dispatched' ? styles.statusBadgeDispatched : styles.statusBadgeDraft
                ]}>
                  <Text style={[
                    styles.statusText,
                    item.status === 'Completed' ? styles.statusTextCompleted :
                    item.status === 'Dispatched' ? styles.statusTextDispatched : styles.statusTextDraft
                  ]}>
                    {item.status || 'Draft'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 36,
    paddingBottom: 16,
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
  submissionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F7',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  submissionsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  submissionsCountBadge: {
    backgroundColor: colors.primaryContainer,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  submissionsCountText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
  },
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  poNumber: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  deleteButton: { padding: 4 },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 4,
  },
  descriptionText: {
    color: colors.secondary,
    fontSize: 13,
    marginBottom: 8,
  },
  address: {
    color: colors.secondary,
    fontSize: 13,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 'auto',
  },
  samplesCount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeDraft: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  statusBadgeDispatched: {
    backgroundColor: '#E6F8F7',
    borderColor: '#b2ebe5',
  },
  statusBadgeCompleted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextDraft: { color: colors.secondary },
  statusTextDispatched: { color: colors.primary },
  statusTextCompleted: { color: '#047857' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 40,
  },
});
