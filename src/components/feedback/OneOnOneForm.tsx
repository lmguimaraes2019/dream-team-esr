import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface OneOnOne {
  id: string;
  colaborador_id: string;
  gestor_id: string;
  data: string;
  status: string;
  pauta: string | null;
  resumo: string;
  pontos_positivos: string | null;
  pontos_atencao: string | null;
  riscos: string | null;
  proximos_passos: string | null;
  confidencial: boolean;
}

interface Props {
  colaboradorId: string;
  existing?: OneOnOne | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export default function OneOnOneForm({ colaboradorId, existing, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState<string>("realizado");
  const [pauta, setPauta] = useState("");
  const [resumo, setResumo] = useState("");
  const [pontosPositivos, setPontosPositivos] = useState("");
  const [pontosAtencao, setPontosAtencao] = useState("");
  const [riscos, setRiscos] = useState("");
  const [proximosPassos, setProximosPassos] = useState("");
  const [confidencial, setConfidencial] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setData(existing.data);
      setStatus(existing.status);
      setPauta(existing.pauta || "");
      setResumo(existing.resumo);
      setPontosPositivos(existing.pontos_positivos || "");
      setPontosAtencao(existing.pontos_atencao || "");
      setRiscos(existing.riscos || "");
      setProximosPassos(existing.proximos_passos || "");
      setConfidencial(existing.confidencial);
    } else {
      setData(new Date().toISOString().split("T")[0]);
      setStatus("realizado");
      setPauta("");
      setResumo("");
      setPontosPositivos("");
      setPontosAtencao("");
      setRiscos("");
      setProximosPassos("");
      setConfidencial(false);
    }
  }, [existing, open]);

  const handleSave = async () => {
    if (!resumo.trim()) {
      toast({ title: "Resumo é obrigatório", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      colaborador_id: colaboradorId,
      gestor_id: user!.id,
      data,
      status: status as any,
      pauta: pauta || null,
      resumo,
      pontos_positivos: pontosPositivos || null,
      pontos_atencao: pontosAtencao || null,
      riscos: riscos || null,
      proximos_passos: proximosPassos || null,
      confidencial,
    };

    const { error } = existing
      ? await supabase.from("one_on_one").update(payload).eq("id", existing.id)
      : await supabase.from("one_on_one").insert(payload);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: existing ? "1:1 atualizado!" : "1:1 registrado!" });
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Editar 1:1" : "Novo 1:1"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planejado">Planejado</SelectItem>
                  <SelectItem value="realizado">Realizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Pauta</Label>
            <Textarea value={pauta} onChange={(e) => setPauta(e.target.value)} rows={2} placeholder="Tópicos discutidos..." />
          </div>
          <div>
            <Label>Resumo *</Label>
            <Textarea value={resumo} onChange={(e) => setResumo(e.target.value)} rows={3} placeholder="Resumo da reunião (obrigatório)" />
          </div>
          <div>
            <Label>Pontos Positivos</Label>
            <Textarea value={pontosPositivos} onChange={(e) => setPontosPositivos(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Pontos de Atenção</Label>
            <Textarea value={pontosAtencao} onChange={(e) => setPontosAtencao(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Riscos</Label>
            <Textarea value={riscos} onChange={(e) => setRiscos(e.target.value)} rows={2} />
          </div>
          <div>
            <Label>Próximos Passos</Label>
            <Textarea value={proximosPassos} onChange={(e) => setProximosPassos(e.target.value)} rows={2} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={confidencial} onCheckedChange={setConfidencial} />
            <Label>Confidencial</Label>
          </div>
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : existing ? "Atualizar" : "Registrar 1:1"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
