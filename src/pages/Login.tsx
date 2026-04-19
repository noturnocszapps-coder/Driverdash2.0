import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDriverStore } from '../store';
import { UserRole, UserStatus } from '../types';
import { Card, CardContent, Button, Input } from '../components/UI';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { getFriendlyErrorMessage } from '../utils';

export const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useDriverStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = isEmailValid(email) && password.length >= 6;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: data.user.user_metadata.name,
          role: data.user.user_metadata.role || UserRole.DRIVER,
          status: data.user.user_metadata.status || UserStatus.ACTIVE,
        });
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center p-6 py-12 relative overflow-y-auto font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-600 hover:text-emerald-500 transition-all font-black text-[10px] uppercase tracking-[0.3em] mb-8 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Voltar ao Início</span>
          </Link>
          
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-[1.25rem] flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] rotate-3 font-black text-3xl text-black">
              D
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 italic">DriverDash</h1>
          <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest">Acesso Restrito Professional</p>
        </div>

        <Card className="border border-white/5 bg-zinc-950/50 backdrop-blur-2xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="email" 
                    className="h-14 pl-12 bg-zinc-900/50 border border-white/5 rounded-2xl font-bold text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all outline-none" 
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Senha de Acesso</label>
                  <Link to="/forgot-password" title="Esqueci minha senha" className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                    Recuperar
                  </Link>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="password" 
                    className="h-14 pl-12 bg-zinc-900/50 border border-white/5 rounded-2xl font-bold text-white placeholder:text-zinc-700 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all outline-none" 
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-3" 
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    <span>Autenticar</span>
                  </>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-white/5 text-center">
              <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">
                Ainda não tem acesso? <br />
                <Link to="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors mt-2 inline-block">Solicite sua conta gratuita</Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-30">
            <ShieldCheck size={14} className="text-zinc-500" />
            <span className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-500">
              End-to-End Encryption Enabled
            </span>
          </div>
          <p className="text-zinc-800 text-[9px] font-bold uppercase tracking-[0.2em]">
            Developer and Maintained by NT APLICAÇÕES
          </p>
        </div>
      </motion.div>
    </div>
  );
};
