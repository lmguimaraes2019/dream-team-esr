import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, TrendingUp, Users2, MessageSquare, Target, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { TIPO_LABELS, TIPO_COLORS, AusenciaBadge } from "@/components/AusenciasManager";
import { nivelLabel } from "@/lib/nivelLabels";
import { MaleIcon, FemaleIcon, OtherIcon } from "@/components/GenderIcons";
import { useAuth } from "@/contexts/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import Organograma from "@/components/Organograma";


const COLORS = [
  "hsl(221, 83%, 53%)", "hsl(160, 60%, 45%)", "hsl(30, 80%, 55%)",
  "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)",
];

const GENDER_COLORS: Record<string, string> = {
  Masculino: "#2196F3",
  Feminino: "#E91E63",
  Outro: "#9C27B0",
};

const GenderTick = ({ x, y, payload }: any) => {
  const gender = payload.value;
  const iconSize = 32;
  return (
    <g transform={`translate(${x},${y})`}>
      <foreignObject x={-iconSize / 2} y={4} width={iconSize} height={iconSize + 4}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          {gender === "Masculino" && <MaleIcon size={iconSize} />}
          {gender === "Feminino" && <FemaleIcon size={iconSize} />}
          {gender === "Outro" && <OtherIcon size={iconSize} />}
        </div>
      </foreignObject>
      <text x={0} y={iconSize + 18} textAnchor="middle" fontSize={11} fill="hsl(var(--muted-foreground))">{gender}</text>
    </g>
  );
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function Index() {
  const { user } = useAuth();
  const [mesRef, setMesRef] = useState("");
  const [meses, setMeses] = useState<string[]>([]);
  const [totalColab, setTotalColab] = useState(0);
  const [custoTotal, setCustoTotal] = useState(0);
  const [custoMedio, setCustoMedio] = useState(0);
  const [salarioGenero, setSalarioGenero] = useState<any[]>([]);
  const [salarioGeneroLider, setSalarioGeneroLider] = useState<any[]>([]);
  const [custoGerencia, setCustoGerencia] = useState<any[]>([]);
  const [distNivel, setDistNivel] = useState<any[]>([]);
  const [distTrajetoria, setDistTrajetoria] = useState<any[]>([]);
  const [ausentes, setAusentes] = useState<any[]>([]);
  const [periodosVencidos, setPeriodosVencidos] = useState(0);
  const [periodosVencendo, setPeriodosVencendo] = useState(0);
  const [pctComOneOnOne, setPctComOneOnOne] = useState(0);
  const [feedbacksMes, setFeedbacksMes] = useState(0);
  const [acoesAbertas, setAcoesAbertas] = useState(0);
  const [taxaConclusao, setTaxaConclusao] = useState(0);

  useEffect(() => {
    supabase
      .from("custos_mensais")
      .select("mes_referencia")
      .then(({ data }) => {
        const unique = [...new Set(data?.map((d) => d.mes_referencia))].sort().reverse();
        setMeses(unique);
        if (unique.length > 0 && !mesRef) setMesRef(unique[0]);
      });

    // Load current absences from ferias_periodos + licencas
    const today = new Date().toISOString().split("T")[0];
    Promise.all([
      supabase.from("ferias_periodos").select("*, colaboradores(nome)").in("status", ["agendada", "concluida"]).lte("data_inicio", today).gte("data_fim", today),
      supabase.from("licencas").select("*, colaboradores(nome)").lte("data_inicio", today).gte("data_fim", today),
    ]).then(([fRes, lRes]) => {
      const all = [
        ...(fRes.data || []).map((f: any) => ({ ...f, tipo: "ferias" })),
        ...(lRes.data || []).map((l: any) => ({ ...l, tipo: l.tipo === "medica" ? "licenca_medica" : l.tipo === "maternidade" ? "licenca_maternidade" : "outros" })),
      ];
      setAusentes(all);
    });

    // Load periodos stats
    supabase.from("periodos_aquisitivos").select("status, data_limite_concessao").eq("desconsiderar_periodo", false).then(({ data }) => {
      setPeriodosVencidos((data || []).filter((p) => p.status === "vencido").length);
      const in60 = new Date(Date.now() + 60 * 86400000).toISOString().split("T")[0];
      setPeriodosVencendo((data || []).filter((p) => p.status !== "vencido" && p.status !== "concluido" && p.data_limite_concessao <= in60 && p.data_limite_concessao >= today).length);
    });

    // Feedback & 1:1 KPIs — only for direct reports (gestor_direto matches current user)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const mesAtual = new Date().toISOString().slice(0, 7);
    const inicioMes = mesAtual + "-01";

    // Get current user's profile display_name to match gestor_direto
    const loadKpis = async () => {
      let displayName = "";
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
        displayName = profile?.display_name || "";
      }

      // Get direct reports (colaboradores where gestor_direto matches)
      const { data: diretos } = await supabase.from("colaboradores").select("id").eq("ativo", true).eq("gestor_direto", displayName);
      const diretosIds = (diretos || []).map((d: any) => d.id);
      const totalDiretos = diretosIds.length;

      if (totalDiretos === 0) {
        setPctComOneOnOne(0);
        setFeedbacksMes(0);
        setAcoesAbertas(0);
        setTaxaConclusao(0);
        return;
      }

      const [oooRes, fbRes, acoesRes] = await Promise.all([
        supabase.from("one_on_one").select("colaborador_id").gte("data", thirtyDaysAgo).in("colaborador_id", diretosIds),
        supabase.from("feedback").select("id").gte("data", inicioMes).in("colaborador_id", diretosIds),
        supabase.from("desenvolvimento_acoes").select("status").in("colaborador_id", diretosIds),
      ]);

      const colabsCom1on1 = new Set((oooRes.data || []).map((o: any) => o.colaborador_id)).size;
      setPctComOneOnOne(totalDiretos > 0 ? Math.round((colabsCom1on1 / totalDiretos) * 100) : 0);
      setFeedbacksMes((fbRes.data || []).length);
      const allAcoes = acoesRes.data || [];
      const abertas = allAcoes.filter((a: any) => a.status !== "concluido").length;
      const concluidas = allAcoes.filter((a: any) => a.status === "concluido").length;
      setAcoesAbertas(abertas);
      setTaxaConclusao(allAcoes.length > 0 ? Math.round((concluidas / allAcoes.length) * 100) : 0);
    };
    loadKpis();
  }, []);

  useEffect(() => {
    if (!mesRef) return;
    loadDashboard();
  }, [mesRef]);

  const loadDashboard = async () => {
    const { data: custos } = await supabase
      .from("custos_mensais")
      .select("*, colaboradores(*)")
      .eq("mes_referencia", mesRef);

    if (!custos || custos.length === 0) {
      setTotalColab(0);
      setCustoTotal(0);
      setCustoMedio(0);
      setSalarioGenero([]);
      setSalarioGeneroLider([]);
      setCustoGerencia([]);
      setDistNivel([]);
      setDistTrajetoria([]);
      return;
    }

    setTotalColab(custos.length);
    const total = custos.reduce((s, c) => s + Number(c.custo_mensal), 0);
    setCustoTotal(total);
    setCustoMedio(total / custos.length);

    // Salário médio por gênero
    const generoMap: Record<string, { sum: number; count: number }> = {};
    custos.forEach((c) => {
      const g = (c.colaboradores as any)?.genero || "outro";
      if (!generoMap[g]) generoMap[g] = { sum: 0, count: 0 };
      generoMap[g].sum += Number(c.salario_base);
      generoMap[g].count++;
    });
    setSalarioGenero(
      Object.entries(generoMap).map(([k, v]) => ({
        genero: k.charAt(0).toUpperCase() + k.slice(1),
        media: Math.round(v.sum / v.count),
      }))
    );

    // Salário por gênero x liderança — grouped by liderança
    const glMap: Record<string, Record<string, { sum: number; count: number }>> = {};
    custos.forEach((c) => {
      const col = c.colaboradores as any;
      const lider = col?.lideranca ? "Líder" : "Não Líder";
      const g = col?.genero || "outro";
      const gLabel = g.charAt(0).toUpperCase() + g.slice(1);
      if (!glMap[lider]) glMap[lider] = {};
      if (!glMap[lider][gLabel]) glMap[lider][gLabel] = { sum: 0, count: 0 };
      glMap[lider][gLabel].sum += Number(c.salario_base);
      glMap[lider][gLabel].count++;
    });
    setSalarioGeneroLider(
      Object.entries(glMap).map(([lider, genders]) => {
        const row: any = { grupo: lider };
        Object.entries(genders).forEach(([g, v]) => {
          row[g] = Math.round(v.sum / v.count);
        });
        return row;
      })
    );

    // Custo por gerência
    const gerMap: Record<string, number> = {};
    custos.forEach((c) => {
      const g = (c.colaboradores as any)?.gerencia || "N/A";
      gerMap[g] = (gerMap[g] || 0) + Number(c.custo_mensal);
    });
    setCustoGerencia(
      Object.entries(gerMap)
        .map(([k, v]) => ({ gerencia: k, custo: Math.round(v) }))
        .sort((a, b) => b.custo - a.custo)
    );

    // Distribuição por nível
    const nivelMap: Record<string, number> = {};
    custos.forEach((c) => {
      const n = (c.colaboradores as any)?.nivel_complexidade || "N/A";
      nivelMap[n] = (nivelMap[n] || 0) + 1;
    });
    setDistNivel(
      Object.entries(nivelMap).map(([k, v]) => ({
        name: nivelLabel(k),
        value: v,
      }))
    );

    // Distribuição por trajetória
    const trajMap: Record<string, number> = {};
    custos.forEach((c) => {
      const t = (c.colaboradores as any)?.trajetoria || "N/A";
      trajMap[t] = (trajMap[t] || 0) + 1;
    });
    setDistTrajetoria(
      Object.entries(trajMap).map(([k, v]) => ({
        name: k.charAt(0).toUpperCase() + k.slice(1),
        value: v,
      }))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {meses.length > 0 && (
          <Select value={mesRef} onValueChange={setMesRef}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Colaboradores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalColab}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total Mensal</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(custoTotal)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{fmt(custoMedio)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Períodos vencidos/vencendo cards */}
      {(periodosVencidos > 0 || periodosVencendo > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Períodos Vencidos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{periodosVencidos}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Vencendo em 60 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-500">{periodosVencendo}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feedback & 1:1 KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">1:1 nos últimos 30 dias</CardTitle>
            <Users2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pctComOneOnOne}%</p>
            <p className="text-xs text-muted-foreground">dos colaboradores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Feedbacks no mês</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{feedbacksMes}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ações abertas</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{acoesAbertas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conclusão de ações</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{taxaConclusao}%</p>
          </CardContent>
        </Card>
      </div>


      {ausentes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Colaboradores Ausentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {ausentes.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/colaboradores/${a.colaborador_id}`}
                      className="font-medium hover:underline text-sm"
                    >
                      {(a.colaboradores as any)?.nome || "—"}
                    </Link>
                    <AusenciaBadge tipo={a.tipo} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(parseISO(a.data_inicio), "dd/MM/yyyy")} — {format(parseISO(a.data_fim), "dd/MM/yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalColab === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            Nenhum dado encontrado. Importe uma planilha para começar.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Charts row 1 */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Salário Médio por Gênero</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salarioGenero} margin={{ bottom: 50 }} className="text-xs">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="genero" tick={<GenderTick />} height={65} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="media" radius={[4, 4, 0, 0]}>
                      {salarioGenero.map((entry, i) => (
                        <Cell key={i} fill={GENDER_COLORS[entry.genero] || COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Salário por Gênero × Liderança</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={salarioGeneroLider} className="text-xs">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="grupo" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend />
                    {salarioGeneroLider.some((d) => d.Feminino) && <Bar dataKey="Feminino" fill={GENDER_COLORS.Feminino} radius={[4, 4, 0, 0]} />}
                    {salarioGeneroLider.some((d) => d.Masculino) && <Bar dataKey="Masculino" fill={GENDER_COLORS.Masculino} radius={[4, 4, 0, 0]} />}
                    {salarioGeneroLider.some((d) => d.Outro) && <Bar dataKey="Outro" fill={GENDER_COLORS.Outro} radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2 */}
          <Card>
            <CardHeader><CardTitle className="text-base">Custo por Gerência</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={custoGerencia} layout="vertical" className="text-xs">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="gerencia" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="custo" fill="hsl(30, 80%, 55%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Charts row 3 - Pies */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Nível</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart className="text-xs">
                    <Pie data={distNivel} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {distNivel.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend className="text-xs" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Trajetória</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart className="text-xs">
                    <Pie data={distTrajetoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                      {distTrajetoria.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend className="text-xs" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Organograma />
    </div>
  );
}
