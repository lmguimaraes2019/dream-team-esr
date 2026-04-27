import { useEffect, useRef, useState, KeyboardEvent } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Check, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

const norm = (s: any) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const PROCESSO_HEADERS = ["processo", "processos"];
const RESP_HEADERS = [
  "principais responsabilidades do cargo",
  "principais responsabilidades",
  "responsabilidades",
  "responsabilidade",
];

function findHeaderIndices(rows: any[][]): { headerRow: number; processoCol: number; respCol: number } | null {
  const max = Math.min(rows.length, 40);
  for (let r = 0; r < max; r++) {
    const row = rows[r] || [];
    let pCol = -1, rCol = -1;
    for (let c = 0; c < row.length; c++) {
      const v = norm(row[c]);
      if (pCol === -1 && PROCESSO_HEADERS.includes(v)) pCol = c;
      if (rCol === -1 && RESP_HEADERS.includes(v)) rCol = c;
    }
    if (pCol !== -1 && rCol !== -1) return { headerRow: r, processoCol: pCol, respCol: rCol };
  }
  return null;
}

function findMissao(rows: any[][]): string {
  const max = Math.min(rows.length, 40);
  for (let r = 0; r < max; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      if (norm(row[c]) === "missao do cargo") {
        // Look at next non-empty row, same or next column
        for (let r2 = r + 1; r2 < Math.min(r + 5, rows.length); r2++) {
          const next = rows[r2] || [];
          for (let c2 = 0; c2 < next.length; c2++) {
            const v = String(next[c2] ?? "").replace(/\u00a0/g, " ").trim();
            if (v && norm(v) !== "missao do cargo") return v;
          }
        }
      }
    }
  }
  return "";
}

