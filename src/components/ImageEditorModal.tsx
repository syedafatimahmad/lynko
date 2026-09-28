import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const strokes = [];
  let active = null;
  let pointerId = null;
  let color = '#FFE600';
  const send = (type, data) => window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));

  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    strokes.forEach(drawStroke);
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
    const rect = canvas.getBoundingClientRect();
    active = { color, width: Math.max(3, 3.5 * canvas.width / rect.width), points: [point(event)] };
    strokes.push(active);
    drawStroke(active);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId !== pointerId || !active) return;
    event.preventDefault();
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
  }
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
  window.setPenColor = value => { color = value; };
  window.undoStroke = () => { if (strokes.length) { strokes.pop(); redraw(); } };
  window.clearStrokes = () => { strokes.length = 0; redraw(); };
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
  const webSource = useMemo(() => imageUrl ? { html: editorHtml(imageUrl) } : null, [imageUrl]);

  useEffect(() => {
    if (!visible || !imageUri) return;
    let current = true;
    setImageUrl(null);
    setReady(false);
    setSaving(false);
    setSelectedColor(COLORS[0]);
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
            <Text style={styles.subtitle}>Draw with your finger</Text>
          </View>
          <TouchableOpacity onPress={() => run('window.undoStroke()')} disabled={!ready || saving} style={styles.iconButton} accessibilityLabel="Undo last pen stroke">
            <Ionicons name="arrow-undo" size={22} color={ready ? '#FFFFFF' : '#64748B'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Clear drawing?', 'Remove all pen marks from this photo?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Clear', style: 'destructive', onPress: () => run('window.clearStrokes()') },
            ])}
            disabled={!ready || saving}
            style={styles.iconButton}
            accessibilityLabel="Clear all pen strokes"
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
          <View style={styles.palette}>
            <Ionicons name="brush" size={20} color="#FFFFFF" />
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
  palette: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swatchOuter: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  selectedSwatch: { borderWidth: 2, borderColor: '#FFFFFF' },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#9CA3AF' },
  saveButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#FFE600', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.5 },
  saveText: { color: '#111827', fontSize: 16, fontWeight: '700' },
});
