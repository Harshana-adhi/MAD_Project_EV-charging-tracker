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
type MapMessage =
  | { type: 'ready' }
  | { type: 'pin'; lat: number; lng: number }
  | { type: 'error'; message: string }
  | { type: 'tiles-error' }
  | { type: 'tiles-ready' };

const RefForwardingWebView = WebView as unknown as ComponentType<
  WebViewProps & { ref?: Ref<WebView> }
>;
const nominatimCache = new Map<string, NominatimResult>();
let nextNominatimRequestAt = 0;

function mapHtml(pinColor: string, pinOutline: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>html,body,#map{height:100%;margin:0;padding:0}.dark .leaflet-tile-pane{filter:invert(1) hue-rotate(180deg) brightness(.95) contrast(.9)}</style>
</head><body><div id="map"></div>
<script>
(function(){
  var map=null;
  var pin=null;
  var tilesFailed=false;
  var cssUrls=[
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'
  ];
  var scriptUrls=[
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'
  ];
  function send(message){
    if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }
  function fail(error){
    var detail=error&&error.message?error.message:String(error||'Unknown map error');
    send({type:'error',message:detail});
  }
  function loadResource(tagName,urls,index){
    return new Promise(function(resolve,reject){
      var resource=document.createElement(tagName);
      if(tagName==='link'){
        resource.rel='stylesheet';
        resource.href=urls[index];
      }else{
        resource.src=urls[index];
      }
      resource.onload=function(){resolve();};
      resource.onerror=function(){
        resource.remove();
        if(index+1<urls.length){
          loadResource(tagName,urls,index+1).then(resolve,reject);
        }else{
          reject(new Error('Unable to load Leaflet '+(tagName==='link'?'styles':'JavaScript')+' from either CDN.'));
        }
      };
      document.head.appendChild(resource);
    });
  }
  function sendPin(lat,lng){send({type:'pin',lat:lat,lng:lng});}
  function setPin(lat,lng,notify){
    if(!map)return;
    var point=[lat,lng];
    if(!pin){
      var icon=L.divIcon({className:'',html:'<div style="width:24px;height:24px;border-radius:50%;background:${pinColor};border:3px solid ${pinOutline}"></div>',iconSize:[30,30],iconAnchor:[15,15]});
      pin=L.marker(point,{draggable:true,icon:icon}).addTo(map);
      pin.on('dragend',function(){var p=pin.getLatLng();sendPin(p.lat,p.lng);});
    }else{pin.setLatLng(point);}
    map.setView(point,Math.max(map.getZoom(),15));
    if(notify)sendPin(lat,lng);
  }
  function initializeMap(){
    try{
      if(!window.L)throw new Error('Leaflet loaded without its map library.');
      map=L.map('map',{zoomControl:false}).setView([7.2906,80.6337],13);
      var tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap contributors'});
      tileLayer.on('tileerror',function(){
        if(!tilesFailed){tilesFailed=true;send({type:'tiles-error'});}
      });
      tileLayer.on('load',function(){
        if(tilesFailed){tilesFailed=false;send({type:'tiles-ready'});}
      });
      tileLayer.addTo(map);
      map.on('click',function(event){setPin(event.latlng.lat,event.latlng.lng,true);});
      window.setPin=function(lat,lng){if(lat!==null&&lng!==null)setPin(lat,lng,false);};
      window.setDark=function(dark){document.body.classList.toggle('dark',!!dark);};
      send({type:'ready'});
    }catch(error){fail(error);}
  }
  window.onerror=function(message){fail(new Error(String(message||'Map JavaScript error')));};
  window.addEventListener('unhandledrejection',function(event){fail(event.reason);});
  loadResource('link',cssUrls,0)
    .then(function(){return loadResource('script',scriptUrls,0);})
    .then(initializeMap)
    .catch(fail);
})();
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
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [mapError, setMapError] = useState<string | null>(null);
  const [tileError, setTileError] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);

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
        setMapStatus('ready');
        setMapError(null);
        const coordinates = value ? `${value.lat},${value.lng}` : 'null,null';
        webviewRef.current?.injectJavaScript(`window.setPin(${coordinates});window.setDark(${theme.dark});true;`);
      } else if (message.type === 'pin') {
        if (!Number.isFinite(message.lat) || !Number.isFinite(message.lng)) {
          setMapError('The map returned invalid coordinates. Retry the map and select a pin again.');
          setMapStatus('error');
          return;
        }
        onChange({ lat: message.lat, lng: message.lng });
      } else if (message.type === 'error') {
        readyRef.current = false;
        setMapError(`The map could not start: ${message.message}`);
        setMapStatus('error');
      } else if (message.type === 'tiles-error') {
        setTileError(true);
      } else if (message.type === 'tiles-ready') {
        setTileError(false);
      }
    } catch {
      readyRef.current = false;
      setMapError('The map sent an invalid response. Retry the map and select a pin again.');
      setMapStatus('error');
    }
  }

  function retryMap() {
    readyRef.current = false;
    setMapError(null);
    setTileError(false);
    setMapStatus('loading');
    setMapAttempt((attempt) => attempt + 1);
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
          key={mapAttempt}
          ref={webviewRef}
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: mapHtml(theme.colors.primary, theme.colors.surface) }}
          onMessage={handleMapMessage}
          javaScriptEnabled
          domStorageEnabled
          nestedScrollEnabled
          onLoadStart={() => {
            readyRef.current = false;
            setMapStatus('loading');
          }}
          onError={(event) => {
            readyRef.current = false;
            setMapError(`Map WebView failed to load: ${event.nativeEvent.description}`);
            setMapStatus('error');
          }}
          onHttpError={(event) => {
            if (!readyRef.current) {
              setMapError(`Map resource request failed (HTTP ${event.nativeEvent.statusCode}). Check your connection and retry.`);
              setMapStatus('error');
            }
          }}
          onRenderProcessGone={() => {
            readyRef.current = false;
            setMapError('Android WebView stopped unexpectedly. Retry the map.');
            setMapStatus('error');
          }}
          onContentProcessDidTerminate={() => {
            readyRef.current = false;
            setMapError('The map WebView stopped unexpectedly. Retry the map.');
            setMapStatus('error');
          }}
        />
        {mapStatus !== 'ready' ? (
          <View style={[styles.mapOverlay, { backgroundColor: theme.colors.surface }]}>
            {mapStatus === 'loading' ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                Loading map…
              </Text>
            ) : (
              <View style={styles.mapErrorContent}>
                <HelperText type="error" visible>{mapError ?? 'The map could not start.'}</HelperText>
                <Button mode="contained-tonal" onPress={retryMap}>
                  Retry map
                </Button>
              </View>
            )}
          </View>
        ) : null}
      </View>
      {tileError ? (
        <HelperText type="error" visible>
          Map tiles could not load. Check your connection; you can still select or move the pin.
        </HelperText>
      ) : null}
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
  mapOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  mapErrorContent: { alignItems: 'center', gap: spacing.sm },
});
