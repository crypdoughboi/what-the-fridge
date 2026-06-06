import {
  BehaviorState,
  Category,
  GroceryList,
  GroceryListEntry,
  GroceryMemoryItem,
  MealSuggestion,
  ReceiptItem,
  ScanConfidence,
  SpendingCategory,
  SpendingInsight,
  SpendingStore,
  Store,
  StoreSection,
} from '../types';
import { getDaysSince } from './date';

const normalizationMap: Record<string, string> = {
  'BNNA ORG': 'bananas',
  'GRK YGRT': 'Greek yogurt',
  'GREEK YOGURT': 'Greek yogurt',
  'CHKN THGH': 'chicken thighs',
  'SPINACH BAG': 'spinach',
  OATMILK: 'oat milk',
  'OAT MILK': 'oat milk',
  'EGGS DZ': 'eggs',
  'JASMINE RICE': 'jasmine rice',
  ROMAINE: 'romaine',
  TORTILLAS: 'tortillas',
  CUKES: 'cucumbers',
  CUCUMBERS: 'cucumbers',
  'RDS MARINARA': "Rao's marinara",
  'FRZ JSM RICE': 'frozen jasmine rice',
  'PAPR TWLS': 'paper towels',
  'PAPER TOWELS': 'paper towels',
};

export function normalizeReceiptItemName(rawName: string): string {
  const cleaned = rawName.trim().replace(/\s+/g, ' ').toUpperCase();
  if (normalizationMap[cleaned]) return normalizationMap[cleaned];

  return rawName
    .toLowerCase()
    .replace(/\b(org|bag|dz|pkg|ea|lb)\b/g, '')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function categorizingRules(name: string): Category {
  const item = name.toLowerCase();
  if (/(banana|spinach|romaine|avocado|cucumber|berr|scallion|lemon|lime|onion|cilantro|broccoli|pepper|tomato|zucchini|cabbage|cauliflower|carrot|celery|asparagus|kale|arugula|lettuce|chard|beet|radish|turnip|parsnip|sweet potato|yam|squash|pumpkin|leek|shallot|chive|parsley|basil|mint|dill|fennel|artichoke|eggplant|okra|corn|pea|mushroom|apple|pear|peach|plum|mango|papaya|pineapple|melon|watermelon|cantaloupe|grape|cherry|strawberr|blueberr|raspberr|blackberr|cranberr|fig|date|apricot|nectarine|kiwi|grapefruit|orange|clementine|mandarin|tangerine|pomegranate|persimmon)/.test(item)) return 'Produce';
  if (/(chicken|turkey|salmon|tuna|tofu|steak|protein)/.test(item)) return 'Protein';
  if (/(yogurt|egg|milk|feta|cheese|dairy)/.test(item)) return 'Dairy';
  if (/(frozen)/.test(item)) return 'Frozen';
  if (/(rice|coffee|tortilla|pasta|beans|sourdough|peanut butter|bread|marinara)/.test(item)) return 'Pantry';
  if (/(chip|snack|bar|cracker)/.test(item)) return 'Snacks';
  if (/(paper towel|foil|soap|trash)/.test(item)) return 'Household';
  if (/(oil|salsa|hummus|chili crisp|spread|sauce|garlic)/.test(item)) return 'Condiments';
  if (/(coffee|seltzer|juice)/.test(item)) return 'Drinks';
  return 'Other';
}

export function categorizeGroceryItem(name: string): Category {
  return categorizingRules(name);
}

export function sectionForCategory(category: Category): StoreSection {
  if (category === 'Protein') return 'Meat/Protein';
  if (category === 'Condiments' || category === 'Drinks') return 'Pantry';
  if (category === 'Produce') return 'Produce';
  if (category === 'Dairy') return 'Dairy';
  if (category === 'Frozen') return 'Frozen';
  if (category === 'Snacks') return 'Snacks';
  if (category === 'Household') return 'Household';
  if (category === 'Pantry') return 'Pantry';
  return 'Other';
}

export function detectUsuals(items: GroceryMemoryItem[]): GroceryMemoryItem[] {
  return items.filter((item) => item.isUsual || item.purchaseCount >= 3 || item.userOftenAddsManually >= 2);
}

export function calculateProbablyDueSoon(item: GroceryMemoryItem): 'buyNow' | 'maybeBuy' | 'alreadyHave' | 'neutral' {
  const daysSince = getDaysSince(item.lastBoughtDate);
  const averageInterval = item.averageDaysBetweenPurchases;

  if (item.isUsual && daysSince >= averageInterval) return 'buyNow';
  if (item.isUsual && averageInterval - daysSince <= 2 && averageInterval - daysSince >= 0) return 'maybeBuy';
  if (daysSince < Math.max(averageInterval - 7, 4)) return 'alreadyHave';
  if (item.perishable && daysSince <= item.estimatedShelfLifeDays) return 'alreadyHave';
  return 'neutral';
}

function entryFromMemory(item: GroceryMemoryItem, reason: string, source: GroceryListEntry['source']): GroceryListEntry {
  return {
    id: `list-${item.id}`,
    itemId: item.id,
    name: item.name,
    category: item.category,
    section: item.section,
    reason,
    source,
    priority: item.suggestionPriority,
  };
}

function entryFromName(name: string, source: GroceryListEntry['source'], reason: string, priority = 80): GroceryListEntry {
  const category = categorizeGroceryItem(name);
  return {
    id: `${source}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    category,
    section: sectionForCategory(category),
    reason,
    source,
    priority,
  };
}

function hasName(entries: GroceryListEntry[], name: string): boolean {
  return entries.some((entry) => entry.name.toLowerCase() === name.toLowerCase());
}

export function generateGroceryList(items: GroceryMemoryItem[], behavior: BehaviorState, mealSuggestions: MealSuggestion[]): GroceryList {
  const buyNow: GroceryListEntry[] = [];
  const maybeBuy: GroceryListEntry[] = [];
  const probablyAlreadyHave: GroceryListEntry[] = [];

  items.forEach((item) => {
    const wasRemoved = behavior.removedIds.includes(item.id);
    const wasBought = behavior.boughtIds.includes(item.id);
    const markedAlreadyHave = behavior.alreadyHaveIds.includes(item.id);
    const scanStatus = behavior.fridgeSeen[item.name.toLowerCase()];
    if (wasRemoved || wasBought) return;

    if (markedAlreadyHave || scanStatus === 'clearlySeen') {
      const reason = scanStatus === 'clearlySeen' ? 'Seen in your fridge check.' : 'You marked this as already have.';
      probablyAlreadyHave.push(entryFromMemory(item, reason, 'scan'));
      return;
    }

    if (scanStatus === 'maybeLow') {
      maybeBuy.push(entryFromMemory(item, 'Fridge scan saw it, but it looked low.', 'scan'));
      return;
    }

    const dueState = calculateProbablyDueSoon(item);
    const daysSince = getDaysSince(item.lastBoughtDate);
    const priority = adjustSuggestionPriority(item, behavior);
    const adjusted = { ...item, suggestionPriority: priority };

    if (dueState === 'buyNow') {
      buyNow.push(entryFromMemory(adjusted, `${capitalize(item.name)} ${verbForItem(item.name)} usually due every ${item.averageDaysBetweenPurchases} days. Last bought ${daysSince} days ago.`, 'due'));
    } else if (dueState === 'maybeBuy') {
      maybeBuy.push(entryFromMemory(adjusted, `Last bought ${daysSince} days ago. Check before committing.`, 'usual'));
    } else if (dueState === 'alreadyHave') {
      const reason = item.perishable
        ? `${capitalize(item.name)} showed up recently and may still be around.`
        : `${capitalize(item.name)} ${pastVerbForItem(item.name)} bought recently and usually lasts.`;
      probablyAlreadyHave.push(entryFromMemory(adjusted, reason, 'overbuy'));
    }
  });

  behavior.manuallyAddedNames.forEach((name) => {
    if (!hasName(buyNow, name) && !hasName(probablyAlreadyHave, name)) {
      buyNow.push(entryFromName(name, 'manual', 'Added by you.', 95));
    }
  });

  behavior.mealAddedNames.forEach((name) => {
    if (!hasName(buyNow, name) && !hasName(probablyAlreadyHave, name)) {
      buyNow.push(entryFromName(name, 'meal', 'Needed for a dinner you picked.', 90));
    }
  });

  const mealUnlockNames = ['scallions', 'lemon', 'tortillas', 'romaine', 'red onion'];
  const mealUnlockItems = mealUnlockNames.map((name) => entryFromName(name, 'meal', 'Unlocks multiple quick dinners.', 70));

  const overbuyAlerts = identifyLikelyOverbuys(items, { buyNow, maybeBuy }, behavior);

  return {
    buyNow: sortListEntries(buyNow).slice(0, 12),
    maybeBuy: sortListEntries(maybeBuy).slice(0, 10),
    probablyAlreadyHave: sortListEntries(probablyAlreadyHave).slice(0, 12),
    mealUnlocks: {
      title: 'Buy these 5 things to unlock 4 dinners.',
      items: mealUnlockItems,
      meals: mealSuggestions.slice(0, 4).map((meal) => meal.name.toLowerCase()),
    },
    overbuyAlerts,
  };
}

export function groupListItemsByStoreSection(entries: GroceryListEntry[]): Record<StoreSection, GroceryListEntry[]> {
  const sections: StoreSection[] = ['Produce', 'Meat/Protein', 'Dairy', 'Pantry', 'Frozen', 'Snacks', 'Household', 'Other'];
  return sections.reduce(
    (grouped, section) => {
      grouped[section] = entries.filter((entry) => entry.section === section);
      return grouped;
    },
    {} as Record<StoreSection, GroceryListEntry[]>,
  );
}

export function identifyLikelyOverbuys(items: GroceryMemoryItem[], list: Pick<GroceryList, 'buyNow' | 'maybeBuy'>, behavior: BehaviorState): string[] {
  const candidateNames = new Set([...list.buyNow, ...list.maybeBuy].map((entry) => entry.name.toLowerCase()));
  const alerts: string[] = [];

  items.forEach((item) => {
    const daysSince = getDaysSince(item.lastBoughtDate);
    const scanStatus = behavior.fridgeSeen[item.name.toLowerCase()];
    if (scanStatus === 'clearlySeen') {
      alerts.push(`Check ${item.name} before buying. ${seenSentenceSubject(item.name)} seen in your fridge scan.`);
      return;
    }
    if (candidateNames.has(item.name.toLowerCase()) && !item.perishable && daysSince < item.averageDaysBetweenPurchases / 2) {
      alerts.push(`Don't buy ${item.name}. You bought it ${daysSince} days ago and usually buy it every ${item.averageDaysBetweenPurchases} days.`);
    }
  });

  const rice = items.find((item) => item.name === 'rice');
  if (rice && !alerts.some((alert) => alert.includes('rice'))) {
    alerts.push(`Don't buy rice. You bought it ${getDaysSince(rice.lastBoughtDate)} days ago and usually buy it every ${rice.averageDaysBetweenPurchases} days.`);
  }

  return alerts.slice(0, 3);
}

