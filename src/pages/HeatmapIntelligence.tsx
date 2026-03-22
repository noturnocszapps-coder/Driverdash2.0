import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useDriverStore } from '../store';
import { generateHeatmapData, HeatmapPoint } from '../utils';
import { ChevronLeft, Map as MapIcon, Info, Zap, Clock, AlertCircle, Filter } from 'lucide-react';
import { Button, Card, CardContent } from '../components/UI';
import { motion, AnimatePresence } from 'motion/react';

// Fix for Leaflet default icon issues in Vite
import 'leaflet/dist/leaflet.css';

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

const HeatmapIntelligence = () => {
  const navigate = useNavigate();
  const { cycles } = useDriverStore();
  const [filter, setFilter] = useState<'all' | 'idle' | 'productive'>('all');

  const heatmapData = useMemo(() => {
    return generateHeatmapData(cycles);
  }, [cycles]);

  const filteredData = useMemo(() => {
    if (filter === 'all') return heatmapData;
    return heatmapData.filter(p => p.type === filter);
  }, [heatmapData, filter]);

  const stats = useMemo(() => {
    const idleCount = heatmapData.filter(p => p.type === 'idle').length;
    const productiveCount = heatmapData.filter(p => p.type === 'productive').length;
    return { idleCount, productiveCount };
  }, [heatmapData]);

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-white flex flex-col">
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
              <h1 className="text-lg font-bold">Mapa de Calor</h1>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-wider rounded border border-emerald-500/20">
                IA Intelligence
              </span>
            </div>
            <p className="text-xs text-zinc-500">Zonas de produtividade e espera</p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 flex gap-2 bg-[#0B0B0B] border-b border-zinc-800 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${filter === 'all' ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
        >
          Todos
        </button>
        <button 
          onClick={() => setFilter('productive')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${filter === 'productive' ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
        >
          <Zap size={10} />
          Produtivos
        </button>
        <button 
          onClick={() => setFilter('idle')}
          className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${filter === 'idle' ? 'bg-rose-500 text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
        >
          <Clock size={10} />
          Espera
        </button>
      </div>

      {/* Map Container */}
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
          
          {filteredData.map((point, idx) => (
            <CircleMarker
              key={`${point.lat}-${point.lng}-${idx}`}
              center={[point.lat, point.lng]}
              radius={8 + (point.intensity * 12)}
              fillColor={point.type === 'productive' ? '#10b981' : '#f43f5e'}
              color="transparent"
              fillOpacity={0.2 + (point.intensity * 0.6)}
            />
          ))}

          {filteredData.length > 0 && <MapAutoCenter points={filteredData} />}
        </MapContainer>

        {heatmapData.length === 0 && (
          <div className="absolute inset-0 z-[999] pointer-events-none flex flex-col items-center justify-center p-8 text-center bg-black/60 backdrop-blur-sm">
            <AlertCircle size={48} className="text-zinc-700 mb-4" />
            <p className="text-zinc-400 font-black uppercase tracking-widest text-xs">Dados Insuficientes</p>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mt-2 max-w-[200px]">
              Continue rodando com o rastreamento ativo para gerar seu mapa de calor.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-4 right-4 z-[1000] space-y-3">
          <div className="flex justify-between items-end">
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
          </div>

          <Card className="bg-black/80 backdrop-blur-md border-zinc-800 shadow-2xl">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Zap size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Dica de IA</p>
                <p className="text-[11px] font-bold text-zinc-300 leading-relaxed">
                  As zonas verdes mostram onde você mais fatura. Tente se posicionar próximo a elas quando estiver sem chamadas.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container {
          background: #0B0B0B !important;
        }
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default HeatmapIntelligence;
