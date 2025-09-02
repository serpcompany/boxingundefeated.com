export function poundsToKg(pounds: number): string {
    const kg = pounds * 0.453592;
    return kg.toFixed(1);
}

export function formatWeightLimits(slug: string, limitPounds: number): string {
    if (slug === 'heavyweight') {
        return 'No limit';
    }

    return `${limitPounds} lbs / ${poundsToKg(limitPounds)} kg`;
}