export function calculateSpendingInsights(categorySpend: SpendingInsight['categorySpend'], storeSpend: SpendingStore[]): SpendingInsight {
  const monthlySpend = 612;
  const topStore = storeSpend.reduce((top, store) => (store.amount > top.amount ? store : top), storeSpend[0]);
  const snacks = categorySpend.find((category) => category.name === 'Snacks');
  const categoryInsight = snacks ? `Snacks are up $${Math.round(snacks.amount - snacks.previousAmount)} from last month.` : 'Produce is carrying dinner this month.';

  return {
    monthlySpend,
    topStore: topStore.store,
    topStoreShare: Math.round((topStore.amount / monthlySpend) * 100),
    categoryInsight,
    plainEnglishInsight: `You spent $${monthlySpend} this month. ${categoryInsight}`,
    categorySpend,
    storeSpend,
    repeatItems: ['oat milk', 'bananas', 'Greek yogurt', 'coffee'],
    expensiveItems: ['berries', 'olive oil', 'paper towels'],
    overbuyAlerts: [
      'You bought rice twice in 12 days. Check before rebuying.',
      'Oat milk is usually due every 6 days. Last bought 8 days ago.',
    ],
    staplesWeeklyCost: 91,
  };
}

const emptySpendingInsight: SpendingInsight = {
  monthlySpend: 0,
  topStore: 'Other',
  topStoreShare: 0,
  categoryInsight: '',
  plainEnglishInsight: '',
  categorySpend: [],
  storeSpend: [],
  repeatItems: [],
  expensiveItems: [],
  overbuyAlerts: [],
  staplesWeeklyCost: 0,
};

