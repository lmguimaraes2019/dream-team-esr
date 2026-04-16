import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Users, Users2, MessageSquare, Target, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const META_1ON1_ANO = 5;

interface Colab {
  id: string;
  nome: string;
  cargo: string;
  gerencia: string;
  gestor_direto: string | null;
  lideranca: boolean;
  foto_url: string | null;
}

interface KpiData {
  oneOnOnes: number;
  feedbacks: number;
  acoesAbertas: number;
  acoesConcluidas: number;
  acoesTotal: number;
}

interface AreaNode {
  lider: Colab;
  subordinados: Colab[];
  subLideres: AreaNode[];
}

const DIRETORIA_NOMES = ["LUCIANA BATISTA DA SILVA", "YVE A MARCIAL G  DE BARROS", "RENATO DUARTE ROCHA", "CELIA MARIA QUEIROGA MACIEL", "OLAVO LEMOS CALACA DAS NEVES"];

export default function LiderancaResumo() {
  const [leandro, setLeandro] = useState<Colab | null>(null);
  const [areas, setAreas] = useState<AreaNode[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [kpiMap, setKpiMap] = useState<Map<string, KpiData>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: colabs } = await supabase
      .from("colaboradores")
      .select("id, nome, cargo, gerencia, gestor_direto, lideranca, foto_url")
      .eq("ativo", true);

    if (!colabs) return;

    const anoAtual = new Date().getFullYear();
    const inicioAno = `${anoAtual}-01-01`;
    const fimAno = `${anoAtual}-12-31`;

    const allIds = colabs.map((c) => c.id);

    const [oooRes, fbRes, acoesRes] = await Promise.all([
      supabase.from("one_on_one").select("colaborador_id").gte("data", inicioAno).lte("data", fimAno).in("colaborador_id", allIds),
      supabase.from("feedback").select("colaborador_id").gte("data", inicioAno).lte("data", fimAno).in("colaborador_id", allIds),
      supabase.from("desenvolvimento_acoes").select("colaborador_id, status").in("colaborador_id", allIds),
    ]);

    // Build per-collaborator KPI map
    const map = new Map<string, KpiData>();
    allIds.forEach((id) => map.set(id, { oneOnOnes: 0, feedbacks: 0, acoesAbertas: 0, acoesConcluidas: 0, acoesTotal: 0 }));

    (oooRes.data || []).forEach((o: any) => {
      const k = map.get(o.colaborador_id);
      if (k) k.oneOnOnes++;
    });
    (fbRes.data || []).forEach((f: any) => {
      const k = map.get(f.colaborador_id);
      if (k) k.feedbacks++;
    });
    (acoesRes.data || []).forEach((a: any) => {
      const k = map.get(a.colaborador_id);
      if (k) {
        k.acoesTotal++;
        if (a.status === "concluido") k.acoesConcluidas++;
        else k.acoesAbertas++;
      }
    });

    setKpiMap(map);

    const leandroColab = colabs.find((c) => c.cargo.toUpperCase().includes("DIRETOR ADJUNTO"));
    if (leandroColab) setLeandro(leandroColab);

    const diretosLeandro = colabs.filter((c) => DIRETORIA_NOMES.includes(c.nome));

    const buildTree = (lider: Colab): AreaNode => {
      const subs = colabs.filter((c) => c.gestor_direto === lider.nome && c.id !== lider.id);
      const subLideres = subs.filter((s) => s.lideranca);
      const naoLideres = subs.filter((s) => !s.lideranca);
      return {
        lider,
        subordinados: naoLideres,
        subLideres: subLideres.map((sl) => buildTree(sl)),
      };
    };

    setAreas(diretosLeandro.map((d) => buildTree(d)));
  };

  const toggleArea = (id: string) => {
    setExpandedAreas((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Collect all non-leader IDs under a node (the team members)
  const collectTeamIds = (node: AreaNode): string[] => {
    return [
      ...node.subordinados.map((s) => s.id),
      ...node.subLideres.flatMap((sl) => [sl.lider.id, ...collectTeamIds(sl)]),
    ];
  };

  const countAll = (node: AreaNode): number => collectTeamIds(node).length;

  const aggregateKpis = (ids: string[]): KpiData => {
    const result: KpiData = { oneOnOnes: 0, feedbacks: 0, acoesAbertas: 0, acoesConcluidas: 0, acoesTotal: 0 };
    ids.forEach((id) => {
      const k = kpiMap.get(id);
      if (k) {
        result.oneOnOnes += k.oneOnOnes;
        result.feedbacks += k.feedbacks;
        result.acoesAbertas += k.acoesAbertas;
        result.acoesConcluidas += k.acoesConcluidas;
        result.acoesTotal += k.acoesTotal;
      }
    });
    return result;
  };

  const initials = (nome: string) =>
    nome.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const KpiBar = ({ ids }: { ids: string[] }) => {
    const kpi = aggregateKpis(ids);
    const teamSize = ids.length;
    const metaTotal = teamSize * META_1ON1_ANO;
    const pct1on1 = metaTotal > 0 ? Math.round((kpi.oneOnOnes / metaTotal) * 100) : 0;
    const taxaConclusao = kpi.acoesTotal > 0 ? Math.round((kpi.acoesConcluidas / kpi.acoesTotal) * 100) : 0;

    return (
      <div className="flex items-center gap-3 text-xs">
        <div className="flex items-center gap-1" title={`1:1 realizados no ano: ${kpi.oneOnOnes} / meta: ${metaTotal}`}>
          <Users2 className="h-3 w-3 text-muted-foreground" />
          <span className={pct1on1 >= 100 ? "text-emerald-600 font-medium" : pct1on1 >= 50 ? "text-amber-600" : "text-destructive"}>
            {kpi.oneOnOnes}/{metaTotal}
          </span>
        </div>
        <div className="flex items-center gap-1" title={`Feedbacks no ano: ${kpi.feedbacks}`}>
          <MessageSquare className="h-3 w-3 text-muted-foreground" />
          <span>{kpi.feedbacks}</span>
        </div>
        <div className="flex items-center gap-1" title={`Ações abertas: ${kpi.acoesAbertas}`}>
          <Target className="h-3 w-3 text-muted-foreground" />
          <span>{kpi.acoesAbertas}</span>
        </div>
        <div className="flex items-center gap-1" title={`Conclusão: ${taxaConclusao}%`}>
          <CheckCircle className="h-3 w-3 text-muted-foreground" />
          <span>{taxaConclusao}%</span>
        </div>
      </div>
    );
  };

  const ColabKpiRow = ({ colab }: { colab: Colab }) => {
    const k = kpiMap.get(colab.id) || { oneOnOnes: 0, feedbacks: 0, acoesAbertas: 0, acoesConcluidas: 0, acoesTotal: 0 };
    const pct1on1 = Math.min(Math.round((k.oneOnOnes / META_1ON1_ANO) * 100), 100);

    return (
      <div className="flex items-center justify-between py-1.5 ml-4 pl-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <span className="w-4" />
          <Avatar className="h-6 w-6">
            {colab.foto_url && <AvatarImage src={colab.foto_url} />}
            <AvatarFallback className="text-[8px]">{initials(colab.nome)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <Link to={`/colaboradores/${colab.id}`} className="text-xs hover:underline block truncate">
              {colab.nome}
            </Link>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" title={`Meta 1:1: ${k.oneOnOnes}/${META_1ON1_ANO} (${pct1on1}%)`}>
            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct1on1 >= 100 ? "bg-emerald-500" : pct1on1 >= 40 ? "bg-emerald-400" : pct1on1 > 0 ? "bg-amber-400" : "bg-muted"}`}
                style={{ width: `${pct1on1}%` }}
              />
            </div>
            <span className={`text-[10px] font-medium ${pct1on1 >= 100 ? "text-emerald-600" : pct1on1 > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {pct1on1}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className={pct1on1 >= 100 ? "text-emerald-600" : pct1on1 > 0 ? "text-amber-600" : "text-muted-foreground"} title="1:1 no ano">
            {k.oneOnOnes}/{META_1ON1_ANO}
          </span>
          <span title="Feedbacks">{k.feedbacks} fb</span>
          <span title="Ações abertas">{k.acoesAbertas} ab</span>
          <span title="Conclusão">{k.acoesTotal > 0 ? Math.round((k.acoesConcluidas / k.acoesTotal) * 100) : 0}%</span>
        </div>
      </div>
    );
  };

  const RenderNode = ({ node, depth = 0 }: { node: AreaNode; depth?: number }) => {
    const isExpanded = expandedAreas.has(node.lider.id);
    const teamIds = collectTeamIds(node);
    const total = teamIds.length;
    const hasChildren = node.subordinados.length > 0 || node.subLideres.length > 0;

    return (
      <div className={depth > 0 ? "ml-4 border-l pl-4 border-border" : ""}>
        <div
          className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2"
          onClick={() => hasChildren && toggleArea(node.lider.id)}
        >
          <div className="flex items-center gap-3">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <span className="w-4" />
            )}
            <Avatar className="h-7 w-7">
              {node.lider.foto_url && <AvatarImage src={node.lider.foto_url} />}
              <AvatarFallback className="text-[9px]">{initials(node.lider.nome)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <Link
                to={`/colaboradores/${node.lider.id}`}
                className="text-sm font-medium hover:underline block truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {node.lider.nome}
              </Link>
              <span className="text-xs text-muted-foreground">{node.lider.cargo} · {total} pessoas</span>
            </div>
          </div>
          <KpiBar ids={teamIds} />
        </div>

        {isExpanded && (
          <div className="mt-1">
            {node.subLideres.map((sl) => (
              <RenderNode key={sl.lider.id} node={sl} depth={depth + 1} />
            ))}
            {node.subordinados.map((sub) => (
              <ColabKpiRow key={sub.id} colab={sub} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!leandro || areas.length === 0) return null;

  const allTeamIds = areas.flatMap((a) => [a.lider.id, ...collectTeamIds(a)]);
  const totalGeral = allTeamIds.length;
  const kpiGeral = aggregateKpis(allTeamIds);
  const metaGeral = totalGeral * META_1ON1_ANO;
  const pctGeral = metaGeral > 0 ? Math.round((kpiGeral.oneOnOnes / metaGeral) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visão por Liderança</CardTitle>
        <p className="text-xs text-muted-foreground">Meta: {META_1ON1_ANO} 1:1 por colaborador/ano · Legenda: 1:1 | Feedbacks | Ações abertas | % Conclusão</p>
      </CardHeader>
      <CardContent>
        {/* Diretoria Adjunta header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b">
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {leandro.foto_url && <AvatarImage src={leandro.foto_url} />}
              <AvatarFallback className="text-[10px]">{initials(leandro.nome)}</AvatarFallback>
            </Avatar>
            <div>
              <Link to={`/colaboradores/${leandro.id}`} className="text-sm font-semibold hover:underline">
                {leandro.nome}
              </Link>
              <p className="text-xs text-muted-foreground">Diretoria Adjunta · {totalGeral} colaboradores</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={pctGeral >= 50 ? "secondary" : "destructive"} className="text-xs">
              <Users2 className="h-3 w-3 mr-1" />1:1: {kpiGeral.oneOnOnes}/{metaGeral} ({pctGeral}%)
            </Badge>
            <Badge variant="outline" className="text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />{kpiGeral.feedbacks} feedbacks
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" />{kpiGeral.acoesAbertas} ações abertas
            </Badge>
          </div>
        </div>

        {/* Progress bar for 1:1 meta */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progresso 1:1 no ano</span>
            <span>{pctGeral}%</span>
          </div>
          <Progress value={Math.min(pctGeral, 100)} className="h-2" />
        </div>

        {/* Areas */}
        <div className="divide-y">
          {areas.map((area) => (
            <div key={area.lider.id} className="py-2">
              <RenderNode node={area} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
