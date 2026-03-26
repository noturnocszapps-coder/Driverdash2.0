import { formatInTimeZone } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const TIMEZONE = 'America/Sao_Paulo';

export const formatDateTimeBR = (date: string | Date | number, formatStr: string = 'dd/MM/yyyy HH:mm') => {
  return formatInTimeZone(new Date(date), TIMEZONE, formatStr, { locale: ptBR });
};

export const formatTimeBR = (date: string | Date | number) => {
  return formatInTimeZone(new Date(date), TIMEZONE, 'HH:mm', { locale: ptBR });
};

export const formatDateBR = (date: string | Date | number) => {
  return formatInTimeZone(new Date(date), TIMEZONE, 'dd/MM/yyyy', { locale: ptBR });
};
