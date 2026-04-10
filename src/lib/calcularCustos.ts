export interface ParametrosCusto {
  inss_taxa: number;      // e.g. 0.255
  fgts_taxa: number;      // e.g. 0.08
  pis_taxa: number;       // e.g. 0.01
  vr_va_valor: number;    // e.g. 1069.77
  seguro_taxa: number;    // e.g. 0.005811
  internet_valor: number; // e.g. 100
  vt_valor: number;       // e.g. 0
  plano_saude_valor: number; // e.g. 0
}

export interface CustosCalculados {
  salario_base: number;
  inss: number;
  fgts: number;
  pis: number;
  vr_va: number;
  vt: number;
  plano_saude: number;
  seguro: number;
  internet: number;
  ferias: number;
  um_terco_ferias: number;
  decimo_terceiro: number;
  custo_mensal: number;
  custo_anual: number;
}

const r2 = (v: number) => Math.round(v * 100) / 100;

export function calcularCustos(salario: number, params: ParametrosCusto): CustosCalculados {
  const S = salario;

  // Encargos
  const inss = r2(S * params.inss_taxa);
  const fgts = r2(S * params.fgts_taxa);
  const pis = r2(S * params.pis_taxa);
  const subtotalEncargos = S + inss + fgts + pis;

  // Benefícios
  const vr_va = r2(params.vr_va_valor);
  const vt = r2(params.vt_valor);
  const plano_saude = r2(params.plano_saude_valor);
  const seguro = r2(S * params.seguro_taxa);
  const internet = r2(params.internet_valor);
  const subtotalBeneficios = vr_va + vt + plano_saude + seguro + internet;

  // Provisões
  const ferias = r2((S / 30 * 10) / 12);
  const um_terco_ferias = r2(((S / 12) + ferias) / 3);
  const decimo_terceiro = r2(S / 12);
  const subtotalProvisoes = ferias + um_terco_ferias + decimo_terceiro;

  const custo_mensal = r2(subtotalEncargos + subtotalBeneficios + subtotalProvisoes);
  const custo_anual = r2(custo_mensal * 12);

  return {
    salario_base: S,
    inss, fgts, pis,
    vr_va, vt, plano_saude, seguro, internet,
    ferias, um_terco_ferias, decimo_terceiro,
    custo_mensal, custo_anual,
  };
}

/** Build ParametrosCusto from configuracoes_encargos rows */
export function buildParametros(rows: { nome: string; taxa: number; tipo: string }[]): ParametrosCusto {
  const get = (nome: string) => rows.find(r => r.nome === nome) || rows.find(r => r.nome.toLowerCase().replace(/\s+/g, ' ').includes(nome.toLowerCase().replace(/\s+/g, ' ')));

  return {
    inss_taxa: Number(get("INSS")?.taxa ?? 0.255),
    fgts_taxa: Number(get("FGTS")?.taxa ?? 0.08),
    pis_taxa: Number(get("PIS")?.taxa ?? 0.01),
    vr_va_valor: Number(get("VR/VA")?.taxa ?? 1069.77),
    seguro_taxa: Number(get("Seguro Vida")?.taxa ?? 0.005811),
    internet_valor: Number(get("Internet")?.taxa ?? 100),
    vt_valor: Number(get("VT")?.taxa ?? 0),
    plano_saude_valor: Number(get("Plano Saúde")?.taxa ?? 0),
  };
}
