import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { colors } from '../theme/colors';

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
}

const COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Yellow
  '#10B981', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Magenta
  '#FFFFFF', // White
  '#000000', // Black
];

export default function ImageEditorModal({
  visible,
  imageUri,
  onSave,
  onCancel,
}: ImageEditorModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [selectedColor, setSelectedColor] = useState('#EF4444');
  const [activeTool, setActiveTool] = useState<'draw' | 'text'>('draw');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageBase64Url, setImageBase64Url] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadImageData = async () => {
      if (!visible || !imageUri) return;
      setLoadingImage(true);
      try {
        if (imageUri.startsWith('data:image')) {
          if (isMounted) {
            setImageBase64Url(imageUri);
            setLoadingImage(false);
          }
        } else {
          const b64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          if (isMounted) {
            setImageBase64Url(`data:image/jpeg;base64,${b64}`);
            setLoadingImage(false);
          }
        }
      } catch (e) {
        console.error('Error loading image for editor:', e);
        if (isMounted) {
          setImageBase64Url(imageUri);
          setLoadingImage(false);
        }
      }
    };

    loadImageData();
    return () => {
      isMounted = false;
    };
  }, [visible, imageUri]);

  if (!visible) return null;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; }
        body, html { width: 100%; height: 100%; background-color: #0F172A; overflow: hidden; display: flex; justify-content: center; align-items: center; }
        #canvas-container { position: relative; width: 100vw; height: 100vh; display: flex; justify-content: center; align-items: center; }
        canvas { max-width: 100%; max-height: 100%; object-fit: contain; }
      </style>
    </head>
    <body>
      <div id="canvas-container">
        <canvas id="editorCanvas"></canvas>
      </div>

      <script>
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');
        let img = new Image();
        let rotation = 0;
        let currentColor = '${selectedColor}';
        let isDrawing = false;
        let strokeWidth = 5;

        img.onload = () => {
          fitCanvas();
        };
        img.src = '${imageBase64Url || ''}';

        function fitCanvas() {
          let w = img.width || 800;
          let h = img.height || 600;
          canvas.width = w;
          canvas.height = h;
          drawImage();
        }

        function drawImage() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          if (rotation % 180 !== 0) {
            ctx.drawImage(img, -img.height / 2, -img.width / 2, img.height, img.width);
          } else {
            ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
          }
          ctx.restore();
        }

        function rotateImage(angle) {
          rotation = (rotation + angle) % 360;
          let tempW = canvas.width;
          canvas.width = canvas.height;
          canvas.height = tempW;
          drawImage();
        }

        function setColor(c) {
          currentColor = c;
        }

        function getCanvasCoords(e) {
          const rect = canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
          };
        }

        function startDraw(e) {
          isDrawing = true;
          const pos = getCanvasCoords(e);
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = Math.max(6, strokeWidth * (canvas.width / 800));
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }

        function moveDraw(e) {
          if (!isDrawing) return;
          const pos = getCanvasCoords(e);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
        }

        function stopDraw() {
          if (isDrawing) {
            isDrawing = false;
            ctx.closePath();
          }
        }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', startDraw);
        canvas.addEventListener('touchmove', moveDraw);
        canvas.addEventListener('touchend', stopDraw);

        function addText(text) {
          if (!text) return;
          ctx.save();
          ctx.font = 'bold ' + Math.max(28, canvas.width / 18) + 'px sans-serif';
          ctx.fillStyle = currentColor;
          ctx.shadowColor = 'rgba(0,0,0,0.85)';
          ctx.shadowBlur = 8;
          ctx.fillText(text, canvas.width / 10, canvas.height / 3);
          ctx.restore();
        }

        function exportCanvas() {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'EXPORT_IMAGE', data: dataUrl }));
        }

        document.addEventListener('message', function(event) {
          handleMsg(event.data);
        });
        window.addEventListener('message', function(event) {
          handleMsg(event.data);
        });

        function handleMsg(msgStr) {
          try {
            const msg = JSON.parse(msgStr);
            if (msg.type === 'ROTATE') rotateImage(msg.angle);
            if (msg.type === 'SET_COLOR') setColor(msg.color);
            if (msg.type === 'ADD_TEXT') addText(msg.text);
            if (msg.type === 'EXPORT') exportCanvas();
          } catch(e){}
        }
      </script>
    </body>
    </html>
  `;

  const handleRotate = (angle: number) => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ROTATE', angle }));
  };

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_COLOR', color }));
  };

  const handleAddTextSubmit = () => {
    if (textInput.trim()) {
      webViewRef.current?.postMessage(JSON.stringify({ type: 'ADD_TEXT', text: textInput.trim() }));
      setTextInput('');
      setShowTextInput(false);
    }
  };

  const handleTriggerExport = () => {
    setSaving(true);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'EXPORT' }));
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'EXPORT_IMAGE' && msg.data) {
        const base64Code = msg.data.replace(/^data:image\/\w+;base64,/, '');
        const filename = `edited_photo_${Date.now()}.jpg`;
        const localFileUri = `${FileSystem.cacheDirectory}${filename}`;

        await FileSystem.writeAsStringAsync(localFileUri, base64Code, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setSaving(false);
        onSave(localFileUri);
      }
    } catch (e) {
      console.error('Error saving edited image:', e);
      setSaving(false);
      Alert.alert('Save Notice', 'Failed to save image annotations.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Top Action Header */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCancel} style={styles.topBarBtn}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.topBarTitle}>Photo Editor & Markup</Text>

          <TouchableOpacity onPress={handleTriggerExport} style={styles.saveBtn} disabled={saving || loadingImage}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <View style={styles.saveBtnContent}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.saveBtnText}>Save</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Main Interactive Canvas WebView */}
        <View style={styles.canvasWrapper}>
          {loadingImage ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primaryContainer} />
              <Text style={styles.loadingText}>Loading Photo Editor...</Text>
            </View>
          ) : (
            <WebView
              ref={webViewRef}
              source={{ html: htmlContent }}
              style={styles.webView}
              scrollEnabled={false}
              onMessage={handleWebViewMessage}
              javaScriptEnabled={true}
              allowFileAccess={true}
              originWhitelist={['*']}
            />
          )}
        </View>

        {/* Text Entry Overlay Input */}
        {showTextInput && (
          <View style={styles.textInputBar}>
            <TextInput
              style={styles.textInputField}
              placeholder="Enter photo label text..."
              placeholderTextColor="#94A3B8"
              value={textInput}
              onChangeText={setTextInput}
              autoFocus
            />
            <TouchableOpacity style={styles.textSubmitBtn} onPress={handleAddTextSubmit}>
              <Text style={styles.textSubmitText}>Add</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.textCancelBtn} onPress={() => setShowTextInput(false)}>
              <Ionicons name="close" size={20} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom Toolbar & WhatsApp Spectrum Color Bar */}
        <View style={styles.bottomToolbarContainer}>
          {/* WhatsApp Style Spectrum Color Palette Bar */}
          <View style={styles.colorPaletteRow}>
            {COLOR_PALETTE.map((c) => (
              <TouchableOpacity
                key={c}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  selectedColor === c && styles.colorSwatchSelected,
                ]}
                onPress={() => handleColorSelect(c)}
              />
            ))}
          </View>

          {/* Action Tools Row */}
          <View style={styles.toolsRow}>
            <TouchableOpacity style={styles.toolBtn} onPress={() => handleRotate(90)}>
              <Ionicons name="reload" size={22} color="#FFFFFF" />
              <Text style={styles.toolLabel}>Rotate</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, activeTool === 'draw' && styles.toolBtnActive]}
              onPress={() => setActiveTool('draw')}
            >
              <Ionicons name="pencil" size={22} color={activeTool === 'draw' ? colors.primaryContainer : '#FFFFFF'} />
              <Text style={[styles.toolLabel, activeTool === 'draw' && styles.toolLabelActive]}>Draw</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, activeTool === 'text' && styles.toolBtnActive]}
              onPress={() => {
                setActiveTool('text');
                setShowTextInput(true);
              }}
            >
              <Ionicons name="text-outline" size={22} color={activeTool === 'text' ? colors.primaryContainer : '#FFFFFF'} />
              <Text style={[styles.toolLabel, activeTool === 'text' && styles.toolLabelActive]}>Add Text</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topBarBtn: { padding: 4 },
  topBarTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  saveBtn: { backgroundColor: colors.primaryContainer, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  saveBtnContent: { flexDirection: 'row', alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  canvasWrapper: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#94A3B8', marginTop: 10, fontSize: 14 },
  webView: { flex: 1, backgroundColor: 'transparent' },
  textInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  textInputField: {
    flex: 1,
    height: 42,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  textSubmitBtn: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  textSubmitText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  textCancelBtn: { padding: 8, marginLeft: 4 },
  bottomToolbarContainer: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  colorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: '#475569',
  },
  colorSwatchSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.25 }],
    shadowColor: '#FFF',
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  toolsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  toolBtn: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toolBtnActive: { backgroundColor: '#334155' },
  toolLabel: { color: '#94A3B8', fontSize: 12, marginTop: 2, fontWeight: '600' },
  toolLabelActive: { color: colors.primaryContainer, fontWeight: '700' },
});
