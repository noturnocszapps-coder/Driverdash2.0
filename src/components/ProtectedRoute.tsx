import React from 'react';
import { Navigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { UserStatus } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, settings } = useDriverStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check for blocked or suspended status
  if (settings.status === UserStatus.BLOCKED || settings.status === UserStatus.SUSPENDED) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-zinc-900 border border-red-500/20 rounded-[2.5rem] p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20 mx-auto mb-6">
            <span className="text-red-500 text-2xl font-black">!</span>
          </div>
          <h1 className="text-2xl font-black text-white mb-2">Conta Restrita</h1>
          <p className="text-zinc-400 text-sm leading-relaxed mb-8">
            Sua conta está temporariamente {settings.status === UserStatus.BLOCKED ? 'bloqueada' : 'suspensa'}. 
            Entre em contato com o suporte para mais informações.
          </p>
          <button 
            onClick={() => useDriverStore.getState().setUser(null)}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-2xl transition-all"
          >
            Sair da Conta
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
