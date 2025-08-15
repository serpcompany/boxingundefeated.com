export function poundsToKg(pounds: number): string {
    const kg = pounds * 0.453592;
    return kg.toFixed(1);
}
