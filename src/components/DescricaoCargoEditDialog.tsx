import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export type Responsabilidade = { processo: string; responsabilidade: string };

export interface DescricaoCargoData {
  missao: string;
  formacao_minima: string;
  formacao_desejavel: string;
  competencias: string[];
  responsabilidades: Responsabilidade[];
}

interface Props {
  colaboradorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DescricaoCargoData | null;
  onSaved: () => void;
}

const empty: DescricaoCargoData = {
  missao: "",
  formacao_minima: "",
  formacao_desejavel: "",
  competencias: [],
  responsabilidades: [],
};

export default function DescricaoCargoEditDialog({ colaboradorId, open, onOpenChange, initial, onSaved }: Props) {
  const [data, setData] = useState<DescricaoCargoData>(empty);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) setData(initial ?? empty);
  }, [open, initial]);

  const addResp = () => setData({ ...data, responsabilidades: [...data.responsabilidades, { processo: "", responsabilidade: "" }] });
  const updResp = (i: number, patch: Partial<Responsabilidade>) => {
    const next = [...data.responsabilidades];
    next[i] = { ...next[i], ...patch };
    setData({ ...data, responsabilidades: next });
  };
  const rmResp = (i: number) => setData({ ...data, responsabilidades: data.responsabilidades.filter((_, idx) => idx !== i) });
  const moveResp = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= data.responsabilidades.length) return;
    const next = [...data.responsabilidades];
    [next[i], next[j]] = [next[j], next[i]];
    setData({ ...data, responsabilidades: next });
  };

  const addComp = () => setData({ ...data, competencias: [...data.competencias, ""] });
  const updComp = (i: number, v: string) => {
    const next = [...data.competencias];
    next[i] = v;
    setData({ ...data, competencias: next });
  };
  const rmComp = (i: number) => setData({ ...data, competencias: data.competencias.filter((_, idx) => idx !== i) });
  const moveComp = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= data.competencias.length) return;
    const next = [...data.competencias];
    [next[i], next[j]] = [next[j], next[i]];
    setData({ ...data, competencias: next });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert descricao_cargo
      const { data: existing } = await supabase
        .from("descricao_cargo")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .maybeSingle();

      let descricaoId: string;
      if (existing) {
        const { error } = await supabase
          .from("descricao_cargo")
          .update({
            missao: data.missao || null,
            formacao_minima: data.formacao_minima || null,
            formacao_desejavel: data.formacao_desejavel || null,
            competencias: data.competencias.filter((c) => c.trim()),
          })
          .eq("id", existing.id);
        if (error) throw error;
        descricaoId = existing.id;
      } else {
        const { data: ins, error } = await supabase
          .from("descricao_cargo")
          .insert({
            colaborador_id: colaboradorId,
            missao: data.missao || null,
            formacao_minima: data.formacao_minima || null,
            formacao_desejavel: data.formacao_desejavel || null,
            competencias: data.competencias.filter((c) => c.trim()),
          })
          .select("id")
          .single();
        if (error) throw error;
        descricaoId = ins.id;
      }

      // Replace responsabilidades
      await supabase.from("descricao_cargo_responsabilidades").delete().eq("descricao_cargo_id", descricaoId);
      const rows = data.responsabilidades
        .filter((r) => r.processo.trim() && r.responsabilidade.trim())
        .map((r, idx) => ({
          descricao_cargo_id: descricaoId,
          processo: r.processo.trim(),
          responsabilidade: r.responsabilidade.trim(),
          ordem: idx,
        }));
      if (rows.length) {
        const { error } = await supabase.from("descricao_cargo_responsabilidades").insert(rows);
        if (error) throw error;
      }

      toast({ title: "Descrição de cargo salva!" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Descrição de Cargo</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Missão do Cargo</Label>
            <Textarea rows={4} value={data.missao} onChange={(e) => setData({ ...data, missao: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Processos e Responsabilidades</Label>
              <Button type="button" size="sm" variant="outline" onClick={addResp}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-3">
              {data.responsabilidades.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start border rounded-md p-2">
                  <div className="col-span-4">
                    <Input placeholder="Processo" value={r.processo} onChange={(e) => updResp(i, { processo: e.target.value })} />
                  </div>
                  <div className="col-span-7">
                    <Textarea rows={2} placeholder="Responsabilidade" value={r.responsabilidade} onChange={(e) => updResp(i, { responsabilidade: e.target.value })} />
                  </div>
                  <div className="col-span-1 flex flex-col gap-1">
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveResp(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveResp(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => rmResp(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              ))}
              {data.responsabilidades.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhuma responsabilidade cadastrada.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Formação acadêmica mínima</Label>
              <Textarea rows={2} value={data.formacao_minima} onChange={(e) => setData({ ...data, formacao_minima: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Formação acadêmica desejável</Label>
              <Textarea rows={2} value={data.formacao_desejavel} onChange={(e) => setData({ ...data, formacao_desejavel: e.target.value })} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Competências Desejáveis</Label>
              <Button type="button" size="sm" variant="outline" onClick={addComp}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {data.competencias.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                  <Input value={c} onChange={(e) => updComp(i, e.target.value)} />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rmComp(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {data.competencias.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhuma competência cadastrada.</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
