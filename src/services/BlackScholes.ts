// src/services/BlackScholes.ts

export class BlackScholes {
    /**
     * Função de Distribuição Normal Acumulada (SFC)
     */
    private static cnd(x: number): number {
        const a1 = 0.31938153, a2 = -0.356563782, a3 = 1.781477937, 
              a4 = -1.821255978, a5 = 1.330274429;
        const L = Math.abs(x);
        const K = 1.0 / (1.0 + 0.2316419 * L);
        let d = 1.0 - 1.0 / Math.sqrt(2 * Math.PI) * Math.exp(-L * L / 2) * (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
        if (x < 0) d = 1.0 - d;
        return d;
    }

    /**
     * Calcula o Delta Teórico
     * @param s Preço Spot (Ativo)
     * @param k Strike
     * @param t Tempo (em anos, ex: dias_uteis / 252)
     * @param v Volatilidade Implicita (ex: 0.35 para 35%)
     * @param r Taxa de Juros (Selic, ex: 0.1075)
     * @param type CALL ou PUT
     */
    public static calculateDelta(s: number, k: number, t: number, v: number, r: number = 0.1075, type: 'CALL' | 'PUT'): number {
        if (v <= 0 || t <= 0) return 0;
        
        const d1 = (Math.log(s / k) + (r + (v * v) / 2) * t) / (v * Math.sqrt(t));
        
        if (type === 'CALL') {
            return parseFloat(this.cnd(d1).toFixed(2));
        } else {
            return parseFloat((this.cnd(d1) - 1).toFixed(2));
        }
    }
}