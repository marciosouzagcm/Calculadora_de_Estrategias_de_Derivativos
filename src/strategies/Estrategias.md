Catálogo de Estratégias de Opções - Calculadora de Estrategias com Derivativos
Este documento contém a documentação técnica das estratégias de opções implementadas no motor de análise do projeto.

1. Estratégias Verticais (Spreads)
As travas verticais são operações com risco e lucro limitados, compostas por duas opções do mesmo tipo (Call ou Put) com strikes diferentes para o mesmo vencimento.

1.1 Bull Call Spread
Nome Técnico: BullCallSpread

Variações de Nomes: Trava de Alta com Call, Spread de Débito com Call, Long Call Spread.

Visão de Mercado: Altista (Alta moderada).

Natureza: Débito (O investidor paga para montar).

Descrição: Compra-se uma Call em um strike mais baixo e vende-se uma Call em um strike mais alto. O objetivo é lucrar com a valorização do ativo até o strike da opção vendida.

1.2 Bear Call Spread
Nome Técnico: BearCallSpread

Variações de Nomes: Trava de Baixa com Call, Spread de Crédito com Call, Short Call Spread, Call Credit Spread.

Visão de Mercado: Baixista (Baixa moderada a neutra).

Natureza: Crédito (O investidor recebe para montar).

Descrição: Vende-se uma Call em um strike mais baixo e compra-se uma Call de strike mais alto como proteção. O lucro máximo é o crédito recebido.

1.3 Bull Put Spread
Nome Técnico: BullPutSpread

Variações de Nomes: Trava de Alta com Put, Spread de Crédito com Put, Short Put Spread, Put Credit Spread.

Visão de Mercado: Altista (Alta moderada a neutra).

Natureza: Crédito (O investidor recebe para montar).

Descrição: Vende-se uma Put em um strike mais alto e compra-se uma Put em um strike mais baixo como proteção. É uma estratégia de geração de renda por tempo.

1.4 Bear Put Spread
Nome Técnico: BearPutSpread

Variações de Nomes: Trava de Baixa com Put, Spread de Débito com Put, Long Put Spread.

Visão de Mercado: Baixista (Baixa moderada).

Natureza: Débito (O investidor paga para montar).

Descrição: Compra-se uma Put em um strike mais alto e vende-se uma Put em um strike mais baixo. Lucra-se com a queda do ativo subjacente.

2. Estratégias de Volatilidade (Straddle)
O Straddle envolve a operação simultânea de Call e Put no mesmo strike.

2.1 Long Straddle
Nome Técnico: LongStraddle

Variações de Nomes: Compra de Volatilidade, Compra de Straddle, Straddle Comprado.

Visão de Mercado: Volátil (Espera-se um grande movimento, independentemente da direção).

Natureza: Débito.

Descrição: Compra de uma Call e uma Put no mesmo strike. O investidor lucra se o preço do ativo se deslocar agressivamente para qualquer um dos lados.

2.2 Short Straddle
Nome Técnico: ShortStraddle

Variações de Nomes: Venda de Volatilidade, Venda de Straddle, Straddle Vendido.

Visão de Mercado: Neutra (Baixa volatilidade).

Natureza: Crédito.

Descrição: Venda de uma Call e uma Put no mesmo strike. Lucro máximo é atingido se o ativo expirar exatamente no strike das opções vendidas. Risco ilimitado.

3. Estratégias de Volatilidade (Strangle)
O Strangle é similar ao Straddle, mas utiliza strikes diferentes (geralmente fora do dinheiro - OTM).

3.1 Long Strangle
Nome Técnico: LongStrangle

Variações de Nomes: Compra de Strangle, Strangle Comprado.

Visão de Mercado: Muito Volátil (Espera-se um movimento ainda maior que no Straddle).

Natureza: Débito.

Descrição: Compra de uma Put de strike baixo e uma Call de strike alto. É mais barato que o Straddle, mas exige um movimento maior do preço para entrar na zona de lucro.

3.2 Short Strangle
Nome Técnico: ShortStrangle

Variações de Nomes: Venda de Strangle, Strangle Vendido, Venda de Volatilidade OTM.

Visão de Mercado: Neutra (Baixa volatilidade dentro de um range).

Natureza: Crédito.

Descrição: Venda de uma Put de strike baixo e uma Call de strike alto. Oferece uma probabilidade de lucro maior que o Straddle, pois cria uma "zona de conforto" entre os strikes onde o investidor retém o prêmio total.

Resumo Técnico das Métricas

Estratégia,Tipo de Opção,Direção Strikes,P&L Máximo,Risco Máximo
Bull Call,CALL,K1 < K2,Limitado,Limitado (Débito)
Bear Call,CALL,K1 < K2,Limitado (Crédito),Limitado
Long Straddle,CALL + PUT,K1 = K1,Ilimitado,Limitado (Débito)
Short Strangle,CALL + PUT,K_Put < K_Call,Limitado (Crédito),Ilimitado

Estratégia	Tipo de Opção	Direção Strikes	P&L Máximo	Risco Máximo
Bull Call	CALL	K1 < K2	Limitado	Limitado (Débito)
Bear Call	CALL	K1 < K2	Limitado (Crédito)	Limitado
Long Straddle	CALL + PUT	K1 = K1	Ilimitado	Limitado (Débito)
Short Strangle	CALL + PUT	K_Put < K_Call	Limitado (Crédito)	Ilimitado