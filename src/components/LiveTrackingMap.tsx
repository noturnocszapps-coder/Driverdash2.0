import React, { useEffect, useMemo, useState, useCallback, memo } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-cluster';
import { TrackingPoint, StopPoint, MapMarker, MarkerType } from '../types';
import { 
  MapPin, Navigation, Crosshair, Clock, TrendingUp, Maximize2, Minimize2, 
  AlertTriangle, Droplets, User, Zap, Plus, Info, X, CheckCircle2, Shield, Users, Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useDriverStore } from '../store';
const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
import { motion, AnimatePresence } from 'motion/react';

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

// Component to handle map clicks for adding markers
const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Custom icon for current position (car/arrow)
const createCarIcon = (heading: number = 0, isMoving: boolean = false) => L.divIcon({
  className: 'custom-car-icon',
  html: `<div style="transform: rotate(${heading}deg); transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); filter: drop-shadow(0 0 8px rgba(16, 185, 129, 0.4));">
    <div class="${!isMoving ? 'animate-pulse' : ''}" style="position: relative;">
      ${!isMoving ? '<div style="position: absolute; inset: -4px; background: rgba(16, 185, 129, 0.2); border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>' : ''}
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" fill="#10b981" stroke="#064e3b" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

// Custom Cluster Icon
const createClusterCustomIcon = (cluster: any) => {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-900 border-2 border-emerald-500 shadow-lg">
      <span class="text-[10px] font-black text-emerald-500">${count}</span>
    </div>`,
    className: 'custom-cluster-icon',
    iconSize: [32, 32]
  });
};

// Memoized Marker Component for performance
const MemoizedMarker = memo(({ marker, icon, isDimmed }: { marker: MapMarker, icon: L.DivIcon, isDimmed: boolean }) => (
  <Marker 
    position={[marker.lat, marker.lng]}
    icon={icon}
    opacity={isDimmed ? 0.3 : 1}
  >
    <Popup className="custom-popup">
      <div className="p-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
          {marker.type === 'radar' ? 'Radar' : 
           marker.type === 'pothole' ? 'Buraco/Valeta' :
           marker.type === 'bathroom' ? 'Banheiro' :
           marker.type === 'water' ? 'Água' : 
           marker.type === 'gas_station' ? 'Posto de Combustível' :
           marker.type === 'police' ? 'Polícia' :
           marker.type === 'inspection' ? 'Fiscalização' : 'Alerta'}
        </p>
        {marker.description && <p className="text-xs font-bold">{marker.description}</p>}
        <p className="text-[8px] text-zinc-400 mt-1">
          Status: {marker.status === 'approved' ? 'Verificado' : 'Pendente'}
        </p>
      </div>
    </Popup>
  </Marker>
));

MemoizedMarker.displayName = 'MemoizedMarker';

// Component to handle map invalidation on resize
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [map]);
  
  return null;
};

// Component to handle map centering and auto-zoom
const MapController = ({ center, zoom, autoCenter, isMoving }: { center: [number, number], zoom: number, autoCenter: boolean, isMoving: boolean }) => {
  const map = useMap();
  const lastCenter = React.useRef<[number, number] | null>(null);
  
  useEffect(() => {
    if (center && center[0] !== 0 && autoCenter) {
      // Only pan if the distance is significant to avoid jitter
      if (!lastCenter.current || 
          Math.abs(lastCenter.current[0] - center[0]) > 0.00005 || 
          Math.abs(lastCenter.current[1] - center[1]) > 0.00005) {
        
        const duration = isMoving ? 1.2 : 0.8;
        const dist = lastCenter.current ? Math.sqrt(Math.pow(lastCenter.current[0] - center[0], 2) + Math.pow(lastCenter.current[1] - center[1], 2)) : 0;
        
        if (dist > 0.01) { // Approx 1km
          map.flyTo(center, zoom, { duration: 2 });
        } else {
          map.panTo(center, { animate: true, duration });
        }
        lastCenter.current = center;
      }
    }
  }, [center, map, autoCenter, isMoving]);
  
  return null;
};

interface LiveTrackingMapProps {
  points: TrackingPoint[];
  stopPoints: StopPoint[];
  isActive: boolean;
  isPaused?: boolean;
  currentSpeed?: number;
  totalDistance?: number;
  duration?: number;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({ 
  points, 
  stopPoints, 
  isActive, 
  isPaused,
  currentSpeed = 0,
  totalDistance = 0,
  duration = 0
}) => {
  const { mapMarkers, addMapMarker, loadMapMarkers, user } = useDriverStore();
  const [autoCenter, setAutoCenter] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [newMarkerPos, setNewMarkerPos] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarkerType, setSelectedMarkerType] = useState<MarkerType>('radar');
  const [markerDescription, setMarkerDescription] = useState('');

