import { forwardRef, useEffect, useImperativeHandle, useRef, type ForwardRefExoticComponent, type RefAttributes } from 'react';
import { StyleSheet } from 'react-native';
import { WebView, type WebViewProps, type WebViewMessageEvent } from 'react-native-webview';
import type { StationSummary } from '@/types/domain';

// react-native-webview types WebView as a plain function component, but it forwards a ref at runtime.
const RefForwardingWebView = WebView as unknown as ForwardRefExoticComponent<
  WebViewProps & RefAttributes<WebView>
>;

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .dark-tiles .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.95) contrast(0.9); }
    .attribution { position: absolute; bottom: 2px; right: 4px; font-size: 10px; background: rgba(255,255,255,0.7); padding: 1px 4px; z-index: 1000; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([7.2906, 80.6337], 13);
    const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    let markers = [];
    let meMarker = null;

    function markerHtml(fill, textColor, label) {
      return '<div style="width:30px;height:30px;border-radius:50%;background:' + fill +
        ';box-shadow:0 0 0 3px #fff, 0 0 0 4px #1F2937;display:flex;align-items:center;' +
        'justify-content:center;font-weight:bold;color:' + textColor + ';font-size:11px;">' + label + '</div>';
    }

    function clearMarkers() {
      markers.forEach((m) => map.removeLayer(m));
      markers = [];
    }

    window.setData = function (payload) {
      const { stations, me, dark } = payload;
      document.body.classList.toggle('dark-tiles', !!dark);

      clearMarkers();
      stations.forEach((station) => {
        const available = station.availableCount > 0;
        const fill = available ? '#16A34A' : '#F59E0B';
        const textColor = available ? '#FFFFFF' : '#1F2937';
        const label = station.availableCount + '/' + station.chargerCount;
        const icon = L.divIcon({ html: markerHtml(fill, textColor, label), className: '', iconSize: [30, 30] });
        const marker = L.marker([station.lat, station.lng], { icon }).addTo(map);
        marker.on('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'select', id: station.id }));
        });
        markers.push(marker);
      });

      if (meMarker) { map.removeLayer(meMarker); meMarker = null; }
      if (me) {
        const meIcon = L.divIcon({
          html: '<div style="width:16px;height:16px;border-radius:50%;background:#2563EB;' +
            'box-shadow:0 0 0 3px #fff, 0 0 10px rgba(37,99,235,0.5);"></div>',
          className: '',
          iconSize: [16, 16],
        });
        meMarker = L.marker([me.lat, me.lng], { icon: meIcon }).addTo(map);
      }
    };

    window.centreOn = function (lat, lng, zoom) {
      map.setView([lat, lng], zoom || map.getZoom());
    };

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>`;

export type LeafletMapHandle = {
  centreOn: (lat: number, lng: number, zoom?: number) => void;
};

type LeafletMapProps = {
  stations: StationSummary[];
  me?: { lat: number; lng: number } | null;
  dark: boolean;
  onSelectStation: (id: string) => void;
};

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { stations, me, dark, onSelectStation },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  function sendData() {
    const payload = JSON.stringify({ stations, me: me ?? null, dark });
    webviewRef.current?.injectJavaScript(`window.setData(${payload}); true;`);
  }

  useImperativeHandle(ref, () => ({
    centreOn: (lat, lng, zoom) => {
      webviewRef.current?.injectJavaScript(`window.centreOn(${lat}, ${lng}, ${zoom ?? 15}); true;`);
    },
  }));

  useEffect(() => {
    if (readyRef.current) sendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, me, dark]);

  return (
    <RefForwardingWebView
      ref={webviewRef}
      style={styles.webview}
      originWhitelist={['*']}
      source={{ html: HTML }}
      onMessage={(event: WebViewMessageEvent) => {
        const message = JSON.parse(event.nativeEvent.data);
        if (message.type === 'ready') {
          readyRef.current = true;
          sendData();
        } else if (message.type === 'select') {
          onSelectStation(message.id);
        }
      }}
    />
  );
});

const styles = StyleSheet.create({
  webview: { flex: 1 },
});
