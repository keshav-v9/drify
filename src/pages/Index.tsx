
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-border"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
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

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-12 border-b border-border py-16 md:grid-cols-12 md:py-24">
          <div className="md:col-span-7">
            <p className="field-label mb-5">For families managing care</p>
            <h1 className="max-w-xl text-4xl font-semibold leading-[1.1] md:text-[44px]">
              Keep a parent&rsquo;s money organized while you care for them.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Track care costs, bills and reimbursements in one place, set a monthly budget that
              reflects real caregiving expenses, and share the picture with siblings so nothing
              falls through the cracks.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate('/sign-in')}>Create an account</Button>
              <Button variant="ghost" onClick={() => navigate('/about')}>Read the story behind Drify</Button>
            </div>
            <p className="mt-4 text-[13px] text-muted-foreground">Free to use. No card required.</p>
          </div>

          <div className="md:col-span-5">
            <div className="rule-tick">
              <dl className="divide-y divide-border">
                {[
                  ['Monthly care budget', 'Categories built for medication, home help and transport'],
                  ['Expense log', 'Log a cost in seconds and see where the month is heading'],
                  ['Shared with family', 'Invite siblings so everyone sees the same numbers'],
                ].map(([term, desc]) => (
                  <div key={term} className="py-4">
                    <dt className="text-sm font-medium">{term}</dt>
                    <dd className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="grid gap-10 border-b border-border py-14 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-semibold">Built around caregiving, not generic budgeting</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Care costs don&rsquo;t fit a standard spending app. Drify starts from the categories
              families actually deal with.
            </p>
          </div>
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 md:col-span-2">
            <div>
              <h3 className="text-sm font-medium">Plan for what care will cost</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Project in-home help, facility fees and medical costs over the coming months so a
                decision isn&rsquo;t made blind.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Answers on Alzheimer&rsquo;s care</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Ask about symptom changes, daily routines or which products help, and get a
                straight answer instead of a search page.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Documents where you can find them</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Keep account details, plans and notes together instead of spread across inboxes.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium">Private by default</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Records are visible only to you and the family members you invite.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Start with this month</h2>
            <p className="mt-2 text-sm text-muted-foreground">Set a budget, log a few expenses, and see where you stand.</p>
          </div>
          <Button onClick={() => navigate('/sign-in')}>Create an account</Button>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 text-[13px] text-muted-foreground sm:flex-row sm:justify-between">
          <span>Drify &mdash; care finances, organized.</span>
          <span>Built in Aurora, Illinois.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
