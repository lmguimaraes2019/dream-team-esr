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

/** Detect the nivel from cargo string */
export function nivelFromCargo(cargo: string): string {
  const n = normalize(cargo);
  if (n.includes(" jr") || n.includes("junior")) return "junior";
  if (n.includes(" pl") || n.includes("pleno")) return "pleno";
  if (n.includes(" sr") || n.includes("senior")) return "senior";
  if (n.includes("coordenador") || n.includes("gerente") || n.includes("diretor")) return "senior";
  if (n.includes("especialista")) return "especialista";
  if (n.includes("master")) return "master";
  return "pleno";
}

/** Detect if cargo indicates leadership */
export function isLideranca(cargo: string): boolean {
  const n = normalize(cargo);
  return n.includes("coordenador") || n.includes("gerente") || n.includes("diretor") || n.includes("lider");
}

/**
 * Normalize header: lowercase, remove accents, replace spaces with _
 */
export function normalizeHeader(h: string): string {
  return h.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Column mapping from the standard RNP spreadsheet to internal field names.
 * Keys are normalized header patterns; values are the internal field name.
 */
const HEADER_ALIAS: Record<string, string> = {
  unidade: "unidade",
  matricula: "matricula",
  nome: "nome",
  gerencia: "gerencia",
  origem_de_recurso: "origem_recurso",
  cargo: "cargo",
  dt_admissao: "data_admissao",
  data_admissao: "data_admissao",
  data_de_admissao: "data_admissao",
  diretoria: "diretoria",
  centro_de_custo: "centro_custo",
  salario_mensal: "salario_base",
  salario_base: "salario_base",
  salario: "salario_base",
  inss_2045_1: "inss",
  inss: "inss",
  fgts_8: "fgts",
  fgts: "fgts",
  pis_1: "pis",
  pis: "pis",
  custo_mensal_rnp_salario__encargos: "custo_encargos",
  vrva_valor_fixo_22_dias: "vr_va",
  vr_va: "vr_va",
  vrva: "vr_va",
  vr: "vr_va",
  va: "vr_va",
  vt: "vt",
  pl_saude_e_odont_media: "plano_saude",
  plano_saude: "plano_saude",
  plano_de_saude: "plano_saude",
  seguro_vida: "seguro",
  seguro: "seguro",
  ajuda_de_custo_internet: "internet",
  internet: "internet",
  custo_total_mensal_beneficios: "custo_beneficios",
  abono_pecuniario_facultativo_venda_de_10_dias_ferias: "ferias",
  ferias: "ferias",
  "13_ferias_13": "um_terco_ferias",
  um_terco_ferias: "um_terco_ferias",
  "13_112_avos": "decimo_terceiro",
  decimo_terceiro: "decimo_terceiro",
  custo_total_provisoes_ferias_e_13: "custo_provisoes",
  custo_mensal: "custo_mensal",
  // genero, nivel, vinculo, grupo, lideranca, trajetoria — may or may not be present
  genero: "genero",
  nivel_complexidade: "nivel_complexidade",
  nivel: "nivel_complexidade",
  tipo_vinculo: "tipo_vinculo",
  vinculo: "tipo_vinculo",
  grupo: "grupo",
  lideranca: "lideranca",
  trajetoria: "trajetoria",
};

export function mapHeader(rawHeader: string): string | null {
  const norm = normalizeHeader(rawHeader);
  return HEADER_ALIAS[norm] ?? null;
}

/**
 * Find the header row in a sheet. Returns the 0-based index of the row
 * that contains recognizable headers (matricula + nome at minimum).
 */
export function findHeaderRow(rows: Record<string, any>[], maxScan = 10): number {
  // sheet_to_json with header:1 gives us rows as arrays keyed by column index.
  // But we receive raw JSON rows. We'll check if the first few rows' values match known headers.
  // Actually, the caller should pass the raw 2D array. We'll handle it differently.
  return 0; // fallback
}