// Builds spend insights from the user's real purchase history. Returns an empty
// insight (all zeros) until they have actually logged receipts, so new accounts
// start blank instead of showing seeded sample numbers.
export function deriveSpendingInsight(items: GroceryMemoryItem[]): SpendingInsight {
  if (items.length === 0) return emptySpendingInsight;

  const categoryTotals = new Map<Category, number>();
  const storeTotals = new Map<Store, number>();
  items.forEach((item) => {
    const spent = item.currentPrice * item.purchaseCount;
    categoryTotals.set(item.category, (categoryTotals.get(item.category) ?? 0) + spent);
    storeTotals.set(item.store, (storeTotals.get(item.store) ?? 0) + spent);
  });

  const categorySpend: SpendingCategory[] = [...categoryTotals.entries()]
    .map(([name, amount]) => ({ name, amount: Math.round(amount), previousAmount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const storeSpend: SpendingStore[] = [...storeTotals.entries()]
    .map(([store, amount]) => ({ store, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);

  const monthlySpend = storeSpend.reduce((total, store) => total + store.amount, 0);
  const topStore = storeSpend[0];
  const topStoreShare = monthlySpend ? Math.round((topStore.amount / monthlySpend) * 100) : 0;
  const topCategory = categorySpend[0];
  const categoryInsight = topCategory ? `${topCategory.name} is your biggest category so far at $${topCategory.amount}.` : '';

  const repeatItems = [...items]
    .filter((item) => item.purchaseCount >= 3)
    .sort((a, b) => b.purchaseCount - a.purchaseCount)
    .slice(0, 6)
    .map((item) => item.name);
  const expensiveItems = [...items]
    .sort((a, b) => b.currentPrice - a.currentPrice)
    .slice(0, 3)
    .map((item) => item.name);
  const overbuyAlerts = items
    .filter((item) => !item.perishable && getDaysSince(item.lastBoughtDate) < item.averageDaysBetweenPurchases / 2)
    .slice(0, 3)
    .map(
      (item) =>
        `Don't rebuy ${item.name} yet. Bought ${getDaysSince(item.lastBoughtDate)} days ago, usually every ${item.averageDaysBetweenPurchases}.`,
    );
  const staplesWeeklyCost = Math.round(
    items
      .filter((item) => item.isUsual)
      .reduce((total, item) => total + item.currentPrice * (7 / Math.max(item.averageDaysBetweenPurchases, 7)), 0),
  );

  return {
    monthlySpend,
    topStore: topStore.store,
    topStoreShare,
    categoryInsight,
    plainEnglishInsight: `You've spent $${monthlySpend} on tracked groceries. ${categoryInsight}`.trim(),
    categorySpend,
    storeSpend,
    repeatItems,
    expensiveItems,
    overbuyAlerts,
    staplesWeeklyCost,
  };
}

export function updateLocalStateAfterUserAction(behavior: BehaviorState, action: 'alreadyHave' | 'bought' | 'removed', itemId: string): BehaviorState {
  if (action === 'alreadyHave') {
    return {
      ...behavior,
      alreadyHaveIds: unique([...behavior.alreadyHaveIds, itemId]),
      boughtIds: behavior.boughtIds.filter((id) => id !== itemId),
      removedIds: behavior.removedIds.filter((id) => id !== itemId),
    };
  }
  if (action === 'bought') {
    return {
      ...behavior,
      boughtIds: unique([...behavior.boughtIds, itemId]),
      alreadyHaveIds: behavior.alreadyHaveIds.filter((id) => id !== itemId),
      removedIds: behavior.removedIds.filter((id) => id !== itemId),
    };
  }
  return {
    ...behavior,
    removedIds: unique([...behavior.removedIds, itemId]),
    deleteCounts: {
      ...behavior.deleteCounts,
      [itemId]: (behavior.deleteCounts[itemId] ?? 0) + 1,
    },
  };
}

export function adjustSuggestionPriority(item: GroceryMemoryItem, behavior: BehaviorState): number {
  const deletedPenalty = (behavior.deleteCounts[item.id] ?? item.userOftenDeletes) * 8;
  const manualBoost = (behavior.addCounts[item.name.toLowerCase()] ?? item.userOftenAddsManually) * 7;
  return Math.max(1, item.suggestionPriority - deletedPenalty + manualBoost);
}

export function buildReceiptItems(rawItems: Array<{ rawName: string; price: number; isGrocery?: boolean }>): ReceiptItem[] {
  return rawItems.map((item, index) => {
    const normalizedName = normalizeReceiptItemName(item.rawName);
    const category = categorizeGroceryItem(normalizedName);
    return {
      id: `receipt-item-${index}-${normalizedName.replace(/[^a-z0-9]+/gi, '-')}`,
      rawName: item.rawName,
      normalizedName,
      category,
      section: sectionForCategory(category),
      price: item.price,
      isGrocery: item.isGrocery ?? true,
    };
  });
}

export function scanConfidenceLabel(confidence: ScanConfidence): string {
  if (confidence === 'clearlySeen') return 'Clearly seen';
  if (confidence === 'maybeLow') return 'Maybe low';
  return 'Could not tell';
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function verbForItem(value: string): 'is' | 'are' {
  const singularNames = [
    'rice',
    'coffee',
    'oat milk',
    'Greek yogurt',
    'ground turkey',
    'olive oil',
    'peanut butter',
    'hummus',
    'feta',
    'pasta',
    'spinach',
    'romaine',
    'broccoli',
    'sourdough',
    'garlic',
    'salsa',
    'chili crisp',
    "Rao's marinara",
    'frozen jasmine rice',
  ];
  return singularNames.includes(value) || value.endsWith('milk') ? 'is' : 'are';
}

function pastVerbForItem(value: string): 'was' | 'were' {
  return verbForItem(value) === 'is' ? 'was' : 'were';
}

function seenSentenceSubject(value: string): 'It was' | 'They were' {
  return verbForItem(value) === 'is' ? 'It was' : 'They were';
}

function sortListEntries(entries: GroceryListEntry[]): GroceryListEntry[] {
  return [...entries].sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
