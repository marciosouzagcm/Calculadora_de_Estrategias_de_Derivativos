// src/utils/FinancialUtils.ts
/**
 * @fileoverview Funções utilitárias financeiras e de data/hora.
 * Contém a lógica para calcular dias úteis, traduzida de Pandas/Numpy (Python).
 */

// NOTA: Em TypeScript, o cálculo de dias úteis sem uma biblioteca pesada de terceiros (como o Pandas no Python)
// é complexo devido a feriados. Usaremos uma lógica simplificada para fins de demonstração,
// contando apenas dias que não são Sábados ou Domingos.
export function calculateBusinessDays(startDateStr: string, endDateStr: string): number {
    // [REVISÃO] A função deve tratar a diferença de fuso horário corretamente
    // e garantir que a contagem siga a convenção de exclusão/inclusão das datas-limite.
    try {
        // Garantindo que as datas sejam tratadas como início do dia (para evitar problemas de fuso)
        const start = new Date(startDateStr);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(endDateStr);
        end.setHours(0, 0, 0, 0);

        if (start > end) return 0;
        
        let businessDays = 0;
        let current = new Date(start);

        // [CORREÇÃO] Removemos a linha current.setDate(current.getDate() + 1);
        // Em vez de pular a data inicial, vamos começar a contagem a partir da data inicial
        // e excluir o dia inicial (start) no loop.

        // Clonamos a data inicial e avançamos para o primeiro dia de contagem (o dia seguinte)
        current.setDate(current.getDate() + 1);
        
        // Loop: Conta dias úteis do dia Seguinte ao Start até o End (inclusive)
        while (current <= end) {
            const dayOfWeek = current.getDay(); // 0 = Domingo, 6 = Sábado
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDays++;
            }
            // Avança para o próximo dia
            current.setDate(current.getDate() + 1);
        }

        return Math.max(0, businessDays);

    } catch (e) {
        console.error("Erro ao calcular dias úteis:", e);
        return NaN;
    }
}