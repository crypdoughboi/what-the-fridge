import { Check, Minus, ShieldCheck } from 'lucide-react';
import { GroceryListEntry } from '../types';
import { Button } from './Button';

export function ListItemRow({
  entry,
  picked,
  onTogglePicked,
  onBought,
  onAlreadyHave,
  onRemove,
}: {
  entry: GroceryListEntry;
  picked: boolean;
  onTogglePicked: (entry: GroceryListEntry) => void;
  onBought: (entry: GroceryListEntry) => void;
  onAlreadyHave: (entry: GroceryListEntry) => void;
  onRemove: (entry: GroceryListEntry) => void;
}) {
  return (
    <div className={`rounded-2xl border border-ink/8 bg-white/72 p-3 transition-opacity ${picked ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onTogglePicked(entry)}
          aria-pressed={picked}
          aria-label={picked ? `Mark ${entry.name} as not picked up` : `Mark ${entry.name} as picked up`}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors active:scale-95 ${
            picked ? 'border-herb bg-herb text-white' : 'border-ink/25 bg-white text-transparent'
          }`}
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-[15px] font-black text-ink ${picked ? 'line-through decoration-2' : ''}`}>{entry.name}</p>
            <span className="rounded-full bg-linen px-2.5 py-1 text-[10px] font-black text-steel">{entry.section}</span>
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-steel">{entry.reason}</p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Button variant="secondary" className="min-h-10 px-2 text-xs" icon={<Check className="h-3.5 w-3.5" />} onClick={() => onBought(entry)}>
          Bought
        </Button>
        <Button
          variant="secondary"
          className="min-h-10 px-2 text-xs"
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          onClick={() => onAlreadyHave(entry)}
        >
          Have
        </Button>
        <Button variant="ghost" className="min-h-10 px-2 text-xs" icon={<Minus className="h-3.5 w-3.5" />} onClick={() => onRemove(entry)}>
          Remove
        </Button>
      </div>
    </div>
  );
}
