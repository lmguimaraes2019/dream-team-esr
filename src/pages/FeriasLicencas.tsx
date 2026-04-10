import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisaoGerencial from "@/components/ferias/VisaoGerencial";
import PeriodosAquisitivosTab from "@/components/ferias/PeriodosAquisitivosTab";
import FeriasAgendadasTab from "@/components/ferias/FeriasAgendadasTab";
import LicencasTab from "@/components/ferias/LicencasTab";
import ImportacaoTab from "@/components/ferias/ImportacaoTab";

export default function FeriasLicencas() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Férias e Licenças</h1>

      <Tabs defaultValue="visao" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="visao">Visão Gerencial</TabsTrigger>
          <TabsTrigger value="periodos">Períodos Aquisitivos</TabsTrigger>
          <TabsTrigger value="ferias">Férias Agendadas</TabsTrigger>
          <TabsTrigger value="licencas">Licenças</TabsTrigger>
          <TabsTrigger value="importacao">Importação</TabsTrigger>
        </TabsList>

        <TabsContent value="visao"><VisaoGerencial /></TabsContent>
        <TabsContent value="periodos"><PeriodosAquisitivosTab /></TabsContent>
        <TabsContent value="ferias"><FeriasAgendadasTab /></TabsContent>
        <TabsContent value="licencas"><LicencasTab /></TabsContent>
        <TabsContent value="importacao"><ImportacaoTab /></TabsContent>
      </Tabs>
    </div>
  );
}
