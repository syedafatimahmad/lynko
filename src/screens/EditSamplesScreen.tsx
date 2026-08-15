import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, SafeAreaView, Platform, Switch, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function EditSamplesScreen({ navigation }: any) {
  const samples = useLynkoStore((state) => state.samples);
  const addSample = useLynkoStore((state) => state.addSample);
  const deleteSample = useLynkoStore((state) => state.deleteSample);
  const updateSample = useLynkoStore((state) => state.updateSample);
  const [expandedNotes, setExpandedNotes] = useState<{ [key: string]: boolean }>({});

  const toggleNotes = (id: string) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAdd = () => {
    addSample({
      id: Date.now().toString(),
      name: `Sample ID ${samples.length + 1}`,
      analysis1Enabled: true,
      analysis2Enabled: false,
      description: '',
      property: 'None',
      measurement: '0',
      notes: '',
    });
  };

  const handleAttachPhoto = async (sampleId: string) => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert("Permission Refused", "You need to allow camera access to take photos of samples.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      updateSample(sampleId, { photoUri: result.assets[0].uri });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Edit Samples</Text>
          <Text style={styles.subtitle}>{samples.length} Samples Logged</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <FlatList
          data={samples}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.empty}>No samples added yet.</Text>}
          renderItem={({ item }) => {
            const showNotes = expandedNotes[item.id] || (item.notes && item.notes.length > 0);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.sampleName}>{item.name}</Text>
                  <TouchableOpacity onPress={() => deleteSample(item.id)}>
                    <Ionicons name="trash-outline" size={24} color={colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Analysis 1</Text>
                  <Switch 
                    value={item.analysis1Enabled} 
                    onValueChange={(val) => updateSample(item.id, { analysis1Enabled: val })} 
                    trackColor={{ true: colors.primaryContainer }} 
                  />
                </View>
                <View style={[styles.switchRow, { marginBottom: 12 }]}>
                  <Text style={styles.switchLabel}>Analysis 2</Text>
                  <Switch 
                    value={item.analysis2Enabled} 
                    onValueChange={(val) => updateSample(item.id, { analysis2Enabled: val })} 
                    trackColor={{ true: colors.primaryContainer }} 
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Bedroom Drywall"
                    placeholderTextColor={colors.outline}
                    value={item.description}
                    onChangeText={(val) => updateSample(item.id, { description: val })}
                  />
                </View>

                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 6 }]}>
                    <Text style={styles.label}>Property</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. Bulk / Air"
                      placeholderTextColor={colors.outline}
                      value={item.property}
                      onChangeText={(val) => updateSample(item.id, { property: val })}
                    />
                  </View>
                  <View style={[styles.inputGroup, { flex: 1, marginLeft: 6 }]}>
                    <Text style={styles.label}>Measurement</Text>
                    <TextInput 
                      style={styles.input} 
                      placeholder="e.g. 15 L / 100 sq ft"
                      placeholderTextColor={colors.outline}
                      value={item.measurement}
                      onChangeText={(val) => updateSample(item.id, { measurement: val })}
                    />
                  </View>
                </View>

                {showNotes && (
                  <View style={[styles.inputGroup, { marginTop: 4 }]}>
                    <Text style={styles.label}>Notes</Text>
                    <TextInput 
                      style={[styles.input, styles.notesInput]} 
                      placeholder="Add inspection notes, location details, etc."
                      placeholderTextColor={colors.outline}
                      value={item.notes}
                      onChangeText={(val) => updateSample(item.id, { notes: val })}
                      multiline
                    />
                  </View>
                )}

                {item.photoUri && (
                  <Image source={{ uri: item.photoUri }} style={styles.sampleImage} />
                )}

                <View style={styles.cardFooter}>
                  <TouchableOpacity style={styles.footerAction} onPress={() => toggleNotes(item.id)}>
                    <Ionicons name={showNotes ? "document-text" : "add"} size={18} color={colors.primaryContainer} style={{marginRight: 4}} />
                    <Text style={styles.footerActionText}>{showNotes ? 'Hide notes' : 'Add notes'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.footerAction} onPress={() => handleAttachPhoto(item.id)}>
                    <Ionicons name="camera-outline" size={18} color={colors.primaryContainer} style={{marginRight: 4}} />
                    <Text style={styles.footerActionText}>{item.photoUri ? 'Retake Photo' : 'Attach Photo'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      </View>

      <View style={styles.bottomFooter}>
        <TouchableOpacity style={styles.addSampleBtn} onPress={handleAdd}>
          <Ionicons name="add" size={20} color={colors.primaryContainer} style={{marginRight: 8}} />
          <Text style={styles.addSampleBtnText}>Add Samples</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveDoneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.saveDoneBtnText}>Save & Done</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? 24 : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant, zIndex: 50 },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.onSurface },
  subtitle: { fontSize: 14, color: colors.secondary },
  doneText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 15 },
  container: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 160 },
  empty: { textAlign: 'center', marginTop: 20, color: colors.secondary },
  card: { backgroundColor: colors.surfaceContainerLowest, borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: colors.outlineVariant, shadowColor: '#000', shadowOffset: {width:0, height:4}, shadowOpacity:0.05, shadowRadius:4, elevation:2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sampleName: { fontSize: 18, fontWeight: 'bold', color: colors.onSurface },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 14, color: colors.onSurface },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: colors.onSurface, backgroundColor: colors.surfaceContainerLowest },
  notesInput: { minHeight: 60, textAlignVertical: 'top' },
  row: { flexDirection: 'row' },
  sampleImage: { width: '100%', height: 150, borderRadius: 8, resizeMode: 'cover', marginTop: 8, marginBottom: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.outlineVariant, paddingTop: 12, marginTop: 4 },
  footerAction: { flexDirection: 'row', alignItems: 'center' },
  footerActionText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 15 },
  bottomFooter: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant, padding: 16, zIndex: 50 },
  addSampleBtn: { width: '100%', borderWidth: 2, borderStyle: 'dashed', borderColor: colors.primaryContainer, height: 48, borderRadius: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  addSampleBtnText: { color: colors.primaryContainer, fontWeight: '600', fontSize: 15 },
  saveDoneBtn: { width: '100%', backgroundColor: colors.primaryContainer, height: 48, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  saveDoneBtnText: { color: colors.onPrimary, fontWeight: '600', fontSize: 15 },
});
