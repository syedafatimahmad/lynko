import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, SafeAreaView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLynkoStore } from '../store/lynkoStore';
import { colors } from '../theme/colors';

export default function ProjectsScreen({ navigation }: any) {
  const projects = useLynkoStore((state) => state.projects);
  const updateCoCData = useLynkoStore((state) => state.updateCoCData);
  const deleteProject = useLynkoStore((state) => state.deleteProject);
  const [search, setSearch] = useState('');

  const filteredProjects = projects.filter(p => 
    (p.title || '').toLowerCase().includes(search.toLowerCase()) || 
    (p.poNumber || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Projects</Text>
        <Text style={styles.subtitle}>Manage and search past projects</Text>
      </View>

      <View style={styles.container}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={colors.secondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO #, description, address..."
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>No projects found.</Text>}
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
                <Text style={styles.poNumber}>{item.poNumber}</Text>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteProject(item.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.description ? <Text style={styles.descriptionText}>{item.description}</Text> : null}
              <Text style={styles.address}>📍 {item.address || 'No address provided'}</Text>
              
              <View style={styles.cardFooter}>
                <Text style={styles.samplesCount}>🧪 {item.samplesCount || 0} Samples</Text>
                <Text style={[styles.status, item.status === 'Completed' ? styles.statusCompleted : styles.statusDraft]}>
                  {item.status}
                </Text>
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
        <Ionicons name="add" size={32} color={colors.onPrimary} />
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
    paddingTop: 48,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.secondary,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB', // matching the gray-200 from HTML
    borderRadius: 9999,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.onSurface,
  },
  listContent: {
    paddingBottom: 100, // Make room for FAB and Bottom Nav
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  poNumber: {
    color: colors.primaryContainer,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deleteButton: {
    padding: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.onSurface,
    marginBottom: 4,
  },
  descriptionText: {
    color: colors.secondary,
    fontSize: 14,
    marginBottom: 8,
  },
  address: {
    color: colors.secondary,
    fontSize: 14,
    marginBottom: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    marginTop: 'auto',
  },
  samplesCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  status: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusCompleted: {
    color: '#16a34a', // green-600
  },
  statusDraft: {
    color: colors.secondary,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: colors.secondary,
  },
  fab: {
    position: 'absolute',
    bottom: 24, // Space above bottom nav
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryContainer,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primaryContainer,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 40,
  },
});
