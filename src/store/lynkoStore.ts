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
  status: 'Completed' | 'Draft' | 'Dispatched';
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

export interface SubmissionRecord {
  id: string;
  projectId?: string;
  poNumber: string;
  projectTitle: string;
  recipientEmail: string;
  senderEmail: string;
  subject: string;
  submittedAt: string;
  samplesCount: number;
  photosCount: number;
  status: 'Dispatched' | 'Delivered' | 'Pending Resend';
  pdfUri?: string;
  analysisType?: string;
  turnaround?: string;
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
  submissions: SubmissionRecord[];
  cocData: CoCData;
  recipientHistory: string[];
  addProject: (p: Project) => Promise<void>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  addSample: (s: SampleItem) => Promise<void>;
  updateSample: (id: string, updates: Partial<SampleItem>) => Promise<void>;
  deleteSample: (id: string) => Promise<void>;
  updateEquipment: (id: string, delta: number) => void;
  updateCoCData: (updates: Partial<CoCData>) => Promise<void>;
  setSampleTypeCounts: (counts: { [key: string]: number }) => Promise<void>;
  autoFillField: (field: 'sampleId' | 'description' | 'measurement' | 'unit', value?: string) => Promise<void>;
  addSubmission: (sub: SubmissionRecord) => Promise<void>;
  updateSubmissionStatus: (id: string, status: 'Dispatched' | 'Delivered' | 'Pending Resend') => Promise<void>;
  deleteSubmission: (id: string) => Promise<void>;
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
  sampleTypeCounts: {},
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
      samples: [],
      equipment: [
        { id: '1', name: 'Asbestos PCM Cassette', count: 0 },
        { id: '2', name: 'Asbestos TEM cassette', count: 0 },
        { id: '3', name: 'Bulk sample', count: 0 },
        { id: '4', name: 'Endotoxin free cassette', count: 0 },
        { id: '5', name: 'Polycarbonate Air Filter Cassette', count: 0 },
        { id: '6', name: 'PTFE Filter Cassette', count: 0 },
        { id: '7', name: 'Spore Trap: Cassette', count: 0 },
        { id: '8', name: 'Spore Trap: Slide', count: 0 },
        { id: '9', name: 'Via-cell cassette', count: 0 },
      ],
      submissions: [],
      cocData: initialCoCData,
      recipientHistory: defaultRecipients,

