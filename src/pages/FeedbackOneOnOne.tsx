import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users2, MessageSquare, Target, Plus, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Link } from "react-router-dom";
import OneOnOneForm from "@/components/feedback/OneOnOneForm";
import FeedbackForm from "@/components/feedback/FeedbackForm";
import AcaoDesenvolvimentoForm from "@/components/feedback/AcaoDesenvolvimentoForm";
import AcoesDesenvolvimentoList from "@/components/feedback/AcoesDesenvolvimentoList";

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

export default function FeedbackOneOnOne() {
  const { isAdmin, isGestor } = useAuth();
  const canEdit = isAdmin || isGestor;
  const [search, setSearch] = useState("");
  const [gerenciaFilter, setGerenciaFilter] = useState("all");
  const [gerencias, setGerencias] = useState<string[]>([]);
  const [oneOnOnes, setOneOnOnes] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [acoes, setAcoes] = useState<any[]>([]);
  const [colaboradores, setColaboradores] = useState<any[]>([]);

  // Form states
  const [oooFormOpen, setOooFormOpen] = useState(false);
  const [oooColabId, setOooColabId] = useState("");
  const [fbFormOpen, setFbFormOpen] = useState(false);
  const [fbColabId, setFbColabId] = useState("");

  const load = async () => {
    const [colabRes, oooRes, fbRes, acaoRes] = await Promise.all([
      supabase.from("colaboradores").select("id, nome, gerencia").eq("ativo", true).order("nome"),
      supabase.from("one_on_one").select("*, colaboradores(nome, gerencia)").order("data", { ascending: false }).limit(100),
      supabase.from("feedback").select("*, colaboradores(nome, gerencia)").order("data", { ascending: false }).limit(100),
      supabase.from("desenvolvimento_acoes").select("*, colaboradores(nome, gerencia)").neq("status", "concluido").order("created_at", { ascending: false }),
    ]);
    setColaboradores(colabRes.data || []);
    setGerencias([...new Set((colabRes.data || []).map((c: any) => c.gerencia))].sort());
    setOneOnOnes(oooRes.data || []);
    setFeedbacks(fbRes.data || []);
    setAcoes(acaoRes.data || []);
  };

  useEffect(() => { load(); }, []);

  const filterBySearch = (items: any[]) => {
    if (!search) return items;
    const s = search.toLowerCase();
    return items.filter((i) => (i.colaboradores as any)?.nome?.toLowerCase().includes(s));
  };

  const filterByGerencia = (items: any[]) => {
    if (gerenciaFilter === "all") return items;
    return items.filter((i) => (i.colaboradores as any)?.gerencia === gerenciaFilter);
  };

  const applyFilters = (items: any[]) => filterByGerencia(filterBySearch(items));

  const filteredOoo = applyFilters(oneOnOnes);
  const filteredFb = applyFilters(feedbacks);
  const filteredAcoes = applyFilters(acoes);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Feedback e 1:1</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar colaborador..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={gerenciaFilter} onValueChange={setGerenciaFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Gerência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas gerências</SelectItem>
            {gerencias.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="1on1">
        <TabsList>
          <TabsTrigger value="1on1" className="gap-1"><Users2 className="h-4 w-4" />1:1</TabsTrigger>
          <TabsTrigger value="feedback" className="gap-1"><MessageSquare className="h-4 w-4" />Feedbacks</TabsTrigger>
          <TabsTrigger value="acoes" className="gap-1"><Target className="h-4 w-4" />Ações</TabsTrigger>
        </TabsList>

        <TabsContent value="1on1" className="space-y-4">
          {canEdit && (
            <div className="flex gap-2 items-end">
              <Select value={oooColabId} onValueChange={setOooColabId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Selecione colaborador" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!oooColabId} onClick={() => setOooFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />Novo 1:1
              </Button>
            </div>
          )}
          {filteredOoo.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum 1:1 encontrado.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredOoo.map((o) => (
                <Card key={o.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link to={`/colaboradores/${o.colaborador_id}`} className="font-medium hover:underline text-sm">
                          {(o.colaboradores as any)?.nome}
                        </Link>
                        <span className="text-sm text-muted-foreground">{format(parseISO(o.data), "dd/MM/yyyy")}</span>
                        <Badge variant={o.status === "realizado" ? "default" : "secondary"} className="text-xs">
                          {o.status === "realizado" ? "Realizado" : "Planejado"}
                        </Badge>
                        {o.confidencial && <Badge variant="outline" className="text-xs">Confidencial</Badge>}
                      </div>
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground truncate">{o.resumo}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          {canEdit && (
            <div className="flex gap-2 items-end">
              <Select value={fbColabId} onValueChange={setFbColabId}>
                <SelectTrigger className="w-60"><SelectValue placeholder="Selecione colaborador" /></SelectTrigger>
                <SelectContent>
                  {colaboradores.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!fbColabId} onClick={() => setFbFormOpen(true)}>
                <Plus className="mr-1 h-4 w-4" />Novo Feedback
              </Button>
            </div>
          )}
          {filteredFb.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum feedback encontrado.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredFb.map((f) => (
                <Card key={f.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link to={`/colaboradores/${f.colaborador_id}`} className="font-medium hover:underline text-sm">
                        {(f.colaboradores as any)?.nome}
                      </Link>
                      <span className="text-sm text-muted-foreground">{format(parseISO(f.data), "dd/MM/yyyy")}</span>
                      <Badge className={`${TIPO_FB_COLOR[f.tipo] || ""} text-white border-0 text-xs`}>
                        {TIPO_FB_LABEL[f.tipo] || f.tipo}
                      </Badge>
                    </div>
                    <p className="text-sm mt-1">{f.descricao}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="acoes" className="space-y-4">
          {filteredAcoes.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma ação pendente.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filteredAcoes.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Link to={`/colaboradores/${a.colaborador_id}`} className="font-medium hover:underline text-sm">
                        {(a.colaboradores as any)?.nome}
                      </Link>
                    </div>
                    <AcoesDesenvolvimentoList acoes={[a]} colaboradorId={a.colaborador_id} onRefresh={load} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {oooColabId && (
        <OneOnOneForm colaboradorId={oooColabId} open={oooFormOpen} onOpenChange={setOooFormOpen} onSaved={load} />
      )}
      {fbColabId && (
        <FeedbackForm colaboradorId={fbColabId} open={fbFormOpen} onOpenChange={setFbFormOpen} onSaved={load} />
      )}
    </div>
  );
}
