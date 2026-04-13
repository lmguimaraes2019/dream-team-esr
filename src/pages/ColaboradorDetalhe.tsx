import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import { differenceInYears, differenceInMonths, parseISO } from "date-fns";
import { nivelLabel } from "@/lib/nivelLabels";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import ColaboradorEditDialog from "@/components/ColaboradorEditDialog";
import SalaryRangeRuler from "@/components/SalaryRangeRuler";
import ColaboradorFerias from "@/components/ferias/ColaboradorFerias";
import ColaboradorFeedback1on1 from "@/components/feedback/ColaboradorFeedback1on1";
import MovimentacoesCarreiraCard from "@/components/MovimentacoesCarreiraCard";
import { useToast } from "@/hooks/use-toast";

type Colaborador = Tables<"colaboradores">;
type CustoMensal = Tables<"custos_mensais">;

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function ColaboradorDetalhe() {
  const { id } = useParams<{ id: string }>();
  const [colab, setColab] = useState<Colaborador | null>(null);
  const [custo, setCusto] = useState<CustoMensal | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [ausenciaAtiva, setAusenciaAtiva] = useState<{ tipo: string; label: string } | null>(null);
  const [temFeriasNoCiclo, setTemFeriasNoCiclo] = useState(true);
  const [showCustos, setShowCustos] = useState(false);
  const [ultimaMovimentacao, setUltimaMovimentacao] = useState<{ tipo: string; data: string } | null>(null);
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
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

    // Check active absence from ferias_periodos + licencas
    const today = new Date().toISOString().split("T")[0];
    const [{ data: feriasAtivas }, { data: licencasAtivas }] = await Promise.all([
      supabase.from("ferias_periodos").select("id").eq("colaborador_id", id).in("status", ["agendada", "concluida"]).lte("data_inicio", today).gte("data_fim", today).limit(1).maybeSingle(),
      supabase.from("licencas").select("id, tipo").eq("colaborador_id", id).lte("data_inicio", today).gte("data_fim", today).limit(1).maybeSingle(),
    ]);

    if (feriasAtivas) {
      setAusenciaAtiva({ tipo: "ferias", label: "Férias" });
    } else if (licencasAtivas) {
      const labels: Record<string, string> = { medica: "Lic. Médica", maternidade: "Lic. Maternidade", outros: "Licença" };
      setAusenciaAtiva({ tipo: licencasAtivas.tipo, label: labels[licencasAtivas.tipo] || "Licença" });
    } else {
      setAusenciaAtiva(null);
    }

    // Check if CLT has scheduled vacation (any non-cancelled ferias)
    const { data: feriasAgendadas } = await supabase
      .from("ferias_periodos")
      .select("id")
      .eq("colaborador_id", id)
      .neq("status", "cancelada")
      .limit(1)
      .maybeSingle();
    setTemFeriasNoCiclo(!!feriasAgendadas);

    // Last career movement
    const { data: lastMov } = await supabase
      .from("movimentacoes_carreira" as any)
      .select("data, tipo_movimentacao")
      .eq("colaborador_id", id)
      .order("data", { ascending: false })
      .limit(1)
      .maybeSingle();
    setUltimaMovimentacao(lastMov ? { tipo: (lastMov as any).tipo_movimentacao, data: (lastMov as any).data } : null);
  };

  useEffect(() => { loadData(); }, [id]);

  const handleDelete = async () => {
    if (!id) return;
    const { error } = await supabase.from("colaboradores").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Colaborador excluído!" });
      navigate("/colaboradores");
    }
  };

  if (!colab) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  const isTerceirizado = colab.tipo_vinculo === "terceirizado";
  const now = new Date();
  const admissao = parseISO(colab.data_admissao);
  const anos = differenceInYears(now, admissao);
  const mesesRestantes = differenceInMonths(now, admissao) % 12;
  const tempoCasa = `${anos} ano${anos !== 1 ? "s" : ""} e ${mesesRestantes} ${mesesRestantes !== 1 ? "meses" : "mês"}`;
  const initials = colab.nome.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
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
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold">{colab.nome}</h1>
            {ausenciaAtiva && (
              <Badge className="bg-amber-500 text-white border-0">{ausenciaAtiva.label}</Badge>
            )}
            {!temFeriasNoCiclo && colab.tipo_vinculo === "clt" && (
              <Badge className="bg-destructive text-destructive-foreground border-0 text-xs">Sem férias previstas</Badge>
            )}
          </div>
          <Badge variant={colab.tipo_vinculo === "clt" ? "default" : "outline"} className="mt-1">
            {colab.tipo_vinculo.toUpperCase()}
          </Badge>
        </div>
        {isAdmin && (
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 h-4 w-4" />Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Excluir</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir colaborador?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {isAdmin && (
        <ColaboradorEditDialog colaborador={colab} open={editOpen} onOpenChange={setEditOpen} onSaved={loadData} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Dados Gerais</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!isTerceirizado && <Row label="Matrícula" value={colab.matricula || "—"} />}
            <Row label="Gênero" value={colab.genero.charAt(0).toUpperCase() + colab.genero.slice(1)} />
            <Row label="Liderança" value={colab.lideranca ? "Sim" : "Não"} />
            <Row label="Data de Admissão" value={new Date(colab.data_admissao).toLocaleDateString("pt-BR")} />
            <Row label="Tempo de Casa" value={tempoCasa} />
            {ultimaMovimentacao && (() => {
              const movDate = parseISO(ultimaMovimentacao.data);
              const anosM = differenceInYears(now, movDate);
              const mesesM = differenceInMonths(now, movDate) % 12;
              const tempoMov = `${anosM} ano${anosM !== 1 ? "s" : ""} e ${mesesM} ${mesesM !== 1 ? "meses" : "mês"}`;
              return (
                <>
                  <Row label="Última Movimentação" value={`${ultimaMovimentacao.tipo} (${tempoMov})`} />
                </>
              );
            })()}
            <Row label="Gerência" value={colab.gerencia} />
            <Row label="Diretoria" value={colab.diretoria} />
            {!isTerceirizado && (colab as any).origem_recurso && (
              <Row label="Origem de Recurso" value={(colab as any).origem_recurso} />
            )}
            {(colab as any).gestor_direto && (
              <Row label="Gestor Direto" value={(colab as any).gestor_direto} />
            )}
          </CardContent>
        </Card>

        {isTerceirizado ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Dados do Contrato</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Empresa" value={(colab as any).empresa_terceirizada || "—"} />
              <Row label="Custo Mensal" value={(colab as any).custo_mensal_terceirizado ? fmt((colab as any).custo_mensal_terceirizado) : "—"} />
              <Row label="Duração do Contrato" value={(colab as any).duracao_contrato || "—"} />
              <Row label="Gestor do Contrato" value={(colab as any).gestor_contrato || "—"} />
              <Row label="Cargo" value={colab.cargo} />
              <Row label="Trajetória" value={colab.trajetoria} />
              <Row label="Nível de Complexidade" value={nivelLabel(colab.nivel_complexidade)} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Estrutura de Carreira</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label="Cargo" value={colab.cargo} />
              <Row label="Trajetória" value={colab.trajetoria} />
              <Row label="Nível de Complexidade" value={nivelLabel(colab.nivel_complexidade)} />
              <Row label="Grupo" value={String(colab.grupo)} />
              {custo && (
                <SalaryRangeRuler trajetoria={colab.trajetoria} nivel_complexidade={colab.nivel_complexidade} grupo={colab.grupo} salario={custo.salario_base} />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Movimentações de Carreira */}
      <MovimentacoesCarreiraCard colaboradorId={colab.id} />

      {/* Férias e Licenças */}
      <ColaboradorFerias colaboradorId={colab.id} />

      {/* Feedback e 1:1 */}
      <ColaboradorFeedback1on1 colaboradorId={colab.id} />

      {/* Custos detalhados — only for CLT */}
      {!isTerceirizado && custo ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Custos Detalhados</CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">Dados de {custo.mes_referencia}</span>
                <Button variant="ghost" size="icon" onClick={() => setShowCustos(!showCustos)} className="h-8 w-8">
                  {showCustos ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <CustoSection title="Salário"><CustoItem label="Salário Base" value={custo.salario_base} show={showCustos} /></CustoSection>
              <CustoSection title="Encargos">
                <CustoItem label="INSS" value={custo.inss} show={showCustos} />
                <CustoItem label="FGTS" value={custo.fgts} show={showCustos} />
                <CustoItem label="PIS" value={custo.pis} show={showCustos} />
              </CustoSection>
              <CustoSection title="Benefícios">
                <CustoItem label="VR/VA" value={custo.vr_va} show={showCustos} />
                <CustoItem label="VT" value={custo.vt} show={showCustos} />
                <CustoItem label="Pl. Saúde e Odont." value={custo.plano_saude} show={showCustos} />
                <CustoItem label="Seguro" value={custo.seguro} show={showCustos} />
                <CustoItem label="Internet" value={custo.internet} show={showCustos} />
              </CustoSection>
              <CustoSection title="Provisões">
                <CustoItem label="Férias" value={custo.ferias} show={showCustos} />
                <CustoItem label="1/3 Férias" value={custo.um_terco_ferias} show={showCustos} />
                <CustoItem label="13º" value={custo.decimo_terceiro} show={showCustos} />
              </CustoSection>
            </div>
            <div className="mt-6 flex gap-6 border-t pt-4">
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal</p>
                <p className="text-xl font-bold text-primary">{showCustos ? fmt(custo.custo_mensal) : "••••••"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Anual</p>
                <p className="text-xl font-bold">{showCustos ? fmt(custo.custo_anual) : "••••••"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : !isTerceirizado ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum custo registrado.</CardContent></Card>
      ) : null}

      {isTerceirizado && (colab as any).custo_mensal_terceirizado && (
        <Card>
          <CardHeader><CardTitle className="text-base">Resumo de Custos</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Custo Mensal</p>
                <p className="text-xl font-bold text-primary">{fmt((colab as any).custo_mensal_terceirizado)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Anual</p>
                <p className="text-xl font-bold">{fmt((colab as any).custo_mensal_terceirizado * 12)}</p>
              </div>
            </div>
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

function CustoItem({ label, value, show }: { label: string; value: number; show: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{show ? fmt(value) : "••••••"}</span>
    </div>
  );
}
