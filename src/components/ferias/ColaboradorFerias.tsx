import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  aberto: "bg-blue-500/10 text-blue-700 border-blue-200",
  parcial: "bg-amber-500/10 text-amber-700 border-amber-200",
  concluido: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  vencido: "bg-destructive/10 text-destructive border-destructive/20",
  desconsiderado: "bg-muted text-muted-foreground border-muted",
};

const STATUS_LABELS: Record<string, string> = {
  aberto: "Aberto",
  parcial: "Parcial",
  concluido: "Concluído",
  vencido: "Vencido",
  desconsiderado: "Desconsiderado",
};

const FERIAS_STATUS: Record<string, string> = {
  agendada: "Agendada",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

const LICENCA_LABELS: Record<string, string> = {
  medica: "Licença Médica",
  maternidade: "Licença Maternidade",
  outros: "Outros",
};

interface Props {
  colaboradorId: string;
}

export default function ColaboradorFerias({ colaboradorId }: Props) {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [ferias, setFerias] = useState<any[]>([]);
  const [licencas, setLicencas] = useState<any[]>([]);

  useEffect(() => {
    if (!colaboradorId) return;
    Promise.all([
      supabase.from("periodos_aquisitivos").select("*").eq("colaborador_id", colaboradorId).order("data_inicio", { ascending: false }),
      supabase.from("ferias_periodos").select("*").eq("colaborador_id", colaboradorId).order("data_inicio", { ascending: false }),
      supabase.from("licencas").select("*").eq("colaborador_id", colaboradorId).order("data_inicio", { ascending: false }),
    ]).then(([pRes, fRes, lRes]) => {
      setPeriodos(pRes.data || []);
      setFerias(fRes.data || []);
      setLicencas(lRes.data || []);
    });
  }, [colaboradorId]);

  return (
    <div className="space-y-4">
      {/* Períodos Aquisitivos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Períodos Aquisitivos</CardTitle></CardHeader>
        <CardContent>
          {periodos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum período registrado.</p>
          ) : (
            <div className="space-y-2">
              {periodos.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={STATUS_COLORS[p.status] || ""}>
                      {STATUS_LABELS[p.status] || p.status}
                    </Badge>
                    <span>
                      {format(parseISO(p.data_inicio), "dd/MM/yyyy")} — {format(parseISO(p.data_fim), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>Saldo: <strong className="text-foreground">{p.saldo_disponivel}d</strong></span>
                    <span>Limite: {format(parseISO(p.data_limite_concessao), "dd/MM/yyyy")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Férias */}
      <Card>
        <CardHeader><CardTitle className="text-base">Férias</CardTitle></CardHeader>
        <CardContent>
          {ferias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma férias registrada.</p>
          ) : (
            <div className="space-y-2">
              {ferias.map((f) => (
                <div key={f.id} className="flex items-center justify-between text-sm border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary">{FERIAS_STATUS[f.status] || f.status}</Badge>
                    <span>
                      {format(parseISO(f.data_inicio), "dd/MM/yyyy")} — {format(parseISO(f.data_fim), "dd/MM/yyyy")}
                    </span>
                    <span className="text-muted-foreground">({f.dias_gozo}d)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.abono_pecuniario && <Badge variant="outline">Abono {f.dias_abono}d</Badge>}
                    {f.decimo_terceiro_antecipado && <Badge variant="outline">13º</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Licenças */}
      {licencas.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Licenças</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {licencas.map((l) => (
                <div key={l.id} className="flex items-center justify-between text-sm border rounded-md p-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{LICENCA_LABELS[l.tipo] || l.tipo}</Badge>
                    <span>
                      {format(parseISO(l.data_inicio), "dd/MM/yyyy")} — {format(parseISO(l.data_fim), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {l.observacao && <span className="text-muted-foreground text-xs">{l.observacao}</span>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
