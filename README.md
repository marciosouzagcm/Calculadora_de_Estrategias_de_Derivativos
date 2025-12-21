🚀 Calculadora de Estratégias de Derivativos

Uma aplicação de alta performance para cálculo, análise e otimização de estratégias de opções. 
O sistema processa grandes volumes de dados de mercado para identificar oportunidades com base em métricas reais, custos operacionais e sensibilidade grega.

🎯 Visão Geral

Esta calculadora transcende a teoria, integrando o modelo Black-Scholes com a realidade do mercado brasileiro. 
Ela automatiza a busca por montagens lucrativas, descontando taxas e calculando a exposição direcional (Delta Net) em tempo real.

🧠 Diferenciais da Versão V25Arquitetura POO Escalável: 

Refatoração completa para TypeScript, permitindo a adição de novas estratégias via herança de classe.
Integração de Gregas: Cálculo consolidado de Delta, Gamma, Theta e Vega por estratégia.
Análise Líquida: Diferenciação real entre Fluxo Bruto e Lucro/Prejuízo Líquido (incluindo taxas por perna).
Motor de ROI: Filtro avançado que prioriza estratégias com o melhor retorno sobre o risco.


🛠️ Estratégias SuportadasCategoriaEstratégias ImplementadasPerfil de RiscoDirecionaisBull/Bear Call Spread, Bull/Bear Put SpreadRisco LimitadoVolatilidadeLong/Short Straddle, Long/Short StrangleExplosão de Vol / LateralidadeRenda/TempoCalendar Spread (THL), Iron CondorDecaimento do ThetaEstruturadasButterfly Spread, Iron ButterflyAlvo de Preço Específico



📊 Métricas e Inteligência Financeira

A calculadora fornece um relatório detalhado para cada montagem encontrada:

Delta Net: Indica se a estratégia é "Altista", "Baixista" ou "Delta Neutra".
Theta Net: Mede o impacto diário da passagem do tempo no valor da montagem.
ROI Real: Cálculo baseado no capital em risco, já descontando FEE_PER_LEG.Break-Even Points: Identificação exata dos pontos de equilíbrio no vencimento.


🏗️ Arquitetura do SistemaO projeto segue princípios de Clean Code e Solid, facilitando a expansão para módulos 

```text
Web:Plaintextsrc/
├── 📂 interfaces/      # Definições rigorosas (StrategyMetrics, OptionLeg, Greeks)
├── 📂 strategies/      # Lógica isolada de cada spread (POO)
├── 📂 services/        # Orquestradores: PayoffCalculator, csvReader
├── 📂 utils/           # Formatadores e utilitários matemáticos
└── index.ts            # Ponto de entrada CLI (V25)
```

📖 Exemplo de Saída Real (ABEV3)Abaixo, um exemplo da saída gerada pelo sistema para uma operação de Straddle:Plaintext[#1] LONG STRADDLE (DÉBITO) (STRADDLE)

--------------------------------------------------------------------------------
Vencimento: 2026-01-16    | Natureza: DÉBITO      | ROI: ∞ (ILIMITADO)
Delta Net:   0.00 | Theta Net:  -0.0145 | Taxa Total Operação: R$ 44,00
Break-Even Points: 11.85 / 13.55
Fluxo Inicial (Lote): -R$ 850,00 | Lucro Máx Líq: ILIMITADO
Risco Máximo Total:   R$ 894,00

PERNAS (Lote: 1000):
  Sentido | Espécie | Símbolo           | Strike  | Prêmio (Un) | Delta Un.
  [C]     | CALL    | ABEVA134          |   12.70 |        0.76 | 0.00
  [C]     | PUT     | ABEVM134          |   12.70 |        0.09 | 0.00

--------------------------------------------------------------------------------
```text
📅 Roadmap de Desenvolvimento


[x] Refatoração para TypeScript e POO.
[x] Integração de Gregas Consolidadas.
[x] Sistema de filtragem por ROI e Lote.
[ ] Fase 3 (Próxima): Implementação de Mock API (Express) para servir dados.
[ ] Fase 4: Interface Gráfica (React + Tailwind) com Gráficos de Payoff dinâmicos.
[ ] Fase 5: Integração com WebSockets para cotações em tempo real.

```

⚡ Instalação e UsoClonar e Instalar:Bashnpm install

Modo Desenvolvimento:Bashnpm run dev

Executar Testes de Gregas:Bashnpm test

Aviso Legal: Esta ferramenta é para fins de estudo e análise técnica. 
Operações com derivativos envolvem alto risco. Sempre valide seus cálculos antes de operar.