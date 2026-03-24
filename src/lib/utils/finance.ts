interface CashFlow {
    amount: number; // Negative for investments (outflow), Positive for current value (inflow)
    date: Date;
}

export function calculateXIRR(cashFlows: CashFlow[]): number {
    if (cashFlows.length < 2) return 0;

    // Filter out invalid dates
    const validFlows = cashFlows.filter(f => f.date && !isNaN(f.date.getTime()));
    if (validFlows.length < 2) return 0;
    
    // Sort by date just to be safe
    validFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Newton-Raphson Method
    let rate = 0.1; // Initial guess: 10%
    const iterations = 100;
    const epsilon = 1e-6;

    for (let i = 0; i < iterations; i++) {
        let f = 0;
        let df = 0;

        for (const flow of validFlows) {
            const daysDiff = (flow.date.getTime() - validFlows[0].date.getTime()) / (1000 * 60 * 60 * 24);
            const yearFrac = daysDiff / 365;
            
            const term = Math.pow(1 + rate, yearFrac);
            f += flow.amount / term;
            // Prevent division by zero
            if (term !== 0 && (1 + rate) !== 0) {
                df -= (yearFrac * flow.amount) / (term * (1 + rate));
            }
        }

        // Avoid division by zero in derivative
        if (Math.abs(df) < 1e-10) {
            return rate * 100;
        }

        const nextRate = rate - f / df;
        if (Math.abs(nextRate - rate) < epsilon) return nextRate * 100;
        
        // Safety cap on the rate to prevent extreme divergence
        if (nextRate > 1000) rate = 1000;
        else if (nextRate < -0.999) rate = -0.999;
        else rate = nextRate;
    }

    return rate * 100; // Return as percentage
}
