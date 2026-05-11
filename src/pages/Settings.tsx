import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDriverStore } from '../store';
import { Card, CardContent, Button, Input, Select } from '../components/UI';
import { 
  User, Car, Target, Trash2, LogOut, Download, Database, 
  Upload, RefreshCw, AlertCircle, FlaskConical, Edit2, FileWarning, Copy,
  Gauge, ChevronRight, Shield, History, Smartphone, Layout, Globe, ChevronDown,
  DollarSign, Plus, CheckCircle2, Eye, EyeOff, Mic, Volume2,
  LayoutGrid, Minus, Map, Maximize2, Play, Lightbulb, AlertTriangle, X,
  Phone, MapPin, Briefcase, Calendar, Settings as SettingsIcon, Users, Activity, Sparkles, Info,
  Cloud, Loader2
} from 'lucide-react';
import { downloadFile, formatCurrency, calculateDailyFixedCost, calculateMonthlyFixedCost, getFriendlyErrorMessage } from '../utils';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils';
import { motion, AnimatePresence } from 'motion/react';
import { SyncIndicator } from '../components/SyncIndicator';
import { InstallAppButton } from '../components/InstallAppButton';
import { VehicleProfile, UserRole, UserStatus } from '../types';

import { toast } from 'sonner';
import { ConfirmationModal } from '../components/ConfirmationModal';

