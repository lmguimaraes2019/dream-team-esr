import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, CheckCircle, Clock, AlertCircle } from "lucide-react";
import AcaoDesenvolvimentoForm from "./AcaoDesenvolvimentoForm";
import { useAuth } from "@/contexts/AuthContext";

interface AcaoDev {
  id: string;
  colaborador_id: string;
  origem_tipo: string | null;
  origem_id: string | null;
  descricao: string;
  tipo: string;
  prazo: string | null;
  status: string;
  evidencia: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline"; icon: any }> = {
  pendente: { label: "Pendente", variant: "outline", icon: AlertCircle },
  em_andamento: { label: "Em andamento", variant: "secondary", icon: Clock },
  concluido: { label: "Concluído", variant: "default", icon: CheckCircle },
};

const TIPO_LABEL: Record<string, string> = {
  curso: "Curso",
  pratica: "Prática",
  comportamento: "Comportamento",
};

interface Props {
  acoes: AcaoDev[];
  colaboradorId: string;
  onRefresh: () => void;
}

export default function AcoesDesenvolvimentoList({ acoes, colaboradorId, onRefresh }: Props) {
  const { isAdmin, isGestor } = useAuth();
  const canEdit = isAdmin || isGestor;
  const [editAcao, setEditAcao] = useState<AcaoDev | null>(null);

  if (acoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma ação de desenvolvimento registrada.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {acoes.map((a) => {
          const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pendente;
          const Icon = cfg.icon;
          return (
            <div key={a.id} className="flex items-start justify-between border rounded-lg p-3 gap-2">
              <div className="flex-1 space-y-1">
                <p className="text-sm">{a.descricao}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={cfg.variant} className="text-xs gap-1">
                    <Icon className="h-3 w-3" />{cfg.label}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{TIPO_LABEL[a.tipo] || a.tipo}</Badge>
                  {a.prazo && (
                    <span className="text-xs text-muted-foreground">Prazo: {new Date(a.prazo).toLocaleDateString("pt-BR")}</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button variant="ghost" size="icon" onClick={() => setEditAcao(a)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {editAcao && (
        <AcaoDesenvolvimentoForm
          colaboradorId={colaboradorId}
          existing={editAcao}
          open={!!editAcao}
          onOpenChange={(v) => !v && setEditAcao(null)}
          onSaved={onRefresh}
        />
      )}
    </>
  );
}
