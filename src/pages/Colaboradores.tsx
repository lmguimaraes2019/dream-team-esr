import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import { NIVEL_OPTIONS, nivelLabel } from "@/lib/nivelLabels";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";
import { useOrigensRecurso } from "@/hooks/useOrigensRecurso";

type Colaborador = Tables<"colaboradores">;

interface AusenciaAtiva {
  colaborador_id: string;
  tipo: string;
}

export default function Colaboradores() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [ausenciasAtivas, setAusenciasAtivas] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [filtroGerencia, setFiltroGerencia] = useState("all");
  const [filtroNivel, setFiltroNivel] = useState("all");
  const [filtroVinculo, setFiltroVinculo] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const origensRecurso = useOrigensRecurso();

  const load = async () => {
    const { data } = await supabase.from("colaboradores").select("*").eq("ativo", true).order("nome");
    setColaboradores(data || []);

    const today = new Date().toISOString().split("T")[0];
    const { data: ausencias } = await supabase
      .from("ausencias")
      .select("colaborador_id, tipo")
      .lte("data_inicio", today)
      .gte("data_fim", today);
    const map: Record<string, string> = {};
    ausencias?.forEach((a) => { map[a.colaborador_id] = a.tipo; });
    setAusenciasAtivas(map);
  };

  useEffect(() => { load(); }, []);

  const gerencias = [...new Set(colaboradores.map((c) => c.gerencia))].sort();

  const filtered = colaboradores.filter((c) => {
    const matchSearch = c.nome.toLowerCase().includes(search.toLowerCase()) ||
      (c.matricula || "").toLowerCase().includes(search.toLowerCase());
    const matchGerencia = filtroGerencia === "all" || c.gerencia === filtroGerencia;
    const matchNivel = filtroNivel === "all" || c.nivel_complexidade === filtroNivel;
    const matchVinculo = filtroVinculo === "all" || c.tipo_vinculo === filtroVinculo;
    return matchSearch && matchGerencia && matchNivel && matchVinculo;
  });

  const [form, setForm] = useState<Partial<TablesInsert<"colaboradores">> & Record<string, any>>({
    genero: "masculino",
    nivel_complexidade: "junior",
    tipo_vinculo: "clt",
    grupo: 1,
    lideranca: false,
  });

  const formIsTerceirizado = form.tipo_vinculo === "terceirizado";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("colaboradores").insert(form as TablesInsert<"colaboradores">);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Colaborador criado com sucesso!" });
      setDialogOpen(false);
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Colaboradores</h1>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Colaborador</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input required value={form.nome || ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Vínculo</Label>
                  <Select value={form.tipo_vinculo} onValueChange={(v: any) => setForm({ ...form, tipo_vinculo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.tipo_vinculo.map((t) => (
                        <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CLT fields */}
                {!formIsTerceirizado && (
                  <>
                    <div className="space-y-2">
                      <Label>Matrícula *</Label>
                      <Input required value={form.matricula || ""} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Origem de Recurso</Label>
                      <Select value={form.origem_recurso || ""} onValueChange={(v) => setForm({ ...form, origem_recurso: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {origensRecurso.map((o) => (
                            <SelectItem key={o} value={o}>{o}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Terceirizado fields */}
                {formIsTerceirizado && (
                  <>
                    <div className="space-y-2">
                      <Label>Empresa Terceirizada *</Label>
                      <Input required value={form.empresa_terceirizada || ""} onChange={(e) => setForm({ ...form, empresa_terceirizada: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Custo Mensal (R$)</Label>
                      <Input type="number" step="0.01" value={form.custo_mensal_terceirizado || ""} onChange={(e) => setForm({ ...form, custo_mensal_terceirizado: Number(e.target.value) })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Duração do Contrato</Label>
                      <Input placeholder="Ex: 12 meses" value={form.duracao_contrato || ""} onChange={(e) => setForm({ ...form, duracao_contrato: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Gestor do Contrato</Label>
                      <Input value={form.gestor_contrato || ""} onChange={(e) => setForm({ ...form, gestor_contrato: e.target.value })} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Gênero</Label>
                  <Select value={form.genero} onValueChange={(v: any) => setForm({ ...form, genero: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Constants.public.Enums.genero.map((g) => (
                        <SelectItem key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Admissão *</Label>
                  <Input type="date" required value={form.data_admissao || ""} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Gerência *</Label>
                  <Input required value={form.gerencia || ""} onChange={(e) => setForm({ ...form, gerencia: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Diretoria *</Label>
                  <Input required value={form.diretoria || ""} onChange={(e) => setForm({ ...form, diretoria: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Cargo *</Label>
                  <Input required value={form.cargo || ""} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Trajetória *</Label>
                  <Select value={form.trajetoria || ""} onValueChange={(v) => setForm({ ...form, trajetoria: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {["Gestão do Negócio", "Liderança", "Relacionamento", "Tecnológica"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nível de Complexidade</Label>
                  <Select value={form.nivel_complexidade} onValueChange={(v: any) => setForm({ ...form, nivel_complexidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NIVEL_OPTIONS.map((n) => (
                        <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grupo</Label>
                  <Select value={String(form.grupo)} onValueChange={(v) => setForm({ ...form, grupo: Number(v) })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    checked={form.lideranca || false}
                    onChange={(e) => setForm({ ...form, lideranca: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <Label>Liderança</Label>
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full">Salvar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou matrícula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroGerencia} onValueChange={setFiltroGerencia}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Gerência" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {gerencias.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroNivel} onValueChange={setFiltroNivel}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Nível de Complexidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {NIVEL_OPTIONS.map((n) => (
              <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filtroVinculo} onValueChange={setFiltroVinculo}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Vínculo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Constants.public.Enums.tipo_vinculo.map((t) => (
              <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula / Empresa</TableHead>
              <TableHead>Gerência</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Nível de Complexidade</TableHead>
              <TableHead>Vínculo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => navigate(`/colaboradores/${c.id}`)}
              >
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell>{c.tipo_vinculo === "terceirizado" ? (c as any).empresa_terceirizada || "—" : c.matricula || "—"}</TableCell>
                <TableCell>{c.gerencia}</TableCell>
                <TableCell>{c.cargo}</TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {nivelLabel(c.nivel_complexidade)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={c.tipo_vinculo === "clt" ? "default" : "outline"}>
                    {c.tipo_vinculo.toUpperCase()}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