const cleanCell = (v: any) => String(v ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();

export type Responsabilidade = { processo: string; responsabilidade: string };

export interface DescricaoCargoData {
  missao: string;
  formacao_minima: string;
  formacao_desejavel: string;
  competencias: string[];
  responsabilidades: Responsabilidade[];
}

type ProcessoGroup = { processo: string; itens: string[] };

interface Props {
  colaboradorId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: DescricaoCargoData | null;
  onSaved: () => void;
}

const empty: DescricaoCargoData = {
  missao: "",
  formacao_minima: "",
  formacao_desejavel: "",
  competencias: [],
  responsabilidades: [],
};

function toGroups(resp: Responsabilidade[]): ProcessoGroup[] {
  const groups: ProcessoGroup[] = [];
  for (const r of resp) {
    const last = groups[groups.length - 1];
    if (last && last.processo === r.processo) last.itens.push(r.responsabilidade);
    else groups.push({ processo: r.processo, itens: [r.responsabilidade] });
  }
  return groups;
}

function fromGroups(groups: ProcessoGroup[]): Responsabilidade[] {
  const out: Responsabilidade[] = [];
  for (const g of groups) {
    for (const item of g.itens) out.push({ processo: g.processo, responsabilidade: item });
  }
  return out;
}

const STEPS = [
  { id: 1, label: "Missão" },
  { id: 2, label: "Processos" },
  { id: 3, label: "Formação" },
  { id: 4, label: "Competências" },
  { id: 5, label: "Revisão" },
] as const;

export default function DescricaoCargoEditDialog({ colaboradorId, open, onOpenChange, initial, onSaved }: Props) {
  const [step, setStep] = useState<number>(1);
  const [missao, setMissao] = useState("");
  const [formacaoMinima, setFormacaoMinima] = useState("");
  const [formacaoDesejavel, setFormacaoDesejavel] = useState("");
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [groups, setGroups] = useState<ProcessoGroup[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const focusItemRef = useRef<{ gi: number; ii: number } | null>(null);
  const itemRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const processoNameRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImportFile = async (file: File) => {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      let imported: ProcessoGroup[] = [];
      let totalItens = 0;
      let missaoImportada = "";
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
        const found = findHeaderIndices(rows);
        if (!found) continue;
        const { headerRow, processoCol, respCol } = found;
        if (!missaoImportada) missaoImportada = findMissao(rows);
        let lastProcesso = "";
        for (let i = headerRow + 1; i < rows.length; i++) {
          const row = rows[i] || [];
          const proc = cleanCell(row[processoCol]);
          const resp = cleanCell(row[respCol]);
          if (proc) lastProcesso = proc;
          // Stop if we hit another section header (e.g., "Características do Cargo", "Formação...")
          const restoTexto = row.map(cleanCell).filter(Boolean).join(" ").toLowerCase();
          if (!resp && !proc && restoTexto && /caracteristicas|formacao|competenc/i.test(
            restoTexto.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          )) {
            break;
          }
          if (!resp) continue;
          const procName = lastProcesso || "Sem nome";
          const last = imported[imported.length - 1];
          if (last && norm(last.processo) === norm(procName)) {
            last.itens.push(resp);
          } else {
            imported.push({ processo: procName, itens: [resp] });
          }
          totalItens++;
        }
        if (imported.length > 0) break;
      }
      if (imported.length === 0) {
        toast({
          title: "Não foi possível importar",
          description: "Não encontrei as colunas 'Processos' e 'Principais Responsabilidades do Cargo' na planilha.",
          variant: "destructive",
        });
        return;
      }
      // Merge with existing groups (case-insensitive name match)
      setGroups((prev) => {
        const next = [...prev];
        for (const g of imported) {
          const idx = next.findIndex((x) => norm(x.processo) === norm(g.processo));
          if (idx >= 0) {
            next[idx] = { ...next[idx], itens: [...next[idx].itens, ...g.itens] };
          } else {
            next.push(g);
          }
        }
        const firstImportedIdx = next.findIndex((x) => norm(x.processo) === norm(imported[0].processo));
        if (firstImportedIdx >= 0) setSelectedIdx(firstImportedIdx);
        return next;
      });
      // Importar missão (sempre sobrescreve com o conteúdo da planilha quando presente)
      let missaoMsg = "";
      if (missaoImportada) {
        setMissao(missaoImportada);
        missaoMsg = " · Missão atualizada";
      } else {
        missaoMsg = " · Missão não encontrada na planilha";
      }
      toast({
        title: "Importação concluída",
        description: `${imported.length} processo(s) e ${totalItens} responsabilidade(s) importados.${missaoMsg}`,
      });
    } catch (e: any) {
      toast({ title: "Erro ao ler planilha", description: e.message, variant: "destructive" });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (open) {
      const src = initial ?? empty;
      setMissao(src.missao);
      setFormacaoMinima(src.formacao_minima);
      setFormacaoDesejavel(src.formacao_desejavel);
      setCompetencias(src.competencias);
      const g = toGroups(src.responsabilidades);
      setGroups(g);
      setSelectedIdx(g.length > 0 ? 0 : null);
      setStep(1);
    }
  }, [open, initial]);

  // Auto-focus newly added item
  useEffect(() => {
    if (focusItemRef.current) {
      const { gi, ii } = focusItemRef.current;
      const key = `${gi}:${ii}`;
      const el = itemRefs.current.get(key);
      el?.focus();
      focusItemRef.current = null;
    }
  });

  // Process group ops
  const addGroup = () => {
    const next = [...groups, { processo: "", itens: [""] }];
    setGroups(next);
    setSelectedIdx(next.length - 1);
    setTimeout(() => processoNameRef.current?.focus(), 50);
  };
  const updGroupName = (gi: number, processo: string) => {
    const next = [...groups];
    next[gi] = { ...next[gi], processo };
    setGroups(next);
  };
  const rmGroup = (gi: number) => {
    const next = groups.filter((_, i) => i !== gi);
    setGroups(next);
    if (selectedIdx === gi) setSelectedIdx(next.length ? Math.max(0, gi - 1) : null);
    else if (selectedIdx !== null && gi < selectedIdx) setSelectedIdx(selectedIdx - 1);
  };
  const moveGroup = (gi: number, dir: -1 | 1) => {
    const j = gi + dir;
    if (j < 0 || j >= groups.length) return;
    const next = [...groups];
    [next[gi], next[j]] = [next[j], next[gi]];
    setGroups(next);
    if (selectedIdx === gi) setSelectedIdx(j);
    else if (selectedIdx === j) setSelectedIdx(gi);
  };

  // Item ops
  const addItem = (gi: number) => {
    const next = [...groups];
    next[gi] = { ...next[gi], itens: [...next[gi].itens, ""] };
    setGroups(next);
    focusItemRef.current = { gi, ii: next[gi].itens.length - 1 };
  };
  const updItem = (gi: number, ii: number, value: string) => {
    const next = [...groups];
    const itens = [...next[gi].itens];
    itens[ii] = value;
    next[gi] = { ...next[gi], itens };
    setGroups(next);
  };
  const rmItem = (gi: number, ii: number) => {
    const next = [...groups];
    next[gi] = { ...next[gi], itens: next[gi].itens.filter((_, i) => i !== ii) };
    setGroups(next);
  };
  const moveItem = (gi: number, ii: number, dir: -1 | 1) => {
    const j = ii + dir;
    const itens = groups[gi].itens;
    if (j < 0 || j >= itens.length) return;
    const next = [...groups];
    const newItens = [...itens];
    [newItens[ii], newItens[j]] = [newItens[j], newItens[ii]];
    next[gi] = { ...next[gi], itens: newItens };
    setGroups(next);
  };

  const onItemKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>, gi: number, ii: number) => {
    const itens = groups[gi].itens;
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (ii === itens.length - 1) addItem(gi);
      else {
        focusItemRef.current = { gi, ii: ii + 1 };
        setGroups([...groups]); // trigger focus effect
      }
    } else if (e.key === "Backspace" && itens[ii] === "" && itens.length > 1) {
      e.preventDefault();
      rmItem(gi, ii);
      focusItemRef.current = { gi, ii: Math.max(0, ii - 1) };
    }
  };

  // Competencias
  const addComp = () => setCompetencias([...competencias, ""]);
  const updComp = (i: number, v: string) => {
    const next = [...competencias];
    next[i] = v;
    setCompetencias(next);
  };
  const rmComp = (i: number) => setCompetencias(competencias.filter((_, idx) => idx !== i));
  const moveComp = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= competencias.length) return;
    const next = [...competencias];
    [next[i], next[j]] = [next[j], next[i]];
    setCompetencias(next);
  };

  const totalProcessos = groups.length;
  const totalItens = groups.reduce((s, g) => s + g.itens.filter((i) => i.trim()).length, 0);

  const goNext = () => {
    if (step === 2) {
      const incompletos = groups.filter((g) => !g.processo.trim() || g.itens.every((i) => !i.trim()));
      if (incompletos.length > 0) {
        toast({
          title: "Atenção",
          description: `${incompletos.length} processo(s) sem nome ou sem responsabilidades preenchidas.`,
        });
      }
    }
    setStep(Math.min(5, step + 1));
  };
  const goBack = () => setStep(Math.max(1, step - 1));

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("descricao_cargo")
        .select("id")
        .eq("colaborador_id", colaboradorId)
        .maybeSingle();

      let descricaoId: string;
      if (existing) {
        const { error } = await supabase
          .from("descricao_cargo")
          .update({
            missao: missao || null,
            formacao_minima: formacaoMinima || null,
            formacao_desejavel: formacaoDesejavel || null,
            competencias: competencias.filter((c) => c.trim()),
          })
          .eq("id", existing.id);
        if (error) throw error;
        descricaoId = existing.id;
      } else {
        const { data: ins, error } = await supabase
          .from("descricao_cargo")
          .insert({
            colaborador_id: colaboradorId,
            missao: missao || null,
            formacao_minima: formacaoMinima || null,
            formacao_desejavel: formacaoDesejavel || null,
            competencias: competencias.filter((c) => c.trim()),
          })
          .select("id")
          .single();
        if (error) throw error;
        descricaoId = ins.id;
      }

      await supabase.from("descricao_cargo_responsabilidades").delete().eq("descricao_cargo_id", descricaoId);

      const flat = fromGroups(
        groups
          .map((g) => ({
            processo: g.processo.trim(),
            itens: g.itens.map((i) => i.trim()).filter((i) => i),
          }))
          .filter((g) => g.processo && g.itens.length > 0)
      );

      const rows = flat.map((r, idx) => ({
        descricao_cargo_id: descricaoId,
        processo: r.processo,
        responsabilidade: r.responsabilidade,
        ordem: idx,
      }));
      if (rows.length) {
        const { error } = await supabase.from("descricao_cargo_responsabilidades").insert(rows);
        if (error) throw error;
      }

      toast({ title: "Descrição de cargo salva!" });
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selected = selectedIdx !== null ? groups[selectedIdx] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Descrição de Cargo</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1 sm:gap-2 border-b pb-3 overflow-x-auto">
          {STEPS.map((s, idx) => {
            const active = step === s.id;
            const done = step > s.id;
            const label =
              s.id === 2 && totalProcessos > 0 ? `${s.label} (${totalProcessos})` : s.label;
            return (
              <div key={s.id} className="flex items-center gap-1 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(s.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1 text-xs sm:text-sm transition-colors",
                    active && "bg-primary text-primary-foreground",
                    !active && done && "text-primary hover:bg-muted",
                    !active && !done && "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold",
                      active && "bg-primary-foreground text-primary",
                      !active && done && "bg-primary text-primary-foreground",
                      !active && !done && "bg-muted text-muted-foreground"
                    )}
                  >
                    {done ? <Check className="h-3 w-3" /> : s.id}
                  </span>
                  <span className="whitespace-nowrap">{label}</span>
                </button>
                {idx < STEPS.length - 1 && <div className="h-px w-3 sm:w-6 bg-border" />}
              </div>
            );
          })}
        </div>

        <div className="min-h-[340px] py-2">
          {/* Step 1: Missão */}
          {step === 1 && (
            <div className="space-y-2">
              <Label>Missão do Cargo</Label>
              <p className="text-xs text-muted-foreground">
                Descreva em poucas linhas o propósito principal deste cargo.
              </p>
              <Textarea rows={8} value={missao} onChange={(e) => setMissao(e.target.value)} placeholder="Ex.: Garantir a execução das atividades administrativas..." />
            </div>
          )}

          {/* Step 2: Processos & Responsabilidades */}
          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              {/* Lista de processos */}
              <div className="border rounded-md flex flex-col">
                <div className="p-2 border-b flex items-center justify-between bg-muted/30 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Processos</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => fileInputRef.current?.click()} title="Importar de planilha">
                      <Upload className="h-3 w-3 mr-1" /> Importar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" className="h-7" onClick={addGroup}>
                      <Plus className="h-3 w-3 mr-1" /> Novo
                    </Button>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportFile(f);
                  }}
                />
                <div className="flex-1 overflow-y-auto max-h-[420px]">
                  {groups.length === 0 ? (
                    <p className="p-3 text-xs text-muted-foreground italic">Adicione o primeiro processo.</p>
                  ) : (
                    <ul>
                      {groups.map((g, gi) => {
                        const itensValidos = g.itens.filter((i) => i.trim()).length;
                        const isSel = selectedIdx === gi;
                        return (
                          <li
                            key={gi}
                            className={cn(
                              "group flex items-center gap-1 px-2 py-2 border-b cursor-pointer text-sm",
                              isSel ? "bg-primary/10 border-l-2 border-l-primary" : "hover:bg-muted/50"
                            )}
                            onClick={() => setSelectedIdx(gi)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{g.processo || <span className="italic text-muted-foreground">Sem nome</span>}</p>
                              <p className="text-[11px] text-muted-foreground">{itensValidos} {itensValidos === 1 ? "item" : "itens"}</p>
                            </div>
                            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveGroup(gi, -1); }}><ArrowUp className="h-3 w-3" /></Button>
                              <Button type="button" size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); moveGroup(gi, 1); }}><ArrowDown className="h-3 w-3" /></Button>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); rmGroup(gi); }}><Trash2 className="h-3 w-3" /></Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Detalhe do processo */}
              <div className="border rounded-md p-3 min-h-[300px]">
                {!selected ? (
                  <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground p-6">
                    Selecione um processo à esquerda ou clique em <strong className="mx-1">Novo</strong> para começar.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome do processo</Label>
                      <Input
                        ref={processoNameRef}
                        placeholder="Ex.: Gestão de Contratos"
                        value={selected.processo}
                        onChange={(e) => updGroupName(selectedIdx!, e.target.value)}
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-muted-foreground">Principais Responsabilidades</Label>
                        <Button type="button" size="sm" variant="outline" className="h-7" onClick={() => addItem(selectedIdx!)}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar
                        </Button>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Pressione <kbd className="px-1 py-0.5 border rounded text-[10px]">Enter</kbd> para criar uma nova linha.
                      </p>
                      <div className="space-y-2">
                        {selected.itens.map((item, ii) => (
                          <div key={ii} className="flex items-start gap-2">
                            <span className="text-xs text-muted-foreground pt-2 w-5 text-right">{ii + 1}.</span>
                            <Textarea
                              ref={(el) => {
                                const key = `${selectedIdx}:${ii}`;
                                if (el) itemRefs.current.set(key, el);
                                else itemRefs.current.delete(key);
                              }}
                              rows={2}
                              placeholder="Descrição da responsabilidade"
                              value={item}
                              onChange={(e) => updItem(selectedIdx!, ii, e.target.value)}
                              onKeyDown={(e) => onItemKeyDown(e, selectedIdx!, ii)}
                              className="flex-1 min-h-[44px]"
                            />
                            <div className="flex flex-col gap-1">
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveItem(selectedIdx!, ii, -1)}><ArrowUp className="h-3 w-3" /></Button>
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveItem(selectedIdx!, ii, 1)}><ArrowDown className="h-3 w-3" /></Button>
                              <Button type="button" size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => rmItem(selectedIdx!, ii)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        ))}
                        {selected.itens.length === 0 && (
                          <p className="text-xs text-muted-foreground italic">Nenhuma responsabilidade.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Formação */}
          {step === 3 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Formação acadêmica mínima</Label>
                <Textarea rows={5} value={formacaoMinima} onChange={(e) => setFormacaoMinima(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Formação acadêmica desejável</Label>
                <Textarea rows={5} value={formacaoDesejavel} onChange={(e) => setFormacaoDesejavel(e.target.value)} />
              </div>
            </div>
          )}

          {/* Step 4: Competências */}
          {step === 4 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Competências Desejáveis</Label>
                <Button type="button" size="sm" variant="outline" onClick={addComp}>
                  <Plus className="mr-1 h-3 w-3" /> Adicionar
                </Button>
              </div>
              <div className="space-y-2">
                {competencias.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <Input value={c} onChange={(e) => updComp(i, e.target.value)} />
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => moveComp(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => rmComp(i)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                ))}
                {competencias.length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Nenhuma competência cadastrada.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Revisão */}
          {step === 5 && (
            <div className="space-y-5 text-sm">
              <ReviewSection title="Missão do Cargo">
                {missao ? <p className="whitespace-pre-line">{missao}</p> : <Empty />}
              </ReviewSection>
              <ReviewSection title={`Processos e Responsabilidades (${totalProcessos} processos · ${totalItens} itens)`}>
                {groups.length === 0 ? <Empty /> : (
                  <div className="space-y-3">
                    {groups.map((g, i) => (
                      <div key={i} className="border-l-2 border-primary/40 pl-3">
                        <p className="font-semibold">{g.processo || <em className="text-muted-foreground">Sem nome</em>}</p>
                        <ul className="list-disc pl-5 text-muted-foreground">
                          {g.itens.filter((x) => x.trim()).map((x, j) => <li key={j}>{x}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </ReviewSection>
              <ReviewSection title="Formação">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div><p className="text-xs text-muted-foreground uppercase">Mínima</p>{formacaoMinima ? <p>{formacaoMinima}</p> : <Empty />}</div>
                  <div><p className="text-xs text-muted-foreground uppercase">Desejável</p>{formacaoDesejavel ? <p>{formacaoDesejavel}</p> : <Empty />}</div>
                </div>
              </ReviewSection>
              <ReviewSection title="Competências">
                {competencias.filter((c) => c.trim()).length === 0 ? <Empty /> : (
                  <ol className="list-decimal pl-5">
                    {competencias.filter((c) => c.trim()).map((c, i) => <li key={i}>{c}</li>)}
                  </ol>
                )}
              </ReviewSection>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} disabled={step === 1}>Voltar</Button>
            {step < 5 ? (
              <Button onClick={goNext}>Próximo</Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold border-b pb-1 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-muted-foreground italic text-xs">Não preenchido.</p>;
}
