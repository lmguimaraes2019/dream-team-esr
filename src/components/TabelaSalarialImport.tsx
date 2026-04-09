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
  const cleaned = s.replace(/R\$\s*/g, "").replace(/GRUPO\s*\d+\s*/gi, "").trim();
  const num = cleaned.replace(/\./g, "").replace(",", ".");
  return parseFloat(num) || 0;
}

function parseRowsFromSheet(rawRows: any[][]): FaixaRow[] {
  const parsed: FaixaRow[] = [];

  let headerIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const vals = (rawRows[i] || []).map((v: any) => String(v || "").toUpperCase().trim());
    if (vals.some(v => v.includes("TRAJET")) && vals.some(v => v.includes("NIVEL") || v.includes("NÍVEL"))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx === -1) return [];

  const dataRows = rawRows.slice(headerIdx + 1);

  for (const row of dataRows) {
    if (!row || row.length < 4) continue;
    const trajetoria = String(row[0] || "").trim();
    const nivel = String(row[1] || "").trim();
    if (!trajetoria || !nivel) continue;

    const col3 = String(row[3] || row[2] || "");
    const col4 = String(row[4] || row[3] || "");

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

  return parsed;
}

async function parsePdf(buffer: ArrayBuffer): Promise<FaixaRow[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  const parsed: FaixaRow[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    
    // Group text items by Y position (same row)
    const rows: Map<number, { x: number; str: string }[]> = new Map();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round((item as any).transform[5]);
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y)!.push({ x: (item as any).transform[4], str: item.str.trim() });
    }

    // Sort rows by Y descending (PDF coords), items by X ascending
    const sortedRows = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) => items.sort((a, b) => a.x - b.x).map(i => i.str));

    // Parse each text row looking for salary table patterns
    for (const textParts of sortedRows) {
      const line = textParts.join(" ");
      
      // Match pattern: TRAJETORIA NIVEL GRUPO NN VALOR VALOR
      const trajetorias = ["GESTAO DO NEGOCIO", "GESTÃO DO NEGÓCIO", "LIDERANCA", "LIDERANÇA", "RELACIONAMENTO", "TECNOLOGICA", "TECNOLÓGICA"];
      const niveis = ["ASSISTENTE", "JUNIOR", "PLENO", "SENIOR", "ESPECIALISTA I", "ESPECIALISTA II", "GERENTE 01", "GERENTE 02", "GERENTE 03"];
      
      let foundTraj = "";
      let foundNivel = "";
      const upper = line.toUpperCase();

      for (const t of trajetorias) {
        if (upper.includes(t)) { foundTraj = t; break; }
      }
      // Check longer nivel names first
      for (const n of niveis) {
        if (upper.includes(n)) { foundNivel = n; break; }
      }

      if (!foundTraj || !foundNivel) continue;

      const grupoMatch = line.match(/GRUPO\s*(\d+)/i);
      const grupo = grupoMatch ? parseInt(grupoMatch[1]) : 1;

      // Find money values (Brazilian format: 1.234,56)
      const moneyPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
      const moneyValues: number[] = [];
      let m;
      while ((m = moneyPattern.exec(line)) !== null) {
        moneyValues.push(parseFloat(m[1].replace(/\./g, "").replace(",", ".")));
      }

      if (moneyValues.length >= 2) {
        parsed.push({
          trajetoria: normalizeTrajetoria(foundTraj),
          nivel_complexidade: normalizeNivelSalarial(foundNivel),
          grupo,
          faixa_inicio: moneyValues[0],
          faixa_fim: moneyValues[1],
        });
      }
    }
  }

  return parsed;
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

  useEffect(() => { loadSaved(); }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();
    let parsed: FaixaRow[] = [];

    if (ext === "pdf") {
      try {
        parsed = await parsePdf(buffer);
      } catch (err: any) {
        toast({ title: "Erro ao ler PDF", description: err.message, variant: "destructive" });
        return;
      }
    } else {
      // XLSX, XLS, CSV
      const data = new Uint8Array(buffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
      parsed = parseRowsFromSheet(rawRows);

      if (parsed.length === 0) {
        toast({ title: "Cabeçalho não encontrado", description: "A tabela deve conter colunas TRAJETÓRIA e NÍVEL.", variant: "destructive" });
        return;
      }
    }

    if (parsed.length === 0) {
      toast({ title: "Nenhuma faixa encontrada", variant: "destructive" });
      return;
    }

    setFaixas(parsed);
    toast({ title: `${parsed.length} faixas encontradas` });
  };

  const handleSave = async () => {
    if (faixas.length === 0) return;
    // Delete all existing rows first, then insert
    const { error: delError } = await supabase.from("tabela_salarial").delete().neq("id", "00000000-0000-0000-0000-000000000000") as any;
    if (delError) {
      toast({ title: "Erro ao limpar tabela", description: delError.message, variant: "destructive" });
      return;
    }
    // Deduplicate by trajetoria+nivel+grupo (keep last)
    const unique = new Map<string, FaixaRow>();
    for (const f of faixas) {
      unique.set(`${f.trajetoria}|${f.nivel_complexidade}|${f.grupo}`, f);
    }
    const deduped = [...unique.values()];
    const { error } = await supabase.from("tabela_salarial").insert(
      deduped.map(f => ({
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
      toast({ title: "Tabela salarial salva!", description: `${deduped.length} faixas importadas.` });
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
          <Label>Arquivo da Tabela Salarial (PDF, XLSX, XLS ou CSV)</Label>
          <Input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={handleFile} />
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
