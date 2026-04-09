import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrigensRecurso() {
  const [origens, setOrigens] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("origens_recurso").select("nome").order("nome").then(({ data }) => {
      setOrigens((data || []).map((d: any) => d.nome));
    });
  }, []);

  return origens;
}
