import { FormEvent, useState } from 'react';
import { Apple, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Logo } from '../components/BrandMark';

export function AuthScreen({
  onApple,
  onGmail,
  onEmail,
  errorMessage,
}: {
  onApple: () => Promise<void>;
  onGmail: () => Promise<void>;
  onEmail: (email: string) => Promise<void>;
  errorMessage?: string | null;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'apple' | 'gmail' | 'email' | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function run(provider: 'apple' | 'gmail' | 'email') {
    try {
      setLocalError(null);
      setBusy(provider);
      if (provider === 'apple') await onApple();
      if (provider === 'gmail') await onGmail();
      if (provider === 'email') await onEmail(email);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Sign-in failed. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    await run('email');
  }

  return (
    <main className="screen-enter app-scroll pb-8">
      <section className="pt-2">
        <Logo hero />
        <div className="mt-8">
          <p className="text-[12px] font-black uppercase text-herb">Personal grocery brain</p>
          <h1 className="mt-2 text-[36px] font-black leading-[1.02] text-ink">A grocery list that knows what's in your fridge. A dinner plan that knows how you cook.</h1>
          <p className="mt-4 text-[16px] font-semibold leading-relaxed text-steel">
            Take a picture of your fridge or a receipt. WTF builds your list, keeps track of what you have, and helps turn it into dinner.
          </p>
        </div>
      </section>

      <Card className="mt-7 space-y-3">
        <Button
          full
          className="bg-black text-white"
          icon={<Apple className="h-5 w-5" />}
          disabled={busy !== null}
          onClick={() => run('apple')}
        >
          {busy === 'apple' ? 'Connecting Apple ID' : 'Continue with Apple ID'}
        </Button>
        <Button
          full
          variant="secondary"
          className="bg-white"
          icon={<span className="grid h-5 w-5 place-items-center rounded-full bg-[#0d86df] text-xs font-black text-white">G</span>}
          disabled={busy !== null}
          onClick={() => run('gmail')}
        >
          {busy === 'gmail' ? 'Connecting Gmail' : 'Continue with Gmail'}
        </Button>

        <div className="flex items-center gap-3 py-1">
          <div className="h-px flex-1 bg-ink/10" />
          <span className="text-[11px] font-black uppercase text-steel">or</span>
          <div className="h-px flex-1 bg-ink/10" />
        </div>

        <form className="flex gap-2" onSubmit={submitEmail}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="min-h-12 flex-1 rounded-2xl border border-ink/10 bg-white/86 px-4 text-sm font-semibold outline-none focus:border-herb"
          />
          <Button type="submit" className="px-4" icon={<Mail className="h-4 w-4" />} disabled={!email.trim() || busy !== null}>
            {busy === 'email' ? 'Saving' : 'Email'}
          </Button>
        </form>
        {(localError || errorMessage) && (
          <div className="rounded-2xl bg-tomato/10 px-4 py-3 text-sm font-bold leading-relaxed text-tomato">
            {localError || errorMessage}
          </div>
        )}
      </Card>

      <Card className="mt-5">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-herb/12 text-herb">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-ink">Private by default.</h2>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-steel">
              Receipts, spending, and exact purchase history stay private. Friend Rebuys only shares what you choose.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-2 gap-2">
        {['Scan receipts', 'Fridge photos', 'Smart insights', 'Better dinners'].map((item) => (
          <div key={item} className="rounded-2xl bg-white/72 px-3 py-3 text-center text-xs font-black text-steel shadow-card">
            {item}
          </div>
        ))}
      </div>

      <p className="mt-5 text-sm font-bold leading-relaxed text-steel">
        Start with email if Google or Apple setup is still pending.
      </p>
    </main>
  );
}
