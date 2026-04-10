import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { validarFerias, calcularSaldo } from "@/lib/feriasLogic";

const STATUS_COLORS: Record<string, string> = {
  agendada: "bg-blue-500/10 text-blue-700 border-blue-200",
  concluida: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  cancelada: "bg-muted text-muted-foreground border-muted",
};

const emptyForm = {
  colaborador_id: "",
  periodo_aquisitivo_id: "",
  data_inicio: "",
  data_fim: "",
  dias_gozo: "" as string | number,
  abono_pecuniario: false,
  dias_abono: 0 as number,
  decimo_terceiro_antecipado: false,
  status: "agendada" as string,
  observacao: "",
};

type SortKey = "nome" | "data_inicio" | "data_fim" | "dias_gozo" | "abono" | "decimo_terceiro" | "status";
type SortDir = "asc" | "desc";

export default function FeriasAgendadasTab() {
  const [ferias, setFerias] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saldoInfo, setSaldoInfo] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("ferias_periodos")
      .select("*, colaboradores(nome, matricula), periodos_aquisitivos(data_inicio, data_fim)")
      .order("data_inicio", { ascending: false });
    setFerias(data || []);
  };

  const loadColabs = async () => {
    const { data } = await supabase.from("colaboradores").select("id, nome").eq("ativo", true).eq("tipo_vinculo", "clt").order("nome");
    setColaboradores(data || []);
  };

  useEffect(() => { load(); loadColabs(); }, []);

  useEffect(() => {
    if (!form.colaborador_id) { setPeriodos([]); setSaldoInfo(null); return; }
    supabase
      .from("periodos_aquisitivos")
      .select("*")
      .eq("colaborador_id", form.colaborador_id)
      .eq("desconsiderar_periodo", false)
      .in("status", ["aberto", "parcial"])
      .order("data_inicio")
      .then(({ data }) => setPeriodos(data || []));
  }, [form.colaborador_id]);

  useEffect(() => {
    const p = periodos.find((p) => p.id === form.periodo_aquisitivo_id);
    setSaldoInfo(p ? p.saldo_disponivel : null);
  }, [form.periodo_aquisitivo_id, periodos]);

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
    const filtered = ferias.filter((f) => {
      if (!search) return true;
      const nome = (f.colaboradores as any)?.nome?.toLowerCase() || "";
      return nome.includes(search.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "nome":
          va = (a.colaboradores as any)?.nome?.toLowerCase() || "";
          vb = (b.colaboradores as any)?.nome?.toLowerCase() || "";
          break;
        case "abono":
          va = a.abono_pecuniario ? 1 : 0;
          vb = b.abono_pecuniario ? 1 : 0;
          break;
        case "decimo_terceiro":
          va = a.decimo_terceiro_antecipado ? 1 : 0;
          vb = b.decimo_terceiro_antecipado ? 1 : 0;
          break;
        default:
          va = a[sortKey];
          vb = b[sortKey];
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [ferias, search, sortKey, sortDir]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };

  const openEdit = (f: any) => {
    setEditId(f.id);
    setForm({
      colaborador_id: f.colaborador_id,
      periodo_aquisitivo_id: f.periodo_aquisitivo_id,
      data_inicio: f.data_inicio,
      data_fim: f.data_fim,
      dias_gozo: f.dias_gozo,
      abono_pecuniario: f.abono_pecuniario,
      dias_abono: f.dias_abono,
      decimo_terceiro_antecipado: f.decimo_terceiro_antecipado,
      status: f.status,
      observacao: f.observacao || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const diasGozo = Number(form.dias_gozo) || 0;
    const diasAbono = form.abono_pecuniario ? (Number(form.dias_abono) || 0) : 0;

    const { data: existentes } = await supabase
      .from("ferias_periodos")
      .select("id, data_inicio, data_fim")
      .eq("colaborador_id", form.colaborador_id)
      .neq("status", "cancelada");

    const validacao = validarFerias({
      dataInicio: form.data_inicio,
      dataFim: form.data_fim,
      diasGozo,
      diasAbono,
      saldoDisponivel: saldoInfo ?? 30,
      feriasExistentes: existentes || [],
      editId: editId || undefined,
    });

    if (!validacao.valid) {
      toast({ title: "Validação", description: validacao.errors.join("\n"), variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload: any = {
      colaborador_id: form.colaborador_id,
      periodo_aquisitivo_id: form.periodo_aquisitivo_id,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      dias_gozo: diasGozo,
      abono_pecuniario: form.abono_pecuniario,
      dias_abono: diasAbono,
      decimo_terceiro_antecipado: form.decimo_terceiro_antecipado,
      status: form.status,
      observacao: form.observacao || null,
    };

    const { error } = editId
      ? await supabase.from("ferias_periodos").update(payload).eq("id", editId)
      : await supabase.from("ferias_periodos").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await recalcularSaldoPeriodo(form.periodo_aquisitivo_id);
      toast({ title: editId ? "Férias atualizadas!" : "Férias agendadas!" });
      setDialogOpen(false);
      load();
    }
    setSaving(false);
  };

  const handleDelete = async (f: any) => {
    const { error } = await supabase.from("ferias_periodos").delete().eq("id", f.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      await recalcularSaldoPeriodo(f.periodo_aquisitivo_id);
      toast({ title: "Férias removidas. Saldo devolvido." });
      load();
    }
  };

  const recalcularSaldoPeriodo = async (periodoId: string) => {
    const { data: periodo } = await supabase.from("periodos_aquisitivos").select("dias_direito").eq("id", periodoId).single();
    if (!periodo) return;

    const { data: feriasP } = await supabase
      .from("ferias_periodos")
      .select("dias_gozo, dias_abono, status")
      .eq("periodo_aquisitivo_id", periodoId)
      .neq("status", "cancelada");

    const diasAgendados = (feriasP || []).reduce((s, f) => s + (f.dias_gozo || 0), 0);
    const diasAbono = (feriasP || []).reduce((s, f) => s + (f.dias_abono || 0), 0);
    const saldo = calcularSaldo(periodo.dias_direito, diasAgendados, diasAbono);
    const status = saldo <= 0 ? "concluido" : diasAgendados > 0 ? "parcial" : "aberto";

    await supabase.from("periodos_aquisitivos").update({
      dias_agendados: diasAgendados,
      dias_abono: diasAbono,
      saldo_disponivel: saldo,
      status,
    } as any).eq("id", periodoId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Agendar Férias</Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nome")}>
                <span className="flex items-center">Colaborador <SortIcon column="nome" /></span>
              </TableHead>
              <TableHead>Per. Aquisitivo</TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_inicio")}>
                <span className="flex items-center">Início <SortIcon column="data_inicio" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_fim")}>
                <span className="flex items-center">Fim <SortIcon column="data_fim" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("dias_gozo")}>
                <span className="flex items-center">Dias <SortIcon column="dias_gozo" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("abono")}>
                <span className="flex items-center">Abono <SortIcon column="abono" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("decimo_terceiro")}>
                <span className="flex items-center">13º <SortIcon column="decimo_terceiro" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("status")}>
                <span className="flex items-center">Status <SortIcon column="status" /></span>
              </TableHead>
              {isAdmin && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-medium">{(f.colaboradores as any)?.nome || "—"}</TableCell>
                <TableCell className="text-xs">
                  {f.periodos_aquisitivos
                    ? `${format(parseISO(f.periodos_aquisitivos.data_inicio), "dd/MM/yy")} — ${format(parseISO(f.periodos_aquisitivos.data_fim), "dd/MM/yy")}`
                    : "—"}
                </TableCell>
                <TableCell>{format(parseISO(f.data_inicio), "dd/MM/yyyy")}</TableCell>
                <TableCell>{format(parseISO(f.data_fim), "dd/MM/yyyy")}</TableCell>
                <TableCell>{f.dias_gozo}</TableCell>
                <TableCell>{f.abono_pecuniario ? `Sim (${f.dias_abono}d)` : "—"}</TableCell>
                <TableCell>{f.decimo_terceiro_antecipado ? "Sim" : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={STATUS_COLORS[f.status] || ""}>
                    {f.status === "agendada" ? "Agendada" : f.status === "concluida" ? "Concluída" : "Cancelada"}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(f)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover férias?</AlertDialogTitle>
                            <AlertDialogDescription>O saldo será devolvido ao período aquisitivo.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(f)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  Nenhuma férias agendada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Férias" : "Agendar Férias"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => setForm({ ...form, colaborador_id: v, periodo_aquisitivo_id: "" })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Período Aquisitivo *</Label>
              <Select value={form.periodo_aquisitivo_id} onValueChange={(v) => setForm({ ...form, periodo_aquisitivo_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {periodos.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {format(parseISO(p.data_inicio), "dd/MM/yyyy")} — {format(parseISO(p.data_fim), "dd/MM/yyyy")} (Saldo: {p.saldo_disponivel}d)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {saldoInfo !== null && (
                <p className="text-sm text-muted-foreground">Saldo disponível: <span className="font-semibold">{saldoInfo} dias</span></p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início *</Label>
                <Input type="date" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim *</Label>
                <Input type="date" required value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Dias de Gozo *</Label>
              <Input type="number" required value={form.dias_gozo} onChange={(e) => setForm({ ...form, dias_gozo: e.target.value })} />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.abono_pecuniario} onCheckedChange={(v) => setForm({ ...form, abono_pecuniario: !!v, dias_abono: !!v ? 10 : 0 })} />
                <Label>Abono Pecuniário</Label>
              </div>
              {form.abono_pecuniario && (
                <div className="flex items-center gap-2">
                  <Label>Dias:</Label>
                  <Input type="number" className="w-20" value={form.dias_abono} onChange={(e) => setForm({ ...form, dias_abono: Number(e.target.value) })} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Checkbox checked={form.decimo_terceiro_antecipado} onCheckedChange={(v) => setForm({ ...form, decimo_terceiro_antecipado: !!v })} />
              <Label>13º Antecipado</Label>
            </div>

            {editId && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendada">Agendada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>

            <Button type="submit" className="w-full" disabled={saving || !form.colaborador_id || !form.periodo_aquisitivo_id}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
