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
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map', { zoomControl: false }).setView([7.2906, 80.6337], 13);
    const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors';
    const TILE_STYLES = {
      light: { url: OSM_URL, attribution: OSM_ATTRIBUTION, maxNativeZoom: 19, darkFilter: false },
      dark: { url: OSM_URL, attribution: OSM_ATTRIBUTION, maxNativeZoom: 19, darkFilter: true },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxNativeZoom: 18,
        darkFilter: false,
      },
    };
    let tiles = null;
    let currentStyle = null;

    function setMapStyle(style) {
      if (style === currentStyle) return;
      const config = TILE_STYLES[style] || TILE_STYLES.light;
      if (tiles) map.removeLayer(tiles);
      tiles = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: 19,
        maxNativeZoom: config.maxNativeZoom,
      }).addTo(map);
      document.body.classList.toggle('dark-tiles', config.darkFilter);
      currentStyle = style;
    }

    setMapStyle('light');

    let markers = [];
    let meMarker = null;

    function markerHtml(fill, glyphColor, label) {
      const pin =
        '<svg width="36" height="46" viewBox="0 0 36 46" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M18 2C9.2 2 2 9.2 2 18c0 11.6 16 26 16 26s16-14.4 16-26C34 9.2 26.8 2 18 2z" fill="#1F2937"/>' +
        '<path d="M18 3.5C10 3.5 3.5 10 3.5 18c0 10.4 14.5 23.8 14.5 23.8S32.5 28.4 32.5 18C32.5 10 26 3.5 18 3.5z" fill="#FFFFFF"/>' +
        '<path d="M18 6C11.4 6 6 11.4 6 18c0 8.9 12 20.4 12 20.4S30 26.9 30 18C30 11.4 24.6 6 18 6z" fill="' + fill + '"/>' +
        '<rect x="11.5" y="10" width="9.5" height="15" rx="2" fill="' + glyphColor + '"/>' +
        '<rect x="13.2" y="11.8" width="6.1" height="3.6" rx="0.8" fill="' + fill + '"/>' +
        '<path d="M17 16.6l-3 4.4h2.1l-0.7 3.3 3-4.4h-2.1z" fill="' + fill + '"/>' +
        '<path d="M21 13.5h1.6c0.7 0 1.2 0.5 1.2 1.2v6.2c0 0.6 0.5 1.1 1.1 1.1s1.1-0.5 1.1-1.1v-5.4" ' +
        'fill="none" stroke="' + glyphColor + '" stroke-width="1.4" stroke-linecap="round"/>' +
        '</svg>';
      const badge =
        '<div style="position:absolute;top:-6px;left:24px;min-width:22px;padding:1px 5px;border-radius:9px;' +
        'background:#FFFFFF;border:1px solid #1F2937;color:#1F2937;font:bold 10px/14px sans-serif;' +
        'text-align:center;white-space:nowrap;">' + label + '</div>';
      return '<div style="position:relative;width:36px;height:46px;">' + pin + badge + '</div>';
    }

    function clearMarkers() {
      markers.forEach((m) => map.removeLayer(m));
      markers = [];
    }

    window.setData = function (payload) {
      const { stations, me, mapStyle } = payload;
      setMapStyle(mapStyle);

      clearMarkers();
      stations.forEach((station) => {
        // Green: at least one charger free. Yellow: none free, but some are online (busy).
        // Gray: the owner has every charger offline – nothing to wait for here.
        const onlineCount = station.onlineCount ?? station.chargerCount;
        const available = station.availableCount > 0;
        const allOffline = onlineCount === 0 && station.chargerCount > 0;
        const fill = available ? '#16A34A' : allOffline ? '#6B7280' : '#F59E0B';
        const textColor = available ? '#FFFFFF' : '#1F2937';
        const label = station.availableCount + '/' + station.chargerCount;
        const icon = L.divIcon({
          html: markerHtml(fill, textColor, label),
          className: '',
          iconSize: [36, 46],
          iconAnchor: [18, 44],
        });
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

    let routeLine = null;

    window.clearRoute = function () {
      if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    };

    function drawRoute(latlngs) {
      window.clearRoute();
      routeLine = L.polyline(latlngs, { color: '#2563EB', weight: 5, opacity: 0.85 }).addTo(map);
      map.fitBounds(routeLine.getBounds(), { padding: [48, 48] });
    }

    // Walks/drives the real road network via a free, keyless public router. Falls back to a
    // straight line (still useful, just not road-accurate) if that service is unreachable.
    window.showRoute = function (fromLat, fromLng, toLat, toLng) {
      const straight = [[fromLat, fromLng], [toLat, toLng]];
      const url = 'https://router.project-osrm.org/route/v1/driving/' +
        fromLng + ',' + fromLat + ';' + toLng + ',' + toLat + '?overview=full&geometries=geojson';
      fetch(url)
        .then((res) => res.json())
        .then((body) => {
          const coords = body && body.routes && body.routes[0] && body.routes[0].geometry.coordinates;
          if (!coords) { drawRoute(straight); return; }
          drawRoute(coords.map((c) => [c[1], c[0]]));
        })
        .catch(() => drawRoute(straight));
    };

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
  </script>
</body>
</html>`;

export type LeafletMapHandle = {
  centreOn: (lat: number, lng: number, zoom?: number) => void;
  showRoute: (fromLat: number, fromLng: number, toLat: number, toLng: number) => void;
  clearRoute: () => void;
};

export type TileStyle = 'light' | 'dark' | 'satellite';

type LeafletMapProps = {
  stations: StationSummary[];
  me?: { lat: number; lng: number } | null;
  tileStyle: TileStyle;
  onSelectStation: (id: string) => void;
};

export const LeafletMap = forwardRef<LeafletMapHandle, LeafletMapProps>(function LeafletMap(
  { stations, me, tileStyle, onSelectStation },
  ref,
) {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);

  function sendData() {
    const payload = JSON.stringify({ stations, me: me ?? null, mapStyle: tileStyle });
    webviewRef.current?.injectJavaScript(`window.setData(${payload}); true;`);
  }

  useImperativeHandle(ref, () => ({
    centreOn: (lat, lng, zoom) => {
      webviewRef.current?.injectJavaScript(`window.centreOn(${lat}, ${lng}, ${zoom ?? 15}); true;`);
    },
    showRoute: (fromLat, fromLng, toLat, toLng) => {
      webviewRef.current?.injectJavaScript(`window.showRoute(${fromLat}, ${fromLng}, ${toLat}, ${toLng}); true;`);
    },
    clearRoute: () => {
      webviewRef.current?.injectJavaScript('window.clearRoute(); true;');
    },
  }));

  useEffect(() => {
    if (readyRef.current) sendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, me, tileStyle]);

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