import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Settings = () => {
  const navigate = useNavigate();
  const { 
    settings, updateSettings, clearData, clearCloudData, 
    cycles, importData, user, setUser, syncStatus, syncData, isSaving,
    vehicles, addVehicle, updateVehicle, deleteVehicle, setActiveVehicle,
    activeVehicleId, plan, setPaywallOpen, adminStats, fetchAdminStats,
    mapMarkers, loadMapMarkers, approveMapMarker, rejectMapMarker,
    allUsers, fetchAllUsers, updateUserRole, updateUserStatus,
    systemLogs, fetchSystemLogs, globalConfigs, loadGlobalConfigs, updateGlobalConfig,
    lastSyncTime, syncError, syncDetails
  } = useDriverStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [modalVehicleType, setModalVehicleType] = useState<'owned' | 'rented'>('owned');
  const [modalFuelType, setModalFuelType] = useState<string>('flex');
  const [modalFranchiseType, setModalFranchiseType] = useState<string>('unlimited');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const currentVehicle = useMemo(() => {
    return vehicles.find(v => v.id === activeVehicleId) || vehicles.find(v => v.id === settings.currentVehicleProfileId);
  }, [vehicles, activeVehicleId, settings.currentVehicleProfileId]);

  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'preferences' | 'system' | 'admin'>('profile');
  const [adminView, setAdminView] = useState<'stats' | 'users' | 'logs' | 'configs'>('stats');

  useEffect(() => {
    if (activeTab === 'admin') {
      fetchAdminStats();
      loadMapMarkers();
      if (adminView === 'users') fetchAllUsers();
      if (adminView === 'logs') fetchSystemLogs();
      if (adminView === 'configs') loadGlobalConfigs();
    }
  }, [activeTab, adminView, fetchAdminStats, loadMapMarkers, fetchAllUsers, fetchSystemLogs, loadGlobalConfigs]);

  const [showApiKey, setShowApiKey] = useState(false);
  const [vehicleErrors, setVehicleErrors] = useState<{
    name?: string;
    year?: string;
    plate?: string;
  }>({});

  const validateVehicleField = (field: string, value: string) => {
    const newErrors = { ...vehicleErrors };
    
    if (field === 'name') {
      if (!value.trim()) newErrors.name = 'Nome é obrigatório';
      else if (value.length < 2) newErrors.name = 'Nome muito curto';
      else delete newErrors.name;
    }
    
    if (field === 'year') {
      const year = parseInt(value);
      const currentYear = new Date().getFullYear();
      if (!value) newErrors.year = 'Ano é obrigatório';
      else if (isNaN(year) || year < 1900 || year > currentYear + 1) newErrors.year = 'Ano inválido';
      else delete newErrors.year;
    }
    
    if (field === 'plate') {
      if (value && !/^[A-Z]{3}-?[0-9][A-Z0-9][0-9]{2}$/i.test(value)) {
        newErrors.plate = 'Placa inválida (ex: ABC-1234)';
      } else {
        delete newErrors.plate;
      }
    }
    
    setVehicleErrors(newErrors);
    return !newErrors[field as keyof typeof newErrors];
  };

  const handleSelectVehicle = async (id: string) => {
    try {
      await setActiveVehicle(id);
      setShowVehicleSelector(false);
      toast.success('Veículo alterado com sucesso');
    } catch (error: any) {
      toast.error(`Erro ao trocar veículo: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const handleSaveVehicle = async () => {
    if (!currentVehicle) return;
    
    const isNameValid = validateVehicleField('name', currentVehicle.name);
    const isYearValid = validateVehicleField('year', currentVehicle.year);
    const isPlateValid = validateVehicleField('plate', currentVehicle.plate || '');

    if (!isNameValid || !isYearValid || !isPlateValid) {
      toast.error('Por favor, corrija os erros no formulário.');
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
      toast.error(`Erro ao salvar veículo: ${getFriendlyErrorMessage(error)}`);
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
      toast.error(`Erro ao excluir veículo: ${getFriendlyErrorMessage(error)}`);
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
    const fuelType = formData.get('fuelType') as any;
    const type = formData.get('type') as any;
    
    const vehicleData: Omit<VehicleProfile, 'id' | 'createdAt'> = {
      name: formData.get('name') as string,
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: formData.get('year') as string,
      plate: formData.get('plate') as string,
      type,
      category: formData.get('category') as any,
      fuelType,
      kmPerLiter: fuelType !== 'electric' ? Number(formData.get('kmPerUnit')) : undefined,
      kmPerKwh: fuelType === 'electric' ? Number(formData.get('kmPerUnit')) : undefined,
      fuelPrice: fuelType !== 'electric' ? Number(formData.get('unitPrice')) : undefined,
      kwhPrice: fuelType === 'electric' ? Number(formData.get('unitPrice')) : undefined,
      fixedCosts: {
        vehicleType: type,
        rentalPeriod: formData.get('rentalPeriod') as any || 'weekly',
        rentalValue: Number(formData.get('rentalValue')) || 0,
        rentalCompany: formData.get('rentalCompany') as string || '',
        franchiseType: formData.get('franchiseType') as any || 'unlimited',
        franchiseKm: Number(formData.get('franchiseKm')) || 0,
        excessKmCost: Number(formData.get('excessKmCost')) || 0,
        insurance: Number(formData.get('insurance')) || 0,
        ipva: Number(formData.get('ipva')) || 0,
        oilChange: Number(formData.get('oilChange')) || 0,
        tires: Number(formData.get('tires')) || 0,
        maintenance: Number(formData.get('maintenance')) || 0,
        financing: Number(formData.get('financing')) || 0,
        batteryMaintenance: Number(formData.get('batteryMaintenance')) || 0,
        chargingStation: Number(formData.get('chargingStation')) || 0,
      }
    };

    try {
      if (editingVehicleId) {
        await updateVehicle(editingVehicleId, vehicleData);
        toast.success('Veículo atualizado com sucesso');
      } else {
        await addVehicle(vehicleData);
        toast.success('Veículo adicionado com sucesso');
      }
      setIsAddingVehicle(false);
      setEditingVehicleId(null);
    } catch (error: any) {
      toast.error(`Erro ao salvar veículo: ${getFriendlyErrorMessage(error)}`);
    }
  };

  const handleEditVehicle = (vehicle: any) => {
    setEditingVehicleId(vehicle.id);
    setModalVehicleType(vehicle.type);
    setModalFuelType(vehicle.fuelType);
    setModalFranchiseType(vehicle.fixedCosts?.franchiseType || 'unlimited');
    setIsAddingVehicle(true);
  };

  const updateCurrentVehicleCosts = async (newFixedCosts: any) => {
    if (!currentVehicle) return;
    
    try {
      await updateVehicle(currentVehicle.id, {
        fixedCosts: { ...currentVehicle.fixedCosts, ...newFixedCosts }
      });
      toast.success('Custos atualizados');
    } catch (error: any) {
      toast.error(`Erro ao atualizar custos: ${getFriendlyErrorMessage(error)}`);
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

  const allQuickActions = [
    { id: 'gain', label: 'Ganho', icon: Plus, gradient: 'from-emerald-500 to-emerald-600' },
    { id: 'expense', label: 'Despesa', icon: Minus, gradient: 'from-rose-500 to-rose-600' },
    { id: 'reports', label: 'Relatórios', icon: LayoutGrid, gradient: 'from-zinc-700 to-zinc-800' },
    { id: 'status', label: 'Produtividade', icon: CheckCircle2, gradient: 'from-zinc-500 to-zinc-600' },
    { id: 'map', label: 'Mapa', icon: Map, gradient: 'from-blue-500 to-blue-600' },
    { id: 'hud', label: 'HUD', icon: Maximize2, gradient: 'from-emerald-500 to-emerald-600' },
    { id: 'start_trip', label: 'Iniciar', icon: Play, gradient: 'from-emerald-600 to-emerald-700' },
    { id: 'last_trip', label: 'Última', icon: History, gradient: 'from-amber-500 to-amber-600' },
  ];

  const toggleQuickAction = (id: string) => {
    const currentActions = settings.quickActions || ['gain', 'expense', 'reports', 'map'];
    let newActions = [...currentActions];
    
    if (newActions.includes(id)) {
      if (newActions.length <= 2) {
        toast.error("Mínimo de 2 ações necessárias");
        return;
      }
      newActions = newActions.filter(a => a !== id);
    } else {
      if (newActions.length >= 6) {
        toast.error("Máximo de 6 ações permitido");
        return;
      }
      newActions.push(id);
    }
    updateSettings({ quickActions: newActions });
  };

  return (
    <div className="flex flex-col gap-md md:gap-lg max-w-[1200px] mx-auto overflow-x-hidden w-full min-w-0 pb-32 px-md md:px-lg">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-lg pt-md md:pt-lg"
      >
        <header className="flex justify-between items-end px-1">
          <div className="space-y-xs">
            <div className="flex items-center gap-sm">
              <div className="w-2 h-2 rounded-full bg-[#00FFBB] shadow-neon" />
              <p className="text-[10px] md:text-[11px] font-black uppercase tracking-widest text-zinc-500 italic leading-none">CENTRAL DE CONFIGURAÇÃO</p>
            </div>
            <h1 className="text-[clamp(1.5rem,5vw,2.5rem)] font-black tracking-tighter text-white leading-[1.2] italic font-display uppercase">
              AJUSTES <span className="text-[#00FFBB]">AVANÇADOS</span>
            </h1>
          </div>
          <SyncIndicator variant="minimal" />
        </header>

        {/* Tab Navigation Redesign */}
        <div className="sticky top-6 z-50">
          <div className="absolute -inset-4 bg-[#00FFBB]/5 blur-2xl rounded-full opacity-50 pointer-events-none" />
          <div className="bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 p-xs md:p-sm rounded-md flex items-center gap-xs md:gap-sm overflow-x-auto no-scrollbar relative z-10 shadow-premium">
            {[
              { id: 'profile', label: 'PERFIL', icon: User },
              { id: 'vehicle', label: 'VEÍCULO', icon: Car },
              { id: 'preferences', label: 'PREFERÊNCIAS', icon: LayoutGrid },
              { id: 'system', label: 'SISTEMA', icon: Database },
              ...(settings.role === 'admin' ? [{ id: 'admin', label: 'ADMIN', icon: Shield }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                      "flex items-center gap-sm px-lg py-4 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all shrink-0 relative overflow-hidden group",
                  activeTab === tab.id
                    ? "bg-[#00FFBB] text-zinc-950 shadow-neon"
                    : "text-zinc-500 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={14} strokeWidth={2.5} />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="activeTabGlow"
                    className="absolute inset-0 bg-white/20 blur-xl opacity-50"
                  />
                )}
              </button>
            ))}
          </div>
        </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-md"
          >
            {/* Profile Section */}
            <section className="flex flex-col gap-sm">
        <SectionHeader icon={User} title="Conta e Perfil" />
        <Card className={cn(
          "border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden transition-all duration-500 shadow-premium",
          settings.isPrivacyMode 
            ? "border-[#00FFBB]/30 shadow-glow" 
            : "border-white/5"
        )}>
          <CardContent className="p-md md:p-xl flex flex-col gap-lg relative">
            <AnimatePresence>
              {settings.isPrivacyMode && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute top-4 right-lg flex items-center gap-xs px-2.5 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-full"
                >
                  <Shield size={10} className="text-emerald-500/70" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500/70">Modo Privado Ativo</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row items-center gap-lg pb-lg border-b border-white/5">
              <div className="relative group">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 rounded-sm flex items-center justify-center text-zinc-950 text-4xl font-black overflow-hidden border-2 border-white/10 shadow-premium">
                  {settings.photoUrl ? (
                    <img 
                      src={settings.photoUrl} 
                      alt="Profile" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="drop-shadow-sm">{settings.name?.charAt(0) || '?'}</span>
                  )}
                  {isUploadingPhoto && (
                    <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-2 -right-2 flex gap-xs">
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-9 h-9 bg-white text-zinc-950 rounded-sm flex items-center justify-center shadow-premium hover:scale-110 active:scale-95 transition-all border border-white/10"
                    title="Alterar foto"
                  >
                    <Upload size={16} />
                  </button>
                  {settings.photoUrl && (
                    <button 
                      onClick={handleRemovePhoto}
                      className="w-9 h-9 bg-red-500 text-white rounded-sm flex items-center justify-center shadow-premium hover:scale-110 active:scale-95 transition-all border border-white/10"
                      title="Remover foto"
                    >
                      <Trash2 size={16} />
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

              <div className="flex-1 text-center sm:text-left flex flex-col gap-sm">
                <div className="space-y-xs">
                  <h3 className="font-black text-3xl tracking-tight text-white leading-none">
                    {settings.name || 'Motorista'}
                  </h3>
                  <p className="text-sm text-zinc-500 font-bold tracking-tight opacity-70">
                    {user?.email}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-sm">
                  <div className="flex items-center gap-xs px-2.5 py-1 bg-white/5 text-[10px] font-black uppercase rounded-xs tracking-[0.15em] text-zinc-500 border border-white/5">
                    <Shield size={10} className="text-emerald-500/40" />
                    {settings.role}
                  </div>
                    <div className={cn(
                      "flex items-center gap-xs px-2.5 py-1 text-[10px] font-black uppercase rounded-xs tracking-[0.15em] border transition-colors duration-500",
                      settings.status === 'active' 
                        ? "bg-[#00FFBB]/5 text-[#00FFBB]/80 border-[#00FFBB]/10" 
                        : "bg-red-500/5 text-red-600/80 border-red-500/10"
                    )}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", settings.status === 'active' ? "bg-[#00FFBB]/60 animate-pulse-slow" : "bg-red-500/60")} />
                      {settings.status}
                    </div>
                </div>

                <div className="pt-xs">
                  <SyncIndicator />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-md md:gap-lg">
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Nome de Exibição</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00FFBB]/70 transition-colors duration-300">
                    <User size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.name || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ name: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="Seu nome"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Telefone / WhatsApp</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00FFBB]/70 transition-colors duration-300">
                    <Smartphone size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.phone || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ phone: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Cidade / Região</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00FFBB]/70 transition-colors duration-300">
                    <MapPin size={18} />
                  </div>
                  <Input 
                    value={settings.isPrivacyMode ? "• • • • • • • •" : (settings.city || '')} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      updateSettings({ city: e.target.value });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-white transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="Sua cidade"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Plataforma Principal</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00FFBB]/70 transition-colors duration-300">
                    <Briefcase size={18} />
                  </div>
                  <Select
                    value={settings.mainPlatform || 'Uber'}
                    onChange={e => updateSettings({ mainPlatform: e.target.value })}
                    className="h-14 pl-12 bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-white transition-all duration-300"
                  >
                    <option value="Uber">Uber</option>
                    <option value="99">99</option>
                    <option value="inDrive">inDrive</option>
                    <option value="Particular">Particular</option>
                  </Select>
                </div>
              </div>
            <div className="md:col-span-2 flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Bio / Descrição</label>
                <textarea 
                  value={settings.bio || ''}
                  onChange={e => updateSettings({ bio: e.target.value })}
                  className="w-full p-md bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-white placeholder:text-zinc-600 transition-all duration-300 min-h-[80px] resize-none"
                  placeholder="Conte um pouco sobre você..."
                />
              </div>
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Meta Diária Sugerida</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[#00FFBB]/70 transition-colors duration-300">
                    <Target size={18} />
                  </div>
                  <Input 
                    type={settings.isPrivacyMode ? "text" : "number"}
                    inputMode="decimal"
                    value={settings.isPrivacyMode ? "• • • • •" : (settings.dailyGoal === 0 ? '' : settings.dailyGoal)} 
                    readOnly={settings.isPrivacyMode}
                    onChange={e => {
                      if (settings.isPrivacyMode) return;
                      const val = e.target.value;
                      updateSettings({ dailyGoal: val === '' ? 0 : Number(val) });
                    }}
                    className={cn(
                      "h-14 pl-12 bg-white/5 border border-white/10 focus:border-[#00FFBB]/50 focus:ring-4 focus:ring-[#00FFBB]/5 rounded-sm font-bold text-xl text-[#00FFBB] transition-all duration-300",
                      settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                    )}
                    placeholder="0"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest break-safe shrink-0">
                    {settings.isPrivacyMode ? "(oculto)" : "BRL"}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-sm">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Membro desde</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">
                    <Calendar size={18} />
                  </div>
                  <div className="h-14 pl-12 bg-white/5 border border-white/10 rounded-sm font-bold text-zinc-500 flex items-center">
                    {user?.createdAt ? format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR }) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
          </motion.div>
        )}

        {/* REPLACING DUPLICATED PROFILE SECTION STARTING FROM PREFERENCES */}
        {activeTab === 'preferences' && (
          <motion.div
            key="preferences"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-md"
          >
            {/* Preferences Section */}
            <section className="flex flex-col gap-sm">
        <SectionHeader icon={Layout} title="Preferências" />
        <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
          <CardContent className="p-md md:p-xl flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Modo de Interface</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Simples ou Profissional</p>
              </div>
              <Select
                value={settings.uiMode || 'simple'}
                onChange={e => updateSettings({ uiMode: e.target.value as any })}
                className="w-32 h-10 bg-white/5 border border-white/10 rounded-sm font-bold text-xs text-white"
              >
                <option value="simple">Simples</option>
                <option value="pro">Pro</option>
              </Select>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Tema</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Aparência do aplicativo</p>
              </div>
              <Select
                value={settings.theme || 'dark'}
                onChange={e => updateSettings({ theme: e.target.value as any })}
                className="w-32 h-10 bg-white/5 border border-white/10 rounded-sm font-bold text-xs text-white"
              >
                <option value="dark">Escuro</option>
                <option value="light">Claro</option>
                <option value="system">Sistema</option>
              </Select>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className={cn("text-sm font-bold", plan === 'pro' ? "text-[#00FFBB]" : "text-orange-500")}>
                  DriverDash {plan === 'pro' ? 'PRO' : 'FREE'}
                </p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">
                  {plan === 'pro' ? 'Assinatura Ativa' : 'Acesso a recursos avançados'}
                </p>
              </div>
              <Button
                onClick={() => plan === 'free' && setPaywallOpen(true)}
                variant={plan === 'pro' ? 'ghost' : 'primary'}
                className={cn(
                  "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm active:scale-95",
                  plan === 'pro' ? "bg-[#00FFBB]/10 text-[#00FFBB] border border-[#00FFBB]/20" : "bg-orange-500 text-white"
                )}
              >
                {plan === 'pro' ? 'Gerenciar' : 'Upgrade'}
              </Button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Privacidade</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Ocultar valores monetários</p>
              </div>
              <button
                onClick={() => updateSettings({ isPrivacyMode: !settings.isPrivacyMode })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.isPrivacyMode ? "bg-[#00FFBB]" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-premium",
                  settings.isPrivacyMode ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Tela Sempre Ativa</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Evita bloqueio automático</p>
              </div>
              <button
                onClick={() => updateSettings({ keepScreenOn: !settings.keepScreenOn })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.keepScreenOn ? "bg-[#00FFBB]" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-premium",
                  settings.keepScreenOn ? "left-7" : "left-1"
                )} />
              </button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions Customization */}
      <section className="flex flex-col gap-sm">
        <SectionHeader icon={LayoutGrid} title="Ações Rápidas" />
        <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
          <CardContent className="p-md md:p-xl flex flex-col gap-md">
            <div className="space-y-xs">
              <p className="text-sm font-bold text-white">Personalizar Menu</p>
              <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">Selecione de 2 a 6 ações para o menu rápido</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-sm">
              {allQuickActions.map((action) => {
                const isSelected = (settings.quickActions || ['gain', 'expense', 'reports', 'map']).includes(action.id);
                return (
                  <button
                    key={action.id}
                    onClick={() => toggleQuickAction(action.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-md rounded-sm border transition-all relative group",
                      isSelected 
                        ? "bg-emerald-500/5 border-emerald-500/50 shadow-glow" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                      </div>
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-sm flex items-center justify-center mb-2 shadow-premium bg-gradient-to-br transition-transform group-hover:scale-110",
                      action.gradient
                    )}>
                      <action.icon className="text-white" size={18} />
                    </div>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest leading-none text-center",
                      isSelected ? "text-[#00FFBB]" : "text-zinc-500"
                    )}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="flex items-center justify-center gap-sm pt-2">
              <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden max-w-[100px]">
                <motion.div 
                  initial={false}
                  animate={{ width: `${((settings.quickActions || ['gain', 'expense', 'reports', 'map']).length / 6) * 100}%` }}
                  className="h-full bg-[#00FFBB] shadow-glow"
                />
              </div>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">
                {(settings.quickActions || ['gain', 'expense', 'reports', 'map']).length}/6 selecionadas
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Voice Mode Section */}
      <section className="flex flex-col gap-sm">
        <SectionHeader icon={Volume2} title="Modo Voz (Copiloto)" />
        <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
          <CardContent className="p-md md:p-xl flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Voz do Aplicativo (TTS)</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">
                  O app fala alertas e sugestões importantes.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceEnabled ? "bg-[#00FFBB]" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-premium",
                  settings.voiceEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div className="space-y-xs">
                <p className="text-sm font-bold text-white">Comandos de Voz</p>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest leading-none">
                  Permite operar o app falando comandos simples.
                </p>
              </div>
              <button
                onClick={() => updateSettings({ voiceCommandsEnabled: !settings.voiceCommandsEnabled })}
                className={cn(
                  "w-12 h-6 rounded-full transition-colors relative",
                  settings.voiceCommandsEnabled ? "bg-[#00FFBB]" : "bg-zinc-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-premium",
                  settings.voiceCommandsEnabled ? "left-7" : "left-1"
                )} />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex flex-col gap-sm">
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
          </motion.div>
        )}

        {activeTab === 'vehicle' && (
          <motion.div
            key="vehicle"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-6"
          >
            {/* Status da Nuvem */}
            {user && (
              <section className="flex flex-col gap-sm">
                <SectionHeader icon={Cloud} title="Status da Nuvem" />
                <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
                  <CardContent className="p-md md:p-xl flex flex-col gap-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-md">
                        <div className={cn(
                          "w-14 h-14 rounded-sm flex items-center justify-center border transition-all duration-500",
                          syncStatus === 'synced' || syncStatus === 'online' ? "bg-[#00FFBB]/10 text-[#00FFBB] border-[#00FFBB]/20 shadow-glow" :
                          syncStatus === 'syncing' ? "bg-blue-500/10 text-blue-500 border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]" :
                          syncStatus === 'partial_error' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          "bg-red-500/10 text-red-500 border-red-500/20"
                        )}>
                          {syncStatus === 'synced' || syncStatus === 'online' ? <CheckCircle2 size={26} /> :
                           syncStatus === 'syncing' ? <Loader2 size={24} className="animate-spin" /> :
                           syncStatus === 'partial_error' ? <AlertTriangle size={24} /> :
                           <Cloud size={24} />}
                        </div>
                        <div className="flex flex-col gap-xs">
                          <p className="text-sm font-black uppercase tracking-tight text-white leading-none">
                            {syncStatus === 'synced' || syncStatus === 'online' ? 'Sincronizado' :
                             syncStatus === 'syncing' ? 'Sincronizando...' :
                             syncStatus === 'partial_error' ? 'Sincronização Parcial' :
                             'Erro na Sincronização'}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            Última vez: {lastSyncTime ? format(parseISO(lastSyncTime), "HH:mm 'em' dd/MM", { locale: ptBR }) : 'Nunca'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        onClick={() => syncData()}
                        disabled={syncStatus === 'syncing'}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10"
                      >
                        Sincronizar Agora
                      </Button>
                    </div>

                    {syncStatus === 'partial_error' && syncDetails && (
                      <div className="p-md rounded-sm bg-amber-500/5 border border-amber-500/10 flex flex-col gap-sm">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Itens Pendentes</p>
                        <div className="grid grid-cols-2 gap-sm">
                          {Object.entries(syncDetails).filter(([_, details]: [string, any]) => details?.failed > 0 || details?.success === false).map(([table, details]: [string, any]) => (
                            <div key={table} className="flex items-center justify-between text-[10px] font-bold text-amber-700/70 uppercase">
                              <span>{table === 'cycles' ? 'Ciclos' : table === 'vehicles' ? 'Veículos' : table === 'expenses' ? 'Despesas' : table}</span>
                              <span className="text-amber-500">{details.failed || 1} falhas</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {syncStatus === 'error' && syncError && (
                      <div className="p-md rounded-sm bg-red-500/5 border border-red-500/10">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Erro Detectado</p>
                        <p className="text-[10px] text-red-600/70 font-bold leading-relaxed">{syncError}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            )}

            <section className="flex flex-col gap-sm">
              <div className="flex items-center justify-between px-1">
                <SectionHeader icon={Car} title="Perfil do Veículo" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsAddingVehicle(true)}
                  className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-[#00FFBB] hover:bg-[#00FFBB]/10 rounded-sm"
                >
                  <Plus size={14} className="mr-1" /> Novo Carro
                </Button>
              </div>
        
              <Card className={cn(
                "border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden transition-all duration-500 shadow-premium",
                settings.isPrivacyMode 
                  ? "border-[#00FFBB]/30 shadow-glow" 
                  : "border-white/5"
              )}>
                <CardContent className="p-md md:p-xl flex flex-col gap-lg relative">
                  <AnimatePresence>
                    {settings.isPrivacyMode && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-4 right-lg flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full"
                      >
                        <Shield size={10} className="text-emerald-500" />
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-500">Modo Privado Ativo</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Vehicle Selector */}
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Veículo Ativo</label>
                    <button
                      onClick={() => setShowVehicleSelector(true)}
                      className={cn(
                        "w-full p-md rounded-sm flex items-center justify-between group transition-all border border-white/5 active:scale-[0.98]",
                        currentVehicle 
                          ? "bg-emerald-500/5 border-emerald-500/30 shadow-glow hover:border-emerald-500/50" 
                          : "bg-white/5 border-transparent hover:border-white/10"
                      )}
                    >
                      <div className="flex items-center gap-md">
                        <div className={cn(
                          "w-14 h-14 rounded-sm flex items-center justify-center transition-all duration-500",
                          currentVehicle 
                            ? "bg-emerald-500 text-zinc-950 shadow-glow" 
                            : "bg-white/5 text-zinc-500"
                        )}>
                          {currentVehicle?.category === 'motorcycle' ? <Gauge size={28} /> : <Car size={28} />}
                        </div>
                        <div className="text-left flex flex-col gap-xs">
                          <div className="flex items-center gap-sm">
                            <p className="text-lg font-black tracking-tight leading-none text-white">
                              {currentVehicle?.name || 'Selecionar Veículo'}
                            </p>
                            <AnimatePresence>
                              {saveSuccess && (
                                <motion.div
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: 10 }}
                                  className="flex items-center gap-xs px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest"
                                >
                                  <CheckCircle2 size={10} />
                                  Salvo
                                </motion.div>
                              )}
                            </AnimatePresence>
                            {currentVehicle && !saveSuccess && (
                              <div className="flex items-center gap-xs px-2 py-0.5 bg-emerald-500 text-zinc-950 text-[9px] font-black uppercase rounded-full tracking-widest border border-emerald-400">
                                <div className="w-1 h-1 bg-zinc-950 rounded-full animate-pulse" />
                                Ativo
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            {currentVehicle 
                              ? `${currentVehicle.brand} ${currentVehicle.model} • ${currentVehicle.year} • ${currentVehicle.category === 'motorcycle' ? 'Moto' : 'Carro'}` 
                              : 'Nenhum veículo ativo'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-sm text-zinc-500 group-hover:text-emerald-500 transition-colors">
                        <span className="text-[10px] font-black uppercase tracking-widest">Trocar</span>
                        <ChevronDown size={18} />
                      </div>
                    </button>
                  </div>

            {currentVehicle && (
              <div className="flex flex-col gap-lg">
                <div className="grid grid-cols-2 gap-md md:gap-lg">
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome do Carro</label>
                    <Input 
                      value={settings.isPrivacyMode ? "• • • • • • • •" : currentVehicle.name}
                      readOnly={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        const val = e.target.value;
                        updateVehicle(currentVehicle.id, { name: val });
                        validateVehicleField('name', val);
                      }}
                      className={cn(
                        "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300",
                        settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]",
                        vehicleErrors.name && "border-red-500/50"
                      )}
                    />
                    {vehicleErrors.name && (
                      <p className="text-[9px] font-bold text-red-500 ml-1 uppercase tracking-wider">{vehicleErrors.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Ano</label>
                    <Input 
                      value={settings.isPrivacyMode ? "• • • •" : currentVehicle.year}
                      readOnly={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        const val = e.target.value;
                        updateVehicle(currentVehicle.id, { year: val });
                        validateVehicleField('year', val);
                      }}
                      className={cn(
                        "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300",
                        settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]",
                        vehicleErrors.year && "border-red-500/50"
                      )}
                    />
                    {vehicleErrors.year && (
                      <p className="text-[9px] font-bold text-red-500 ml-1 uppercase tracking-wider">{vehicleErrors.year}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md md:gap-lg">
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Consumo Médio (km/L)</label>
                    <Input 
                      type={settings.isPrivacyMode ? "text" : "number"}
                      inputMode="decimal"
                      value={settings.isPrivacyMode ? "• • • • •" : (settings.kmPerLiter || '')}
                      readOnly={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        updateSettings({ kmPerLiter: e.target.value === '' ? undefined : Number(e.target.value) });
                      }}
                      className={cn(
                        "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-[#00FFBB]",
                        settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                      )}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Preço do Combustível</label>
                    <div className="relative">
                      {!settings.isPrivacyMode && (
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400 uppercase tracking-widest pointer-events-none">
                          R$
                        </span>
                      )}
                      <Input 
                        type={settings.isPrivacyMode ? "text" : "number"}
                        inputMode="decimal"
                        value={settings.isPrivacyMode ? "• • • • •" : (settings.fuelPrice || '')}
                        readOnly={settings.isPrivacyMode}
                        onChange={e => {
                          if (settings.isPrivacyMode) return;
                          updateSettings({ fuelPrice: e.target.value === '' ? undefined : Number(e.target.value) });
                        }}
                        className={cn(
                          "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-amber-500",
                          !settings.isPrivacyMode && "pl-10",
                          settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                        )}
                        placeholder="0,00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-md md:gap-lg">
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Veículo</label>
                    <Select
                      value={currentVehicle.type}
                      disabled={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        updateVehicle(currentVehicle.id, { 
                          type: e.target.value as any, 
                          fixedCosts: { ...currentVehicle.fixedCosts, vehicleType: e.target.value as any } 
                        });
                      }}
                      className={cn(
                        "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-white",
                        settings.isPrivacyMode && "opacity-70 text-zinc-500"
                      )}
                    >
                      <option value="owned">Veículo Próprio</option>
                      <option value="rented">Veículo Alugado</option>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-sm">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Combustível</label>
                    <Select
                      value={currentVehicle.fuelType}
                      disabled={settings.isPrivacyMode}
                      onChange={e => {
                        if (settings.isPrivacyMode) return;
                        updateVehicle(currentVehicle.id, { 
                          fuelType: e.target.value as any
                        });
                      }}
                      className={cn(
                        "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-white",
                        settings.isPrivacyMode && "opacity-70 text-zinc-500"
                      )}
                    >
                      <option value="flex">Flex (G/E)</option>
                      <option value="diesel">Diesel</option>
                      <option value="cng">GNV</option>
                      <option value="electric">Elétrico</option>
                    </Select>
                  </div>
                </div>

                {currentVehicle.type === 'owned' ? (
                  <div className="grid grid-cols-2 gap-md md:gap-lg">
                    <CostInput 
                      label="Seguro" 
                      value={currentVehicle.fixedCosts.insurance} 
                      onChange={val => updateCurrentVehicleCosts({ insurance: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="IPVA" 
                      value={currentVehicle.fixedCosts.ipva} 
                      onChange={val => updateCurrentVehicleCosts({ ipva: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Troca de Óleo" 
                      value={currentVehicle.fixedCosts.oilChange} 
                      onChange={val => updateCurrentVehicleCosts({ oilChange: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Pneus" 
                      value={currentVehicle.fixedCosts.tires} 
                      onChange={val => updateCurrentVehicleCosts({ tires: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Manutenção" 
                      value={currentVehicle.fixedCosts.maintenance} 
                      onChange={val => updateCurrentVehicleCosts({ maintenance: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                    <CostInput 
                      label="Parcela" 
                      value={currentVehicle.fixedCosts.financing} 
                      onChange={val => updateCurrentVehicleCosts({ financing: val })} 
                      isPrivacyMode={settings.isPrivacyMode}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-lg">
                    <div className="grid grid-cols-2 gap-md md:gap-lg">
                      <div className="flex flex-col gap-sm">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                        <Select
                          value={currentVehicle.fixedCosts.rentalPeriod || 'weekly'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ rentalPeriod: e.target.value as any });
                          }}
                          className={cn(
                            "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-white",
                            settings.isPrivacyMode && "opacity-70 text-zinc-500"
                          )}
                        >
                          <option value="weekly">Semanal</option>
                          <option value="monthly">Mensal</option>
                        </Select>
                      </div>
                      <div className="flex flex-col gap-sm">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Empresa Locadora</label>
                        <Select
                          value={currentVehicle.fixedCosts.rentalCompany || 'Localiza'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ rentalCompany: e.target.value });
                          }}
                          className={cn(
                            "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-white",
                            settings.isPrivacyMode && "opacity-70 text-zinc-500"
                          )}
                        >
                          <option value="Localiza">Localiza</option>
                          <option value="Movida">Movida</option>
                          <option value="Unidas">Unidas</option>
                          <option value="Outros">Outros</option>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-md md:gap-lg">
                      <CostInput 
                        label="Valor do Aluguel" 
                        value={currentVehicle.fixedCosts.rentalValue} 
                        onChange={val => updateCurrentVehicleCosts({ rentalValue: val })} 
                        isPrivacyMode={settings.isPrivacyMode}
                      />
                      <div className="flex flex-col gap-sm">
                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Tipo de Franquia</label>
                        <Select
                          value={currentVehicle.fixedCosts.franchiseType || 'unlimited'}
                          disabled={settings.isPrivacyMode}
                          onChange={e => {
                            if (settings.isPrivacyMode) return;
                            updateCurrentVehicleCosts({ franchiseType: e.target.value as any });
                          }}
                          className={cn(
                            "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300 text-white",
                            settings.isPrivacyMode && "opacity-70 text-zinc-500"
                          )}
                        >
                          <option value="unlimited">KM Livre</option>
                          <option value="weekly">Franquia Semanal</option>
                          <option value="monthly">Franquia Mensal</option>
                        </Select>
                      </div>
                    </div>

                    {currentVehicle.fixedCosts.franchiseType !== 'unlimited' && (
                      <div className="grid grid-cols-2 gap-md md:gap-lg">
                        <div className="flex flex-col gap-sm">
                          <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">KM da Franquia</label>
                          <Input 
                            type="number"
                            value={settings.isPrivacyMode ? "• • • •" : (currentVehicle.fixedCosts.franchiseKm || '')}
                            readOnly={settings.isPrivacyMode}
                            onChange={e => {
                              if (settings.isPrivacyMode) return;
                              updateCurrentVehicleCosts({ franchiseKm: Number(e.target.value) });
                            }}
                            className={cn(
                              "h-12 bg-white/5 border border-white/10 rounded-sm font-bold transition-all duration-300",
                              settings.isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
                            )}
                            placeholder="0"
                          />
                        </div>
                        <CostInput 
                          label="Custo KM Excedente" 
                          value={currentVehicle.fixedCosts.excessKmCost} 
                          onChange={val => updateCurrentVehicleCosts({ excessKmCost: val })} 
                          isPrivacyMode={settings.isPrivacyMode}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="p-md bg-white/5 rounded-sm border border-white/5 flex justify-between items-center transition-all duration-500">
                  <div className="flex flex-col gap-xs">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Custo Fixo Diário</p>
                    <div className="flex items-baseline gap-2">
                      <p className="text-xl font-black text-[#00FFBB] transition-all duration-300">
                        {formatCurrency(calculateDailyFixedCost(currentVehicle.fixedCosts), settings.isPrivacyMode)}
                      </p>
                      {settings.isPrivacyMode && <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">(oculto)</span>}
                    </div>
                  </div>
                  <div className="text-right flex flex-col gap-xs">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Total Mensal</p>
                    <div className="flex items-baseline justify-end gap-2">
                      {settings.isPrivacyMode && <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">(oculto)</span>}
                      <p className="text-sm font-bold text-zinc-400 transition-all duration-300">
                        {formatCurrency(calculateMonthlyFixedCost(currentVehicle.fixedCosts), settings.isPrivacyMode)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-md pt-2">
                  <Button 
                    onClick={handleSaveVehicle}
                    disabled={isSaving}
                    className={cn(
                      "w-full h-14 font-black text-lg rounded-sm transition-all duration-300 active:scale-95",
                      saveSuccess 
                        ? "bg-[#00FFBB] text-zinc-950" 
                        : "bg-white/5 text-white hover:bg-[#00FFBB] hover:text-zinc-950 border border-white/10"
                    )}
                  >
                    {isSaving ? (
                      <span className="flex items-center gap-sm">
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Salvando...
                      </span>
                    ) : saveSuccess ? (
                      <motion.span 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-sm"
                      >
                        <CheckCircle2 size={20} className="text-zinc-950" /> Perfil Atualizado
                      </motion.span>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </Button>
                  
                  <AnimatePresence>
                    {saveSuccess && (
                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center text-[10px] font-black text-[#00FFBB] uppercase tracking-[0.2em]"
                      >
                        Alterações sincronizadas com sucesso
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
      {/* Dicas de Configuração - NOVO PARA PREENCHER ESPAÇO */}
      <section className="flex flex-col gap-sm">
        <div className="flex items-center gap-sm px-1">
          <Lightbulb size={14} className="text-amber-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">Dicas de Configuração</h3>
        </div>
        <div className="grid grid-cols-1 gap-md">
          {[
            { title: "Metas Realistas", desc: "Defina metas que cubram seus custos e garantam lucro." },
            { title: "Custos Fixos", desc: "Inclua seguro e manutenção nos custos do veículo." }
          ].map((tip, i) => (
            <Card key={i} className="border-none bg-white/5 border border-white/5 rounded-sm shadow-premium">
              <CardContent className="p-md flex items-start gap-md">
                <Lightbulb size={16} className="text-amber-500 shrink-0" />
                <div className="flex flex-col gap-xs">
                  <p className="text-[10px] font-black uppercase text-white tracking-tight">{tip.title}</p>
                  <p className="text-[10px] font-bold text-zinc-500 leading-tight">{tip.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
          </motion.div>
        )}

        {activeTab === 'system' && (
          <motion.div
            key="system"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-lg"
          >
            <section className="flex flex-col gap-sm">
              <SectionHeader icon={Smartphone} title="Aplicativo" />
              <InstallAppButton variant="premium" />
            </section>

            <section className="flex flex-col gap-sm">
              <SectionHeader icon={Database} title="Dados e Backup" />
              <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
                <CardContent className="p-md md:p-xl flex flex-col gap-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-xs">
                      <p className="text-sm font-bold text-white">Exportar Backup</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Salvar histórico local em JSON</p>
                    </div>
                    <Button onClick={exportBackup} variant="ghost" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10">
                      <Download size={14} className="mr-2" /> Exportar
                    </Button>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-xs">
                      <p className="text-sm font-bold text-white">Importar Backup</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Restaurar de um arquivo JSON</p>
                    </div>
                    <Button onClick={() => fileInputRef.current?.click()} variant="ghost" className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10">
                      <Upload size={14} className="mr-2" /> Importar
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImportBackup} />
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="flex flex-col gap-sm">
              <SectionHeader icon={Sparkles} title="Inteligência Artificial" />
              <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
                <CardContent className="p-md md:p-xl flex flex-col gap-lg">
                  <div className="flex items-start gap-md">
                    <div className="p-3 rounded-sm bg-[#00FFBB]/10 text-[#00FFBB] border border-[#00FFBB]/20 shadow-glow">
                      <Sparkles size={24} />
                    </div>
                    <div className="flex flex-col gap-sm">
                      <p className="text-sm font-bold text-white">Motor de Extração Inteligente</p>
                      <p className="text-[11px] text-zinc-500 font-bold leading-relaxed">
                        A IA está configurada para extrair dados financeiros dos seus prints de forma automática. 
                        Este recurso utiliza processamento seguro para garantir a privacidade dos seus dados.
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FFBB] animate-pulse shadow-glow" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">Serviço Ativo</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Danger Zone */}
            <section className="flex flex-col gap-sm">
              <SectionHeader icon={Shield} title="Zona de Perigo" />
              <Card className="border-none bg-red-500/5 border-red-500/20 rounded-lg overflow-hidden shadow-premium">
                <div className="flex flex-col">
                  <button 
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center justify-between w-full h-16 px-md hover:bg-red-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 flex items-center justify-center text-red-500 bg-red-500/10 rounded-sm border border-red-500/20">
                        <Trash2 size={20} />
                      </div>
                      <div className="text-left flex flex-col gap-xs">
                        <p className="text-xs font-black text-red-500 uppercase tracking-tight">Limpar Todos os Dados</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Apagar histórico local e nuvem</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-red-500/30 group-hover:text-red-500 transition-all group-active:translate-x-1" />
                  </button>

                  <div className="h-px bg-red-500/10" />

                  <button 
                    onClick={handleLogout}
                    className="flex items-center justify-between w-full h-16 px-md hover:bg-white/5 transition-all group"
                  >
                    <div className="flex items-center gap-md">
                      <div className="w-10 h-10 flex items-center justify-center text-zinc-400 bg-white/5 rounded-sm border border-white/10">
                        <LogOut size={20} />
                      </div>
                      <div className="text-left flex flex-col gap-xs">
                        <p className="text-xs font-black text-white uppercase tracking-tight">Sair da Conta</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Desconectar deste dispositivo</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-zinc-500 group-hover:text-white transition-all group-active:translate-x-1" />
                  </button>
                </div>
              </Card>
            </section>
          </motion.div>
        )}

        {activeTab === 'admin' && settings.role === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-lg"
          >
            {adminView === 'stats' ? (
              <section className="flex flex-col gap-lg">
                <SectionHeader icon={Shield} title="Painel Administrativo" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-md md:gap-lg">
                  <StatCard 
                    icon={Users} 
                    title="Usuários Ativos" 
                    value={adminStats.totalUsers} 
                    subtitle="Base Total"
                    color="emerald"
                  />
                  <StatCard 
                    icon={Activity} 
                    title="Ciclos Totais" 
                    value={adminStats.totalCycles} 
                    subtitle="Registrados"
                    color="blue"
                  />
                  <StatCard 
                    icon={Car} 
                    title="Veículos" 
                    value={adminStats.totalVehicles} 
                    subtitle="Frota Total"
                    color="amber"
                  />
                  <StatCard 
                    icon={RefreshCw} 
                    title="Sync Global" 
                    value={
                      adminStats.globalSyncStatus === 'healthy' ? 'Saudável' :
                      adminStats.globalSyncStatus === 'pending' ? 'Sincronizando' :
                      'Atenção'
                    } 
                    subtitle={`${adminStats.pendingSyncItems} pendentes`}
                    color={
                      adminStats.globalSyncStatus === 'healthy' ? 'emerald' :
                      adminStats.globalSyncStatus === 'pending' ? 'amber' :
                      'red'
                    }
                  />
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-md md:gap-lg">
                  <MiniStatCard title="Free vs PRO" value={`${adminStats.freeUsers} / ${adminStats.proUsers}`} />
                  <MiniStatCard title="Novos (Semana)" value={adminStats.newUsersThisWeek} />
                  <MiniStatCard title="Ativos (7d)" value={adminStats.activeUsersLast7Days} />
                  <MiniStatCard title="Marcadores" value={adminStats.pendingMarkers} subtitle="Pendentes" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-md md:gap-lg">
                  <AlertCard 
                    title="Veículos Incompletos" 
                    count={adminStats.incompleteVehicles} 
                    icon={Car}
                    color="amber"
                  />
                  <AlertCard 
                    title="Ciclos com Erro" 
                    count={adminStats.cyclesWithErrors} 
                    icon={AlertCircle}
                    color="red"
                  />
                  <AlertCard 
                    title="Falhas de Importação" 
                    count={adminStats.failedImportReports} 
                    icon={FileWarning}
                    color="red"
                  />
                </div>

                <div className="flex gap-md">
                  <Button 
                    onClick={() => {
                      const diagnostic = {
                        uptime: adminStats.systemUptime,
                        lastUpdate: adminStats.lastUpdate,
                        stats: adminStats,
                        ua: navigator.userAgent,
                        timestamp: new Date().toISOString()
                      };
                      navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
                      toast.success("Diagnóstico copiado!");
                    }}
                    variant="outline"
                    className="flex-1 h-12 rounded-sm border-white/10 bg-white/5 text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Copy size={14} className="mr-2" /> Copiar Diagnóstico Técnico
                  </Button>
                </div>

                <section className="flex flex-col gap-sm">
                  <SectionHeader icon={MapPin} title="Aprovação de Marcadores" />
                  <div className="flex flex-col gap-md">
                    {mapMarkers.filter(m => m.status === 'pending').length === 0 ? (
                      <Card className="border-none bg-white/5 border border-white/5 rounded-sm">
                        <CardContent className="p-xl text-center flex flex-col items-center gap-md">
                          <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                            <CheckCircle2 className="text-zinc-500" size={24} />
                          </div>
                          <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Tudo limpo por aqui</p>
                        </CardContent>
                      </Card>
                    ) : (
                      mapMarkers.filter(m => m.status === 'pending').map(marker => (
                        <Card key={marker.id} className="border-none bg-white/5 border border-white/5 rounded-sm overflow-hidden shadow-premium">
                          <CardContent className="p-md flex items-center justify-between gap-md">
                            <div className="flex items-center gap-md">
                              <div className={cn(
                                "w-10 h-10 rounded-sm flex items-center justify-center border transition-all duration-500",
                                marker.type === 'radar' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                marker.type === 'pothole' || marker.type === 'ditch' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              )}>
                                {marker.type === 'radar' ? <Gauge size={18} /> : 
                                 marker.type === 'pothole' || marker.type === 'ditch' ? <AlertTriangle size={18} /> : 
                                 <MapPin size={18} />}
                              </div>
                              <div className="flex flex-col gap-xs">
                                <p className="text-xs font-black uppercase text-white tracking-tight">
                                  {marker.type === 'radar' ? 'Radar' : 
                                   marker.type === 'pothole' ? 'Buraco' :
                                   marker.type === 'ditch' ? 'Valeta' :
                                   marker.type === 'bathroom' ? 'Banheiro' :
                                   marker.type === 'water' ? 'Água' : 'Perigo'}
                                </p>
                                <p className="text-[10px] text-zinc-500 font-bold">{marker.description || 'Sem descrição'}</p>
                                <p className="text-[8px] text-zinc-500 uppercase tracking-[0.2em] opacity-40">
                                  {new Date(marker.createdAt).toLocaleDateString()} • {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-sm">
                              <Button 
                                onClick={() => rejectMapMarker(marker.id)}
                                variant="ghost" 
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-sm bg-red-500/10 text-red-500 hover:bg-red-500/20"
                              >
                                Rejeitar
                              </Button>
                              <Button 
                                onClick={() => approveMapMarker(marker.id)}
                                className="h-8 px-3 text-[10px] font-black uppercase tracking-widest rounded-sm bg-[#00FFBB] text-zinc-950 shadow-glow"
                              >
                                Aprovar
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </section>

                <section className="flex flex-col gap-sm">
                  <SectionHeader icon={History} title="Logs Recentes de Sincronização" />
                  <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
                    <CardContent className="p-0">
                      <div className="flex flex-col divide-y divide-white/5">
                        {[
                          { user: 'João Silva', status: 'success', time: '2 min atrás', items: 12 },
                          { user: 'Maria Santos', status: 'success', time: '5 min atrás', items: 8 },
                          { user: 'Pedro Oliveira', status: 'error', time: '12 min atrás', items: 0, error: 'Sem resposta' },
                          { user: 'Ana Costa', status: 'success', time: '15 min atrás', items: 24 },
                        ].map((log, i) => (
                          <div key={i} className="p-md flex items-center justify-between hover:bg-white/5 transition-colors group">
                            <div className="flex items-center gap-md">
                              <div className={cn(
                                "w-2 h-2 rounded-full shadow-glow",
                                log.status === 'success' ? "bg-[#00FFBB]" : "bg-red-500"
                              )} />
                              <div className="flex flex-col gap-xs">
                                <p className="text-xs font-bold text-white group-hover:text-[#00FFBB] transition-colors">{log.user}</p>
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                                  {log.status === 'success' ? `${log.items} itens sincronizados` : `Falha: ${log.error}`}
                                </p>
                              </div>
                            </div>
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{log.time}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </section>

                <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-lg overflow-hidden shadow-premium">
                  <CardContent className="p-md md:p-xl flex flex-col gap-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-xs">
                        <p className="text-sm font-bold text-white">Gerenciamento de Usuários</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Visualizar e editar permissões</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('users')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10"
                      >
                        Abrir Lista
                      </Button>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-xs">
                        <p className="text-sm font-bold text-white">Logs do Sistema</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Monitorar erros e eventos</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('logs')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10"
                      >
                        Ver Logs
                      </Button>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-xs">
                        <p className="text-sm font-bold text-white">Configurações Globais</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Ajustar parâmetros do app</p>
                      </div>
                      <Button 
                        onClick={() => setAdminView('configs')}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10"
                      >
                        Configurar
                      </Button>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-xs">
                        <p className="text-sm font-bold text-white">Diagnóstico Técnico</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Copiar dados para suporte</p>
                      </div>
                      <Button 
                        onClick={() => {
                          const diagnostic = {
                            user: { id: user?.id, email: user?.email },
                            device: {
                              userAgent: navigator.userAgent,
                              platform: navigator.platform,
                              language: navigator.language,
                              screen: `${window.screen.width}x${window.screen.height}`
                            },
                            sync: {
                              status: syncStatus,
                              lastSync: lastSyncTime,
                              error: syncError,
                              details: syncDetails
                            },
                            app: {
                              plan,
                              version: '1.0.0-production',
                              onboardingCompleted: settings.onboardingCompleted
                            }
                          };
                          navigator.clipboard.writeText(JSON.stringify(diagnostic, null, 2));
                          toast.success('Diagnóstico copiado para a área de transferência');
                        }}
                        variant="ghost" 
                        className="h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-sm bg-white/5 text-white hover:bg-white/10"
                      >
                        <Copy size={14} className="mr-2" /> Copiar JSON
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="p-md rounded-sm bg-amber-500/5 border border-amber-500/20 flex items-start gap-md">
                  <AlertCircle size={18} className="text-amber-500 shrink-0" />
                  <div className="flex flex-col gap-xs">
                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Atenção Admin</p>
                    <p className="text-[10px] text-amber-500/60 font-bold leading-relaxed">
                      Você está acessando áreas restritas do sistema. Alterações aqui podem afetar todos os usuários. Proceda com cautela.
                    </p>
                  </div>
                </div>
              </section>
            ) : adminView === 'users' ? (
              <section className="flex flex-col gap-lg">
                <div className="flex items-center gap-md mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full bg-white/5 hover:bg-white/10">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Users} title="Gerenciamento de Usuários" />
                </div>
                <div className="flex flex-col gap-md">
                  {allUsers.length === 0 ? (
                    <Card className="border-none bg-white/5 border border-white/5 rounded-sm">
                      <CardContent className="p-xl text-center">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhum usuário encontrado</p>
                      </CardContent>
                    </Card>
                  ) : (
                    allUsers.map(u => (
                      <Card key={u.id} className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-sm overflow-hidden shadow-premium">
                        <CardContent className="p-md flex flex-col md:flex-row md:items-center justify-between gap-lg">
                          <div className="flex items-center gap-md">
                            <div className="w-12 h-12 rounded-sm bg-white/5 flex items-center justify-center border border-white/10">
                              <User size={24} className="text-zinc-500" />
                            </div>
                            <div className="flex flex-col gap-xs">
                              <p className="text-xs font-bold text-white">{u.name || 'Usuário sem nome'}</p>
                              <p className="text-[10px] text-zinc-500 font-bold">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-md">
                            <div className="flex flex-col gap-xs">
                              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Cargo</p>
                              <Select 
                                value={u.role} 
                                onChange={(e) => updateUserRole(u.id, e.target.value as UserRole)}
                                className="h-9 min-w-[120px] text-[10px] bg-white/5 border border-white/10 rounded-sm text-white font-bold"
                              >
                                <option value={UserRole.DRIVER} className="bg-zinc-900">Motorista</option>
                                <option value={UserRole.ADMIN} className="bg-zinc-900">Admin</option>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-xs">
                              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Status</p>
                              <Select 
                                value={u.status} 
                                onChange={(e) => updateUserStatus(u.id, e.target.value as UserStatus)}
                                className="h-9 min-w-[120px] text-[10px] bg-white/5 border border-white/10 rounded-sm text-white font-bold"
                              >
                                <option value={UserStatus.ACTIVE} className="bg-zinc-900">Ativo</option>
                                <option value={UserStatus.BLOCKED} className="bg-zinc-900">Bloqueado</option>
                              </Select>
                            </div>
                            <div className="flex flex-col gap-xs">
                              <p className="text-[8px] font-black uppercase text-zinc-500 tracking-widest">Ações</p>
                              <Button 
                                onClick={() => {
                                  toast.promise(
                                    new Promise((resolve) => setTimeout(resolve, 1500)),
                                    {
                                      loading: 'Reprocessando sincronização...',
                                      success: `Sync de ${u.name || 'usuário'} reprocessado!`,
                                      error: 'Erro ao reprocessar',
                                    }
                                  );
                                }}
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-sm bg-white/5 text-zinc-400 hover:text-[#00FFBB] border border-white/10"
                              >
                                <RefreshCw size={16} />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            ) : adminView === 'logs' ? (
              <section className="flex flex-col gap-lg">
                <div className="flex items-center gap-md mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full bg-white/5 hover:bg-white/10">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Activity} title="Logs do Sistema" />
                </div>
                <Card className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-sm overflow-hidden shadow-premium">
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-white/5">
                            <th className="p-md text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">Data</th>
                            <th className="p-md text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">Nível</th>
                            <th className="p-md text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">Mensagem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {systemLogs.map(log => (
                            <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                              <td className="p-md text-[10px] text-zinc-500 font-bold whitespace-nowrap">
                                {new Date(log.timestamp).toLocaleString()}
                              </td>
                              <td className="p-md">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                  log.level === 'error' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                  log.level === 'warn' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                  "bg-blue-500/10 text-blue-500 border-blue-500/20"
                                )}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="p-md text-[10px] font-bold text-zinc-300">
                                {log.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </section>
            ) : (
              <section className="flex flex-col gap-lg">
                <div className="flex items-center gap-md mb-2">
                  <Button variant="ghost" size="icon" onClick={() => setAdminView('stats')} className="rounded-full bg-white/5 hover:bg-white/10">
                    <ChevronRight className="rotate-180" size={20} />
                  </Button>
                  <SectionHeader icon={Globe} title="Configurações Globais" />
                </div>
                <div className="flex flex-col gap-md">
                  {globalConfigs.length === 0 ? (
                    <Card className="border-none bg-white/5 border border-white/5 rounded-sm">
                      <CardContent className="p-xl text-center">
                        <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Nenhuma configuração global encontrada</p>
                      </CardContent>
                    </Card>
                  ) : (
                    globalConfigs.map(config => (
                      <Card key={config.id} className="border-none bg-[#0B0C10]/60 backdrop-blur-3xl border border-white/5 rounded-sm overflow-hidden shadow-premium">
                        <CardContent className="p-md flex flex-col gap-md">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#00FFBB]">{config.key}</p>
                            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Atualizado: {new Date(config.updated_at).toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-md">
                            <Input 
                              defaultValue={JSON.stringify(config.value)}
                              onBlur={(e) => {
                                try {
                                  const val = JSON.parse(e.target.value);
                                  updateGlobalConfig(config.key, val);
                                } catch (err) {
                                  toast.error('Valor JSON inválido');
                                }
                              }}
                              className="h-10 text-xs bg-white/5 border border-white/10 rounded-sm text-white font-bold"
                            />
                          </div>
                          {config.description && <p className="text-[10px] text-zinc-500 font-bold italic">{config.description}</p>}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vehicle Selector Bottom Sheet */}
      <AnimatePresence>
        {showVehicleSelector && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVehicleSelector(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-x-0 bottom-0 bg-[#0B0C10] border-t border-white/5 z-[110] rounded-t-lg p-md pb-xl md:p-xl max-h-[85vh] overflow-y-auto shadow-premium"
            >
              <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mb-xl opacity-20" />
              
              <div className="flex justify-between items-center mb-lg px-2">
                <div className="flex flex-col gap-xs">
                  <h3 className="text-2xl font-black tracking-tighter text-white">Meus Veículos</h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Garagem Digital</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowVehicleSelector(false);
                    setIsAddingVehicle(true);
                  }}
                  className="text-[#00FFBB] font-black uppercase tracking-widest text-[10px] bg-[#00FFBB]/10 rounded-sm px-4"
                >
                  <Plus size={14} className="mr-2" /> Novo
                </Button>
              </div>

              <div className="flex flex-col gap-md">
                {vehicles.map(v => {
                  const isActive = settings.currentVehicleProfileId === v.id;
                  return (
                    <div
                      key={v.id}
                      className={cn(
                        "w-full p-md rounded-sm flex items-center justify-between transition-all border-2",
                        isActive
                          ? "bg-[#00FFBB]/5 border-[#00FFBB] shadow-glow"
                          : "bg-white/5 border-transparent hover:border-white/10"
                      )}
                    >
                      <div 
                        className="flex items-center gap-md flex-1 cursor-pointer"
                        onClick={() => handleSelectVehicle(v.id)}
                      >
                        <div className={cn(
                          "w-14 h-14 rounded-sm flex items-center justify-center transition-all duration-500 border",
                          isActive 
                            ? "bg-[#00FFBB] text-zinc-950 scale-105 border-[#00FFBB] shadow-glow" 
                            : "bg-white/5 text-zinc-500 border-white/10"
                        )}>
                          {v.category === 'motorcycle' ? <Gauge size={28} /> : <Car size={28} />}
                        </div>
                        <div className="text-left flex flex-col gap-xs">
                          <div className="flex items-center gap-sm">
                            <p className={cn("font-black tracking-tight leading-none text-white", isActive ? "text-lg" : "text-sm")}>
                              {v.name}
                            </p>
                            {isActive && (
                              <div className="flex items-center gap-1 px-2 py-0.5 bg-[#00FFBB] text-zinc-950 text-[8px] font-black uppercase rounded-full tracking-widest shadow-glow">
                                <div className="w-1 h-1 bg-zinc-950 rounded-full animate-pulse" />
                                Ativo
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {v.brand} {v.model} • {v.year}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-sm">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditVehicle(v);
                          }}
                          className="w-10 h-10 rounded-sm text-zinc-400 bg-white/5 hover:text-white border border-white/10"
                        >
                          <Edit2 size={18} />
                        </Button>
                        {!isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingVehicleId(v.id);
                            }}
                            className="w-10 h-10 rounded-sm text-red-500 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20"
                          >
                            <Trash2 size={18} />
                          </Button>
                        )}
                        <ChevronRight size={20} className={cn("transition-colors", isActive ? "text-[#00FFBB]" : "text-zinc-600")} />
                      </div>
                    </div>
                  );
                })}

                {vehicles.length === 0 && (
                  <div className="text-center py-xl flex flex-col items-center gap-lg">
                    <div className="w-20 h-20 bg-white/5 rounded-sm flex items-center justify-center text-zinc-600 border border-white/10 border-dashed">
                      <Car size={40} />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <p className="font-bold text-white uppercase tracking-widest text-sm">Nenhum veículo</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Sua garagem está vazia</p>
                    </div>
                    <Button 
                      onClick={() => {
                        setShowVehicleSelector(false);
                        setIsAddingVehicle(true);
                      }}
                      className="bg-[#00FFBB] text-zinc-950 font-black uppercase tracking-widest h-12 px-8 rounded-sm shadow-glow"
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

      {/* Add/Edit Vehicle Modal */}
      <AnimatePresence>
        {isAddingVehicle && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsAddingVehicle(false);
                setEditingVehicleId(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120]"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="fixed inset-x-lg top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[500px] bg-[#0B0C10] z-[130] rounded-lg shadow-premium overflow-hidden flex flex-col border border-white/5"
            >
              <div className="p-xl border-b border-white/5 flex justify-between items-center shrink-0">
                <div className="flex flex-col gap-xs">
                  <h3 className="text-2xl font-black tracking-tighter text-white">
                    {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
                  </h3>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Painel de Ativos</p>
                </div>
                <button 
                  onClick={() => {
                    setIsAddingVehicle(false);
                    setEditingVehicleId(null);
                  }}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-xl scrollbar-hide">
                <form id="vehicle-form" onSubmit={handleAddVehicle} className="flex flex-col gap-lg">
                  {(() => {
                    const vehicle = editingVehicleId ? vehicles.find(v => v.id === editingVehicleId) : null;
                    return (
                      <>
                        <div className="flex flex-col gap-sm">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome do Perfil</label>
                          <Input 
                            name="name" 
                            defaultValue={vehicle?.name}
                            required 
                            placeholder="Ex: Meu Uber, Carro da Família"
                            className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-md">
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Marca</label>
                            <Input 
                              name="brand" 
                              defaultValue={vehicle?.brand}
                              required 
                              placeholder="Ex: Toyota"
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                            />
                          </div>
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Modelo</label>
                            <Input 
                              name="model" 
                              defaultValue={vehicle?.model}
                              required 
                              placeholder="Ex: Corolla"
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Ano</label>
                            <Input 
                              name="year" 
                              defaultValue={vehicle?.year}
                              required 
                              placeholder="Ex: 2022"
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                            />
                          </div>
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Placa (Opcional)</label>
                            <Input 
                              name="plate" 
                              defaultValue={vehicle?.plate}
                              placeholder="ABC-1234"
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo</label>
                            <Select 
                              name="type" 
                              defaultValue={vehicle?.type || 'owned'}
                              onChange={e => setModalVehicleType(e.target.value as any)}
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white"
                            >
                              <option value="owned" className="bg-zinc-900">Próprio</option>
                              <option value="rented" className="bg-zinc-900">Alugado</option>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Categoria</label>
                            <Select 
                              name="category" 
                              defaultValue={vehicle?.category || 'car'}
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white"
                            >
                              <option value="car" className="bg-zinc-900">Carro</option>
                              <option value="motorcycle" className="bg-zinc-900">Moto</option>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Combustível</label>
                            <Select 
                              name="fuelType" 
                              defaultValue={vehicle?.fuelType || 'flex'}
                              onChange={e => setModalFuelType(e.target.value)}
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white"
                            >
                              <option value="flex" className="bg-zinc-900">Flex (G/E)</option>
                              <option value="diesel" className="bg-zinc-900">Diesel</option>
                              <option value="cng" className="bg-zinc-900">GNV</option>
                              <option value="electric" className="bg-zinc-900">Elétrico</option>
                            </Select>
                          </div>
                          <div className="flex flex-col gap-sm">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Preço ({modalFuelType === 'electric' ? 'kWh' : 'L'})</label>
                            <Input 
                              name="unitPrice" 
                              type="number" 
                              step="0.01" 
                              defaultValue={vehicle?.fuelPrice || vehicle?.kwhPrice}
                              className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                            />
                          </div>
                        </div>
                        <div className="flex flex-col gap-sm">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Consumo (km/{modalFuelType === 'electric' ? 'kWh' : 'L'})</label>
                          <Input 
                            name="kmPerUnit" 
                            type="number" 
                            step="0.1" 
                            defaultValue={vehicle?.kmPerLiter || vehicle?.kmPerKwh}
                            className="h-12 bg-white/5 border-white/10 rounded-sm font-bold text-white" 
                          />
                        </div>

                        <div className="pt-md border-t border-white/5 flex flex-col gap-md">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#00FFBB]">Custos Fixos de Operação</h4>
                          
                          {modalVehicleType === 'owned' ? (
                            <div className="grid grid-cols-2 gap-md">
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Seguro (Mensal)</label>
                                <Input name="insurance" type="number" defaultValue={vehicle?.fixedCosts?.insurance} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">IPVA (Mensal)</label>
                                <Input name="ipva" type="number" defaultValue={vehicle?.fixedCosts?.ipva} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Manutenção (Mensal)</label>
                                <Input name="maintenance" type="number" defaultValue={vehicle?.fixedCosts?.maintenance} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Pneus (Mensal)</label>
                                <Input name="tires" type="number" defaultValue={vehicle?.fixedCosts?.tires} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Troca de Óleo (Mensal)</label>
                                <Input name="oilChange" type="number" defaultValue={vehicle?.fixedCosts?.oilChange} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                              <div className="flex flex-col gap-sm">
                                <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Parcela (Mensal)</label>
                                <Input name="financing" type="number" defaultValue={vehicle?.fixedCosts?.financing} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-md">
                              <div className="grid grid-cols-2 gap-md">
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo de Aluguel</label>
                                  <Select name="rentalPeriod" defaultValue={vehicle?.fixedCosts?.rentalPeriod || 'weekly'} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs">
                                    <option value="weekly" className="bg-zinc-900">Semanal</option>
                                    <option value="monthly" className="bg-zinc-900">Mensal</option>
                                  </Select>
                                </div>
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Empresa Locadora</label>
                                  <Select name="rentalCompany" defaultValue={vehicle?.fixedCosts?.rentalCompany || 'Localiza'} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs">
                                    <option value="Localiza" className="bg-zinc-900">Localiza</option>
                                    <option value="Movida" className="bg-zinc-900">Movida</option>
                                    <option value="Unidas" className="bg-zinc-900">Unidas</option>
                                    <option value="Outros" className="bg-zinc-900">Outros</option>
                                  </Select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-md">
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Valor do Aluguel</label>
                                  <Input name="rentalValue" type="number" defaultValue={vehicle?.fixedCosts?.rentalValue} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                                </div>
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Tipo de Franquia</label>
                                  <Select 
                                    name="franchiseType" 
                                    defaultValue={vehicle?.fixedCosts?.franchiseType || 'unlimited'} 
                                    onChange={e => setModalFranchiseType(e.target.value)}
                                    className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs"
                                  >
                                    <option value="unlimited" className="bg-zinc-900">KM Livre</option>
                                    <option value="weekly" className="bg-zinc-900">Franquia Semanal</option>
                                    <option value="monthly" className="bg-zinc-900">Franquia Mensal</option>
                                  </Select>
                                </div>
                              </div>
                              
                              {modalFranchiseType !== 'unlimited' && (
                                <div className="grid grid-cols-2 gap-md">
                                  <div className="flex flex-col gap-sm">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">KM da Franquia</label>
                                    <Input name="franchiseKm" type="number" defaultValue={vehicle?.fixedCosts?.franchiseKm} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                                  </div>
                                  <div className="flex flex-col gap-sm">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Custo KM Excedente</label>
                                    <Input name="excessKmCost" type="number" step="0.01" defaultValue={vehicle?.fixedCosts?.excessKmCost} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {modalFuelType === 'electric' && (
                            <div className="flex flex-col gap-md">
                              <div className="grid grid-cols-2 gap-md">
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Maint. Bateria (Mensal)</label>
                                  <Input name="batteryMaintenance" type="number" defaultValue={vehicle?.fixedCosts?.batteryMaintenance} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                                </div>
                                <div className="flex flex-col gap-sm">
                                  <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Estação de Carga (Mensal)</label>
                                  <Input name="chargingStation" type="number" defaultValue={vehicle?.fixedCosts?.chargingStation} className="h-10 bg-white/5 border-white/10 rounded-sm font-bold text-white text-xs" />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </form>
              </div>

              <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                <Button 
                  form="vehicle-form"
                  type="submit" 
                  disabled={isSaving}
                  className="w-full h-16 bg-emerald-500 text-zinc-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-500/20"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </div>
                  ) : (editingVehicleId ? "Atualizar Veículo" : "Salvar Veículo")}
                </Button>
              </div>
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
    </div>
  );
};

const SectionHeader = ({ icon: Icon, title }: any) => (
  <div className="flex items-center gap-md px-1 mb-md">
    <div className="w-10 h-10 rounded-sm bg-[#00FFBB]/10 flex items-center justify-center border border-[#00FFBB]/20 shadow-glow">
      <Icon size={20} strokeWidth={2.5} className="text-[#00FFBB]" />
    </div>
    <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.3em] text-zinc-500 italic">{title}</h3>
  </div>
);

const StatCard = ({ icon: Icon, title, value, subtitle, color }: any) => (
  <Card className="border-none bg-[#0B0C10]/60 border border-white/5 rounded-lg overflow-hidden shadow-premium group">
    <CardContent className="p-md md:p-lg flex flex-col gap-md">
      <div className={cn(
        "flex items-center gap-2",
        color === 'emerald' ? "text-[#00FFBB]" :
        color === 'blue' ? "text-blue-400" :
        color === 'amber' ? "text-amber-400" :
        "text-red-400"
      )}>
        <Icon size={16} strokeWidth={2.5} />
        <p className="text-[9px] font-black uppercase tracking-[0.15em] opacity-80">{title}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-2xl md:text-3xl font-black tracking-tighter text-white tabular-nums italic">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{subtitle}</p>
      </div>
    </CardContent>
  </Card>
);

const MiniStatCard = ({ title, value, subtitle }: any) => (
  <Card className="border-none bg-white/5 border border-white/5 rounded-sm overflow-hidden shadow-premium">
    <CardContent className="p-md flex flex-col gap-xs">
      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{title}</p>
      <p className="text-sm font-black text-white">{value}</p>
      {subtitle && <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest">{subtitle}</p>}
    </CardContent>
  </Card>
);

const AlertCard = ({ title, count, icon: Icon, color }: any) => (
  <Card className={cn(
    "border-none rounded-sm border-2",
    color === 'amber' ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20"
  )}>
    <CardContent className="p-md flex items-center justify-between">
      <div className="flex items-center gap-md">
        <div className={cn(
          "w-9 h-9 rounded-sm flex items-center justify-center border",
          color === 'amber' ? "bg-amber-500/10 text-amber-500 border-amber-500/10" : "bg-red-500/10 text-red-500 border-red-500/10"
        )}>
          <Icon size={18} />
        </div>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</p>
      </div>
      <p className={cn(
        "text-xl font-black italic",
        color === 'amber' ? "text-amber-500" : "text-red-500"
      )}>{count}</p>
    </CardContent>
  </Card>
);

const CostInput = ({ label, value, onChange, isPrivacyMode }: { label: string, value?: number, onChange: (val: number | undefined) => void, isPrivacyMode?: boolean }) => (
  <div className="flex flex-col gap-sm">
    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative">
      {!isPrivacyMode && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-500 uppercase tracking-widest pointer-events-none">
          R$
        </span>
      )}
      <Input 
        type={isPrivacyMode ? "text" : "number"}
        inputMode="decimal"
        value={isPrivacyMode ? "• • • • •" : (value === undefined ? '' : value)} 
        readOnly={isPrivacyMode}
        onChange={e => {
          if (isPrivacyMode) return;
          const val = e.target.value;
          onChange(val === '' ? undefined : Number(val));
        }}
        className={cn(
          "h-11 bg-white/5 border-white/5 rounded-sm font-bold text-sm text-white transition-all duration-300",
          !isPrivacyMode && "pl-9",
          isPrivacyMode && "tracking-[0.3em] text-zinc-500 blur-[0.5px]"
        )}
        placeholder="0,00"
      />
    </div>
  </div>
);

const SettingsItem = ({ icon: Icon, title, description, onClick, color, loading, disabled }: any) => (
  <button 
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(
      "flex items-center justify-between w-full group py-2 transition-all active:scale-[0.98]",
      (disabled || loading) && "opacity-50 cursor-not-allowed"
    )}
  >
    <div className="flex items-center gap-md">
      <div className={cn("w-12 h-12 rounded-sm bg-white/5 border border-white/5 flex items-center justify-center transition-all group-hover:border-[#00FFBB]/50 group-hover:bg-[#00FFBB]/5", color)}>
        <Icon size={20} className={cn("transition-colors group-hover:text-[#00FFBB]", loading && "animate-spin")} />
      </div>
      <div className="text-left flex flex-col gap-xs">
        <p className="text-sm font-bold tracking-tight text-white group-hover:text-[#00FFBB] transition-colors">{title}</p>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{description}</p>
      </div>
    </div>
    <ChevronRight size={18} className="text-zinc-600 group-hover:text-white transition-all group-hover:translate-x-1" />
  </button>
);

export default Settings;
