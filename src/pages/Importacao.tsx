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
import { Check, AlertTriangle, FileSpreadsheet, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Tables } from "@/integrations/supabase/types";
import {
  normalizeGenero, normalizeNivel, normalizeVinculo,
  excelDateToISO, nivelFromCargo, isLideranca,
  normalizeHeader, mapHeader,
} from "@/lib/importNormalization";
import { calcularCustos, buildParametros, type ParametrosCusto, type CustosCalculados } from "@/lib/calcularCustos";

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
  origem_recurso: string;
  custos: CustosCalculados;
}

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
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);
  const [parametros, setParametros] = useState<ParametrosCusto | null>(null);
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

    // Load cost parameters
    supabase
      .from("configuracoes_encargos")
      .select("*")
      .then(({ data }) => {
        if (data) {
          setParametros(buildParametros(data as any));
        }
      });
  }, []);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!parametros) {
      toast({ title: "Parâmetros não carregados", description: "Aguarde ou verifique as configurações.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
    setParseWarnings([]);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];

      const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

      let headerIdx = -1;
      for (let i = 0; i < Math.min(rawRows.length, 15); i++) {
        const vals = (rawRows[i] || []).map((v: any) => normalizeHeader(String(v || "")));
        if (vals.includes("nome") && (vals.includes("matricula") || vals.includes("cargo"))) {
          headerIdx = i;
          break;
        }
      }

      if (headerIdx === -1) {
        toast({ title: "Cabeçalho não encontrado", description: "A planilha deve ter colunas 'Matrícula' e 'Nome'.", variant: "destructive" });
        return;
      }

      const rawHeaders: string[] = rawRows[headerIdx].map((v: any) => String(v || ""));
      const colMap: Record<string, number> = {};
      const warnings: string[] = [];
      const unmapped: string[] = [];

      rawHeaders.forEach((h, idx) => {
        if (!h.trim()) return;
        const mapped = mapHeader(h);
        if (mapped) {
          colMap[mapped] = idx;
        } else {
          unmapped.push(h);
        }
      });

      if (unmapped.length > 0) {
        warnings.push(`Colunas ignoradas: ${unmapped.join(", ")}`);
      }

      if (!("nome" in colMap)) {
        toast({ title: "Coluna obrigatória ausente", description: "Precisa de 'Nome'.", variant: "destructive" });
        return;
      }

      const get = (row: any[], field: string): any => {
        const idx = colMap[field];
        return idx !== undefined ? row[idx] : undefined;
      };

      const dataRows = rawRows.slice(headerIdx + 1).filter((row) =>
        row && row.length > 0 && get(row, "nome")
      );

      const rows: PreviewRow[] = dataRows.map((row) => {
        const rawDate = get(row, "data_admissao") || "";
        const parsedDate = excelDateToISO(rawDate);
        const cargo = String(get(row, "cargo") || "");
        const salario = Number(get(row, "salario_base") || 0);

        const rawNivel = get(row, "nivel_complexidade");
        const nivel = rawNivel ? (normalizeNivel(String(rawNivel)) || nivelFromCargo(cargo)) : nivelFromCargo(cargo);

        const rawGenero = get(row, "genero");
        const genero = rawGenero ? (normalizeGenero(String(rawGenero)) || "outro") : "outro";

        const rawVinculo = get(row, "tipo_vinculo");
        const tipoVinculo = rawVinculo ? (normalizeVinculo(String(rawVinculo)) || "clt") : "clt";

        const rawLideranca = get(row, "lideranca");
        const lideranca = rawLideranca
          ? ["sim", "true", "1", "s"].includes(String(rawLideranca).toLowerCase())
          : isLideranca(cargo);

        // Calculate all costs from salary + parameters
        const custos = calcularCustos(salario, parametros!);

        return {
          nome: String(get(row, "nome") || "").trim(),
          matricula: String(get(row, "matricula") || "").trim(),
          genero,
          lideranca,
          data_admissao: parsedDate || String(rawDate),
          gerencia: String(get(row, "gerencia") || "").trim(),
          diretoria: String(get(row, "diretoria") || "").trim(),
          cargo: cargo.trim(),
          trajetoria: String(get(row, "trajetoria") || "").trim(),
          nivel_complexidade: nivel,
          grupo: Number(get(row, "grupo")) || 1,
          tipo_vinculo: tipoVinculo,
          origem_recurso: String(get(row, "origem_recurso") || "").trim(),
          custos,
        };
      });

      setPreview(rows);
      setImportErrors([]);
      setImportResult(null);
      setParseWarnings(warnings);

      if (rows.length === 0) {
        toast({ title: "Nenhum registro encontrado", description: "Verifique se a planilha tem dados abaixo do cabeçalho.", variant: "destructive" });
      }
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
      for (let i = 0; i < preview.length; i++) {
        const row = preview[i];

        if (!row.nome) {
          errors.push({ row: i + 2, error: "Nome vazio" });
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

        const c = row.custos;
        const { error: custoErr } = await supabase.from("custos_mensais").upsert(
          {
            colaborador_id: colab.id,
            mes_referencia: mesRef,
            salario_base: c.salario_base,
            inss: c.inss,
            fgts: c.fgts,
            pis: c.pis,
            vr_va: c.vr_va,
            vt: c.vt,
            plano_saude: c.plano_saude,
            seguro: c.seguro,
            internet: c.internet,
            ferias: c.ferias,
            um_terco_ferias: c.um_terco_ferias,
            decimo_terceiro: c.decimo_terceiro,
            custo_mensal: c.custo_mensal,
            custo_anual: c.custo_anual,
          },
          { onConflict: "colaborador_id,mes_referencia" }
        );

        if (custoErr) {
          errors.push({ row: i + 2, error: `Custo: ${custoErr.message}` });
        } else {
          successCount++;
        }
      }

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
            {parseWarnings.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {parseWarnings.map((w, i) => <p key={i} className="text-xs">{w}</p>)}
                </AlertDescription>
              </Alert>
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
                    <TableHead>Custo Mensal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.slice(0, 50).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.nome}</TableCell>
                      <TableCell>{r.matricula}</TableCell>
                      <TableCell>{r.gerencia}</TableCell>
                      <TableCell>{r.cargo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{r.nivel_complexidade}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.custos.salario_base.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        {r.custos.custo_mensal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

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
                  {isAdmin && <TableHead className="w-10"></TableHead>}
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
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (!confirm(`Excluir importação "${h.nome_arquivo}" e os custos do mês ${h.mes_referencia}?`)) return;
                            await supabase.from("custos_mensais").delete().eq("mes_referencia", h.mes_referencia);
                            await supabase.from("importacoes").delete().eq("id", h.id);
                            toast({ title: "Importação excluída" });
                            const { data: hist } = await supabase
                              .from("importacoes")
                              .select("*")
                              .order("created_at", { ascending: false })
                              .limit(20);
                            setHistorico(hist || []);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
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
