import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  Keyboard,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';

const LOCATIONIQ_KEY =
  process.env.EXPO_PUBLIC_LOCATIONIQ_API_KEY || 'pk.61099061999fa4b0e64731ec170c6db6';

interface MapAddressPickerModalProps {
  visible: boolean;
  initialAddress?: string;
  onConfirm: (address: string, zipCode: string) => void;
  onCancel: () => void;
}

interface AutocompletePrediction {
  id: string;
  title: string;
  subtitle: string;
  lat: number;
  lng: number;
  postalCode?: string;
  fullAddress?: string;
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
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const searchTimerRef = useRef<any>(null);
  const reverseGeocodeTimerRef = useRef<any>(null);

  // Initialize: resolve initial address or get current GPS location
  useEffect(() => {
    if (visible) {
      if (initialAddress && initialAddress.trim().length > 3) {
        geocodeAddressQuery(initialAddress.trim(), true);
      } else {
        handleGetCurrentLocation(true);
      }
    }
  }, [visible]);

  // Reverse Geocoding via LocationIQ with fallback to expo-location
  const reverseGeocodeCoords = useCallback(async (targetLat: number, targetLng: number) => {
    setResolvingAddress(true);
    try {
      let resolved = false;

      // 1. Try LocationIQ Reverse Geocoding
      if (LOCATIONIQ_KEY && !LOCATIONIQ_KEY.includes('YOUR_')) {
        try {
          const url = `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${targetLat}&lon=${targetLng}&format=json&addressdetails=1`;
          const res = await fetch(url);
          const data = await res.json();

          if (data && data.address) {
            const addr = data.address;
            const streetNumber = addr.house_number || '';
            const streetName = addr.road || addr.street || '';
            const street = [streetNumber, streetName].filter(Boolean).join(' ');
            const city = addr.city || addr.town || addr.village || addr.suburb || addr.county || '';
            const state = addr.state || '';
            const zip = addr.postcode ? addr.postcode.split('-')[0] : '';

            const cleanAddress = [street, city, state].filter(Boolean).join(', ') || data.display_name;
            setSelectedAddress(cleanAddress);
            if (zip) setSelectedZip(zip);
            resolved = true;
          }
        } catch (apiErr) {
          console.warn('LocationIQ reverse geocode deferred to fallback:', apiErr);
        }
      }

      // 2. Resilient Fallback to Device OS Geocoding
      if (!resolved) {
        const results = await Location.reverseGeocodeAsync({
          latitude: targetLat,
          longitude: targetLng,
        });

        if (results && results.length > 0) {
          const g = results[0];
          const street = [g.streetNumber, g.street].filter(Boolean).join(' ');
          const cityState = [g.city || g.subregion, g.region].filter(Boolean).join(', ');
          const fullAddr = [street, cityState].filter(Boolean).join(', ') || g.name || 'Selected Location';
          setSelectedAddress(fullAddr);
          if (g.postalCode) {
            setSelectedZip(g.postalCode.split('-')[0]);
          }
        }
      }
    } catch (e) {
      console.warn('Reverse geocoding notice:', e);
    } finally {
      setResolvingAddress(false);
    }
  }, []);

