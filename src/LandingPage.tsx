import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  TrendingUp, 
  Smartphone, 
  Zap, 
  DollarSign,
  Activity,
  LayoutDashboard,
  Navigation,
  RefreshCw,
  Gauge,
  Target,
  ChevronRight,
  ArrowRight,
  BarChart3,
  Globe,
  Lock,
  PieChart,
  Eye,
  EyeOff,
  Info,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './components/UI';
import { useDriverStore } from './store';
import { cn } from './utils';

const FloatingDashboardCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 1.5, 
      delay, 
      ease: [0.16, 1, 0.3, 1]
    }}
    className={cn(
      "bg-zinc-900/40 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
      className
    )}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-[2.5rem]" />
    <div className="relative z-10">
      {children}
    </div>
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.8, delay }}
    className="group relative p-10 rounded-[3rem] bg-zinc-900/50 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 transition-all duration-500 overflow-hidden"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative z-10">
      <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-8 text-indigo-400 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.2)] transition-all">
        <Icon size={32} strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tighter font-display">{title}</h3>
      <p className="text-base text-zinc-400 leading-relaxed font-medium">{description}</p>
    </div>
  </motion.div>
);

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useDriverStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
    }
  } as any;

  return (
    <div className="min-h-dvh bg-black text-zinc-100 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-x-hidden font-sans">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Atmosphere Glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[100%] h-[80%] bg-indigo-500/10 blur-[150px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[60%] h-[60%] bg-violet-500/5 blur-[120px] rounded-full" />
        
        {/* Texture & Grain */}
        <div className="absolute inset-0 opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

        {/* Futuristic Grid */}
        <div 
          className="absolute inset-0 opacity-[0.05]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)`,
            backgroundSize: '100px 100px',
            maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 90%)'
          }} 
        />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-24 md:h-28 bg-black/80 backdrop-blur-3xl border-b border-white/5 z-50 py-4 md:py-6">
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 group cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.5)] group-hover:scale-110 transition-transform duration-500">
              <Activity className="text-white" size={24} strokeWidth={3} />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white font-display italic">DriverDash</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-10">
            {[
              { label: 'Tecnologia', path: '#recursos' },
              { label: 'Analytics', path: '/analytics-pro' },
              { label: 'Contato', path: '/contact' }
            ].map((item) => (
              item.path.startsWith('#') ? (
                <a key={item.label} href={item.path} className="text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-all">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.path} className="text-[11px] font-black uppercase tracking-widest text-zinc-500 hover:text-indigo-400 transition-all">
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center gap-6">
            {!user ? (
              <>
                <Link to="/login" className="text-[11px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link to="/register">
                  <Button className="h-12 px-8 text-[11px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 border-none rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95">
                    Acessar Suite
                  </Button>
                </Link>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="h-12 px-8 text-[11px] font-black uppercase tracking-widest bg-indigo-600 text-white hover:bg-indigo-500 border-none rounded-2xl shadow-xl shadow-indigo-500/20"
              >
                Painel Elite
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 lg:pt-60 lg:pb-32 flex flex-col items-center px-6 overflow-hidden">
        {/* Background Image Accent - Minimalist & High Tech */}
        <div className="absolute top-[20%] right-[-10%] w-[50%] h-[60%] opacity-20 pointer-events-none">
          <img 
            src="https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&q=80&w=1200" 
            alt="Interior premium" 
            className="w-full h-full object-cover grayscale blur-sm mask-radial"
          />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-20 items-center relative z-10"
        >
          <div className="text-center lg:text-left space-y-10">
            <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.85] text-white font-display">
              Assuma o <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-indigo-500 to-violet-600 drop-shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                Controle.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-xl md:text-2xl text-zinc-400 font-bold tracking-tight max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Analytics de precisão e controle de lucratividade para quem não aceita ser apenas mais um no trânsito.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-20 px-16 text-xs font-black uppercase tracking-[0.4em] w-full bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-[0_20px_50px_rgba(79,70,229,0.4)] rounded-[2.5rem] group transition-all border-none">
                  DOMINAR MEUS LUCROS
                  <ArrowRight size={20} className="ml-4 group-hover:translate-x-3 transition-transform duration-500" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* iPhone 16 Pro Mockup Display */}
          <div className="relative h-[700px] w-full hidden lg:flex items-center justify-center">
            {/* Ambient Glow */}
            <div className="absolute inset-0 bg-indigo-500/10 blur-[120px] rounded-full scale-110" />
            
            {/* Phone Mockup Frame */}
            <div className="relative w-[320px] h-[650px] bg-zinc-950 rounded-[4rem] border-[10px] border-zinc-800 shadow-[0_50px_100px_rgba(0,0,0,0.8)] overflow-hidden">
              {/* Dynamic Island */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-8 bg-black rounded-full z-30" />
              
              {/* Screen Content - Emulating CarPlay UI */}
              <div className="relative h-full bg-black flex flex-col p-6 pt-16 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Turno em Curso</p>
                    <p className="text-3xl font-display font-black text-white italic">06:42:04</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 animate-pulse">
                    <Gauge size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-3xl bg-zinc-900/80 border border-white/5 space-y-2">
                    <p className="text-[9px] font-black text-zinc-500 uppercase">Lucro Proj.</p>
                    <p className="text-xl font-display font-black text-white italic">R$ 428</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-indigo-500/5 border border-indigo-500/20 space-y-2">
                    <p className="text-[9px] font-black text-indigo-400 uppercase">Lucro/KM</p>
                    <p className="text-xl font-display font-black text-indigo-400 italic">R$ 2,48</p>
                  </div>
                </div>

                <div className="flex-1 bg-zinc-900/50 rounded-[2.5rem] border border-white/5 p-6 flex flex-col justify-end gap-6 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://images.unsplash.com/photo-1542281286-9e0a16bb7366?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center grayscale" />
                   <div className="relative z-10 space-y-1">
                     <p className="text-[9px] font-black text-zinc-500 uppercase">Performance Total</p>
                     <div className="flex items-end gap-1.5 h-20">
                       {[0.3, 0.6, 0.4, 0.8, 0.5, 0.9, 0.7].map((h, i) => (
                         <div key={i} className="flex-1 rounded-t-lg bg-indigo-500/40" style={{ height: `${h * 100}%` }} />
                       ))}
                     </div>
                   </div>
                </div>
              </div>
            </div>

            {/* Overlapping Glass Analytics Card */}
            <motion.div 
               animate={{ y: [0, -10, 0] }}
               transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
               className="absolute top-[10%] right-[-15%] p-6 rounded-[2.5rem] bg-indigo-950/20 backdrop-blur-3xl border border-indigo-500/30 shadow-2xl z-20 w-72"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-black flex items-center justify-center">
                  <TrendingUp size={20} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-xs font-display font-black text-white italic">Elite Analytics</p>
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">+18% Profit</p>
                </div>
              </div>
              <div className="space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full bg-indigo-500/40" style={{ width: `${90 - (i * 15)}%` }} />
                   </div>
                 ))}
              </div>
            </motion.div>

            {/* Float Badge */}
            <motion.div 
              animate={{ y: [0, 15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] left-[-10%] px-5 py-3 rounded-full bg-black/60 backdrop-blur-2xl border border-white/10 shadow-2xl flex items-center gap-3 z-30"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Sync Global Ativo</p>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Strategic Stats */}
      <section className="py-20 border-y border-white/5 bg-zinc-900/20 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/[0.02] via-transparent to-violet-500/[0.02]" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'Precisão Analítica', value: '99.9%', icon: Shield },
              { label: 'Drivers de Elite', value: '5k+', icon: Globe },
              { label: 'Ganhos Otimizados', value: 'R$ 8M+', icon: DollarSign },
              { label: 'Protocolo de Dados', value: 'AES-256', icon: Lock },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="inline-flex p-3 rounded-2xl bg-indigo-500/5 text-indigo-400 mb-4 group-hover:scale-110 group-hover:bg-indigo-500/10 transition-all duration-500">
                  <stat.icon size={24} strokeWidth={1.5} />
                </div>
                <p className="text-4xl lg:text-5xl font-black text-white italic font-display">{stat.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mt-2">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Arsenal Section */}
      <section id="recursos" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-12 mb-24">
            <div className="max-w-3xl space-y-6">
              <h2 className="text-[11px] font-black uppercase tracking-widest text-indigo-500">Suite Profissional</h2>
              <p className="text-5xl md:text-7xl font-black tracking-tighter text-white leading-[0.85] font-display">
                O Próximo Passo na sua <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-600 underline-glow">Monitoria Pro.</span>
              </p>
            </div>
            <p className="text-lg text-zinc-500 font-bold max-w-sm leading-relaxed italic">
              Integramos telemetria financeira avançada com inteligência competitiva para você faturar no topo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Gauge}
              title="Telemetria Financeira"
              description="Acompanhamento via GPS ultracontrolado que separa KM produtivo de ocioso com 99% de precisão."
              delay={0.1}
            />
            <FeatureCard 
              icon={BarChart3}
              title="Célula de Inteligência"
              description="Saiba exatamente o que resta após cada tanque. Previsibilidade total de impostos, taxas e custos de vida."
              delay={0.2}
            />
            <FeatureCard 
              icon={LayoutDashboard}
              title="Dashboard Elite"
              description="Interface em estilo Dark Mode Pro inspirada em painéis esportivos de alta performance. Dados densos, leitura instantânea."
              delay={0.3}
            />
            <FeatureCard 
              icon={RefreshCw}
              title="Nuvem Híbrida Sync"
              description="Backup instântaneo e persistente. Seus dados moram no servidor, protegidos por criptografia de nível bancário."
              delay={0.4}
            />
            <FeatureCard 
              icon={Smartphone}
              title="Experiência Mobile Pro"
              description="Aplicação Web Progressiva de alta performance. Sem downloads, sem distrações. Apenas produtividade."
              delay={0.5}
            />
            <FeatureCard 
              icon={Smartphone}
              title="Monitor de Alvo"
              description="Defina metas agressivas e visualize seu progresso em tempo real com alertas inteligentes de gap."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Premium Testimonial */}
      <section className="py-40 bg-zinc-950/80 relative overflow-hidden backdrop-blur-3xl">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="max-w-5xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-12">
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => <Zap key={i} size={20} className="text-indigo-500 fill-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />)}
            </div>
            
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-white italic leading-[1.1] font-display">
              "Para ser profissional, você precisa de ferramentas profissionais. O DriverDash parou de ser 'mais um app' e virou meu assistente estratégico."
            </h2>
            
            <div className="flex items-center gap-6 p-4 rounded-3xl bg-white/5 border border-white/5">
              <div className="w-20 h-20 rounded-[1.5rem] bg-indigo-500/20 border border-indigo-500/30 p-1 flex items-center justify-center overflow-hidden">
                 <div className="w-full h-full rounded-[1.2rem] bg-indigo-950 flex items-center justify-center font-black text-2xl text-indigo-400 italic">RM</div>
              </div>
              <div className="text-left">
                <p className="text-xl font-black text-white italic font-display">Ricardo M.</p>
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-1">Status: Operador de Elite (5.0★)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Tactical CTA */}
      <section className="py-60 relative overflow-hidden flex justify-center px-6 text-center">
        <div className="absolute inset-0 bg-indigo-500/[0.03] mix-blend-color-dodge pointer-events-none" />
        <div className="max-w-5xl space-y-16 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-6xl md:text-9xl font-black tracking-tighter text-white leading-[0.8] font-display">
              Pronto para o Próximo <br />
              <span className="text-indigo-500 italic drop-shadow-[0_0_30px_rgba(99,102,241,0.3)]">Nível Elite?</span>
            </h2>
            <p className="text-2xl text-zinc-500 font-bold max-w-2xl mx-auto leading-relaxed italic">
              Não seja apenas mais um motorista. Seja o dono da sua própria empresa e domine seus ganhos agora.
            </p>
          </motion.div>
          
          <div className="flex flex-col items-center gap-8">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="h-24 px-20 text-sm font-black uppercase tracking-widest md:tracking-[0.5em] w-full bg-white text-black hover:bg-indigo-500 hover:text-white rounded-[3rem] shadow-[0_30px_100px_rgba(255,255,255,0.1)] transition-all duration-700 hover:scale-105 active:scale-95 border-none">
                LIBERAR MEU ACESSO
              </Button>
            </Link>
            <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-700">
              <span>NENHUM CARTÃO NECESSÁRIO</span>
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/20" />
              <span>7 DIAS DE ACESSO TOTAL</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Pro */}
      <footer className="py-24 border-t border-white/5 bg-zinc-950">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-20">
            <div className="space-y-8 lg:col-span-1">
              <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg text-white">
                  D
                </div>
                <span className="text-2xl font-black tracking-tighter text-white font-display italic">DriverDash</span>
              </div>
              <p className="text-xs font-bold text-zinc-500 leading-relaxed uppercase tracking-wider">
                Performance Analytics Suite Pro. <br />
                A ferramenta definitiva para rentabilidade profissional na Gig Economy.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-12 lg:col-span-2">
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Ecossistema</p>
                <div className="flex flex-col gap-4">
                  <Link to="/login" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Acesso Driver</Link>
                  <Link to="/register" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Registro Pro</Link>
                  <Link to="/analytics-pro" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Analytics Pro</Link>
                </div>
              </div>
              <div className="space-y-6">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Privacidade</p>
                <div className="flex flex-col gap-4">
                  <Link to="/terms" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Termos de Uso</Link>
                  <Link to="/privacy" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Segurança</Link>
                  <Link to="/contact" className="text-[11px] font-black text-zinc-500 hover:text-indigo-400 uppercase tracking-widest transition-colors">Compliance</Link>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Suporte Direto</p>
                <Link to="/contact" className="text-sm font-black text-white hover:text-indigo-400 transition-colors uppercase tracking-widest underline decoration-indigo-500/30">Falar com Consultoria</Link>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-700 leading-relaxed">
                Desenvolvido por <br />
                <a href="https://www.ntaplicacoes.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors">NT APLICAÇÕES & CO</a><br />
                © 2026 PREMIUM SOLUTIONS.
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
