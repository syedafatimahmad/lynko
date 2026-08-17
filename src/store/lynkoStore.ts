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
  unit?: string;
  notes: string;
  photoUri?: string;
}

export interface EquipmentItem {
  id: string;
  name: string;
  count: number;
  image?: any;
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
  sampleTypeCounts?: { [key: string]: number };
  analysis1?: string;
  turnaround1?: string;
  analysis2?: string;
  turnaround2?: string;
}

interface LynkoState {
  projects: Project[];
  samples: SampleItem[];
  equipment: EquipmentItem[];
  cocData: CoCData;
  recipientHistory: string[];
  addProject: (p: Project) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addSample: (s: SampleItem) => Promise<void>;
  updateSample: (id: string, updates: Partial<SampleItem>) => Promise<void>;
  deleteSample: (id: string) => Promise<void>;
  updateEquipment: (id: string, delta: number) => void;
  updateCoCData: (updates: Partial<CoCData>) => Promise<void>;
  setSampleTypeCounts: (counts: { [key: string]: number }) => Promise<void>;
  autoFillField: (field: 'sampleId' | 'description' | 'measurement' | 'unit', value?: string) => Promise<void>;
  addRecipientEmail: (email: string) => Promise<void>;
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
  sampleTypeCounts: { 'Bulk sample': 4 },
  analysis1: 'Asbestos PLM',
  turnaround1: 'Next-day rush',
  analysis2: 'Not set',
  turnaround2: '',
};

const defaultRecipients = ['info@alphaenvironmental.us', 'lab@alphaenvironmental.us'];

export const useLynkoStore = create<LynkoState>()(
  persist(
    (set, get) => ({
      projects: [],
      samples: [
        { id: '1', name: '1', analysis1Enabled: true, analysis2Enabled: false, description: 'Bedroom', property: 'None', measurement: '0', unit: 'N/A', notes: '' },
        { id: '2', name: '2', analysis1Enabled: true, analysis2Enabled: false, description: '', property: 'None', measurement: '0', unit: 'N/A', notes: '' },
        { id: '3', name: '3', analysis1Enabled: true, analysis2Enabled: false, description: '', property: 'None', measurement: '0', unit: 'N/A', notes: '' },
        { id: '4', name: '4', analysis1Enabled: true, analysis2Enabled: false, description: '', property: 'None', measurement: '0', unit: 'N/A', notes: '' },
      ],
      equipment: [
        { id: '1', name: 'Asbestos PCM Cassette', count: 0 },
        { id: '2', name: 'Asbestos TEM cassette', count: 0 },
        { id: '3', name: 'Bulk sample', count: 4 },
        { id: '4', name: 'Endotoxin free cassette', count: 0 },
        { id: '5', name: 'Polycarbonate Air Filter Cassette', count: 0 },
        { id: '6', name: 'PTFE Filter Cassette', count: 0 },
        { id: '7', name: 'Spore Trap: Cassette', count: 0 },
        { id: '8', name: 'Spore Trap: Slide', count: 0 },
        { id: '9', name: 'Via-cell cassette', count: 0 },
      ],
      cocData: initialCoCData,
      recipientHistory: defaultRecipients,

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

      setSampleTypeCounts: async (counts) => {
        let totalCount = 0;
        Object.values(counts).forEach(c => { totalCount += c; });
        if (totalCount === 0) totalCount = 1;

        const currentSamples = get().samples;
        const newSamples: SampleItem[] = [];

        for (let i = 0; i < totalCount; i++) {
          if (currentSamples[i]) {
            newSamples.push({
              ...currentSamples[i],
              name: `${i + 1}`,
            });
          } else {
            newSamples.push({
              id: `${Date.now()}_${i + 1}`,
              name: `${i + 1}`,
              analysis1Enabled: true,
              analysis2Enabled: false,
              description: '',
              property: 'None',
              measurement: '0',
              unit: 'N/A',
              notes: '',
            });
          }
        }

        set((state) => ({
          samples: newSamples,
          cocData: {
            ...state.cocData,
            sampleTypeCounts: counts,
          }
        }));

        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'cocData', 'current'), get().cocData, { merge: true });
        }
      },

      autoFillField: async (field, value) => {
        const currentSamples = get().samples;
        let updatedSamples: SampleItem[];

        if (field === 'sampleId') {
          updatedSamples = currentSamples.map((s, idx) => ({ ...s, name: `${idx + 1}` }));
        } else if (field === 'description') {
          const fillVal = value || 'General Area';
          updatedSamples = currentSamples.map(s => ({ ...s, description: s.description || fillVal }));
        } else if (field === 'measurement') {
          const fillVal = value || '0';
          updatedSamples = currentSamples.map(s => ({ ...s, measurement: fillVal }));
        } else if (field === 'unit') {
          const fillVal = value || 'N/A';
          updatedSamples = currentSamples.map(s => ({ ...s, unit: fillVal }));
        } else {
          updatedSamples = currentSamples;
        }

        set({ samples: updatedSamples });

        if (auth.currentUser) {
          for (const s of updatedSamples) {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', s.id), s, { merge: true });
          }
        }
      },

      addRecipientEmail: async (email) => {
        const clean = email.trim().toLowerCase();
        if (!clean) return;
        set((state) => {
          const filtered = state.recipientHistory.filter(e => e.toLowerCase() !== clean);
          return { recipientHistory: [clean, ...filtered].slice(0, 10) };
        });
        if (auth.currentUser) {
          await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'recipients'), {
            history: get().recipientHistory
          }, { merge: true });
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

          // Fetch Recipient History
          const rSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'recipients'));
          const fetchedRecipients = rSnap.exists() && rSnap.data()?.history ? rSnap.data()?.history : defaultRecipients;
          
          set({ 
            projects: fetchedProjects, 
            samples: fetchedSamples.length > 0 ? fetchedSamples : get().samples, 
            cocData: fetchedCoC,
            recipientHistory: fetchedRecipients
          });
        } catch (e) {
          console.error("Error syncing from Firestore:", e);
        }
      },

      clearStore: () => {
        set({ projects: [], samples: [], cocData: initialCoCData, recipientHistory: defaultRecipients });
      }
    }),
    {
      name: 'lynko-data-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