      addProject: async (p) => {
        set((state) => ({ projects: [p, ...state.projects] }));
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', p.id), p);
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      updateProject: async (id, updates) => {
        set((state) => ({
          projects: state.projects.map(p => p.id === id ? { ...p, ...updates } : p)
        }));
        const updated = get().projects.find(p => p.id === id);
        if (auth.currentUser && updated) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', id), updated, { merge: true });
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      deleteProject: async (id) => {
        set((state) => ({ projects: state.projects.filter(p => p.id !== id) }));
        if (auth.currentUser) {
          try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'projects', id));
          } catch (e) {
            console.warn('Firestore delete deferred:', e);
          }
        }
      },

      addSample: async (s) => {
        set((state) => ({ samples: [...state.samples, s] }));
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', s.id), s);
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      updateSample: async (id, updates) => {
        set((state) => ({
          samples: state.samples.map(s => s.id === id ? { ...s, ...updates } : s)
        }));
        const sampleToSync = get().samples.find(s => s.id === id);
        if (auth.currentUser && sampleToSync) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', id), sampleToSync, { merge: true });
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      deleteSample: async (id) => {
        set((state) => ({ samples: state.samples.filter(s => s.id !== id) }));
        if (auth.currentUser) {
          try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'samples', id));
          } catch (e) {
            console.warn('Firestore delete deferred:', e);
          }
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
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'cocData', 'current'), get().cocData);
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
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
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'cocData', 'current'), get().cocData, { merge: true });
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
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
          try {
            for (const s of updatedSamples) {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', s.id), s, { merge: true });
            }
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      addSubmission: async (sub) => {
        const currentProjects = get().projects;
        const matchingProject = currentProjects.find(p => 
          (sub.poNumber && p.poNumber && p.poNumber.trim().toLowerCase() === sub.poNumber.trim().toLowerCase()) ||
          (sub.projectId && p.id === sub.projectId)
        );

        let updatedProjects: Project[];
        if (matchingProject) {
          updatedProjects = currentProjects.map(p => 
            p.id === matchingProject.id ? { ...p, status: 'Dispatched' as const, samplesCount: sub.samplesCount } : p
          );
        } else {
          // If no matching project card existed, create one with Dispatched status
          const newProj: Project = {
            id: sub.projectId || `proj_${Date.now()}`,
            poNumber: sub.poNumber || 'N/A',
            title: sub.projectTitle || 'Field Inspection CoC',
            description: sub.projectTitle || '',
            address: get().cocData.contactAddress || 'Field Inspection Branch',
            zipCode: get().cocData.zipCode || '',
            samplesCount: sub.samplesCount,
            status: 'Dispatched',
            date: new Date().toLocaleDateString(),
          };
          updatedProjects = [newProj, ...currentProjects];
        }

        set((state) => ({ 
          submissions: [sub, ...state.submissions],
          projects: updatedProjects,
        }));

        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'submissions', sub.id), sub);
            for (const p of updatedProjects) {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', p.id), p, { merge: true });
            }
          } catch (e) {
            console.warn('Firestore submission sync deferred:', e);
          }
        }
      },

      updateSubmissionStatus: async (id, status) => {
        const updatedSubmissions = get().submissions.map(s => s.id === id ? { ...s, status } : s);
        const sub = updatedSubmissions.find(s => s.id === id);
        
        let updatedProjects = get().projects;
        if (sub) {
          const matchingProj = updatedProjects.find(p => p.poNumber && p.poNumber === sub.poNumber);
          if (matchingProj) {
            const projStatus: 'Completed' | 'Dispatched' | 'Draft' = 
              status === 'Delivered' ? 'Completed' : status === 'Dispatched' ? 'Dispatched' : 'Draft';
            updatedProjects = updatedProjects.map(p => p.id === matchingProj.id ? { ...p, status: projStatus } : p);
          }
        }

        set({
          submissions: updatedSubmissions,
          projects: updatedProjects,
        });

        const updated = updatedSubmissions.find(s => s.id === id);
        if (auth.currentUser && updated) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'submissions', id), updated, { merge: true });
            for (const p of updatedProjects) {
              await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', p.id), p, { merge: true });
            }
          } catch (e) {
            console.warn('Firestore submission update deferred:', e);
          }
        }
      },

      deleteSubmission: async (id) => {
        set((state) => ({ submissions: state.submissions.filter(s => s.id !== id) }));
        if (auth.currentUser) {
          try {
            await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'submissions', id));
          } catch (e) {
            console.warn('Firestore submission delete deferred:', e);
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
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'settings', 'recipients'), {
              history: get().recipientHistory
            }, { merge: true });
          } catch (e) {
            console.warn('Firestore recipients sync deferred:', e);
          }
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

          // Fetch Submissions
          const subSnap = await getDocs(collection(db, 'users', user.uid, 'submissions'));
          const fetchedSubmissions = subSnap.docs.map(d => d.data() as SubmissionRecord);

          // Fetch Recipient History
          const rSnap = await getDoc(doc(db, 'users', user.uid, 'settings', 'recipients'));
          const fetchedRecipients = rSnap.exists() && rSnap.data()?.history ? rSnap.data()?.history : defaultRecipients;
          
          set({ 
            projects: fetchedProjects.length > 0 ? fetchedProjects : get().projects, 
            samples: fetchedSamples.length > 0 ? fetchedSamples : get().samples, 
            cocData: fetchedCoC,
            submissions: fetchedSubmissions.length > 0 ? fetchedSubmissions : get().submissions,
            recipientHistory: fetchedRecipients
          });
        } catch (e) {
          console.warn("Firestore sync offline or deferred:", e);
        }
      },

      clearStore: () => {
        set({ projects: [], samples: [], submissions: [], cocData: initialCoCData, recipientHistory: defaultRecipients });
      }
    }),
    {
      name: 'lynko-data-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
