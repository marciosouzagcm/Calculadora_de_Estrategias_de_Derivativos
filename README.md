🚀 Analisador de Assimetria de Derivativos (V38.0)
"In the market, volatility is the price you pay for performance. In this system, volatility is a variable we price to win."

📖 A Jornada: Da Teoria ao Motor de Execução
A versão V38.0 marca um divisor de águas. O que começou como um analisador de spreads evoluiu para um Motor de Cálculo Estocástico e de Margem completo. Deixamos de depender de dados externos estáticos para gerar inteligência dinâmica através de um núcleo matemático proprietário e algoritmos de proteção de capital.

🛡️ Diferenciais de Engenharia (O Novo Padrão)
1. Núcleo Matemático Black-Scholes Nativo 🧠
A V38.0 implementa sua própria classe BlackScholes.ts, garantindo:

Independência de Dados: Cálculo autônomo de Gregas (Delta, Gamma, Theta, Vega) caso o provedor de dados falhe.

Precisão Quantitativa: Normalização por dias úteis (Base 252) e precisão de 4 casas decimais.

Resiliência: Proteção contra divisões por zero e normalização automática de strikes fracionados (ajustes de proventos).

2. Geometria de Estratégias e Risco de Margem 🧬
O grande salto desta versão foi a correção da lógica de exposição:

Lógica de "Asas" (Borboletas/Condors): O sistema identifica a estrutura e calcula o risco baseado na largura efetiva. Para Iron Condors, o sistema aplica a Margem de Maior Asa, reconhecendo que o risco é assimétrico e não cumulativo.

Payoff de Precisão: O gráfico de Payoff agora desconta automaticamente as taxas de "ida e volta", mostrando o lucro real no bolso, não o lucro bruto teórico.

3. Filtro de Eficiência "Vigilante" 🛡️
Algoritmo de filtragem endurecido com regras de segurança institucional:

Venda Descoberta (Naked): Identificação de operações sem trava e aplicação de Risco Sintético de 20% do Spot (padrão B3).

Stress Test de Fricção: Descarte automático de operações onde as taxas operacionais (R$ 22,00/perna) consomem a margem de segurança.

Cálculo de Break-even (Alvo 0 a 0): O sistema gera o preço exato de saída necessário para cobrir todos os custos operacionais.

🧪 Metodologia de Validação (Audit Trail)
Para garantir a confiabilidade da V38.0, o motor de cálculo foi submetido a um Audit de 11 Cenários Críticos, incluindo:

Estruturas de Débito: Travas de Alta/Baixa (Call e Put), Borboletas, Long Straddles e Strangles.

Estruturas de Crédito: Iron Condors e Travas de Crédito.

Vendas a Seco: Monitoramento de margem em Short Straddles e Strangles.

Operações de Tempo: Calendar Spreads (Trava Horizontal de Linha).

🏗️ Arquitetura de Software
Rigor técnico seguindo SOLID e Clean Code.

Plaintext

src/
├── 📂 interfaces/      # Tipagem rigorosa (Greeks, Legs, StrategyMetrics)
├── 📂 strategies/      # Algoritmos de Spreads (Ajustados para largura de asa)
├── 📂 services/        
│   ├── BlackScholes.ts      # Motor Matemático (Probabilidade)
│   ├── PayoffCalculator.ts  # Orquestrador de combinações
│   ├── csvReader.ts         # Sanitização de dados brutos
│   └── StrategyService.ts   # Lógica de Risco e Backend-to-Frontend
└── server.ts           # API Entry point (Node.js/TypeScript)
📊 Demonstração de Saída (Exemplo Real V38.0)
Plaintext

🧬 Análise de Estrutura Complexa (Iron Condor - Lote 1000):
--------------------------------------------------------------------------------
STATUS: ● DENTRO DO FILTRO (R$ 0.16 / 0.30)
ESTRATÉGIA: Butterfly (Borboleta) | VENCIMENTO: Fev 2026
--------------------------------------------------------------------------------
ROI LÍQUIDO: 1780.8% | LUCRO MÁXIMO: R$ 2.778,00
RISCO REAL: R$ 156,00 (Margem Corrigida + Taxas)
ALVO 0 A 0: R$ 0.22/un (Ponto de equilíbrio total)
--------------------------------------------------------------------------------
🎯 Roadmap de Evolução
[x] Fase 3: Integração Black-Scholes e normalização.

[x] Fase 3.5: Correção da lógica de largura de pernas (Condors/Borboletas).

[ ] Fase 4 (What-if): Simulação dinâmica de Spot e Volatilidade (IV) no gráfico de Payoff.

[ ] Fase 5 (Visual): Superfície de Volatilidade e Dashboard de Gregas Dinâmicas.

Mantido com rigor matemático por Marcio Souza. Aviso: O mercado financeiro é soberano. Esta ferramenta é um auxílio à decisão estatística, não uma promessa de lucro. A gestão de risco é responsabilidade do operador.