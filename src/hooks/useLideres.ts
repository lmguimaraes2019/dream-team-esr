import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Lider {
  id: string;
  nome: string;
}

export function useLideres() {
  const [lideres, setLideres] = useState<Lider[]>([]);

  useEffect(() => {
    supabase
      .from("colaboradores")
      .select("id, nome")
      .eq("lideranca", true)
      .eq("ativo", true)
      .order("nome")
      .then(({ data }) => setLideres(data || []));
  }, []);

  return lideres;
}
