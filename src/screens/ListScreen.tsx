import { FormEvent, useState } from 'react';
import { RefreshCcw, ShoppingBasket, Sparkles } from 'lucide-react';
import { GroceryList, GroceryListEntry } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ListItemRow } from '../components/ListItemRow';
import { Pill } from '../components/Pill';
import { SectionHeader } from '../components/SectionHeader';
import { groupListItemsByStoreSection } from '../utils/groceryLogic';

export function ListScreen({
  list,
  onBought,
  onAlreadyHave,
  onRemove,
  onAddManual,
  onAddUsuals,
  onAddMealUnlocks,
  onRebuild,
}: {
  list: GroceryList;
  onBought: (entry: GroceryListEntry) => void;
  onAlreadyHave: (entry: GroceryListEntry) => void;
  onRemove: (entry: GroceryListEntry) => void;
  onAddManual: (name: string) => void;
  onAddUsuals: () => void;
  onAddMealUnlocks: (entries: GroceryListEntry[]) => void;
  onRebuild: () => void;
}) {
  const [manualItem, setManualItem] = useState('');
  const [building, setBuilding] = useState(false);
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  function togglePicked(entry: GroceryListEntry) {
    setPickedIds((current) => {
      const next = new Set(current);
      if (next.has(entry.id)) {
        next.delete(entry.id);
      } else {
        next.add(entry.id);
      }
      return next;
    });
  }

  const pickedCount = pickedIds.size;

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onAddManual(manualItem);
    setManualItem('');
  }

  function rebuild() {
    setBuilding(true);
    window.setTimeout(() => {
      onRebuild();
      setBuilding(false);
    }, 650);
  }

  return (
    <main className="screen-enter space-y-5">
      <section>
        <p className="text-[12px] font-black uppercase text-herb">Smart list</p>
        <h1 className="mt-1 text-[32px] font-black leading-tight text-ink">Your list is ready.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">
          Built from usuals, receipts, fridge checks, and the stuff you keep deleting.
        </p>
        <p className="mt-3 text-[13px] font-bold leading-relaxed text-steel">
          Shopping now? Tap the circle next to each item as you drop it in the cart.
          {pickedCount > 0 ? ` ${pickedCount} in the cart.` : ''}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={manualItem}
          onChange={(event) => setManualItem(event.target.value)}
          placeholder="Add milk, limes, panic snacks"
          className="min-h-12 flex-1 rounded-2xl border border-ink/10 bg-white/86 px-4 text-sm font-semibold outline-none focus:border-herb"
        />
        <Button type="submit" className="px-4" disabled={!manualItem.trim()}>
          Add
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} onClick={onAddUsuals}>
          Add usuals
        </Button>
        <Button variant="secondary" icon={<RefreshCcw className={`h-4 w-4 ${building ? 'animate-spin' : ''}`} />} onClick={rebuild}>
          Rebuild list
        </Button>
      </div>

      <ListSection
        title="Buy now"
        eyebrow={`${list.buyNow.length} things`}
        entries={list.buyNow}
        empty="Scan a receipt or import an old list. We will build the first draft."
        pickedIds={pickedIds}
        onTogglePicked={togglePicked}
        onBought={onBought}
        onAlreadyHave={onAlreadyHave}
        onRemove={onRemove}
      />

      <ListSection
        title="Maybe buy"
        eyebrow="Check first"
        entries={list.maybeBuy}
        empty="No maybes today. Rare, suspicious, but nice."
        pickedIds={pickedIds}
        onTogglePicked={togglePicked}
        onBought={onBought}
        onAlreadyHave={onAlreadyHave}
        onRemove={onRemove}
      />

      {list.buyNow.length + list.maybeBuy.length + list.probablyAlreadyHave.length > 0 && (
      <Card className="bg-herb text-white">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/18">
            <ShoppingBasket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black">{list.mealUnlocks.title}</h2>
            <p className="mt-2 text-sm font-semibold text-white/78">Tiny additions. Big dinner swing.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {list.mealUnlocks.items.map((item) => (
            <span key={item.id} className="rounded-full bg-white/18 px-3 py-1.5 text-xs font-black text-white">
              {item.name}
            </span>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-white/14 p-3">
          <p className="mb-2 text-[11px] font-black uppercase text-white/72">Unlocks</p>
          <div className="space-y-1">
            {list.mealUnlocks.meals.map((meal) => (
              <p key={meal} className="text-sm font-bold text-white">
                {meal}
              </p>
            ))}
          </div>
        </div>
        <Button className="mt-4 bg-white text-ink" full onClick={() => onAddMealUnlocks(list.mealUnlocks.items)}>
          Add missing meal items
        </Button>
      </Card>
      )}

      <ListSection
        title="Probably already have"
        eyebrow="Don't-buy list"
        entries={list.probablyAlreadyHave}
        empty="Nothing on the don't-buy list yet. Scan the fridge and let it judge."
        pickedIds={pickedIds}
        onTogglePicked={togglePicked}
        onBought={onBought}
        onAlreadyHave={onAlreadyHave}
        onRemove={onRemove}
      />

      {list.overbuyAlerts.length > 0 && (
        <Card>
          <p className="text-[12px] font-black uppercase text-tomato">Overbuy warnings</p>
          <div className="mt-3 space-y-2">
            {list.overbuyAlerts.map((alert) => (
              <div key={alert} className="rounded-2xl bg-tomato/10 p-3 text-sm font-black leading-relaxed text-tomato">
                {alert}
              </div>
            ))}
          </div>
        </Card>
      )}
    </main>
  );
}

function ListSection({
  title,
  eyebrow,
  entries,
  empty,
  pickedIds,
  onTogglePicked,
  onBought,
  onAlreadyHave,
  onRemove,
}: {
  title: string;
  eyebrow: string;
  entries: GroceryListEntry[];
  empty: string;
  pickedIds: Set<string>;
  onTogglePicked: (entry: GroceryListEntry) => void;
  onBought: (entry: GroceryListEntry) => void;
  onAlreadyHave: (entry: GroceryListEntry) => void;
  onRemove: (entry: GroceryListEntry) => void;
}) {
  const grouped = groupListItemsByStoreSection(entries);
  const sections = Object.entries(grouped).filter(([, sectionEntries]) => sectionEntries.length > 0);

  return (
    <section>
      <SectionHeader eyebrow={eyebrow} title={title} />
      {sections.length === 0 ? (
        <Card>
          <p className="text-sm font-bold leading-relaxed text-steel">{empty}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {sections.map(([section, sectionEntries]) => (
            <div key={section}>
              <div className="mb-2 flex items-center justify-between">
                <Pill tone="blue">{section}</Pill>
                <span className="text-[11px] font-black text-steel">{sectionEntries.length}</span>
              </div>
              <div className="space-y-2">
                {sectionEntries.map((entry) => (
                  <ListItemRow
                    key={entry.id}
                    entry={entry}
                    picked={pickedIds.has(entry.id)}
                    onTogglePicked={onTogglePicked}
                    onBought={onBought}
                    onAlreadyHave={onAlreadyHave}
                    onRemove={onRemove}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
