import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

interface Movimentacao {
  id: string;
  data: string;
  tipo_movimentacao: string;
  cargo: string | null;
  salario: number | null;
  trajetoria: string | null;
  nivel: string | null;
  grupo: string | null;
}

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const emptyForm = { data: "", tipo_movimentacao: "", cargo: "", salario: "", trajetoria: "", nivel: "", grupo: "" };

export default function MovimentacoesCarreiraCard({ colaboradorId }: { colaboradorId: string }) {
  const [movs, setMovs] = useState<Movimentacao[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expanded, setExpanded] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("movimentacoes_carreira" as any)
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .order("data", { ascending: false });
    setMovs((data || []) as any);
  };

  useEffect(() => { load(); }, [colaboradorId]);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (m: Movimentacao) => {
    setEditId(m.id);
    setForm({
      data: m.data,
      tipo_movimentacao: m.tipo_movimentacao,
      cargo: m.cargo || "",
      salario: m.salario != null ? String(m.salario) : "",
      trajetoria: m.trajetoria || "",
      nivel: m.nivel || "",
      grupo: m.grupo || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.data || !form.tipo_movimentacao) return;
    const payload: any = {
      colaborador_id: colaboradorId,
      data: form.data,
      tipo_movimentacao: form.tipo_movimentacao,
      cargo: form.cargo || null,
      salario: form.salario ? parseFloat(form.salario) : null,
      trajetoria: form.trajetoria || null,
      nivel: form.nivel || null,
      grupo: form.grupo || null,
    };

    if (editId) {
      await supabase.from("movimentacoes_carreira" as any).update(payload).eq("id", editId);
    } else {
      await supabase.from("movimentacoes_carreira" as any).insert(payload);
    }

    toast({ title: editId ? "Movimentação atualizada!" : "Movimentação adicionada!" });
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("movimentacoes_carreira" as any).delete().eq("id", id);
    toast({ title: "Movimentação excluída!" });
    load();
  };

  if (movs.length === 0 && !isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Histórico de Movimentações</CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {movs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma movimentação registrada.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Salário</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead>Grupo</TableHead>
                  {isAdmin && <TableHead></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(expanded ? movs : movs.slice(0, 2)).map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{new Date(m.data + "T00:00:00").toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{m.tipo_movimentacao}</TableCell>
                    <TableCell>{m.cargo || "—"}</TableCell>
                    <TableCell>{m.salario != null ? fmt(m.salario) : "—"}</TableCell>
                    <TableCell>{m.nivel || "—"}</TableCell>
                    <TableCell>{m.grupo || "—"}</TableCell>
                    {isAdmin && (
                      <TableCell className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm"><Trash2 className="h-3 w-3" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir movimentação?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(m.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {movs.length > 2 && (
              <div className="flex justify-center mt-2">
                <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? (
                    <><ChevronUp className="mr-1 h-4 w-4" /> Recolher</>
                  ) : (
                    <><ChevronDown className="mr-1 h-4 w-4" /> Ver mais {movs.length - 2} movimentaç{movs.length - 2 === 1 ? "ão" : "ões"}</>
                  )}
                </Button>
              </div>
            )}
          </>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Editar" : "Adicionar"} Movimentação</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Data *</Label>
                  <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Tipo *</Label>
                  <Input value={form.tipo_movimentacao} onChange={(e) => setForm({ ...form, tipo_movimentacao: e.target.value })} placeholder="DISSÍDIO, PROGRESSÃO..." />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Salário</Label>
                  <Input type="number" step="0.01" value={form.salario} onChange={(e) => setForm({ ...form, salario: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Trajetória</Label>
                  <Input value={form.trajetoria} onChange={(e) => setForm({ ...form, trajetoria: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Nível</Label>
                  <Input value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Grupo</Label>
                  <Input value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.data || !form.tipo_movimentacao}>
                {editId ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
