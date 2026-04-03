import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDriverStore } from '../store';
import { UserRole, UserStatus } from '../types';
import { Card, CardContent, Button, Input } from '../components/UI';
import { LogIn, Mail, Lock, AlertCircle, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

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
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md z-10"
      >
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-400 transition-all font-bold text-xs uppercase tracking-widest mb-8 group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            <span>Voltar ao Início</span>
          </Link>
          
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3 font-black text-3xl text-zinc-950">
              D
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2">DriverDash</h1>
          <p className="text-zinc-400 font-medium">Sua conta segura para controle financeiro</p>
        </div>

        <Card className="border-none bg-zinc-900/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-bold"
                >
                  <AlertCircle size={18} className="shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">E-mail</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="email" 
                    className="h-14 pl-12 bg-zinc-800/50 border-none rounded-2xl font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50 transition-all" 
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Senha</label>
                  <Link to="/forgot-password" title="Esqueci minha senha" className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-400 transition-colors">
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    type="password" 
                    className="h-14 pl-12 bg-zinc-800/50 border-none rounded-2xl font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50 transition-all" 
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100" 
                disabled={loading || !isFormValid}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <div className="flex items-center gap-3">
                    <LogIn size={20} />
                    <span>Entrar na Conta</span>
                  </div>
                )}
              </Button>
            </form>

            <div className="mt-10 pt-8 border-t border-zinc-800 text-center">
              <p className="text-zinc-400 font-bold text-sm">
                Novo por aqui? <Link to="/register" className="text-emerald-500 hover:text-emerald-400 transition-colors">Crie sua conta grátis</Link>
              </p>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center mt-8 text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em]">
          DriverDash Secure Access
        </p>
      </motion.div>
    </div>
  );
};
