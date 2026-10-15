export const formatMoney = (value: number): string =>
  `$ ${Math.abs(value).toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;

export const formatKg = (value: number): string =>
  `${value.toLocaleString("es-AR", { maximumFractionDigits: 0 })} kg`;

export const formatFecha = (date: Date): string =>
  date.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

// "JUAN PEREZ SA" -> "JP"
export const iniciales = (nombre?: string): string =>
  (nombre ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("") || "S";
