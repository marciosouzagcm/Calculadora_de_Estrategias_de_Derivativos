/**
 * COMPONENTE: Strategies
 * DESCRIÇÃO: Catálogo expandido com as 23 estratégias implementadas no core.
 */

import { Check, TrendingUp, TrendingDown, Minus, Activity, LucideIcon, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StrategyItem {
  name: string;
  type: "Débito" | "Crédito" | "Misto";
  risk: string;
}

interface StrategyCategory {
  category: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: LucideIcon;
  items: StrategyItem[];
}

const strategies: StrategyCategory[] = [
  {
    category: "Alta (Bullish)",
    description: "Para cenários de valorização do ativo.",
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "group-hover:border-accent/50",
    icon: TrendingUp,
    items: [
      { name: "Bull Call Spread", type: "Débito", risk: "Limitado" },
      { name: "Bull Put Spread", type: "Crédito", risk: "Limitado" },
      { name: "Bull Calendar Spread", type: "Débito", risk: "Limitado" },
      { name: "Long Call Diagonal", type: "Débito", risk: "Limitado" },
      { name: "Covered Call (Lançamento)", type: "Crédito", risk: "Limitado" },
    ],
  },
  {
    category: "Baixa (Bearish)",
    description: "Para lucrar com a queda ou proteção.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "group-hover:border-destructive/50",
    icon: TrendingDown,
    items: [
      { name: "Bear Put Spread", type: "Débito", risk: "Limitado" },
      { name: "Bear Call Spread", type: "Crédito", risk: "Limitado" },
      { name: "Bear Calendar Spread", type: "Débito", risk: "Limitado" },
      { name: "Long Put Diagonal", type: "Débito", risk: "Limitado" },
      { name: "Covered Put", type: "Crédito", risk: "Vigilante*" },
    ],
  },
  {
    category: "Renda & Neutras",
    description: "Lucro com a passagem do tempo (Theta).",
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "group-hover:border-info/50",
    icon: Minus,
    items: [
      { name: "Iron Condor Spread", type: "Crédito", risk: "Limitado" },
      { name: "Short Iron Condor", type: "Crédito", risk: "Limitado" },
      { name: "Butterfly Spread", type: "Misto", risk: "Limitado" },
      { name: "Long Butterfly Call", type: "Débito", risk: "Limitado" },
      { name: "Calendar Spread", type: "Débito", risk: "Limitado" },
      { name: "Short Butterfly Call", type: "Crédito", risk: "Limitado" },
    ],
  },
  {
    category: "Volatilidade & Avançadas",
    description: "Estratégias de spread e distorção.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "group-hover:border-primary/50",
    icon: Activity,
    items: [
      { name: "Long Straddle / Strangle", type: "Débito", risk: "Limitado" },
      { name: "Short Straddle / Strangle", type: "Crédito", risk: "Vigilante*" },
      { name: "Ratio Call / Put Spread", type: "Misto", risk: "Vigilante*" },
      { name: "Box Spread (Arbitragem)", type: "Misto", risk: "Limitado" },
      { name: "Short Put Diagonal", type: "Crédito", risk: "Vigilante*" },
    ],
  },
];

export const Strategies = () => {
  return (
    <section id="estrategias" className="py-24 bg-card/30">
      <div className="container mx-auto px-4">
        
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 px-4 py-1 border-primary/30 text-primary font-bold">
            23 Algoritmos Ativos
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
            O Maior Arsenal de{" "}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              Derivativos da B3
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            De travas simples a estruturas complexas de arbitragem e diagonais. 
            Tudo auditado pelo nosso motor quantitativo.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {strategies.map((category, index) => (
            <Card 
              key={index}
              className={`group bg-background border-2 transition-all duration-300 hover:shadow-2xl ${category.borderColor}`}
            >
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2.5 rounded-xl ${category.bgColor}`}>
                    <category.icon className={`h-6 w-6 ${category.color}`} />
                  </div>
                  <CardTitle className="text-xl font-bold">{category.category}</CardTitle>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {category.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="group/item">
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-accent" />
                          <span className="text-sm font-medium group-hover/item:text-primary transition-colors leading-tight">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-7 mt-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/70">
                          {item.type}
                        </span>
                        <span className={`text-[9px] uppercase font-bold ${item.risk === 'Limitado' ? 'text-green-500/70' : 'text-warning/70'}`}>
                          {item.risk}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Disclaimer Técnico */}
        <div className="mt-12 p-6 bg-background rounded-2xl border border-border flex items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
            <ShieldAlert className="h-6 w-6 text-warning" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota Técnica:</strong> Todas as 23 estratégias listadas utilizam os modelos de precificação baseados nas classes <code className="text-primary">StraddleSpreadBase</code> e <code className="text-primary">VerticalSpreadBase</code>. Estratégias de calendário e diagonais consideram a estrutura a termo da volatilidade.
          </p>
        </div>
      </div>
    </section>
  );
};