import { useEffect, useMemo, useState } from 'react';
import { Camera, RefreshCw, Refrigerator } from 'lucide-react';
import { ChefMode, MealSuggestion, VisionItem } from '../types';
import { chefModes } from '../data/mockData';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { MealCard } from '../components/MealCard';
import { getMealsForMode } from '../services/mealGenerationService';

export function MealsScreen({
  fridgeItems,
  onOpenMeal,
  onAddMissing,
  onCheckFridge,
}: {
  fridgeItems: VisionItem[];
  onOpenMeal: (meal: MealSuggestion) => void;
  onAddMissing: (meal: MealSuggestion) => void;
  onCheckFridge: () => void;
}) {
  const [mode, setMode] = useState<ChefMode>('Lazy but good');
  const [generating, setGenerating] = useState(false);
  const meals = useMemo(() => getMealsForMode(mode), [mode]);

  const hasFridgeData = fridgeItems.length > 0;
  const clearlySeen = fridgeItems.filter((item) => item.confidence === 'clearlySeen').map((item) => item.name);

  useEffect(() => {
    setGenerating(true);
    const timer = window.setTimeout(() => setGenerating(false), 420);
    return () => window.clearTimeout(timer);
  }, [mode]);

  return (
    <main className="screen-enter space-y-5">
      <section>
        <p className="text-[12px] font-black uppercase text-herb">Meals</p>
        <h1 className="mt-1 text-[32px] font-black leading-tight text-ink">WTF should I make?</h1>
        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">Dinner ideas from what you already bought.</p>
      </section>

      {hasFridgeData ? (
        <Card className="bg-herb/10">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-herb/20 text-herb">
              <Refrigerator className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-[15px] font-black text-ink">Make something from leftovers</h2>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-steel">
                {clearlySeen.length > 0
                  ? `We spotted: ${clearlySeen.slice(0, 4).join(', ')}${clearlySeen.length > 4 ? '…' : ''}. Pick "Use leftovers" or "Clean out the fridge" below.`
                  : 'Pick "Use leftovers" or "Clean out the fridge" to get meal ideas from your last fridge check.'}
              </p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-sm font-black transition ${
                mode === 'Use leftovers' ? 'border-herb bg-herb text-white' : 'border-ink/10 bg-white text-ink active:bg-linen'
              }`}
              onClick={() => setMode('Use leftovers')}
            >
              Use leftovers
            </button>
            <button
              className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-sm font-black transition ${
                mode === 'Clean out the fridge' ? 'border-herb bg-herb text-white' : 'border-ink/10 bg-white text-ink active:bg-linen'
              }`}
              onClick={() => setMode('Clean out the fridge')}
            >
              Clean out the fridge
            </button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-herb/12 text-herb">
              <Camera className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-[15px] font-black text-ink">Cook from what you have?</p>
              <p className="mt-0.5 text-xs font-semibold text-steel">Snap your fridge or pantry and WTF finds meals from your leftovers.</p>
            </div>
          </div>
          <Button className="mt-3" variant="secondary" full icon={<Refrigerator className="h-4 w-4" />} onClick={onCheckFridge}>
            Check fridge for leftovers
          </Button>
        </Card>
      )}

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[12px] font-black uppercase text-steel">Chef mode</p>
          {generating && (
            <span className="inline-flex items-center gap-1 text-[11px] font-black text-herb">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Finding dinner
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {chefModes.map((chefMode) => (
            <button
              key={chefMode}
              className={`min-h-10 shrink-0 rounded-full border px-3 py-2 text-sm font-black transition ${
                mode === chefMode ? 'border-ink bg-ink text-cream' : 'border-ink/10 bg-white text-ink active:bg-linen'
              }`}
              onClick={() => setMode(chefMode)}
            >
              {chefMode}
            </button>
          ))}
        </div>
      </Card>

      {generating ? (
        <Card>
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 rounded-2xl bg-linen soft-pulse" />
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onOpen={onOpenMeal} onAddMissing={onAddMissing} />
          ))}
        </div>
      )}

      <Card>
        <h2 className="text-xl font-black text-ink">Chef rules WTF follows</h2>
        <div className="mt-3 grid gap-2">
          {[
            'Use what expires first.',
            'Add acid or freshness when dinner gets heavy.',
            'Avoid random ingredient soup.',
            'Texture matters. Crunch earns its spot.',
          ].map((rule) => (
            <div key={rule} className="rounded-2xl bg-linen/72 px-3 py-2 text-sm font-bold text-steel">
              {rule}
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
