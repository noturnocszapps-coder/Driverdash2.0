import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import { useDriverStore } from '../store';
import { generateOperationalHeatmap, MapLayer, TimeFilter, HeatmapPoint } from '../lib/mapHeatUtils';
import { identifyBestZones, ScoredZone } from '../lib/zoneScoring';
import { getZoneNavigation, NavigationInfo } from '../lib/zoneNavigation';
import { makeOperationalDecision, Decision } from '../lib/zoneDecision';
import { ChevronLeft, Map as MapIcon, Info, Zap, Clock, AlertCircle, Filter, Layers, Calendar, TrendingUp, TrendingDown, Target, Navigation, ShieldCheck, MapPin } from 'lucide-react';
import { Button, Card, CardContent } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

// Fix for Leaflet default icon issues in Vite
import 'leaflet/dist/leaflet.css';

// Custom Heatmap Layer for Leaflet
const HeatLayer = ({ points, layerType }: { points: HeatmapPoint[], layerType: MapLayer }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!points || points.length === 0) return;

    // Convert points to [lat, lng, intensity]
    const heatPoints = points.map(p => [p.lat, p.lng, p.intensity * 1.5] as [number, number, number]);
    
    // Define gradient based on layer type
    const gradients: Record<MapLayer, any> = {
      productivity: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' },
      waiting: { 0.4: 'orange', 0.6: 'red', 1.0: 'darkred' },
      mixed: { 0.4: 'blue', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
    };

    // @ts-ignore - leaflet.heat adds heatLayer to L
    const heatLayer = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 14,
      gradient: gradients[layerType]
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer);
    };
  }, [map, points, layerType]);

  return null;
};

const MapAutoCenter = ({ points }: { points: HeatmapPoint[] }) => {
  const map = useMap();
  
  useMemo(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [points, map]);

  return null;
};

