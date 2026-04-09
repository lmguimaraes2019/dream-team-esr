import { useState, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Tables } from "@/integrations/supabase/types";
import { normalizeGenero, normalizeNivel, normalizeVinculo, excelDateToISO } from "@/lib/importNormalization";

interface PreviewRow {
  nome: string;
  matricula: string;
  genero: string;
  lideranca: boolean;
  data_admissao: string;
  gerencia: string;
  diretoria: string;
  cargo: string;
  trajetoria: string;
  nivel_complexidade: string;
  grupo: number;
  tipo_vinculo: string;
  salario_base: number;
  vr_va: number;
  vt: number;
  plano_saude: number;
  seguro: number;
  internet: number;
}

const normalizeHeader = (h: string) =>
  h.toLowerCase().trim()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

export default function Importacao() {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  const [saving, setSaving] = useState(false);
  const [historico, setHistorico] = useState<Tables<"importacoes">[]>([]);
  const [importErrors, setImportErrors] = useState<{ row: number; error: string }[]>([]);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    supabase
      .from("importacoes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setHistorico(data || []));
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws);

      const rows: PreviewRow[] = json.map((row) => {
        const norm: Record<string, any> = {};
        Object.entries(row).forEach(([k, v]) => { norm[normalizeHeader(k)] = v; });

        const rawDate = norm.data_admissao || norm.data_de_admissao || "";
        const parsedDate = excelDateToISO(rawDate);

        return {
          nome: String(norm.nome || ""),
          matricula: String(norm.matricula || ""),
          genero: normalizeGenero(String(norm.genero || "outro")) || "outro",
          lideranca: ["sim", "true", "1", "s"].includes(String(norm.lideranca || "").toLowerCase()),
          data_admissao: parsedDate || String(rawDate),
          gerencia: String(norm.gerencia || ""),
          diretoria: String(norm.diretoria || ""),
          cargo: String(norm.cargo || ""),
          trajetoria: String(norm.trajetoria || ""),
          nivel_complexidade: normalizeNivel(String(norm.nivel_complexidade || norm.nivel || "junior")) || "junior",
          grupo: Number(norm.grupo) || 1,
          tipo_vinculo: normalizeVinculo(String(norm.tipo_vinculo || norm.vinculo || "clt")) || "clt",
          salario_base: Number(norm.salario_base || norm.salario || 0),
          vr_va: Number(norm.vr_va || norm.vr || norm.va || 0),
          vt: Number(norm.vt || 0),
          plano_saude: Number(norm.plano_saude || norm.plano_de_saude || 0),
          seguro: Number(norm.seguro || 0),
          internet: Number(norm.internet || 0),
        };
      });

      setPreview(rows);
      setImportErrors([]);
      setImportResult(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirm = async () => {
    if (!user) return;
    setSaving(true);
    setImportErrors([]);
    setImportResult(null);

    const errors: { row: number; error: string }[] = [];
    let successCount = 0;

    try {
      const { data: taxas } = await supabase.from("configuracoes_encargos").select("*");
      const taxaINSS = taxas?.find((t) => t.nome.toLowerCase().includes("inss"))?.taxa || 0.2;
      const taxaFGTS = taxas?.find((t) => t.nome.toLowerCase().includes("fgts"))?.taxa || 0.08;
      const taxaPIS = taxas?.find((t) => t.nome.toLowerCase().includes("pis"))?.taxa || 0.01;

      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];

        // Validate required fields
        if (!row.nome || !row.matricula) {
          errors.push({ row: i + 2, error: "Nome ou matrícula vazios" });
          continue;
        }

        const { data: colab, error: colabErr } = await supabase
          .from("colaboradores")
          .upsert(
            {
              nome: row.nome,
              matricula: row.matricula,
              genero: row.genero as any,
              lideranca: row.lideranca,
              data_admissao: row.data_admissao,
              gerencia: row.gerencia,
              diretoria: row.diretoria,
              cargo: row.cargo,
              trajetoria: row.trajetoria,
              nivel_complexidade: row.nivel_complexidade as any,
              grupo: row.grupo,
              tipo_vinculo: row.tipo_vinculo as any,
            },
            { onConflict: "matricula" }
          )
          .select("id")
          .single();

        if (colabErr || !colab) {
          errors.push({ row: i + 2, error: colabErr?.message || "Erro ao salvar colaborador" });
          continue;
        }

        const salario = row.salario_base;
        const inss = salario * Number(taxaINSS);
        const fgts = salario * Number(taxaFGTS);
        const pis = salario * Number(taxaPIS);
        const ferias = salario / 12;
        const umTercoFerias = ferias / 3;
        const decimoTerceiro = salario / 12;
        const custoMensal =
          salario + inss + fgts + pis +
          row.vr_va + row.vt + row.plano_saude + row.seguro + row.internet +
          ferias + umTercoFerias + decimoTerceiro;

        const { error: custoErr } = await supabase.from("custos_mensais").upsert(
          {
            colaborador_id: colab.id,
            mes_referencia: mesRef,
            salario_base: salario,
            inss: Math.round(inss * 100) / 100,
            fgts: Math.round(fgts * 100) / 100,
            pis: Math.round(pis * 100) / 100,
            vr_va: row.vr_va,
            vt: row.vt,
            plano_saude: row.plano_saude,
            seguro: row.seguro,
            internet: row.internet,
            ferias: Math.round(ferias * 100) / 100,
            um_terco_ferias: Math.round(umTercoFerias * 100) / 100,
            decimo_terceiro: Math.round(decimoTerceiro * 100) / 100,
            custo_mensal: Math.round(custoMensal * 100) / 100,
            custo_anual: Math.round(custoMensal * 12 * 100) / 100,
          },
          { onConflict: "colaborador_id,mes_referencia" }
        );

        if (custoErr) {
          errors.push({ row: i + 2, error: `Custo: ${custoErr.message}` });
        } else {
          successCount++;
        }
      }

      // Log import
      await supabase.from("importacoes").insert({
        user_id: user.id,
        nome_arquivo: fileName,
        mes_referencia: mesRef,
        qtd_registros: successCount,
        status: errors.length > 0 ? (successCount > 0 ? "parcial" : "erro") : "concluido",
      });

      setImportErrors(errors);
      setImportResult({ success: successCount, failed: errors.length });

      if (successCount > 0) {
        toast({ title: "Importação concluída!", description: `${successCount} de ${preview.length} registros importados.` });
        setPreview([]);
        setFileName("");
      } else {
        toast({ title: "Nenhum registro importado", description: "Verifique os erros abaixo.", variant: "destructive" });
      }

      // Refresh history
      const { data: hist } = await supabase
        .from("importacoes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      setHistorico(hist || []);
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Importação de Planilha</h1>

      {isAdmin ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Upload de Arquivo</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Arquivo (XLSX ou CSV)</Label>
                <Input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFile}
                />
              </div>
              <div className="space-y-2">
                <Label>Mês de Referência</Label>
                <Input
                  type="month"
                  value={mesRef}
                  onChange={(e) => setMesRef(e.target.value)}
                />
              </div>
            </div>
            {fileName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileSpreadsheet className="h-4 w-4" />
                {fileName} — {preview.length} registros
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Apenas administradores podem importar dados.
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Preview ({preview.length} registros)</CardTitle>
            <Button onClick={handleConfirm} disabled={saving}>
              {saving ? "Salvando..." : <><Check className="mr-2 h-4 w-4" />Confirmar Importação</>}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Gerência</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Nível</TableHead>
                    <TableHead>Salário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell>{r.matricula}</TableCell>
                      <TableCell>{r.gerencia}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>{r.nivel_complexidade}</TableCell>
                      <TableCell>
                        {r.salario_base.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Result / Errors */}
      {importResult && (
        <Alert variant={importResult.failed > 0 ? "destructive" : "default"}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{importResult.success}</strong> de {importResult.success + importResult.failed} registros importados com sucesso.
            {importResult.failed > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">Ver {importResult.failed} erro(s)</summary>
                <ul className="mt-1 text-xs space-y-1">
                  {importErrors.map((e, i) => (
                    <li key={i}>Linha {e.row}: {e.error}</li>
                  ))}
                </ul>
              </details>
            )}
          </AlertDescription>
        </Alert>
      )}


      <Card>
        <CardHeader><CardTitle className="text-base">Histórico de Importações</CardTitle></CardHeader>
        <CardContent>
          {historico.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma importação realizada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Mês Ref.</TableHead>
                  <TableHead>Registros</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.nome_arquivo}</TableCell>
                    <TableCell>{h.mes_referencia}</TableCell>
                    <TableCell>{h.qtd_registros}</TableCell>
                    <TableCell>
                      <Badge variant={h.status === "concluido" ? "default" : "secondary"}>
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(h.created_at).toLocaleDateString("pt-BR")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
