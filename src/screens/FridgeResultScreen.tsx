import { useState } from 'react';
import { ArrowLeft, Camera, NotebookPen, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { ScanConfidence, VisionItem } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { scanConfidenceLabel } from '../utils/groceryLogic';

export function FridgeResultScreen({
  items,
  onUpdateList,
  onScanPantry,
  onBack,
}: {
  items: VisionItem[];
  onUpdateList: (items: VisionItem[]) => void;
  onScanPantry: () => void;
  onBack?: () => void;
}) {
  const [localItems, setLocalItems] = useState(items);
  const [note, setNote] = useState('');
  const [addedToList, setAddedToList] = useState<Set<string>>(new Set());

  function setConfidence(id: string, confidence: ScanConfidence) {
    setLocalItems((current) => current.map((item) => (item.id === id ? { ...item, confidence } : item)));
  }

  function markAddToList(id: string) {
    setAddedToList((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    // Mark the item as "buy" by bumping it out of couldNotTell
    setLocalItems((current) =>
      current.map((item) => (item.id === id && item.confidence === 'couldNotTell' ? { ...item, confidence: 'maybeLow' } : item)),
    );
  }

  const groups: Array<{ label: string; sublabel: string; confidence: ScanConfidence; tone: 'green' | 'gold' | 'red' }> = [
    { label: 'Got it', sublabel: 'Clearly identified — already crossed off your list.', confidence: 'clearlySeen', tone: 'green' },
    { label: 'Running low', sublabel: 'Probably still have some — check before buying.', confidence: 'maybeLow', tone: 'gold' },
    { label: "Couldn't tell", sublabel: 'Containers, takeout boxes, or hard-to-read labels. Tap "Add to list" if you need it.', confidence: 'couldNotTell', tone: 'red' },
  ];

  return (
    <main className="screen-enter space-y-5">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-steel active:opacity-70"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      )}

      <section>
        <p className="text-[12px] font-black uppercase text-herb">Fridge check</p>
        <h1 className="mt-1 text-[32px] font-black leading-tight text-ink">Here's what we found.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">
          We flagged items we're not sure about — leftovers, takeout containers, and mystery bags included.
        </p>
      </section>

      {groups.map((group) => {
        const groupItems = localItems.filter((item) => item.confidence === group.confidence);
        if (!groupItems.length) return null;
        return (
          <Card key={group.confidence}>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-xl font-black text-ink">{group.label}</h2>
              <Pill tone={group.tone}>{groupItems.length}</Pill>
            </div>
            <p className="mb-3 text-xs font-semibold text-steel">{group.sublabel}</p>
            <div className="space-y-2">
              {groupItems.map((item) => (
                <div key={item.id} className="rounded-2xl bg-linen/72 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-black text-ink">{item.name}</p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-steel">{item.note}</p>
                    </div>
                    <Pill tone="blue">{item.category}</Pill>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Button
                      variant={item.confidence === 'clearlySeen' ? 'secondary' : 'secondary'}
                      className={`min-h-10 text-xs ${item.confidence === 'clearlySeen' ? 'border-herb/40 bg-herb/10 text-herb' : ''}`}
                      onClick={() => setConfidence(item.id, 'clearlySeen')}
                    >
                      ✓ Have it
                    </Button>
                    <Button
                      variant="secondary"
                      className={`min-h-10 text-xs ${item.confidence === 'maybeLow' ? 'border-saffron/40 bg-saffron/10' : ''}`}
                      onClick={() => setConfidence(item.id, 'maybeLow')}
                    >
                      Low
                    </Button>
                    <Button
                      variant={addedToList.has(item.id) ? 'secondary' : 'ghost'}
                      className={`min-h-10 text-xs ${addedToList.has(item.id) ? 'border-herb/40 bg-herb/10 text-herb' : ''}`}
                      icon={<Plus className="h-3 w-3" />}
                      onClick={() => markAddToList(item.id)}
                    >
                      {addedToList.has(item.id) ? 'Listed' : 'Add'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}

      <Card>
        <p className="text-[12px] font-black uppercase text-steel">Mystery items?</p>
        <p className="mt-2 text-sm font-semibold leading-relaxed text-steel">
          Takeout containers, plastic bags, and unlabeled leftovers show up as "couldn't tell." Tap <strong>Add</strong> to manually put them on your list, or tap <strong>Have it</strong> to cross them off.
        </p>
        <div className="mt-3 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-tile text-steel">
            <NotebookPen className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-black text-ink">Add a note</p>
            <p className="mt-0.5 text-xs font-semibold text-steel">Describe what's unclear and we'll factor it in.</p>
          </div>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Top shelf is mostly leftovers. Oat milk looked low. That Tupperware is leftover pasta."
          className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-ink/10 bg-white/86 px-4 py-3 text-sm font-semibold outline-none focus:border-herb"
        />
      </Card>

      <div className="grid gap-2">
        <Button icon={<ShieldCheck className="h-4 w-4" />} onClick={() => onUpdateList(localItems)}>
          Update my list
        </Button>
        <Button variant="secondary" icon={<Camera className="h-4 w-4" />} onClick={onScanPantry}>
          Scan pantry too
        </Button>
        <Button variant="ghost" icon={<RefreshCw className="h-4 w-4" />} onClick={() => setLocalItems(items)}>
          Reset result
        </Button>
      </div>
    </main>
  );
}
