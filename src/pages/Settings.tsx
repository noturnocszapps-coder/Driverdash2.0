import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDriverStore } from '../store';
import { Card, CardContent, Button, Input, Select } from '../components/UI';
import { 
  User, Car, Target, Trash2, LogOut, Download, Database, 
  Upload, RefreshCw, AlertCircle, FlaskConical,
  Zap, ChevronRight, Shield, History, Smartphone, Layout, Globe, ChevronDown,
  DollarSign, Plus, CheckCircle2, Eye, EyeOff, Mic, Volume2
} from 'lucide-react';
import { downloadFile, formatCurrency, calculateDailyFixedCost, calculateMonthlyFixedCost } from '../utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { VehicleProfile } from '../types';

import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

export const Settings = () => {
  const navigate = useNavigate();
  const { 
    settings, updateSettings, clearData, clearCloudData, 
    cycles, importData, user, setUser, syncStatus, syncData, isSaving,
    vehicles, addVehicle, updateVehicle, deleteVehicle, setActiveVehicle,
    activeVehicleId
  } = useDriverStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSelectVehicle = async (id: string) => {
    try {
      await setActiveVehicle(id);
      setShowVehicleSelector(false);
      toast.success('Veículo alterado com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao trocar veículo: ${error.message || 'Verifique sua conexão'}`);
    }
  };

  const handleSaveVehicle = async () => {
    if (!currentVehicle) return;
    
    if (!currentVehicle.name.trim()) {
      toast.error('O nome do veículo não pode estar vazio.');
      return;
    }

    try {
      await updateVehicle(currentVehicle.id, {
        name: currentVehicle.name,
        brand: currentVehicle.brand,
        model: currentVehicle.model,
        year: currentVehicle.year,
        plate: currentVehicle.plate,
        type: currentVehicle.type,
        category: currentVehicle.category,
        fixedCosts: currentVehicle.fixedCosts
      });

      setSaveSuccess(true);
      toast.success('Veículo salvo com sucesso');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('[Settings] Error saving vehicle:', error);
      toast.error(`Erro ao salvar veículo: ${error.message || 'Verifique sua conexão'}`);
    }
  };

  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);

  const handleDeleteVehicle = async (id: string) => {
    if (vehicles.length <= 1) {
      toast.error('Você precisa ter pelo menos um veículo cadastrado.');
      return;
    }
    setDeletingVehicleId(id);
  };

  const confirmDeleteVehicle = async () => {
    if (!deletingVehicleId) return;
    try {
      await deleteVehicle(deletingVehicleId);
      toast.success('Veículo excluído com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao excluir veículo: ${error.message || 'Verifique sua conexão'}`);
    } finally {
      setDeletingVehicleId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const handleAddVehicle = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vehicleData: Omit<VehicleProfile, 'id' | 'createdAt'> = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      plate: formData.get('plate') as string,
      type: formData.get('type') as any,
      category: formData.get('category') as any,
      fixedCosts: {
        vehicleType: formData.get('type') as any,
        rentalPeriod: 'weekly',
      }
    };

    try {
      await addVehicle(vehicleData);
      setIsAddingVehicle(false);
      toast.success('Veículo adicionado com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao adicionar veículo: ${error.message || 'Verifique sua conexão'}`);
    }
  };

  const updateCurrentVehicleCosts = async (newFixedCosts: any) => {
    if (!currentVehicle) return;
    
    try {
      await updateVehicle(currentVehicle.id, {
        fixedCosts: { ...currentVehicle.fixedCosts, ...newFixedCosts }
      });
      toast.success('Custos atualizados');
    } catch (error: any) {
      toast.error(`Erro ao atualizar custos: ${error.message || 'Verifique sua conexão'}`);
    }
  };

  const handleClearData = async () => {
    setIsDeleting(true);
    try {
      if (user) {
        const result = await clearCloudData();
        if (!result.success) {
          toast.error('Erro ao apagar dados da nuvem. Verifique sua conexão e tente novamente.');
          setIsDeleting(false);
          return;
        }
      }
      clearData();
      setShowDeleteConfirm(false);
      toast.success('Todos os seus dados foram apagados com sucesso.');
    } catch (error) {
      console.error('[Settings] Error clearing data:', error);
      toast.error('Ocorreu um erro ao apagar os dados.');
    } finally {
      setIsDeleting(false);
    }
  };

  const exportBackup = () => {
    const data = { cycles, settings };
    downloadFile(JSON.stringify(data, null, 2), `driverdash-beta-backup-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.cycles || data.settings) {
          importData(data);
          toast.success('Backup importado com sucesso!');
        } else {
          toast.error('Arquivo de backup inválido.');
        }
      } catch (err) {
        toast.error('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A foto deve ter no máximo 2MB.');
      return;
    }

    setIsUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      try {
        await updateSettings({ photoUrl: base64 });
      } catch (error) {
        console.error('Error uploading photo:', error);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (confirm('Deseja remover sua foto de perfil?')) {
      await updateSettings({ photoUrl: undefined });
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-24 md:pb-8"
    >
      <header className="px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Configurações</p>
        <h1 className="text-3xl font-black tracking-tighter">Ajustes</h1>
      </header>

      {/* Profile Section */}
      <section className="space-y-4">
        <SectionHeader icon={User} title="Perfil" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
              <div className="relative group">
                <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-zinc-950 text-3xl font-black overflow-hidden border-4 border-zinc-100 dark:border-zinc-800">
                  {settings.photoUrl ? (
                    <img 
                      src={settings.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    settings.name?.charAt(0) || '?'
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 flex gap-1">
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-8 h-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                  >
                    <Upload size={14} />
                  </button>
                  {settings.photoUrl && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="w-8 h-8 bg-red-500 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={photoInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight">{settings.name || 'Motorista'}</h3>
                <p className="text-xs text-zinc-500 font-medium">{user?.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase rounded-full tracking-widest text-zinc-500">
                    {settings.role}
                  </span>
                  <span className={cn(
                    "px-2 py-0.5 text-[9px] font-black uppercase rounded-full tracking-widest",
                    settings.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {settings.status}
                  </span>
                </div>
                <div className="mt-2">
                  <SyncIndicator />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome de Exibição</label>
                <Input 
                  value={settings.name} 
                  onChange={e => updateSettings({ name: e.target.value })}
                  className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Meta Diária (R$)</label>
                <Input 
                  type="number"
                  value={settings.dailyGoal === 0 ? '' : settings.dailyGoal} 
                  onChange={e => {
                    const val = e.target.value;
                    updateSettings({ dailyGoal: val === '' ? 0 : Number(val) });
                  }}
                  className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-black text-xl"
                  placeholder="0"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Preferences Section */}
      <section className="space-y-4">
        <SectionHeader icon={Layout} title="Preferências" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Modo de Interface</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Simples ou Profissional</p>
              </div>
              <Select
                value={settings.uiMode || 'simple'}
                onChange={e => updateSettings({ uiMode: e.target.value as any })}
                className="w-32 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-xs"
              >
                <option value="simple">Simples</option>
                <option value="pro">Pro</option>
              </Select>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Tema</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Aparência do aplicativo</p>
              </div>
              <Select
                value={settings.theme || 'dark'}
                onChange={e => updateSettings({ theme: e.target.value as any })}
                className="w-32 h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-xs"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </Select>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-orange-500">DriverDash PRO</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Acesso a recursos avançados</p>
              </div>
              <button
                onClick={() => updateSettings({ isPro: !settings.isPro })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.isPro ? "bg-orange-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.isPro ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Privacidade</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Ocultar valores monetários</p>
              </div>
              <button
                onClick={() => updateSettings({ isPrivacyMode: !settings.isPrivacyMode })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.isPrivacyMode ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.isPrivacyMode ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Tela Sempre Ativa</p>
                <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Evita bloqueio automático</p>
              </div>
              <button
                onClick={() => updateSettings({ keepScreenOn: !settings.keepScreenOn })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.keepScreenOn ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.keepScreenOn ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Voice Mode Section */}
      <section className="space-y-4">
        <SectionHeader icon={Volume2} title="Modo Voz (Copiloto)" />
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Voz do Aplicativo (TTS)</p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  O app fala alertas e sugestões importantes.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.voiceEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm font-bold">Comandos de Voz</p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  Permite operar o app falando comandos simples.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceCommandsEnabled: !settings.voiceCommandsEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceCommandsEnabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm",
                  settings.voiceCommandsEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Verbosidade da Voz</label>
              <Select
                value={settings.voiceVerbosity || 'normal'}
                onChange={e => updateSettings({ voiceVerbosity: e.target.value as any })}
                className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
              >
                <option value="low">Baixa (Apenas Críticos)</option>
                <option value="normal">Normal</option>
                <option value="high">Alta (Mais Detalhes)</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <SectionHeader icon={Car} title="Perfil do Veículo" />
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsAddingVehicle(true)}
            className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500/10 rounded-xl"
          >
            <Plus size={14} className="mr-1" /> Novo Carro
          </Button>
        </div>
        
        <Card className="border-none bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-6 space-y-6">
            {/* Vehicle Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Veículo Ativo</label>
              <button
                onClick={() => setShowVehicleSelector(true)}
                className={cn(
                  "w-full p-5 rounded-3xl flex items-center justify-between group transition-all border-2 active:scale-[0.98]",
                  currentVehicle 
                    ? "bg-emerald-500/5 border-emerald-500/30 shadow-lg shadow-emerald-500/5 hover:border-emerald-500/50" 
                    : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                    currentVehicle 
                      ? "bg-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  )}>
                    {currentVehicle?.category === 'motorcycle' ? <Zap size={28} /> : <Car size={28} />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-lg font-black tracking-tight leading-none">
                        {currentVehicle?.name || 'Selecionar Veículo'}
                      </p>
                      {currentVehicle && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest animate-pulse">
                          <div className="w-1 h-1 bg-zinc-950 rounded-full" />
                          Ativo
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-1">
                      {currentVehicle 
                        ? `${currentVehicle.brand} ${currentVehicle.model} • ${currentVehicle.year} • ${currentVehicle.category === 'motorcycle' ? 'Moto' : 'Carro'}` 
                        : 'Nenhum veículo ativo'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 group-hover:text-emerald-500 transition-colors">
                  <span className="text-[10px] font-black uppercase tracking-widest">Trocar</span>
                  <ChevronDown size={18} />
                </div>
              </button>
            </div>

            {currentVehicle && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Carro</label>
                    <Input 
                      value={currentVehicle.name}
                      onChange={e => {
                        updateVehicle(currentVehicle.id, { name: e.target.value });
                      }}
                      className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                    <Input 
                      value={currentVehicle.year}
                      onChange={e => {
                        updateVehicle(currentVehicle.id, { year: e.target.value });
                      }}
                      className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                  <Select
                    value={currentVehicle.type}
                    onChange={e => {
                      updateVehicle(currentVehicle.id, { 
                        type: e.target.value as any, 
                        fixedCosts: { ...currentVehicle.fixedCosts, vehicleType: e.target.value as any } 
                      });
                    }}
                    className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                  >
                    <option value="owned">Veículo Próprio</option>
                    <option value="rented">Veículo Alugado</option>
                  </Select>
                </div>

                {currentVehicle.type === 'owned' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <CostInput 
                      label="Seguro" 
                      value={currentVehicle.fixedCosts.insurance} 
                      onChange={val => updateCurrentVehicleCosts({ insurance: val })} 
                    />
                    <CostInput 
                      label="IPVA" 
                      value={currentVehicle.fixedCosts.ipva} 
                      onChange={val => updateCurrentVehicleCosts({ ipva: val })} 
                    />
                    <CostInput 
                      label="Troca de Óleo" 
                      value={currentVehicle.fixedCosts.oilChange} 
                      onChange={val => updateCurrentVehicleCosts({ oilChange: val })} 
                    />
                    <CostInput 
                      label="Pneus" 
                      value={currentVehicle.fixedCosts.tires} 
                      onChange={val => updateCurrentVehicleCosts({ tires: val })} 
                    />
                    <CostInput 
                      label="Manutenção" 
                      value={currentVehicle.fixedCosts.maintenance} 
                      onChange={val => updateCurrentVehicleCosts({ maintenance: val })} 
                    />
                    <CostInput 
                      label="Parcela" 
                      value={currentVehicle.fixedCosts.financing} 
                      onChange={val => updateCurrentVehicleCosts({ financing: val })} 
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                      <Select
                        value={currentVehicle.fixedCosts.rentalPeriod || 'weekly'}
                        onChange={e => updateCurrentVehicleCosts({ rentalPeriod: e.target.value as any })}
                        className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold"
                      >
                        <option value="weekly">Semanal</option>
                        <option value="monthly">Mensal</option>
                      </Select>
                    </div>
                    <CostInput 
                      label="Valor do Aluguel" 
                      value={currentVehicle.fixedCosts.rentalValue} 
                      onChange={val => updateCurrentVehicleCosts({ rentalValue: val })} 
                    />
                  </div>
                )}

                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custo Fixo Diário</p>
                    <p className="text-xl font-black text-emerald-500">
                      {formatCurrency(calculateDailyFixedCost(currentVehicle.fixedCosts))}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Mensal</p>
                    <p className="text-sm font-bold text-zinc-400">
                      {formatCurrency(calculateMonthlyFixedCost(currentVehicle.fixedCosts))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button 
                    onClick={handleSaveVehicle}
                    disabled={isSaving}
                    className={cn(
                      "w-full h-14 font-black text-lg rounded-2xl transition-all duration-300",
                      saveSuccess 
                        ? "bg-emerald-500 text-zinc-950" 
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-emerald-500 hover:text-zinc-950"
                    )}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : saveSuccess ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={20} /> Perfil Salvo
                      </span>
                    ) : (
                      "Salvar Veículo"
                    )}
                  </Button>
                  
                  {saveSuccess && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[10px] text-center font-black text-emerald-500 uppercase tracking-widest"
                    >
                      Perfil do veículo salvo com sucesso
                    </motion.p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Danger Zone */}
      <section className="space-y-4">
        <SectionHeader icon={Shield} title="Zona de Perigo" />
        <Card className="border-none bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/10">
          <CardContent className="p-6 space-y-4">
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Trash2 size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-red-500">Limpar Todos os Dados</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Apagar histórico local e nuvem</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-red-300 group-hover:text-red-500 transition-colors" />
            </button>
            <div className="h-px bg-red-100 dark:bg-red-500/10" />
            <button 
              onClick={handleLogout}
              className="flex items-center justify-between w-full group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <LogOut size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-zinc-900 dark:text-white">Sair da Conta</p>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Desconectar deste dispositivo</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-zinc-300 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors" />
            </button>
          </CardContent>
        </Card>
      </section>

      {/* Vehicle Selector Bottom Sheet */}
      <AnimatePresence>
        {showVehicleSelector && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVehicleSelector(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-white dark:bg-zinc-900 z-[110] rounded-t-[2.5rem] p-8 pb-12 max-h-[80vh] overflow-y-auto"
            >
              <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-8" />
              
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Meus Veículos</h3>
                  <p className="text-xs text-zinc-500 font-medium">Selecione o veículo que está usando agora</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowVehicleSelector(false);
                    setIsAddingVehicle(true);
                  }}
                  className="text-emerald-500 font-black uppercase tracking-widest text-[10px]"
                >
                  <Plus size={14} className="mr-1" /> Novo
                </Button>
              </div>

              <div className="space-y-3">
                {vehicles.map(v => {
                  const isActive = settings.currentVehicleProfileId === v.id;
                  return (
                    <div
                      key={v.id}
                      onClick={() => handleSelectVehicle(v.id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectVehicle(v.id);
                        }
                      }}
                      className={cn(
                        "w-full p-5 rounded-[2rem] flex items-center justify-between transition-all border-2 cursor-pointer",
                        isActive
                          ? "bg-emerald-500/10 border-emerald-500 shadow-[0_10px_30px_rgba(16,185,129,0.15)]"
                          : "bg-zinc-50 dark:bg-zinc-800/50 border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                          isActive 
                            ? "bg-emerald-500 text-zinc-950 scale-110 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                        )}>
                          {v.category === 'motorcycle' ? <Zap size={28} /> : <Car size={28} />}
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className={cn("font-black tracking-tight leading-none", isActive ? "text-xl" : "text-base")}>
                              {v.name}
                            </p>
                            {isActive && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest">
                                <div className="w-1 h-1 bg-zinc-950 rounded-full animate-pulse" />
                                Ativo
                              </div>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider">
                            {v.brand} {v.model} • {v.year}
                          </p>
                          <p className="text-[9px] text-zinc-400 font-black uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                            <span className={cn("px-1.5 py-0.5 rounded-md", isActive ? "bg-emerald-500/20 text-emerald-500" : "bg-zinc-200 dark:bg-zinc-700")}>
                              {v.category === 'motorcycle' ? 'Motocicleta' : 'Automóvel'}
                            </span>
                            <span>•</span>
                            <span>{v.type === 'rented' ? 'Alugado' : 'Próprio'}</span>
                          </p>
                        </div>
                      </div>
                      {isActive ? (
                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-zinc-950 shadow-lg shadow-emerald-500/20">
                          <CheckCircle2 size={20} />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {vehicles.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteVehicle(v.id);
                              }}
                              className="h-10 w-10 p-0 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
                            >
                              <Trash2 size={18} />
                            </Button>
                          )}
                          <ChevronRight size={20} className="text-zinc-300" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {vehicles.length === 0 && (
                  <div className="text-center py-12 space-y-4">
                    <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400 mx-auto">
                      <Car size={32} />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold">Nenhum veículo encontrado</p>
                      <p className="text-xs text-zinc-500">Cadastre seu primeiro veículo para começar</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setShowVehicleSelector(false);
                        setIsAddingVehicle(true);
                      }}
                      className="bg-emerald-500 text-zinc-950 font-black"
                    >
                      Adicionar Veículo
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Add Vehicle Modal */}
      <AnimatePresence>
        {isAddingVehicle && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingVehicle(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-x-4 bottom-10 md:inset-0 m-auto w-full max-w-md h-fit z-[110] p-6"
            >
              <Card className="border-none bg-white dark:bg-zinc-900 shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-2xl font-black tracking-tighter">Novo Veículo</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAddingVehicle(false)}>Fechar</Button>
                  </div>
                  
                  <form onSubmit={handleAddVehicle} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome (Ex: HB20S)</label>
                      <Input name="name" required className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Marca</label>
                        <Input name="brand" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Modelo</label>
                        <Input name="model" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                        <Input name="year" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Placa (Opcional)</label>
                        <Input name="plate" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo</label>
                        <Select name="type" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                          <option value="owned">Próprio</option>
                          <option value="rented">Alugado</option>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Categoria</label>
                        <Select name="category" className="h-12 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-2xl font-bold">
                          <option value="car">Carro</option>
                          <option value="motorcycle">Moto</option>
                        </Select>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="w-full h-16 bg-emerald-500 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20 mt-4"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                          Salvando...
                        </div>
                      ) : "Salvar Veículo"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleClearData}
        title="Apagar tudo?"
        message="Essa ação é irreversível. Todos os seus ciclos e configurações serão removidos. Tem certeza?"
        confirmText={isDeleting ? 'Apagando...' : 'Confirmar'}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!deletingVehicleId}
        onClose={() => setDeletingVehicleId(null)}
        onConfirm={confirmDeleteVehicle}
        title="Excluir Veículo"
        message="Tem certeza que deseja excluir este veículo? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        variant="danger"
      />
    </motion.div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-2 px-1">
    <Icon size={16} className="text-emerald-500" />
    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500">{title}</h3>
  </div>
);

const CostInput = ({ label, value, onChange }: { label: string, value?: number, onChange: (val: number | undefined) => void }) => (
  <div className="space-y-1.5">
    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest ml-1">{label}</label>
    <Input 
      type="number"
      value={value === undefined ? '' : value} 
      onChange={e => {
        const val = e.target.value;
        onChange(val === '' ? undefined : Number(val));
      }}
      className="h-10 bg-zinc-50 dark:bg-zinc-800/50 border-none rounded-xl font-bold text-sm"
      placeholder="0,00"
    />
  </div>
);

const SettingsItem = ({ icon: Icon, title, description, onClick, color, loading, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "flex items-center justify-between w-full group py-2 transition-opacity",
      (disabled || loading) && "opacity-50 cursor-not-allowed"
    )}
  >
    <div className="flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center transition-colors", color)}>
        <Icon size={20} className={cn(loading && "animate-spin")} />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold tracking-tight">{title}</p>
        <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-zinc-200 group-hover:text-emerald-500 transition-colors" />
  </button>
);

export default Settings;
