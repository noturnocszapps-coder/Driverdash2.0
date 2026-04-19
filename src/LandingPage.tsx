import React from 'react';
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
  PieChart
} from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from './components/UI';
import { useDriverStore } from './store';
import { cn } from './utils';

const FloatingDashboardCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 40, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ 
      duration: 1.2, 
      delay, 
      ease: [0.16, 1, 0.3, 1],
      scale: {
        duration: 4,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }}
    className={cn(
      "bg-zinc-900/80 backdrop-blur-2xl border border-emerald-500/20 rounded-[2rem] p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)]",
      className
    )}
  >
    {children}
  </motion.div>
);

const FeatureCard = ({ icon: Icon, title, description, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="group relative p-8 rounded-[2.5rem] bg-zinc-900 border border-white/5 hover:border-emerald-500/30 transition-all"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]" />
    <div className="relative z-10">
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all">
        <Icon size={28} />
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed font-medium">{description}</p>
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
    <div className="min-h-screen bg-black text-zinc-100 selection:bg-emerald-500/30 selection:text-emerald-400 overflow-x-hidden font-sans pt-6">
      {/* Cinematic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[70%] bg-emerald-500/5 blur-[180px] rounded-full animate-pulse" />
        
        {/* Futuristic Grid */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ 
            backgroundImage: `linear-gradient(to right, #10b981 1px, transparent 1px), linear-gradient(to bottom, #10b981 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
            maskImage: 'radial-gradient(circle at 50% 50%, black, transparent 80%)'
          }} 
        />
      </div>

      {/* Header */}
      <header className="fixed top-6 left-0 right-0 h-20 bg-black/40 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-8 h-full flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">
              <Activity className="text-black" size={20} strokeWidth={3} />
            </div>
            <span className="text-xl font-black tracking-tight text-white italic">DriverDash</span>
          </div>
          
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { label: 'Recursos', path: '#recursos' },
              { label: 'Termos', path: '/terms' },
              { label: 'Privacidade', path: '/privacy' },
              { label: 'Contato', path: '/contact' }
            ].map((item) => (
              item.path.startsWith('#') ? (
                <a key={item.label} href={item.path} className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-emerald-400 transition-colors">
                  {item.label}
                </a>
              ) : (
                <Link key={item.label} to={item.path} className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-emerald-400 transition-colors">
                  {item.label}
                </Link>
              )
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {!user ? (
              <>
                <Link to="/login" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white px-4">
                  Login
                </Link>
                <Link to="/register">
                  <Button className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-emerald-400 hover:text-black border-none rounded-full shadow-lg shadow-white/5 transition-all">
                    Começar
                  </Button>
                </Link>
              </>
            ) : (
              <Button 
                onClick={() => navigate('/dashboard')}
                className="h-10 px-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:bg-emerald-400 border-none rounded-full"
              >
                Painel
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 lg:pt-48 lg:pb-24 flex flex-col items-center px-8">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10"
        >
          <div className="text-center lg:text-left space-y-8">
            <motion.div variants={itemVariants} className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] backdrop-blur-md">
              <Zap size={12} className="animate-pulse" />
              Sua evolução profissional começa aqui
            </motion.div>
            
            <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[0.9] text-white">
              Seu Próximo <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 drop-shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                Nível.
              </span>
            </motion.h1>
            
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-zinc-400 font-bold tracking-tight max-w-xl mx-auto lg:mx-0">
              Controle financeiro e performance de elite para motoristas autônomos.
            </motion.p>
            
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="h-16 px-12 text-xs font-black uppercase tracking-[0.3em] w-full bg-emerald-500 text-black hover:bg-emerald-400 hover:scale-105 shadow-[0_0_50px_rgba(16,185,129,0.3)] rounded-full group transition-all border-none">
                  INICIAR AGORA
                  <ArrowRight size={18} className="ml-3 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Floating Visual Mockups */}
          <div className="relative h-[500px] w-full hidden lg:block">
            {/* Main Center Card */}
            <FloatingDashboardCard className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] z-20 border-emerald-500/40">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Lucro por KM</p>
                  <p className="text-3xl font-black text-white italic">R$ 2,48</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '75%' }}
                    transition={{ duration: 2, delay: 1 }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  <span>Meta Diária</span>
                  <span className="text-emerald-400">75% Atingida</span>
                </div>
              </div>
            </FloatingDashboardCard>

            {/* Left Card */}
            <FloatingDashboardCard className="absolute top-10 left-0 w-60 z-10 border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]" delay={0.3}>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign size={16} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Economia</p>
              </div>
              <p className="text-xl font-black text-emerald-400">+ R$ 420</p>
              <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1">Otimização de Rota</p>
            </FloatingDashboardCard>

            {/* Right Card */}
            <FloatingDashboardCard className="absolute bottom-12 right-0 w-64 z-30 border-emerald-500/20" delay={0.6}>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-zinc-800 text-emerald-500">
                  <Activity size={18} />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Projeção Mensal</p>
              </div>
              <div className="flex items-end gap-1 h-16 mb-4">
                {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.95].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h * 100}%` }}
                    transition={{ duration: 1, delay: 1.5 + (i * 0.1) }}
                    className="flex-1 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg"
                  />
                ))}
              </div>
              <p className="text-xs font-black text-white text-right">R$ 8.450,00</p>
            </FloatingDashboardCard>
          </div>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-white/5 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Precisão de Lucro', value: '99.9%', icon: Shield },
              { label: 'Usuários Ativos', value: '5k+', icon: Globe },
              { label: 'Custo Monitorado', value: 'R$ 2M+', icon: DollarSign },
              { label: 'Garantia de Dados', value: 'CLOUD', icon: Lock },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-2"
              >
                <div className="inline-flex p-2 rounded-xl bg-emerald-500/5 text-emerald-400 mb-1">
                  <stat.icon size={18} />
                </div>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Main Features */}
      <section id="recursos" className="py-24 px-8 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">Arsenal Tecnológico</h2>
              <p className="text-4xl md:text-6xl font-black tracking-tight text-white leading-[0.9]">
                Construído para quem vive da <span className="text-emerald-500">estrada.</span>
              </p>
            </div>
            <p className="text-base text-zinc-500 font-medium max-w-md">
              Ferramentas de precisão militar para maximizar cada centavo rodado. Do GPS real à inteligência de custos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={Gauge}
              title="Rastreamento em Tempo Real"
              description="Acompanhamento via GPS ultracontrolado que diferencia automaticamente KM produtivo de ocioso."
              delay={0.1}
            />
            <FeatureCard 
              icon={PieChart}
              title="Análise de Lucro Líquido"
              description="Saiba exatamente o que resta após combustível, taxas e manutenção. Lucro real, sem ilusões."
              delay={0.2}
            />
            <FeatureCard 
              icon={LayoutDashboard}
              title="Dashboard de Elite"
              description="Visualização limpa e profissional do seu desempenho diário, semanal e mensal de forma consolidada."
              delay={0.3}
            />
            <FeatureCard 
              icon={RefreshCw}
              title="Sincronização Cloud"
              description="Seus dados seguros e acessíveis em qualquer dispositivo com backup automático em tempo real."
              delay={0.4}
            />
            <FeatureCard 
              icon={Smartphone}
              title="Mobile First PWA"
              description="Experiência de app nativo sem precisar baixar nada da loja. Leve, rápido e sempre atualizado."
              delay={0.5}
            />
            <FeatureCard 
              icon={Lock}
              title="Segurança Máxima"
              description="Seus dados financeiros são privados e protegidos. Você tem controle total sobre seu histórico."
              delay={0.6}
            />
          </div>
        </div>
      </section>

      {/* Trust Quote */}
      <section className="py-32 bg-gradient-to-b from-transparent to-black relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-emerald-500/[0.02] blur-[200px] rounded-full" />
        <div className="max-w-4xl mx-auto px-8 relative z-10 text-center space-y-8">
          <div className="inline-flex gap-1">
            {[1, 2, 3, 4, 5].map(i => <Zap key={i} size={14} className="text-emerald-500 fill-emerald-500" />)}
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white italic leading-tight">
            "Antes do DriverDash, eu achava que ganhava R$ 300 por dia. Hoje, sei que meu lucro real é R$ 180 e aprendi a escolher as melhores corridas."
          </h2>
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-full bg-zinc-900 border-2 border-emerald-500/30 mb-4" />
            <p className="text-[10px] font-black text-white uppercase tracking-widest">Ricardo M.</p>
            <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mt-1">Motorista Elite • 5.0 Estrelas</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-48 relative overflow-hidden flex justify-center px-8 text-center border-t border-white/5">
        <div className="max-w-4xl space-y-12">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.8]"
          >
            Pronto para o <br />
            <span className="text-emerald-500 underline decoration-emerald-500/30 underline-offset-8">Próximo Nível?</span>
          </motion.h2>
          <p className="text-xl text-zinc-500 font-medium max-w-xl mx-auto">
            Junte-se a milhares de motoristas profissionais que transformaram seus ganhos com inteligência de dados.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/register" className="w-full sm:w-auto">
              <Button className="h-20 px-16 text-sm font-black uppercase tracking-[0.4em] w-full bg-white text-black hover:bg-emerald-400 rounded-[2rem] shadow-[0_0_80px_rgba(255,255,255,0.1)] transition-all hover:scale-105">
                COMEÇAR GRÁTIS
              </Button>
            </Link>
          </div>
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-zinc-700">
            Teste total de 7 dias • Sem cartão de crédito
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex flex-col items-center md:items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-sm text-black">
                  D
                </div>
                <span className="text-xl font-black tracking-tight italic">DriverDash</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-700">
                Performance Analytics Suite para Motoristas de Elite.
              </p>
            </div>
            
            <div className="flex gap-12">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">App</p>
                <div className="flex flex-col gap-2">
                  <Link to="/login" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Login</Link>
                  <Link to="/register" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Registrar</Link>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Legal</p>
                <div className="flex flex-col gap-2">
                  <Link to="/terms" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Termos</Link>
                  <Link to="/privacy" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Privacidade</Link>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-white">Suporte</p>
                <div className="flex flex-col gap-2">
                  <Link to="/contact" className="text-[10px] font-bold text-zinc-600 hover:text-emerald-400 uppercase tracking-widest">Contato</Link>
                </div>
              </div>
            </div>

            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-700 text-center md:text-right">
              Desenvolvido por <a href="https://www.ntaplicacoes.com.br" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-500 transition-colors">NT APLICAÇÕES</a><br />
              Todos os Direitos Reservados 2026.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
