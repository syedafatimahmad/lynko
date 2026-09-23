import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, collection, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../config/firebase';

export interface Project {
  id: string;
  poNumber: string;
  title: string;
  projectType?: 'Mold' | 'Asbestos' | 'Both';
  address: string;
  samplesCount: number;
  status: 'Draft' | 'Submitted';
  date: string;
  description: string;
  zipCode: string;
  pdfUri?: string;
  submittedAt?: string;
  recipientEmail?: string;
  turnaround?: string;
  inspectorName?: string;
  samples?: SampleItem[];
  cocData?: CoCData;
}

export interface SampleItem {
  id: string;
  name: string;
  sampleCode?: string; // Cassette ID or test code (for Mold)
  description: string;
  flowRate?: string; // e.g. "15" L/min (for Mold)
  duration?: string; // e.g. "5" min (for Mold)
  volume?: string; // auto-computed e.g. "75" L (for Mold)
  notes?: string;
  photoUri?: string;
  photoUris?: string[];
  analysis1Enabled?: boolean;
  analysis2Enabled?: boolean;
  property?: string;
  measurement?: string;
  unit?: string;
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
  attachPhotosToEmail?: boolean;
  projectType?: 'Mold' | 'Asbestos' | 'Both';
}

interface LynkoState {
  projects: Project[];
  activeProjectId: string | null;
  samples: SampleItem[];
  equipment: EquipmentItem[];
  submissions: SubmissionRecord[];
  cocData: CoCData;
  recipientHistory: string[];
  setActiveProjectId: (id: string | null) => void;
  setSamples: (samples: SampleItem[]) => void;
  resetForNewProject: (projectData: Partial<Project>) => void;
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
  accountInfo: 'Lynko - DFW/47674',
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
  attachPhotosToEmail: true,
};

const defaultRecipients = ['thelynkoapp@gmail.com', 'info@lynko.app'];

