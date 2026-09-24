import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, deleteDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { useAuthStore } from './authStore';
import { keepProjectFile } from '../utils/projectFiles';

export interface Project {
  id: string;
  poNumber: string;
  title: string;
  projectType?: 'Mold' | 'Asbestos' | 'Both';
  address: string;
  samplesCount: number;
  status: 'Draft' | 'Submitted' | 'Email Ready';
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
  sampleCode?: string; // Lab test code for mold samples.
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
  status: 'Dispatched' | 'Delivered' | 'Pending Resend' | 'Email Ready';
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

interface PendingWrite { collection: string; id: string; data: object | null; revision: string; }
interface LynkoState {
  ownerUid: string | null;
  pendingWrites: Record<string, PendingWrite>;
  legacyUnassignedSamples: SampleItem[];
  needsProjectMigration: boolean;
  flushPendingWrites: () => Promise<boolean>;
  queueWrite: (collection: string, id: string, data: object | null) => void;
  saveActiveProject: () => void;
  recoverLegacySample: (sampleId: string, projectId: string) => Promise<void>;
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
  updateSubmissionStatus: (id: string, status: SubmissionRecord['status']) => Promise<void>;
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

/** A complete project is the unit of persistence; the old global sample pool is never opened as a project. */
export function projectCoC(project: Partial<Project>): CoCData {
  return {
    ...initialCoCData,
    samplingTime: new Date().toLocaleTimeString(),
    poNumber: project.poNumber || '',
    description: project.description || project.title || '',
    zipCode: project.zipCode || '',
    contactAddress: project.address || '',
    sampledBy: project.inspectorName || '',
    turnaround1: project.turnaround || '48 hr',
    projectType: project.projectType || 'Mold',
    analysis1: project.projectType === 'Asbestos' ? 'Asbestos PLM' : 'Mold',
    ...project.cocData,
    // The project inspection date is authoritative, including for pre-update records.
    samplingDate: project.date || project.cocData?.samplingDate || new Date().toLocaleDateString('en-US'),
  };
}

// Firestore rejects undefined fields. JSON also gives the queue an immutable snapshot.
const snapshot = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
function editableProject(project: Project): Project {
  // The previous PDF remains in submission history; edited work needs a new document.
  const { pdfUri, submittedAt, recipientEmail, ...draft } = project;
  return { ...draft, status: 'Draft' };
}
let flushing: Promise<boolean> | null = null;
let syncing = false;

export const useLynkoStore = create<LynkoState>()(
  persist(
    (set, get) => ({
      projects: [], activeProjectId: null, samples: [], equipment: [
        { id: '1', name: 'Asbestos PCM Cassette', count: 0 },
        { id: '2', name: 'Asbestos TEM cassette', count: 0 },
        { id: '3', name: 'Bulk sample', count: 0 },
        { id: '4', name: 'Endotoxin free cassette', count: 0 },
        { id: '5', name: 'Polycarbonate Air Filter Cassette', count: 0 },
        { id: '6', name: 'PTFE Filter Cassette', count: 0 },
        { id: '7', name: 'Spore Trap: Cassette', count: 0 },
        { id: '8', name: 'Spore Trap: Slide', count: 0 },
        { id: '9', name: 'Via-cell cassette', count: 0 },
      ], submissions: [],
      cocData: projectCoC({}), recipientHistory: defaultRecipients,
      ownerUid: null, pendingWrites: {}, legacyUnassignedSamples: [], needsProjectMigration: false,

      queueWrite: (collectionName, id, data) => {
        const uid = auth.currentUser?.uid || useAuthStore.getState().user?.uid || get().ownerUid;
        if (!uid || (get().ownerUid && get().ownerUid !== uid)) return;
        const key = collectionName + '/' + id;
        set(state => ({ ownerUid: uid, pendingWrites: { ...state.pendingWrites, [key]: {
          collection: collectionName, id, data: data === null ? null : snapshot(data),
          revision: Date.now() + '_' + Math.random().toString(36).slice(2),
        } } }));
        void get().flushPendingWrites();
      },

      flushPendingWrites: async () => {
        if (flushing) return flushing;
        const user = auth.currentUser;
        if (!user || (get().ownerUid && user.uid !== get().ownerUid)) return false;
        const uid = user.uid;
        const run = async () => {
          const writes = Object.entries(get().pendingWrites);
          await Promise.all(writes.map(async ([key, entry]) => {
            try {
              const reference = doc(db, 'users', uid, entry.collection, entry.id);
              const operation = entry.data === null ? deleteDoc(reference) : setDoc(reference, entry.data);
              let timer: ReturnType<typeof setTimeout> | undefined;
              try {
                await Promise.race([operation, new Promise<never>((_, reject) => {
                  timer = setTimeout(() => reject(new Error('Sync will retry when online.')), 8000);
                })]);
              } finally { if (timer) clearTimeout(timer); }
              // Never clear a newer edit or a different user's queue after an old request finishes.
              if (get().ownerUid === uid && get().pendingWrites[key]?.revision === entry.revision) {
                set(state => { const pendingWrites = { ...state.pendingWrites }; delete pendingWrites[key]; return { pendingWrites }; });
              }
            } catch (error) { console.warn('Project saved on device; cloud sync pending.', error); }
          }));
          return Object.keys(get().pendingWrites).length === 0;
        };
        flushing = run();
        try { return await flushing; } finally { flushing = null; }
      },

      saveActiveProject: () => {
        const project = get().projects.find(p => p.id === get().activeProjectId);
        if (project) get().queueWrite('projects', project.id, project);
      },
      recoverLegacySample: async (sampleId, projectId) => {
        const sample = get().legacyUnassignedSamples.find(s => s.id === sampleId);
        const project = get().projects.find(p => p.id === projectId);
        if (!sample || !project) throw new Error('Choose an existing project and sample.');
        const samples = project.samples || [];
        if (samples.some(s => s.id === sample.id || s.name.trim().toLowerCase() === sample.name.trim().toLowerCase())) {
          throw new Error('This project already has that sample or sample ID. Review it before assigning another copy.');
        }
        await get().updateProject(projectId, { samples: [...samples, sample], samplesCount: samples.length + 1 });
        set(state => ({ legacyUnassignedSamples: state.legacyUnassignedSamples.filter(s => s.id !== sampleId) }));
        get().setActiveProjectId(projectId);
      },
      setActiveProjectId: (id) => {
        const project = get().projects.find(p => p.id === id);
        set({ activeProjectId: project?.id || null, samples: project?.samples || [], cocData: projectCoC(project || {}) });
      },
      setSamples: (samples) => {
        const activeId = get().activeProjectId;
        if (!activeId || !get().projects.some(p => p.id === activeId)) return;
        set(state => ({ samples, projects: state.projects.map(p => p.id === activeId ? { ...editableProject(p), samples, samplesCount: samples.length } : p) }));
        get().saveActiveProject();
      },
      resetForNewProject: (project) => set({ activeProjectId: null, samples: [], cocData: projectCoC(project) }),
      addProject: async (project) => {
        const fresh = { ...project, samples: [], samplesCount: 0, cocData: projectCoC(project) };
        set(state => ({ projects: [fresh, ...state.projects], activeProjectId: fresh.id, samples: [], cocData: fresh.cocData }));
        get().queueWrite('projects', fresh.id, fresh);
      },
      updateProject: async (id, updates) => {
        const existing = get().projects.find(p => p.id === id);
        if (!existing) return;
        const contentChanged = Object.keys(updates).some(key => !['status', 'pdfUri', 'submittedAt', 'recipientEmail'].includes(key));
        const updated = { ...(contentChanged ? editableProject(existing) : existing), ...updates };
        set(state => ({ projects: state.projects.map(p => p.id === id ? updated : p),
          ...(state.activeProjectId === id ? { samples: updated.samples || [], cocData: projectCoC(updated) } : {}) }));
        get().queueWrite('projects', id, updated);
      },
      deleteProject: async (id) => {
        set(state => ({ projects: state.projects.filter(p => p.id !== id),
          ...(state.activeProjectId === id ? { activeProjectId: null, samples: [], cocData: projectCoC({}) } : {}) }));
        get().queueWrite('projects', id, null);
      },
      addSample: async (sample) => { get().setSamples([...get().samples, sample]); },
      updateSample: async (id, updates) => { get().setSamples(get().samples.map(s => s.id === id ? { ...s, ...updates } : s)); },
      deleteSample: async (id) => { get().setSamples(get().samples.filter(s => s.id !== id)); },
      updateEquipment: (id, delta) => set(state => ({ equipment: state.equipment.map(e => e.id === id ? { ...e, count: Math.max(0, e.count + delta) } : e) })),
      updateCoCData: async (updates) => {
        const activeId = get().activeProjectId;
        if (!activeId || !get().projects.some(p => p.id === activeId)) return;
        const cocData = { ...get().cocData, ...updates };
        set(state => ({ cocData, projects: state.projects.map(p => p.id === activeId ? {
          ...editableProject(p), cocData, poNumber: cocData.poNumber, description: cocData.description,
          zipCode: cocData.zipCode, address: cocData.contactAddress, inspectorName: cocData.sampledBy,
          date: cocData.samplingDate, turnaround: cocData.turnaround1,
        } : p) }));
        get().saveActiveProject();
      },
      // Retained for legacy screen compatibility; all writes still belong to the selected project.
      setSampleTypeCounts: async (counts) => { await get().updateCoCData({ sampleTypeCounts: counts }); },
      autoFillField: async (field, value) => {
        get().setSamples(get().samples.map((s, i) => field === 'sampleId' ? { ...s, name: String(i + 1) }
          : field === 'description' ? { ...s, description: s.description || value || '' }
          : { ...s, [field]: value || '' }));
      },
      addSubmission: async (submission) => {
        // A PO number is a user-editable label, never a project identifier.
        const project = get().projects.find(p => p.id === submission.projectId);
        if (!project) throw new Error('Open the project before preparing its email.');
        const status = submission.status === 'Email Ready' ? 'Email Ready' : submission.status === 'Pending Resend' ? project.status : 'Submitted';
        set(state => ({ submissions: [submission, ...state.submissions] }));
        get().queueWrite('submissions', submission.id, submission);
        await get().updateProject(project.id, { status, pdfUri: submission.pdfUri,
          submittedAt: submission.submittedAt, recipientEmail: submission.recipientEmail });
      },
      updateSubmissionStatus: async (id, status) => {
        const existing = get().submissions.find(s => s.id === id);
        if (!existing) return;
        const submission = { ...existing, status };
        set(state => ({ submissions: state.submissions.map(s => s.id === id ? submission : s) }));
        get().queueWrite('submissions', id, submission);
        if (submission.projectId && (status === 'Delivered' || status === 'Dispatched')) {
          await get().updateProject(submission.projectId, { status: 'Submitted' });
        }
      },
      deleteSubmission: async (id) => {
        set(state => ({ submissions: state.submissions.filter(s => s.id !== id) }));
        get().queueWrite('submissions', id, null);
      },
      addRecipientEmail: async (email) => {
        const clean = email.trim().toLowerCase();
        if (!clean) return;
        const history = [clean, ...get().recipientHistory.filter(e => e.toLowerCase() !== clean)].slice(0, 10);
        set({ recipientHistory: history }); get().queueWrite('settings', 'recipients', { history });
      },
      syncFromFirestore: async () => {
        if (syncing) return;
        const user = auth.currentUser;
        if (!user) return;
        if (get().ownerUid && get().ownerUid !== user.uid) return;
        syncing = true;
        set({ ownerUid: user.uid });
        // Upgrade local projects without guessing ownership of legacy global samples.
        if (get().needsProjectMigration) {
          const preservePhotos = async (sample: SampleItem): Promise<SampleItem> => ({
            ...sample,
            photoUris: await Promise.all((sample.photoUris || (sample.photoUri ? [sample.photoUri] : [])).map(async uri => {
              try { return await keepProjectFile(uri); }
              catch { return uri; } // Preserve missing references so the inspector can identify and replace them.
            })),
          });
          for (const original of get().projects) {
            const samples = await Promise.all((original.samples || []).map(preservePhotos));
            if (get().ownerUid !== user.uid) { syncing = false; return; }
            const current = get().projects.find(p => p.id === original.id);
            if (!current) continue;
            const updated = current === original ? { ...original, samples, cocData: projectCoC(original) } : current;
            set(state => ({ projects: state.projects.map(p => p.id === updated.id ? updated : p),
              ...(state.activeProjectId === updated.id ? { samples: updated.samples || [], cocData: projectCoC(updated) } : {}) }));
            get().queueWrite('projects', updated.id, updated);
          }
          set({ needsProjectMigration: false });
        }
        const localAtStart = get().projects;
        const submissionsAtStart = get().submissions;
        const pendingAtStart = get().pendingWrites;
        const queuedAtStart = new Set(Object.keys(pendingAtStart));
        try {
          const [projectsSnapshot, submissionsSnapshot, recipientsSnapshot, legacySnapshot] = await Promise.all([
            getDocs(collection(db, 'users', user.uid, 'projects')),
            getDocs(collection(db, 'users', user.uid, 'submissions')),
            getDoc(doc(db, 'users', user.uid, 'settings', 'recipients')),
            getDocs(collection(db, 'users', user.uid, 'samples')),
          ]);
          if (get().ownerUid !== user.uid || auth.currentUser?.uid !== user.uid) return;
          const merge = <T extends { id: string }>(remote: T[], local: T[], collectionName: string): T[] => {
            const records = new Map(remote.map(record => [record.id, record]));
            local.forEach(record => {
              const original = (collectionName === 'projects' ? localAtStart : submissionsAtStart).find(r => r.id === record.id);
              if (!records.has(record.id) || queuedAtStart.has(collectionName + '/' + record.id)
                || get().pendingWrites[collectionName + '/' + record.id] || !Object.is(original, record)) records.set(record.id, record);
            });
            Object.values({ ...pendingAtStart, ...get().pendingWrites }).filter(w => w.collection === collectionName && w.data === null).forEach(w => records.delete(w.id));
            (collectionName === 'projects' ? localAtStart : submissionsAtStart).filter(record => !local.some(p => p.id === record.id)).forEach(record => records.delete(record.id));
            return [...records.values()];
          };
          const projects = merge(projectsSnapshot.docs.map(d => ({ ...d.data(), id: d.id }) as Project), get().projects, 'projects');
          const submissions = merge(submissionsSnapshot.docs.map(d => ({ ...d.data(), id: d.id }) as SubmissionRecord), get().submissions, 'submissions');
          const assigned = new Set(projects.flatMap(p => (p.samples || []).map(s => s.id)));
          const legacyUnassignedSamples = [...new Map([...get().legacyUnassignedSamples, ...legacySnapshot.docs.map(d => ({ ...d.data(), id: d.id }) as SampleItem)].filter(s => !assigned.has(s.id)).map(s => [s.id, s])).values()];
          const active = projects.find(p => p.id === get().activeProjectId);
          set({ projects, submissions, legacyUnassignedSamples,
            activeProjectId: active?.id || null, samples: active?.samples || [], cocData: projectCoC(active || {}),
            recipientHistory: get().pendingWrites['settings/recipients'] ? get().recipientHistory
              : recipientsSnapshot.exists() ? recipientsSnapshot.data().history || defaultRecipients : get().recipientHistory,
          });
          void get().flushPendingWrites();
        } catch (error) { console.warn('Using projects saved on this device.', error); }
        finally { syncing = false; }
      },
      clearStore: () => set({ projects: [], activeProjectId: null, samples: [], submissions: [],
        cocData: projectCoC({}), recipientHistory: defaultRecipients, ownerUid: null,
        pendingWrites: {}, legacyUnassignedSamples: [], needsProjectMigration: false }),
    }),
    {
      name: 'lynko-data-storage', version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persisted: any) => {
        // Preserve every old project and any unassigned samples for manual recovery.
        const projects: Project[] = persisted.projects || [];
        const known = new Set(projects.flatMap(p => (p.samples || []).map(s => s.id)));
        return { ...persisted, projects, pendingWrites: {}, ownerUid: null, needsProjectMigration: true,
          legacyUnassignedSamples: (persisted.samples || []).filter((s: SampleItem) => !known.has(s.id)),
          activeProjectId: null, samples: [], cocData: projectCoC({}) };
      },
    }
  )
);
