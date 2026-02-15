/**
 * COMPONENTE: Strategies
 * DESCRIÇÃO: Arsenal completo com as 23 estratégias auditadas pelo Vigilante V2.
 */

import { Check, TrendingUp, TrendingDown, Minus, Activity, LucideIcon, ShieldAlert } from "lucide-react";
// AJUSTE: Caminhos relativos para estabilidade no build
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";

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
    description: "Para cenários de valorização do ativo objeto.",
    color: "text-accent",
    bgColor: "bg-accent/10",
    borderColor: "hover:border-accent/40",
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
    description: "Para lucrar com a queda ou proteção de carteira.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "hover:border-destructive/40",
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
    description: "Lucro com a passagem do tempo (Theta Decay).",
    color: "text-info",
    bgColor: "bg-info/10",
    borderColor: "hover:border-info/40",
    icon: Minus,
    items: [
      { name: "Iron Condor Spread", type: "Crédito", risk: "Limitado" },
      { name: "Iron Butterfly", type: "Crédito", risk: "Limitado" },
      { name: "Butterfly Spread", type: "Misto", risk: "Limitado" },
      { name: "Long Calendar", type: "Débito", risk: "Limitado" },
      { name: "Short Butterfly Call", type: "Crédito", risk: "Limitado" },
    ],
  },
  {
    category: "Volatilidade",
    description: "Estratégias de spread e distorção de IV.",
    color: "text-primary",
    bgColor: "bg-primary/10",
    borderColor: "hover:border-primary/40",
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
        
        {/* Section Header */}
        <div className="text-center mb-16 space-y-4">
          <Badge variant="outline" className="px-4 py-1 border-primary/30 text-primary font-bold">
            23 Algoritmos Ativos
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            O Maior Arsenal de{" "}
            <span className="bg-gradient-to-r from-[#0A84FF] to-[#32D74B] bg-clip-text text-transparent inline-block">
              Derivativos da B3
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            De travas simples a estruturas complexas de arbitragem. 
            Tudo auditado pelo nosso motor quantitativo nativo.
          </p>
        </div>
        
        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {strategies.map((category, index) => (
            <Card 
              key={index}
              className={`group bg-background border-border transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 border-2 ${category.borderColor}`}
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
                          <Check className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                          <span className="text-sm font-medium group-hover/item:text-primary transition-colors leading-tight">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-7 mt-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground/70">
                          {item.type}
                        </span>
                        <span className={`text-[9px] uppercase font-bold ${item.risk === 'Limitado' ? 'text-green-500/70' : 'text-orange-500/70'}`}>
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
        <div className="mt-12 p-6 bg-background/50 backdrop-blur-sm rounded-2xl border border-border flex flex-col md:flex-row items-center gap-4">
          <div className="shrink-0 w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center border border-warning/20">
            <ShieldAlert className="h-6 w-6 text-warning" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Nota Técnica:</strong> Todas as estratégias listadas utilizam os modelos de precificação baseados nas classes <code className="text-primary font-mono font-bold">StraddleSpreadBase</code> e <code className="text-primary font-mono font-bold">VerticalSpreadBase</code>. Estratégias de calendário e diagonais consideram a estrutura a termo da volatilidade (IV Skew/Smile).
          </p>
        </div>
      </div>
    </section>
  );
};