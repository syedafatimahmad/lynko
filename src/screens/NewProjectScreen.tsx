import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';

export default function NewProjectScreen({ navigation }: any) {
  const addProject = useLynkoStore((state) => state.addProject);
  
  const [po, setPo] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [zip, setZip] = useState('');
  const [desc, setDesc] = useState('');

  const handleSave = () => {
    if (!po || !title) return;
    
    addProject({
      id: Date.now().toString(),
      poNumber: po,
      title,
      address,
      zipCode: zip,
      description: desc,
      samplesCount: 0,
      status: 'Draft',
      date: new Date().toLocaleDateString(),
    });
    
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primaryContainer} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Project</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>PO Number *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. PO-99482" 
            placeholderTextColor={colors.outline}
            value={po} 
            onChangeText={setPo} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Project Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Mold & Asbestos Inspection" 
            placeholderTextColor={colors.outline}
            value={title} 
            onChangeText={setTitle} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 539 W Commerce St" 
            placeholderTextColor={colors.outline}
            value={address} 
            onChangeText={setAddress} 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Zip Code</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 75208" 
            placeholderTextColor={colors.outline}
            value={zip} 
            onChangeText={setZip} 
            keyboardType="numeric" 
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            placeholder="Project scope, client details, special notes..." 
            placeholderTextColor={colors.outline}
            value={desc} 
            onChangeText={setDesc} 
            multiline 
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Create Project</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => navigation.goBack()}>
          <Text style={[styles.buttonText, { color: colors.secondary }]}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingVertical: 14, 
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.onSurface },
  container: { padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 6 },
  input: { 
    backgroundColor: colors.surfaceContainerLowest, 
    borderWidth: 1, 
    borderColor: colors.outlineVariant, 
    paddingHorizontal: 14, 
    paddingVertical: 12, 
    borderRadius: 8, 
    fontSize: 15,
    color: colors.onSurface,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  button: { 
    backgroundColor: colors.primaryContainer, 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 8,
  },
  cancel: { 
    backgroundColor: 'transparent', 
    borderWidth: 1, 
    borderColor: colors.outlineVariant,
    marginTop: 10,
    marginBottom: 30,
  },
  buttonText: { color: colors.onPrimary, fontSize: 16, fontWeight: 'bold' },
});
