import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card, CardContent, Button, Input } from '../components/UI';
import { Mail, AlertCircle, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) throw resetError;
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-600 transition-colors mb-8">
            <ArrowLeft size={16} />
            <span>Voltar para Login</span>
          </Link>
          <h1 className="text-3xl font-bold text-emerald-600">Recuperar Senha</h1>
          <p className="text-zinc-500 mt-2">Enviaremos um link para o seu e-mail</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {success ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle size={32} />
                </div>
                <h3 className="text-lg font-bold">E-mail enviado!</h3>
                <p className="text-sm text-zinc-500">
                  Verifique sua caixa de entrada para redefinir sua senha.
                </p>
                <Button onClick={() => navigate('/login')} className="w-full bg-emerald-600">
                  Voltar para Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                    <AlertCircle size={18} />
                    <span>{error}</span>
                  </div>
                )}

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

                <Button type="submit" className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-bold" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : 'Enviar Link de Recuperação'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