  const isMoving = currentSpeed > 10;

  // Memoize Cluster Icon function
  const clusterIconCreateFunction = useCallback((cluster: any) => createClusterCustomIcon(cluster), []);

  useEffect(() => {
    loadMapMarkers();
  }, [loadMapMarkers]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (isAddingMarker) {
      setNewMarkerPos({ lat, lng });
    }
  }, [isAddingMarker]);

  const handleConfirmMarker = async () => {
    if (!newMarkerPos) return;
    await addMapMarker({
      type: selectedMarkerType,
      lat: newMarkerPos.lat,
      lng: newMarkerPos.lng,
      description: markerDescription
    });
    setNewMarkerPos(null);
    setIsAddingMarker(false);
    setMarkerDescription('');
  };

  const getMarkerIcon = useCallback((type: MarkerType) => {
    const color = type === 'radar' ? '#ef4444' : 
                  type === 'pothole' || type === 'ditch' ? '#f59e0b' : 
                  type === 'bathroom' || type === 'water' ? '#3b82f6' : 
                  type === 'gas_station' ? '#10b981' :
                  type === 'police' || type === 'inspection' ? '#6366f1' : '#6b7280';
    
    return L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background-color: ${color}; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4); transform: scale(1.1); transition: transform 0.2s ease;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          ${type === 'radar' ? '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>' : 
            type === 'pothole' ? '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>' :
            type === 'bathroom' ? '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>' :
            type === 'gas_station' ? '<path d="M3 19V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11V7"/><path d="M12 17v-2"/><path d="M8 11h8"/><path d="M8 15h8"/>' :
            type === 'police' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' :
            type === 'inspection' ? '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>' :
            '<circle cx="12" cy="12" r="10"/>'}
        </svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
  }, []);

  const lastPoint = points[points.length - 1];
  const center: [number, number] = useMemo(() => 
    lastPoint ? [lastPoint.lat, lastPoint.lng] : [0, 0]
  , [lastPoint]);
  
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

  // Memoize Car Icon to avoid recreation on every render
  const carIcon = useMemo(() => createCarIcon(heading, isMoving), [heading, isMoving]);

  const polylinePositions = useMemo(() => {
    return points.map(p => [p.lat, p.lng] as [number, number]);
  }, [points]);

  if (!isActive || points.length === 0) return null;

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <div className={cn(
      "w-full rounded-3xl overflow-hidden relative border border-zinc-200 dark:border-zinc-800 shadow-inner transition-all duration-500",
      isFullscreen ? "fixed inset-0 z-[9999] rounded-none h-screen" : "h-80"
    )}>
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
        
        <MapController center={center} zoom={16} autoCenter={autoCenter} isMoving={isMoving} />
        <MapResizer />
        <MapEvents onMapClick={handleMapClick} />
        
        {/* Route Path Glow Effect */}
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ 
            color: '#10b981', 
            weight: 12, 
            opacity: 0.15,
            lineJoin: 'round',
            lineCap: 'round'
          }} 
        />
        
        {/* Main Route Path */}
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ 
            color: '#10b981', 
            weight: 6, 
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round'
          }} 
        />
        
        {/* Map Markers with Clustering */}
        <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={40}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom={true}
          iconCreateFunction={clusterIconCreateFunction}
        >
          {mapMarkers.map((marker) => (
            <MemoizedMarker 
              key={marker.id}
              marker={marker}
              icon={getMarkerIcon(marker.type)}
              isDimmed={isMoving && marker.type !== 'radar'}
            />
          ))}
        </MarkerClusterGroup>

        {/* New Marker Preview */}
        {newMarkerPos && (
          <Marker position={[newMarkerPos.lat, newMarkerPos.lng]} icon={getMarkerIcon(selectedMarkerType)} />
        )}
        
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
          icon={carIcon}
        />
      </MapContainer>
      {/* Overlay for UI Consistency */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-zinc-950/40 via-transparent to-zinc-950/20" />
      
      {/* Map Badge & Controls */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900/90 backdrop-blur-md rounded-full border border-white/10 shadow-lg pointer-events-auto">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full",
            isPaused ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
          )} />
          <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">
            {isPaused ? 'Turno Pausado' : 'Monitoramento Ativo'}
          </span>
        </div>
      </div>

      <div className="absolute right-3 top-3 bottom-3 z-[1000] flex flex-col items-center justify-center gap-2 pointer-events-none">
        <div className="flex flex-col gap-2 pointer-events-auto">
          <button 
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-10 h-10 rounded-2xl bg-zinc-900/90 text-white border border-white/10 backdrop-blur-md flex items-center justify-center transition-all shadow-lg active:scale-90"
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button 
            onClick={() => setAutoCenter(!autoCenter)}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg border backdrop-blur-md active:scale-90",
              autoCenter 
                ? "bg-emerald-500 text-zinc-950 border-emerald-400" 
                : "bg-zinc-900/90 text-white border-white/10"
            )}
          >
            <Crosshair size={18} />
          </button>
          <button 
            onClick={() => setIsAddingMarker(!isAddingMarker)}
            className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg border backdrop-blur-md active:scale-90",
              isAddingMarker 
                ? "bg-emerald-500 text-zinc-950 border-emerald-400" 
                : "bg-zinc-900/90 text-white border-white/10"
            )}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Add Marker Dialog */}
      <AnimatePresence>
        {isAddingMarker && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute top-16 left-4 right-4 z-[1001] bg-zinc-900/95 backdrop-blur-xl rounded-2xl p-4 border border-white/10 shadow-2xl pointer-events-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-black text-white uppercase tracking-widest">Adicionar Marcador</p>
              <button onClick={() => setIsAddingMarker(false)} className="text-zinc-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {!newMarkerPos ? (
              <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <Info size={16} className="text-blue-500 shrink-0" />
                <p className="text-[10px] text-blue-400 font-medium leading-tight">
                  Toque no mapa para definir a localização do marcador.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {(['radar', 'pothole', 'bathroom', 'water', 'gas_station', 'police', 'inspection', 'danger'] as MarkerType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedMarkerType(type)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all",
                        selectedMarkerType === type 
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                          : "bg-zinc-800/50 border-transparent text-zinc-500"
                      )}
                    >
                      {type === 'radar' && <Zap size={14} />}
                      {type === 'pothole' && <AlertTriangle size={14} />}
                      {type === 'bathroom' && <User size={14} />}
                      {type === 'water' && <Droplets size={14} />}
                      {type === 'gas_station' && <Droplets size={14} />}
                      {type === 'police' && <Shield size={14} />}
                      {type === 'inspection' && <Activity size={14} />}
                      {type === 'danger' && <AlertTriangle size={14} />}
                      <span className="text-[8px] font-bold uppercase tracking-widest">
                        {type === 'radar' ? 'Radar' : 
                         type === 'pothole' ? 'Buraco' :
                         type === 'bathroom' ? 'WC' :
                         type === 'water' ? 'Água' : 
                         type === 'gas_station' ? 'Posto' :
                         type === 'police' ? 'Polícia' :
                         type === 'inspection' ? 'Fiscal' : 'Perigo'}
                      </span>
                    </button>
                  ))}
                </div>
                <input 
                  type="text"
                  placeholder="Descrição opcional..."
                  value={markerDescription}
                  onChange={(e) => setMarkerDescription(e.target.value)}
                  className="w-full bg-zinc-800/50 border-none rounded-xl px-4 py-2 text-xs text-white placeholder:text-zinc-600 focus:ring-1 focus:ring-emerald-500"
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => setNewMarkerPos(null)}
                    className="flex-1 h-10 rounded-xl bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest"
                  >
                    Mudar Local
                  </button>
                  <button 
                    onClick={handleConfirmMarker}
                    className="flex-1 h-10 rounded-xl bg-emerald-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Stats Overlay - Minimalist at Bottom */}
      <div className="absolute bottom-3 left-3 right-3 z-[1000] flex gap-2 pointer-events-none overflow-x-auto no-scrollbar">
        <div className="bg-zinc-950/80 backdrop-blur-xl rounded-xl p-2.5 px-4 border border-white/10 shadow-2xl pointer-events-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <TrendingUp size={12} className="text-emerald-500" />
            <span className={cn(
              "text-lg font-black tracking-tighter tabular-nums",
              currentSpeed > 110 ? "text-red-500" : "text-white"
            )}>
              {Math.round(currentSpeed)}
            </span>
            <span className="text-[8px] font-black text-zinc-500">KM/H</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Navigation size={12} className="text-blue-500" />
            <span className="text-lg font-black tracking-tighter text-white tabular-nums">
              {totalDistance.toFixed(1)}
            </span>
            <span className="text-[8px] font-black text-zinc-500">KM</span>
          </div>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock size={12} className="text-amber-500" />
            <span className="text-lg font-black tracking-tighter text-white tabular-nums">
              {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
