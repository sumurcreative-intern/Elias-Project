import type { SelectOption } from '@/components/auth/fields';

// The industry a brand works in, picked at onboarding (profiles.category).
// The daily cycle tags every card with the ones it fits (Insight.brandCategories),
// so Beranda can open on the cards for the user's brand.
// Keep in sync with profiles_category_check
export const brandCategoryLabels = {
  beauty: 'Beauty',
  fashion: 'Fashion',
  food_beverage: 'Food & Beverage',
  health_wellness: 'Health & Wellness',
  sports: 'Sports',
  arts: 'Arts',
  entertainment: 'Entertainment',
  technology: 'Technology',
  education: 'Education',
  travel: 'Travel',
  home_living: 'Home & Living',
  automotive: 'Automotive',
  finance: 'Finance',
  parenting: 'Parenting & Kids',
  politics: 'Politics',
} as const;

export type BrandCategory = keyof typeof brandCategoryLabels;

export const brandCategories = Object.keys(brandCategoryLabels) as BrandCategory[];

export const brandCategoryOptions: SelectOption[] = Object.entries(brandCategoryLabels).map(([value, label]) => ({
  value,
  label,
}));

export function isBrandCategory(value: unknown): value is BrandCategory {
  return typeof value === 'string' && Object.hasOwn(brandCategoryLabels, value);
}
