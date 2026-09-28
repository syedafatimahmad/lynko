import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
}

const COLORS = ['#FFE600', '#EF4444', '#22C55E', '#3B82F6', '#FFFFFF', '#000000'];

function editorHtml(imageUrl: string) {
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #111827; }
  body { display: flex; align-items: center; justify-content: center; }
  canvas { display: block; max-width: 100vw; max-height: 100vh; width: auto; height: auto; touch-action: none; }
</style></head><body><canvas id="photo"></canvas><script>
  const canvas = document.getElementById('photo');
  const ctx = canvas.getContext('2d');
  const image = new Image();
  const annotations = [];
  let active = null;
  let movingText = null;
  let pointerId = null;
  let color = '#FFE600';
  let mode = 'pen';
  const send = (type, data) => window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    annotations.forEach(item => item.type === 'text' ? drawText(item) : drawStroke(item));
  }
  function textLayout(item) {
    ctx.font = 'bold ' + item.size + 'px sans-serif';
    const padding = item.size * 0.4;
    const maxWidth = canvas.width * 0.8;
    const words = item.text.split(/\\s+/);
    const lines = [];
    let line = '';
    words.forEach(word => {
      const proposed = line ? line + ' ' + word : word;
      if (line && ctx.measureText(proposed).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = proposed;
      }
    });
    if (line) lines.push(line);
    const width = Math.min(maxWidth, Math.max(...lines.map(value => ctx.measureText(value).width), item.size));
    return { lines, padding, width: width + padding * 2, height: lines.length * item.size * 1.25 + padding * 2 };
  }
  function drawText(item) {
    const layout = textLayout(item);
    ctx.fillStyle = 'rgba(15,23,42,0.82)';
    ctx.fillRect(item.x, item.y, layout.width, layout.height);
    ctx.fillStyle = item.color;
    ctx.textBaseline = 'top';
    layout.lines.forEach((line, index) => {
      ctx.fillText(line, item.x + layout.padding, item.y + layout.padding + index * item.size * 1.25, layout.width - layout.padding * 2);
    });
  }
  function textAt(position) {
    for (let index = annotations.length - 1; index >= 0; index--) {
      const item = annotations[index];
      if (item.type !== 'text') continue;
      const layout = textLayout(item);
      if (position.x >= item.x && position.x <= item.x + layout.width &&
          position.y >= item.y && position.y <= item.y + layout.height) return item;
    }
    return null;
  }
  function drawStroke(stroke) {
    const points = stroke.points;
    if (!points.length) return;
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, stroke.width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }
  function point(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (event.clientX - rect.left) * canvas.width / rect.width)),
      y: Math.max(0, Math.min(canvas.height, (event.clientY - rect.top) * canvas.height / rect.height))
    };
  }
  canvas.addEventListener('pointerdown', event => {
    if (pointerId !== null || !canvas.width || (event.pointerType === 'mouse' && event.button !== 0)) return;
    event.preventDefault();
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    if (mode === 'text') {
      const position = point(event);
      const item = textAt(position);
      movingText = item ? { item, dx: position.x - item.x, dy: position.y - item.y } : null;
      return;
    }
    const rect = canvas.getBoundingClientRect();
    active = { type: 'pen', color, width: Math.max(3, 3.5 * canvas.width / rect.width), points: [point(event)] };
    annotations.push(active);
    drawStroke(active);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    if (movingText) {
      const position = point(event);
      const layout = textLayout(movingText.item);
      movingText.item.x = Math.max(0, Math.min(canvas.width - layout.width, position.x - movingText.dx));
      movingText.item.y = Math.max(0, Math.min(canvas.height - layout.height, position.y - movingText.dy));
      redraw();
      return;
    }
    if (!active) return;
    const next = point(event);
    const previous = active.points[active.points.length - 1];
    if (Math.hypot(next.x - previous.x, next.y - previous.y) < 1) return;
    active.points.push(next);
    ctx.strokeStyle = active.color;
    ctx.lineWidth = active.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(next.x, next.y);
    ctx.stroke();
  });
  function finish(event) {
    if (event.pointerId !== pointerId) return;
    event.preventDefault();
    pointerId = null;
    active = null;
    movingText = null;
  }
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  window.setPenColor = value => { color = value; };
  window.setEditorMode = value => { mode = value; };
  window.addTextNote = (value, textColor) => {
    const text = String(value).trim();
    if (!text) return;
    const rect = canvas.getBoundingClientRect();
    const item = { type: 'text', text, color: textColor, size: Math.max(18, 18 * canvas.width / rect.width), x: canvas.width * 0.1, y: canvas.height * 0.45 };
    annotations.push(item);
    const layout = textLayout(item);
    item.x = Math.max(0, (canvas.width - layout.width) / 2);
    item.y = Math.max(0, (canvas.height - layout.height) / 2);
    mode = 'text';
    redraw();
  };
  window.undoStroke = () => { if (annotations.length) { annotations.pop(); redraw(); } };
  window.clearStrokes = () => { annotations.length = 0; redraw(); };
  window.exportEditedImage = () => {
    try { send('EXPORT_IMAGE', canvas.toDataURL('image/jpeg', 0.88)); }
    catch (error) { send('ERROR', String(error)); }
  };
  image.onload = () => {
    const scale = Math.min(1, 2048 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    redraw();
    send('READY');
  };
  image.onerror = () => send('ERROR', 'Could not open this photo.');
  image.src = ${JSON.stringify(imageUrl)};
</script></body></html>`;
}

export default function ImageEditorModal({ visible, imageUri, onSave, onCancel }: ImageEditorModalProps) {
  const insets = useSafeAreaInsets();
  const webView = useRef<WebView>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [mode, setMode] = useState<'pen' | 'text'>('pen');
  const [textDialogVisible, setTextDialogVisible] = useState(false);
  const [textInput, setTextInput] = useState('');
  const webSource = useMemo(() => imageUrl ? { html: editorHtml(imageUrl) } : null, [imageUrl]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    let current = true;
    setImageUrl(null);
    setReady(false);
    setSaving(false);
    setSelectedColor(COLORS[0]);
    setMode('pen');
    setTextDialogVisible(false);
    setTextInput('');
    const load = async () => {
      try {
        const url = imageUri.startsWith('data:image')
          ? imageUri
          : `data:image/jpeg;base64,${await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 })}`;
        if (current) setImageUrl(url);
      } catch (error) {
        console.error('Photo editor load failed:', error);
        if (current) {
          Alert.alert('Photo unavailable', 'Could not open this photo for editing.');
          onCancel();
        }
      }
    };
    load();
    return () => { current = false; };
  }, [visible, imageUri]);

  const run = (script: string) => webView.current?.injectJavaScript(`${script}; true;`);
  const addText = () => {
    const value = textInput.trim();
    if (!value || !ready) return;
    run(`window.addTextNote(${JSON.stringify(value)}, ${JSON.stringify(selectedColor)})`);
    setMode('text');
    setTextInput('');
    setTextDialogVisible(false);
  };

  const onMessage = async (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'READY') {
        setReady(true);
      } else if (message.type === 'ERROR') {
        setSaving(false);
        Alert.alert('Photo editor', message.data || 'Could not edit this photo.', !ready ? [
          { text: 'Close', onPress: onCancel },
        ] : undefined);
      } else if (message.type === 'EXPORT_IMAGE') {
        const base64 = String(message.data).replace(/^data:image\/jpeg;base64,/, '');
        if (!FileSystem.documentDirectory || !base64 || base64 === message.data) {
          throw new Error('Edited photo data is unavailable.');
        }
        const directory = `${FileSystem.documentDirectory}inspections/`;
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
        const uri = `${directory}annotated_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
        setSaving(false);
        onSave(uri);
      }
    } catch (error) {
      console.error('Photo editor save failed:', error);
      setSaving(false);
      Alert.alert('Save failed', 'Could not save the edited photo. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onCancel} style={styles.iconButton} accessibilityLabel="Cancel photo editing">
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.heading}>
            <Text style={styles.title}>Mark up photo</Text>
            <Text style={styles.subtitle}>{mode === 'pen' ? 'Draw with your finger' : 'Drag text to position it'}</Text>
          </View>
          <TouchableOpacity onPress={() => run('window.undoStroke()')} disabled={!ready || saving} style={styles.iconButton} accessibilityLabel="Undo last annotation">
            <Ionicons name="arrow-undo" size={22} color={ready ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Clear annotations?', 'Remove all pen marks and text from this photo?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => run('window.clearStrokes()') },
            ])}
            disabled={!ready || saving}
            style={styles.iconButton}
            accessibilityLabel="Clear all annotations"
          >
            <Ionicons name="trash-outline" size={21} color={ready ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
        </View>
        <View style={styles.photoArea}>
          {webSource && <WebView
            ref={webView}
            source={webSource}
            style={styles.webView}
            javaScriptEnabled
            scrollEnabled={false}
            originWhitelist={['*']}
            onMessage={onMessage}
          />}
          {!ready && <View style={styles.loading}><ActivityIndicator color="#FFE600" size="large" /></View>}
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.toolRow}>
            <TouchableOpacity
              onPress={() => { setMode('pen'); run("window.setEditorMode('pen')"); }}
              disabled={!ready || saving}
              style={[styles.toolButton, mode === 'pen' && styles.activeTool]}
              accessibilityLabel="Use pen"
            >
              <Ionicons name="brush" size={18} color="#FFFFFF" />
              <Text style={styles.toolText}>Pen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTextDialogVisible(true)}
              disabled={!ready || saving}
              style={[styles.toolButton, mode === 'text' && styles.activeTool]}
              accessibilityLabel="Add text to photo"
            >
              <Ionicons name="text-outline" size={20} color="#FFFFFF" />
              <Text style={styles.toolText}>Add text</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.palette}>
            <Text style={styles.colorLabel}>Color</Text>
            {COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => { setSelectedColor(color); run(`window.setPenColor(${JSON.stringify(color)})`); }}
                style={[styles.swatchOuter, selectedColor === color && styles.selectedSwatch]}
                accessibilityLabel={`Pen color ${color}`}
              >
                <View style={[styles.swatch, { backgroundColor: color }]} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            onPress={() => { setSaving(true); run('window.exportEditedImage()'); }}
            disabled={!ready || saving}
            style={[styles.saveButton, (!ready || saving) && styles.disabled]}
            accessibilityLabel="Save edited photo"
          >
            {saving ? <ActivityIndicator color="#111827" /> : <><Ionicons name="checkmark" size={20} color="#111827" /><Text style={styles.saveText}>Save photo</Text></>}
          </TouchableOpacity>
        </View>
        {textDialogVisible && (
          <KeyboardAvoidingView style={styles.dialogBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.dialogCard}>
              <Text style={styles.dialogTitle}>Add a photo note</Text>
              <Text style={styles.dialogHint}>Enter text, then drag it into place.</Text>
              <TextInput
                value={textInput}
                onChangeText={setTextInput}
                placeholder="Describe what this photo shows"
                placeholderTextColor="#64748B"
                maxLength={120}
                multiline
                autoFocus
                style={styles.textInput}
              />
              <View style={styles.dialogActions}>
                <TouchableOpacity onPress={() => { setTextDialogVisible(false); setTextInput(''); }} style={styles.dialogAction}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addText} disabled={!textInput.trim()} style={[styles.dialogAction, styles.addTextButton, !textInput.trim() && styles.disabled]}>
                  <Text style={styles.addTextButtonText}>Add text</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 12, gap: 8 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#243041', alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, paddingHorizontal: 4 },
  title: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  subtitle: { color: '#CBD5E1', fontSize: 12, marginTop: 2 },
  photoArea: { flex: 1, backgroundColor: '#0B1220' },
  webView: { flex: 1, backgroundColor: '#0B1220' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0B1220' },
  footer: { paddingHorizontal: 18, paddingTop: 16, gap: 18 },
  toolRow: { flexDirection: 'row', gap: 10 },
  toolButton: { minHeight: 42, paddingHorizontal: 16, borderRadius: 10, backgroundColor: '#243041', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  activeTool: { borderColor: '#FFE600', borderWidth: 1 },
  toolText: { color: '#FFFFFF', fontWeight: '600' },
  palette: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorLabel: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  swatchOuter: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  selectedSwatch: { borderWidth: 2, borderColor: '#FFFFFF' },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#9CA3AF' },
  saveButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#FFE600', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  saveText: { color: '#111827', fontSize: 16, fontWeight: '700' },
  dialogBackdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialogCard: { width: '100%', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 20, gap: 12 },
  dialogTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
  dialogHint: { color: '#475569', fontSize: 13 },
  textInput: { minHeight: 88, maxHeight: 160, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12, color: '#111827', textAlignVertical: 'top', fontSize: 16 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  dialogAction: { minHeight: 42, minWidth: 82, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  cancelText: { color: '#334155', fontWeight: '600' },
  addTextButton: { borderRadius: 9, backgroundColor: '#FFE600' },
  addTextButtonText: { color: '#111827', fontWeight: '700' },
});
