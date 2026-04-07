import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Polyline, Marker, useMap, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import { useDriverStore } from '../store';
import { ChevronLeft, Navigation, Clock, Map as MapIcon, Info, AlertCircle } from 'lucide-react';
import { Button, Card, CardContent } from '../components/UI';
import { formatDuration, cn, getHumanLocation } from '../utils';
import { motion } from 'motion/react';

// Fix for Leaflet default icon issues in Vite
import 'leaflet/dist/leaflet.css';

// Custom markers using DivIcon for better reliability and styling
const createMarkerIcon = (color: string, pulsing = false) => L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="position: relative; width: 12px; height: 12px; display: flex; align-items: center; justify-content: center;">
      ${pulsing ? `<div class="pulse-ring" style="color: ${color};"></div>` : ''}
      <div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.4); position: relative; z-index: 2;"></div>
    </div>
  `,
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

const startIcon = createMarkerIcon('#10b981'); // Emerald 500
const endIcon = createMarkerIcon('#ef4444');   // Red 500
const stopIcon = createMarkerIcon('#f59e0b', true); // Amber 500 with pulse

// Component to auto-center map on points
const MapAutoCenter = ({ points }: { points: { lat: number, lng: number }[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [points, map]);

  return null;
};

// Component to handle map size recalculation
const MapResizeHandler = () => {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [map]);
  return null;
};

const CycleMap = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cycles, tracking } = useDriverStore();
  
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  const isLive = id === 'active';
  
  const cycle = useMemo(() => {
    if (isLive) return cycles.find(c => c.status === 'open');
    return cycles.find(c => c.id === id);
  }, [cycles, id, isLive]);

  const points = useMemo(() => {
    const rawPoints = isLive ? tracking.points : (cycle?.route_points || []);
    
    // Simple thinning logic: if more than 1000 points, take every Nth point
    if (rawPoints.length > 1000) {
      const skip = Math.ceil(rawPoints.length / 1000);
      return rawPoints.filter((_, index) => index % skip === 0 || index === rawPoints.length - 1);
    }
    
    return rawPoints;
  }, [isLive, tracking.points, cycle?.route_points]);

  const polylinePositions = useMemo(() => 
    points.map(p => [p.lat, p.lng] as [number, number]), 
  [points]);

  const stopPoints = useMemo(() => {
    if (isLive) return tracking.stopPoints || [];
    return cycle?.stop_points || [];
  }, [isLive, tracking.stopPoints, cycle]);

  const metrics = useMemo(() => {
    if (isLive) {
      return {
        distance: tracking.distance,
        movingTime: tracking.movingTime,
        isActive: tracking.isActive
      };
    }
    return {
      distance: cycle?.tracked_km || 0,
      movingTime: cycle?.tracked_moving_time || 0,
      isActive: false
    };
  }, [isLive, tracking, cycle]);

  if (!cycle && !isLive) {
    return (
      <div className="min-h-[100dvh] bg-[#0B0B0B] text-white flex flex-col items-center justify-center p-6">
        <AlertCircle size={48} className="text-zinc-500 mb-4" />
        <h2 className="text-xl font-bold mb-2">Ciclo não encontrado</h2>
        <Button onClick={() => navigate(-1)} variant="secondary">Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#0B0B0B] sticky top-0 z-[1001]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">Mapa do Ciclo</h1>
              <button
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded border transition-all",
                  showHeatmap 
                    ? "bg-amber-500/20 text-amber-500 border-amber-500/30" 
                    : "bg-zinc-800 text-zinc-400 border-zinc-700"
                )}
              >
                Heatmap {showHeatmap ? 'ON' : 'OFF'}
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              {points.length > 0 
                ? getHumanLocation(points[points.length - 1].lat, points[points.length - 1].lng)
                : 'Visualização do trajeto'}
            </p>
          </div>
        </div>
      </header>

      {/* Beta Info */}
      <div className="bg-emerald-500/5 border-b border-emerald-500/10 p-3 flex items-start gap-3">
        <Info size={16} className="text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Esta funcionalidade está em fase de testes e pode apresentar pequenas imprecisões no trajeto registrado.
        </p>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        <MapContainer 
          center={points.length > 0 ? [points[points.length-1].lat, points[points.length-1].lng] : [-23.5505, -46.6333]} 
          zoom={13} 
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles-dark"
          />
          
          {points.length > 0 && (
            <>
              {!showHeatmap && (
                <>
                  {/* Outer glow polyline */}
                  <Polyline 
                    positions={polylinePositions} 
                    color="#10b981" 
                    weight={8} 
                    opacity={0.15}
                    lineJoin="round"
                    smoothFactor={2}
                  />
                  {/* Main polyline */}
                  <Polyline 
                    positions={polylinePositions} 
                    color="#10b981" 
                    weight={4} 
                    opacity={0.9}
                    lineJoin="round"
                    smoothFactor={1}
                  />
                </>
              )}

              {showHeatmap && points.map((p, i) => (
                <CircleMarker 
                  key={`heatmap-${i}`}
                  center={[p.lat, p.lng]}
                  radius={4}
                  pathOptions={{ 
                    color: p.isProductive ? '#10b981' : '#f59e0b',
                    fillColor: p.isProductive ? '#10b981' : '#f59e0b',
                    fillOpacity: 0.6,
                    stroke: false
                  }}
                />
              ))}

              {/* Stop points */}
              {!showHeatmap && stopPoints.map((stop, i) => (
                <Marker 
                  key={`stop-${i}`}
                  position={[stop.lat, stop.lng]}
                  icon={stopIcon}
                />
              ))}

              {/* Start point */}
              <Marker position={[points[0].lat, points[0].lng]} icon={startIcon} />

              {/* End point or Current position */}
              {points.length > 1 && (
                <Marker 
                  position={[points[points.length - 1].lat, points[points.length - 1].lng]} 
                  icon={isLive && metrics.isActive ? createMarkerIcon('#3b82f6', true) : endIcon} 
                />
              )}

              <MapAutoCenter points={points} />
            </>
          )}
          <MapResizeHandler />
        </MapContainer>

        {points.length === 0 && (
          <div className="absolute inset-0 z-[999] pointer-events-none flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-[1px]">
            <MapIcon size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">
              {tracking.isActive ? 'Iniciando rastreamento...' : 'Nenhum trajeto registrado'}
            </p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-2 max-w-[200px]">
              {tracking.isActive 
                ? 'Aguardando primeiro deslocamento válido para atualizar o mapa.' 
                : 'Inicie o rastreamento no dashboard para gravar seu percurso.'}
            </p>
          </div>
        )}

        {/* Heatmap Legend */}
        {showHeatmap && (
          <div className="absolute top-20 right-4 z-[1000] bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg p-2 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Produtivo</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Ocioso</span>
            </div>
          </div>
        )}

        {/* Overlay Metrics Card */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000]">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
          >
            <Card className="bg-black/80 backdrop-blur-md border-zinc-800 shadow-2xl">
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Distância</p>
                    <div className="flex items-center justify-center gap-1">
                      <Navigation size={12} className="text-emerald-500" />
                      <span className="text-lg font-bold">{metrics.distance.toFixed(2)} <span className="text-xs font-normal text-zinc-500">km</span></span>
                    </div>
                  </div>
                  
                  <div className="text-center border-x border-zinc-800">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Em Movimento</p>
                    <div className="flex items-center justify-center gap-1">
                      <Clock size={12} className="text-emerald-500" />
                      <span className="text-lg font-bold">{formatDuration(metrics.movingTime)}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Status</p>
                    <div className="flex items-center justify-center gap-1.5 pt-1">
                      <div className={`w-2 h-2 rounded-full ${metrics.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                      <span className={`text-xs font-bold uppercase ${metrics.isActive ? 'text-emerald-500' : 'text-zinc-500'}`}>
                        {metrics.isActive ? 'Ativo' : 'Encerrado'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container {
          background: #0B0B0B !important;
        }
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .custom-div-icon {
          background: transparent;
          border: none;
        }
        
        @keyframes marker-pulse {
          0% { transform: scale(0.6); opacity: 1; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        
        .pulse-ring {
          position: absolute;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: currentColor;
          animation: marker-pulse 3s infinite ease-out;
          pointer-events: none;
        }
      `}} />
    </div>
  );
};

export default CycleMap;
