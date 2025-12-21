📘 Dicionário Técnico de Estratégias de Opções
Este documento descreve as estratégias implementadas no motor de cálculo, incluindo visões de mercado, perfis de risco e nomenclaturas alternativas.

1. Estratégias de Direção (Travas/Spreads)
Bull Call Spread
Nomes Comuns: Trava de Alta com Call, Spread de Débito com Call, Call Bull Spread.

O que é: Compra de uma Call ATM/ITM e venda de uma Call OTM de strike superior.

Visão: Alta moderada do ativo.

Risco: Baixo e Limitado (Valor pago na montagem).

Lucro: Limitado (Diferença entre strikes - custo).

Bear Put Spread
Nomes Comuns: Trava de Baixa com Put, Spread de Débito com Put, Put Bear Spread.

O que é: Compra de uma Put ATM/ITM e venda de uma Put OTM de strike inferior.

Visão: Baixa moderada do ativo.

Risco: Limitado ao custo da operação.

Lucro: Diferença entre strikes menos o débito pago.

Bull Put Spread
Nomes Comuns: Trava de Alta com Put, Spread de Crédito com Put, Put Credit Spread.

O que é: Venda de uma Put mais próxima do dinheiro e compra de uma Put mais longe (asa de proteção).

Visão: Alta ou Lateralização (Neutro-Alta).

Risco: Limitado (Largura da trava - crédito recebido).

Lucro: Crédito recebido na montagem.

2. Estratégias de Volatilidade
Straddle (Long/Short)
Nomes Comuns: Compra/Venda de Volatilidade no Strike, Monte Carlo (gíria).

Configuração: 1 Call e 1 Put no mesmo strike.

Variação Long: Lucra se o papel "explodir" para qualquer lado.

Variação Short: Lucra se o papel ficar parado exatamente no strike.

Strangle (Long/Short)
Nomes Comuns: Compra/Venda de Volatilidade OTM.

Configuração: 1 Call e 1 Put em strikes diferentes (geralmente ambos OTM).

Variação Short: Muito usada por traders profissionais para "colher" o valor tempo (Theta) em mercados laterais, criando uma zona de lucro entre os strikes.

3. Glossário de Termos do Projeto
Net Premium: Valor bruto das opções somadas.

Cash Flow Líquido: Valor financeiro que entra ou sai da conta após considerar as taxas de corretagem.

BEP (Breakeven): Preços do ativo subjacente onde a estratégia não ganha nem perde dinheiro no vencimento.