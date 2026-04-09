import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { AusenciaBadge } from "@/components/AusenciasManager";
import { nivelLabel } from "@/lib/nivelLabels";
import { MaleIcon, FemaleIcon, OtherIcon } from "@/components/GenderIcons";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";


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

  useEffect(() => {
    supabase
      .from("custos_mensais")
      .select("mes_referencia")
      .then(({ data }) => {
        const unique = [...new Set(data?.map((d) => d.mes_referencia))].sort().reverse();
        setMeses(unique);
        if (unique.length > 0 && !mesRef) setMesRef(unique[0]);
      });
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

    // Salário por gênero x liderança
    const glMap: Record<string, { sum: number; count: number }> = {};
    custos.forEach((c) => {
      const col = c.colaboradores as any;
      const key = `${col?.genero || "outro"}-${col?.lideranca ? "Líder" : "Não Líder"}`;
      if (!glMap[key]) glMap[key] = { sum: 0, count: 0 };
      glMap[key].sum += Number(c.salario_base);
      glMap[key].count++;
    });
    setSalarioGeneroLider(
      Object.entries(glMap).map(([k, v]) => {
        const [genero, tipo] = k.split("-");
        return {
          grupo: `${genero.charAt(0).toUpperCase() + genero.slice(1)} - ${tipo}`,
          media: Math.round(v.sum / v.count),
        };
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
                    <XAxis dataKey="grupo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Bar dataKey="media" fill="hsl(160, 60%, 45%)" radius={[4, 4, 0, 0]} />
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
    </div>
  );
}
