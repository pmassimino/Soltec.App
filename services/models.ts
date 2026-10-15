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

// Saldo de una cosecha en el resumen (CosechaView del backend)
export interface Cosecha {
  idCosecha: string;
  idSucursal?: string;
  nombre?: string;
  saldo: number;
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

// types/pendientes.types.ts
// Documento con ítems pendientes: remitos sin facturar (GET /api/Remito/{idCuenta}/Pendientes)
// y facturas con mercadería pendiente (GET /api/Factura/{idCuenta}/Pendientes)
export interface DetallePendiente {
  idArticulo: string;
  descripcion: string;
  cantidad: number;
  cantidadPendiente: number;
}

export interface DocumentoPendiente {
  id: string;
  numero: string;
  fechaComprobante: Date;
  observaciones: string;
  total?: number;
  detalle: DetallePendiente[];
}

// types/ctactecereal.types.ts
// Movimiento de cuenta corriente de cereal en kilos (GET /api/CtaCteCereal/{idCuenta}?idCosecha=)
export interface MovimientoCereal {
  idTransaccion: string;
  orden: number;
  tipo: string;
  concepto: string;
  numeroComprobante: string;
  fechaComprobante: Date;
  ingreso: number;
  egreso: number;
  pesoNeto: number;
  saldo: number;
  tieneComprobante: boolean;
}

// Entrada de cereal / romaneo (GET /api/Entradas/{idCuenta}?idCosecha=&idSucursal=)
export interface Entrada {
  idTransaccion: string;
  numero: string;
  fecha: Date;
  cartaPorte: string;
  ctg: string;
  planta: string;
  procedencia: string;
  transporte: string;
  chofer: string;
  patenteChasis: string;
  patenteAcoplado: string;
  observacion: string;
  pesoBruto: number;
  pesoTara: number;
  pesoNeto: number;
  pesoNetoFinal: number;
  mermas: { concepto: string; porcentaje: number; kilos: number }[];
}

// Liquidación de cereal (GET /api/Liquidaciones/{idCuenta}?idCosecha=&idSucursal=)
export interface ConceptoLiquidacion {
  nombre: string;
  alicuota: number;
  importe: number;
}

export interface Liquidacion {
  idTransaccion: string;
  numero: string;
  coe: string;
  fecha: Date;
  tipoOperacion: string;
  numeroCertificado: string;
  procedencia: string;
  pesoNeto: number;
  precio: number;
  importeBruto: number;
  importeNeto: number;
  importeIva: number;
  importeFinal: number;
  deducciones: ConceptoLiquidacion[];
  retenciones: ConceptoLiquidacion[];
}
