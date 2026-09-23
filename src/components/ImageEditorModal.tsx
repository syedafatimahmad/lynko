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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';

interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
}

const COLOR_PALETTE = [
  '#FFE600', // Yellow (Default)
  '#EF4444', // Red
  '#22C55E', // Green
  '#3B82F6', // Blue
  '#F97316', // Orange
  '#FFFFFF', // White
  '#000000', // Black
];

export default function ImageEditorModal({
  visible,
  imageUri,
  onSave,
  onCancel,
}: ImageEditorModalProps) {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const selectedColor = COLOR_PALETTE[selectedColorIndex];
  const [activeTool, setActiveTool] = useState<'pen' | 'arrow' | 'circle' | 'rect' | 'measure' | 'text'>('pen');
  const [showColorPicker, setShowColorPicker] = useState(true);
  
  // Draggable Text sticker controls
  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [stickerFontSize, setStickerFontSize] = useState<number>(22);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [imageBase64Url, setImageBase64Url] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(true);

  const nowFormatted = `${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  useEffect(() => {
    let isMounted = true;
    const loadImageData = async () => {
      if (!visible || !imageUri) return;
      setLoadingImage(true);
      setActiveStickerId(null);
      setStickerFontSize(22);
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
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          touch-action: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          user-select: none;
        }
        body, html {
          width: 100%;
          height: 100%;
          background-color: #000000;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        #viewport {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        #canvas-wrapper {
          position: relative;
          display: inline-block;
          max-width: 100vw;
          max-height: 100vh;
        }
        canvas {
          display: block;
          max-width: 100vw;
          max-height: 100vh;
          object-fit: contain;
        }
        #stickers-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: visible;
        }
        .text-sticker {
          position: absolute;
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.88);
          border: 2px solid transparent;
          border-radius: 8px;
          padding: 6px 12px;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-weight: 700;
          color: #FFE600;
          font-size: 22px;
          cursor: move;
          box-shadow: 0 4px 14px rgba(0,0,0,0.6);
          white-space: pre-wrap;
          word-break: break-word;
          max-width: 85vw;
          z-index: 20;
        }
        .text-sticker.selected {
          border-color: #38BDF8;
          box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.35), 0 4px 16px rgba(0,0,0,0.7);
          z-index: 30;
        }
        .sticker-content {
          pointer-events: none;
        }
        .sticker-delete-btn {
          display: none;
          position: absolute;
          top: -10px;
          right: -10px;
          width: 22px;
          height: 22px;
          background: #EF4444;
          color: #FFFFFF;
          border: 1.5px solid #FFFFFF;
          border-radius: 11px;
          font-size: 12px;
          line-height: 19px;
          text-align: center;
          font-weight: bold;
          cursor: pointer;
          pointer-events: auto;
        }
        .sticker-resize-btn {
          display: none;
          position: absolute;
          bottom: -10px;
          right: -10px;
          width: 22px;
          height: 22px;
          background: #38BDF8;
          color: #FFFFFF;
          border: 1.5px solid #FFFFFF;
          border-radius: 11px;
          font-size: 13px;
          line-height: 19px;
          text-align: center;
          cursor: nwse-resize;
          pointer-events: auto;
        }
        .text-sticker.selected .sticker-delete-btn,
        .text-sticker.selected .sticker-resize-btn {
          display: block;
        }
      </style>
    </head>
    <body>
      <div id="viewport">
        <div id="canvas-wrapper">
          <canvas id="editorCanvas"></canvas>
          <div id="stickers-layer"></div>
        </div>
      </div>

      <script>
        const canvas = document.getElementById('editorCanvas');
        const ctx = canvas.getContext('2d');
        const stickersLayer = document.getElementById('stickers-layer');
        let img = new Image();
        let rotation = 0;
        let currentColor = '${selectedColor}';
        let currentTool = '${activeTool}';
        let isDrawing = false;
        let startX = 0;
        let startY = 0;
        let dragSnapshot = null;
        let undoStack = [];
        let strokeWidth = 5;

        // Stickers store
        let stickers = [];
        let activeSticker = null;

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
          undoStack = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
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
          undoStack = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
        }

        function saveSnapshot() {
          if (undoStack.length >= 20) undoStack.shift();
          undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
        }

        function undo() {
          if (undoStack.length > 1) {
            undoStack.pop();
            const prev = undoStack[undoStack.length - 1];
            ctx.putImageData(prev, 0, 0);
          } else if (undoStack.length === 1) {
            ctx.putImageData(undoStack[0], 0, 0);
          }
        }

        function clearAll() {
          drawImage();
          undoStack = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
          // Remove all stickers
          stickersLayer.innerHTML = '';
          stickers = [];
          activeSticker = null;
          postMsg({ type: 'STICKER_DESELECTED' });
        }

        function getCanvasCoords(e) {
          const rect = canvas.getBoundingClientRect();
          const clientX = e.touches && e.touches[0] ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY;
          const scaleX = canvas.width / rect.width;
          const scaleY = canvas.height / rect.height;
          return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
          };
        }

        function drawArrow(x1, y1, x2, y2, color, width) {
          const headlen = Math.max(16, width * 3.8);
          const angle = Math.atan2(y2 - y1, x2 - x1);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.fillStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();

          // Arrow head
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
          ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }

        function drawCircle(x1, y1, x2, y2, color, width) {
          const rx = Math.abs(x2 - x1) / 2;
          const ry = Math.abs(y2 - y1) / 2;
          const cx = Math.min(x1, x2) + rx;
          const cy = Math.min(y1, y2) + ry;
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(2, rx), Math.max(2, ry), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        function drawRect(x1, y1, x2, y2, color, width) {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
          ctx.restore();
        }

        function drawMeasure(x1, y1, x2, y2, color, width) {
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const perpAngle = angle + Math.PI / 2;
          const capLen = Math.max(16, width * 3.2);
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = width;
          ctx.lineCap = 'square';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          // T-cap 1
          ctx.moveTo(x1 - capLen * Math.cos(perpAngle), y1 - capLen * Math.sin(perpAngle));
          ctx.lineTo(x1 + capLen * Math.cos(perpAngle), y1 + capLen * Math.sin(perpAngle));
          // T-cap 2
          ctx.moveTo(x2 - capLen * Math.cos(perpAngle), y2 - capLen * Math.sin(perpAngle));
          ctx.lineTo(x2 + capLen * Math.cos(perpAngle), y2 + capLen * Math.sin(perpAngle));
          ctx.stroke();
          ctx.restore();
        }

        function startDraw(e) {
          // Deselect active text sticker when tapping canvas
          deselectAllStickers();

          if (currentTool === 'text') return;

          isDrawing = true;
          const pos = getCanvasCoords(e);
          startX = pos.x;
          startY = pos.y;
          dragSnapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);

          if (currentTool === 'pen') {
            ctx.beginPath();
            ctx.moveTo(pos.x, pos.y);
            ctx.strokeStyle = currentColor;
            ctx.lineWidth = Math.max(6, strokeWidth * (canvas.width / 800));
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
          }
        }

        function moveDraw(e) {
          if (!isDrawing) return;
          const pos = getCanvasCoords(e);
          const calcWidth = Math.max(6, strokeWidth * (canvas.width / 800));

          if (currentTool === 'pen') {
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
          } else {
            ctx.putImageData(dragSnapshot, 0, 0);
            if (currentTool === 'arrow') {
              drawArrow(startX, startY, pos.x, pos.y, currentColor, calcWidth);
            } else if (currentTool === 'circle') {
              drawCircle(startX, startY, pos.x, pos.y, currentColor, calcWidth);
            } else if (currentTool === 'rect') {
              drawRect(startX, startY, pos.x, pos.y, currentColor, calcWidth);
            } else if (currentTool === 'measure') {
              drawMeasure(startX, startY, pos.x, pos.y, currentColor, calcWidth);
            }
          }
        }

        function stopDraw(e) {
          if (isDrawing) {
            isDrawing = false;
            if (currentTool === 'pen') {
              ctx.closePath();
            }
            saveSnapshot();
          }
        }

        canvas.addEventListener('mousedown', startDraw);
        canvas.addEventListener('mousemove', moveDraw);
        canvas.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', startDraw, { passive: false });
        canvas.addEventListener('touchmove', moveDraw, { passive: false });
        canvas.addEventListener('touchend', stopDraw, { passive: false });

        // ==========================================
        // SNAPCHAT-STYLE DRAGGABLE & RESIZABLE TEXT
        // ==========================================

        function deselectAllStickers() {
          const els = stickersLayer.querySelectorAll('.text-sticker');
          els.forEach(el => el.classList.remove('selected'));
          activeSticker = null;
          postMsg({ type: 'STICKER_DESELECTED' });
        }

        function selectSticker(stickerObj) {
          deselectAllStickers();
          stickerObj.el.classList.add('selected');
          activeSticker = stickerObj;
          postMsg({
            type: 'STICKER_SELECTED',
            id: stickerObj.id,
            fontSize: stickerObj.fontSize,
            color: stickerObj.color
          });
        }

        function addTextSticker(text, color) {
          if (!text || !text.trim()) return;
          const id = 'sticker_' + Date.now();
          const initialColor = color || currentColor;
          const initialFontSize = 24;

          const el = document.createElement('div');
          el.className = 'text-sticker selected';
          el.id = id;
          el.style.color = initialColor;
          el.style.fontSize = initialFontSize + 'px';

          // Center in visible canvas
          const layerRect = stickersLayer.getBoundingClientRect();
          const initX = Math.max(20, (layerRect.width / 2) - 100);
          const initY = Math.max(30, (layerRect.height / 2) - 30);
          el.style.left = initX + 'px';
          el.style.top = initY + 'px';

          el.innerHTML =
            '<span class="sticker-content">' + escapeHtml(text) + '</span>' +
            '<button class="sticker-delete-btn">✕</button>' +
            '<div class="sticker-resize-btn">⇲</div>';

          stickersLayer.appendChild(el);

          const stickerObj = {
            id: id,
            el: el,
            text: text,
            color: initialColor,
            fontSize: initialFontSize,
            x: initX,
            y: initY,
          };
          stickers.push(stickerObj);

          setupStickerInteractions(stickerObj);
          selectSticker(stickerObj);
        }

        function setupStickerInteractions(stickerObj) {
          const el = stickerObj.el;
          let isDragging = false;
          let isResizing = false;
          let touchStartX = 0;
          let touchStartY = 0;
          let stickerStartX = 0;
          let stickerStartY = 0;
          let startDistance = 0;
          let startFontSize = stickerObj.fontSize;

          // Delete button
          const deleteBtn = el.querySelector('.sticker-delete-btn');
          const handleDelete = (e) => {
            e.stopPropagation();
            e.preventDefault();
            el.remove();
            stickers = stickers.filter(s => s.id !== stickerObj.id);
            if (activeSticker && activeSticker.id === stickerObj.id) {
              activeSticker = null;
              postMsg({ type: 'STICKER_DESELECTED' });
            }
          };
          deleteBtn.addEventListener('click', handleDelete);
          deleteBtn.addEventListener('touchstart', handleDelete, { passive: false });

          // Resize handle
          const resizeBtn = el.querySelector('.sticker-resize-btn');
          const handleResizeStart = (e) => {
            e.stopPropagation();
            e.preventDefault();
            isResizing = true;
            selectSticker(stickerObj);
            const touch = e.touches ? e.touches[0] : e;
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startDistance = Math.hypot(touch.clientX - centerX, touch.clientY - centerY) || 1;
            startFontSize = stickerObj.fontSize;
          };

          resizeBtn.addEventListener('mousedown', handleResizeStart);
          resizeBtn.addEventListener('touchstart', handleResizeStart, { passive: false });

          // Drag / Tap on Sticker Body
          const handleTouchStart = (e) => {
            if (isResizing) return;
            e.stopPropagation();
            selectSticker(stickerObj);

            // Two-finger pinch detect
            if (e.touches && e.touches.length === 2) {
              isResizing = true;
              isDragging = false;
              startDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
              );
              startFontSize = stickerObj.fontSize;
              return;
            }

            isDragging = true;
            const touch = e.touches ? e.touches[0] : e;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            stickerStartX = parseFloat(el.style.left) || 0;
            stickerStartY = parseFloat(el.style.top) || 0;
          };

          const handleTouchMove = (e) => {
            if (isResizing) {
              e.preventDefault();
              e.stopPropagation();
              let curDist = 0;
              if (e.touches && e.touches.length === 2) {
                curDist = Math.hypot(
                  e.touches[0].clientX - e.touches[1].clientX,
                  e.touches[0].clientY - e.touches[1].clientY
                );
              } else {
                const touch = e.touches ? e.touches[0] : e;
                const rect = el.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                curDist = Math.hypot(touch.clientX - centerX, touch.clientY - centerY);
              }

              const ratio = curDist / (startDistance || 1);
              const newSize = Math.max(12, Math.min(72, Math.round(startFontSize * ratio)));
              stickerObj.fontSize = newSize;
              el.style.fontSize = newSize + 'px';
              postMsg({ type: 'STICKER_RESIZED', fontSize: newSize });
              return;
            }

            if (!isDragging) return;
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches ? e.touches[0] : e;
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;

            const layerRect = stickersLayer.getBoundingClientRect();
            const newX = Math.max(0, Math.min(layerRect.width - 40, stickerStartX + dx));
            const newY = Math.max(0, Math.min(layerRect.height - 30, stickerStartY + dy));

            stickerObj.x = newX;
            stickerObj.y = newY;
            el.style.left = newX + 'px';
            el.style.top = newY + 'px';
          };

          const handleTouchEnd = (e) => {
            isDragging = false;
            isResizing = false;
          };

          el.addEventListener('mousedown', handleTouchStart);
          window.addEventListener('mousemove', handleTouchMove);
          window.addEventListener('mouseup', handleTouchEnd);

          el.addEventListener('touchstart', handleTouchStart, { passive: false });
          window.addEventListener('touchmove', handleTouchMove, { passive: false });
          window.addEventListener('touchend', handleTouchEnd, { passive: false });
        }

        function setStickerFontSize(size) {
          if (!activeSticker) return;
          activeSticker.fontSize = size;
          activeSticker.el.style.fontSize = size + 'px';
        }

        function setStickerColor(color) {
          if (!activeSticker) return;
          activeSticker.color = color;
          activeSticker.el.style.color = color;
        }

        function escapeHtml(str) {
          return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        // ==========================================
        // EXPORT TO HIGH RESOLUTION CANVAS
        // ==========================================
        function exportCanvas() {
          deselectAllStickers();

          // Render all stickers directly onto canvas pixel buffer
          const canvasRect = canvas.getBoundingClientRect();
          const scaleX = canvas.width / canvasRect.width;
          const scaleY = canvas.height / canvasRect.height;

          stickers.forEach(st => {
            const stRect = st.el.getBoundingClientRect();
            const posX = (stRect.left - canvasRect.left) * scaleX;
            const posY = (stRect.top - canvasRect.top) * scaleY;
            const w = stRect.width * scaleX;
            const h = stRect.height * scaleY;
            const scaledFont = Math.round(st.fontSize * scaleY);

            // Draw dark background badge
            ctx.save();
            ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
            ctx.strokeStyle = st.color || currentColor;
            ctx.lineWidth = Math.max(2, 2.5 * scaleY);
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(posX, posY, w, h, 8 * scaleY);
              ctx.fill();
              ctx.stroke();
            } else {
              ctx.fillRect(posX, posY, w, h);
              ctx.strokeRect(posX, posY, w, h);
            }

            // Draw text
            ctx.font = 'bold ' + scaledFont + 'px -apple-system, sans-serif';
            ctx.fillStyle = st.color || currentColor;
            ctx.textBaseline = 'middle';
            ctx.fillText(st.text, posX + (12 * scaleX), posY + (h / 2));
            ctx.restore();
          });

          const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
          postMsg({ type: 'EXPORT_IMAGE', data: dataUrl });
        }

        function postMsg(data) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(data));
          }
        }

        document.addEventListener('message', function(event) { handleMsg(event.data); });
        window.addEventListener('message', function(event) { handleMsg(event.data); });

        function handleMsg(msgStr) {
          try {
            const msg = JSON.parse(msgStr);
            if (msg.type === 'ROTATE') rotateImage(msg.angle);
            if (msg.type === 'SET_COLOR') {
              currentColor = msg.color;
              setStickerColor(msg.color);
            }
            if (msg.type === 'SET_TOOL') currentTool = msg.tool;
            if (msg.type === 'UNDO') undo();
            if (msg.type === 'CLEAR') clearAll();
            if (msg.type === 'ADD_TEXT_STICKER') addTextSticker(msg.text, msg.color);
            if (msg.type === 'SET_STICKER_FONT_SIZE') setStickerFontSize(msg.size);
            if (msg.type === 'EXPORT') exportCanvas();
          } catch(e){}
        }
      </script>
    </body>
    </html>
  `;

  const handleToolSelect = (tool: 'pen' | 'arrow' | 'circle' | 'rect' | 'measure' | 'text') => {
    setActiveTool(tool);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_TOOL', tool }));
    if (tool === 'text') {
      setShowTextInput(true);
    }
  };

  const handleSelectColor = (color: string, idx: number) => {
    setSelectedColorIndex(idx);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_COLOR', color }));
  };

  const handleUndo = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'UNDO' }));
  };

  const handleClear = () => {
    Alert.alert('Clear Annotations', 'Do you want to clear all notes and markups from this photo?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => webViewRef.current?.postMessage(JSON.stringify({ type: 'CLEAR' })) }
    ]);
  };

  const handleRotate = () => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'ROTATE', angle: 90 }));
  };

  const handleAddTextSubmit = () => {
    if (textInput.trim()) {
      webViewRef.current?.postMessage(JSON.stringify({
        type: 'ADD_TEXT_STICKER',
        text: textInput.trim(),
        color: selectedColor,
      }));
      setTextInput('');
      setShowTextInput(false);
      setActiveTool('text');
    }
  };

  const handleAdjustFontSize = (delta: number) => {
    const newSize = Math.max(14, Math.min(60, stickerFontSize + delta));
    setStickerFontSize(newSize);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_STICKER_FONT_SIZE', size: newSize }));
  };

  const handleSetPresetFontSize = (size: number) => {
    setStickerFontSize(size);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'SET_STICKER_FONT_SIZE', size }));
  };

  const handleTriggerExport = () => {
    setSaving(true);
    webViewRef.current?.postMessage(JSON.stringify({ type: 'EXPORT' }));
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'STICKER_SELECTED') {
        setActiveStickerId(msg.id);
        if (msg.fontSize) setStickerFontSize(msg.fontSize);
      } else if (msg.type === 'STICKER_DESELECTED') {
        setActiveStickerId(null);
      } else if (msg.type === 'STICKER_RESIZED') {
        if (msg.fontSize) setStickerFontSize(msg.fontSize);
      } else if (msg.type === 'EXPORT_IMAGE' && msg.data) {
        const base64Code = msg.data.replace(/^data:image\/\w+;base64,/, '');
        const filename = `annotated_photo_${Date.now()}.jpg`;
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
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onCancel}>
      <View style={styles.container}>
        {/* Fullscreen Interactive Canvas */}
        <View style={styles.canvasWrapper}>
          {loadingImage ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFE600" />
              <Text style={styles.loadingText}>Loading Photo...</Text>
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

          {/* ========================================================= */}
          {/* SNAPCHAT-STYLE TOP BAR (Clean, Spacious, No Edge Overflow) */}
          {/* ========================================================= */}
          <View style={[styles.topBar, { top: Math.max(insets.top, 12) }]}>
            {/* Top Left: Frosted Round Close Button */}
            <TouchableOpacity
              onPress={onCancel}
              style={styles.topRoundBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Top Right: Minimal Frosted Utility Cluster */}
            <View style={styles.topRightCluster}>
              {/* Rotate */}
              <TouchableOpacity
                onPress={handleRotate}
                style={styles.topRoundBtn}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="reload-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Undo */}
              <TouchableOpacity
                onPress={handleUndo}
                style={styles.topRoundBtn}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="arrow-undo-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Clear All */}
              <TouchableOpacity
                onPress={handleClear}
                style={styles.topRoundBtn}
                hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={19} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ========================================================= */}
          {/* SNAPCHAT-STYLE VERTICAL RIGHT TOOL DOCK                  */}
          {/* ========================================================= */}
          <View style={[styles.rightToolDock, { top: Math.max(insets.top + 56, 70) }]}>
            {/* 1. Text Tool ("T") */}
            <TouchableOpacity
              onPress={() => handleToolSelect('text')}
              style={[styles.dockBtn, activeTool === 'text' && { backgroundColor: selectedColor }]}
            >
              <Text style={[styles.dockTextIcon, activeTool === 'text' && { color: selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF' }]}>
                T
              </Text>
            </TouchableOpacity>

            {/* 2. Freehand Doodle / Pen */}
            <TouchableOpacity
              onPress={() => handleToolSelect('pen')}
              style={[styles.dockBtn, activeTool === 'pen' && { backgroundColor: selectedColor }]}
            >
              <Ionicons
                name="brush"
                size={18}
                color={activeTool === 'pen' ? (selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF') : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* 3. Arrow Pointer */}
            <TouchableOpacity
              onPress={() => handleToolSelect('arrow')}
              style={[styles.dockBtn, activeTool === 'arrow' && { backgroundColor: selectedColor }]}
            >
              <Ionicons
                name="arrow-down-outline"
                size={20}
                color={activeTool === 'arrow' ? (selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF') : '#FFFFFF'}
                style={{ transform: [{ rotate: '45deg' }] }}
              />
            </TouchableOpacity>

            {/* 4. Circle Callout */}
            <TouchableOpacity
              onPress={() => handleToolSelect('circle')}
              style={[styles.dockBtn, activeTool === 'circle' && { backgroundColor: selectedColor }]}
            >
              <Ionicons
                name="ellipse-outline"
                size={19}
                color={activeTool === 'circle' ? (selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF') : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* 5. Rectangle Callout */}
            <TouchableOpacity
              onPress={() => handleToolSelect('rect')}
              style={[styles.dockBtn, activeTool === 'rect' && { backgroundColor: selectedColor }]}
            >
              <Ionicons
                name="square-outline"
                size={18}
                color={activeTool === 'rect' ? (selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF') : '#FFFFFF'}
              />
            </TouchableOpacity>

            {/* 6. Measurement Line */}
            <TouchableOpacity
              onPress={() => handleToolSelect('measure')}
              style={[styles.dockBtn, activeTool === 'measure' && { backgroundColor: selectedColor }]}
            >
              <Ionicons
                name="resize-outline"
                size={19}
                color={activeTool === 'measure' ? (selectedColor === '#FFE600' || selectedColor === '#FFFFFF' ? '#000000' : '#FFFFFF') : '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>

          {/* ========================================================= */}
          {/* SNAPCHAT-STYLE VERTICAL COLOR PICKER STRIP               */}
          {/* ========================================================= */}
          {showColorPicker && (
            <View style={[styles.colorStrip, { top: Math.max(insets.top + 56, 70) }]}>
              {COLOR_PALETTE.map((color, idx) => {
                const isSelected = selectedColorIndex === idx;
                return (
                  <TouchableOpacity
                    key={color}
                    onPress={() => handleSelectColor(color, idx)}
                    style={[styles.colorDotWrapper, isSelected && styles.colorDotWrapperSelected]}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <View style={[styles.colorDot, { backgroundColor: color }, color === '#000000' && { borderWidth: 1, borderColor: '#FFFFFF' }]} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* ========================================================= */}
          {/* DRAGGABLE TEXT FONT-SIZE ADJUSTER BAR                     */}
          {/* Appears when a text note is selected or text tool active   */}
          {/* ========================================================= */}
          {(activeStickerId || activeTool === 'text') && (
            <View style={[styles.fontSizeBar, { bottom: Math.max(insets.bottom + 68, 80) }]}>
              <Text style={styles.fontSizeBarLabel}>Text Size</Text>
              
              <TouchableOpacity
                style={styles.fontSizeBtn}
                onPress={() => handleAdjustFontSize(-3)}
                activeOpacity={0.7}
              >
                <Text style={styles.fontSizeBtnText}>A⁻</Text>
              </TouchableOpacity>

              <View style={styles.fontPresetsRow}>
                {[16, 22, 28, 36].map((size) => {
                  const isCurrent = Math.abs(stickerFontSize - size) < 3;
                  return (
                    <TouchableOpacity
                      key={size}
                      onPress={() => handleSetPresetFontSize(size)}
                      style={[styles.presetDotBtn, isCurrent && styles.presetDotBtnActive]}
                    >
                      <Text style={[styles.presetDotText, isCurrent && styles.presetDotTextActive]}>
                        {size === 16 ? 'S' : size === 22 ? 'M' : size === 28 ? 'L' : 'XL'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                style={styles.fontSizeBtn}
                onPress={() => handleAdjustFontSize(3)}
                activeOpacity={0.7}
              >
                <Text style={styles.fontSizeBtnText}>A⁺</Text>
              </TouchableOpacity>

              <Text style={styles.fontSizeValue}>{stickerFontSize}px</Text>
            </View>
          )}

          {/* ========================================================= */}
          {/* SNAPCHAT-STYLE BOTTOM BAR                                */}
          {/* ========================================================= */}
          <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom + 12, 16) }]}>
            {/* Bottom Left: Add Text Sticker */}
            <TouchableOpacity
              style={styles.addTextPill}
              onPress={() => setShowTextInput(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={17} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addTextPillText}>+ Add Text</Text>
            </TouchableOpacity>

            {/* Bottom Center: Watermark Date */}
            <View style={styles.watermarkPill}>
              <Ionicons name="time-outline" size={12} color="#CBD5E1" style={{ marginRight: 4 }} />
              <Text style={styles.watermarkText}>{nowFormatted}</Text>
            </View>

            {/* Bottom Right: Big Vibrant Save Button */}
            <TouchableOpacity
              onPress={handleTriggerExport}
              style={styles.snapSaveBtn}
              disabled={saving || loadingImage}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" style={{ marginRight: 5 }} />
                  <Text style={styles.snapSaveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ========================================================= */}
        {/* TEXT NOTE ENTRY POPUP MODAL                               */}
        {/* ========================================================= */}
        {showTextInput && (
          <View style={styles.textModalOverlay}>
            <View style={styles.textModalCard}>
              <Text style={styles.textModalTitle}>Add Draggable Photo Note</Text>
              <Text style={styles.textModalSubtitle}>
                Type your note. Once added, you can drag it anywhere on the photo and adjust its size.
              </Text>
              
              <TextInput
                style={styles.textModalInput}
                placeholder="e.g. Asbestos pipe insulation, Mold damage..."
                placeholderTextColor="#94A3B8"
                value={textInput}
                onChangeText={setTextInput}
                autoFocus
                onSubmitEditing={handleAddTextSubmit}
              />

              <View style={styles.textModalActions}>
                <TouchableOpacity
                  style={styles.textModalCancelBtn}
                  onPress={() => setShowTextInput(false)}
                >
                  <Text style={styles.textModalCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.textModalSubmitBtn}
                  onPress={handleAddTextSubmit}
                >
                  <Text style={styles.textModalSubmitText}>Add Note</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  canvasWrapper: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFE600',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // Top Bar
  topBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 50,
  },
  topRoundBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  topRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Snapchat Right-Side Tool Dock
  rightToolDock: {
    position: 'absolute',
    right: 14,
    zIndex: 45,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 24,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    gap: 8,
  },
  dockBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockTextIcon: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  // Snapchat Vertical Color Strip
  colorStrip: {
    position: 'absolute',
    right: 66,
    zIndex: 45,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    gap: 8,
  },
  colorDotWrapper: {
    padding: 2,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotWrapperSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },

  // Font Size Adjuster Bar
  fontSizeBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 48,
    backgroundColor: 'rgba(15, 23, 42, 0.90)',
    borderRadius: 22,
    paddingVertical: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fontSizeBarLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  fontSizeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fontSizeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  fontPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  presetDotBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetDotBtnActive: {
    backgroundColor: '#38BDF8',
  },
  presetDotText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700',
  },
  presetDotTextActive: {
    color: '#000000',
    fontWeight: '900',
  },
  fontSizeValue: {
    color: '#38BDF8',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 32,
    textAlign: 'right',
  },

  // Snapchat Bottom Bar
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addTextPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  addTextPillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  watermarkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 14,
  },
  watermarkText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '600',
  },
  snapSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    height: 44,
    borderRadius: 22,
    shadowColor: '#2563EB',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 5,
  },
  snapSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  // Text Entry Modal
  textModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 90,
  },
  textModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  textModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  textModalSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 16,
    lineHeight: 16,
  },
  textModalInput: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 15,
    marginBottom: 18,
  },
  textModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  textModalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  textModalCancelText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '600',
  },
  textModalSubmitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  textModalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
