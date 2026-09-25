import type { Json } from "@/integrations/supabase/types";
import type { Language } from "@/lib/language";

// Mirrors Food.getNutrientAmount from the Flutter app (lib/src/models/food.dart).

export type Nutrient =
  | "carbohydrates"
  | "proteins"
  | "fats"
  | "calories"
  | "fiber"
  | "sugar"
  | "sodium"
  | "water";

export const NUTRIENTS: Nutrient[] = [
  "carbohydrates",
  "proteins",
  "fats",
  "calories",
  "fiber",
  "sugar",
  "sodium",
  "water",
];

export type FoodRow = {
  created_at: string;
  is_manual: boolean;
  is_edited: boolean;
  foods: Json;
};

type Item = {
  calories_kcal?: number;
  proteins_g?: number;
  sodium_mg?: number;
  total_fats_g?: number;
  water_g?: number;
  total_carbohydrates_g?: number;
  dietary_fiber_g?: { total_fiber_g?: number };
  available_carbohydrates_g?: {
    complex_carbohydrates_g?: number;
    simple_sugars_g?: number;
  };
};

const num = (value: unknown) => (typeof value === "number" ? value : 0);

export function nutrientAmount(food: FoodRow, nutrient: Nutrient): number {
  const items = Array.isArray(food.foods) ? (food.foods as Item[]) : [];
  const manual = food.is_manual || food.is_edited;
  const sum = (pick: (item: Item) => unknown) =>
    items.reduce((total, item) => total + num(item && pick(item)), 0);

  switch (nutrient) {
    case "calories":
      return sum((i) => i.calories_kcal);
    case "proteins":
      return sum((i) => i.proteins_g);
    case "sodium":
      return sum((i) => i.sodium_mg);
    case "fats":
      return sum((i) => i.total_fats_g);
    case "fiber":
      return sum((i) => i.dietary_fiber_g?.total_fiber_g);
    case "carbohydrates":
      return manual
        ? sum((i) => i.total_carbohydrates_g)
        : sum(
            (i) =>
              num(i.available_carbohydrates_g?.complex_carbohydrates_g) +
              num(i.available_carbohydrates_g?.simple_sugars_g),
          );
    case "sugar":
      return manual
        ? 0
        : sum((i) => i.available_carbohydrates_g?.simple_sugars_g);
    case "water":
      return manual ? 0 : sum((i) => i.water_g);
  }
}

export function nutrientUnit(nutrient: Nutrient) {
  if (nutrient === "calories") return "kcal";
  if (nutrient === "sodium") return "mg";
  if (nutrient === "water") return "ml";
  return "g";
}

export const nutrientLabels: Record<Language, Record<Nutrient, string>> = {
  es: {
    carbohydrates: "Carbohidratos",
    proteins: "Proteínas",
    fats: "Grasas",
    calories: "Calorías",
    fiber: "Fibra",
    sugar: "Azúcar",
    sodium: "Sodio",
    water: "Agua",
  },
  en: {
    carbohydrates: "Carbohydrates",
    proteins: "Proteins",
    fats: "Fats",
    calories: "Calories",
    fiber: "Fiber",
    sugar: "Sugar",
    sodium: "Sodium",
    water: "Water",
  },
  it: {
    carbohydrates: "Carboidrati",
    proteins: "Proteine",
    fats: "Grassi",
    calories: "Calorie",
    fiber: "Fibre",
    sugar: "Zucchero",
    sodium: "Sodio",
    water: "Acqua",
  },
};
