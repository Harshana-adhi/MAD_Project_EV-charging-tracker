import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, HelperText, Text } from 'react-native-paper';
import { WebView, type WebViewMessageEvent, type WebViewProps } from 'react-native-webview';
import { useAppTheme, spacing } from '@/lib/theme';

type Coordinates = { lat: number; lng: number };
type PinPickerProps = {
  value: Coordinates | null;
  address: string;
  onAddressChange: (address: string) => void;
  onChange: (coordinates: Coordinates, displayName?: string) => void;
};

type NominatimResult = { lat: string; lon: string; display_name: string };
type MapMessage = { type: 'ready' } | { type: 'pin'; lat: number; lng: number };

const RefForwardingWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebView> }
>;
const nominatimCache = new Map<string, NominatimResult>();
let nextNominatimRequestAt = 0;

function mapHtml(pinColor: string, pinOutline: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>html,body,#map{height:100%;margin:0;padding:0}.dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.95) contrast(.9)}</style>
</head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const map=L.map('map',{zoomControl:false}).setView([7.2906,80.6337],13);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
let pin=null;
function sendPin(lat,lng){window.ReactNativeWebView.postMessage(JSON.stringify({type:'pin',lat:lat,lng:lng}));}
function setPin(lat,lng,notify){
  const point=[lat,lng];
  if(!pin){
    const icon=L.divIcon({className:'',html:'<div style="width:24px;height:24px;border-radius:50%;background:${pinColor};border:3px solid ${pinOutline}"></div>',iconSize:[30,30],iconAnchor:[15,15]});
    pin=L.marker(point,{draggable:true,icon:icon}).addTo(map);
    pin.on('dragend',function(){const p=pin.getLatLng();sendPin(p.lat,p.lng);});
  }else{pin.setLatLng(point);}
  map.setView(point,Math.max(map.getZoom(),15));
  if(notify)sendPin(lat,lng);
}
map.on('click',function(event){setPin(event.latlng.lat,event.latlng.lng,true);});
window.setPin=function(lat,lng){if(lat!==null&&lng!==null)setPin(lat,lng,false);};
window.setDark=function(dark){document.body.classList.toggle('dark',!!dark);};
window.ReactNativeWebView.postMessage(JSON.stringify({type:'ready'}));
</script></body></html>`;
}

async function searchNominatim(query: string): Promise<NominatimResult> {
  const cacheKey = query.trim().toLowerCase();
  const cached = nominatimCache.get(cacheKey);
  if (cached) return cached;

  const requestAt = Math.max(Date.now(), nextNominatimRequestAt);
  nextNominatimRequestAt = requestAt + 1000;
  const waitForLimit = requestAt - Date.now();
  if (waitForLimit > 0) await new Promise((resolve) => setTimeout(resolve, waitForLimit));

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=lk&q=${encodeURIComponent(query.trim())}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'EVChargingPointTracker/1.0',
    },
  });
  if (!response.ok) throw new Error('LOCATION_SEARCH_FAILED');
  const results = (await response.json()) as NominatimResult[];
  const result = results[0];
  if (!result) throw new Error('LOCATION_NOT_FOUND');
  nominatimCache.set(cacheKey, result);
  return result;
}

export function PinPicker({ value, address, onAddressChange, onChange }: PinPickerProps) {
  const theme = useAppTheme();
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (!readyRef.current) return;
    const coordinates = value ? `${value.lat},${value.lng}` : 'null,null';
    webviewRef.current?.injectJavaScript(`window.setPin(${coordinates});window.setDark(${theme.dark});true;`);
  }, [value?.lat, value?.lng, theme.dark]);

  async function searchAddress() {
    const query = address.trim();
    if (!query) {
      setSearchError('Enter an address to search.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const result = await searchNominatim(query);
      const coordinates = { lat: Number(result.lat), lng: Number(result.lon) };
      if (!Number.isFinite(coordinates.lat) || !Number.isFinite(coordinates.lng)) {
        throw new Error('LOCATION_SEARCH_FAILED');
      }
      onAddressChange(result.display_name.slice(0, 200));
      onChange(coordinates, result.display_name);
    } catch (error) {
      setSearchError(
        error instanceof Error && error.message === 'LOCATION_NOT_FOUND'
          ? 'No Sri Lanka address matched. Try a nearby road or town.'
          : 'Location search failed. Check your connection and try again.',
      );
    } finally {
      setSearching(false);
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as MapMessage;
      if (message.type === 'ready') {
        readyRef.current = true;
        const coordinates = value ? `${value.lat},${value.lng}` : 'null,null';
        webviewRef.current?.injectJavaScript(`window.setPin(${coordinates});window.setDark(${theme.dark});true;`);
      } else if (message.type === 'pin') {
        onChange({ lat: message.lat, lng: message.lng });
      }
    } catch {
      setSearchError('The map could not read the selected location.');
    }
  }

  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Station location</Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Search when needed, or tap or drag the marker to set the pin.
      </Text>
      <View style={styles.searchRow}>
        <Button
          mode="contained-tonal"
          icon="magnify"
          onPress={searchAddress}
          loading={searching}
          disabled={searching || !address.trim()}
          style={styles.searchButton}
        >
          Search address
        </Button>
      </View>
      {searchError ? <HelperText type="error">{searchError}</HelperText> : null}
      <View style={[styles.mapFrame, { borderColor: theme.colors.outlineVariant }]}>
        <RefForwardingWebView
          ref={webviewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml(theme.colors.primary, theme.colors.surface) }}
          onMessage={handleMapMessage}
          javaScriptEnabled
          domStorageEnabled
        />
      </View>
      {value ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Pin: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  searchRow: { flexDirection: 'row' },
  searchButton: { minHeight: 48 },
  mapFrame: { height: 280, overflow: 'hidden', borderWidth: 1, borderRadius: 12 },
  map: { flex: 1 },
});
