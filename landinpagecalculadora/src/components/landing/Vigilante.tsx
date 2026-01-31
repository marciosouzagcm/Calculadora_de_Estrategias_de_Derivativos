/**
 * COMPONENTE: Vigilante V2
 * DESCRIÇÃO: Seção técnica que explica o motor de auditoria de risco.
 * Utiliza um diagrama visual para mostrar como o sistema filtra operações perigosas.
 */

import { Shield, AlertTriangle, Check, X, TrendingUp, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const Vigilante = () => {
  return (
    <section id="vigilante" className="py-24 bg-background relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-64 h-64 bg-accent/10 rounded-full blur-[100px] -z-10" />
      
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* LADO ESQUERDO: Conteúdo e Copywriting */}
          <div className="space-y-6">
            <Badge variant="outline" className="px-4 py-1 border-accent/50 text-accent bg-accent/5">
              <Shield className="h-3 w-3 mr-2" />
              Tecnologia Proprietária
            </Badge>
            
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Sistema{" "}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Vigilante V2
              </span>
            </h2>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Mais que uma calculadora, uma camada de inteligência quantitativa que audita cada estratégia em milissegundos, protegendo você contra o "risco de ruína" do mercado de opções.
            </p>
            
            {/* Lista de Recursos Técnicos */}
            <div className="grid gap-6 mt-8">
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                <div className="p-3 rounded-lg bg-accent/10 shrink-0">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Anti-Naked Protection</h4>
                  <p className="text-sm text-muted-foreground">
                    Bloqueia automaticamente estratégias com exposição negativa ilimitada (venda a seco) sem cobertura de margem.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Stress Test de 20% (Spot)</h4>
                  <p className="text-sm text-muted-foreground">
                    Simula variações extremas no ativo objeto para garantir que sua estratégia suporte a volatilidade do mercado brasileiro.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-secondary/50 transition-colors border border-transparent hover:border-border">
                <div className="p-3 rounded-lg bg-warning/10 shrink-0">
                  <AlertTriangle className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Custo de Fricção B3</h4>
                  <p className="text-sm text-muted-foreground">
                    Calcula o ROI descontando emolumentos e taxas de liquidação, entregando um lucro líquido real e honesto.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* LADO DIREITO: Visual do Fluxo de Auditoria */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-primary/20 rounded-3xl blur opacity-75 group-hover:opacity-100 transition duration-1000"></div>
            
            <Card className="relative bg-card/90 backdrop-blur-sm border-border shadow-2xl">
              <CardContent className="p-8">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h3 className="text-lg font-bold">Fluxo de Auditoria</h3>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Real-Time Processing</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-accent animate-pulse shadow-[0_0_10px_rgba(10,132,255,1)]" />
                </div>
                
                {/* Diagrama de Fluxo */}
                <div className="space-y-6">
                  {/* Passo 1: Entrada de Dados */}
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/50 border border-border">
                    <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center text-lg font-mono font-bold shadow-inner">
                      432
                    </div>
                    <div>
                      <p className="font-bold text-sm text-foreground">Input de Mercado</p>
                      <p className="text-xs text-muted-foreground">Strikes e Vencimentos disponíveis</p>
                    </div>
                  </div>
                  
                  {/* Seta de Conexão */}
                  <div className="flex justify-center -my-2">
                    <div className="w-px h-8 bg-gradient-to-b from-border to-accent" />
                  </div>
                  
                  {/* Passo 2: O Motor Vigilante */}
                  <div className="p-5 rounded-xl border-2 border-accent bg-accent/5 shadow-inner shadow-accent/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Shield className="h-6 w-6 text-accent" />
                        <span className="font-black text-accent uppercase tracking-tighter">Vigilante V2 Core</span>
                      </div>
                      <Badge className="bg-accent text-[10px]">Ativo</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px] font-medium">
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Check className="h-3 w-3 text-accent" /> Auditoria de Gregas
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Check className="h-3 w-3 text-accent" /> Margem Requerida
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Check className="h-3 w-3 text-accent" /> Liquidez Mínima
                      </div>
                      <div className="flex items-center gap-2 text-foreground/80">
                        <Check className="h-3 w-3 text-accent" /> Stress Test
                      </div>
                    </div>
                  </div>
                  
                  {/* Seta de Conexão */}
                  <div className="flex justify-center -my-2">
                    <div className="w-px h-8 bg-gradient-to-b from-accent to-border" />
                  </div>
                  
                  {/* Passo 3: Resultado do Filtro */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-accent/10 border border-accent/20">
                      <Check className="h-6 w-6 text-accent mb-2" />
                      <p className="font-mono text-2xl font-black text-accent">18</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Aprovadas</p>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-destructive/10 border border-destructive/20 opacity-60">
                      <X className="h-6 w-6 text-destructive mb-2" />
                      <p className="font-mono text-2xl font-black text-destructive">414</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-bold">Descartadas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>
    </section>
  );
};