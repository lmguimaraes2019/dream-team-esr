import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Pencil } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";
import { nivelLabel } from "@/lib/nivelLabels";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import ColaboradorEditDialog from "@/components/ColaboradorEditDialog";
import SalaryRangeRuler from "@/components/SalaryRangeRuler";

type Colaborador = Tables<"colaboradores">;
type CustoMensal = Tables<"custos_mensais">;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ColaboradorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [colab, setColab] = useState<Colaborador | null>(null);
  const [custo, setCusto] = useState<CustoMensal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const { isAdmin } = useAuth();

  const loadData = () => {
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
  };

  useEffect(() => { loadData(); }, [id]);

  if (!colab) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const now = new Date();
  const admissao = parseISO(colab.data_admissao);
  const anos = differenceInYears(now, admissao);
  const mesesRestantes = differenceInMonths(now, admissao) % 12;
  const tempoCasa = `${anos} ano${anos !== 1 ? "s" : ""} e ${mesesRestantes} ${mesesRestantes !== 1 ? "meses" : "mês"}`;

  const initials = colab.nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const fotoUrl = (colab as any).foto_url;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/colaboradores"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <Avatar className="h-20 w-20">
          {fotoUrl ? <AvatarImage src={fotoUrl} alt={colab.nome} className="object-cover" /> : null}
          <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-3xl font-bold">{colab.nome}</h1>
          <Badge variant={colab.tipo_vinculo === "clt" ? "default" : "outline"} className="mt-1">
            {colab.tipo_vinculo.toUpperCase()}
          </Badge>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="ml-auto">
            <Pencil className="mr-2 h-4 w-4" />Editar
          </Button>
        )}
      </div>

      {isAdmin && (
        <ColaboradorEditDialog
          colaborador={colab}
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={loadData}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2">
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

        <Card>
          <CardHeader><CardTitle className="text-base">Estrutura de Carreira</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Cargo" value={colab.cargo} />
            <Row label="Trajetória" value={colab.trajetoria} />
            <Row label="Nível de Complexidade" value={nivelLabel(colab.nivel_complexidade)} />
            <Row label="Grupo" value={String(colab.grupo)} />
            {custo && (
              <SalaryRangeRuler
                trajetoria={colab.trajetoria}
                nivel_complexidade={colab.nivel_complexidade}
                grupo={colab.grupo}
                salario={custo.salario_base}
              />
            )}
          </CardContent>
        </Card>
      </div>

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

function CustoItem({ label, value }: { label: number; value: number } | { label: string; value: number }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{fmt(value)}</span>
    </div>
  );
}
