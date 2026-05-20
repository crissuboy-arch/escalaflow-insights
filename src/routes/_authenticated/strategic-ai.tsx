import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { motion, AnimatePresence } from "framer-motion";
import { StrategicInputSchema, type StrategicInput } from "@/lib/strategic-ai-engine";
import { generateFullStrategy } from "@/lib/strategic-ai.functions";
import { StrategicAiResults } from "@/components/project/StrategicAiResults";

export const Route = createFileRoute("/_authenticated/strategic-ai")({
  component: StrategicAI,
});

const STEPS = [
  "Analisando mercado",
  "Criando mecanismo único",
  "Gerando funil",
  "Criando VSL",
  "Planejando escala",
];

function StrategicAI() {
  const { t } = useTranslation();
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [results, setResults] = useState<any>(null);

  const form = useForm<StrategicInput>({
    resolver: zodResolver(StrategicInputSchema),
    defaultValues: {
      productName: "",
      productType: "",
      niche: "",
      promise: "",
      audience: "",
      price: "",
      country: "Brasil",
      language: "pt-BR",
    },
  });

  const onSubmit = async (data: StrategicInput) => {
    setLoadingStep(0);
    try {
      // Simulate loading steps for premium feel
      for (let i = 0; i < STEPS.length; i++) {
        setLoadingStep(i);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
      
      const strategy = await generateFullStrategy({ data });
      setResults(strategy);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingStep(null);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          {t("strategicAI.title", "Strategic AI Engine")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("strategicAI.subtitle", "Crie estratégias de alta conversão adaptadas para qualquer mercado.")}
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="border-white/10 bg-slate-900/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Parâmetros da Estratégia</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="productName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Produto</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Método Descomplica" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="niche"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nicho</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Ex: Emagrecimento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="promise"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Promessa</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Ex: Emagreça 5kg em 30 dias sem dietas malucas" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loadingStep !== null}>
                    {loadingStep !== null ? "Gerando..." : "Gerar Estratégia Completa"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-white/10 bg-slate-900/50 backdrop-blur min-h-[400px]">
            <CardContent className="p-6">
              <AnimatePresence mode="wait">
                {loadingStep !== null ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center h-[400px] text-xl font-medium text-blue-400"
                  >
                    {STEPS[loadingStep]}...
                  </motion.div>
                ) : results ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="w-full space-y-4"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold">Estratégia Gerada</h2>
                      <Button onClick={() => console.log("Save")}>Salvar Projeto</Button>
                    </div>
                    <StrategicAiResults data={results} />
                  </motion.div>
                ) : (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">Preencha os campos para iniciar a estratégia.</div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
