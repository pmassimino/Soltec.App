// utils/cosechas.ts
import { Cosecha } from '../services/models';

export interface CosechaAgrupada extends Cosecha {
  /** Nombre del cereal, p. ej. "Soja" */
  nombreCereal: string;
  /** Campaña, p. ej. "2024/25" (vacío si no se pudo deducir) */
  campania: string;
  /** Texto corto para mostrar dentro del grupo: campaña y, si hace falta, sucursal */
  etiqueta: string;
}

export interface GrupoCereal {
  clave: string;
  nombre: string;
  saldo: number;
  cosechas: CosechaAgrupada[];
}

const sinAcentos = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Los nombres suelen venir en mayúsculas y sin tildes desde el sistema
const CON_TILDE: Record<string, string> = { maiz: 'maíz', algodon: 'algodón', mani: 'maní' };

const capitalizar = (s: string) =>
  s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => CON_TILDE[p] ?? p)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

/**
 * Separa "SOJA 2024/25" en cereal y campaña: el cereal son las palabras antes
 * de la primera que tiene números ("MAIZ TARDIO 24-25" -> "Maiz Tardio", "24-25").
 */
export const separarCereal = (nombre: string): { cereal: string; campania: string } => {
  const partes = nombre.replace(/[-–]\s*(?=\d)/, ' ').trim().split(/\s+/).filter(Boolean);
  const i = partes.findIndex((p) => /\d/.test(p));
  if (i <= 0) return { cereal: capitalizar(nombre.trim()) || 'Cosecha', campania: i === 0 ? nombre.trim() : '' };
  return { cereal: capitalizar(partes.slice(0, i).join(' ')), campania: partes.slice(i).join(' ') };
};

/** Agrupa las cosechas por cereal, con la campaña más reciente primero. */
export const agruparPorCereal = (cosechas: Cosecha[]): GrupoCereal[] => {
  const grupos = new Map<string, GrupoCereal>();

  for (const c of cosechas) {
    const deducido = separarCereal(c.nombre || c.idCosecha);
    const nombreCereal = c.cereal ? capitalizar(c.cereal) : deducido.cereal;
    const clave = c.idCereal || sinAcentos(nombreCereal).toLowerCase();
    const grupo = grupos.get(clave) ?? { clave, nombre: nombreCereal, saldo: 0, cosechas: [] };
    grupo.saldo += c.saldo;
    grupo.cosechas.push({ ...c, nombreCereal, campania: deducido.campania, etiqueta: '' });
    grupos.set(clave, grupo);
  }

  for (const g of grupos.values()) {
    g.cosechas.sort((a, b) => b.campania.localeCompare(a.campania));
    // Si la misma campaña está en más de una sucursal, se aclara cuál es
    const repetidas = new Set(
      g.cosechas.map((c) => c.campania).filter((camp, i, arr) => arr.indexOf(camp) !== i)
    );
    for (const c of g.cosechas) {
      const base = c.campania || c.nombre || c.idCosecha;
      c.etiqueta = repetidas.has(c.campania) && c.idSucursal ? `${base} · Suc. ${c.idSucursal}` : base;
    }
  }

  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre));
};
