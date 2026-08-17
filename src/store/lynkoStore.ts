import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Project {
  id: string;
  poNumber: string;
  title: string;
  address: string;
  samplesCount: number;
  status: 'Completed' | 'Draft';
  date: string;
  description: string;
  zipCode: string;
}

export interface SampleItem {
  id: string;
  name: string;
  analysis1Enabled: boolean;
  analysis2Enabled: boolean;
  description: string;
  property: string;
  measurement: string;
  notes: string;
  photoUri?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  count: number;
}

export interface CoCData {
  poNumber: string;
  accountInfo: string;
  description: string;
  zipCode: string;
  samplingDate: string;
  samplingTime: string;
  contactName: string;
  contactAddress: string;
  contactPhone: string;
  sampledBy: string;
  specialInstructions: string;
  inspectorSignature?: string;
  relinquishedBySignature?: string;
  photos?: string[];
}

interface LynkoState {
  projects: Project[];
  samples: SampleItem[];
  equipment: EquipmentItem[];
  cocData: CoCData;
  addProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addSample: (s: SampleItem) => Promise<void>;
  updateSample: (id: string, updates: Partial<SampleItem>) => Promise<void>;
  deleteSample: (id: string) => Promise<void>;
  updateEquipment: (id: string, delta: number) => void;
  updateCoCData: (updates: Partial<CoCData>) => Promise<void>;
  syncFromFirestore: () => Promise<void>;
  clearStore: () => void;
}

const initialCoCData: CoCData = {
  poNumber: '',
  accountInfo: 'Alpha Environmental - DFW/47674',
  description: '',
  zipCode: '',
  samplingDate: new Date().toLocaleDateString(),
  samplingTime: new Date().toLocaleTimeString(),
  contactName: 'Ali Saleh',
  contactAddress: '539 W Commerce St, #4070 Dallas, TX 75208',
  contactPhone: '214-994-9874',
  sampledBy: '',
  specialInstructions: '',
  photos: [],
};

export const useLynkoStore = create<LynkoState>()(
  persist(
    (set, get) => ({
      projects: [],
      samples: [],
      equipment: [
        { id: '1', name: 'Asbestos PCM Cassette', count: 0 },
        { id: '2', name: 'Asbestos TEM Cassette', count: 0 },
        { id: '3', name: 'Air-O-Cell Spore Trap', count: 0 },
        { id: '4', name: 'Lead Dust Wipe Template', count: 0 },
      ],
      cocData: initialCoCData,

      addProject: async (p) => {
        set((state) => ({ projects: [p, ...state.projects] }));
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', p.id), p);
        }
      },

      deleteProject: async (id) => {
        set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
        if (auth.currentUser) {
          await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'projects', id));
        }
      },

      addSample: async (s) => {
        set((state) => ({ samples: [...state.samples, s] }));
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', s.id), s);
        }
      },

      updateSample: async (id, updates) => {
        set((state) => ({
          samples: state.samples.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
        const sampleToSync = get().samples.find(s => s.id === id);
        if (auth.currentUser && sampleToSync) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', id), sampleToSync, { merge: true });
        }
      },

      deleteSample: async (id) => {
        set((state) => ({ samples: state.samples.filter(s => s.id !== id) }));
        if (auth.currentUser) {
          await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'samples', id));
        }
      },

      updateEquipment: (id, delta) => {
        set((state) => ({
          equipment: state.equipment.map(e => e.id === id ? { ...e, count: Math.max(0, e.count + delta) } : e)
        }));
      },

      updateCoCData: async (updates) => {
        set((state) => ({ cocData: { ...state.cocData, ...updates } }));
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'cocData', 'current'), get().cocData);
        }
      },

      syncFromFirestore: async () => {
        const user = auth.currentUser;
        if (!user) return;
        
        try {
          // Fetch Projects
          const pSnap = await getDocs(collection(db, 'users', user.uid, 'projects'));
          const fetchedProjects = pSnap.docs.map(d => d.data() as Project);
          
          // Fetch Samples
          const sSnap = await getDocs(collection(db, 'users', user.uid, 'samples'));
          const fetchedSamples = sSnap.docs.map(d => d.data() as SampleItem);
          
          // Fetch CoC
          const cSnap = await getDoc(doc(db, 'users', user.uid, 'cocData', 'current'));
          const fetchedCoC = cSnap.exists() ? cSnap.data() as CoCData : initialCoCData;
          
          set({ projects: fetchedProjects, samples: fetchedSamples, cocData: fetchedCoC });
        } catch (e) {
          console.error("Error syncing from Firestore:", e);
        }
      },

      clearStore: () => {
        set({ projects: [], samples: [], cocData: initialCoCData });
      }
    }),
    {
      name: 'lynko-data-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
