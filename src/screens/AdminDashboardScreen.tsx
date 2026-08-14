import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { auth } from '../config/firebase';

interface UserData {
  uid: string;
  email: string;
  username: string;
  role: string;
  createdAt: any;
}

export default function AdminDashboardScreen({ navigation }: any) {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const fetchedUsers: UserData[] = [];
        querySnapshot.forEach((doc) => {
          fetchedUsers.push(doc.data() as UserData);
        });
        
        setUsers(fetchedUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      logout();
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const renderItem = ({ item }: { item: UserData }) => {
    const date = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Unknown date';
    return (
      <View style={styles.userCard}>
        <View style={styles.userHeader}>
          <Ionicons name="person-circle-outline" size={40} color={colors.primaryContainer} />
          <View style={styles.userInfo}>
            <Text style={styles.username}>{item.username}</Text>
            <Text style={styles.email}>{item.email}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{item.role.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.dateText}>Joined: {date}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={28} color={colors.primaryContainer} />
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <Ionicons name="log-out-outline" size={28} color={colors.error} onPress={handleLogout} />
      </View>
      
      <View style={styles.container}>
        <Text style={styles.subtitle}>Registered Users ({users.length})</Text>
        
        {loading ? (
          <ActivityIndicator size="large" color={colors.primaryContainer} style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.uid}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  listContainer: {
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.onSurface,
  },
  email: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  roleBadge: {
    backgroundColor: colors.primaryContainer + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryContainer,
  },
  dateText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },
});
