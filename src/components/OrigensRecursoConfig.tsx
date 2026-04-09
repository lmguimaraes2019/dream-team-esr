import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

export default function OrigensRecursoConfig() {
  const [origens, setOrigens] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const { toast } = useToast();

  const load = async () => {
    const { data } = await supabase.from("origens_recurso").select("*").order("nome");
    setOrigens(data || []);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!nome.trim()) return;
    const { error } = await supabase.from("origens_recurso").insert({ nome: nome.trim() } as any);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setNome("");
      load();
      toast({ title: "Origem adicionada!" });
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("origens_recurso").delete().eq("id", id);
    load();
    toast({ title: "Origem removida!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <Input
          placeholder="Ex: Orçamento próprio"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="max-w-sm"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <Button onClick={handleAdd}>Adicionar</Button>
      </div>
      {origens.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {origens.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{o.nome}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(o.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
