import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search projects, samples..."
        value={query}
        onChangeText={setQuery}
      />
      <Text style={styles.info}>Search functionality coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  searchBar: { backgroundColor: colors.card, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  info: { marginTop: 20, textAlign: 'center', color: colors.textSecondary },
});
