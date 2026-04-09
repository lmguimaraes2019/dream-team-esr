import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FaixaRow {
  trajetoria: string;
  nivel_complexidade: string;
  grupo: number;
  faixa_inicio: number;
  faixa_fim: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Normalize nivel from PDF text to DB enum value */
function normalizeNivelSalarial(nivel: string): string {
  const n = nivel.trim().toUpperCase();
  const map: Record<string, string> = {
    "ASSISTENTE": "assistente",
    "JUNIOR": "junior",
    "PLENO": "pleno",
    "SENIOR": "senior",
    "ESPECIALISTA I": "especialista",
    "ESPECIALISTA II": "master",
    "ESPECIALISTA": "especialista",
    "MASTER": "master",
    "GERENTE 01": "gerente_01",
    "GERENTE 02": "gerente_02",
    "GERENTE 03": "gerente_03",
  };
  return map[n] || nivel.toLowerCase();
}

function normalizeTrajetoria(t: string): string {
  const n = t.trim().toUpperCase();
  const map: Record<string, string> = {
    "GESTAO DO NEGOCIO": "Gestão do Negócio",
    "GESTÃO DO NEGÓCIO": "Gestão do Negócio",
    "LIDERANCA": "Liderança",
    "LIDERANÇA": "Liderança",
    "RELACIONAMENTO": "Relacionamento",
    "TECNOLOGICA": "Tecnológica",
    "TECNOLÓGICA": "Tecnológica",
  };
  return map[n] || t.trim();
}

function parseMoneyBR(s: string): number {
  // Extract number from strings like "GRUPO 01 3.094,37" or "R$ 4.641,55"
  const cleaned = s.replace(/R\$\s*/g, "").replace(/GRUPO\s*\d+\s*/gi, "").trim();
  // Convert BR format: 3.094,37 → 3094.37
  const num = cleaned.replace(/\./g, "").replace(",", ".");
  return parseFloat(num) || 0;
}

export default function TabelaSalarialImport() {
  const [faixas, setFaixas] = useState<FaixaRow[]>([]);
  const [saved, setSaved] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const loadSaved = async () => {
    const { data } = await supabase
      .from("tabela_salarial")
      .select("*")
      .order("trajetoria")
      .order("nivel_complexidade")
      .order("grupo") as any;
    setSaved(data || []);
  };

  useEffect(() => {
    loadSaved();
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      const parsed: FaixaRow[] = [];

      // Find header row
      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const vals = (rawRows[i] || []).map((v: any) => String(v || "").toUpperCase().trim());
        if (vals.some(v => v.includes("TRAJET")) && vals.some(v => v.includes("NIVEL") || v.includes("NÍVEL"))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        toast({ title: "Cabeçalho não encontrado", description: "A tabela deve conter colunas TRAJETÓRIA e NÍVEL.", variant: "destructive" });
        return;
      }

      const dataRows = rawRows.slice(headerIdx + 1);

      for (const row of dataRows) {
        if (!row || row.length < 4) continue;
        const trajetoria = String(row[0] || "").trim();
        const nivel = String(row[1] || "").trim();
        if (!trajetoria || !nivel) continue;

        // The PDF has GRUPO embedded in columns 3 and 4
        // Column 3: "GRUPO 01 3.094,37" → inicio
        // Column 4: "R$ 4.641,55\nR$" → fim
        const col3 = String(row[3] || row[2] || "");
        const col4 = String(row[4] || row[3] || "");

        // Extract grupo from col3
        const grupoMatch = col3.match(/GRUPO\s*(\d+)/i);
        const grupo = grupoMatch ? parseInt(grupoMatch[1]) : 1;

        const inicio = parseMoneyBR(col3);
        const fim = parseMoneyBR(col4);

        if (inicio > 0 && fim > 0) {
          parsed.push({
            trajetoria: normalizeTrajetoria(trajetoria),
            nivel_complexidade: normalizeNivelSalarial(nivel),
            grupo,
            faixa_inicio: inicio,
            faixa_fim: fim,
          });
        }
      }

      if (parsed.length === 0) {
        toast({ title: "Nenhuma faixa encontrada", variant: "destructive" });
        return;
      }

      setFaixas(parsed);
      toast({ title: `${parsed.length} faixas encontradas` });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSave = async () => {
    if (faixas.length === 0) return;

    // Delete existing and insert new
    await supabase.from("tabela_salarial").delete().neq("id", "00000000-0000-0000-0000-000000000000") as any;

    const { error } = await supabase.from("tabela_salarial").insert(
      faixas.map(f => ({
        trajetoria: f.trajetoria,
        nivel_complexidade: f.nivel_complexidade,
        grupo: f.grupo,
        faixa_inicio: f.faixa_inicio,
        faixa_fim: f.faixa_fim,
      })) as any
    );

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Tabela salarial salva!", description: `${faixas.length} faixas importadas.` });
      setFaixas([]);
      loadSaved();
    }
  };

  const handleClear = async () => {
    if (!confirm("Excluir toda a tabela salarial?")) return;
    await supabase.from("tabela_salarial").delete().neq("id", "00000000-0000-0000-0000-000000000000") as any;
    toast({ title: "Tabela salarial excluída" });
    loadSaved();
  };

  const nivelLabel = (v: string) => {
    const map: Record<string, string> = {
      assistente: "Assistente", junior: "Junior", pleno: "Pleno",
      senior: "Senior", especialista: "Especialista I", master: "Especialista II",
      gerente_01: "Gerente 01", gerente_02: "Gerente 02", gerente_03: "Gerente 03",
    };
    return map[v] || v;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="space-y-2 flex-1 min-w-[200px]">
          <Label>Arquivo da Tabela Salarial (XLSX, XLS ou CSV)</Label>
          <Input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} />
        </div>
        {faixas.length > 0 && (
          <Button onClick={handleSave}>
            <Upload className="mr-2 h-4 w-4" />Salvar {faixas.length} faixas
          </Button>
        )}
        {saved.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="mr-2 h-4 w-4" />Limpar tabela
          </Button>
        )}
      </div>

      {/* Preview or saved data */}
      {(faixas.length > 0 || saved.length > 0) && (
        <div className="overflow-auto max-h-72">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Trajetória</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Início (80%)</TableHead>
                <TableHead>Fim (120%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(faixas.length > 0 ? faixas : saved).map((f, i) => (
                <TableRow key={i}>
                  <TableCell>{f.trajetoria}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{nivelLabel(f.nivel_complexidade)}</Badge>
                  </TableCell>
                  <TableCell>{f.grupo}</TableCell>
                  <TableCell>{fmt(Number(f.faixa_inicio))}</TableCell>
                  <TableCell>{fmt(Number(f.faixa_fim))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {saved.length === 0 && faixas.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">Nenhuma tabela salarial importada.</p>
      )}
    </div>
  );
}
