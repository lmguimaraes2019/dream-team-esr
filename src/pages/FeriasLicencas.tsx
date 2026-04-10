import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Upload, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AusenciaBadge, TIPO_LABELS } from "@/components/AusenciasManager";
import * as XLSX from "xlsx";
import type { Tables } from "@/integrations/supabase/types";

type Colaborador = Tables<"colaboradores">;

interface AusenciaRow {
  id: string;
  colaborador_id: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
  periodo_aquisitivo_inicio: string | null;
  periodo_aquisitivo_fim: string | null;
  dias: number | null;
  abono_pecuniario: boolean;
  dias_abono: number | null;
  decimo_terceiro_antecipado: boolean;
  created_at: string;
  colaboradores?: { nome: string; matricula: string | null } | null;
}

interface ImportRow {
  nome: string;
  matricula?: string;
  periodo_aquisitivo_inicio?: string;
  periodo_aquisitivo_fim?: string;
  data_inicio: string;
  data_fim: string;
  dias?: number;
  abono_pecuniario?: boolean;
  dias_abono?: number;
  decimo_terceiro_antecipado?: boolean;
  matched?: boolean;
  colaborador_id?: string;
}

const emptyForm = {
  colaborador_id: "",
  tipo: "ferias" as string,
  data_inicio: "",
  data_fim: "",
  observacao: "",
  periodo_aquisitivo_inicio: "",
  periodo_aquisitivo_fim: "",
  dias: "" as string | number,
  abono_pecuniario: false,
  dias_abono: "" as string | number,
  decimo_terceiro_antecipado: false,
};

