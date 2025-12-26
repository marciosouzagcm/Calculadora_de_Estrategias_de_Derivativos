🚀 Analisador de Assimetria de Derivativos (V38.0)
"In the market, volatility is the price you pay for performance. In this system, volatility is a variable we price to win."

📖 A Jornada: Da Teoria ao Motor de Execução
A versão V38.0 marca um divisor de águas no projeto. O que começou como um analisador de spreads evoluiu para um Motor de Cálculo Estocástico completo. Deixamos de depender exclusivamente de dados externos e passamos a gerar nossa própria inteligência através de um núcleo matemático proprietário.

🛡️ Diferenciais de Engenharia (O Novo Padrão)
1. Núcleo Matemático Black-Scholes Nativo 🧠
Diferente de sistemas que apenas replicam o que o terminal mostra, a V38.0 implementa sua própria classe BlackScholes.ts. Isso permite:

Independência de Dados: Se o seu CSV não trouxer as Gregas, o sistema as calcula do zero.

Precisão de 4 Casas Decimais: Cálculos de Delta, Gamma, Theta e Vega com normalização de dias úteis (Base 252).

Tratamento de Anomalias: Proteção contra divisões por zero e normalização automática de escala de strikes (correção de strikes fracionados).

2. Motor de Re-Calculo Net (Greeks Engine) 🧬
O sistema agora consolida a exposição real da carteira (Net Position). Não olhamos para a perna individual, mas para o organismo financeiro como um todo:

Delta Net: Direcionalidade precisa da montagem.

Theta Net: Decaimento temporal por dia útil (o "aluguel" da posição).

Gamma & Vega: Sensibilidade à aceleração do preço e mudanças na volatilidade implícita.

3. Filtro de Eficiência de Taxas e ROI Líquido

O algoritmo de filtragem foi endurecido. Agora, uma estratégia só é apresentada se sobreviver ao Stress Test de Fricção:

Descarte automático de operações onde as taxas consomem a margem de segurança.

Cálculo de ROI baseado no risco total (Margem + Taxas de Ida e Volta).

🏗️ Arquitetura de Software
O projeto segue rigorosamente os princípios de SOLID e Clean Code, garantindo que a lógica de negócio esteja separada da infraestrutura.

Plaintext

src/
├── 📂 interfaces/    # Tipagem rigorosa para Gregas e Estratégias
├── 📂 strategies/    # Algoritmos de Spreads (Bull/Bear, Straddle, Butterfly, etc)
├── 📂 services/      
│   ├── BlackScholes.ts      # Motor Matemático (Probabilidade e Estatística)
│   ├── PayoffCalculator.ts  # O cérebro que orquestra as combinações
│   ├── csvReader.ts         # Ingestão e sanitização de dados brutos
│   └── StrategyService.ts   # Fachada para o Frontend/API
└── server.ts         # Entry point da API de alta performance

📊 Demonstração de Saída (Exemplo Real V38.0)

Plaintext

🧬 Gregas Net da Estrutura (Lote 1000):
--------------------------------------------------------------------------------
DELTA: -0.0036  (Leve viés de baixa)
THETA:  0.0262  (Ganhando R$ 26,20/dia por decaimento)
GAMMA:  0.0039  (Aceleração moderada próxima ao strike)
VEGA:   0.0001  (Imunidade a variações de volatilidade)
--------------------------------------------------------------------------------
ROI Esperado: 368.75% | Risco Máximo: R$ 64,00 | Lucro Máximo: R$ 236,00


🎯 Roadmap de Evolução

[x] Fase 3 (Concluída): Integração total com Black-Scholes e normalização de dados.

[ ] Fase 4 (What-if Analysis): Simulação de variação de preço (Spot) e Vol (IV) no gráfico de Payoff.

[ ] Fase 5 (API REST): Disponibilização dos endpoints para consumo externo.

[ ] Fase 6 (Visual Dashboard): Gráficos de superfície de volatilidade e curvas de lucro.


🛠️ Como Executar

Instalação: npm install

Ambiente: Certifique-se de que o opcoes_final_tratado.csv está na raiz.

Execução: npm run api

Mantido com rigor matemático por Marcio Souza. Aviso: O mercado financeiro é soberano. Esta ferramenta é um auxílio à decisão estatística, não uma garantia de retorno.