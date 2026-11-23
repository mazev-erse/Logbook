// Plate calculator utility for standard 20kg (or 45lb) Olympic barbell
export interface PlateBreakdown {
  barWeight: number;
  weightPerSide: number;
  platesPerSide: { weight: number; count: number }[];
  remainder: number;
}

const AVAILABLE_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

export function calculatePlates(targetWeight: number, barWeight = 20): PlateBreakdown {
  if (targetWeight <= barWeight) {
    return {
      barWeight,
      weightPerSide: 0,
      platesPerSide: [],
      remainder: 0,
    };
  }

  let remainingPerSide = (targetWeight - barWeight) / 2;
  const platesPerSide: { weight: number; count: number }[] = [];

  for (const plate of AVAILABLE_PLATES_KG) {
    const count = Math.floor(remainingPerSide / plate);
    if (count > 0) {
      platesPerSide.push({ weight: plate, count });
      remainingPerSide = Math.round((remainingPerSide - count * plate) * 100) / 100;
    }
  }

  return {
    barWeight,
    weightPerSide: (targetWeight - barWeight) / 2,
    platesPerSide,
    remainder: remainingPerSide,
  };
}
