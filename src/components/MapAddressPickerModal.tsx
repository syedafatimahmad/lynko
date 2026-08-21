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

export default function MapAddressPickerModal({
  visible,
  initialAddress = '',
  onConfirm,
  onCancel,
}: MapAddressPickerModalProps) {
  const webViewRef = useRef<WebView>(null);
  const [searchQuery, setSearchQuery] = useState(initialAddress);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || '539 W Commerce St, Dallas, TX');
  const [selectedZip, setSelectedZip] = useState('75208');
  const [lat, setLat] = useState(32.7767);
  const [lng, setLng] = useState(-96.7970);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (visible && initialAddress) {
      handleSearchAddress(initialAddress);
    }
  }, [visible, initialAddress]);

  if (!visible) return null;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body, html, #map { width: 100%; height: 100%; }
        .center-pin {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -100%);
          z-index: 1000;
          pointer-events: none;
        }
        .pin-marker {
          width: 36px;
          height: 36px;
          background: #0D9488;
          border: 3px solid #FFFFFF;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }
        .pin-marker::after {
          content: '';
          width: 12px;
          height: 12px;
          margin: 9px 0 0 9px;
          background: #FFFFFF;
          position: absolute;
          border-radius: 50%;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div class="center-pin">
        <div class="pin-marker"></div>
      </div>

      <script>
        const map = L.map('map', { zoomControl: false }).setView([${lat}, ${lng}], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: 'OpenStreetMap'
        }).addTo(map);

        map.on('moveend', function() {
          const center = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'MAP_MOVED',
            lat: center.lat,
            lng: center.lng
          }));
        });

        function setMapCenter(newLat, newLng) {
          map.setView([newLat, newLng], 16);
        }

        document.addEventListener('message', function(e) {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'SET_CENTER') {
              setMapCenter(data.lat, data.lng);
            }
          } catch(err){}
        });
      </script>
    </body>
    </html>
  `;

  const handleGetCurrentLocation = async () => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required to detect site position.');
        setLoadingLocation(false);
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
      console.error('Error fetching current location:', e);
      Alert.alert('Notice', 'Could not detect current GPS coordinates.');
    } finally {
      setLoadingLocation(false);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocoded && geocoded.length > 0) {
        const item = geocoded[0];
        const street = item.street || item.name || '';
        const city = item.city || item.subregion || '';
        const region = item.region || '';
        const zip = item.postalCode || '75208';
        const formatted = `${street}${street ? ', ' : ''}${city}${city ? ', ' : ''}${region}`.trim();

        if (formatted) {
          setSelectedAddress(formatted);
          setSearchQuery(formatted);
        }
        if (zip) {
          setSelectedZip(zip);
        }
      }
    } catch (e) {
      // Fallback
    }
  };

  const handleSearchAddress = async (queryText?: string) => {
    const q = queryText || searchQuery;
    if (!q.trim()) return;

    setSearching(true);
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
    onConfirm(selectedAddress || searchQuery || 'Site Address', selectedZip || '75208');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Site Address</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Search Bar Input */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={18} color={colors.outline} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search site address or street..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={() => handleSearchAddress()}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primaryContainer} />
            ) : (
              searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.outline} />
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Interactive Map WebView */}
        <View style={styles.mapContainer}>
          <WebView
            ref={webViewRef}
            source={{ html: mapHtml }}
            style={styles.webView}
            onMessage={handleWebViewMessage}
            javaScriptEnabled={true}
          />

          {/* Current GPS Location Floating Button */}
          <TouchableOpacity
            style={styles.gpsButton}
            onPress={handleGetCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator color={colors.primaryContainer} size="small" />
            ) : (
              <Ionicons name="locate" size={24} color={colors.primaryContainer} />
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Location Address Confirmation Card */}
        <View style={styles.bottomCard}>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={24} color={colors.primaryContainer} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressTitle}>SELECTED SITE ADDRESS</Text>
              <Text style={styles.addressText} numberOfLines={2}>
                {selectedAddress || 'Drop pin on site location'}
              </Text>
              <Text style={styles.zipText}>Zip Code: {selectedZip || '75208'}</Text>
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
  searchContainer: {
    padding: 12,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.onSurface },
  mapContainer: { flex: 1, position: 'relative' },
  webView: { flex: 1 },
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
    shadowOpacity: 0.2,
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
