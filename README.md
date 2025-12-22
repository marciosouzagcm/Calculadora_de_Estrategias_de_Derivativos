🚀 Analisador de Assimetria de Derivativos (V37.1)


📖 A Jornada: Do Ruído à Clareza Estatística

No mercado de opções, muitos investidores operam baseados em intuição ou planilhas que ignoram a "fricção" do mundo real. Este projeto nasceu de uma necessidade pessoal: parar de cair em "trades de corretora".

A versão V37.1 evoluiu de uma calculadora teórica para um motor de gestão de risco, capaz de processar milhares de combinações de ativos (como #ITUB4) e filtrar apenas aquelas onde a matemática e as taxas estão, de fato, a favor do operador.


🛡️ Diferenciais de Engenharia (O "Pulo do Gato")

Diferente de calculadoras comuns, este sistema implementa camadas críticas de Gestão de Risco Profissional:

1. Filtro de Eficiência de Taxas (Round-Trip)
O sistema projeta o custo total do ciclo de vida da operação (Entrada + Reversão).

Se as taxas consumirem mais de 60% do lucro potencial, a estratégia é sumariamente descartada.

O algoritmo exige que o lucro líquido seja, no mínimo, 1.5x superior aos custos fixos.

2. Alvo "Zero a Zero" (Break-Even de Tela)
Uma métrica dinâmica que informa o preço exato que o conjunto de opções deve atingir no Home Broker para que a operação se pague integralmente, protegendo o capital principal contra o slippage e emolumentos.

3. Gestão de Risco Nativa & Gregas Net
Delta Net: Exposição direcional consolidada.

Theta Net: Impacto real da passagem do tempo no lucro da montagem.

Stop Loss Sugerido: Cálculo automático de saída de emergência já incluindo os custos de fechamento das pernas.

🏗️ Arquitetura e Estrutura
O projeto utiliza TypeScript para garantir segurança de tipos em cálculos sensíveis e segue princípios de Clean Code.

Plaintext

src/
├── 📂 interfaces/    # Contratos de tipos (Greeks, StrategyMetrics, OptionLeg)
├── 📂 strategies/    # Lógica de spreads (Bull Put, Straddle, Strangle, etc)
├── 📂 services/      # PayoffCalculator (Motor), csvReader (Ingestão de dados)
├── 📂 utils/         # Utilitários de formatação e matemática financeira
└── index.ts          # CLI Engine V37.1


📊 Demonstração de Saída (Relatório Executivo)

O sistema gera um relatório de alta legibilidade para tomada de decisão rápida:

Plaintext

[#1] BULL PUT SPREAD (CRÉDITO) | R:R Alvo: 0.07:1
--------------------------------------------------------------------------------
DETALHAMENTO DE TAXAS (LOTE 1000):
  Entrada: R$ 44,00 | Reversão: R$ 44,00 | Ciclo Total: R$ 88,00

ALVOS PARA 0 A 0 (PAGAR IDA + VOLTA):
  > Recomprar a trava por no máximo: R$ 0.19/un

RESUMO FINANCEIRO:
  Lucro Máx Líq: R$ 236,00   | Risco Total: R$ 64,00 | ROI: 368.75%
  Break-Even: 39.42          | Delta Net: 0.00       | Theta Net: -0.0004
--------------------------------------------------------------------------------
Total de estratégias viáveis encontradas: 111


🛠️ Tecnologias e Ferramentas

Linguagem: TypeScript / Node.js

Processamento: Algoritmos de busca em árvore para combinação de pernas.

Dados: Ingestão via CSV/JSON (preparado para API).

Versionamento: Git (Fluxo de Rebase e Feature Branches).


🎯 Próximas Metas (Roadmap de Aperfeiçoamento)

O desenvolvimento é contínuo e focado em transformar dados em inteligência:

[ ] Fase 4 (Simulação What-if): Implementar simulação de cenários (ex: "E se o ativo subir 5% amanhã, como fica meu lucro?").

[ ] Fase 5 (API Express): Criar uma camada de serviço para servir os dados calculados para uma interface Web.

[ ] Fase 6 (Dashboard React): Visualização gráfica de Payoff e curvas de sensibilidade (Gama e Vega).

[ ] Fase 7 (WebSockets): Integração com cotações em tempo real para alertas via Telegram/Discord.



⚡ Como Executar

Instale as dependências: npm install

Compile e rode: npm run dev (ou ts-node src/index.ts)

⚠️ Aviso Legal: Esta ferramenta foi desenvolvida para fins de estudo de engenharia de software e análise técnica. Operações com derivativos envolvem alto risco. Nunca opere sem entender os riscos envolvidos.

Mantido por Marcio Souza