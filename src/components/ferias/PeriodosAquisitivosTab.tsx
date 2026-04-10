import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Search, Ban, RotateCcw, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { gerarPeriodosAquisitivos } from "@/lib/feriasLogic";

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

type SortKey = "nome" | "data_inicio" | "data_limite_concessao" | "dias_direito" | "dias_agendados" | "dias_abono" | "saldo_disponivel" | "status";
type SortDir = "asc" | "desc";

export default function PeriodosAquisitivosTab() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [desconsiderarDialog, setDesconsiderarDialog] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("periodos_aquisitivos")
      .select("*, colaboradores(nome, matricula)")
      .order("data_inicio", { ascending: false });
    setPeriodos(data || []);
  };

  useEffect(() => { load(); }, []);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const sorted = useMemo(() => {
    const filtered = periodos.filter((p) => {
      if (!search) return true;
      const nome = (p.colaboradores as any)?.nome?.toLowerCase() || "";
      return nome.includes(search.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "nome") {
        va = (a.colaboradores as any)?.nome?.toLowerCase() || "";
        vb = (b.colaboradores as any)?.nome?.toLowerCase() || "";
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [periodos, search, sortKey, sortDir]);

  const handleGerarPeriodos = async () => {
    setGenerating(true);
    try {
      const { data: configData } = await supabase
        .from("configuracoes_encargos")
        .select("data_vigencia")
        .eq("nome", "data_corte_periodos_aquisitivos")
        .single();
      const dataCorte = configData?.data_vigencia || "2024-01-01";

      const { data: colabs } = await supabase
        .from("colaboradores")
        .select("id, data_admissao")
        .eq("ativo", true)
        .eq("tipo_vinculo", "clt");

      if (!colabs || colabs.length === 0) {
        toast({ title: "Nenhum colaborador CLT ativo encontrado." });
        setGenerating(false);
        return;
      }

      const { data: existentes } = await supabase
        .from("periodos_aquisitivos")
        .select("colaborador_id, data_inicio");
      const existSet = new Set((existentes || []).map((e) => `${e.colaborador_id}_${e.data_inicio}`));

      const novos: any[] = [];
      for (const c of colabs) {
        const gerados = gerarPeriodosAquisitivos(c.id, c.data_admissao, dataCorte);
        for (const p of gerados) {
          const key = `${p.colaborador_id}_${p.data_inicio}`;
          if (!existSet.has(key)) {
            novos.push(p);
          }
        }
      }

      // Filtrar períodos cujo data_fim seja futuro antes de inserir
      const hoje = new Date().toISOString().split("T")[0];
      const novosValidos = novos.filter(p => p.data_fim <= hoje);

      if (novosValidos.length === 0) {
        toast({ title: "Todos os períodos já estão gerados." });
      } else {
        const { error } = await supabase.from("periodos_aquisitivos").insert(novosValidos as any);
        if (error) {
          toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
          toast({ title: `${novosValidos.length} período(s) gerado(s)!` });
          load();
        }
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const handleDesconsiderar = async () => {
    if (!desconsiderarDialog) return;
    const { error } = await supabase
      .from("periodos_aquisitivos")
      .update({
        desconsiderar_periodo: true,
        status: "desconsiderado",
        motivo_desconsideracao: motivo || null,
        desconsiderado_em: new Date().toISOString(),
      } as any)
      .eq("id", desconsiderarDialog);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Período desconsiderado." });
      setDesconsiderarDialog(null);
      setMotivo("");
      load();
    }
  };

  const handleReativar = async (id: string) => {
    const { error } = await supabase
      .from("periodos_aquisitivos")
      .update({
        desconsiderar_periodo: false,
        status: "aberto",
        motivo_desconsideracao: null,
        desconsiderado_em: null,
        desconsiderado_por: null,
      } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Período reativado." });
      load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Button onClick={handleGerarPeriodos} disabled={generating}>
            <RefreshCw className={`mr-2 h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : "Gerar Períodos"}
          </Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nome")}>
                <span className="flex items-center">Colaborador <SortIcon column="nome" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_inicio")}>
                <span className="flex items-center">Período Aquisitivo <SortIcon column="data_inicio" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_limite_concessao")}>
                <span className="flex items-center">Limite Concessão <SortIcon column="data_limite_concessao" /></span>
              </TableHead>
              <TableHead>Data Limite</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dias_direito")}>
                <span className="flex items-center">Direito <SortIcon column="dias_direito" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dias_agendados")}>
                <span className="flex items-center">Agendados <SortIcon column="dias_agendados" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dias_abono")}>
                <span className="flex items-center">Abono <SortIcon column="dias_abono" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("saldo_disponivel")}>
                <span className="flex items-center">Saldo <SortIcon column="saldo_disponivel" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                <span className="flex items-center">Status <SortIcon column="status" /></span>
              </TableHead>
              {isAdmin && <TableHead className="w-24">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => (
              <TableRow key={p.id} className={p.desconsiderar_periodo ? "opacity-60" : ""}>
                <TableCell className="font-medium">{(p.colaboradores as any)?.nome || "—"}</TableCell>
                <TableCell className="text-sm">
                  {format(parseISO(p.data_inicio), "dd/MM/yyyy")} — {format(parseISO(p.data_fim), "dd/MM/yyyy")}
                </TableCell>
                <TableCell className="text-sm">{format(parseISO(p.data_limite_concessao), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-sm">{format(parseISO(p.data_limite_concessao), "dd/MM/yyyy")}</TableCell>
                <TableCell>{p.dias_direito}</TableCell>
                <TableCell>{p.dias_agendados}</TableCell>
                <TableCell>{p.dias_abono}</TableCell>
                <TableCell className="font-semibold">{p.saldo_disponivel}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_COLORS[p.status] || ""}>
                    {STATUS_LABELS[p.status] || p.status}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {p.desconsiderar_periodo ? (
                      <Button variant="ghost" size="sm" onClick={() => handleReativar(p.id)} title="Reativar">
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setDesconsiderarDialog(p.id)} title="Desconsiderar">
                        <Ban className="h-3 w-3" />
                      </Button>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  Nenhum período encontrado. Clique em "Gerar Períodos" para criar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!desconsiderarDialog} onOpenChange={(v) => { if (!v) setDesconsiderarDialog(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Desconsiderar Período</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este período não entrará em saldos, alertas ou pendências. Permanecerá visível no histórico.
            </p>
            <div className="space-y-2">
              <Label>Motivo (opcional)</Label>
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex: Período anterior à entrada na empresa" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDesconsiderarDialog(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDesconsiderar}>Desconsiderar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
