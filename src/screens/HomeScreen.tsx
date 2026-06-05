import { Camera, ChefHat, ListPlus, Settings, Sparkles } from 'lucide-react';
import { GroceryMemoryItem, MealSuggestion, SpendingInsight } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/BrandMark';
import { MealCard } from '../components/MealCard';
import { Pill } from '../components/Pill';
import { ProgressBar } from '../components/ProgressBar';
import { SectionHeader } from '../components/SectionHeader';
import { getDaysSince } from '../utils/date';

export function HomeScreen({
  meals,
  hasData,
  useSoon,
  dueSoon,
  alreadyHave,
  spending,
  onOpenMeal,
  onAddMissing,
  onGoList,
  onGoMeals,
  onScanReceipt,
  onCheckFridge,
  onSettings,
}: {
  meals: MealSuggestion[];
  hasData: boolean;
  useSoon: GroceryMemoryItem[];
  dueSoon: string[];
  alreadyHave: string[];
  spending: SpendingInsight;
  onOpenMeal: (meal: MealSuggestion) => void;
  onAddMissing: (meal: MealSuggestion) => void;
  onGoList: () => void;
  onGoMeals: () => void;
  onScanReceipt: () => void;
  onCheckFridge: () => void;
  onSettings: () => void;
}) {
  return (
    <main className="screen-enter space-y-5">
      <div className="flex items-start justify-between gap-3">
        <Logo />
        <button
          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 text-ink shadow-card active:scale-[0.98]"
          onClick={onSettings}
          aria-label="Settings"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <section>
        <p className="text-[12px] font-black uppercase text-herb">Dinner brain online</p>
        {hasData ? (
          <>
            <h1 className="mt-1 text-[32px] font-black leading-[1.04] text-ink">You probably already have dinner.</h1>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">
              Based on your receipts, usuals, and what is likely still around.
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-1 text-[32px] font-black leading-[1.04] text-ink">Let's wake up your grocery brain.</h1>
            <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">
              Scan a receipt or import an old list. WTF learns your usuals, what you overbuy, and what's probably still in the fridge.
            </p>
          </>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2">
        <Button icon={<ChefHat className="h-4 w-4" />} onClick={onGoMeals}>
          WTF should I make?
        </Button>
        <Button variant="secondary" icon={<ListPlus className="h-4 w-4" />} onClick={onGoList}>
          Build my list
        </Button>
        <Button variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={onScanReceipt}>
          Scan receipt
        </Button>
        <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={onCheckFridge}>
          Check fridge
        </Button>
      </div>

      {!hasData && (
        <Card className="bg-herb text-white">
          <p className="text-[12px] font-black uppercase text-white/72">First step</p>
          <h2 className="mt-1 text-xl font-black">Scan your first receipt.</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-white/80">
            As soon as you add a receipt or import a list, your usuals, spend, and "use soon" picks fill in here automatically.
          </p>
          <Button className="mt-4 bg-white text-ink" full icon={<Camera className="h-4 w-4" />} onClick={onScanReceipt}>
            Scan a receipt
          </Button>
        </Card>
      )}

      <section>
        <SectionHeader eyebrow="Tonight" title="WTF should I make?" />
        <div className="space-y-3">
          {meals.slice(0, 3).map((meal) => (
            <MealCard key={meal.id} meal={meal} onOpen={onOpenMeal} onAddMissing={onAddMissing} compact={meal.id !== meals[0].id} />
          ))}
        </div>
      </section>

      {useSoon.length > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-black uppercase text-tomato">Use soon</p>
              <h2 className="mt-1 text-xl font-black text-ink">Use {useSoon[0].name} first.</h2>
            </div>
            <span className="rounded-full bg-tomato/12 px-3 py-1 text-[11px] font-black text-tomato">Fridge clock</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-steel">
            These showed up in recent receipts and are probably still around.
          </p>
          <div className="mt-4 grid gap-2">
            {useSoon.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-2xl bg-linen/72 px-3 py-2.5">
                <div>
                  <p className="text-sm font-black text-ink">{item.name}</p>
                  <p className="text-[11px] font-bold text-steel">Bought {getDaysSince(item.lastBoughtDate)} days ago</p>
                </div>
                <Pill tone={getDaysSince(item.lastBoughtDate) >= item.estimatedShelfLifeDays - 1 ? 'red' : 'gold'}>
                  {item.estimatedShelfLifeDays} day shelf life
                </Pill>
              </div>
            ))}
          </div>
        </Card>
      )}

      {(dueSoon.length > 0 || alreadyHave.length > 0) && (
        <Card>
          <p className="text-[12px] font-black uppercase text-herb">Next shop</p>
          <div className="mt-3 space-y-4">
            {dueSoon.length > 0 && <MiniList title="Probably due soon" items={dueSoon} />}
            {alreadyHave.length > 0 && <MiniList title="Probably already have" items={alreadyHave} />}
            {spending.overbuyAlerts.length > 0 && (
              <div className="rounded-2xl bg-tomato/10 p-3">
                <p className="text-sm font-black text-tomato">{spending.overbuyAlerts[0]}</p>
              </div>
            )}
          </div>
        </Card>
      )}

      {spending.monthlySpend > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[12px] font-black uppercase text-steel">Spend</p>
              <h2 className="mt-1 text-xl font-black text-ink">${spending.monthlySpend} tracked so far</h2>
            </div>
            <Pill tone="green">
              {spending.topStoreShare}% {spending.topStore}
            </Pill>
          </div>
          <p className="mt-3 text-sm font-semibold leading-relaxed text-steel">{spending.plainEnglishInsight}</p>
          <div className="mt-4">
            <ProgressBar value={spending.topStoreShare} max={100} tone="herb" />
          </div>
        </Card>
      )}
    </main>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-black uppercase text-steel">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Pill key={item} tone={title.includes('already') ? 'blue' : 'green'}>
            {item}
          </Pill>
        ))}
      </div>
    </div>
  );
}
