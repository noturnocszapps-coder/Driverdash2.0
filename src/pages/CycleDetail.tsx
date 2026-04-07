import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDriverStore } from '../store';
import { formatCurrency, formatKm, cn, consolidateDailyData } from '../utils';
import { Card, CardContent, Button } from '../components/UI';
import { 
  ChevronLeft, 
  Calendar, 
  Navigation, 
  DollarSign, 
  Fuel, 
  Utensils, 
  MoreHorizontal, 
  TrendingUp, 
  Clock, 
  MapIcon,
  Camera,
  Trash2,
  AlertCircle,
  TrendingUp as TrendingUpIcon
} from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { ConfirmationModal } from '../components/ConfirmationModal';

export const CycleDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cycles, deleteCycle, settings, importedReports } = useDriverStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const cycle = useMemo(() => cycles.find(c => c.id === id), [cycles, id]);

  const dayDate = useMemo(() => {
    if (!cycle?.start_time) return new Date();
    return parseISO(cycle.start_time);
  }, [cycle?.start_time]);

  const consolidatedDay = useMemo(() => {
    return consolidateDailyData(dayDate, cycles, importedReports, settings);
  }, [dayDate, cycles, importedReports, settings]);

  const hasOtherData = useMemo(() => {
    const dayCycles = cycles.filter(c => isSameDay(parseISO(c.start_time), dayDate));
    const dayImports = importedReports.filter(r => r.report_type === 'daily' && isSameDay(parseISO(r.period_start), dayDate));
    return dayCycles.length > 1 || dayImports.length > 0;
  }, [cycles, importedReports, dayDate]);

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black tracking-tight">Ciclo não encontrado</h2>
          <p className="text-sm text-zinc-500">Este registro pode ter sido removido ou não existe.</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/reports')}>
          Voltar para Relatórios
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!cycle) return;
    await deleteCycle(cycle.id);
    navigate('/reports');
  };

  const platforms = [
    { label: 'Uber', value: cycle.uber_amount, color: 'bg-zinc-900 dark:bg-white' },
    { label: '99', value: cycle.noventanove_amount, color: 'bg-yellow-500' },
    { label: 'inDrive', value: cycle.indriver_amount, color: 'bg-emerald-500' },
    { label: 'Extra', value: cycle.extra_amount, color: 'bg-blue-500' },
  ].filter(p => p.value > 0);

  const expenses = [
    { label: 'Combustível', value: cycle.fuel_expense || 0, icon: Fuel, color: 'text-amber-500' },
    { label: 'Alimentação', value: cycle.food_expense || 0, icon: Utensils, color: 'text-orange-500' },
    { label: 'Outros', value: cycle.other_expense || 0, icon: MoreHorizontal, color: 'text-zinc-400' },
  ].filter(e => e.value > 0);

  const totalExpenses = (cycle.fuel_expense || 0) + (cycle.food_expense || 0) + (cycle.other_expense || 0);
  const profit = cycle.total_amount - totalExpenses;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between px-1 pt-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Detalhes do Ciclo</h1>
            <p className="text-sm text-zinc-500 font-medium uppercase tracking-widest">
              {format(dayDate, "dd 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setShowDeleteConfirm(true)}
          className="w-10 h-10 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Excluir Ciclo"
        message="Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />

      {hasOtherData && (
        <Card className="border-none bg-blue-500/5 border border-blue-500/10 shadow-sm">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                <TrendingUp size={14} />
                Resumo Consolidado do Dia
              </h3>
              <span className="text-[10px] font-bold text-blue-400 uppercase">Manual + IA</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-[8px] font-black text-zinc-400 uppercase">Faturamento</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(consolidatedDay.totalRevenue, settings.isPrivacyMode)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-zinc-400 uppercase">Lucro Real</p>
                <p className="text-sm font-black text-emerald-500">{formatCurrency(consolidatedDay.profit, settings.isPrivacyMode)}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-zinc-400 uppercase">KM Total</p>
                <p className="text-sm font-black text-zinc-600 dark:text-zinc-300">{formatKm(consolidatedDay.totalKm)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none bg-zinc-900 text-white shadow-xl">
          <CardContent className="p-6 space-y-1">
            <p className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Faturamento Total</p>
            <p className="text-2xl font-black tracking-tight text-emerald-400">{formatCurrency(cycle.total_amount, settings.isPrivacyMode)}</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-1">
            <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Lucro Líquido</p>
            <p className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white">{formatCurrency(profit, settings.isPrivacyMode)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
              <Navigation size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Distância</p>
              <p className="text-sm font-black">{formatKm(cycle.tracked_km || cycle.total_km || 0)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Horário</p>
              <p className="text-sm font-black">
                {format(parseISO(cycle.start_time), 'HH:mm')} 
                {cycle.end_time && ` - ${format(parseISO(cycle.end_time), 'HH:mm')}`}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platforms */}
      <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-6 space-y-6">
          <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
            <DollarSign size={16} className="text-emerald-500" />
            Ganhos por Plataforma
          </h3>
          <div className="space-y-4">
            {platforms.map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-center text-xs font-black uppercase">
                  <span>{p.label}</span>
                  <span>{formatCurrency(p.value, settings.isPrivacyMode)}</span>
                </div>
                <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(p.value / cycle.total_amount) * 100}%` }}
                    className={cn("h-full", p.color)}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expenses */}
      {expenses.length > 0 && (
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
              <Fuel size={16} className="text-red-500" />
              Despesas do Ciclo
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {expenses.map((e, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center", e.color)}>
                      <e.icon size={16} />
                    </div>
                    <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{e.label}</span>
                  </div>
                  <span className="text-sm font-black">{formatCurrency(e.value, settings.isPrivacyMode)}</span>
                </div>
              ))}
              <div className="pt-2 flex justify-between items-center border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-[10px] font-black uppercase text-zinc-400">Total Despesas</span>
                <span className="text-sm font-black text-red-500">{formatCurrency(totalExpenses, settings.isPrivacyMode)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 gap-4">
        {(cycle.route_points?.length || 0) > 0 && (
          <Button 
            variant="outline" 
            className="h-14 gap-2 font-black uppercase tracking-widest text-xs"
            onClick={() => navigate(`/cycle-map/${cycle.id}`)}
          >
            <MapIcon size={18} />
            Ver Mapa do Trajeto
          </Button>
        )}
        
        {cycle.source === 'screenshot' && (
          <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex items-start gap-3 text-blue-600 dark:text-blue-400">
            <Camera size={20} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-black uppercase tracking-tight">Registro Importado</p>
              <p className="text-[11px] font-bold opacity-80 leading-relaxed">
                Este registro foi gerado automaticamente através da importação de um print de tela.
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
