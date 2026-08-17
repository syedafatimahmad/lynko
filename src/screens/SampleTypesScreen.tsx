import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

interface SampleTypeItem {
  id: string;
  name: string;
  category: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const SAMPLE_TYPES: SampleTypeItem[] = [
  { id: '1', name: 'Asbestos PCM Cassette', category: 'Air Sampling Media', iconName: 'funnel-outline' },
  { id: '2', name: 'Asbestos TEM cassette', category: 'Microscopic Air Media', iconName: 'hardware-chip-outline' },
  { id: '3', name: 'Bulk sample', category: 'Drywall, Floor Tile, Insulation', iconName: 'cube-outline' },
  { id: '4', name: 'Endotoxin free cassette', category: 'Biological Cassette', iconName: 'shield-checkmark-outline' },
  { id: '5', name: 'Polycarbonate Air Filter Cassette', category: 'Air Filter Media', iconName: 'disc-outline' },
  { id: '6', name: 'PTFE Filter Cassette', category: 'Chemical Membrane Filter', iconName: 'layers-outline' },
  { id: '7', name: 'Spore Trap: Cassette', category: 'Air-O-Cell Mold Spore Trap', iconName: 'leaf-outline' },
  { id: '8', name: 'Spore Trap: Slide', category: 'Surface Tape Lift / Slide', iconName: 'albums-outline' },
  { id: '9', name: 'Via-cell cassette', category: 'Viable Fungal / Bacterial', iconName: 'flask-outline' },
];

export default function SampleTypesScreen({ navigation }: any) {
  const cocData = useLynkoStore((state) => state.cocData);
  const setSampleTypeCounts = useLynkoStore((state) => state.setSampleTypeCounts);

  const initialCounts = cocData.sampleTypeCounts || { 'Bulk sample': 4 };
  const [counts, setCounts] = useState<{ [key: string]: number }>(initialCounts);

  const handleIncrement = (name: string) => {
    setCounts(prev => ({
      ...prev,
      [name]: (prev[name] || 0) + 1,
    }));
  };

  const handleDecrement = (name: string) => {
    setCounts(prev => ({
      ...prev,
      [name]: Math.max(0, (prev[name] || 0) - 1),
    }));
  };

  const handleSave = async () => {
    await setSampleTypeCounts(counts);
    navigation.goBack();
  };

  const totalSelected = Object.values(counts).reduce((acc, curr) => acc + curr, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* App Themed Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Sample Types</Text>
          <Text style={styles.headerSubtitle}>{totalSelected} Total Samples Configured</Text>
        </View>
        <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn}>
          <Text style={styles.saveHeaderText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionNotice}>
          Select the quantities of sampling media collected on-site. Tapping Save will automatically configure your sample logging batch.
        </Text>

        <View style={styles.cardWrapper}>
          {SAMPLE_TYPES.map((item, idx) => {
            const count = counts[item.name] || 0;
            const isSelected = count > 0;
            const isLast = idx === SAMPLE_TYPES.length - 1;

            return (
              <View 
                key={item.id} 
                style={[
                  styles.typeRow,
                  isSelected && styles.typeRowActive,
                  isLast && { borderBottomWidth: 0 }
                ]}
              >
                {/* Media Icon/Badge */}
                <View style={[styles.iconBadge, isSelected && styles.iconBadgeActive]}>
                  <Ionicons 
                    name={item.iconName} 
                    size={22} 
                    color={isSelected ? colors.primary : colors.secondary} 
                  />
                </View>

                {/* Title & Category */}
                <View style={styles.infoCol}>
                  <Text style={[styles.typeName, isSelected && styles.typeNameActive]}>{item.name}</Text>
                  <Text style={styles.typeCategory}>{item.category}</Text>
                </View>

                {/* Stepper: - [ count ] + */}
                <View style={styles.stepperContainer}>
                  <TouchableOpacity 
                    style={[styles.stepperBtn, count === 0 && styles.stepperBtnDisabled]} 
                    onPress={() => handleDecrement(item.name)}
                    disabled={count === 0}
                  >
                    <Ionicons 
                      name="remove" 
                      size={18} 
                      color={count > 0 ? colors.primary : '#94A3B8'} 
                    />
                  </TouchableOpacity>

                  <View style={[styles.stepperCountBox, isSelected && styles.stepperCountBoxActive]}>
                    <Text style={[styles.stepperCountText, isSelected && styles.stepperCountTextActive]}>
                      {count}
                    </Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.stepperBtn} 
                    onPress={() => handleIncrement(item.name)}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.applyButton} onPress={handleSave}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.applyButtonText}>Apply & Update Samples ({totalSelected})</Text>
        </TouchableOpacity>
      </View>
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
  listContainer: { padding: 16, paddingBottom: 100 },
  sectionNotice: {
    fontSize: 13,
    color: colors.secondary,
    lineHeight: 18,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  cardWrapper: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  typeRowActive: {
    backgroundColor: '#F8FAFC',
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconBadgeActive: {
    backgroundColor: '#E6F8F7',
  },
  infoCol: { flex: 1, paddingRight: 8 },
  typeName: { fontSize: 15, fontWeight: '600', color: colors.onSurface },
  typeNameActive: { color: colors.primary, fontWeight: '700' },
  typeCategory: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#E6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  stepperCountBox: {
    width: 44,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepperCountBoxActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: '#FFFFFF',
  },
  stepperCountText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  stepperCountTextActive: {
    color: colors.primary,
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
});
