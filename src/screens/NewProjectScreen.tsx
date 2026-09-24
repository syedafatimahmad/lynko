import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLynkoStore, projectCoC } from '../store/lynkoStore';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { colors } from '../theme/colors';
import { validInspectionDate } from '../utils/sampleValidation';
import { useAuthStore } from '../store/authStore';
import MapAddressPickerModal from '../components/MapAddressPickerModal';

const TURNAROUND_OPTIONS = ['Same day', '24 hr', '48 hr', '3 day', '5 day'];

export default function NewProjectScreen({ navigation, route }: any) {
  const insets = useSafeAreaInsets();
  const project = useLynkoStore(state => state.projects.find(p => p.id === route.params?.projectId));
  const updateProject = useLynkoStore(state => state.updateProject);
  const user = useAuthStore(state => state.user);
  const addProject = useLynkoStore((state) => state.addProject);

  const [projectType, setProjectType] = useState<'Mold' | 'Asbestos' | 'Both'>(project?.projectType || 'Mold');
  const [address, setAddress] = useState(project?.address || '');
  const [zip, setZip] = useState(project?.zipCode || '');
  const [date, setDate] = useState(
    project?.date || new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
  );
  const [turnaround, setTurnaround] = useState(project?.turnaround || '48 hr');
  const [inspectorName, setInspectorName] = useState(project?.inspectorName || user?.displayName || '');
  const [poNumber, setPoNumber] = useState(project?.poNumber || '');
  const [locating, setLocating] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const handleUseCurrentLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setShowMapPicker(true);
        setLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });

      if (place) {
        const fullAddr = `${place.streetNumber || ''} ${place.street || ''}, ${place.city || ''}, ${place.region || ''} ${place.postalCode || ''}`.trim();
        setAddress(fullAddr.replace(/^ ,/, '').trim());
        if (place.postalCode) setZip(place.postalCode);
      }
    } catch (e) {
      console.warn('Location detection failed:', e);
      setShowMapPicker(true);
    } finally {
      setLocating(false);
    }
  };

  const handleStartSampling = () => {
    if (!address.trim() || !inspectorName.trim()) {
      Alert.alert('Project information', 'Enter the property address and inspector name.');
      return;
    }
    const finalZip = zip.trim() || address.match(/\b(\d{5})(?:-\d{4})?\s*$/)?.[1] || '';
    if (!/^\d{5}$/.test(finalZip)) {
      Alert.alert('ZIP code', 'Enter the five-digit ZIP code for this property.');
      return;
    }
    if (!validInspectionDate(date.trim())) {
      Alert.alert('Inspection date', 'Enter a valid date as MM/DD/YYYY.');
      return;
    }
    const finalAddress = address.trim();
    const finalPo = poNumber.trim() || 'PO-' + Date.now();
    const previousTitle = project ? project.projectType + ' Inspection - ' + project.address : '';
    const title = project?.title && project.title !== previousTitle ? project.title : projectType + ' Inspection - ' + finalAddress;
    const details = { title, poNumber: finalPo, projectType, address: finalAddress, zipCode: finalZip,
      description: project?.description && project.description !== previousTitle ? project.description : title, turnaround, inspectorName: inspectorName.trim(), date: date.trim() };
    if (project) {
      void updateProject(project.id, { ...details, cocData: { ...projectCoC(project),
        poNumber: finalPo, description: details.description, contactAddress: finalAddress, zipCode: finalZip,
        samplingDate: date.trim(), sampledBy: inspectorName.trim(), turnaround1: turnaround, projectType,
      } });
      navigation.goBack();
    } else {
      void addProject({ ...details, id: Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        samplesCount: 0, status: 'Draft', samples: [] });
      navigation.replace('SampleLogger');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Project details header */}
      <View style={styles.topHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.stepIndicatorText}>{project ? 'EDIT PROJECT' : 'PROJECT DETAILS'}</Text>
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
          <Text style={styles.mainTitle}>Project info</Text>

          {/* Project Type Segmented Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Inspection Type</Text>
            <View style={styles.typeSelectorRow}>
              {(['Mold', 'Asbestos'] as const).map((type) => {
                const isSelected = projectType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.typeBtn, isSelected && styles.typeBtnSelected]}
                    disabled={!!project?.samples?.length}
                    onPress={() => setProjectType(type)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={type === 'Mold' ? 'leaf-outline' : 'construct-outline'}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#475569'}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.typeBtnText, isSelected && styles.typeBtnTextSelected]}>
                      {type === 'Mold' ? 'Mold (Air)' : 'Asbestos (Bulk)'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Property Address */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Property address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street, city, ZIP"
              placeholderTextColor="#94A3B8"
              value={address}
              onChangeText={setAddress}
            />
            <TouchableOpacity
              style={styles.locationLinkRow}
              onPress={handleUseCurrentLocation}
              disabled={locating}
            >
              <Ionicons name="location" size={15} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={styles.locationLinkText}>
                {locating ? 'Detecting location...' : '+ Use my current location'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>ZIP code</Text>
            <TextInput style={styles.input} value={zip} onChangeText={text => setZip(text.replace(/\D/g, '').slice(0, 5))}
              placeholder="e.g. 75204" keyboardType="number-pad" maxLength={5} />
          </View>

          {/* Date of inspection */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date of inspection</Text>
            <View style={styles.dateInputRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0, paddingHorizontal: 0 }]}
                value={date}
                onChangeText={setDate}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#94A3B8"
              />

            </View>
          </View>

          {/* Turnaround Time Pills */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Turnaround time</Text>
            <View style={styles.turnaroundPillsRow}>
              {TURNAROUND_OPTIONS.map((tat) => {
                const isSelected = turnaround === tat;
                return (
                  <TouchableOpacity
                    key={tat}
                    style={[styles.tatPill, isSelected && styles.tatPillSelected]}
                    onPress={() => setTurnaround(tat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tatPillText, isSelected && styles.tatPillTextSelected]}>
                      {tat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Inspector Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Inspector name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ali Saleh"
              placeholderTextColor="#94A3B8"
              value={inspectorName}
              onChangeText={setInspectorName}
            />
          </View>

          {/* Optional PO Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>PO / Project Reference (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Auto-generated if blank (e.g. PO-83742)"
              placeholderTextColor="#94A3B8"
              value={poNumber}
              onChangeText={setPoNumber}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Floating Bottom Button */}
      <View
        style={[
          styles.bottomBar,
          { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 12 },
        ]}
      >
        <TouchableOpacity
          style={styles.startSamplingBtn}
          onPress={handleStartSampling}
          activeOpacity={0.8}
        >
          <Text style={styles.startSamplingBtnText}>{project ? 'Save changes' : 'Start sampling →'}</Text>
        </TouchableOpacity>
      </View>

      <MapAddressPickerModal
        visible={showMapPicker}
        onCancel={() => setShowMapPicker(false)}
        onConfirm={(selectedAddr: string, selectedZip: string) => {
          setAddress(selectedAddr);
          if (selectedZip) setZip(selectedZip);
          setShowMapPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cancelBtn: {
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  stepIndicatorText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  typeBtnSelected: {
    backgroundColor: '#006A64',
    borderColor: '#006A64',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  typeBtnTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  locationLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  locationLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#006A64',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  turnaroundPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tatPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tatPillSelected: {
    backgroundColor: '#006A64',
    borderColor: '#006A64',
  },
  tatPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  tatPillTextSelected: {
    color: '#FFFFFF',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  startSamplingBtn: {
    height: 50,
    backgroundColor: '#006A64',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006A64',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startSamplingBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
