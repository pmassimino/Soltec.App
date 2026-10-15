// types/cuentas.types.ts
export interface Subdiario {
  idCuenta: string;
  idSubdiario: string;
  nombre: string;
  idDivisa: number;
}

export interface Cuenta {
  idCuenta: string;
  nombre: string;
  subdiarios: Subdiario[];
}

export interface ApiResponse {
  success: boolean;
  data: Cuenta[];
  message?: string;
}

export interface ApiError {
  campo: string;
  mensaje: string;
}
// types/saldo.types.ts

export interface CuentaCorriente{
  idCuenta: string;
  idSubdiario: string;
  nombre :string;
  idDivisa: number;
  saldoVencido: number;
  saldo: number;
}

export interface Cosecha {
  // Define las propiedades de cosechas si las conoces
  // Por ahora está vacío en el ejemplo
  id?: string;
  nombre?: string;
  saldo:number;
  // ... otras propiedades
}

export interface Pendientes {
  pendiente: number;
}

export interface SaldoResponse {
  ctaCte: CuentaCorriente[];
  cosechas: Cosecha[];
  remitos: Pendientes;
  facturas: Pendientes;
}
// types/movimientos.types.ts
// Movimiento de cuenta corriente (GET /api/CtaCte/{idCuenta})
export interface Movimiento {
  idTransaccion: string;
  orden: number;
  tipo: string;
  concepto: string;
  numeroComprobante: string;
  fechaComprobante: Date;
  fechaVencimiento: Date;
  debe: number;
  haber: number;
  saldo: number;
  saldoVencido: number;
  vencido: boolean;
  tieneComprobante: boolean;
  idDivisa: number;
}
