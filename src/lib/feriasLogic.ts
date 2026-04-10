import { addMonths, addDays, differenceInCalendarDays, parseISO, isWeekend, isBefore, isAfter, startOfDay } from "date-fns";

export interface PeriodoAquisitivo {
  colaborador_id: string;
  data_inicio: string;
  data_fim: string;
  data_limite_concessao: string;
  dias_direito: number;
  status: "aberto" | "parcial" | "concluido" | "vencido" | "desconsiderado";
}

/**
 * Generate vesting periods from admission date, respecting cutoff date.
 * Each period is 12 months. Concession limit = period end + 11 months.
 */
export function gerarPeriodosAquisitivos(
  colaboradorId: string,
  dataAdmissao: string,
  dataCortStr: string
): PeriodoAquisitivo[] {
  const admissao = parseISO(dataAdmissao);
  const corte = parseISO(dataCortStr);
  const hoje = startOfDay(new Date());
  const periodos: PeriodoAquisitivo[] = [];

  let inicio = admissao;

  // Gerar períodos cujo data_fim seja até hoje (não gerar períodos futuros)
  while (true) {
    const fim = addDays(addMonths(inicio, 12), -1);

    // Parar se a data final do período for depois de hoje
    if (isAfter(fim, hoje)) break;

    const limiteConcessao = addDays(addMonths(fim, 11), 0);

    // Only include periods that start on or after cutoff
    if (!isBefore(inicio, corte)) {
      periodos.push({
        colaborador_id: colaboradorId,
        data_inicio: formatDate(inicio),
        data_fim: formatDate(fim),
        data_limite_concessao: formatDate(limiteConcessao),
        dias_direito: 30,
        status: calcularStatusPeriodo(fim, limiteConcessao, 30, 0),
      });
    }

    inicio = addMonths(inicio, 12);
  }

  return periodos;
}

export function calcularStatusPeriodo(
  dataFim: Date | string,
  dataLimiteConcessao: Date | string,
  diasDireito: number,
  diasUsados: number // agendados + abono
): "aberto" | "parcial" | "concluido" | "vencido" {
  const hoje = startOfDay(new Date());
  const fim = typeof dataFim === "string" ? parseISO(dataFim) : dataFim;
  const limite = typeof dataLimiteConcessao === "string" ? parseISO(dataLimiteConcessao) : dataLimiteConcessao;

  if (diasUsados >= diasDireito) return "concluido";
  if (isAfter(hoje, limite)) return "vencido";
  if (diasUsados > 0) return "parcial";
  // Period not yet vested (still acquiring)
  if (isBefore(hoje, fim)) return "aberto";
  return "aberto";
}

/**
 * Validate vacation scheduling rules per CLT.
 */
export interface ValidacaoResult {
  valid: boolean;
  errors: string[];
}

export function validarFerias(params: {
  dataInicio: string;
  dataFim: string;
  diasGozo: number;
  diasAbono: number;
  saldoDisponivel: number;
  feriasExistentes?: { data_inicio: string; data_fim: string; id?: string }[];
  editId?: string;
  idadeColaborador?: number; // for <18 or >50 rule
}): ValidacaoResult {
  const errors: string[] = [];
  const inicio = parseISO(params.dataInicio);
  const totalDias = params.diasGozo + params.diasAbono;

  // Negative balance check
  if (totalDias > params.saldoDisponivel) {
    errors.push(`Saldo insuficiente. Disponível: ${params.saldoDisponivel} dias, solicitado: ${totalDias} dias.`);
  }

  // Weekend/holiday start check
  if (isWeekend(inicio)) {
    errors.push("Férias não podem iniciar em sábado ou domingo.");
  }

  // Age restriction: <18 or >50 must take 30 continuous days
  if (params.idadeColaborador !== undefined) {
    if ((params.idadeColaborador < 18 || params.idadeColaborador > 50) && params.diasGozo !== 30) {
      errors.push("Menores de 18 e maiores de 50 anos devem gozar 30 dias corridos.");
    }
  }

  // Overlap check
  if (params.feriasExistentes) {
    const fim = parseISO(params.dataFim);
    for (const f of params.feriasExistentes) {
      if (params.editId && f.id === params.editId) continue;
      const fInicio = parseISO(f.data_inicio);
      const fFim = parseISO(f.data_fim);
      if (!(isAfter(inicio, fFim) || isBefore(fim, fInicio))) {
        errors.push("Existe sobreposição com férias já agendadas.");
        break;
      }
    }
  }

  // Valid fractionation: common patterns
  // 30, 15+15, 20+10 abono, etc. — we allow flexible but minimum 5 days per period
  if (params.diasGozo < 5 && params.diasGozo > 0) {
    errors.push("O período mínimo de gozo é de 5 dias corridos.");
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Recalculate balance fields for a vesting period.
 */
export function calcularSaldo(
  diasDireito: number,
  diasAgendados: number,
  diasAbono: number
): number {
  return Math.max(0, diasDireito - diasAgendados - diasAbono);
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
