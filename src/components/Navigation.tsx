import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, BarChart3, Settings, LogOut, LogIn, User, DollarSign, Navigation as NavIcon, FlaskConical, Zap } from 'lucide-react';
import { cn } from '../utils';
import { useDriverStore } from '../store';
import { supabase } from '../lib/supabase';
import { SyncIndicator } from './SyncIndicator';
import { InstallAppButton } from './InstallAppButton';
import { motion } from 'motion/react';
import { UserRole } from '../types';

import { useIsMobile } from '../hooks/useIsMobile';

const navItems = [
  { icon: LayoutDashboard, label: 'Início', path: '/dashboard' },
  { icon: DollarSign, label: 'Fechamento', path: '/faturamento' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Ajustes', path: '/settings' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { settings } = useDriverStore();
  const isMobile = useIsMobile();
  
  if (!isMobile) return null;
  
  const isAdmin = settings.role === UserRole.ADMIN;
  const items = [...navItems];
  
  if (isAdmin) {
    items.push({ icon: FlaskConical, label: 'Lab', path: '/dev-lab' });
  }

  return (
    <nav className="fixed bottom-6 left-6 right-6 h-22 bg-[#0B0C10]/80 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-8 pb-safe pt-2 z-50 shadow-2xl">
      <div className="flex justify-between items-center h-full max-w-lg mx-auto w-full gap-4">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "relative flex flex-col items-center justify-center gap-2 flex-1 h-full transition-all active:scale-90 min-w-0 py-2",
                isActive ? "text-[#00FFBB]" : "text-zinc-500"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottomNavActive"
                  className="absolute -top-1 w-8 h-1.5 bg-[#00FFBB] rounded-full shadow-[0_0_20px_rgba(0,255,187,0.6)]"
                />
              )}
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 1.5} className="shrink-0" />
              <span className={cn(
                "text-[7px] font-black uppercase tracking-[0.2em] leading-none no-wrap w-full text-center px-0.5 transition-colors",
                isActive ? "text-[#00FFBB]" : "text-zinc-600"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, settings } = useDriverStore();
  const isMobile = useIsMobile();

  if (isMobile) return null;

  const isAdmin = settings.role === UserRole.ADMIN;
  const items = [...navItems];
  
  if (isAdmin) {
    items.push({ icon: FlaskConical, label: 'Laboratório', path: '/dev-lab' });
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <aside className="flex flex-col w-[320px] bg-[#0B0C10]/60 backdrop-blur-3xl border-r border-white/5 h-[calc(100dvh-48px)] sticky top-6 ml-6 mr-10 rounded-[2.5rem] shadow-2xl shrink-0">
      <div className="p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-black text-white flex items-center gap-4 tracking-tighter italic">
          <div className="w-12 h-12 bg-[#00FFBB] rounded-2xl flex items-center justify-center text-zinc-950 shadow-[0_0_30px_rgba(0,255,187,0.3)] font-black text-2xl">
            D
          </div>
          DriverDash Pro
        </h1>
        <SyncIndicator />
      </div>

      <nav className="flex-1 px-4 space-y-3 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex items-center gap-5 px-6 py-5 rounded-[1.5rem] transition-all group relative overflow-hidden",
                isActive 
                  ? "bg-[#00FFBB]/5 text-[#00FFBB] font-black border border-[#00FFBB]/20" 
                  : "text-zinc-500 hover:bg-white/5 hover:text-white"
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#00FFBB] rounded-r-full shadow-[0_0_15px_rgba(0,255,187,0.5)]" />
              )}
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
            </Link>
          );
        })}
        
        <div className="pt-6 px-2">
          <InstallAppButton variant="full" className="bg-white/5 hover:bg-white/10 border border-white/5" />
        </div>
      </nav>

      <div className="p-8 border-t border-white/5">
        {user ? (
          <div className="space-y-6">
            <div className="px-5 py-4 bg-white/5 rounded-[1.5rem] flex items-center gap-4 border border-white/5">
              <div className="w-12 h-12 rounded-xl bg-[#00FFBB]/10 flex items-center justify-center text-[#00FFBB] font-black text-xl shadow-inner">
                {settings.name?.charAt(0) || '?'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tight truncate text-white italic">{settings.name || 'Operador Elite'}</span>
                  {isAdmin && (
                    <span className="text-[7px] font-black bg-[#00FFBB]/10 text-[#00FFBB] px-2 py-0.5 rounded-md uppercase tracking-[0.2em] border border-[#00FFBB]/20">
                      ADMIN
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-zinc-500 truncate uppercase tracking-widest">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-red-500/80 hover:bg-red-500/10 hover:text-red-500 font-black uppercase tracking-widest text-xs transition-all border border-transparent hover:border-red-500/20"
            >
              <LogOut size={20} />
              <span>Desligar Sistema</span>
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center justify-center gap-3 px-6 py-5 rounded-[1.5rem] bg-[#00FFBB] text-zinc-950 font-black uppercase tracking-widest hover:bg-[#00e6a9] transition-all shadow-[0_0_30px_rgba(0,255,187,0.3)]"
          >
            <LogIn size={20} />
            <span className="text-xs">Acessar Suite</span>
          </Link>
        )}
      </div>
    </aside>
  );
};
