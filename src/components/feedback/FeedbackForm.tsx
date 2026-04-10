import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  colaboradorId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}

export default function FeedbackForm({ colaboradorId, open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tipo, setTipo] = useState<string>("positivo");
  const [descricao, setDescricao] = useState("");
  const [contexto, setContexto] = useState("");
  const [impacto, setImpacto] = useState("");
  const [sugestao, setSugestao] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTipo("positivo");
    setDescricao("");
    setContexto("");
    setImpacto("");
    setSugestao("");
    setDetailsOpen(false);
  };

  const handleSave = async () => {
    if (!descricao.trim()) {
      toast({ title: "Descrição é obrigatória", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("feedback").insert({
      colaborador_id: colaboradorId,
      autor_id: user!.id,
      tipo: tipo as any,
      descricao,
      contexto: contexto || null,
      impacto: impacto || null,
      sugestao_melhoria: sugestao || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Feedback registrado!" });
      reset();
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="positivo">Positivo</SelectItem>
                <SelectItem value="construtivo">Construtivo</SelectItem>
                <SelectItem value="reconhecimento">Reconhecimento</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o feedback..." rows={3} />
          </div>

          <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                Campos adicionais
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div>
                <Label>Contexto</Label>
                <Input value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Em qual situação?" />
              </div>
              <div>
                <Label>Impacto</Label>
                <Input value={impacto} onChange={(e) => setImpacto(e.target.value)} placeholder="Qual foi o impacto?" />
              </div>
              <div>
                <Label>Sugestão de melhoria</Label>
                <Textarea value={sugestao} onChange={(e) => setSugestao(e.target.value)} rows={2} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Salvando..." : "Registrar Feedback"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
