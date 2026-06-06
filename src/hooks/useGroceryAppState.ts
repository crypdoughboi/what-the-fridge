import { useEffect, useMemo, useState } from 'react';
import {
  BehaviorState,
  ChefMode,
  GroceryListEntry,
  GroceryMemoryItem,
  MealSuggestion,
  OnboardingProfile,
  ReceiptExtraction,
  ScanConfidence,
  UserAccount,
  VisionItem,
} from '../types';
import { defaultProfile } from '../data/mockData';
import {
  categorizeGroceryItem,
  deriveSpendingInsight,
  detectUsuals,
  generateGroceryList,
  normalizeReceiptItemName,
  sectionForCategory,
  updateLocalStateAfterUserAction,
} from '../utils/groceryLogic';
import { getMealsForMode } from '../services/mealGenerationService';
import {
  getCurrentUserAccount,
  listenForAuthChanges,
  signInWithAppleId,
  signInWithEmailMagicLink,
  signInWithGmail,
  signOut,
} from '../services/authService';

const legacyAccountStorageKey = 'wtf.account.v1';

type PersonalizedState = {
  completedOnboarding: boolean;
  profile: OnboardingProfile;
  memory: GroceryMemoryItem[];
  behavior: BehaviorState;
  savedMealIds: string[];
  cookedMealIds: string[];
  recommendedItems: string[];
};

const emptyBehavior: BehaviorState = {
  alreadyHaveIds: [],
  removedIds: [],
  boughtIds: [],
  manuallyAddedNames: [],
  mealAddedNames: [],
  fridgeSeen: {},
  addCounts: {},
  deleteCounts: {},
};

