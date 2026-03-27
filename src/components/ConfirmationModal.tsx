import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './UI';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'primary';
}

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  variant = 'danger'
}: ConfirmationModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[110] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden pointer-events-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    variant === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    <AlertCircle size={24} />
                  </div>
                  <button
                    onClick={onClose}
                    className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-black tracking-tight">{title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed font-medium">
                    {message}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    {cancelText}
                  </Button>
                  <Button
                    variant={variant}
                    onClick={() => {
                      onConfirm();
                      onClose();
                    }}
                    className="flex-1 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
                  >
                    {confirmText}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
