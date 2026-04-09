import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";

type Colaborador = Tables<"colaboradores">;
type CustoMensal = Tables<"custos_mensais">;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ColaboradorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [colab, setColab] = useState<Colaborador | null>(null);
  const [custo, setCusto] = useState<CustoMensal | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from("colaboradores").select("*").eq("id", id).single().then(({ data }) => setColab(data));
    supabase
      .from("custos_mensais")
      .select("*")
      .eq("colaborador_id", id)
      .order("mes_referencia", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setCusto(data));
  }, [id]);

  if (!colab) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const now = new Date();
  const admissao = parseISO(colab.data_admissao);
  const anos = differenceInYears(now, admissao);
  const mesesRestantes = differenceInMonths(now, admissao) % 12;
  const tempoCasa = `${anos} ano${anos !== 1 ? "s" : ""} e ${mesesRestantes} ${mesesRestantes !== 1 ? "meses" : "mês"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/colaboradores"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-3xl font-bold">{colab.nome}</h1>
        <Badge variant={colab.tipo_vinculo === "clt" ? "default" : "outline"}>
          {colab.tipo_vinculo.toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Dados gerais */}
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Matrícula" value={colab.matricula} />
            <Row label="Gênero" value={colab.genero.charAt(0).toUpperCase() + colab.genero.slice(1)} />
            <Row label="Liderança" value={colab.lideranca ? "Sim" : "Não"} />
            <Row label="Data de Admissão" value={new Date(colab.data_admissao).toLocaleDateString("pt-BR")} />
            <Row label="Tempo de Casa" value={tempoCasa} />
            <Row label="Gerência" value={colab.gerencia} />
            <Row label="Diretoria" value={colab.diretoria} />
          </CardContent>
        </Card>

        {/* Estrutura */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estrutura de Carreira</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Cargo" value={colab.cargo} />
            <Row label="Trajetória" value={colab.trajetoria} />
            <Row label="Nível" value={colab.nivel_complexidade.charAt(0).toUpperCase() + colab.nivel_complexidade.slice(1)} />
            <Row label="Grupo" value={String(colab.grupo)} />
          </CardContent>
        </Card>
      </div>

      {/* Custos */}
      {custo ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Custos Detalhados — {custo.mes_referencia}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <CustoSection title="Salário">
                <CustoItem label="Salário Base" value={custo.salario_base} />
              </CustoSection>
              <CustoSection title="Encargos">
                <CustoItem label="INSS" value={custo.inss} />
                <CustoItem label="FGTS" value={custo.fgts} />
                <CustoItem label="PIS" value={custo.pis} />
              </CustoSection>
              <CustoSection title="Benefícios">
                <CustoItem label="VR/VA" value={custo.vr_va} />
                <CustoItem label="VT" value={custo.vt} />
                <CustoItem label="Plano de Saúde" value={custo.plano_saude} />
                <CustoItem label="Seguro" value={custo.seguro} />
                <CustoItem label="Internet" value={custo.internet} />
              </CustoSection>
              <CustoSection title="Provisões">
                <CustoItem label="Férias" value={custo.ferias} />
                <CustoItem label="1/3 Férias" value={custo.um_terco_ferias} />
                <CustoItem label="13º" value={custo.decimo_terceiro} />
              </CustoSection>
            </div>
            <div className="mt-6 flex gap-6 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal</p>
                <p className="text-xl font-bold text-primary">{fmt(custo.custo_mensal)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Anual</p>
                <p className="text-xl font-bold">{fmt(custo.custo_anual)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum custo registrado para este colaborador.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CustoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm border-b pb-1">{title}</h4>
      {children}
    </div>
  );
}

function CustoItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{fmt(value)}</span>
    </div>
  );
}
