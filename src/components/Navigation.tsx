import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Car, BarChart3, Settings, LogOut, LogIn, User, DollarSign, Navigation as NavIcon, FlaskConical, Zap } from 'lucide-react';
import { cn } from '../utils';
import { useDriverStore } from '../store';
import { supabase } from '../lib/supabase';
import { SyncIndicator } from './SyncIndicator';
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
    items.push({ icon: FlaskConical, label: 'Laboratório', path: '/dev-lab' });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-200/50 dark:border-zinc-800/50 px-4 pb-safe pt-2 z-50">
      <div className="flex justify-between items-center max-w-lg mx-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "relative flex flex-col items-center gap-1 flex-1 py-1 transition-all active:scale-95 min-w-0",
                isActive ? "text-emerald-500" : "text-zinc-500 dark:text-zinc-400"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="bottomNavActive"
                  className="absolute -top-2 left-0 right-0 h-0.5 bg-emerald-500 rounded-full mx-auto w-4"
                />
              )}
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[8px] font-bold uppercase tracking-widest leading-none">{item.label}</span>
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
    <aside className="flex flex-col w-72 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 h-[100dvh] sticky top-0">
      <div className="p-8 flex flex-col gap-6">
        <h1 className="text-2xl font-black text-zinc-900 dark:text-white flex items-center gap-3 tracking-tighter">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20 font-black text-xl">
            D
          </div>
          DriverDash Beta
        </h1>
        <SyncIndicator />
      </div>

      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all group",
                isActive 
                  ? "bg-emerald-500 text-zinc-950 font-black shadow-lg shadow-emerald-500/10" 
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-sm font-bold tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
        {user ? (
          <div className="space-y-4">
            <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center gap-3 border border-zinc-100 dark:border-zinc-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 font-black">
                {settings.name?.charAt(0) || '?'}
              </div>
              <div className="flex flex-col overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tight truncate">{settings.name || 'Motorista'}</span>
                  {isAdmin && (
                    <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded-md uppercase tracking-widest border border-emerald-500/20">
                      Admin
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-bold text-zinc-400 truncate uppercase tracking-wider">{user.email}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/5 font-bold transition-all"
            >
              <LogOut size={20} />
              <span className="text-sm">Sair da Conta</span>
            </button>
          </div>
        ) : (
          <Link 
            to="/login"
            className="flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-500 text-zinc-950 font-black hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10"
          >
            <LogIn size={20} />
            <span className="text-sm">Entrar Agora</span>
          </Link>
        )}
      </div>
    </aside>
  );
};
