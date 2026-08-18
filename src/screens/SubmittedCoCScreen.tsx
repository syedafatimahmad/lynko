import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore, SubmissionRecord } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { generateCoCPdf } from '../utils/pdfGenerator';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';

export default function SubmittedCoCScreen({ navigation }: any) {
  const submissions = useLynkoStore((state) => state.submissions);
  const updateSubmissionStatus = useLynkoStore((state) => state.updateSubmissionStatus);
  const deleteSubmission = useLynkoStore((state) => state.deleteSubmission);
  const cocData = useLynkoStore((state) => state.cocData);
  const samples = useLynkoStore((state) => state.samples);

  const [activeFilter, setActiveFilter] = useState<'All' | 'Dispatched' | 'Delivered'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSubmissions = submissions.filter(sub => {
    const matchesFilter = activeFilter === 'All' ? true : sub.status === activeFilter;
    const matchesSearch = 
      sub.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.recipientEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleToggleStatus = (sub: SubmissionRecord) => {
    const newStatus = sub.status === 'Delivered' ? 'Dispatched' : 'Delivered';
    updateSubmissionStatus(sub.id, newStatus);
  };

  const handleViewPdf = async (sub: SubmissionRecord) => {
    try {
      const pdfUri = await generateCoCPdf(cocData, samples);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Chain of Custody - ${sub.poNumber || 'Submitted'}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        await Share.share({ url: pdfUri, title: `CoC ${sub.poNumber}` });
      }
    } catch (e: any) {
      Alert.alert('Error', 'Could not open PDF document.');
    }
  };

  const handleResend = (sub: SubmissionRecord) => {
    navigation.navigate('SubmitCoC', {
      prefillRecipient: sub.recipientEmail,
      prefillSubject: sub.subject,
    });
  };

  const handleDelete = (id: string, poNumber: string) => {
    Alert.alert(
      'Delete Record',
      `Are you sure you want to remove the submission record for ${poNumber || 'this project'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSubmission(id) },
      ]
    );
  };

  const renderSubmissionCard = ({ item }: { item: SubmissionRecord }) => {
    const isDelivered = item.status === 'Delivered';

    return (
      <View style={styles.card}>
        {/* Card Header Row */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.poBadge}>
            <Text style={styles.poBadgeText}>PO #{item.poNumber || 'N/A'}</Text>
          </View>

          <TouchableOpacity 
            style={[styles.statusBadge, isDelivered ? styles.statusBadgeDelivered : styles.statusBadgeDispatched]}
            onPress={() => handleToggleStatus(item)}
          >
            <Ionicons 
              name={isDelivered ? "checkmark-circle" : "paper-plane-outline"} 
              size={14} 
              color={isDelivered ? "#047857" : colors.primary} 
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusBadgeText, isDelivered ? styles.statusTextDelivered : styles.statusTextDispatched]}>
              {isDelivered ? 'Confirmed by Lab' : 'Dispatched'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Project Title & Sent Time */}
        <Text style={styles.projectTitle}>{item.projectTitle || 'Field Inspection CoC'}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.secondary} style={{ marginRight: 4 }} />
          <Text style={styles.metaText}>Submitted on {item.submittedAt}</Text>
        </View>

        {/* Recipient Details */}
        <View style={styles.recipientBox}>
          <View style={styles.recipientRow}>
            <Ionicons name="mail" size={14} color={colors.primaryContainer} style={{ marginRight: 6 }} />
            <Text style={styles.recipientLabel}>To:</Text>
            <Text style={styles.recipientValue} numberOfLines={1}>{item.recipientEmail}</Text>
          </View>
          {item.senderEmail ? (
            <View style={styles.recipientRow}>
              <Ionicons name="person-outline" size={14} color={colors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.recipientLabel}>From:</Text>
              <Text style={styles.recipientValue} numberOfLines={1}>{item.senderEmail}</Text>
            </View>
          ) : null}
        </View>

        {/* Summary Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.tagBadge}>
            <Text style={styles.tagBadgeText}>{item.samplesCount} Samples</Text>
          </View>
          {item.photosCount > 0 ? (
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>{item.photosCount} Photos</Text>
            </View>
          ) : null}
          {item.turnaround ? (
            <View style={[styles.tagBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.tagBadgeText, { color: '#92400E' }]}>{item.turnaround}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.viewPdfBtn} onPress={() => handleViewPdf(item)}>
            <Ionicons name="document-text-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.viewPdfBtnText}>View PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendBtn} onPress={() => handleResend(item)}>
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.resendBtnText}>Resend CoC</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.poNumber)}>
            <Ionicons name="trash-outline" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Submitted CoCs</Text>
          <Text style={styles.headerSubtitle}>{submissions.length} Total Submissions Recorded</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.secondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by PO #, project, or recipient..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(['All', 'Dispatched', 'Delivered'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab)}
          >
            <Text style={[styles.filterTabText, activeFilter === tab && styles.filterTabTextActive]}>
              {tab === 'Delivered' ? 'Confirmed' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Submissions List */}
      <FlatList
        data={filteredSubmissions}
        keyExtractor={(item) => item.id}
        renderItem={renderSubmissionCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-attach-outline" size={56} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Submissions Recorded Yet</Text>
            <Text style={styles.emptySubtitle}>
              When you submit a Chain of Custody to an environmental lab, a verified dispatch snapshot with PDF re-download & resend options will appear here automatically.
            </Text>
          </View>
        }
      />
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
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterTabActive: {
    backgroundColor: colors.primaryContainer,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
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
    paddingVertical: 4,
    borderRadius: 6,
  },
  poBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeDispatched: {
    backgroundColor: '#E6F8F7',
    borderColor: '#b2ebe5',
  },
  statusBadgeDelivered: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextDispatched: { color: colors.primary },
  statusTextDelivered: { color: '#047857' },
  projectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  metaText: {
    fontSize: 12,
    color: colors.secondary,
  },
  recipientBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  recipientRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginRight: 6,
  },
  recipientValue: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: '500',
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  viewPdfBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6F8F7',
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: 6,
    paddingVertical: 8,
  },
  viewPdfBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  resendBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryContainer,
    borderRadius: 6,
    paddingVertical: 8,
  },
  resendBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.secondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
