import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';

interface MapAddressPickerModalProps {
  visible: boolean;
  initialAddress?: string;
  onConfirm: (address: string, zipCode: string) => void;
  onCancel: () => void;
}

interface AutocompletePrediction {
  place_id: string | number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapAddressPickerModal({
  visible,
  initialAddress = '',
  onConfirm,
  onCancel,
}: MapAddressPickerModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || 'San Diego, CA');
  const [selectedZip, setSelectedZip] = useState('92101');
  const [lat, setLat] = useState(32.7157);
  const [lng, setLng] = useState(-117.1611);
  const [mapType, setMapType] = useState<'streets' | 'satellite'>('streets');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible) {
      if (initialAddress) {
        handleSearchAddress(initialAddress);
      } else {
        handleGetCurrentLocation(true);
      }
    }
  }, [visible]);

  if (!visible) return null;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; }
        body, html, #map { width: 100%; height: 100%; background: #E2E8F0; }
        .center-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -100%);
          z-index: 1000;
          pointer-events: none;
        }
        /* Classic Google Maps Red Pin */
        .pin-marker {
          width: 42px;
          height: 42px;
          background: #EA4335;
          border: 3.5px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 6px 14px rgba(0,0,0,0.4);
        }
        .pin-marker::after {
          content: '';
          width: 14px;
          height: 14px;
          margin: 10px 0 0 10px;
          background: #FFFFFF;
          position: absolute;
          border-radius: 50%;
        }
        .pin-shadow {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, 0);
          width: 18px;
          height: 7px;
          background: rgba(0,0,0,0.3);
          border-radius: 50%;
          z-index: 999;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="pin-shadow"></div>
      <div class="center-pin">
        <div class="pin-marker"></div>
      </div>

      <script>
        const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 17);

        const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
          maxZoom: 20,
          subdomains: 'abcd',
          attribution: 'Google Maps Style'
        }).addTo(map);

        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Esri Satellite'
        });

        let currentLayer = streetLayer;

        map.on('moveend', function() {
          const center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_MOVED',
            lat: center.lat,
            lng: center.lng
          }));
        });

        map.on('click', function(e) {
          map.panTo(e.latlng);
        });

        function setMapCenter(newLat, newLng) {
          map.setView([newLat, newLng], 17);
        }

        function zoomIn() { map.zoomIn(); }
        function zoomOut() { map.zoomOut(); }

        function toggleMapType(type) {
          map.removeLayer(currentLayer);
          if (type === 'satellite') {
            currentLayer = satelliteLayer;
          } else {
            currentLayer = streetLayer;
          }
          currentLayer.addTo(map);
        }

        document.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'SET_CENTER') setMapCenter(data.lat, data.lng);
            if (data.type === 'ZOOM_IN') zoomIn();
            if (data.type === 'ZOOM_OUT') zoomOut();
            if (data.type === 'TOGGLE_TYPE') toggleMapType(data.mapType);
          } catch(err){}
        });
      </script>
    </body>
    </html>
  `;

  const handleGetCurrentLocation = async (silent = false) => {
    if (!silent) setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) Alert.alert('Permission Required', 'Location access is required to detect site position.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const newLat = loc.coords.latitude;
      const newLng = loc.coords.longitude;

      setLat(newLat);
      setLng(newLng);

      webViewRef.current?.postMessage(
        JSON.stringify({ type: 'SET_CENTER', lat: newLat, lng: newLng })
      );

      await reverseGeocode(newLat, newLng);
    } catch (e) {
      console.error('Error fetching location:', e);
    } finally {
      if (!silent) setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const item = geocoded[0];
        const streetNum = item.streetNumber || '';
        const street = item.street || item.name || '';
        const fullStreet = `${streetNum} ${street}`.trim();
        const city = item.city || item.subregion || '';
        const region = item.region || '';
        const zip = item.postalCode || '92101';
        const formatted = `${fullStreet}${fullStreet ? ', ' : ''}${city}${city ? ', ' : ''}${region}`.trim();

        if (formatted) {
          setSelectedAddress(formatted);
          setSearchQuery(formatted);
        }
        if (zip) {
          setSelectedZip(zip);
        }
      }
    } catch (e) {}
  };

  // Live Autocomplete Suggestions as user types (like Google Maps)
  const handleQueryChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length > 2) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`,
          { headers: { 'User-Agent': 'LynkoApp/1.0' } }
        );
        const data = await res.json();
        if (data && Array.isArray(data)) {
          setPredictions(data);
          setShowPredictions(true);
        }
      } catch (e) {
        setPredictions([]);
      }
    } else {
      setPredictions([]);
      setShowPredictions(false);
    }
  };

  const handleSelectPrediction = async (item: AutocompletePrediction) => {
    setShowPredictions(false);
    setSearchQuery(item.display_name);
    const newLat = parseFloat(item.lat);
    const newLng = parseFloat(item.lon);
    setLat(newLat);
    setLng(newLng);

    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'SET_CENTER', lat: newLat, lng: newLng })
    );

    await reverseGeocode(newLat, newLng);
  };

  const handleSearchAddress = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q.trim()) return;

    setSearching(true);
    setShowPredictions(false);
    try {
      const geocoded = await Location.geocodeAsync(q);
      if (geocoded && geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        setLat(latitude);
        setLng(longitude);
        webViewRef.current?.postMessage(
          JSON.stringify({ type: 'SET_CENTER', lat: latitude, lng: longitude })
        );
        await reverseGeocode(latitude, longitude);
      } else {
        Alert.alert('Location Search', 'Address not found on map.');
      }
    } catch (e) {
      console.error('Search geocode error:', e);
    } finally {
      setSearching(false);
    }
  };

  const handleZoom = (type: 'in' | 'out') => {
    webViewRef.current?.postMessage(
      JSON.stringify({ type: type === 'in' ? 'ZOOM_IN' : 'ZOOM_OUT' })
    );
  };

  const handleToggleMapType = () => {
    const nextType = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(nextType);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'TOGGLE_TYPE', mapType: nextType })
    );
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_MOVED') {
        setLat(data.lat);
        setLng(data.lng);
        reverseGeocode(data.lat, data.lng);
      }
    } catch (e) {}
  };

  const handleConfirmLocation = () => {
    onConfirm(selectedAddress || searchQuery || 'Site Address', selectedZip || '92101');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Google Maps Style Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Site Address</Text>
          <TouchableOpacity onPress={handleToggleMapType} style={styles.mapTypeBadge}>
            <Ionicons name={mapType === 'streets' ? "layers-outline" : "map-outline"} size={16} color={colors.primaryContainer} style={{ marginRight: 4 }} />
            <Text style={styles.mapTypeBadgeText}>{mapType === 'streets' ? 'Satellite' : 'Map'}</Text>
          </TouchableOpacity>
        </View>

        {/* Floating Google Maps Style Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color="#EA4335" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search street, building or city..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={() => handleSearchAddress()}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primaryContainer} />
            ) : (
              searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); setShowPredictions(false); }}>
                  <Ionicons name="close-circle" size={18} color={colors.outline} />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Autocomplete Predictions Dropdown List */}
          {showPredictions && predictions.length > 0 && (
            <View style={styles.predictionsDropdown}>
              <FlatList
                data={predictions}
                keyExtractor={(item, index) => `${item.place_id}_${index}`}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionRow}
                    onPress={() => handleSelectPrediction(item)}
                  >
                    <Ionicons name="location-sharp" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                    <Text style={styles.predictionText} numberOfLines={2}>{item.display_name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Interactive Map WebView */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={true}
            originWhitelist={['*']}
          />

          {/* Google Maps Controls: Zoom In / Zoom Out / My GPS Location */}
          <View style={styles.floatingControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom('in')}>
              <Ionicons name="add" size={22} color={colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.controlDivider} />
            <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom('out')}>
              <Ionicons name="remove" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.gpsButton}
            onPress={() => handleGetCurrentLocation(false)}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator color="#4285F4" size="small" />
            ) : (
              <Ionicons name="locate" size={24} color="#4285F4" />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Location Address Confirmation Card */}
        <View style={styles.bottomCard}>
          <View style={styles.addressRow}>
            <View style={styles.redPinIconWrapper}>
              <Ionicons name="location" size={22} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.addressTitle}>SELECTED SITE ADDRESS</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress || 'Drop pin on site location'}
              </Text>
              <Text style={styles.zipText}>Zip Code: {selectedZip || '92101'}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmLocation}>
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.confirmBtnText}>Confirm Site Address</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 56,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: colors.onSurface },
  mapTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E6F8F7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#b2ebe5',
  },
  mapTypeBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primaryContainer },
  searchContainer: {
    padding: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    zIndex: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface, fontWeight: '500' },
  predictionsDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 6,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  predictionText: { fontSize: 13, color: colors.onSurface, flex: 1, fontWeight: '500' },
  mapContainer: { flex: 1, position: 'relative' },
  webView: { flex: 1 },
  floatingControls: {
    position: 'absolute',
    right: 16,
    bottom: 80,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  controlBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  controlDivider: { height: 1, backgroundColor: '#E2E8F0' },
  gpsButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  bottomCard: {
    backgroundColor: colors.surfaceContainerLowest,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  redPinIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EA4335',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EA4335',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addressTitle: { fontSize: 11, fontWeight: 'bold', color: colors.secondary, marginBottom: 2, letterSpacing: 0.5 },
  addressText: { fontSize: 15, fontWeight: '700', color: colors.onSurface },
  zipText: { fontSize: 13, color: colors.secondary, marginTop: 2, fontWeight: '500' },
  confirmBtn: {
    backgroundColor: colors.primaryContainer,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});
