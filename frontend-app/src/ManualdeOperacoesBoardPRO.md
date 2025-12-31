📘 Manual de Operação: Trading Board PRO
Este manual descreve a lógica quantitativa e as diretrizes de segurança aplicadas ao motor de análise de opções. O foco principal é o Gerenciamento de Risco Rigoroso.

1. Configurações de Entrada (Input)
Para uma análise precisa, o usuário deve definir quatro parâmetros fundamentais:

ATIVO: O ticker da ação (ex: BBAS3).

SPOT: O preço atual da ação no mercado.

LOTE: A quantidade de contratos (padrão: 1000).

FILTRO RISCO: O valor máximo que você aceita arriscar por ação. (Recomendado: 0.30).

2. A Lógica do "Vigilante" (Filtro de Risco)
O sistema aplica uma validação binária em cada oportunidade encontrada:

✅ DENTRO DO FILTRO (OK): O risco real da operação (prejuízo máximo + taxas) dividido pelo lote é menor ou igual ao seu Filtro de Risco.

❌ FORA DO FILTRO (ALTO RISCO): O custo ou risco unitário excede o seu limite. Mesmo que o ROI seja de 500%, o sistema alertará para a "carência" ou "exposição excessiva" da montagem.

3. Interpretação das Estratégias
A. Operações de Débito (Compra de Volatilidade/Direção)
Ex: Trava de Alta (Call), Trava de Baixa (Put), Straddle, Strangle, Borboleta.

Montagem Líquida: Sempre negativa (saída de caixa).

Risco Real: É o valor total investido (Prêmios + Taxas).

Alvo 0 a 0: O preço unitário que você deve vender a estrutura para pagar todos os custos.

B. Operações de Crédito (Venda de Volatilidade/Tempo)
Ex: Trava de Baixa (Call), Trava de Alta (Put), Iron Condor.

Montagem Líquida: Positiva (crédito em conta menos taxas de entrada).

Risco Real: A diferença entre a largura dos strikes e o crédito recebido, somada às taxas.

Alvo 0 a 0: O preço unitário máximo que você aceita pagar para recomprar a estrutura e sair no empate.

4. Regras de Segurança Integradas (Anti-Quebra)
[!IMPORTANT] Venda Descoberta (Short Strangle/Straddle): O sistema identifica automaticamente se a operação não possui travas de proteção. Nesses casos, ele aplica um Risco Sintético de 20% do Spot. Isso garante que vendas a seco sempre apareçam como ALTO RISCO, impedindo a exposição a prejuízos ilimitados por erro de análise.

[!NOTE] Cálculo de Taxas: O sistema cobra R$ 22,00 por perna na entrada e na saída. Uma estratégia de 4 pernas (Iron Condor) sempre terá um custo fixo operacional de R$ 176,00 no ciclo total.

5. Fluxo de Trabalho Recomendado
Escanear: Insira o ticker e execute o scanner.

Filtrar: Olhe primeiro para a Sidebar e identifique as operações marcadas como OK.

Analisar ROI: Entre as operações "OK", escolha a que oferece o melhor retorno sobre o risco (ROI).

Verificar Montagem Líquida: Certifique-se de que você tem o financeiro disponível para a saída de caixa (se débito) ou margem (se crédito).

Executar: Utilize o "Alvo para 0 a 0" como sua baliza mínima de saída.

6. Glossário de Métricas
ROI Real: Lucro Líquido (após todas as taxas) dividido pelo Risco Total.

Risco Unitário: O prejuízo máximo da operação distribuído por cada ação do lote.

Ciclo Total: A soma de todas as taxas de corretagem da abertura ao fechamento.

Este manual garante que a disciplina matemática prevaleça sobre a emoção do trade.