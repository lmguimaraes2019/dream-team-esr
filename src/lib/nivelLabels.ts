// Maps DB enum values to display labels
export const NIVEL_OPTIONS: { value: string; label: string }[] = [
  { value: "assistente", label: "Assistente" },
  { value: "junior", label: "Junior" },
  { value: "pleno", label: "Pleno" },
  { value: "senior", label: "Senior" },
  { value: "especialista", label: "Especialista" },
  { value: "gerente_01", label: "Gerente 01" },
  { value: "gerente_02", label: "Gerente 02" },
  { value: "gerente_03", label: "Gerente 03" },
];

export const nivelLabel = (value: string): string => {
  return NIVEL_OPTIONS.find((n) => n.value === value)?.label ?? value;
};
