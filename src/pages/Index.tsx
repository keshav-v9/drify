
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        navigate('/dashboard');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          navigate('/dashboard');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[2px] bg-primary" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Drify</span>
          </div>
          <nav className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>Why we built it</Button>
            <Button size="sm" onClick={() => navigate('/sign-in')}>Sign in</Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="grid gap-8 border-b border-border py-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <h1 className="max-w-lg text-[26px] font-semibold leading-[1.2] md:text-[30px]">
              Care costs for one parent, tracked in one place.
            </h1>
            <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
              A monthly budget for medication, home help and transport; an expense log the whole
              family can see; and a projection of what the next months cost.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate('/sign-in')}>Create an account</Button>
              <Button variant="ghost" onClick={() => navigate('/about')}>Why this exists</Button>
            </div>
          </div>
          <div className="self-end md:col-span-5">
            <dl className="divide-y divide-border border-t border-border text-[13px]">
              {[
                ['Budget categories', 'Medication, home help, transport, facility'],
                ['Expense log', 'Amount, date, category, who paid'],
                ['Projection', 'Cost per month over the next 12'],
                ['Family access', 'Invite by email, read or edit'],
              ].map(([term, desc]) => (
                <div key={term} className="flex justify-between gap-6 py-2">
                  <dt className="font-medium">{term}</dt>
                  <dd className="text-right text-muted-foreground">{desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="grid gap-x-12 gap-y-6 border-b border-border py-10 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="text-sm font-medium">Why not a normal budgeting app</h2>
          </div>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground md:col-span-8">
            <p>
              Care spending is irregular, reimbursed late, and split between several people. A
              spending app assumes one household, one income, and predictable months.
            </p>
            <p>
              Drify keeps the record a family actually needs: what was spent on the person being
              cared for, by whom, against a budget everyone agreed on &mdash; plus answers on
              Alzheimer&rsquo;s care when a question comes up mid-month.
            </p>
          </div>
        </section>

        <section className="flex flex-wrap items-center justify-between gap-4 py-10">
          <p className="text-sm text-muted-foreground">
            Free to use. Set a budget, log a few expenses, see where the month stands.
          </p>
          <Button onClick={() => navigate('/sign-in')}>Create an account</Button>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 text-[13px] text-muted-foreground sm:flex-row sm:justify-between">
          <span>Drify &mdash; care finances, organized.</span>
          <span>Built in Aurora, Illinois.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
