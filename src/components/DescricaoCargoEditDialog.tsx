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

// Internal grouped representation for the editor
type ProcessoGroup = { processo: string; itens: string[] };

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

function toGroups(resp: Responsabilidade[]): ProcessoGroup[] {
  const groups: ProcessoGroup[] = [];
  for (const r of resp) {
    const last = groups[groups.length - 1];
    if (last && last.processo === r.processo) last.itens.push(r.responsabilidade);
    else groups.push({ processo: r.processo, itens: [r.responsabilidade] });
  }
  return groups;
}

function fromGroups(groups: ProcessoGroup[]): Responsabilidade[] {
  const out: Responsabilidade[] = [];
  for (const g of groups) {
    for (const item of g.itens) {
      out.push({ processo: g.processo, responsabilidade: item });
    }
  }
  return out;
}

export default function DescricaoCargoEditDialog({ colaboradorId, open, onOpenChange, initial, onSaved }: Props) {
  const [missao, setMissao] = useState("");
  const [formacaoMinima, setFormacaoMinima] = useState("");
  const [formacaoDesejavel, setFormacaoDesejavel] = useState("");
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [groups, setGroups] = useState<ProcessoGroup[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      const src = initial ?? empty;
      setMissao(src.missao);
      setFormacaoMinima(src.formacao_minima);
      setFormacaoDesejavel(src.formacao_desejavel);
      setCompetencias(src.competencias);
      setGroups(toGroups(src.responsabilidades));
    }
  }, [open, initial]);

  // Process group operations
  const addGroup = () => setGroups([...groups, { processo: "", itens: [""] }]);
  const updGroupName = (gi: number, processo: string) => {
    const next = [...groups];
    next[gi] = { ...next[gi], processo };
    setGroups(next);
  };
  const rmGroup = (gi: number) => setGroups(groups.filter((_, i) => i !== gi));
  const moveGroup = (gi: number, dir: -1 | 1) => {
    const j = gi + dir;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    [next[gi], next[j]] = [next[j], next[gi]];
    setGroups(next);
  };

  // Item operations within a group
  const addItem = (gi: number) => {
    const next = [...groups];
    next[gi] = { ...next[gi], itens: [...next[gi].itens, ""] };
    setGroups(next);
  };
  const updItem = (gi: number, ii: number, value: string) => {
    const next = [...groups];
    const itens = [...next[gi].itens];
    itens[ii] = value;
    next[gi] = { ...next[gi], itens };
    setGroups(next);
  };
  const rmItem = (gi: number, ii: number) => {
    const next = [...groups];
    next[gi] = { ...next[gi], itens: next[gi].itens.filter((_, i) => i !== ii) };
    setGroups(next);
  };
  const moveItem = (gi: number, ii: number, dir: -1 | 1) => {
    const j = ii + dir;
    const itens = groups[gi].itens;
    if (j < 0 || j >= itens.length) return;
    const next = [...groups];
    const newItens = [...itens];
    [newItens[ii], newItens[j]] = [newItens[j], newItens[ii]];
    next[gi] = { ...next[gi], itens: newItens };
    setGroups(next);
  };

  // Competencias
  const addComp = () => setCompetencias([...competencias, ""]);
  const updComp = (i: number, v: string) => {
    const next = [...competencias];
    next[i] = v;
    setCompetencias(next);
  };
  const rmComp = (i: number) => setCompetencias(competencias.filter((_, idx) => idx !== i));
  const moveComp = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= competencias.length) return;
    const next = [...competencias];
    [next[i], next[j]] = [next[j], next[i]];
    setCompetencias(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
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
            missao: missao || null,
            formacao_minima: formacaoMinima || null,
            formacao_desejavel: formacaoDesejavel || null,
            competencias: competencias.filter((c) => c.trim()),
          })
          .eq("id", existing.id);
        if (error) throw error;
        descricaoId = existing.id;
      } else {
        const { data: ins, error } = await supabase
          .from("descricao_cargo")
          .insert({
            colaborador_id: colaboradorId,
            missao: missao || null,
            formacao_minima: formacaoMinima || null,
            formacao_desejavel: formacaoDesejavel || null,
            competencias: competencias.filter((c) => c.trim()),
          })
          .select("id")
          .single();
        if (error) throw error;
        descricaoId = ins.id;
      }

      // Replace responsabilidades: flatten groups -> rows
      await supabase.from("descricao_cargo_responsabilidades").delete().eq("descricao_cargo_id", descricaoId);

      const flat = fromGroups(
        groups
          .map((g) => ({
            processo: g.processo.trim(),
            itens: g.itens.map((i) => i.trim()).filter((i) => i),
          }))
          .filter((g) => g.processo && g.itens.length > 0)
      );

      const rows = flat.map((r, idx) => ({
        descricao_cargo_id: descricaoId,
        processo: r.processo,
        responsabilidade: r.responsabilidade,
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
            <Textarea rows={4} value={missao} onChange={(e) => setMissao(e.target.value)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Processos e Responsabilidades</Label>
              <Button type="button" size="sm" variant="outline" onClick={addGroup}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar processo
              </Button>
            </div>
            <div className="space-y-4">
              {groups.map((g, gi) => (
                <div key={gi} className="border rounded-md p-3 space-y-3 bg-muted/30">
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground">Processo</Label>
                      <Input
                        placeholder="Nome do processo"
                        value={g.processo}
                        onChange={(e) => updGroupName(gi, e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1 pt-5">
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveGroup(gi, -1)}><ArrowUp className="h-3 w-3" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveGroup(gi, 1)}><ArrowDown className="h-3 w-3" /></Button>
                      <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => rmGroup(gi)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>

                  <div className="pl-3 border-l-2 border-primary/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">Principais Responsabilidades</Label>
                      <Button type="button" size="sm" variant="ghost" onClick={() => addItem(gi)}>
                        <Plus className="mr-1 h-3 w-3" /> Adicionar item
                      </Button>
                    </div>
                    {g.itens.map((item, ii) => (
                      <div key={ii} className="flex items-start gap-2">
                        <span className="text-xs text-muted-foreground pt-2 w-5">{ii + 1}.</span>
                        <Textarea
                          rows={2}
                          placeholder="Descrição da responsabilidade"
                          value={item}
                          onChange={(e) => updItem(gi, ii, e.target.value)}
                          className="flex-1"
                        />
                        <div className="flex flex-col gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveItem(gi, ii, -1)}><ArrowUp className="h-3 w-3" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveItem(gi, ii, 1)}><ArrowDown className="h-3 w-3" /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => rmItem(gi, ii)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    ))}
                    {g.itens.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nenhuma responsabilidade neste processo.</p>
                    )}
                  </div>
                </div>
              ))}
              {groups.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Nenhum processo cadastrado.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Formação acadêmica mínima</Label>
              <Textarea rows={2} value={formacaoMinima} onChange={(e) => setFormacaoMinima(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Formação acadêmica desejável</Label>
              <Textarea rows={2} value={formacaoDesejavel} onChange={(e) => setFormacaoDesejavel(e.target.value)} />
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
              {competencias.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                  <Input value={c} onChange={(e) => updComp(i, e.target.value)} />
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rmComp(i)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
              {competencias.length === 0 && (
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
