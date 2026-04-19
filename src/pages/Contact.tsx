import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Send, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, Input, Card, CardContent } from '../components/UI';

export const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    // Simular envio
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="min-h-screen bg-black text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="max-w-4xl mx-auto px-6 py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-500 transition-colors font-black text-xs uppercase tracking-[0.2em] mb-12 group">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao Início
        </Link>

        <div className="grid lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-12"
          >
            <header className="space-y-4">
              <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 mb-4">
                <MessageCircle size={32} />
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white">Contato</h1>
              <p className="text-zinc-500 font-medium text-lg leading-relaxed">
                Precisa de ajuda com suas métricas ou quer saber mais sobre o DriverDash? Nossa equipe está pronta para te atender.
              </p>
            </header>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 flex items-center justify-center text-emerald-500 border border-zinc-800">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 leading-none mb-1">E-mail Comercial</p>
                  <p className="text-white font-bold">contato@ntaplicacoes.com.br</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="bg-zinc-900/50 border-zinc-800 rounded-[2.5rem] backdrop-blur-xl overflow-hidden shadow-2xl">
              <CardContent className="p-8 space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Seu Nome</label>
                    <Input 
                      className="h-14 bg-zinc-800/50 border-none rounded-2xl font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50" 
                      placeholder="Ex: Ricardo Silva"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">E-mail para Resposta</label>
                    <Input 
                      type="email"
                      className="h-14 bg-zinc-800/50 border-none rounded-2xl font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50" 
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Mensagem</label>
                    <textarea 
                      className="w-full min-h-[120px] p-4 bg-zinc-800/50 border-none rounded-2xl font-bold text-white placeholder:text-zinc-600 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all" 
                      placeholder="Como podemos ajudar?"
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-16 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-2xl shadow-lg shadow-emerald-500/10 transition-all flex items-center justify-center gap-3"
                    disabled={sent}
                  >
                    {sent ? (
                      <>Mensagem Enviada!</>
                    ) : (
                      <>
                        <Send size={18} />
                        Enviar Mensagem
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
