import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AcaoDev {
  id: string;
  colaborador_id: string;
  origem_tipo: string | null;
  origem_id: string | null;
  descricao: string;
  tipo: string;
  prazo: string | null;
  status: string;
  evidencia: string | null;
}

interface Props {
  colaboradorId: string;
  origemTipo?: "one_on_one" | "feedback" | null;
  origemId?: string | null;
  existing?: AcaoDev | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export default function AcaoDesenvolvimentoForm({ colaboradorId, origemTipo, origemId, existing, open, onOpenChange, onSaved }: Props) {
  const { toast } = useToast();
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<string>("pratica");
  const [prazo, setPrazo] = useState("");
  const [statusAcao, setStatusAcao] = useState<string>("pendente");
  const [evidencia, setEvidencia] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setDescricao(existing.descricao);
      setTipo(existing.tipo);
      setPrazo(existing.prazo || "");
      setStatusAcao(existing.status);
      setEvidencia(existing.evidencia || "");
    } else {
      setDescricao("");
      setTipo("pratica");
      setPrazo("");
      setStatusAcao("pendente");
      setEvidencia("");
    }
  }, [existing, open]);

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast({ title: "Descrição é obrigatória", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      colaborador_id: colaboradorId,
      origem_tipo: (origemTipo || existing?.origem_tipo || null) as any,
      origem_id: origemId || existing?.origem_id || null,
      descricao,
      tipo: tipo as any,
      prazo: prazo || null,
      status: statusAcao as any,
      evidencia: evidencia || null,
    };

    const { error } = existing
      ? await supabase.from("desenvolvimento_acoes").update(payload).eq("id", existing.id)
      : await supabase.from("desenvolvimento_acoes").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: existing ? "Ação atualizada!" : "Ação criada!" });
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar Ação" : "Nova Ação de Desenvolvimento"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} placeholder="O que precisa ser feito?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="curso">Curso</SelectItem>
                  <SelectItem value="pratica">Prática</SelectItem>
                  <SelectItem value="comportamento">Comportamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusAcao} onValueChange={setStatusAcao}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Prazo</Label>
            <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
          </div>
          <div>
            <Label>Evidência</Label>
            <Input value={evidencia} onChange={(e) => setEvidencia(e.target.value)} placeholder="Link ou descrição da evidência" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : existing ? "Atualizar" : "Criar Ação"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
