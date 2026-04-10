import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportRow {
  nome: string;
  matricula?: string;
  periodo_aquisitivo_inicio?: string;
  periodo_aquisitivo_fim?: string;
  data_inicio: string;
  data_fim: string;
  dias?: number;
  abono_pecuniario?: boolean;
  dias_abono?: number;
  decimo_terceiro_antecipado?: boolean;
  matched?: boolean;
  colaborador_id?: string;
  periodo_aquisitivo_id?: string;
}

export default function ImportacaoTab() {
  const [colaboradores, setColaboradores] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<ImportRow[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const { isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    supabase.from("colaboradores").select("id, nome, matricula").eq("ativo", true).order("nome").then(({ data }) => setColaboradores(data || []));
  }, []);

  const parseExcelDate = (val: any): string => {
    if (!val) return "";
    if (typeof val === "number") {
      const d = XLSX.SSF.parse_date_code(val);
      if (d) return `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const str = String(val).trim();
    const ddmmyyyy = str.match(/^(\d{2})[/\-.](\d{2})[/\-.](\d{4})$/);
    if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
    const yyyymmdd = str.match(/^(\d{4})[/\-.](\d{2})[/\-.](\d{2})$/);
    if (yyyymmdd) return `${yyyymmdd[1]}-${yyyymmdd[2]}-${yyyymmdd[3]}`;
    return str;
  };

  const parseBool = (val: any): boolean => {
    if (!val) return false;
    const s = String(val).trim().toLowerCase();
    return ["sim", "s", "yes", "y", "true", "1", "x"].includes(s);
  };

  const downloadTemplate = () => {
    const headers = [
      "Nome", "Matrícula", "Período Aquisitivo (início a fim)",
      "1º Período Início", "1º Período Fim", "1º Período Dias",
      "2º Período Início", "2º Período Fim", "2º Período Dias",
      "3º Período Início", "3º Período Fim", "3º Período Dias",
      "Abono Pecuniário", "Dias de Abono", "13º Antecipado"
    ];
    const example = [
      "João da Silva", "12345", "01/01/2024 a 31/12/2024",
      "01/02/2025", "20/02/2025", 20,
      "01/07/2025", "10/07/2025", 10,
      "", "", "",
      "Sim", 10, "Não"
    ];
    const ws = XLSX.utils.aoa_to_sheet([headers, example]);
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Férias");
    XLSX.writeFile(wb, "modelo_importacao_ferias.xlsx");
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab, { cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

    if (raw.length === 0) { toast({ title: "Planilha vazia", variant: "destructive" }); return; }

    const findCol = (headers: string[], patterns: string[]) =>
      headers.find((h) => patterns.some((p) => h.toLowerCase().includes(p.toLowerCase())));

    const headers = Object.keys(raw[0]);
    const colNome = findCol(headers, ["nome", "colaborador"]);
    const colMat = findCol(headers, ["matrícula", "matricula"]);
    const colPAInicio = findCol(headers, ["período aquisitivo", "per. aquisitivo", "aquisitivo"]);
    const colAbono = findCol(headers, ["abono"]);
    const colDiasAbono = findCol(headers, ["dias abono", "dias de abono"]);
    const col13 = findCol(headers, ["13", "décimo", "decimo"]);

    const periodCols: { inicio: string; fim: string; dias?: string }[] = [];
    for (let i = 1; i <= 3; i++) {
      const prefix = `${i}º`;
      const inicioCol = headers.find((h) => h.includes(prefix) && (h.toLowerCase().includes("início") || h.toLowerCase().includes("inicio")));
      const fimCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("fim"));
      const diasCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("dia"));
      if (inicioCol && fimCol) periodCols.push({ inicio: inicioCol, fim: fimCol, dias: diasCol });
    }

    if (periodCols.length === 0) {
      const colInicio = findCol(headers, ["data início", "data inicio", "início", "inicio"]);
      const colFim = findCol(headers, ["data fim", "fim"]);
      const colDias = findCol(headers, ["dias"]);
      if (colInicio && colFim) periodCols.push({ inicio: colInicio, fim: colFim, dias: colDias });
    }

    if (!colNome || periodCols.length === 0) {
      toast({ title: "Não foi possível identificar as colunas", variant: "destructive" });
      return;
    }

    const parsePeriodoAquisitivo = (val: any): { inicio: string; fim: string } | null => {
      if (!val) return null;
      const str = String(val).trim();
      const match = str.match(/(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})\s*(?:a|à|-)\s*(\d{2}[/\-\.]\d{2}[/\-\.]\d{4})/);
      if (match) return { inicio: parseExcelDate(match[1]), fim: parseExcelDate(match[2]) };
      return null;
    };

    const rows: ImportRow[] = [];
    for (const row of raw) {
      const nome = String(row[colNome!] || "").trim();
      if (!nome) continue;
      const matricula = colMat ? String(row[colMat] || "").trim() : undefined;
      const pa = colPAInicio ? parsePeriodoAquisitivo(row[colPAInicio]) : null;
      const abono = colAbono ? parseBool(row[colAbono]) : false;
      const diasAbono = colDiasAbono ? (Number(row[colDiasAbono]) || undefined) : undefined;
      const dec13 = col13 ? parseBool(row[col13]) : false;

      for (const pc of periodCols) {
        const inicio = parseExcelDate(row[pc.inicio]);
        const fim = parseExcelDate(row[pc.fim]);
        if (!inicio || !fim) continue;
        const dias = pc.dias ? (Number(row[pc.dias]) || undefined) : undefined;
        const matched = colaboradores.find((c) => {
          if (matricula && c.matricula && c.matricula.toLowerCase() === matricula.toLowerCase()) return true;
          return c.nome.toLowerCase() === nome.toLowerCase();
        });
        rows.push({
          nome, matricula,
          periodo_aquisitivo_inicio: pa?.inicio,
          periodo_aquisitivo_fim: pa?.fim,
          data_inicio: inicio, data_fim: fim, dias,
          abono_pecuniario: abono, dias_abono: diasAbono,
          decimo_terceiro_antecipado: dec13,
          matched: !!matched, colaborador_id: matched?.id,
        });
      }
    }

    if (rows.length === 0) { toast({ title: "Nenhum período válido encontrado", variant: "destructive" }); return; }
    setImportPreview(rows);
    setDialogOpen(true);
    e.target.value = "";
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);

    const matched = importPreview.filter((r) => r.matched && r.colaborador_id);
    if (matched.length === 0) {
      toast({ title: "Nenhum colaborador correspondente", variant: "destructive" });
      setImporting(false);
      return;
    }

    // For each matched row, find or create periodo aquisitivo, then insert ferias
    let inserted = 0;
    for (const r of matched) {
      // Try to find existing periodo aquisitivo
      let periodoId: string | null = null;
      if (r.periodo_aquisitivo_inicio && r.periodo_aquisitivo_fim) {
        const { data: existingP } = await supabase
          .from("periodos_aquisitivos")
          .select("id")
          .eq("colaborador_id", r.colaborador_id!)
          .eq("data_inicio", r.periodo_aquisitivo_inicio)
          .maybeSingle();
        if (existingP) {
          periodoId = existingP.id;
        } else {
          // Create periodo
          const { data: newP } = await supabase
            .from("periodos_aquisitivos")
            .insert({
              colaborador_id: r.colaborador_id!,
              data_inicio: r.periodo_aquisitivo_inicio,
              data_fim: r.periodo_aquisitivo_fim,
              data_limite_concessao: r.periodo_aquisitivo_fim, // simplified
            } as any)
            .select("id")
            .single();
          periodoId = newP?.id || null;
        }
      }

      if (!periodoId) {
        // Find any open period for the employee
        const { data: openP } = await supabase
          .from("periodos_aquisitivos")
          .select("id")
          .eq("colaborador_id", r.colaborador_id!)
          .in("status", ["aberto", "parcial"])
          .order("data_inicio")
          .limit(1)
          .maybeSingle();
        periodoId = openP?.id || null;
      }

      if (!periodoId) continue; // Skip if no period available

      const { error } = await supabase.from("ferias_periodos").insert({
        colaborador_id: r.colaborador_id!,
        periodo_aquisitivo_id: periodoId,
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        dias_gozo: r.dias || 30,
        abono_pecuniario: r.abono_pecuniario ?? false,
        dias_abono: r.dias_abono ?? 0,
        decimo_terceiro_antecipado: r.decimo_terceiro_antecipado ?? false,
      } as any);
      if (!error) inserted++;
    }

    setImporting(false);
    if (inserted > 0) {
      toast({ title: `${inserted} registro(s) importado(s)!` });
      setDialogOpen(false);
      setImportPreview(null);
    } else {
      toast({ title: "Nenhum registro importado", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <p className="text-sm text-muted-foreground flex-1 min-w-[200px]">
          Importe planilhas XLSX/CSV com programação de férias. O sistema identifica colaboradores por nome ou matrícula e cria os registros de férias vinculados aos períodos aquisitivos.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate}>
            <Download className="mr-2 h-4 w-4" />Baixar Modelo
          </Button>
          {isAdmin && (
            <label>
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
              <Button variant="outline" asChild>
                <span className="cursor-pointer"><Upload className="mr-2 h-4 w-4" />Selecionar Arquivo</span>
              </Button>
            </label>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Preview da Importação</DialogTitle></DialogHeader>
          {importPreview && (
            <>
              <p className="text-sm text-muted-foreground">
                {importPreview.filter((r) => r.matched).length} de {importPreview.length} registros com correspondência.
              </p>
              <div className="rounded-lg border max-h-[50vh] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Dias</TableHead>
                      <TableHead>Abono</TableHead>
                      <TableHead>13º</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importPreview.map((r, i) => (
                      <TableRow key={i} className={r.matched ? "" : "opacity-50"}>
                        <TableCell>
                          <Badge variant={r.matched ? "default" : "destructive"} className="text-xs">
                            {r.matched ? "OK" : "Não encontrado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell>{r.data_inicio}</TableCell>
                        <TableCell>{r.data_fim}</TableCell>
                        <TableCell>{r.dias ?? "—"}</TableCell>
                        <TableCell>{r.abono_pecuniario ? "Sim" : "—"}</TableCell>
                        <TableCell>{r.decimo_terceiro_antecipado ? "Sim" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); setImportPreview(null); }}>Cancelar</Button>
                <Button onClick={confirmImport} disabled={importing}>
                  {importing ? "Importando..." : `Importar ${importPreview.filter((r) => r.matched).length} registros`}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
