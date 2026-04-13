import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { Tables } from "@/integrations/supabase/types";

type Colaborador = Tables<"colaboradores">;

interface OrgNode {
  colaborador: Colaborador;
  children: OrgNode[];
}

function buildTree(colaboradores: Colaborador[]): { roots: OrgNode[]; byArea: Record<string, OrgNode[]> } {
  const byName = new Map<string, Colaborador>();
  colaboradores.forEach((c) => byName.set(c.nome, c));

  const nodeMap = new Map<string, OrgNode>();
  colaboradores.forEach((c) => nodeMap.set(c.id, { colaborador: c, children: [] }));

  const roots: OrgNode[] = [];

  colaboradores.forEach((c) => {
    const node = nodeMap.get(c.id)!;
    if (c.gestor_direto && byName.has(c.gestor_direto)) {
      const parent = byName.get(c.gestor_direto)!;
      nodeMap.get(parent.id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Group roots by gerencia
  const byArea: Record<string, OrgNode[]> = {};
  roots.forEach((r) => {
    const area = r.colaborador.gerencia;
    if (!byArea[area]) byArea[area] = [];
    byArea[area].push(r);
  });

  return { roots, byArea };
}

function OrgCard({ node, navigate }: { node: OrgNode; navigate: (path: string) => void }) {
  const c = node.colaborador;
  const initials = c.nome.split(" ").map((n) => n[0]).slice(0, 2).join("");

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex flex-col items-center p-1.5 rounded-md border bg-card hover:shadow-md transition-shadow cursor-pointer min-w-[70px]"
        onClick={() => navigate(`/colaboradores/${c.id}`)}
      >
        <Avatar className="h-6 w-6 mb-1">
          {c.foto_url ? <AvatarImage src={c.foto_url} alt={c.nome} /> : null}
          <AvatarFallback className="text-[8px] font-medium">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-[9px] font-semibold text-center leading-tight">{c.nome}</span>
        <span className="text-[8px] text-muted-foreground text-center mt-0.5">{c.cargo}</span>
      </div>

      {node.children.length > 0 && (
        <>
          <div className="w-px h-2 bg-border" />
          <div className="relative flex gap-2">
            {node.children.length > 1 && (
              <div className="absolute top-0 left-[calc(50%-50%+70px)] right-[calc(50%-50%+70px)] h-px bg-border" style={{ left: '70px', right: '70px', width: 'auto' }} />
            )}
            {node.children.map((child) => (
              <div key={child.colaborador.id} className="flex flex-col items-center">
                <div className="w-px h-2 bg-border" />
                <OrgCard node={child} navigate={navigate} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Organograma() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("colaboradores")
      .select("*")
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setColaboradores(data || []));
  }, []);

  if (colaboradores.length === 0) return null;

  const { byArea } = buildTree(colaboradores);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organograma</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="flex gap-12 pb-4">
            {Object.entries(byArea).sort(([a], [b]) => a.localeCompare(b)).map(([area, nodes]) => (
              <div key={area} className="flex flex-col items-center">
                <span className="text-sm font-bold text-primary mb-3 px-3 py-1 rounded-full bg-primary/10">{area}</span>
                <div className="flex gap-6">
                  {nodes.map((node) => (
                    <OrgCard key={node.colaborador.id} node={node} navigate={navigate} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
