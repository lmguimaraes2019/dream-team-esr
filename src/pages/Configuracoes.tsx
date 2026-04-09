import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Tables } from "@/integrations/supabase/types";

type Encargo = Tables<"configuracoes_encargos">;

export default function Configuracoes() {
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [nome, setNome] = useState("");
  const [taxa, setTaxa] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  // User management
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
    const taxaNum = parseFloat(taxa) / 100;
    if (!nome || isNaN(taxaNum)) return;

    if (editId) {
      await supabase
        .from("configuracoes_encargos")
        .update({ nome, taxa: taxaNum })
        .eq("id", editId);
    } else {
      await supabase.from("configuracoes_encargos").insert({ nome, taxa: taxaNum });
    }

    setNome("");
    setTaxa("");
    setEditId(null);
    loadEncargos();
    toast({ title: "Encargo salvo!" });
  };

  const handleEditEncargo = (e: Encargo) => {
    setEditId(e.id);
    setNome(e.nome);
    setTaxa(String(Number(e.taxa) * 100));
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

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Configurações</h1>

      {/* Encargos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Taxas de Encargos</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 items-end">
            <div className="space-y-2 flex-1">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: INSS Patronal" />
            </div>
            <div className="space-y-2 w-32">
              <Label>Taxa (%)</Label>
              <Input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(e.target.value)} placeholder="20" />
            </div>
            <Button onClick={handleSaveEncargo}>
              {editId ? "Atualizar" : "Adicionar"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {encargos.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.nome}</TableCell>
                  <TableCell>{(Number(e.taxa) * 100).toFixed(2)}%</TableCell>
                  <TableCell>{new Date(e.data_vigencia).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleEditEncargo(e)}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Users */}
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
