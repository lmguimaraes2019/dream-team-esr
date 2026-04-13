import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

interface ParsedColab {
  matricula: string;
  nome: string;
  colaborador_id?: string;
  matched: boolean;
  movimentacoes: {
    data: string;
    tipo_movimentacao: string;
    cargo: string | null;
    salario: number | null;
  }[];
}

function parseDate(val: any): string | null {
  if (!val) return null;
  const s = String(val).trim();
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  // Excel serial
  if (typeof val === "number" && val > 30000 && val < 60000) {
    const d = new Date((val - 25569) * 86400000);
    return d.toISOString().split("T")[0];
  }
  return null;
}

function isHeaderRow(colA: any): boolean {
  if (colA == null) return false;
  const s = String(colA).trim();
  // Matricula: short numeric string like "000044"
  if (/^\d{1,8}$/.test(s) && !s.includes("/")) {
    const n = parseInt(s, 10);
    return n < 999999;
  }
  return false;
}

export default function MovimentacoesCarreiraImport() {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [preview, setPreview] = useState<ParsedColab[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isAdmin) return <p className="text-sm text-muted-foreground">Apenas administradores podem importar.</p>;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

    // Skip header row (row 0)
    const dataRows = rows.slice(1);

    // Parse into grouped structure
    const colabs: ParsedColab[] = [];
    let current: ParsedColab | null = null;

    for (const row of dataRows) {
      const colA = row[0];
      if (colA == null && !row[1]) continue;

      if (isHeaderRow(colA)) {
        current = {
          matricula: String(colA).trim().replace(/^0+/, ""),
          nome: String(row[1] || "").trim(),
          matched: false,
          movimentacoes: [],
        };
        colabs.push(current);
      } else if (current) {
        const date = parseDate(colA);
        if (date) {
          current.movimentacoes.push({
            data: date,
            tipo_movimentacao: String(row[1] || "").trim(),
            cargo: row[3] ? String(row[3]).trim() : null,
            salario: typeof row[4] === "number" ? row[4] : null,
          });
        }
      }
    }

    // Match by matricula
    const { data: dbColabs } = await supabase
      .from("colaboradores")
      .select("id, matricula, nome")
      .eq("ativo", true);

    for (const c of colabs) {
      const match = (dbColabs || []).find(
        (db) => db.matricula && db.matricula.replace(/^0+/, "") === c.matricula
      );
      if (match) {
        c.colaborador_id = match.id;
        c.matched = true;
      }
    }

    setPreview(colabs);
    e.target.value = "";
  };

  const handleConfirm = async () => {
    setLoading(true);
    const matched = preview.filter((c) => c.matched && c.colaborador_id);
    let total = 0;

    for (const c of matched) {
      for (const mov of c.movimentacoes) {
        const { error } = await supabase
          .from("movimentacoes_carreira" as any)
          .upsert(
            {
              colaborador_id: c.colaborador_id,
              data: mov.data,
              tipo_movimentacao: mov.tipo_movimentacao,
              cargo: mov.cargo,
              salario: mov.salario,
            } as any,
            { onConflict: "colaborador_id,data,tipo_movimentacao" }
          );
        if (!error) total++;
      }
    }

    toast({ title: `${total} movimentações importadas com sucesso!` });
    setPreview([]);
    setLoading(false);
  };

  const handleClear = async () => {
    setLoading(true);
    await supabase.from("movimentacoes_carreira" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    toast({ title: "Movimentações excluídas!" });
    setLoading(false);
  };

  const totalMov = preview.reduce((s, c) => s + c.movimentacoes.length, 0);
  const matchedCount = preview.filter((c) => c.matched).length;

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center flex-wrap">
        <label className="cursor-pointer">
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <Button variant="outline" asChild>
            <span><Upload className="mr-2 h-4 w-4" />Carregar Planilha</span>
          </Button>
        </label>
        <Button variant="destructive" size="sm" onClick={handleClear} disabled={loading}>
          <Trash2 className="mr-2 h-4 w-4" />Limpar Tudo
        </Button>
      </div>

      {preview.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            {preview.length} colaboradores encontrados ({matchedCount} com match), {totalMov} movimentações.
          </p>
          <div className="max-h-[400px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Movimentações</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((c, i) => (
                  <TableRow key={i}>
                    <TableCell>{c.matricula}</TableCell>
                    <TableCell>{c.nome}</TableCell>
                    <TableCell>{c.movimentacoes.length}</TableCell>
                    <TableCell>
                      <Badge variant={c.matched ? "default" : "destructive"}>
                        {c.matched ? "OK" : "Não encontrado"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button onClick={handleConfirm} disabled={loading || matchedCount === 0}>
            Confirmar Importação ({matchedCount} colaboradores)
          </Button>
        </>
      )}
    </div>
  );
}
