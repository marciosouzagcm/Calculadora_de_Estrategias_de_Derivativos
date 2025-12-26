// src/services/BlackScholes.ts

export class BlackScholes {
    /**
     * Função de Distribuição Normal Acumulada (CND)
     * Aproximação de alta precisão para o modelo Black-Scholes
     */
    private static cnd(x: number): number {
        const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, 
              a4 = -1.821255978, a5 = 1.330274429;
        const L = Math.abs(x);
        const K = 1.0 / (1.0 + 0.2316419 * L);
        let d = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
        
        return x < 0 ? 1.0 - d : d;
    }

    /**
     * Função de Densidade de Probabilidade (Normal)
     */
    private static nd(x: number): number {
        return Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
    }

    /**
     * Cálculo do d1 (Probabilidade de exercício no dinheiro)
     */
    private static getD1(s: number, k: number, t: number, v: number, r: number): number {
        // Proteção contra valores inválidos ou tempo zero (vencimento)
        if (v <= 0 || t <= 0 || s <= 0 || k <= 0) return 0;
        return (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
    }

    public static calculateDelta(s: number, k: number, t: number, v: number, r: number = 0.1075, type: 'CALL' | 'PUT'): number {
        if (t <= 0) return 0; // Opção expirada
        const d1 = this.getD1(s, k, t, v, r);
        return type === 'CALL' ? this.cnd(d1) : this.cnd(d1) - 1;
    }

    public static calculateGamma(s: number, k: number, t: number, v: number, r: number = 0.1075): number {
        if (s <= 0 || v <= 0 || t <= 0) return 0;
        const d1 = this.getD1(s, k, t, v, r);
        return this.nd(d1) / (s * v * Math.sqrt(t));
    }

    public static calculateVega(s: number, k: number, t: number, v: number, r: number = 0.1075): number {
        if (s <= 0 || v <= 0 || t <= 0) return 0;
        const d1 = this.getD1(s, k, t, v, r);
        // Retorna o valor financeiro para mudança de 1% na volatilidade
        return (s * Math.sqrt(t) * this.nd(d1)) / 100;
    }

    public static calculateTheta(s: number, k: number, t: number, v: number, r: number = 0.1075, type: 'CALL' | 'PUT'): number {
        if (s <= 0 || v <= 0 || t <= 0) return 0;
        
        const d1 = this.getD1(s, k, t, v, r);
        const d2 = d1 - v * Math.sqrt(t);
        
        // Termo 1: Decaimento pela volatilidade
        const term1 = -(s * v * this.nd(d1)) / (2 * Math.sqrt(t));
        // Termo 2: Decaimento pela taxa de juros (r)
        const term2 = r * k * Math.exp(-r * t);

        if (type === 'CALL') {
            const thetaAnual = term1 - term2 * this.cnd(d2);
            return thetaAnual / 252; // Divide por dias úteis
        } else {
            const thetaAnual = term1 + term2 * this.cnd(-d2);
            return thetaAnual / 252;
        }
    }
}