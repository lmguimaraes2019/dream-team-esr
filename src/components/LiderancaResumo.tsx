import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Users, DollarSign } from "lucide-react";
import { nivelLabel } from "@/lib/nivelLabels";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface Colab {
  id: string;
  nome: string;
  cargo: string;
  gerencia: string;
  gestor_direto: string | null;
  nivel_complexidade: string;
  lideranca: boolean;
  foto_url: string | null;
  custo_mensal: number;
  salario_base: number;
}

interface AreaNode {
  lider: Colab;
  subordinados: Colab[];
  subLideres: AreaNode[];
}

// Specific names for Diretoria Adjunta aggregation
const DIRETORIA_NOMES = ["LUCIANA BATISTA DA SILVA", "YVE A MARCIAL G  DE BARROS", "RENATO DUARTE ROCHA", "CELIA MARIA QUEIROGA MACIEL", "OLAVO LEMOS CALACA DAS NEVES"];

export default function LiderancaResumo() {
  const [leandro, setLeandro] = useState<Colab | null>(null);
  const [areas, setAreas] = useState<AreaNode[]>([]);
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get latest mes_referencia
    const { data: mesData } = await supabase
      .from("custos_mensais")
      .select("mes_referencia")
      .order("mes_referencia", { ascending: false })
      .limit(1);
    const mesRef = mesData?.[0]?.mes_referencia;
    if (!mesRef) return;

    const { data: colabs } = await supabase
      .from("colaboradores")
      .select("id, nome, cargo, gerencia, gestor_direto, nivel_complexidade, lideranca, foto_url")
      .eq("ativo", true);

    const { data: custos } = await supabase
      .from("custos_mensais")
      .select("colaborador_id, custo_mensal, salario_base")
      .eq("mes_referencia", mesRef);

    if (!colabs || !custos) return;

    const custoMap = new Map(custos.map((c) => [c.colaborador_id, c]));

    const enriched: Colab[] = colabs.map((c) => ({
      ...c,
      custo_mensal: Number(custoMap.get(c.id)?.custo_mensal || 0),
      salario_base: Number(custoMap.get(c.id)?.salario_base || 0),
    }));

    // Find Leandro
    const leandroColab = enriched.find((c) => c.cargo.toUpperCase().includes("DIRETOR ADJUNTO"));
    if (leandroColab) setLeandro(leandroColab);

    // Build area trees from the gerente_02/01 who report to Leandro
    const diretosLeandro = enriched.filter((c) => DIRETORIA_NOMES.includes(c.nome));

    const buildTree = (lider: Colab): AreaNode => {
      const subs = enriched.filter((c) => c.gestor_direto === lider.nome && c.id !== lider.id);
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

  const countAll = (node: AreaNode): number => {
    return node.subordinados.length + node.subLideres.reduce((s, sl) => s + 1 + countAll(sl), 0);
  };

  const custoAll = (node: AreaNode): number => {
    return (
      node.lider.custo_mensal +
      node.subordinados.reduce((s, c) => s + c.custo_mensal, 0) +
      node.subLideres.reduce((s, sl) => s + custoAll(sl), 0)
    );
  };

  const initials = (nome: string) =>
    nome.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  const RenderNode = ({ node, depth = 0 }: { node: AreaNode; depth?: number }) => {
    const isExpanded = expandedAreas.has(node.lider.id);
    const total = countAll(node);
    const custo = custoAll(node);
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
              <span className="text-xs text-muted-foreground">{node.lider.cargo}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{total}</span>
            </div>
            <div className="text-xs font-medium w-28 text-right">{fmt(custo)}</div>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-1">
            {node.subLideres.map((sl) => (
              <RenderNode key={sl.lider.id} node={sl} depth={depth + 1} />
            ))}
            {node.subordinados.map((sub) => (
              <div key={sub.id} className={`flex items-center justify-between py-1.5 ${depth > 0 ? "ml-4 pl-4" : "ml-4 pl-4"}`}>
                <div className="flex items-center gap-3">
                  <span className="w-4" />
                  <Avatar className="h-6 w-6">
                    {sub.foto_url && <AvatarImage src={sub.foto_url} />}
                    <AvatarFallback className="text-[8px]">{initials(sub.nome)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <Link
                      to={`/colaboradores/${sub.id}`}
                      className="text-xs hover:underline block truncate"
                    >
                      {sub.nome}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">{sub.cargo} · {nivelLabel(sub.nivel_complexidade)}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground w-28 text-right">{fmt(sub.custo_mensal)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (!leandro || areas.length === 0) return null;

  const totalGeral = areas.reduce((s, a) => s + 1 + countAll(a), 0);
  const custoGeral = leandro.custo_mensal + areas.reduce((s, a) => s + custoAll(a), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Visão por Liderança</CardTitle>
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
              <p className="text-xs text-muted-foreground">Diretoria Adjunta · {leandro.gerencia}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="text-xs">
              <Users className="h-3 w-3 mr-1" />{totalGeral} colaboradores
            </Badge>
            <Badge variant="outline" className="text-xs">
              <DollarSign className="h-3 w-3 mr-1" />{fmt(custoGeral)}
            </Badge>
          </div>
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
