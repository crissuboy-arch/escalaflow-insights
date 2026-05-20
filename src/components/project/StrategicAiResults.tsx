import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

export function StrategicAiResults({ data }: { data: any }) {
  if (!data) return null;

  return (
    <Tabs defaultValue="core" className="w-full">
      <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 mb-4">
        <TabsTrigger value="core">Core</TabsTrigger>
        <TabsTrigger value="oferta">Oferta</TabsTrigger>
        <TabsTrigger value="vsl">VSL</TabsTrigger>
        <TabsTrigger value="funil">Funil</TabsTrigger>
        <TabsTrigger value="criativos">Criativos</TabsTrigger>
        <TabsTrigger value="escala">Escala</TabsTrigger>
        <TabsTrigger value="scorecard">Scorecard</TabsTrigger>
      </TabsList>
      
      <TabsContent value="core">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResultCard title="Big Idea" content={data.core.bigIdea} />
          <ResultCard title="Mecanismo Único" content={data.core.uniqueMechanism} />
          <ResultCard title="Avatar (Principal Dor)" content={data.core.avatar.mainPain} />
          <ResultCard title="Promessa" content={data.core.promise} />
        </div>
      </TabsContent>
      {/* Add more tabs for other sections */}
    </Tabs>
  );
}

function ResultCard({ title, content }: { title: string, content: string }) {
  return (
    <Card className="border-white/10 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm">{content}</p>
      </CardContent>
    </Card>
  );
}
