import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';

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
    <ScrollView style={styles.container}>
      <Text style={styles.header}>New Project</Text>
      
      <TextInput style={styles.input} placeholder="PO Number (e.g. PO-99482)" value={po} onChangeText={setPo} />
      <TextInput style={styles.input} placeholder="Project Title" value={title} onChangeText={setTitle} />
      <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="Zip Code" value={zip} onChangeText={setZip} keyboardType="numeric" />
      <TextInput style={styles.input} placeholder="Description" value={desc} onChangeText={setDesc} multiline />

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Create Project</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.button, styles.cancel]} onPress={() => navigation.goBack()}>
        <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  header: { fontSize: 24, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
  input: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, borderRadius: 8, marginBottom: 12 },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  cancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
