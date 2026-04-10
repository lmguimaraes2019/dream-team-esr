import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format, parseISO } from "date-fns";

const TIPO_LABELS: Record<string, string> = {
  medica: "Licença Médica",
  maternidade: "Licença Maternidade",
  outros: "Outros",
};

const TIPO_COLORS: Record<string, string> = {
  medica: "bg-red-500/10 text-red-700 border-red-200",
  maternidade: "bg-purple-500/10 text-purple-700 border-purple-200",
  outros: "bg-muted text-muted-foreground border-muted",
};

const emptyForm = {
  colaborador_id: "",
  tipo: "medica" as string,
  data_inicio: "",
  data_fim: "",
  observacao: "",
};

type SortKey = "nome" | "tipo" | "data_inicio" | "data_fim" | "observacao";
type SortDir = "asc" | "desc";

export default function LicencasTab() {
  const [licencas, setLicencas] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("nome");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("licencas")
      .select("*, colaboradores(nome)")
      .order("data_inicio", { ascending: false });
    setLicencas(data || []);
  };

  const loadColabs = async () => {
    const { data } = await supabase.from("colaboradores").select("id, nome").eq("ativo", true).order("nome");
    setColaboradores(data || []);
  };

  useEffect(() => { load(); loadColabs(); }, []);

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
    const filtered = licencas.filter((l) => {
      if (!search) return true;
      const nome = (l.colaboradores as any)?.nome?.toLowerCase() || "";
      return nome.includes(search.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      let va: any, vb: any;
      if (sortKey === "nome") {
        va = (a.colaboradores as any)?.nome?.toLowerCase() || "";
        vb = (b.colaboradores as any)?.nome?.toLowerCase() || "";
      } else {
        va = a[sortKey] || "";
        vb = b[sortKey] || "";
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [licencas, search, sortKey, sortDir]);

  const openCreate = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (l: any) => {
    setEditId(l.id);
    setForm({
      colaborador_id: l.colaborador_id,
      tipo: l.tipo,
      data_inicio: l.data_inicio,
      data_fim: l.data_fim,
      observacao: l.observacao || "",
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
    };
    const { error } = editId
      ? await supabase.from("licencas").update(payload).eq("id", editId)
      : await supabase.from("licencas").insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editId ? "Licença atualizada!" : "Licença registrada!" });
      setDialogOpen(false);
      load();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("licencas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Licença removida!" });
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
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Registrar Licença</Button>
        )}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("nome")}>
                <span className="flex items-center">Colaborador <SortIcon column="nome" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("tipo")}>
                <span className="flex items-center">Tipo <SortIcon column="tipo" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_inicio")}>
                <span className="flex items-center">Início <SortIcon column="data_inicio" /></span>
              </TableHead>
              <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("data_fim")}>
                <span className="flex items-center">Fim <SortIcon column="data_fim" /></span>
              </TableHead>
              <TableHead>Observação</TableHead>
              {isAdmin && <TableHead className="w-20">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-medium">{(l.colaboradores as any)?.nome || "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={TIPO_COLORS[l.tipo] || ""}>
                    {TIPO_LABELS[l.tipo] || l.tipo}
                  </Badge>
                </TableCell>
                <TableCell>{format(parseISO(l.data_inicio), "dd/MM/yyyy")}</TableCell>
                <TableCell>{format(parseISO(l.data_fim), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{l.observacao || "—"}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><Trash2 className="h-3 w-3" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover licença?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(l.id)}>Remover</AlertDialogAction>
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
                <TableCell colSpan={isAdmin ? 6 : 5} className="text-center py-8 text-muted-foreground">
                  Nenhuma licença encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Licença" : "Registrar Licença"}</DialogTitle></DialogHeader>
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
                  <SelectItem value="medica">Licença Médica</SelectItem>
                  <SelectItem value="maternidade">Licença Maternidade</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
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
              <Label>Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} />
            </div>
            <Button type="submit" className="w-full" disabled={saving || !form.colaborador_id}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
