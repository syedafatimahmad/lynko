const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness() {
  let state, slots = [], effects = [], pending = [], cursor = 0;
  const h = { writes: [], alerts: [], navigation: [], printed: [], files: [], mail: [],
    remote: { projects: [], submissions: [], samples: [] }, failWrites: false,
    mailStatus: 'sent', mailAvailable: true, fileSize: 1000, missingFile: null, persistOptions: null,
    auth: { currentUser: { uid: 'qa-user' } }, platform: { OS: 'android' } };
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState: initial => {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
    },
    useRef: value => { const [ref] = React.useState(() => ({ current: value })); return ref; },
    useEffect: (callback, deps) => {
      const i = cursor++;
      if (!effects[i] || deps.some((d, j) => !Object.is(d, effects[i][j]))) { effects[i] = deps; pending.push(callback); }
    },
  };
  const native = new Proxy({ __esModule: true, StyleSheet: { create: s => s }, Platform: h.platform,
    Alert: { alert: (...args) => h.alerts.push(args) } }, { get: (object, key) => key in object ? object[key] : key });
  const authStore = selector => selector({ user: { uid: 'qa-user', displayName: 'QA Inspector', email: 'qa@example.invalid' } });
  authStore.getState = () => ({ user: { uid: h.auth.currentUser?.uid || 'qa-user' } });
  const mocks = {
    react: React, 'react-native': native,
    '@react-navigation/native': { usePreventRemove: (dirty, callback) => { h.preventRemove = { dirty, callback }; } },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ bottom: 0 }) },
    '@expo/vector-icons': { Ionicons: 'Icon' },
    zustand: { create: () => init => {
      state = init(update => { state = { ...state, ...(typeof update === 'function' ? update(state) : update) }; }, () => state);
      const store = selector => selector(state); store.getState = () => state;
      store.setState = update => { state = { ...state, ...update }; }; return store;
    } },
    'zustand/middleware': { persist: (init, options) => { h.persistOptions = options; return init; }, createJSONStorage: () => ({}) },
    '@react-native-async-storage/async-storage': {},
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'), collection: (_, ...parts) => parts.join('/'),
      setDoc: async (reference, data) => {
        if (h.failWrites) throw Error('Offline');
        h.writes.push({ path: reference, data: JSON.parse(JSON.stringify(data)) });
      },
      deleteDoc: async reference => { if (h.failWrites) throw Error('Offline'); h.writes.push({ path: reference, data: null }); },
      getDocs: async reference => ({ docs: (h.remote[reference.split('/').at(-1)] || []).map(data => ({ id: data.id, data: () => data })) }),
      getDoc: async () => ({ exists: () => false }),
    },
    'expo-image-picker': {
      requestCameraPermissionsAsync: async () => ({ granted: true }),
      launchCameraAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///cache/camera.jpg' }] }),
      launchImageLibraryAsync: async () => ({ canceled: false, assets: [{ uri: 'file:///cache/gallery.png' }] }),
    },
    'expo-location': {},
    'expo-file-system/legacy': {
      documentDirectory: 'file:///documents/', cacheDirectory: 'file:///cache/',
      getInfoAsync: async uri => ({ exists: uri !== h.missingFile, isDirectory: false, size: h.fileSize }),
      makeDirectoryAsync: async () => {}, copyAsync: async info => h.files.push(info),
    },
    'expo-print': { printToFileAsync: async ({ html }) => { h.printed.push(html); return { uri: 'file:///cache/generated.pdf' }; }, printAsync: async () => {} },
    'expo-mail-composer': { isAvailableAsync: async () => h.mailAvailable,
      composeAsync: async options => { h.mail.push(options); return { status: h.mailStatus }; } },
    'expo-sharing': { isAvailableAsync: async () => true, shareAsync: async () => {} },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const mod = { exports: {} }; cache.set(filename, mod);
    const requireModule = request => {
      if (request in mocks) return mocks[request];
      if (request.endsWith('/config/firebase')) return { auth: h.auth, db: {} };
      if (request.endsWith('/authStore')) return { useAuthStore: authStore };
      if (/components\/(ImageEditorModal|MapAddressPickerModal|SignatureModal)$/.test(request)) return { __esModule: true, default: request.split('/').at(-1) };
      if (request.endsWith('lynkoLogoBase64')) return { lynkoLogoBase64: '' };
      if (request.startsWith('.')) {
        const base = path.resolve(path.dirname(filename), request);
        const target = ['.ts', '.tsx'].map(extension => base + extension).find(fs.existsSync);
        if (target) return load(path.relative(path.resolve(__dirname, '..'), target));
      }
      throw Error('Unexpected dependency: ' + request);
    };
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
    } }).outputText;
    vm.runInNewContext(code, { module: mod, exports: mod.exports, require: requireModule,
      console: { ...console, warn() {} }, setTimeout, clearTimeout, Date, Math }, { filename });
    return mod.exports;
  }
  h.load = load;
  h.store = load('src/store/lynkoStore.ts').useLynkoStore;
  h.state = () => h.store.getState();
  h.flush = async () => { for (let i = 0; i < 4; i++) await h.state().flushPendingWrites(); };
  h.mount = (screen, props = {}) => {
    slots = []; effects = [];
    const C = load('src/screens/' + screen + '.tsx').default;
    const navigation = Object.fromEntries(['navigate', 'replace', 'popTo', 'push', 'goBack', 'dispatch'].map(name => [name, (...args) => h.navigation.push([name, ...args])]));
    return () => { cursor = 0; pending = []; const tree = C({ navigation, route: {}, ...props }); pending.forEach(fn => fn()); return tree; };
  };
  return h;
}
const nodes = node => Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
const text = node => Array.isArray(node) ? node.map(text).join('') : node && typeof node === 'object' ? text(node.props?.children) : String(node ?? '');
const buttons = tree => nodes(tree).filter(n => n.type === 'TouchableOpacity');
const click = (tree, label) => { const button = buttons(tree).find(n => text(n).includes(label)); if (!button) throw Error('Missing button ' + label); return button.props.onPress(); };
const inputs = tree => nodes(tree).filter(n => n.type === 'TextInput');
const project = (id, projectType = 'Mold') => ({ id, poNumber: id, title: id, description: id, projectType,
  address: 'QA site', zipCode: '75001', date: '01/02/2025', inspectorName: 'QA Inspector', status: 'Draft', samplesCount: 0 });
const sample = (id = 's1', name = 'M-01') => ({ id, name, description: 'Bedroom', sampleCode: '1', flowRate: '15', duration: '2.5', volume: '37.5 L', photoUris: ['file:///documents/inspections/photo.jpg'] });
module.exports = { harness, nodes, text, buttons, click, inputs, project, sample };
