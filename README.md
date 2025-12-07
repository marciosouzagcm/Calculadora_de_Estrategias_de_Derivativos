🚀 Calculadora de Estratégias de DerivativosUma aplicação robusta em TypeScript para cálculo, análise e otimização de estratégias com opções financeiras. É uma refatoração de um script Python, utilizando arquitetura modular e baseada em Programação Orientada a Objetos (POO).


🎯 Objetivo do ProjetoCarregar dados de opções (arquivo CSV), identificar montagens válidas de estratégias e calcular métricas financeiras essenciais para suportar decisões de investimento.Estratégias Suportadas (Implementadas)Spreads Verticais (Bull/Bear Call/Put)Butterfly Spreads (Long Call/Put)Straddle Spreads (Long/Short)Calendar Spreads (Trava Horizontal de Linha - THL)Strangle SpreadsCondor Spreads


📊 Métricas Financeiras CalculadasMétricaDescriçãoFluxo de Caixa (Bruto)Custo ou receita total apenas dos prêmios (sem taxas).DESEMBOLSO TOTALCusto real da montagem (Prêmios $\pm$ Taxas) — Base para Risco Máximo Líquido.Lucro Máximo (Líquido)Ganho teórico máximo da estratégia descontado das taxas.Risco Máximo (Líquido)Prejuízo teórico máximo, igual ao DESEMBOLSO TOTAL (para estratégias de débito limitadas).BreakevensPreços onde o P/L é zero.Gregas LíquidasDelta, Gamma, Theta, Vega agregados (Black-Scholes).Score de OtimizaçãoMétrica Risco/Retorno ajustada por probabilidade e liquidez.


📚 Conceitos EssenciaisO que são Opções?Derivativos que conferem ao titular o direito (não obrigação) de comprar ou vender um ativo subjacente a um preço predeterminado (Strike) em data específica (Vencimento).CALL: Opção de compraPUT: Opção de vendaEstratégias com Opções (Spreads)Combinação de duas ou mais operações para atingir um perfil de risco/recompensa específico.Spreads Verticais (Travas): Mesma data de vencimento, Strikes diferentes (limita risco e lucro).Calendar Spread (Trava Horizontal): Mesmo Strike, Vencimentos diferentes (lucra com a passagem do tempo, Theta).Straddle/Strangle: Envolvem compra/venda de Call e Put, ideais para alta ou baixa volatilidade.


🗂️ Arquitetura do CódigoA arquitetura modular é ideal para adicionar novas estratégias (p. ex., RatioSpread.ts) e cálculos (p. ex., volatilidade).src/
├── interfaces/
│   ├── Derivative.ts       # Tipagens: OptionLeg, StrategyMetrics, Greeks
│   └── IStrategy.ts        # Interface base para estratégias
├── services/
│   ├── BlackScholesModel.ts     # Cálculo teórico de preço e Gregas
│   ├── StrategyFilter.ts        # Filtragem por critérios (Delta, Prêmio, Custo/Lucro)
│   ├── OptionsDataProcessor.ts  # Leitura e limpeza do CSV
│   ├── csvReader.ts             # Leitura do CSV
│   └── PayoffCalculator.ts      # Orquestração de cálculos
├── strategies/
│   ├── VerticalSpread.ts        
│   ├── ButterflySpread.ts        
│   ├── StraddleSpread.ts        
│   ├── CalendarSpread.ts        # NOVO: Trava Horizontal de Linha
│   ├── StrangleSpread.ts        
│   └── CondorSpread.ts
├── utils/
│   └── FinancialUtils.ts        
├── index.ts                     # Ponto de entrada (CLI)
└── firebase.ts                  
tests/
└── strategies.test.ts 


Descrição dos Arquivos Chave (Atualizada)ArquivoResponsabilidadeIStrategy.tsInterface base — todas as estratégias implementam calculateMetrics(spotPrice).BlackScholesModel.tsPreço teórico e Gregas (Delta, Gamma, Theta, Vega) de uma opção.StrategyFilter.tsRefina estratégias por Delta líquido, prêmio e Relação Custo/Lucro.PayoffCalculator.tsOrquestrador: busca montagens, calcula todas as estratégias, incorpora custos operacionais.index.tsFluxo principal, interação com usuário, relatório final ajustado para valores líquidos.


🛠️ Instalação e ExecuçãoPré-requisitosNode.js (v16+)npm ou yarnts-node (para execução rápida de desenvolvimento)Passo 1: Instalar DependênciasBashnpm install
Passo 2: Preparar DadosCertifique-se de que o arquivo opcoes_final_tratado.csv está na raiz do projeto.Passo 3: Compilar e Executar (Modo Produção)Bashnpm run build
node dist/index.js
Passo 4: Executar (Modo Desenvolvimento)É o método utilizado nos exemplos, que executa o TypeScript diretamente:Bashnpm run dev
# Equivalente a: npx ts-node src/index.ts
O aplicativo solicitará o Ticker do ativo e o Tipo de estratégia a ser analisada.📦 Scripts DisponíveisJSON{
  "build": "tsc",
  "dev": "ts-node src/index.ts",
  "test": "jest",
  "process-csv": "npx ts-node src/processador_opcoes.ts",
  "serve-src": "npx serve src"
}



📖 Exemplo de Saída (Ajustada)======================================================
                        📊 LONG CALENDAR SPREAD (DÉBITO) 📊
======================================================
Ativo Subjacente:              BBAS3
...
Taxas Totais (Estimado):       R$ 44.00

--- FLUXO DE CAIXA ---
Fluxo de Caixa (Prêmios):      R$ -25.00 (Custo Bruto)
DESEMBOLSO TOTAL (CUSTO):      R$ 69.00  <-- Custo Real da Montagem

--- RISCO E RETORNO (Líquido de Taxas) ---
Lucro Máximo (Líquido):        R$ 18.50  <-- Ganho Máximo Real
Prejuízo Máximo (Risco Total): R$ 69.00  <-- Risco Máximo Real

--- PONTOS CHAVE ---
Breakeven Point 1:             R$ 20.82
Breakeven Point 2:             R$ 21.57
...



📝 Notas ImportantesOs cálculos de Gregas utilizam o modelo Black-Scholes para precisão teórica.A aplicação assume opções estilo europeu (exercício apenas no vencimento).Taxas e custos operacionais (FEE_PER_LEG) são cruciais e estão corretamente integrados nos cálculos de Risco/Retorno Líquido e Desembolso Total.O filtro de otimização prioriza a menor relação Custo/Lucro Bruto entre as estratégias de débito.

🚀 Próximas Melhorias[ ] Suporte a estratégias complexas de 4 pernas (Iron Condor, Ratio Spread)[ ] Interface web com React/TypeScript[ ] Integração com APIs de cotações em tempo real[ ] Dashboard de análise interativa e gráfico de PayoffGetty Images[ ] Exportação de relatórios (PDF/Excel)



📧 SuportePara dúvidas ou sugestões, abra uma issue ou entre em contato.Licença: ISC  Versão: 1.0.1 (Após correção do Risco/Retorno Líquido)
