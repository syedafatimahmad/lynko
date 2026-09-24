import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLynkoStore, SampleItem } from '../store/lynkoStore';

/** Only shown when old app versions left samples without a project association. */
export default function RecoveredSamplesScreen({ navigation }: any) {
  const samples = useLynkoStore(state => state.legacyUnassignedSamples);
  const projects = useLynkoStore(state => state.projects);
  const recover = useLynkoStore(state => state.recoverLegacySample);
  const [selected, setSelected] = useState<SampleItem | null>(null);

  const assign = async (projectId: string) => {
    if (!selected) return;
    try {
      const id = selected.id;
      await recover(id, projectId);
      setSelected(null);
      navigation.replace('SampleLogger', { sampleId: id });
    } catch (error: any) {
      Alert.alert('Could not assign sample', error.message);
    }
  };

  return <SafeAreaView style={styles.page}>
    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.button}><Text style={styles.link}>Back to projects</Text></TouchableOpacity>
    <Text style={styles.title}>Recovered samples</Text>
    <Text style={styles.explanation}>An older app version saved these samples without their project links. Choose the correct project for each sample, then review its details.</Text>
    <FlatList data={samples} keyExtractor={sample => sample.id}
      ListEmptyComponent={<Text style={styles.explanation}>All recovered samples have been assigned.</Text>}
      renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => setSelected(item)}>
        <Text style={styles.name}>{item.name || 'Unnamed sample'}</Text>
        <Text>{item.description || 'No description'}</Text>
        <Text style={styles.link}>Choose project</Text>
      </TouchableOpacity>} />
    <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
      <SafeAreaView style={styles.page}>
        <TouchableOpacity style={styles.button} onPress={() => setSelected(null)}><Text style={styles.link}>Cancel</Text></TouchableOpacity>
        <Text style={styles.title}>Project for {selected?.name}</Text>
        <FlatList data={projects} keyExtractor={project => project.id}
          ListEmptyComponent={<Text style={styles.explanation}>Create a project first, then return here to assign the sample.</Text>}
          renderItem={({ item }) => <TouchableOpacity style={styles.card} onPress={() => assign(item.id)}>
            <Text style={styles.name}>{item.address || item.title}</Text>
            <Text>{item.poNumber} · {item.projectType || 'Inspection'}</Text>
          </TouchableOpacity>} />
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 20, backgroundColor: '#F8FAFC' },
  title: { fontSize: 24, fontWeight: '700', color: '#0F172A', marginVertical: 12 },
  explanation: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 16 },
  card: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, marginBottom: 12, gap: 8 },
  name: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  link: { color: '#006A64', fontWeight: '700' },
  button: { minHeight: 44, justifyContent: 'center' },
});
