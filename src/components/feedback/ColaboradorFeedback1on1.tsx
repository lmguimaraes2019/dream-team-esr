import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, Users2, Pencil, Target } from "lucide-react";
import { format, parseISO } from "date-fns";
import OneOnOneForm from "./OneOnOneForm";
import FeedbackForm from "./FeedbackForm";
import AcaoDesenvolvimentoForm from "./AcaoDesenvolvimentoForm";
import AcoesDesenvolvimentoList from "./AcoesDesenvolvimentoList";

const TIPO_FB_LABEL: Record<string, string> = {
  positivo: "Positivo",
  construtivo: "Construtivo",
  reconhecimento: "Reconhecimento",
  ajuste: "Ajuste",
};

const TIPO_FB_COLOR: Record<string, string> = {
  positivo: "bg-green-500",
  construtivo: "bg-blue-500",
  reconhecimento: "bg-amber-500",
  ajuste: "bg-red-500",
};

interface Props {
  colaboradorId: string;
}

export default function ColaboradorFeedback1on1({ colaboradorId }: Props) {
  const { isAdmin, isGestor } = useAuth();
  const canEdit = isAdmin || isGestor;
  const [oneOnOnes, setOneOnOnes] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [oooFormOpen, setOooFormOpen] = useState(false);
  const [editOoo, setEditOoo] = useState<any>(null);
  const [fbFormOpen, setFbFormOpen] = useState(false);
  const [acaoFormOpen, setAcaoFormOpen] = useState(false);
  const [acaoOrigem, setAcaoOrigem] = useState<{ tipo: "one_on_one" | "feedback"; id: string } | null>(null);

  const load = async () => {
    const [oooRes, fbRes, acaoRes] = await Promise.all([
      supabase.from("one_on_one").select("*").eq("colaborador_id", colaboradorId).order("data", { ascending: false }),
      supabase.from("feedback").select("*").eq("colaborador_id", colaboradorId).order("data", { ascending: false }),
      supabase.from("desenvolvimento_acoes").select("*").eq("colaborador_id", colaboradorId).order("created_at", { ascending: false }),
    ]);
    setOneOnOnes(oooRes.data || []);
    setFeedbacks(fbRes.data || []);
    setAcoes(acaoRes.data || []);
  };

  useEffect(() => { load(); }, [colaboradorId]);

  const ultimo1on1 = oneOnOnes[0];

  const handleNewAcaoFrom = (tipo: "one_on_one" | "feedback", id: string) => {
    setAcaoOrigem({ tipo, id });
    setAcaoFormOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Feedback e 1:1</h2>
        {canEdit && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => { setEditOoo(null); setOooFormOpen(true); }}>
              <Users2 className="mr-1 h-4 w-4" />Novo 1:1
            </Button>
            <Button size="sm" variant="outline" onClick={() => setFbFormOpen(true)}>
              <MessageSquare className="mr-1 h-4 w-4" />Novo Feedback
            </Button>
          </div>
        )}
      </div>

      {/* Último 1:1 */}
      {ultimo1on1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Último 1:1 — {format(parseISO(ultimo1on1.data), "dd/MM/yyyy")}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant={ultimo1on1.status === "realizado" ? "default" : "secondary"}>
                  {ultimo1on1.status === "realizado" ? "Realizado" : "Planejado"}
                </Badge>
                {ultimo1on1.confidencial && <Badge variant="outline" className="text-xs">Confidencial</Badge>}
                {canEdit && (
                  <Button variant="ghost" size="icon" onClick={() => { setEditOoo(ultimo1on1); setOooFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>{ultimo1on1.resumo}</p>
            {ultimo1on1.pontos_positivos && <div><span className="font-medium text-green-600">Positivos:</span> {ultimo1on1.pontos_positivos}</div>}
            {ultimo1on1.pontos_atencao && <div><span className="font-medium text-amber-600">Atenção:</span> {ultimo1on1.pontos_atencao}</div>}
            {ultimo1on1.proximos_passos && <div><span className="font-medium text-blue-600">Próximos passos:</span> {ultimo1on1.proximos_passos}</div>}
            {canEdit && (
              <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => handleNewAcaoFrom("one_on_one", ultimo1on1.id)}>
                <Target className="mr-1 h-3 w-3" />Criar ação de desenvolvimento
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Histórico de 1:1 */}
      {oneOnOnes.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Histórico de 1:1</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y">
              {oneOnOnes.slice(1).map((o) => (
                <div key={o.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{format(parseISO(o.data), "dd/MM/yyyy")}</span>
                    <Badge variant={o.status === "realizado" ? "default" : "secondary"} className="text-xs">
                      {o.status === "realizado" ? "Realizado" : "Planejado"}
                    </Badge>
                    {o.confidencial && <Badge variant="outline" className="text-xs">Confidencial</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{o.resumo}</span>
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => { setEditOoo(o); setOooFormOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleNewAcaoFrom("one_on_one", o.id)}>
                          <Target className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedbacks */}
      <Card>
        <CardHeader><CardTitle className="text-base">Feedbacks</CardTitle></CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum feedback registrado.</p>
          ) : (
            <div className="divide-y">
              {feedbacks.map((f) => (
                <div key={f.id} className="py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{format(parseISO(f.data), "dd/MM/yyyy")}</span>
                    <Badge className={`${TIPO_FB_COLOR[f.tipo] || ""} text-white border-0 text-xs`}>
                      {TIPO_FB_LABEL[f.tipo] || f.tipo}
                    </Badge>
                  </div>
                  <p className="text-sm">{f.descricao}</p>
                  {f.impacto && <p className="text-xs text-muted-foreground">Impacto: {f.impacto}</p>}
                  {canEdit && (
                    <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => handleNewAcaoFrom("feedback", f.id)}>
                      <Target className="mr-1 h-3 w-3" />Criar ação
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ações de Desenvolvimento */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Ações de Desenvolvimento</CardTitle>
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => { setAcaoOrigem(null); setAcaoFormOpen(true); }}>
                <Plus className="mr-1 h-4 w-4" />Nova Ação
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <AcoesDesenvolvimentoList acoes={acoes} colaboradorId={colaboradorId} onRefresh={load} />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <OneOnOneForm
        colaboradorId={colaboradorId}
        existing={editOoo}
        open={oooFormOpen}
        onOpenChange={setOooFormOpen}
        onSaved={load}
      />
      <FeedbackForm
        colaboradorId={colaboradorId}
        open={fbFormOpen}
        onOpenChange={setFbFormOpen}
        onSaved={load}
      />
      <AcaoDesenvolvimentoForm
        colaboradorId={colaboradorId}
        origemTipo={acaoOrigem?.tipo}
        origemId={acaoOrigem?.id}
        open={acaoFormOpen}
        onOpenChange={setAcaoFormOpen}
        onSaved={load}
      />
    </div>
  );
}
