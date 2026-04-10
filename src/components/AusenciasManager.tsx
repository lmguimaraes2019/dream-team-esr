import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2 } from "lucide-react";
import { format, parseISO, isWithinInterval } from "date-fns";

interface Ausencia {
  id: string;
  colaborador_id: string;
  tipo: "ferias" | "licenca_medica" | "licenca_maternidade";
  data_inicio: string;
  data_fim: string;
  observacao: string | null;
  created_at: string;
}

export const TIPO_LABELS: Record<string, string> = {
  ferias: "Férias",
  licenca_medica: "Licença Médica",
  licenca_maternidade: "Licença Maternidade",
};

export const TIPO_COLORS: Record<string, string> = {
  ferias: "bg-amber-500 text-white hover:bg-amber-500/80",
  licenca_medica: "bg-red-500 text-white hover:bg-red-500/80",
  licenca_maternidade: "bg-purple-500 text-white hover:bg-purple-500/80",
};

interface Props {
  colaboradorId: string;
  isAdmin: boolean;
}

export function getAusenciaAtiva(ausencias: Ausencia[]): Ausencia | null {
  const today = new Date();
  return ausencias.find((a) => {
    try {
      return isWithinInterval(today, { start: parseISO(a.data_inicio), end: parseISO(a.data_fim) });
    } catch { return false; }
  }) || null;
}

export function AusenciaBadge({ tipo }: { tipo: string }) {
  return (
    <Badge className={`${TIPO_COLORS[tipo] || ""} border-0`}>
      {TIPO_LABELS[tipo] || tipo}
    </Badge>
  );
}

export default function AusenciasManager({ colaboradorId, isAdmin }: Props) {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tipo, setTipo] = useState<string>("ferias");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase
      .from("ausencias")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .order("data_inicio", { ascending: false });
    setAusencias((data as Ausencia[]) || []);
  };

  useEffect(() => { load(); }, [colaboradorId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("ausencias").insert({
      colaborador_id: colaboradorId,
      tipo,
      data_inicio: dataInicio,
      data_fim: dataFim,
      observacao: observacao || null,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ausência registrada!" });
      setDialogOpen(false);
      setTipo("ferias");
      setDataInicio("");
      setDataFim("");
      setObservacao("");
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

  const ativa = getAusenciaAtiva(ausencias);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Férias e Licenças</CardTitle>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" />Registrar</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar Ausência</DialogTitle></DialogHeader>
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select value={tipo} onValueChange={setTipo}>
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
                    <Input type="date" required value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim *</Label>
                    <Input type="date" required value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {ativa && (
          <div className="mb-4 p-3 rounded-md border border-dashed flex items-center gap-2">
            <span className="text-sm font-medium">Status atual:</span>
            <AusenciaBadge tipo={ativa.tipo} />
            <span className="text-sm text-muted-foreground">
              até {format(parseISO(ativa.data_fim), "dd/MM/yyyy")}
            </span>
          </div>
        )}
        {ausencias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma ausência registrada.</p>
        ) : (
          <div className="space-y-2">
            {ausencias.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                <div className="flex items-center gap-2">
                  <AusenciaBadge tipo={a.tipo} />
                  <span>{format(parseISO(a.data_inicio), "dd/MM/yyyy")} — {format(parseISO(a.data_fim), "dd/MM/yyyy")}</span>
                  {a.observacao && <span className="text-muted-foreground">({a.observacao})</span>}
                </div>
                {isAdmin && (
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
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
