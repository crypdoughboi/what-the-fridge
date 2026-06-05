import { Download, ListChecks } from 'lucide-react';
import { SpendingInsight } from '../types';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { ProgressBar } from '../components/ProgressBar';

export function SpendScreen({
  spending,
  onGoList,
  onExport,
}: {
  spending: SpendingInsight;
  onGoList: () => void;
  onExport: () => void;
}) {
  const maxStore = Math.max(1, ...spending.storeSpend.map((store) => store.amount));
  const maxCategory = Math.max(1, ...spending.categorySpend.map((category) => category.amount));

  if (spending.monthlySpend === 0) {
    return (
      <main className="screen-enter space-y-5">
        <section>
          <p className="text-[12px] font-black uppercase text-herb">Spend</p>
          <h1 className="mt-1 text-[32px] font-black leading-tight text-ink">No spend tracked yet.</h1>
          <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">
            Scan a receipt and WTF starts breaking down your grocery spend by store, category, and repeat buys.
          </p>
        </section>
        <Card>
          <p className="text-sm font-bold leading-relaxed text-steel">
            Your spend by store, category trends, repeat staples, and overbuy alerts all show up here once you've logged a receipt.
          </p>
          <Button className="mt-4" full icon={<ListChecks className="h-4 w-4" />} onClick={onGoList}>
            Go to my list
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="screen-enter space-y-5">
      <section>
        <p className="text-[12px] font-black uppercase text-herb">Spend</p>
        <h1 className="mt-1 text-[32px] font-black leading-tight text-ink">${spending.monthlySpend} on groceries this month.</h1>
        <p className="mt-3 text-[15px] font-semibold leading-relaxed text-steel">{spending.categoryInsight}</p>
      </section>

      <Card className="bg-ink text-cream">
        <p className="text-[12px] font-black uppercase text-butter">Plain English</p>
        <h2 className="mt-2 text-2xl font-black leading-tight">{spending.plainEnglishInsight}</h2>
        <p className="mt-3 text-sm font-semibold text-cream/72">Your repeat staples cost about ${spending.staplesWeeklyCost} per week.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-ink">Spend by store</h2>
          <Pill tone="green">{spending.topStore} leads</Pill>
        </div>
        <div className="mt-4 space-y-4">
          {spending.storeSpend.map((store, index) => (
            <div key={store.store}>
              <div className="mb-2 flex items-center justify-between text-sm font-black">
                <span>{store.store}</span>
                <span>${store.amount}</span>
              </div>
              <ProgressBar value={store.amount} max={maxStore} tone={index === 0 ? 'herb' : 'steel'} />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Spend by category</h2>
        <div className="mt-4 space-y-4">
          {spending.categorySpend.map((category) => {
            const delta = Math.round(category.amount - category.previousAmount);
            return (
              <div key={category.name}>
                <div className="mb-2 flex items-center justify-between text-sm font-black">
                  <span>{category.name}</span>
                  <span>
                    ${category.amount} {delta > 0 ? `+${delta}` : delta}
                  </span>
                </div>
                <ProgressBar value={category.amount} max={maxCategory} tone={category.name === 'Snacks' ? 'tomato' : 'saffron'} />
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Top repeat items</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {spending.repeatItems.map((item) => (
            <Pill key={item} tone="blue">
              {item}
            </Pill>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Getting more expensive</h2>
        <div className="mt-3 grid gap-2">
          {spending.expensiveItems.map((item) => (
            <div key={item} className="rounded-2xl bg-linen/72 p-3 text-sm font-black text-ink">
              {item}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-ink">Overbuy alerts</h2>
        <div className="mt-3 space-y-2">
          {spending.overbuyAlerts.map((alert) => (
            <div key={alert} className="rounded-2xl bg-tomato/10 p-3 text-sm font-black leading-relaxed text-tomato">
              {alert}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" icon={<ListChecks className="h-4 w-4" />} onClick={onGoList}>
          Check list
        </Button>
        <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={onExport}>
          Export snapshot
        </Button>
      </div>
    </main>
  );
}
