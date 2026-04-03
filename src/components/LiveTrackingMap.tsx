import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrackingPoint, StopPoint } from '../types';
import { MapPin, Navigation } from 'lucide-react';

// Fix Leaflet marker icon issue
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIconRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom icon for current position (car/arrow)
const createCarIcon = (heading: number = 0) => L.divIcon({
  className: 'custom-car-icon',
  html: `<div style="transform: rotate(${heading}deg); transition: transform 0.3s ease;">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#10b981" stroke="#064e3b" stroke-width="2" stroke-linejoin="round"/>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Component to handle map centering and auto-zoom
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  
  useEffect(() => {
    if (center && center[0] !== 0) {
      map.setView(center, zoom, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  
  return null;
};

interface LiveTrackingMapProps {
  points: TrackingPoint[];
  stopPoints: StopPoint[];
  isActive: boolean;
  isPaused?: boolean;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ points, stopPoints, isActive, isPaused }) => {
  const lastPoint = points[points.length - 1];
  const center: [number, number] = lastPoint ? [lastPoint.lat, lastPoint.lng] : [0, 0];
  
  // Calculate heading based on last two points
  const heading = useMemo(() => {
    if (points.length < 2) return 0;
    const p1 = points[points.length - 2];
    const p2 = points[points.length - 1];
    
    // Simple heading calculation
    const y = Math.sin(p2.lng - p1.lng) * Math.cos(p2.lat);
    const x = Math.cos(p1.lat) * Math.sin(p2.lat) -
              Math.sin(p1.lat) * Math.cos(p2.lat) * Math.cos(p2.lng - p1.lng);
    const brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }, [points]);

  const polylinePositions = useMemo(() => {
    return points.map(p => [p.lat, p.lng] as [number, number]);
  }, [points]);

  if (!isActive || points.length === 0) return null;

  return (
    <div className="w-full h-64 rounded-3xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800 shadow-inner">
      <MapContainer 
        center={center} 
        zoom={16} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapController center={center} zoom={16} />
        
        {/* Route Path */}
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ 
            color: '#10b981', 
            weight: 5, 
            opacity: 0.8,
            lineJoin: 'round',
            lineCap: 'round'
          }} 
        />
        
        {/* Stop Points */}
        {stopPoints.map((stop, idx) => (
          <CircleMarker 
            key={`stop-${idx}`}
            center={[stop.lat, stop.lng]}
            radius={6}
            pathOptions={{ 
              fillColor: '#f97316', 
              color: '#fff', 
              weight: 2, 
              fillOpacity: 1 
            }}
          >
            <Popup className="custom-popup">
              <div className="p-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Parada Detectada</p>
                <p className="text-xs font-bold">Duração: {Math.round(stop.duration / 60000)} min</p>
              </div>
            </Popup>
          </CircleMarker>
        ))}
        
        {/* Current Position Marker */}
        <Marker 
          position={center} 
          icon={createCarIcon(heading)}
        />
      </MapContainer>
      
      {/* Overlay for UI Consistency */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/40 to-transparent" />
      
      {/* Map Badge */}
      <div className="absolute top-4 left-4 z-[1000] flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
        )} />
        <span className="text-[10px] font-black text-white uppercase tracking-widest">
          {isPaused ? 'Pausado' : 'Ao Vivo'}
        </span>
      </div>
    </div>
  );
};

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
