import React, { useState } from 'react';
import Papa from 'papaparse';
import { Ride, AppType } from '../types';
import { Button, Card, CardContent, Input, Select } from './UI';
import { Upload, X, Check, AlertCircle } from 'lucide-react';
import { format, parse } from 'date-fns';

interface CSVImporterProps {
  onImport: (rides: Omit<Ride, 'id'>[]) => void;
  onClose: () => void;
}

export const CSVImporter: React.FC<CSVImporterProps> = ({ onImport, onClose }) => {
  const [importedData, setImportedData] = useState<Omit<Ride, 'id'>[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedRides: Omit<Ride, 'id'>[] = results.data.map((row: any) => {
          // Heuristic to identify columns (Uber/99 formats vary)
          const dateStr = row.Data || row.date || row.Date || format(new Date(), 'yyyy-MM-dd');
          const gross = parseFloat(row.Valor || row.amount || row.Gross || '0');
          const tips = parseFloat(row.Gorjeta || row.tips || row.Tips || '0');
          const bonus = parseFloat(row.Bônus || row.bonus || row.Bonus || '0');
          const km = parseFloat(row.KM || row.distance || row.km || '0');
          const hours = parseFloat(row.Horas || row.hours || row.Hours || '1');
          const app = (row.App || row.app || 'Uber') as AppType;

          return {
            date: dateStr,
            app,
            grossValue: gross,
            tips,
            bonus,
            onlineHours: hours,
            kmDriven: km,
          };
        });
        setImportedData(parsedRides);
        setIsReviewing(true);
      },
    });
  };

  const handleSave = () => {
    onImport(importedData);
    onClose();
  };

  const updateRide = (index: number, field: keyof Omit<Ride, 'id'>, value: any) => {
    const newData = [...importedData];
    newData[index] = { ...newData[index], [field]: value };
    setImportedData(newData);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardContent className="p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Importar Ganhos (CSV)</h2>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700">
              <X size={24} />
            </button>
          </div>

          {!isReviewing ? (
            <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center">
              <Upload size={48} className="mx-auto mb-4 text-emerald-600 opacity-50" />
              <p className="text-zinc-500 mb-4">Selecione o arquivo CSV exportado da Uber ou 99</p>
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button as="span" className="cursor-pointer">Selecionar Arquivo</Button>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl flex gap-3 mb-4">
                <AlertCircle size={20} className="text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Revise os dados abaixo antes de salvar. Você pode editar qualquer campo se a identificação automática falhou.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 dark:border-zinc-800">
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">Data</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">App</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">Bruto</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">Gorjeta</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">Bônus</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">KM</th>
                      <th className="p-2 font-bold text-zinc-500 uppercase text-[10px]">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {importedData.map((ride, idx) => (
                      <tr key={idx}>
                        <td className="p-1">
                          <Input 
                            type="date" 
                            className="h-8 text-xs" 
                            value={ride.date} 
                            onChange={e => updateRide(idx, 'date', e.target.value)}
                          />
                        </td>
                        <td className="p-1">
                          <Select 
                            className="h-8 text-xs" 
                            value={ride.app} 
                            onChange={e => updateRide(idx, 'app', e.target.value as AppType)}
                          >
                            <option value="Uber">Uber</option>
                            <option value="99">99</option>
                            <option value="Particular">Particular</option>
                          </Select>
                        </td>
                        <td className="p-1">
                          <Input 
                            type="number" 
                            className="h-8 text-xs w-20" 
                            value={ride.grossValue} 
                            onChange={e => updateRide(idx, 'grossValue', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="p-1">
                          <Input 
                            type="number" 
                            className="h-8 text-xs w-16" 
                            value={ride.tips} 
                            onChange={e => updateRide(idx, 'tips', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="p-1">
                          <Input 
                            type="number" 
                            className="h-8 text-xs w-16" 
                            value={ride.bonus} 
                            onChange={e => updateRide(idx, 'bonus', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="p-1">
                          <Input 
                            type="number" 
                            className="h-8 text-xs w-16" 
                            value={ride.kmDriven} 
                            onChange={e => updateRide(idx, 'kmDriven', parseFloat(e.target.value))}
                          />
                        </td>
                        <td className="p-1">
                          <Input 
                            type="number" 
                            className="h-8 text-xs w-16" 
                            value={ride.onlineHours} 
                            onChange={e => updateRide(idx, 'onlineHours', parseFloat(e.target.value))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setIsReviewing(false)}>Voltar</Button>
                <Button className="flex-1" onClick={handleSave}>Confirmar Importação ({importedData.length})</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