export const useLynkoStore = create<LynkoState>()(
  persist(
    (set, get) => ({
      projects: [],
      activeProjectId: null,
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

      setActiveProjectId: (id) => set({ activeProjectId: id }),
      setSamples: (newSamples) => set({ samples: newSamples }),

      resetForNewProject: (projectData) => {
        const freshCoc: CoCData = {
          ...initialCoCData,
          poNumber: projectData.poNumber || '',
          description: projectData.description || projectData.title || '',
          zipCode: projectData.zipCode || '',
          contactAddress: projectData.address || initialCoCData.contactAddress,
          samplingDate: new Date().toLocaleDateString(),
          samplingTime: new Date().toLocaleTimeString(),
          projectType: projectData.projectType || 'Mold',
          sampleTypeCounts: {},
          photos: [],
        };
        set({
          activeProjectId: projectData.id || null,
          samples: [], // Zero samples from previous project!
          cocData: freshCoc,
        });
      },

      addProject: async (p) => {
        const freshProject: Project = {
          ...p,
          samples: [],
          cocData: {
            ...initialCoCData,
            poNumber: p.poNumber,
            description: p.description || p.title,
            zipCode: p.zipCode,
            contactAddress: p.address || initialCoCData.contactAddress,
            projectType: p.projectType || 'Mold',
            turnaround1: p.turnaround || '48 hr',
            sampledBy: p.inspectorName || 'Ali Saleh',
            sampleTypeCounts: {},
            photos: [],
          },
        };
        set((state) => ({
          projects: [freshProject, ...state.projects],
          activeProjectId: p.id,
          samples: [], // Zero samples for new project!
          cocData: freshProject.cocData!,
        }));
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'projects', p.id), freshProject);
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
        set((state) => {
          const updatedSamples = [...state.samples, s];
          const activeId = state.activeProjectId;
          const updatedProjects = activeId
            ? state.projects.map(p => p.id === activeId ? { ...p, samples: updatedSamples, samplesCount: updatedSamples.length } : p)
            : state.projects;
          return { samples: updatedSamples, projects: updatedProjects };
        });
        if (auth.currentUser) {
          try {
            await setDoc(doc(db, 'users', auth.currentUser.uid, 'samples', s.id), s);
          } catch (e) {
            console.warn('Firestore sync deferred:', e);
          }
        }
      },

      updateSample: async (id, updates) => {
        set((state) => {
          const updatedSamples = state.samples.map(s => s.id === id ? { ...s, ...updates } : s);
          const activeId = state.activeProjectId;
          const updatedProjects = activeId
            ? state.projects.map(p => p.id === activeId ? { ...p, samples: updatedSamples, samplesCount: updatedSamples.length } : p)
            : state.projects;
          return { samples: updatedSamples, projects: updatedProjects };
        });
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
        set((state) => {
          const updatedSamples = state.samples.filter(s => s.id !== id);
          const activeId = state.activeProjectId;
          const updatedProjects = activeId
            ? state.projects.map(p => p.id === activeId ? { ...p, samples: updatedSamples, samplesCount: updatedSamples.length } : p)
            : state.projects;
          return { samples: updatedSamples, projects: updatedProjects };
        });
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
        set((state) => {
          const updatedCoc = { ...state.cocData, ...updates };
          const activeId = state.activeProjectId;
          const updatedProjects = activeId
            ? state.projects.map(p => p.id === activeId ? { ...p, cocData: updatedCoc } : p)
            : state.projects;
          return { cocData: updatedCoc, projects: updatedProjects };
        });
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
              photoUris: [],
            });
          }
        }

        set((state) => {
          const activeId = state.activeProjectId;
          const updatedProjects = activeId
            ? state.projects.map(p => p.id === activeId ? { ...p, samples: newSamples, samplesCount: newSamples.length } : p)
            : state.projects;
          return {
            samples: newSamples,
            projects: updatedProjects,
            cocData: {
              ...state.cocData,
              sampleTypeCounts: counts,
            }
          };
        });

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
          const uid = auth.currentUser.uid;
          (async () => {
            try {
              const batch = writeBatch(db);
              for (const s of updatedSamples) {
                batch.set(doc(db, 'users', uid, 'samples', s.id), s, { merge: true });
              }
              await batch.commit();
            } catch (e) {
              console.warn('Firestore sync deferred:', e);
            }
          })();
        }
      },

      addSubmission: async (sub) => {
        const currentProjects = get().projects;
        const matchingProject = currentProjects.find(p => 
          (sub.poNumber && p.poNumber && p.poNumber.trim().toLowerCase() === sub.poNumber.trim().toLowerCase()) ||
          (sub.projectId && p.id === sub.projectId)
        );

        let updatedProjects: Project[];
        let targetProject: Project;
        if (matchingProject) {
          targetProject = { 
            ...matchingProject, 
            status: 'Submitted' as const, 
            samplesCount: sub.samplesCount,
            pdfUri: sub.pdfUri,
            submittedAt: sub.submittedAt,
            recipientEmail: sub.recipientEmail
          };
          updatedProjects = currentProjects.map(p => 
            p.id === matchingProject.id ? targetProject : p
          );
        } else {
          targetProject = {
            id: sub.projectId || `proj_${Date.now()}`,
            poNumber: sub.poNumber || 'N/A',
            title: sub.projectTitle || 'Field Inspection CoC',
            description: sub.projectTitle || '',
            address: get().cocData.contactAddress || 'Field Inspection Branch',
            zipCode: get().cocData.zipCode || '',
            samplesCount: sub.samplesCount,
            status: 'Submitted',
            date: new Date().toLocaleDateString(),
            pdfUri: sub.pdfUri,
            submittedAt: sub.submittedAt,
            recipientEmail: sub.recipientEmail,
          };
          updatedProjects = [targetProject, ...currentProjects];
        }

        // Instant local state update (<1ms)
        set((state) => ({ 
          submissions: [sub, ...state.submissions],
          projects: updatedProjects,
        }));

        // Non-blocking background Firestore sync of ONLY the submission and the target project
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          (async () => {
            try {
              await Promise.all([
                setDoc(doc(db, 'users', uid, 'submissions', sub.id), sub),
                setDoc(doc(db, 'users', uid, 'projects', targetProject.id), targetProject, { merge: true }),
              ]);
            } catch (e) {
              console.warn('Firestore submission sync deferred:', e);
            }
          })();
        }
      },

      updateSubmissionStatus: async (id, status) => {
        const updatedSubmissions = get().submissions.map(s => s.id === id ? { ...s, status } : s);
        const sub = updatedSubmissions.find(s => s.id === id);
        
        let updatedProjects = get().projects;
        let matchingProj: Project | undefined;
        if (sub) {
          matchingProj = updatedProjects.find(p => p.poNumber && p.poNumber === sub.poNumber);
          if (matchingProj) {
            const projStatus: 'Draft' | 'Submitted' = 'Submitted';
            updatedProjects = updatedProjects.map(p => p.id === matchingProj!.id ? { ...p, status: projStatus } : p);
          }
        }

        set({
          submissions: updatedSubmissions,
          projects: updatedProjects,
        });

        const updated = updatedSubmissions.find(s => s.id === id);
        if (auth.currentUser && updated) {
          const uid = auth.currentUser.uid;
          (async () => {
            try {
              const promises: Promise<any>[] = [
                setDoc(doc(db, 'users', uid, 'submissions', id), updated, { merge: true })
              ];
              if (matchingProj) {
                const targetProj = updatedProjects.find(p => p.id === matchingProj!.id);
                if (targetProj) {
                  promises.push(setDoc(doc(db, 'users', uid, 'projects', targetProj.id), targetProj, { merge: true }));
                }
              }
              await Promise.all(promises);
            } catch (e) {
              console.warn('Firestore submission update deferred:', e);
            }
          })();
        }
      },

      deleteSubmission: async (id) => {
        set((state) => ({ submissions: state.submissions.filter(s => s.id !== id) }));
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          deleteDoc(doc(db, 'users', uid, 'submissions', id)).catch(e => {
            console.warn('Firestore submission delete deferred:', e);
          });
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
          const uid = auth.currentUser.uid;
          const updatedHistory = get().recipientHistory;
          setDoc(doc(db, 'users', uid, 'settings', 'recipients'), {
            history: updatedHistory
          }, { merge: true }).catch(e => {
            console.warn('Firestore recipients sync deferred:', e);
          });
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
