import { AppIconName } from '../../../shared/ui/app-icon/app-icon';
import { StatusTone } from '../../../shared/ui/status-badge/status-badge';

export type AdminSectionKey = 'raffles' | 'participants' | 'reports' | 'settings';
export interface AdminRow { title:string;detail:string;value:string;status:string;tone:StatusTone; }
export interface AdminSection { eyebrow:string;title:string;description:string;action:string;icon:AppIconName;stats:readonly {label:string;value:string;detail:string}[];rows:readonly AdminRow[];note:string; }

const unavailableStats = [
  { label: 'Estado del backend', value: 'Sin endpoint', detail: 'La interfaz no muestra datos simulados' },
] as const;

export const adminSections: Record<AdminSectionKey, AdminSection> = {
  raffles: { eyebrow:'Catálogo',title:'Rifas',description:'Este módulo se habilitará cuando exista su dominio y API.',action:'Módulo no disponible',icon:'raffle',stats:unavailableStats,rows:[],note:'El backend actual implementa bingo de números repetidos, no un módulo independiente de rifas.' },
  participants: { eyebrow:'Comunidad',title:'Participantes',description:'El listado administrativo de usuarios todavía no está expuesto.',action:'Endpoint requerido',icon:'users',stats:unavailableStats,rows:[],note:'Existen usuarios y participaciones internas, pero falta un endpoint administrativo paginado y autorizado.' },
  reports: { eyebrow:'Análisis',title:'Reportes',description:'Los agregados comerciales requieren consultas específicas del backend.',action:'Endpoint requerido',icon:'reports',stats:unavailableStats,rows:[],note:'No se calculan cifras en el navegador ni se presentan métricas ficticias.' },
  settings: { eyebrow:'Sistema',title:'Configuración',description:'La configuración operativa aún no tiene endpoints de lectura y escritura.',action:'Endpoint requerido',icon:'settings',stats:unavailableStats,rows:[],note:'La identidad visual permanece en código; los parámetros del negocio siguen gobernados por Laravel.' },
};