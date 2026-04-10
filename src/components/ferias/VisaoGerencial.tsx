import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, CalendarDays, AlertTriangle, Clock, Activity } from "lucide-react";
import { parseISO, isWithinInterval, addDays } from "date-fns";
import { Link } from "react-router-dom";

export default function VisaoGerencial() {
  const [stats, setStats] = useState({
    totalClt: 0,
    periodosAbertos: 0,
    periodosVencidos: 0,
    periodosVencendo: 0,
    saldoMedio: 0,
    ausentesHoje: 0,
    licencasAtivas: 0,
    semFeriasPlanejadas: 0,
  });
  const [ausentes, setAusentes] = useState<any[]>([]);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split("T")[0];
    const in60Days = addDays(new Date(), 60).toISOString().split("T")[0];

    const [
      { data: colabs },
      { data: periodos },
      { data: feriasAtivas },
      { data: licencasAtivas },
    ] = await Promise.all([
      supabase.from("colaboradores").select("id, tipo_vinculo").eq("ativo", true).eq("tipo_vinculo", "clt"),
      supabase.from("periodos_aquisitivos").select("*").eq("desconsiderar_periodo", false),
      supabase.from("ferias_periodos").select("*, colaboradores(nome)").in("status", ["agendada", "concluida"]).lte("data_inicio", today).gte("data_fim", today),
      supabase.from("licencas").select("*, colaboradores(nome)").lte("data_inicio", today).gte("data_fim", today),
    ]);

    const totalClt = colabs?.length || 0;
    const abertos = periodos?.filter((p) => p.status === "aberto" || p.status === "parcial") || [];
    const vencidos = periodos?.filter((p) => p.status === "vencido") || [];
    const vencendo = periodos?.filter((p) => {
      if (p.status === "vencido" || p.status === "concluido" || p.status === "desconsiderado") return false;
      return p.data_limite_concessao <= in60Days && p.data_limite_concessao >= today;
    }) || [];

    const saldoTotal = periodos?.reduce((s, p) => s + (p.saldo_disponivel || 0), 0) || 0;
    const saldoMedio = abertos.length > 0 ? Math.round(saldoTotal / abertos.length) : 0;

    // Colaboradores sem férias planejadas (have open period but no scheduled vacation)
    const idsComFerias = new Set(
      (await supabase.from("ferias_periodos").select("colaborador_id").in("status", ["agendada", "concluida"])).data?.map((f) => f.colaborador_id) || []
    );
    const semFerias = (colabs || []).filter((c) => !idsComFerias.has(c.id)).length;

    const allAusentes = [
      ...(feriasAtivas || []).map((f) => ({ ...f, tipoAusencia: "Férias" })),
      ...(licencasAtivas || []).map((l) => ({ ...l, tipoAusencia: l.tipo === "medica" ? "Lic. Médica" : l.tipo === "maternidade" ? "Lic. Maternidade" : "Licença" })),
    ];

    setAusentes(allAusentes);
    setStats({
      totalClt,
      periodosAbertos: abertos.length,
      periodosVencidos: vencidos.length,
      periodosVencendo: vencendo.length,
      saldoMedio,
      ausentesHoje: allAusentes.length,
      licencasAtivas: licencasAtivas?.length || 0,
      semFeriasPlanejadas: semFerias,
    });
  };

  const cards = [
    { label: "Total CLT", value: stats.totalClt, icon: Users, color: "text-primary" },
    { label: "Períodos em Aberto", value: stats.periodosAbertos, icon: CalendarDays, color: "text-blue-500" },
    { label: "Períodos Vencidos", value: stats.periodosVencidos, icon: AlertTriangle, color: "text-destructive" },
    { label: "Vencendo em 60 dias", value: stats.periodosVencendo, icon: Clock, color: "text-amber-500" },
    { label: "Saldo Médio (dias)", value: stats.saldoMedio, icon: Activity, color: "text-emerald-500" },
    { label: "Ausentes Hoje", value: stats.ausentesHoje, icon: Users, color: "text-orange-500" },
    { label: "Licenças Ativas", value: stats.licencasAtivas, icon: Activity, color: "text-purple-500" },
    { label: "Sem Férias Planejadas", value: stats.semFeriasPlanejadas, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{c.label}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {ausentes.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ausentes Hoje</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {ausentes.map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Link to={`/colaboradores/${a.colaborador_id}`} className="font-medium hover:underline text-sm">
                      {(a.colaboradores as any)?.nome || "—"}
                    </Link>
                    <Badge variant="secondary">{a.tipoAusencia}</Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {a.data_inicio} — {a.data_fim}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