export default function FeriasLicencas() {
  const [ausencias, setAusencias] = useState<AusenciaRow[]>([]);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [filtroTipo, setFiltroTipo] = useState("all");
  const [filtroColab, setFiltroColab] = useState("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("ausencias")
      .select("*, colaboradores(nome, matricula)")
      .order("data_inicio", { ascending: false });
    setAusencias((data as any) || []);
  };

  const loadColabs = async () => {
    const { data } = await supabase.from("colaboradores").select("*").eq("ativo", true).order("nome");
    setColaboradores(data || []);
  };

  useEffect(() => { load(); loadColabs(); }, []);

  const filtered = ausencias.filter((a) => {
    if (filtroTipo !== "all" && a.tipo !== filtroTipo) return false;
    if (filtroColab !== "all" && a.colaborador_id !== filtroColab) return false;
    if (search) {
      const nome = (a.colaboradores as any)?.nome?.toLowerCase() || "";
      if (!nome.includes(search.toLowerCase())) return false;
    }
    return true;
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (a: AusenciaRow) => {
    setEditId(a.id);
    setForm({
      colaborador_id: a.colaborador_id,
      tipo: a.tipo,
      data_inicio: a.data_inicio,
      data_fim: a.data_fim,
      observacao: a.observacao || "",
      periodo_aquisitivo_inicio: a.periodo_aquisitivo_inicio || "",
      periodo_aquisitivo_fim: a.periodo_aquisitivo_fim || "",
      dias: a.dias ?? "",
      abono_pecuniario: a.abono_pecuniario,
      dias_abono: a.dias_abono ?? "",
      decimo_terceiro_antecipado: a.decimo_terceiro_antecipado,
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload: any = {
      colaborador_id: form.colaborador_id,
      tipo: form.tipo,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      observacao: form.observacao || null,
      periodo_aquisitivo_inicio: form.periodo_aquisitivo_inicio || null,
      periodo_aquisitivo_fim: form.periodo_aquisitivo_fim || null,
      dias: form.dias !== "" ? Number(form.dias) : null,
      abono_pecuniario: form.abono_pecuniario,
      dias_abono: form.dias_abono !== "" ? Number(form.dias_abono) : null,
      decimo_terceiro_antecipado: form.decimo_terceiro_antecipado,
    };

    const { error } = editId
      ? await supabase.from("ausencias").update(payload).eq("id", editId)
      : await supabase.from("ausencias").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Ausência atualizada!" : "Ausência registrada!" });
      setDialogOpen(false);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ausencias").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ausência removida!" });
      load();
    }
  };

  // Import logic
  const parseExcelDate = (val: any): string => {
    if (!val) return "";
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    const ddmmyyyy = str.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    const yyyymmdd = str.match(/^(\d{4})[/\-.](\d{2})[/\-.](\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
    return str;
  };

  const parseBool = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return ["sim", "s", "yes", "y", "true", "1", "x"].includes(s);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (raw.length === 0) {
      toast({ title: "Planilha vazia", variant: "destructive" });
      return;
    }

    const findCol = (headers: string[], patterns: string[]) =>
      headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));

    const headers = Object.keys(raw[0]);
    const colNome = findCol(headers, ["nome", "colaborador"]);
    const colMat = findCol(headers, ["matrícula", "matricula"]);
    const colPAInicio = findCol(headers, ["período aquisitivo", "per. aquisitivo", "aquisitivo"]);
    const colAbono = findCol(headers, ["abono"]);
    const colDiasAbono = findCol(headers, ["dias abono", "dias de abono"]);
    const col13 = findCol(headers, ["13", "décimo", "decimo"]);

    // Find period columns (1º, 2º, 3º)
    const periodCols: { inicio: string; fim: string; dias?: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const prefix = `${i}º`;
      const inicioCol = headers.find((h) => h.includes(prefix) && (h.toLowerCase().includes("início") || h.toLowerCase().includes("inicio")));
      const fimCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("fim"));
      const diasCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("dia"));
      if (inicioCol && fimCol) {
        periodCols.push({ inicio: inicioCol, fim: fimCol, dias: diasCol });
      }
    }

    // Fallback: single data_inicio / data_fim
    if (periodCols.length === 0) {
      const colInicio = findCol(headers, ["data início", "data inicio", "início", "inicio"]);
      const colFim = findCol(headers, ["data fim", "fim"]);
      const colDias = findCol(headers, ["dias"]);
      if (colInicio && colFim) {
        periodCols.push({ inicio: colInicio, fim: colFim, dias: colDias });
      }
    }

    if (!colNome || periodCols.length === 0) {
      toast({ title: "Não foi possível identificar as colunas da planilha", variant: "destructive" });
      return;
    }

    // Parse periodo aquisitivo
    const parsePeriodoAquisitivo = (val: any): { inicio: string; fim: string } | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\s*(?:a|à|-)\s*(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})/);
      if (match) {
        return { inicio: parseExcelDate(match[1]), fim: parseExcelDate(match[2]) };
      }
      return null;
    };

    const rows: ImportRow[] = [];
    for (const row of raw) {
      const nome = String(row[colNome!] || "").trim();
      if (!nome) continue;
      const matricula = colMat ? String(row[colMat] || "").trim() : undefined;
      const pa = colPAInicio ? parsePeriodoAquisitivo(row[colPAInicio]) : null;
      const abono = colAbono ? parseBool(row[colAbono]) : false;
      const diasAbono = colDiasAbono ? (Number(row[colDiasAbono]) || undefined) : undefined;
      const dec13 = col13 ? parseBool(row[col13]) : false;

      for (const pc of periodCols) {
        const inicio = parseExcelDate(row[pc.inicio]);
        const fim = parseExcelDate(row[pc.fim]);
        if (!inicio || !fim) continue;
        const dias = pc.dias ? (Number(row[pc.dias]) || undefined) : undefined;

        // Match colaborador
        const matched = colaboradores.find((c) => {
          if (matricula && c.matricula && c.matricula.toLowerCase() === matricula.toLowerCase()) return true;
          return c.nome.toLowerCase() === nome.toLowerCase();
        });

        rows.push({
          nome,
          matricula,
          periodo_aquisitivo_inicio: pa?.inicio,
          periodo_aquisitivo_fim: pa?.fim,
          data_inicio: inicio,
          data_fim: fim,
          dias,
          abono_pecuniario: abono,
          dias_abono: diasAbono,
          decimo_terceiro_antecipado: dec13,
          matched: !!matched,
          colaborador_id: matched?.id,
        });
      }
    }

    if (rows.length === 0) {
      toast({ title: "Nenhum período válido encontrado na planilha", variant: "destructive" });
      return;
    }

    setImportPreview(rows);
    setImportDialogOpen(true);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    const toInsert = importPreview
      .filter((r) => r.matched && r.colaborador_id)
      .map((r) => ({
        colaborador_id: r.colaborador_id!,
        tipo: "ferias" as const,
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        observacao: null,
        periodo_aquisitivo_inicio: r.periodo_aquisitivo_inicio || null,
        periodo_aquisitivo_fim: r.periodo_aquisitivo_fim || null,
        dias: r.dias ?? null,
        abono_pecuniario: r.abono_pecuniario ?? false,
        dias_abono: r.dias_abono ?? null,
        decimo_terceiro_antecipado: r.decimo_terceiro_antecipado ?? false,
      }));

    if (toInsert.length === 0) {
      toast({ title: "Nenhum colaborador correspondente encontrado", variant: "destructive" });
      setImporting(false);
      return;
    }

    const { error } = await supabase.from("ausencias").insert(toInsert as any);
    setImporting(false);
    if (error) {
      toast({ title: "Erro na importação", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `${toInsert.length} registro(s) importado(s)!` });
      setImportDialogOpen(false);
      setImportPreview(null);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Férias e Licenças</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <label>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
              <Button variant="outline" asChild>
                <span className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Importar</span>
              </Button>
            </label>
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Registrar</Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(TIPO_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroColab} onValueChange={setFiltroColab}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {colaboradores.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Colaborador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Per. Aquisitivo</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Fim</TableHead>
              <TableHead>Dias</TableHead>
              <TableHead>Abono</TableHead>
              <TableHead>13º Antec.</TableHead>
              <TableHead>Observação</TableHead>
              {isAdmin && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{(a.colaboradores as any)?.nome || "—"}</TableCell>
                <TableCell><AusenciaBadge tipo={a.tipo} /></TableCell>
                <TableCell className="text-xs">
                  {a.periodo_aquisitivo_inicio && a.periodo_aquisitivo_fim
                    ? `${format(parseISO(a.periodo_aquisitivo_inicio), "dd/MM/yy")} — ${format(parseISO(a.periodo_aquisitivo_fim), "dd/MM/yy")}`
                    : "—"}
                </TableCell>
                <TableCell>{format(parseISO(a.data_inicio), "dd/MM/yyyy")}</TableCell>
                <TableCell>{format(parseISO(a.data_fim), "dd/MM/yyyy")}</TableCell>
                <TableCell>{a.dias ?? "—"}</TableCell>
                <TableCell>{a.abono_pecuniario ? `Sim${a.dias_abono ? ` (${a.dias_abono}d)` : ""}` : "—"}</TableCell>
                <TableCell>{a.decimo_terceiro_antecipado ? "Sim" : "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{a.observacao || "—"}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover ausência?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(a.id)}>Remover</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 9} className="text-center py-8 text-muted-foreground">
                  Nenhuma ausência encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Ausência" : "Registrar Ausência"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={form.colaborador_id} onValueChange={(v) => setForm({ ...form, colaborador_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ferias">Férias</SelectItem>
                  <SelectItem value="licenca_medica">Licença Médica</SelectItem>
                  <SelectItem value="licenca_maternidade">Licença Maternidade</SelectItem>
                </SelectContent>
              </Select>
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
              <Label>Dias</Label>
              <Input type="number" value={form.dias} onChange={(e) => setForm({ ...form, dias: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Per. Aquisitivo Início</Label>
                <Input type="date" value={form.periodo_aquisitivo_inicio} onChange={(e) => setForm({ ...form, periodo_aquisitivo_inicio: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Per. Aquisitivo Fim</Label>
                <Input type="date" value={form.periodo_aquisitivo_fim} onChange={(e) => setForm({ ...form, periodo_aquisitivo_fim: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Checkbox checked={form.abono_pecuniario} onCheckedChange={(v) => setForm({ ...form, abono_pecuniario: !!v })} />
                <Label>Abono Pecuniário</Label>
              </div>
              {form.abono_pecuniario && (
                <div className="flex items-center gap-2">
                  <Label>Dias:</Label>
                  <Input type="number" className="w-20" value={form.dias_abono} onChange={(e) => setForm({ ...form, dias_abono: e.target.value })} />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.decimo_terceiro_antecipado} onCheckedChange={(v) => setForm({ ...form, decimo_terceiro_antecipado: !!v })} />
              <Label>13º Antecipado</Label>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !form.colaborador_id}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Import Preview Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview da Importação</DialogTitle>
          </DialogHeader>
          {importPreview && (
            <>
              <p className="text-sm text-muted-foreground">
                {importPreview.filter((r) => r.matched).length} de {importPreview.length} registros com correspondência encontrada.
              </p>
              <div className="rounded-lg border max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Abono</TableHead>
                      <TableHead>13º</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((r, i) => (
                      <TableRow key={i} className={r.matched ? "" : "opacity-50"}>
                        <TableCell>
                          <Badge variant={r.matched ? "default" : "destructive"} className="text-xs">
                            {r.matched ? "OK" : "Não encontrado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell>{r.data_inicio}</TableCell>
                        <TableCell>{r.data_fim}</TableCell>
                        <TableCell>{r.dias ?? "—"}</TableCell>
                        <TableCell>{r.abono_pecuniario ? "Sim" : "—"}</TableCell>
                        <TableCell>{r.decimo_terceiro_antecipado ? "Sim" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setImportDialogOpen(false); setImportPreview(null); }}>
                  Cancelar
                </Button>
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? "Importando..." : `Importar ${importPreview.filter((r) => r.matched).length} registros`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
