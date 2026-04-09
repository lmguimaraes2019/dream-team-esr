import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Constants } from "@/integrations/supabase/types";
import type { Tables } from "@/integrations/supabase/types";

type Colaborador = Tables<"colaboradores">;

interface Props {
  colaborador: Colaborador;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function ColaboradorEditDialog({ colaborador, open, onOpenChange, onSaved }: Props) {
  const [form, setForm] = useState({ ...colaborador });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("colaboradores")
      .update({
        nome: form.nome,
        matricula: form.matricula,
        genero: form.genero,
        lideranca: form.lideranca,
        data_admissao: form.data_admissao,
        gerencia: form.gerencia,
        diretoria: form.diretoria,
        cargo: form.cargo,
        trajetoria: form.trajetoria,
        nivel_complexidade: form.nivel_complexidade,
        grupo: form.grupo,
        tipo_vinculo: form.tipo_vinculo,
        ativo: form.ativo,
      })
      .eq("id", colaborador.id);

    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Colaborador atualizado!" });
      onOpenChange(false);
      onSaved();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Matrícula *</Label>
            <Input required value={form.matricula} onChange={(e) => setForm({ ...form, matricula: e.target.value })} />
          </div>
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
            <Input type="date" required value={form.data_admissao} onChange={(e) => setForm({ ...form, data_admissao: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Gerência *</Label>
            <Input required value={form.gerencia} onChange={(e) => setForm({ ...form, gerencia: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Diretoria *</Label>
            <Input required value={form.diretoria} onChange={(e) => setForm({ ...form, diretoria: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Cargo *</Label>
            <Input required value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Trajetória *</Label>
            <Input required value={form.trajetoria} onChange={(e) => setForm({ ...form, trajetoria: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={form.nivel_complexidade} onValueChange={(v: any) => setForm({ ...form, nivel_complexidade: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Constants.public.Enums.nivel_complexidade.map((n) => (
                  <SelectItem key={n} value={n}>{n.charAt(0).toUpperCase() + n.slice(1)}</SelectItem>
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
          <div className="flex items-center gap-2 pt-6">
            <input type="checkbox" checked={form.lideranca} onChange={(e) => setForm({ ...form, lideranca: e.target.checked })} className="h-4 w-4" />
            <Label>Liderança</Label>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} className="h-4 w-4" />
            <Label>Ativo</Label>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
