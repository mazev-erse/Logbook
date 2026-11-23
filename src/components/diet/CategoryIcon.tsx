import React from 'react';
import {
  Coffee,
  Sun,
  Moon,
  Apple,
  Flame,
  Zap,
  Dumbbell,
  CupSoda,
  Utensils,
  Sparkles,
  Cookie,
  Sandwich,
  Salad,
  Pizza,
} from 'lucide-react';

export const CATEGORY_ICONS_LIST = [
  { name: 'Coffee', label: 'Coffee / Morning', icon: Coffee },
  { name: 'Sun', label: 'Sun / Midday', icon: Sun },
  { name: 'Moon', label: 'Moon / Night', icon: Moon },
  { name: 'Apple', label: 'Apple / Snack', icon: Apple },
  { name: 'Flame', label: 'Flame / Calorie', icon: Flame },
  { name: 'Zap', label: 'Zap / Pre-Workout', icon: Zap },
  { name: 'Dumbbell', label: 'Dumbbell / Post-Workout', icon: Dumbbell },
  { name: 'CupSoda', label: 'Shake / Drink', icon: CupSoda },
  { name: 'Sandwich', label: 'Sandwich / Fast Meal', icon: Sandwich },
  { name: 'Salad', label: 'Salad / Healthy', icon: Salad },
  { name: 'Pizza', label: 'Pizza / Cheat', icon: Pizza },
  { name: 'Cookie', label: 'Cookie / Treat', icon: Cookie },
  { name: 'Utensils', label: 'Utensils / Default', icon: Utensils },
];

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  coffee: Coffee,
  sun: Sun,
  moon: Moon,
  apple: Apple,
  flame: Flame,
  zap: Zap,
  dumbbell: Dumbbell,
  cupsoda: CupSoda,
  sandwich: Sandwich,
  salad: Salad,
  pizza: Pizza,
  cookie: Cookie,
  utensils: Utensils,
  sparkles: Sparkles,
};

/**
 * Returns a React Lucide Icon matching the category name or explicit icon key
 */
export function getCategoryIconComponent(iconKey?: string, categoryName?: string) {
  if (iconKey && ICON_MAP[iconKey.toLowerCase()]) {
    return ICON_MAP[iconKey.toLowerCase()];
  }

  // Automatic semantic matching based on category name
  const lowerName = (categoryName || '').toLowerCase();
  if (lowerName.includes('breakfast') || lowerName.includes('morning')) return Coffee;
  if (lowerName.includes('lunch') || lowerName.includes('noon')) return Sun;
  if (lowerName.includes('dinner') || lowerName.includes('night') || lowerName.includes('late')) return Moon;
  if (lowerName.includes('snack') || lowerName.includes('fruit')) return Apple;
  if (lowerName.includes('pre') || lowerName.includes('energy')) return Zap;
  if (lowerName.includes('post') || lowerName.includes('protein') || lowerName.includes('workout')) return Dumbbell;
  if (lowerName.includes('shake') || lowerName.includes('smoothie')) return CupSoda;
  if (lowerName.includes('cheat') || lowerName.includes('dessert')) return Cookie;

  return Utensils;
}

interface CategoryIconProps {
  iconKey?: string;
  categoryName?: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconKey,
  categoryName,
  className = 'w-4 h-4',
}) => {
  const IconComponent = getCategoryIconComponent(iconKey, categoryName);
  return <IconComponent className={className} />;
};
