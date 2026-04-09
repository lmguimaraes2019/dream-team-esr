// Normalize enum values from spreadsheet variations to DB-accepted values

const GENERO_MAP: Record<string, string> = {
  m: "masculino", masc: "masculino", masculino: "masculino",
  f: "feminino", fem: "feminino", feminino: "feminino",
  o: "outro", outro: "outro", "nao binario": "outro", nb: "outro",
};

const NIVEL_MAP: Record<string, string> = {
  junior: "junior", jr: "junior", "júnior": "junior", "junio": "junior",
  pleno: "pleno", pl: "pleno",
  senior: "senior", sr: "senior", "sênior": "senior", "senio": "senior",
  especialista: "especialista", esp: "especialista",
  master: "master",
};

const VINCULO_MAP: Record<string, string> = {
  clt: "clt",
  terceirizado: "terceirizado", terceiro: "terceirizado", pj: "terceirizado",
};

function normalize(value: string): string {
  return value.trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeGenero(v: string): string | null {
  return GENERO_MAP[normalize(v)] ?? null;
}

export function normalizeNivel(v: string): string | null {
  return NIVEL_MAP[normalize(v)] ?? null;
}

export function normalizeVinculo(v: string): string | null {
  return VINCULO_MAP[normalize(v)] ?? null;
}

export function excelDateToISO(value: any): string | null {
  if (typeof value === "number" && value > 25569) {
    const d = new Date((value - 25569) * 86400000);
    return d.toISOString().split("T")[0];
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return value.toISOString().split("T")[0];
  }
  if (typeof value === "string") {
    // Try DD/MM/YYYY
    const br = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (br) {
      const [, d, m, y] = br;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    // Try ISO-ish
    const iso = new Date(value);
    if (!isNaN(iso.getTime())) return iso.toISOString().split("T")[0];
  }
  return null;
}
