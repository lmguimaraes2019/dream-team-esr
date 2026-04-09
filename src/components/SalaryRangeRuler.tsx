import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  trajetoria: string;
  nivel_complexidade: string;
  grupo: number;
  salario: number;
}

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SalaryRangeRuler({ trajetoria, nivel_complexidade, grupo, salario }: Props) {
  const [faixa, setFaixa] = useState<{ faixa_inicio: number; faixa_fim: number } | null>(null);

  useEffect(() => {
    // Normalize trajetoria for lookup
    const normalizeTrajetoria = (t: string) => {
      const map: Record<string, string[]> = {
        "Gestão do Negócio": ["gestao do negocio", "gestão do negócio", "gestao do negócio"],
        "Liderança": ["lideranca", "liderança"],
        "Relacionamento": ["relacionamento"],
        "Tecnológica": ["tecnologica", "tecnológica"],
      };
      const lower = t.toLowerCase();
      for (const [, variants] of Object.entries(map)) {
        if (variants.includes(lower)) return lower;
      }
      return lower;
    };

    const fetchFaixa = async () => {
      // Try to find matching range - use case-insensitive match
      const { data } = await supabase
        .from("tabela_salarial")
        .select("faixa_inicio, faixa_fim")
        .eq("grupo", grupo);

      if (!data || data.length === 0) return;

      // Find match by normalizing both sides
      const tNorm = normalizeTrajetoria(trajetoria);
      const match = data.find((row: any) => {
        const rowT = row.trajetoria?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const searchT = tNorm.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return rowT === searchT;
      });

      // If not found by trajetoria filter alone, try full match
      if (!match) {
        const { data: exact } = await supabase
          .from("tabela_salarial")
          .select("faixa_inicio, faixa_fim")
          .eq("grupo", grupo) as any;
        // Fallback: try matching nivel too
        if (exact) {
          const nivelNorm = nivel_complexidade.toLowerCase();
          const m2 = exact.find((row: any) => {
            const rn = row.nivel_complexidade?.toLowerCase();
            return rn === nivelNorm;
          });
          if (m2) setFaixa({ faixa_inicio: Number(m2.faixa_inicio), faixa_fim: Number(m2.faixa_fim) });
        }
        return;
      }

      setFaixa({ faixa_inicio: Number(match.faixa_inicio), faixa_fim: Number(match.faixa_fim) });
    };

    // Simpler approach: fetch all and match in JS
    const fetchAll = async () => {
      const { data } = await supabase.from("tabela_salarial").select("*") as any;
      if (!data || data.length === 0) return;

      const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      
      const match = data.find((row: any) => {
        return normalize(row.trajetoria) === normalize(trajetoria) &&
               normalize(row.nivel_complexidade) === normalize(nivel_complexidade) &&
               Number(row.grupo) === grupo;
      });

      if (match) {
        setFaixa({ faixa_inicio: Number(match.faixa_inicio), faixa_fim: Number(match.faixa_fim) });
      }
    };

    fetchAll();
  }, [trajetoria, nivel_complexidade, grupo, salario]);

  if (!faixa || salario <= 0) return null;

  const { faixa_inicio, faixa_fim } = faixa;
  const range = faixa_fim - faixa_inicio;
  
  // Calculate percentage position within the range
  let pct = range > 0 ? ((salario - faixa_inicio) / range) * 100 : 50;
  // Clamp for display but show real value
  const displayPct = Math.round(pct);
  const clampedPct = Math.max(0, Math.min(100, pct));

  // Map 0-100% of the range to 80%-120%
  const faixaPct = 80 + (pct / 100) * 40;
  const displayFaixaPct = Math.round(faixaPct);

  return (
    <div className="space-y-2 pt-2">
      <h4 className="font-semibold text-sm border-b pb-1">Posição na Faixa Salarial</h4>
      <div className="relative pt-6 pb-2 px-1">
        {/* Arrow indicator */}
        <div
          className="absolute top-0 flex flex-col items-center transition-all"
          style={{ left: `${clampedPct}%`, transform: "translateX(-50%)" }}
        >
          <span className="text-xs font-bold text-primary whitespace-nowrap">
            {displayFaixaPct}%
          </span>
          <svg width="12" height="8" viewBox="0 0 12 8" className="text-primary fill-current">
            <polygon points="6,8 0,0 12,0" />
          </svg>
        </div>

        {/* Bar */}
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          {/* Gradient fill */}
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${clampedPct}%`,
              background: `linear-gradient(90deg, hsl(var(--primary) / 0.3), hsl(var(--primary)))`,
            }}
          />
        </div>

        {/* Labels */}
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">{fmt(faixa_inicio)}</span>
          <span className="text-xs font-medium">{fmt(salario)}</span>
          <span className="text-xs text-muted-foreground">{fmt(faixa_fim)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[10px] text-muted-foreground">80%</span>
          <span className="text-[10px] text-muted-foreground">120%</span>
        </div>
      </div>
    </div>
  );
}
