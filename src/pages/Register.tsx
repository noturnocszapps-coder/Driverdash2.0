import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useDriverStore } from '../store';
import { UserRole, UserStatus } from '../types';
import { Card, CardContent, Button, Input } from '../components/UI';
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { getFriendlyErrorMessage } from '../utils';

export const Register = () => {
  const navigate = useNavigate();
  const { setUser } = useDriverStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormValid = name.trim().length > 0 && isEmailValid(email) && password.length >= 6;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (authError) throw authError;

      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email!,
          name: name,
          role: UserRole.DRIVER,
          status: UserStatus.ACTIVE,
        });
        toast.success('Conta criada com sucesso! Verifique seu e-mail para confirmar.');
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 py-12 overflow-y-auto">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-600 transition-colors mb-8">
            <ArrowLeft size={16} />
            <span>Voltar para Login</span>
          </Link>
          <h1 className="text-3xl font-bold text-emerald-600">Criar Conta</h1>
          <p className="text-zinc-500 mt-2">Comece a sincronizar seus dados na nuvem</p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleRegister} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Nome Completo</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    type="text" 
                    className="pl-10" 
                    placeholder="Seu nome"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">E-mail</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    type="email" 
                    className="pl-10" 
                    placeholder="seu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-500 uppercase">Senha</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    type="password" 
                    className="pl-10" 
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold" 
                disabled={loading || !isFormValid}
              >
                {loading ? <Loader2 className="animate-spin" /> : <><UserPlus size={20} className="mr-2" /> Criar Conta</>}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-500">
                Já tem uma conta? <Link to="/login" className="text-emerald-600 font-bold hover:underline">Entrar</Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