export function useGroceryAppState() {
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [completedOnboarding, setCompletedOnboarding] = useState(false);
  const [profile, setProfile] = useState<OnboardingProfile>(defaultProfile);
  const [memory, setMemory] = useState<GroceryMemoryItem[]>([]);
  const [behavior, setBehavior] = useState<BehaviorState>(emptyBehavior);
  const [toast, setToast] = useState<string | null>(null);
  const [savedMealIds, setSavedMealIds] = useState<string[]>([]);
  const [cookedMealIds, setCookedMealIds] = useState<string[]>([]);
  const [recommendedItems, setRecommendedItems] = useState<string[]>([]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  };

  const baseMeals = useMemo(() => getMealsForMode(profile.cookingStyle as ChefMode), [profile.cookingStyle]);
  const groceryList = useMemo(() => generateGroceryList(memory, behavior, baseMeals), [memory, behavior, baseMeals]);
  const usuals = useMemo(() => detectUsuals(memory), [memory]);
  const spendingInsight = useMemo(() => deriveSpendingInsight(memory), [memory]);
  const useSoon = useMemo(
    () =>
      memory
        .filter((item) => item.perishable && item.likelyStillHave)
        .sort((a, b) => a.estimatedShelfLifeDays - b.estimatedShelfLifeDays)
        .slice(0, 4),
    [memory],
  );

  useEffect(() => {
    window.localStorage.removeItem(legacyAccountStorageKey);

    let mounted = true;

    getCurrentUserAccount()
      .then((currentAccount) => {
        if (!mounted) return;
        if (currentAccount) {
          activateAccount(currentAccount);
        }
        setAuthReady(true);
      })
      .catch((error) => {
        if (!mounted) return;
        setAuthError(error instanceof Error ? error.message : 'Could not check your account.');
        setAuthReady(true);
      });

    const unsubscribe = listenForAuthChanges((nextAccount) => {
      if (!mounted) return;
      if (nextAccount) {
        activateAccount(nextAccount);
      } else {
        setAccount(null);
        applyPersonalizedState(defaultPersonalizedState());
      }
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    writeStorage(personalizedStorageKey(account.id), {
      completedOnboarding,
      profile,
      memory,
      behavior,
      savedMealIds,
      cookedMealIds,
      recommendedItems,
    });
  }, [account, completedOnboarding, profile, memory, behavior, savedMealIds, cookedMealIds, recommendedItems]);

  async function createAccountWithApple() {
    setAuthError(null);
    await signInWithAppleId();
  }

  async function createAccountWithGmail() {
    setAuthError(null);
    await signInWithGmail();
  }

  async function createAccountWithEmail(email: string) {
    setAuthError(null);
    await signInWithEmailMagicLink(email);
    showToast('Check your email. WTF sent the sign-in link.');
  }

  async function signOutAccount() {
    await signOut();
    setAccount(null);
    setCompletedOnboarding(false);
    applyPersonalizedState(defaultPersonalizedState());
    showToast('Signed out. Grocery memory stays tied to your account.');
  }

  function activateAccount(nextAccount: UserAccount) {
    setAccount(nextAccount);
    const savedState = readStorage<PersonalizedState>(personalizedStorageKey(nextAccount.id));
    if (savedState) {
      applyPersonalizedState(savedState);
      return;
    }
    applyPersonalizedState(defaultPersonalizedState());
  }

  function applyPersonalizedState(state: PersonalizedState) {
    setCompletedOnboarding(state.completedOnboarding);
    setProfile(state.profile);
    setMemory(state.memory);
    setBehavior(state.behavior);
    setSavedMealIds(state.savedMealIds);
    setCookedMealIds(state.cookedMealIds);
    setRecommendedItems(state.recommendedItems);
  }

  function completeOnboarding(nextProfile: OnboardingProfile) {
    setProfile(nextProfile);
    setCompletedOnboarding(true);
  }

  function markEntryAlreadyHave(entry: GroceryListEntry) {
    if (entry.itemId) {
      setBehavior((current) => updateLocalStateAfterUserAction(current, 'alreadyHave', entry.itemId!));
    } else {
      setBehavior((current) => ({
        ...current,
        manuallyAddedNames: current.manuallyAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
        mealAddedNames: current.mealAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
        fridgeSeen: { ...current.fridgeSeen, [entry.name.toLowerCase()]: 'clearlySeen' },
      }));
    }
    showToast(`${entry.name} moved to probably already have.`);
  }

  function markEntryBought(entry: GroceryListEntry) {
    if (entry.itemId) {
      setBehavior((current) => updateLocalStateAfterUserAction(current, 'bought', entry.itemId!));
      setMemory((current) => current.map((item) => (item.id === entry.itemId ? updateBoughtMemoryItem(item) : item)));
    } else {
      setMemory((current) => [createMemoryItemFromName(entry.name), ...current]);
      setBehavior((current) => ({
        ...current,
        manuallyAddedNames: current.manuallyAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
        mealAddedNames: current.mealAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
      }));
    }
    showToast(`${entry.name} marked bought. Grocery brain updated.`);
  }

  function removeEntry(entry: GroceryListEntry) {
    if (entry.itemId) {
      setBehavior((current) => updateLocalStateAfterUserAction(current, 'removed', entry.itemId!));
    } else {
      setBehavior((current) => ({
        ...current,
        manuallyAddedNames: current.manuallyAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
        mealAddedNames: current.mealAddedNames.filter((name) => name.toLowerCase() !== entry.name.toLowerCase()),
      }));
    }
    showToast(`${entry.name} removed. WTF took the hint.`);
  }

  function addManualItem(name: string) {
    const normalized = normalizeReceiptItemName(name);
    if (!normalized) return;
    setBehavior((current) => ({
      ...current,
      manuallyAddedNames: unique([...current.manuallyAddedNames, normalized]),
      addCounts: {
        ...current.addCounts,
        [normalized.toLowerCase()]: (current.addCounts[normalized.toLowerCase()] ?? 0) + 1,
      },
    }));
    showToast(`${normalized} added.`);
  }

  function addUsualsToList() {
    const usualNames = usuals
      .filter((item) => !behavior.alreadyHaveIds.includes(item.id))
      .slice(0, 4)
      .map((item) => item.name);
    setBehavior((current) => ({
      ...current,
      manuallyAddedNames: unique([...current.manuallyAddedNames, ...usualNames]),
    }));
    showToast('Usuals added. Rice can still sit this one out.');
  }

  function addMealMissingItems(meal: MealSuggestion) {
    const names = meal.buy.map((item) => normalizeReceiptItemName(item.replace(', optional', '')));
    setBehavior((current) => ({
      ...current,
      mealAddedNames: unique([...current.mealAddedNames, ...names]),
      addCounts: names.reduce(
        (counts, name) => ({
          ...counts,
          [name.toLowerCase()]: (current.addCounts[name.toLowerCase()] ?? 0) + 1,
        }),
        current.addCounts,
      ),
    }));
    showToast(`Missing items added for ${meal.name}.`);
  }

  function addPlanMeals(meals: MealSuggestion[]) {
    const allNames = meals.flatMap((meal) => meal.buy.map((item) => normalizeReceiptItemName(item.replace(', optional', ''))));
    const deduped = unique(allNames);
    const alreadyHaveNames = new Set(
      memory.filter((item) => item.likelyStillHave).map((item) => item.name.toLowerCase()),
    );
    const needed = deduped.filter((name) => !alreadyHaveNames.has(name.toLowerCase()));
    setBehavior((current) => ({
      ...current,
      mealAddedNames: unique([...current.mealAddedNames, ...needed]),
      addCounts: needed.reduce(
        (counts, name) => ({
          ...counts,
          [name.toLowerCase()]: (current.addCounts[name.toLowerCase()] ?? 0) + 1,
        }),
        current.addCounts,
      ),
    }));
    const skipped = deduped.length - needed.length;
    const skipNote = skipped > 0 ? ` (${skipped} you already have skipped)` : '';
    showToast(`${needed.length} ingredient${needed.length !== 1 ? 's' : ''} added for ${meals.length} meal${meals.length !== 1 ? 's' : ''}${skipNote}.`);
  }

  function addMealUnlockItems(entries: GroceryListEntry[]) {
    const names = entries.map((entry) => entry.name);
    setBehavior((current) => ({
      ...current,
      mealAddedNames: unique([...current.mealAddedNames, ...names]),
    }));
    showToast('Five small buys. Four dinners unlocked.');
  }

  function rebuildList() {
    setBehavior((current) => ({
      ...current,
      removedIds: [],
    }));
    showToast('Your list is ready. Fridge says no to rice.');
  }

  function confirmReceipt(extraction: ReceiptExtraction) {
    setMemory((current) => mergeReceiptIntoMemory(current, extraction));
    setBehavior((current) => ({
      ...current,
      boughtIds: [],
      removedIds: [],
    }));
    showToast('Receipt added. Grocery brain updated.');
  }

  function updateListFromFridge(items: VisionItem[]) {
    const seen = items.reduce<Record<string, ScanConfidence>>((acc, item) => {
      acc[item.name.toLowerCase()] = item.confidence;
      return acc;
    }, {});

    setBehavior((current) => ({
      ...current,
      fridgeSeen: {
        ...current.fridgeSeen,
        ...seen,
      },
    }));

    setMemory((current) =>
      current.map((item) =>
        seen[item.name.toLowerCase()] === 'clearlySeen'
          ? {
              ...item,
              likelyStillHave: true,
              confidence: 'high',
            }
          : item,
      ),
    );
    showToast("List updated. Fridge says don't buy eggs.");
  }

  function addImportedItems(entries: GroceryListEntry[]) {
    const names = entries.map((entry) => entry.name);
    setBehavior((current) => ({
      ...current,
      manuallyAddedNames: unique([...current.manuallyAddedNames, ...names]),
      addCounts: names.reduce(
        (counts, name) => ({
          ...counts,
          [name.toLowerCase()]: (current.addCounts[name.toLowerCase()] ?? 0) + 1,
        }),
        current.addCounts,
      ),
    }));
    showToast("Old list imported. We'll use this to learn your usuals.");
  }

  function saveMeal(mealId: string) {
    setSavedMealIds((current) => unique([...current, mealId]));
    showToast('Saved. Future you gets the assist.');
  }

  function markMealCooked(mealId: string) {
    setCookedMealIds((current) => unique([...current, mealId]));
    showToast('Cooked. Grocery brain learned dinner.');
  }

  function recommendItem(itemName: string) {
    setRecommendedItems((current) => unique([...current, itemName]));
    showToast(`${itemName} recommended. Spending stayed private.`);
  }

  function keepPrivate(itemName: string) {
    setRecommendedItems((current) => current.filter((item) => item !== itemName));
    showToast(`${itemName} stays private.`);
  }

  return {
    completedOnboarding,
    account,
    authReady,
    authError,
    profile,
    memory,
    groceryList,
    spendingInsight,
    useSoon,
    behavior,
    toast,
    showToast,
    createAccountWithApple,
    createAccountWithGmail,
    createAccountWithEmail,
    signOutAccount,
    savedMealIds,
    cookedMealIds,
    recommendedItems,
    completeOnboarding,
    setProfile,
    markEntryAlreadyHave,
    markEntryBought,
    removeEntry,
    addManualItem,
    addUsualsToList,
    addMealMissingItems,
    addPlanMeals,
    addMealUnlockItems,
    rebuildList,
    confirmReceipt,
    updateListFromFridge,
    addImportedItems,
    saveMeal,
    markMealCooked,
    recommendItem,
    keepPrivate,
  };
}

function mergeReceiptIntoMemory(current: GroceryMemoryItem[], extraction: ReceiptExtraction): GroceryMemoryItem[] {
  const byName = new Map(current.map((item) => [item.name.toLowerCase(), item]));
  const next = [...current];

  extraction.items
    .filter((item) => item.isGrocery)
    .forEach((receiptItem) => {
      const name = receiptItem.normalizedName;
      const existing = byName.get(name.toLowerCase());
      if (existing) {
        const updated = updateBoughtMemoryItem(existing, receiptItem.price, extraction.store);
        const index = next.findIndex((item) => item.id === existing.id);
        next[index] = updated;
      } else {
        next.push(createMemoryItemFromName(name, receiptItem.price, extraction.store));
      }
    });

  return next;
}

function updateBoughtMemoryItem(item: GroceryMemoryItem, price = item.currentPrice, store = item.store): GroceryMemoryItem {
  return {
    ...item,
    store,
    lastBoughtDate: new Date().toISOString().slice(0, 10),
    purchaseCount: item.purchaseCount + 1,
    averagePrice: Number(((item.averagePrice + price) / 2).toFixed(2)),
    currentPrice: price,
    likelyStillHave: true,
    confidence: 'high',
    suggestionPriority: Math.min(100, item.suggestionPriority + 4),
  };
}

function createMemoryItemFromName(name: string, price = 3.99, store: GroceryMemoryItem['store'] = "Trader Joe's"): GroceryMemoryItem {
  const category = categorizeGroceryItem(name);
  return {
    id: `memory-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    name,
    category,
    section: sectionForCategory(category),
    store,
    lastBoughtDate: new Date().toISOString().slice(0, 10),
    purchaseCount: 1,
    averageDaysBetweenPurchases: category === 'Household' ? 30 : category === 'Pantry' ? 24 : 8,
    averagePrice: price,
    currentPrice: price,
    preferredStore: store,
    isUsual: false,
    userOftenDeletes: 0,
    userOftenAddsManually: 1,
    likelyStillHave: true,
    confidence: 'medium',
    perishable: ['Produce', 'Protein', 'Dairy'].includes(category),
    estimatedShelfLifeDays: category === 'Produce' ? 6 : category === 'Protein' ? 4 : category === 'Dairy' ? 12 : 90,
    suggestionPriority: 70,
  };
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function personalizedStorageKey(accountId: string): string {
  return `wtf.personalized.${accountId}.v1`;
}

function defaultPersonalizedState(): PersonalizedState {
  return {
    completedOnboarding: false,
    profile: defaultProfile,
    memory: [],
    behavior: emptyBehavior,
    savedMealIds: [],
    cookedMealIds: [],
    recommendedItems: [],
  };
}

function readStorage<T>(key: string): T | null {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can fail in private browsing. The prototype still works in memory.
  }
}
