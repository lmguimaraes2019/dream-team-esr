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
  data_limite_concessao?: string;
  data_inicio: string;
  data_fim: string;
  dias?: number;
  numero_programacao?: number;
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

  const parseNumeroProgramacao = (val: any): number => {
    if (!val) return 1;
    const s = String(val).trim().toLowerCase();
    const match = s.match(/^(\d)/);
    if (match) return Math.min(3, Math.max(1, Number(match[1])));
    return 1;
  };

  const downloadTemplate = () => {
    const headers = [
      "Filial", "Centro Custo", "Diretoria", "Diretoria Adj", "Gerencia", "Gestor",
      "Matricula", "Nome",
      "Período Aquisitivo De", "Período Aquisitivo Até",
      "Data Limite Maxima Para Inicio das Férias",
      "Qtd Dias de Férias Pendentes", "Qtd Dias de Férias",
      "Número Prog. de Férias",
      "Programação Data Início", "Programação Data Final",
      "Abono", "Antecip da 1ª Parc. 13º Sal."
    ];
    const example = [
      "01", "0020000001063", "DSS", "ESR", "GADM", "Luciana Batista da Silva",
      "000420", "ALESSANDRA B DE SOUZA LIMA",
      "12/09/2024", "11/09/2025",
      "12/08/2026",
      10, 20,
      "1a",
      "29/09/2025", "18/10/2025",
      "D.AB.", "13o S  50.0"
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
    const colPADe = findCol(headers, ["período aquisitivo de", "periodo aquisitivo de", "aquisitivo de"]);
    const colPAAte = findCol(headers, ["período aquisitivo até", "periodo aquisitivo ate", "aquisitivo até"]);
    const colPACombined = !colPADe ? findCol(headers, ["período aquisitivo", "per. aquisitivo", "aquisitivo"]) : undefined;
    const colDataLimite = findCol(headers, ["data limite", "limite maxima", "limite máxima"]);
    const colAbono = findCol(headers, ["abono"]);
    const col13 = findCol(headers, ["13", "décimo", "decimo", "antecip"]);
    const colNumProg = findCol(headers, ["número prog", "numero prog", "nº prog"]);

    // RNP format: "Programação Data Início" / "Programação Data Final"
    const colProgInicio = findCol(headers, ["programação data início", "programação data inicio", "programacao data inicio"]);
    const colProgFim = findCol(headers, ["programação data final", "programacao data final", "programação data fim"]);
    const colDiasFeriasPendentes = findCol(headers, ["dias de férias pendentes", "dias de ferias pendentes"]);
    const colDiasFeriasQtd = findCol(headers, ["qtd dias de férias", "qtd dias de ferias"]);

    // Try period columns (1º, 2º, 3º format)
    const periodCols: { inicio: string; fim: string; dias?: string; prog?: number }[] = [];

    if (colProgInicio && colProgFim) {
      // RNP single-row format
      const diasCol = colDiasFeriasQtd || findCol(headers, ["dias"]);
      periodCols.push({ inicio: colProgInicio, fim: colProgFim, dias: diasCol || undefined, prog: undefined });
    } else {
      for (let i = 1; i <= 3; i++) {
        const prefix = `${i}º`;
        const inicioCol = headers.find((h) => h.includes(prefix) && (h.toLowerCase().includes("início") || h.toLowerCase().includes("inicio")));
        const fimCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("fim"));
        const diasCol = headers.find((h) => h.includes(prefix) && h.toLowerCase().includes("dia"));
        if (inicioCol && fimCol) periodCols.push({ inicio: inicioCol, fim: fimCol, dias: diasCol, prog: i });
      }
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

    const parseAbonoField = (val: any): boolean => {
      if (!val) return false;
      const s = String(val).trim().toUpperCase();
      return s.includes("D.AB") || s.includes("D.FER") || parseBool(val);
    };

    const parse13Field = (val: any): boolean => {
      if (!val) return false;
      const s = String(val).trim().toLowerCase();
      return s.includes("13o") || s.includes("13º") || parseBool(val);
    };

    const rows: ImportRow[] = [];
    for (const row of raw) {
      const nome = String(row[colNome!] || "").trim();
      if (!nome) continue;
      const matricula = colMat ? String(row[colMat] || "").trim() : undefined;

      let paInicio: string | undefined;
      let paFim: string | undefined;
      if (colPADe && colPAAte) {
        paInicio = parseExcelDate(row[colPADe]);
        paFim = parseExcelDate(row[colPAAte]);
      } else if (colPACombined) {
        const pa = parsePeriodoAquisitivo(row[colPACombined]);
        if (pa) { paInicio = pa.inicio; paFim = pa.fim; }
      }

      const dataLimite = colDataLimite ? parseExcelDate(row[colDataLimite]) : undefined;
      const abono = colAbono ? parseAbonoField(row[colAbono]) : false;
      const dec13 = col13 ? parse13Field(row[col13]) : false;
      const numProg = colNumProg ? parseNumeroProgramacao(row[colNumProg]) : undefined;

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
          periodo_aquisitivo_inicio: paInicio,
          periodo_aquisitivo_fim: paFim,
          data_limite_concessao: dataLimite,
          data_inicio: inicio, data_fim: fim, dias,
          numero_programacao: numProg || pc.prog || 1,
          abono_pecuniario: abono,
          dias_abono: abono ? 10 : undefined,
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

    let inserted = 0;
    for (const r of matched) {
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
          const limiteConcessao = r.data_limite_concessao || r.periodo_aquisitivo_fim;
          const { data: newP } = await supabase
            .from("periodos_aquisitivos")
            .insert({
              colaborador_id: r.colaborador_id!,
              data_inicio: r.periodo_aquisitivo_inicio,
              data_fim: r.periodo_aquisitivo_fim,
              data_limite_concessao: limiteConcessao,
            } as any)
            .select("id")
            .single();
          periodoId = newP?.id || null;
        }
      }

      if (!periodoId) {
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

      if (!periodoId) continue;

      const { error } = await supabase.from("ferias_periodos").insert({
        colaborador_id: r.colaborador_id!,
        periodo_aquisitivo_id: periodoId,
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        dias_gozo: r.dias || 30,
        numero_programacao: r.numero_programacao || 1,
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      <TableHead>Per. Aquisitivo</TableHead>
                      <TableHead>Data Limite</TableHead>
                      <TableHead>Nº Prog.</TableHead>
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
                        <TableCell className="text-xs">
                          {r.periodo_aquisitivo_inicio && r.periodo_aquisitivo_fim
                            ? `${r.periodo_aquisitivo_inicio} — ${r.periodo_aquisitivo_fim}`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs">{r.data_limite_concessao || "—"}</TableCell>
                        <TableCell className="text-center">{r.numero_programacao || 1}ª</TableCell>
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
