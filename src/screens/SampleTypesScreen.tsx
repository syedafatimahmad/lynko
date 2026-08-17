import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
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
  { id: '1', name: 'Asbestos PCM Cassette', category: 'Air Sampling', iconName: 'cylinder-outline' },
  { id: '2', name: 'Asbestos TEM cassette', category: 'Microscopic Air', iconName: 'hardware-chip-outline' },
  { id: '3', name: 'Bulk sample', category: 'Drywall, Floor Tile, Insulation', iconName: 'cube-outline' },
  { id: '4', name: 'Endotoxin free cassette', category: 'Biological Cassette', iconName: 'shield-outline' },
  { id: '5', name: 'Polycarbonate Air Filter Cassette', category: 'Filter Media', iconName: 'disc-outline' },
  { id: '6', name: 'PTFE Filter Cassette', category: 'Membrane Filter', iconName: 'funnel-outline' },
  { id: '7', name: 'Spore Trap: Cassette', category: 'Air-O-Cell Mold Cassette', iconName: 'leaf-outline' },
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

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Navigation Bar matching Screenshot 2 */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Sample Types</Text>
        <TouchableOpacity onPress={handleSave} style={styles.navBtn}>
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={false}>
        {SAMPLE_TYPES.map((item) => {
          const count = counts[item.name] || 0;
          return (
            <View key={item.id} style={styles.typeRow}>
              {/* Media Icon/Badge */}
              <View style={styles.iconBadge}>
                <Ionicons name={item.iconName} size={26} color={colors.primaryContainer} />
              </View>

              {/* Title & Category */}
              <View style={styles.infoCol}>
                <Text style={styles.typeName}>{item.name}</Text>
                <Text style={styles.typeCategory}>{item.category}</Text>
              </View>

              {/* Stepper: - [ 0 ] + */}
              <View style={styles.stepperContainer}>
                <TouchableOpacity 
                  style={styles.stepperBtn} 
                  onPress={() => handleDecrement(item.name)}
                >
                  <Text style={styles.stepperMinus}>-</Text>
                </TouchableOpacity>

                <View style={styles.stepperCountBox}>
                  <Text style={styles.stepperCountText}>{count}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.stepperBtn} 
                  onPress={() => handleIncrement(item.name)}
                >
                  <Text style={styles.stepperPlus}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  navBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  cancelText: { color: '#0284c7', fontSize: 16, fontWeight: '500' },
  saveText: { color: '#0284c7', fontSize: 16, fontWeight: '600' },
  navTitle: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  listContainer: { paddingBottom: 40 },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E6F8F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoCol: { flex: 1, paddingRight: 8 },
  typeName: { fontSize: 15, fontWeight: '600', color: colors.onSurface, lineHeight: 20 },
  typeCategory: { fontSize: 12, color: colors.secondary, marginTop: 2 },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperMinus: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#0284c7',
    lineHeight: 28,
  },
  stepperPlus: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0284c7',
    lineHeight: 24,
  },
  stepperCountBox: {
    width: 48,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  stepperCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
});
