import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import TabelaSalarialImport from "@/components/TabelaSalarialImport";
import OrigensRecursoConfig from "@/components/OrigensRecursoConfig";

export default function Configuracoes() {
  const [encargos, setEncargos] = useState<any[]>([]);
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState("");
  const [tipo, setTipo] = useState("taxa");
  const [editId, setEditId] = useState<string | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const { toast } = useToast();

  const loadEncargos = async () => {
    const { data } = await supabase.from("configuracoes_encargos").select("*").order("nome");
    setEncargos(data || []);
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: roles } = await supabase.from("user_roles").select("*");
    const merged = (profiles || []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.user_id)?.role || "leitura",
      roleId: roles?.find((r) => r.user_id === p.user_id)?.id,
    }));
    setUsers(merged);
  };

  useEffect(() => {
    loadEncargos();
    loadUsers();
  }, []);

  const handleSaveEncargo = async () => {
    if (!nome) return;
    // For "taxa" type, user enters percentage (e.g. 25.5 → stored as 0.255)
    // For "valor" type, user enters the value directly (e.g. 1069.77)
    let valorFinal: number;
    if (tipo === "taxa") {
      valorFinal = parseFloat(taxa) / 100;
    } else {
      valorFinal = parseFloat(taxa);
    }
    if (isNaN(valorFinal)) return;

    if (editId) {
      await supabase
        .from("configuracoes_encargos")
        .update({ nome, taxa: valorFinal, tipo } as any)
        .eq("id", editId);
    } else {
      await supabase.from("configuracoes_encargos").insert({ nome, taxa: valorFinal, tipo } as any);
    }

    setNome("");
    setTaxa("");
    setTipo("taxa");
    setEditId(null);
    loadEncargos();
    toast({ title: "Parâmetro salvo!" });
  };

  const handleEdit = (e: any) => {
    setEditId(e.id);
    setNome(e.nome);
    setTipo(e.tipo || "taxa");
    if (e.tipo === "valor") {
      setTaxa(String(Number(e.taxa)));
    } else {
      setTaxa(String(Number(e.taxa) * 100));
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole as any })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado!" });
      loadUsers();
    }
  };

  const formatDisplay = (e: any) => {
    if (e.tipo === "valor") {
      return Number(e.taxa).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    }
    return `${(Number(e.taxa) * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "")}%`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Custos mensais, encargos e benefícios</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: INSS" />
            </div>
            <div className="space-y-2 w-28">
              <Label>Tipo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="taxa">Taxa (%)</SelectItem>
                  <SelectItem value="valor">Valor (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-32">
              <Label>{tipo === "taxa" ? "Taxa (%)" : "Valor (R$)"}</Label>
              <Input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder={tipo === "taxa" ? "25.5" : "1069.77"} />
            </div>
            <Button onClick={handleSaveEncargo}>
              {editId ? "Atualizar" : "Adicionar"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parâmetro</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encargos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{e.tipo === "valor" ? "Fixo" : "Taxa"}</Badge>
                  </TableCell>
                  <TableCell>{formatDisplay(e)}</TableCell>
                  <TableCell>{new Date(e.data_vigencia).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(e)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tabela Salarial</CardTitle></CardHeader>
        <CardContent>
          <TabelaSalarialImport />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Origens de Recurso</CardTitle></CardHeader>
        <CardContent>
          <OrigensRecursoConfig />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Usuários e Perfis</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.display_name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(v) => handleChangeRole(u.user_id, v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="leitura">Leitura</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
