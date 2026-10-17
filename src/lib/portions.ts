import { FoodItem, Portion, round, withHouseholdPortion, withPortionWeight } from './model';

export type PortionChoice = { key: string; label: string; grams: number; apply: () => FoodItem };

const fractions: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };
export function quantityText(quantity: number) {
  const whole = Math.floor(quantity);
  const part = fractions[String(round(quantity - whole))];
  if (part) return whole ? `${whole}${part}` : part;
  return String(round(quantity));
}
// "1 cup, chopped" → "cups, chopped"; labels with numbers or punctuation are left alone.
function plural(unit: string) {
  const [word, ...rest] = unit.split(/(?=[\s,(])/);
  const fixed = ['medium', 'small', 'large', 'fl', 'oz', 'g', 'ml', 'tbsp', 'tsp', 'lb', 'kg'];
  if (!/^[a-z]+$/i.test(word) || /s$/i.test(word) || fixed.includes(word.toLowerCase()))
    return unit;
  return [word.endsWith('ch') || word.endsWith('sh') ? `${word}es` : `${word}s`, ...rest].join('');
}
function unitOf(label: string) {
  const match = label.match(/^1\s+(.+)$/);
  return match ? match[1] : null;
}
export function portionText(portion: Portion, quantity: number) {
  const unit = unitOf(portion.label);
  if (!unit) return quantity === 1 ? portion.label : `${quantityText(quantity)} × ${portion.label}`;
  if (quantity === 1) return portion.label;
  return `${quantityText(quantity)} ${quantity > 1 ? plural(unit) : unit}`;
}

// The primary household measure gets a few amounts; other measures appear once.
export function portionChoices(item: FoodItem): PortionChoice[] {
  const per100 = item.nutritionPer100g;
  if (per100 && item.portions?.length) {
    const usable = item.portions.filter((p) => !/quantity not specified/i.test(p.label));
    const primary =
      usable.find((p) => /^1 cup\b/i.test(p.label)) ??
      usable.find((p) => /^1 (slice|piece|medium|serving|can|bottle)\b/i.test(p.label)) ??
      usable.find((p) => unitOf(p.label)) ??
      usable[0];
    // A bare mass like "100 g" (products without a serving size) reads best as plain grams.
    const mass = primary?.label.match(/^\d+(?:\.\d+)?\s*(g|ml)$/i)?.[1];
    if (primary && mass) {
      const choices: PortionChoice[] = [15, 30, 50, 100, 200].map((grams) => ({
        key: `${grams}${mass}`,
        label: `${grams} ${mass}`,
        grams,
        apply: () => withHouseholdPortion(item, { label: `${grams} ${mass}`, grams }, 1),
      }));
      for (const portion of usable)
        if (portion !== primary && !choices.some((c) => c.grams === portion.grams))
          choices.push({
            key: portion.label,
            label: portion.label,
            grams: portion.grams,
            apply: () => withHouseholdPortion(item, portion, 1),
          });
      return choices;
    }
    const amounts = primary ? (/cup/i.test(primary.label) ? [0.5, 1, 1.5, 2] : [1, 2, 3]) : [];
    const choices: PortionChoice[] = amounts.map((quantity) => ({
      key: `${primary!.label}:${quantity}`,
      label: portionText(primary!, quantity),
      grams: round(primary!.grams * quantity),
      apply: () => {
        const next = withHouseholdPortion(item, primary!, quantity);
        next.portion = portionText(primary!, quantity);
        return next;
      },
    }));
    for (const portion of usable) {
      if (portion === primary || choices.length >= 6) continue;
      choices.push({
        key: portion.label,
        label: portion.label,
        grams: portion.grams,
        apply: () => withHouseholdPortion(item, portion, 1),
      });
    }
    if (choices.length) return choices;
  }
  // No household data: scale the estimated amount itself.
  if (item.portionGrams && (per100 || Number.isFinite(item.carbs))) {
    const base = item.originalGrams ?? item.portionGrams;
    const original = item.originalPortion ?? item.portion;
    return [0.5, 0.75, 1, 1.5, 2].map((factor) => ({
      key: `x${factor}`,
      label: factor === 1 ? 'As estimated' : `${quantityText(factor)}×`,
      grams: round(base * factor),
      apply: () => {
        const grams = round(base * factor);
        const ratio = grams / item.portionGrams!;
        const next = withPortionWeight(item, grams);
        next.portion = factor === 1 ? original : `${quantityText(factor)} × ${original}`;
        next.originalGrams = base;
        next.originalPortion = original;
        if (item.carbsRange)
          next.carbsRange = {
            min: round(item.carbsRange.min * ratio),
            max: round(item.carbsRange.max * ratio),
          };
        next.confidence = item.confidence;
        return next;
      },
    }));
  }
  return [];
}

export function selectedChoice(item: FoodItem, choices: PortionChoice[]) {
  if (!item.portionGrams) return null;
  return choices.find((choice) => Math.abs(choice.grams - item.portionGrams!) < 0.6)?.key ?? null;
}
