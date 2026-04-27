import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DescricaoCargoEditDialog, { DescricaoCargoData, Responsabilidade } from "./DescricaoCargoEditDialog";

interface Props {
  colaboradorId: string;
}

export default function DescricaoCargoCard({ colaboradorId }: Props) {
  const [data, setData] = useState<DescricaoCargoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const { isAdmin } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    const { data: dc } = await supabase
      .from("descricao_cargo")
      .select("*")
      .eq("colaborador_id", colaboradorId)
      .maybeSingle();

    if (!dc) {
      setData(null);
      setLoading(false);
      return;
    }

    const { data: resp } = await supabase
      .from("descricao_cargo_responsabilidades")
      .select("processo, responsabilidade, ordem")
      .eq("descricao_cargo_id", dc.id)
      .order("ordem", { ascending: true });

    setData({
      missao: dc.missao || "",
      formacao_minima: dc.formacao_minima || "",
      formacao_desejavel: dc.formacao_desejavel || "",
      competencias: dc.competencias || [],
      responsabilidades: (resp || []).map((r) => ({ processo: r.processo, responsabilidade: r.responsabilidade } as Responsabilidade)),
    });
    setLoading(false);
  }, [colaboradorId]);

  useEffect(() => {
    load();
  }, [load]);

  // Group responsabilidades by processo (preserving order)
  const grouped: { processo: string; itens: string[] }[] = [];
  if (data) {
    for (const r of data.responsabilidades) {
      const last = grouped[grouped.length - 1];
      if (last && last.processo === r.processo) last.itens.push(r.responsabilidade);
      else grouped.push({ processo: r.processo, itens: [r.responsabilidade] });
    }
  }

  const isEmpty =
    !data ||
    (!data.missao &&
      !data.formacao_minima &&
      !data.formacao_desejavel &&
      data.competencias.length === 0 &&
      data.responsabilidades.length === 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Descrição de Cargo</CardTitle>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              {isEmpty ? "Cadastrar" : "Editar"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : isEmpty ? (
          <p className="text-muted-foreground italic">Nenhuma descrição de cargo cadastrada.</p>
        ) : (
          <>
            {data!.missao && (
              <Section title="Missão do Cargo">
                <p className="whitespace-pre-line leading-relaxed">{data!.missao}</p>
              </Section>
            )}

            {grouped.length > 0 && (
              <Section title="Processos e Principais Responsabilidades">
                <ProcessosAccordion grouped={grouped} />
              </Section>
            )}

            {(data!.formacao_minima || data!.formacao_desejavel) && (
              <Section title="Características do Cargo">
                <div className="grid gap-3 sm:grid-cols-2">
                  {data!.formacao_minima && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Formação acadêmica mínima</p>
                      <p>{data!.formacao_minima}</p>
                    </div>
                  )}
                  {data!.formacao_desejavel && (
                    <div>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Formação acadêmica desejável</p>
                      <p>{data!.formacao_desejavel}</p>
                    </div>
                  )}
                </div>
              </Section>
            )}

            {data!.competencias.length > 0 && (
              <Section title="Competências Desejáveis">
                <ol className="list-decimal pl-5 space-y-1">
                  {data!.competencias.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ol>
              </Section>
            )}
          </>
        )}
      </CardContent>

      {isAdmin && (
        <DescricaoCargoEditDialog
          colaboradorId={colaboradorId}
          open={editOpen}
          onOpenChange={setEditOpen}
          initial={data}
          onSaved={load}
        />
      )}
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-sm border-b pb-1 mb-3">{title}</h3>
      {children}
    </div>
  );
}