  // When map completes movement
  const handleMapMoveEnd = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);

    if (reverseGeocodeTimerRef.current) clearTimeout(reverseGeocodeTimerRef.current);
    reverseGeocodeTimerRef.current = setTimeout(() => {
      reverseGeocodeCoords(newLat, newLng);
    }, 450);
  };

  // Search input change with live autocomplete
  const handleQueryChange = (text: string) => {
    setSearchQuery(text);

    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!text || text.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      const q = text.trim();
      let preds: AutocompletePrediction[] = [];

      // 1. Try LocationIQ Autocomplete API
      if (LOCATIONIQ_KEY && !LOCATIONIQ_KEY.includes('YOUR_')) {
        try {
          const url = `https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_KEY}&q=${encodeURIComponent(
            q
          )}&limit=6&normalizecity=1`;
          const res = await fetch(url);
          const data = await res.json();

          if (Array.isArray(data)) {
            preds = data.map((item: any) => {
              const mainTitle =
                item.display_place || item.address?.name || item.display_name.split(',')[0];
              const secondary =
                item.display_address ||
                item.display_name.split(',').slice(1).join(',').trim();

              return {
                id: String(item.place_id || Math.random()),
                title: mainTitle,
                subtitle: secondary,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                postalCode: item.address?.postcode ? item.address.postcode.split('-')[0] : '',
                fullAddress: item.display_name,
              };
            });
          }
        } catch (apiErr) {
          console.warn('LocationIQ autocomplete query deferred:', apiErr);
        }
      }

      // 2. Fallback to Device-Native Geocoding
      if (preds.length === 0) {
        try {
          const locs = await Location.geocodeAsync(q);
          if (locs && locs.length > 0) {
            preds = locs.slice(0, 5).map((l, idx) => ({
              id: `device_${idx}`,
              title: q,
              subtitle: `Lat: ${l.latitude.toFixed(4)}, Lng: ${l.longitude.toFixed(4)}`,
              lat: l.latitude,
              lng: l.longitude,
            }));
          }
        } catch (e) {
          // Ignore
        }
      }

      setPredictions(preds);
      setShowPredictions(preds.length > 0);
      setSearching(false);
    }, 350);
  };

  // Prediction selection
  const handleSelectPrediction = (item: AutocompletePrediction) => {
    Keyboard.dismiss();
    setShowPredictions(false);
    setSearchQuery(item.title);

    setLat(item.lat);
    setLng(item.lng);
    setSelectedAddress(item.fullAddress || `${item.title}, ${item.subtitle}`);
    if (item.postalCode) setSelectedZip(item.postalCode);

    // Pan WebView map to selected coordinates
    if (webViewRef.current) {
      const js = `
        if (window.map) {
          window.map.flyTo([${item.lat}, ${item.lng}], 17, { animate: true, duration: 0.8 });
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }

    // Trigger reverse geocoding to ensure complete address & zip
    reverseGeocodeCoords(item.lat, item.lng);
  };

  // Explicit Search submit
  const geocodeAddressQuery = async (queryText: string, initial = false) => {
    Keyboard.dismiss();
    setShowPredictions(false);
    setSearching(true);
    try {
      const locs = await Location.geocodeAsync(queryText);
      if (locs && locs.length > 0) {
        const { latitude, longitude } = locs[0];
        setLat(latitude);
        setLng(longitude);

        if (webViewRef.current) {
          const js = `
            if (window.map) {
              window.map.flyTo([${latitude}, ${longitude}], 17, { animate: true, duration: 0.8 });
            }
            true;
          `;
          webViewRef.current.injectJavaScript(js);
        }

        reverseGeocodeCoords(latitude, longitude);
      } else if (!initial) {
        Alert.alert('Address Not Found', 'Could not locate address. Please check spelling or refine search.');
      }
    } catch (e) {
      if (!initial) {
        Alert.alert('Search Error', 'Unable to resolve address. Please check your network connection.');
      }
    } finally {
      setSearching(false);
    }
  };

  // Current GPS location
  const handleGetCurrentLocation = async (silent = false) => {
    setLoadingLocation(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!silent) {
          Alert.alert('Permission Denied', 'Location permission is required to detect your site.');
        }
        setLoadingLocation(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const curLat = loc.coords.latitude;
      const curLng = loc.coords.longitude;
      setLat(curLat);
      setLng(curLng);

      if (webViewRef.current) {
        const js = `
          if (window.map) {
            window.map.flyTo([${curLat}, ${curLng}], 17, { animate: true, duration: 0.8 });
          }
          true;
        `;
        webViewRef.current.injectJavaScript(js);
      }

      reverseGeocodeCoords(curLat, curLng);
    } catch (e) {
      if (!silent) {
        Alert.alert('GPS Error', 'Could not acquire current GPS location.');
      }
    } finally {
      setLoadingLocation(false);
    }
  };

  // Zoom controls
  const handleZoom = (direction: 'in' | 'out') => {
    if (webViewRef.current) {
      const js = `
        if (window.map) {
          window.map.${direction === 'in' ? 'zoomIn()' : 'zoomOut()'};
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  };

  // Toggle Map Style
  const handleToggleMapType = () => {
    const nextType = mapType === 'streets' ? 'satellite' : 'streets';
    setMapType(nextType);
    if (webViewRef.current) {
      const js = `
        if (window.setMapLayer) {
          window.setMapLayer('${nextType}');
        }
        true;
      `;
      webViewRef.current.injectJavaScript(js);
    }
  };

  // Messages from WebView
  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'moveEnd') {
        handleMapMoveEnd(data.lat, data.lng);
      }
    } catch (e) {
      // Ignore
    }
  };

  const handleConfirmLocation = () => {
    onConfirm(selectedAddress, selectedZip);
  };

  if (!visible) return null;

  // High-performance Leaflet map HTML with zero black-screen risk
  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; touch-action: none; }
        body, html, #map { width: 100%; height: 100%; background: #F1F5F9; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = L.map('map', { 
          zoomControl: false,
          attributionControl: false 
        }).setView([${lat}, ${lng}], 16);
        window.map = map;

        // Street Layer: High-detail LocationIQ Streets (No Watermark)
        const streetLayer = L.tileLayer('https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}', {
          maxZoom: 19
        });

        // Satellite Layer: High-resolution Esri World Imagery (No Watermark)
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        });

        // Street Labels overlay for satellite: Esri Boundaries and Places
        const labelLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19
        });

        streetLayer.addTo(map);
        let currentType = 'streets';

        window.setMapLayer = function(type) {
          if (type === 'satellite') {
            map.removeLayer(streetLayer);
            satelliteLayer.addTo(map);
            labelLayer.addTo(map);
          } else {
            map.removeLayer(satelliteLayer);
            map.removeLayer(labelLayer);
            streetLayer.addTo(map);
          }
          currentType = type;
        };

        map.on('moveend', function() {
          const c = map.getCenter();
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'moveEnd',
            lat: c.lat,
            lng: c.lng
          }));
        });
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>LocationIQ Site Picker</Text>
          <TouchableOpacity
            style={styles.mapTypeBadge}
            onPress={handleToggleMapType}
            activeOpacity={0.8}
          >
            <Ionicons
              name={mapType === 'streets' ? 'earth-outline' : 'map-outline'}
              size={15}
              color={colors.primaryContainer}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.mapTypeBadgeText}>
              {mapType === 'streets' ? 'Satellite' : 'Street View'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Ionicons name="search" size={19} color={colors.primaryContainer} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search street, building, or city..."
              placeholderTextColor={colors.outline}
              value={searchQuery}
              onChangeText={handleQueryChange}
              onSubmitEditing={() => geocodeAddressQuery(searchQuery)}
              returnKeyType="search"
            />
            {searching ? (
              <ActivityIndicator size="small" color={colors.primaryContainer} />
            ) : (
              searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setPredictions([]);
                    setShowPredictions(false);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color={colors.outline} />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Autocomplete Predictions Dropdown */}
          {showPredictions && predictions.length > 0 && (
            <View style={styles.predictionsDropdown}>
              <FlatList
                data={predictions}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.predictionRow}
                    onPress={() => handleSelectPrediction(item)}
                  >
                    <Ionicons name="location-sharp" size={18} color="#EA4335" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.predictionTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text style={styles.predictionSubtitle} numberOfLines={1}>
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}
        </View>

        {/* Interactive Map Area */}
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

          {/* Center Red Google-Style Pin */}
          <View pointerEvents="none" style={styles.centerPinWrapper}>
            <View style={styles.pinMarker} />
            <View style={styles.pinShadow} />
          </View>

          {/* Resolving indicator chip */}
          {resolvingAddress && (
            <View style={styles.resolvingBadge}>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.resolvingBadgeText}>Resolving Address...</Text>
            </View>
          )}

          {/* Floating Zoom Controls */}
          <View style={styles.floatingControls}>
            <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom('in')}>
              <Ionicons name="add" size={22} color={colors.onSurface} />
            </TouchableOpacity>
            <View style={styles.controlDivider} />
            <TouchableOpacity style={styles.controlBtn} onPress={() => handleZoom('out')}>
              <Ionicons name="remove" size={22} color={colors.onSurface} />
            </TouchableOpacity>
          </View>

          {/* Floating GPS Locate Button */}
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

          {/* Lynko App Logo Watermark */}
          <View pointerEvents="none" style={styles.mapWatermark}>
            <Image
              source={require('../../assets/lynko-logo.jpg')}
              style={styles.watermarkLogo}
              resizeMode="contain"
            />
          </View>
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
                {selectedAddress || 'Pan map to drop pin on site'}
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
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface },
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
    maxHeight: 200,
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
  predictionTitle: { fontSize: 13, color: colors.onSurface, fontWeight: '600' },
  predictionSubtitle: { fontSize: 12, color: colors.secondary, marginTop: 1 },
  mapContainer: { flex: 1, position: 'relative' },
  webView: { flex: 1 },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -19,
    marginTop: -38,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  pinMarker: {
    width: 38,
    height: 38,
    backgroundColor: '#EA4335',
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
    borderRadius: 19,
    borderBottomRightRadius: 0,
    transform: [{ rotate: '-45deg' }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  pinShadow: {
    width: 14,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 7,
    marginTop: 4,
    transform: [{ scaleX: 1.5 }],
  },
  resolvingBadge: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  resolvingBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
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
  mapWatermark: {
    position: 'absolute',
    bottom: 16,
    left: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  watermarkLogo: {
    width: 64,
    height: 20,
  },
});