const StrategicMap = () => {
  const navigate = useNavigate();
  const { cycles, tracking, incrementMapsViewed } = useDriverStore();
  const [layer, setLayer] = useState<MapLayer>('mixed');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    incrementMapsViewed();
  }, [incrementMapsViewed]);

  const heatmapData = useMemo(() => {
    return generateOperationalHeatmap(cycles, layer, timeFilter);
  }, [cycles, layer, timeFilter]);

  const { best: bestZone, worst: worstZone } = useMemo(() => {
    return identifyBestZones(heatmapData);
  }, [heatmapData]);

  const navigation = useMemo(() => {
    if (!bestZone || !tracking.lastPoint) return null;
    return getZoneNavigation(
      tracking.lastPoint.lat,
      tracking.lastPoint.lng,
      bestZone.lat,
      bestZone.lng
    );
  }, [bestZone, tracking.lastPoint]);

  const decision = useMemo(() => {
    const currentPoint = heatmapData.find(p => 
      tracking.lastPoint && 
      Math.abs(p.lat - tracking.lastPoint.lat) < 0.005 && 
      Math.abs(p.lng - tracking.lastPoint.lng) < 0.005
    );
    
    const currentScore = currentPoint ? (currentPoint as any).score || 0 : 0;
    const isMoving = (tracking.lastPoint?.speed || 0) > 5;
    const isDataMature = cycles.length > 5;

    return makeOperationalDecision(
      bestZone,
      currentScore,
      navigation || { distanceKm: 0, cardinalDirection: 'norte' },
      tracking.isActive,
      isMoving,
      isDataMature,
      bestZone?.confidence || 'low'
    );
  }, [bestZone, navigation, tracking.isActive, tracking.lastPoint, cycles.length, heatmapData]);

  const stats = useMemo(() => {
    const idleCount = heatmapData.filter(p => p.type === 'idle').length;
    const productiveCount = heatmapData.filter(p => p.type === 'productive').length;
    return { idleCount, productiveCount };
  }, [heatmapData]);

  return (
    <div className="flex-1 flex flex-col bg-[#0B0B0B] text-white">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-zinc-800 bg-[#0B0B0B] sticky top-6 z-[1001]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-zinc-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight">Mapa Estratégico</h1>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-500/20">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Análise Operacional em Tempo Real</p>
          </div>
        </div>
        <button 
          onClick={() => setShowControls(!showControls)}
          className={cn(
            "p-2 rounded-xl border transition-all",
            showControls ? "bg-emerald-500 border-emerald-400 text-zinc-950" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          )}
        >
          <Layers size={20} />
        </button>
      </header>

      {/* Main Map Area */}
      <div className="flex-1 relative min-h-0">
        <MapContainer 
          center={[-23.5505, -46.6333]} 
          zoom={12} 
          style={{ height: '100%', width: '100%', position: 'absolute', inset: 0 }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            className="map-tiles-dark"
          />
          
          <HeatLayer points={heatmapData} layerType={layer} />

          {/* Highlight Best/Worst Zones */}
          {bestZone && (
            <Marker 
              position={[bestZone.lat, bestZone.lng]}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div class="relative flex items-center justify-center">
                        <div class="absolute w-12 h-12 rounded-full bg-emerald-500/20 animate-ping"></div>
                        <div class="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-pulse"></div>
                        <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-[0_0_15px_rgba(16,185,129,0.8)] z-10"></div>
                        <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-zinc-950 px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap shadow-xl border border-emerald-400">
                          SCORE: ${bestZone.score}
                        </div>
                      </div>`
              })}
            >
              <Popup className="custom-popup">
                <div className="p-3 bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest">Melhor Zona Detectada</p>
                  </div>
                  <p className="text-sm font-bold mb-1">{bestZone.label}</p>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-800">
                    <div>
                      <p className="text-[8px] font-black text-zinc-500 uppercase">Score</p>
                      <p className="text-xs font-black text-emerald-400">{bestZone.score}/100</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-zinc-500 uppercase">Confiança</p>
                      <p className="text-xs font-black text-zinc-300 uppercase">{bestZone.confidence}</p>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          )}

          {worstZone && (
            <Marker 
              position={[worstZone.lat, worstZone.lng]}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div class="w-8 h-8 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                        <div class="w-2 h-2 rounded-full bg-rose-500"></div>
                      </div>`
              })}
            >
              <Popup className="custom-popup">
                <div className="p-2 bg-zinc-900 text-white rounded-lg">
                  <p className="text-[10px] font-black uppercase text-rose-500 mb-1">Zona de Espera</p>
                  <p className="text-xs font-bold">{worstZone.label}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {tracking.lastPoint && (
            <Marker 
              position={[tracking.lastPoint.lat, tracking.lastPoint.lng]}
              icon={L.divIcon({
                className: 'custom-marker',
                html: `<div class="w-6 h-6 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                      </div>`
              })}
            />
          )}

          {heatmapData.length > 0 && <MapAutoCenter points={heatmapData} />}
        </MapContainer>

        {/* Floating Controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute top-4 right-4 z-[1000] flex flex-col gap-2"
            >
              <div className="bg-black/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2 py-1">Camadas</p>
                <ControlButton 
                  active={layer === 'productivity'} 
                  onClick={() => setLayer('productivity')} 
                  icon={<Zap size={14} />} 
                  label="Ganhos"
                  color="emerald"
                />
                <ControlButton 
                  active={layer === 'waiting'} 
                  onClick={() => setLayer('waiting')} 
                  icon={<Clock size={14} />} 
                  label="Espera"
                  color="rose"
                />
                <ControlButton 
                  active={layer === 'mixed'} 
                  onClick={() => setLayer('mixed')} 
                  icon={<Target size={14} />} 
                  label="Misto"
                  color="blue"
                />
              </div>

              <div className="bg-black/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-2 flex flex-col gap-1 shadow-2xl">
                <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2 py-1">Tempo</p>
                <TimeButton active={timeFilter === '15m'} onClick={() => setTimeFilter('15m')} label="15m" />
                <TimeButton active={timeFilter === '30m'} onClick={() => setTimeFilter('30m')} label="30m" />
                <TimeButton active={timeFilter === '1h'} onClick={() => setTimeFilter('1h')} label="1h" />
                <TimeButton active={timeFilter === 'today'} onClick={() => setTimeFilter('today')} label="Hoje" />
                <TimeButton active={timeFilter === 'all'} onClick={() => setTimeFilter('all')} label="Tudo" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Summary & Legend */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000] space-y-3 pointer-events-none">
          <div className="flex justify-between items-end pointer-events-auto">
            <div className="bg-black/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 flex gap-6 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Produtividade</p>
                  <p className="text-xs font-black">{stats.productiveCount} zonas</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                <div>
                  <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Espera</p>
                  <p className="text-xs font-black">{stats.idleCount} zonas</p>
                </div>
              </div>
            </div>

            {navigation && bestZone && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500 text-zinc-950 px-4 py-3 rounded-2xl flex items-center gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.3)] border border-emerald-400"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-950/10 flex items-center justify-center">
                  <Navigation size={18} style={{ transform: `rotate(${navigation.bearing}deg)` }} />
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Rumo à Melhor Zona</p>
                  <p className="text-xs font-black">{navigation.relativeLabel}</p>
                </div>
              </motion.div>
            )}
          </div>

          <Card className={cn(
            "bg-black/80 backdrop-blur-md border-zinc-800 shadow-2xl pointer-events-auto transition-all duration-500",
            decision.priority === 'high' ? "border-emerald-500/50 ring-1 ring-emerald-500/20" : ""
          )}>
            <CardContent className="p-4 flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                decision.action === 'move_now' ? "bg-emerald-500 text-zinc-950" :
                decision.action === 'stay' ? "bg-blue-500/20 text-blue-400" :
                decision.action === 'wait' ? "bg-amber-500/20 text-amber-400" : "bg-zinc-800 text-zinc-400"
              )}>
                {decision.action === 'move_now' ? <Target size={24} className="animate-pulse" /> :
                 decision.action === 'stay' ? <ShieldCheck size={24} /> :
                 decision.action === 'wait' ? <Clock size={24} /> : <Info size={24} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      decision.action === 'move_now' ? "text-emerald-400" :
                      decision.action === 'stay' ? "text-blue-400" :
                      decision.action === 'wait' ? "text-amber-400" : "text-zinc-400"
                    )}>{decision.label}</p>
                    {decision.priority === 'high' && (
                      <span className="px-1.5 py-0.5 bg-emerald-500 text-zinc-950 text-[8px] font-black uppercase rounded">Prioridade</span>
                    )}
                  </div>
                  {bestZone && (
                    <div className="flex items-center gap-1.5">
                      <MapPin size={10} className="text-zinc-500" />
                      <span className="text-[9px] font-black text-zinc-500 uppercase">
                        {bestZone.label}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm font-bold text-zinc-100 leading-tight">
                  {decision.message}
                </p>
                {decision.action === 'move_now' && navigation && (
                  <div className="mt-2 flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-wider">
                    <Navigation size={12} />
                    <span>Siga para o {navigation.cardinalDirection} • {navigation.distanceKm.toFixed(1)}km</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {heatmapData.length === 0 && (
          <div className="absolute inset-0 z-[1002] pointer-events-none flex flex-col items-center justify-center p-8 text-center bg-black/60 backdrop-blur-sm">
            <AlertCircle size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Dados Insuficientes</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-2 max-w-[200px]">
              Continue rodando com o rastreamento ativo para gerar seu mapa de calor de performance.
            </p>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container {
          background: #0B0B0B !important;
        }
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .custom-popup .leaflet-popup-content-wrapper {
          background: #18181b;
          color: white;
          border-radius: 12px;
          padding: 0;
        }
        .custom-popup .leaflet-popup-tip {
          background: #18181b;
        }
        .leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}} />
    </div>
  );
};

const ControlButton = ({ active, onClick, icon, label, color }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
      active 
        ? `bg-${color}-500 text-white` 
        : "text-zinc-500 hover:bg-zinc-800"
    )}
  >
    {icon}
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const TimeButton = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all text-center",
      active 
        ? "bg-white text-black" 
        : "text-zinc-500 hover:bg-zinc-800"
    )}
  >
    {label}
  </button>
);

export default StrategicMap;
