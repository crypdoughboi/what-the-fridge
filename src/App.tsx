import { useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { LoadingState } from './components/LoadingState';
import { Toast } from './components/Toast';
import { useGroceryAppState } from './hooks/useGroceryAppState';
import { getMealsForMode } from './services/mealGenerationService';
import { scanFridgeOrPantryImage } from './services/fridgeVisionService';
import { normalizeReceiptItems, scanReceiptImage } from './services/receiptOcrService';
import { FridgeResultScreen } from './screens/FridgeResultScreen';
import { FridgeScanScreen } from './screens/FridgeScanScreen';
import { AuthScreen } from './screens/AuthScreen';
import { HomeScreen } from './screens/HomeScreen';
import { ListScreen } from './screens/ListScreen';
import { MealDetailScreen } from './screens/MealDetailScreen';
import { MealsScreen } from './screens/MealsScreen';
import { OnboardingScreen, OnboardingSuccessScreen } from './screens/OnboardingScreen';
import { ReceiptReviewScreen } from './screens/ReceiptReviewScreen';
import { ReceiptScanScreen } from './screens/ReceiptScanScreen';
import { ReceiptSuccessScreen } from './screens/ReceiptSuccessScreen';
import { ScanScreen } from './screens/ScanScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SpendScreen } from './screens/SpendScreen';
import { ChefMode, MealSuggestion, ReceiptExtraction, Screen, Tab, VisionItem } from './types';

const receiptLoadingSteps = [
  'Reading the receipt...',
  'Translating grocery hieroglyphics...',
  'Cleaning up weird item names...',
  'Updating your usuals...',
];

const fridgeLoadingSteps = [
  'Checking the fridge...',
  'Looking for things you already have...',
  "Building your don't-buy list...",
  'Finding dinner in the chaos...',
];

const authLoadingSteps = ['Checking your account...', 'Finding your grocery brain...', 'Keeping receipts private...'];

export default function App() {
  const app = useGroceryAppState();
  const [screen, setScreen] = useState<Screen>('auth');
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [selectedMeal, setSelectedMeal] = useState<MealSuggestion | null>(null);
  const [receiptExtraction, setReceiptExtraction] = useState<ReceiptExtraction | null>(null);
  const [fridgeItems, setFridgeItems] = useState<VisionItem[]>([]);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [fridgePreviewUrl, setFridgePreviewUrl] = useState<string | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [fridgeLoading, setFridgeLoading] = useState(false);

  const homeMeals = useMemo(() => getMealsForMode(app.profile.cookingStyle as ChefMode), [app.profile.cookingStyle]);

  function navigateTab(tab: Tab) {
    setActiveTab(tab);
    setScreen(tab);
  }

  function openMeal(meal: MealSuggestion) {
    setSelectedMeal(meal);
    setScreen('mealDetail');
  }

  function openReceiptScan() {
    setActiveTab('scan');
    setReceiptPreviewUrl(null);
    setScreen('receiptScan');
  }

  function openFridgeScan() {
    setActiveTab('scan');
    setFridgePreviewUrl(null);
    setScreen('fridgeScan');
  }

  async function startReceiptScan(file?: File | null) {
    if (file) setReceiptPreviewUrl(URL.createObjectURL(file));
    setActiveTab('scan');
    setScreen('receiptScan');
    setReceiptLoading(true);
    const extraction = await normalizeReceiptItems(await scanReceiptImage(file));
    setReceiptExtraction(extraction);
    setReceiptLoading(false);
    setScreen('receiptReview');
  }

  async function startFridgeScan(file?: File | null) {
    if (file) setFridgePreviewUrl(URL.createObjectURL(file));
    setActiveTab('scan');
    setScreen('fridgeScan');
    setFridgeLoading(true);
    const items = await scanFridgeOrPantryImage(file);
    setFridgeItems(items);
    setFridgeLoading(false);
    setScreen('fridgeResult');
  }

  function confirmReceipt(extraction: ReceiptExtraction) {
    app.confirmReceipt(extraction);
    setScreen('receiptSuccess');
  }

  function updateFromFridge(items: VisionItem[]) {
    app.updateListFromFridge(items);
    navigateTab('list');
  }

  function renderScreen() {
    if (!app.authReady) {
      return <LoadingState title="Opening WTF" steps={authLoadingSteps} />;
    }

    if (!app.account) {
      return (
        <AuthScreen
          onApple={async () => {
            await app.createAccountWithApple();
            setScreen('onboarding');
          }}
          onGmail={async () => {
            await app.createAccountWithGmail();
            setScreen('onboarding');
          }}
          onEmail={async (email) => {
            await app.createAccountWithEmail(email);
            setScreen('onboarding');
          }}
          errorMessage={app.authError}
        />
      );
    }

    if (!app.completedOnboarding && screen !== 'onboardingSuccess') {
      return (
        <OnboardingScreen
          onComplete={(profile) => {
            app.completeOnboarding(profile);
            setScreen('onboardingSuccess');
          }}
        />
      );
    }

    if (screen === 'onboardingSuccess') {
      return <OnboardingSuccessScreen onContinue={() => navigateTab('home')} />;
    }

    if (screen === 'auth' || screen === 'home') {
      return (
        <HomeScreen
          meals={homeMeals}
          hasData={app.memory.length > 0}
          useSoon={app.useSoon}
          dueSoon={app.groceryList.buyNow.slice(0, 3).map((entry) => entry.name)}
          alreadyHave={app.groceryList.probablyAlreadyHave.slice(0, 3).map((entry) => entry.name)}
          spending={app.spendingInsight}
          onOpenMeal={openMeal}
          onAddMissing={app.addMealMissingItems}
          onGoList={() => navigateTab('list')}
          onGoMeals={() => navigateTab('meals')}
          onScanReceipt={openReceiptScan}
          onCheckFridge={openFridgeScan}
          onSettings={() => setScreen('settings')}
        />
      );
    }

    if (screen === 'list') {
      return (
        <ListScreen
          list={app.groceryList}
          onBought={app.markEntryBought}
          onAlreadyHave={app.markEntryAlreadyHave}
          onRemove={app.removeEntry}
          onAddManual={app.addManualItem}
          onAddUsuals={app.addUsualsToList}
          onAddMealUnlocks={app.addMealUnlockItems}
          onRebuild={app.rebuildList}
        />
      );
    }

    if (screen === 'scan') {
      return (
        <ScanScreen
          onReceiptFile={startReceiptScan}
          onReceiptSample={() => startReceiptScan(null)}
          onFridgeFile={startFridgeScan}
          onFridgeSample={() => startFridgeScan(null)}
          onOpenReceipt={openReceiptScan}
          onOpenFridge={openFridgeScan}
          onImportItems={app.addImportedItems}
        />
      );
    }

    if (screen === 'receiptScan') {
      return receiptLoading ? (
        <LoadingState title="Scanning receipt" steps={receiptLoadingSteps} />
      ) : (
        <ReceiptScanScreen previewUrl={receiptPreviewUrl} onBack={() => navigateTab('scan')} onFile={startReceiptScan} onSample={() => startReceiptScan(null)} />
      );
    }

    if (screen === 'receiptReview' && receiptExtraction) {
      return <ReceiptReviewScreen extraction={receiptExtraction} onConfirm={confirmReceipt} onBack={openReceiptScan} />;
    }

    if (screen === 'receiptSuccess') {
      return <ReceiptSuccessScreen onList={() => navigateTab('list')} onMeals={() => navigateTab('meals')} onScanAnother={openReceiptScan} />;
    }

    if (screen === 'fridgeScan') {
      return fridgeLoading ? (
        <LoadingState title="Checking fridge" steps={fridgeLoadingSteps} />
      ) : (
        <FridgeScanScreen previewUrl={fridgePreviewUrl} onBack={() => navigateTab('scan')} onFile={startFridgeScan} onSample={() => startFridgeScan(null)} />
      );
    }

    if (screen === 'fridgeResult') {
      return <FridgeResultScreen items={fridgeItems} onUpdateList={updateFromFridge} onScanPantry={openFridgeScan} onBack={() => navigateTab('scan')} />;
    }

    if (screen === 'meals') {
      return (
        <MealsScreen
          fridgeItems={fridgeItems}
          onOpenMeal={openMeal}
          onAddMissing={app.addMealMissingItems}
          onCheckFridge={openFridgeScan}
          onPlanMeals={(meals) => {
            app.addPlanMeals(meals);
            navigateTab('list');
          }}
        />
      );
    }

    if (screen === 'mealDetail' && selectedMeal) {
      return (
        <MealDetailScreen
          meal={selectedMeal}
          saved={app.savedMealIds.includes(selectedMeal.id)}
          cooked={app.cookedMealIds.includes(selectedMeal.id)}
          onBack={() => navigateTab('meals')}
          onAddMissing={app.addMealMissingItems}
          onSave={app.saveMeal}
          onCooked={app.markMealCooked}
        />
      );
    }

    if (screen === 'spend') {
      return (
        <SpendScreen
          spending={app.spendingInsight}
          onGoList={() => navigateTab('list')}
          onExport={() => app.showToast('Spend snapshot exported locally. Real data export is in Settings.')}
        />
      );
    }

    if (screen === 'settings') {
      return (
        <SettingsScreen
          account={app.account}
          profile={app.profile}
          recommendedItems={app.recommendedItems}
          onBack={() => setScreen(activeTab)}
          onRecommend={app.recommendItem}
          onKeepPrivate={app.keepPrivate}
          onAddToList={app.addManualItem}
          onToast={app.showToast}
          onSignOut={async () => {
            await app.signOutAccount();
            setScreen('auth');
            setActiveTab('home');
          }}
        />
      );
    }

    return null;
  }

  const showAppChrome = Boolean(app.account) && app.completedOnboarding && screen !== 'onboardingSuccess';

  return (
    <div className="phone-shell">
      {showAppChrome ? <div className="app-scroll app-scroll-with-nav">{renderScreen()}</div> : renderScreen()}
      {showAppChrome && <BottomNav activeTab={activeTab} onTabChange={navigateTab} />}
      <Toast message={app.toast} />
    </div>
  );
}
