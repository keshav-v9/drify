import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <button onClick={() => navigate('/')} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-[2px] bg-primary" />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Drify</span>
          </button>
          <Button size="sm" onClick={() => navigate('/sign-in')}>Sign in</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid gap-10 border-b border-border py-16 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="field-label mb-5">Why Drify exists</p>
            <h1 className="max-w-lg text-3xl font-semibold leading-[1.15] md:text-[38px]">
              It started with my grandfather&rsquo;s bills.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
              Keshav Varma, Aurora, Illinois. Drify came out of one family&rsquo;s attempt to keep
              track of care costs during an Alzheimer&rsquo;s diagnosis.
            </p>
          </div>
          <div className="md:col-span-5">
            <img
              src="/lovable-uploads/36ec9c01-d135-4aad-8dbc-6b53d55ada17.png"
              alt="Keshav Varma, the creator of Drify"
              className="h-56 w-56 rounded-lg border border-border object-cover"
              loading="lazy"
            />
          </div>
        </section>

        <section className="grid gap-x-16 gap-y-12 border-b border-border py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="rule-tick text-sm font-medium">The problem</h2>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground md:col-span-8">
            <p>
              When my grandpa was diagnosed with Alzheimer&rsquo;s, it turned our whole world upside
              down. Watching someone you love start to forget the people and moments that shaped
              their life is heartbreaking. What we did not expect was how hard it would be to
              manage his finances.
            </p>
            <p>
              From medical bills to everyday expenses, everything became more complicated. My
              family was already doing everything we could to take care of him physically and
              emotionally, but keeping track of money, paying bills on time, and making sure
              nothing slipped through the cracks was overwhelming.
            </p>
          </div>
        </section>

        <section className="grid gap-x-16 gap-y-12 border-b border-border py-16 md:grid-cols-12">
          <div className="md:col-span-4">
            <h2 className="rule-tick text-sm font-medium">What I built</h2>
          </div>
          <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground md:col-span-8">
            <p>
              Drify is the tool I wanted then: a place to set a care budget, log expenses as they
              happen, project what care will cost over the coming months, and share all of it with
              the rest of the family.
            </p>
            <p>
              I&rsquo;m interested in how technology can take pressure off families dealing with the
              economics of chronic illness &mdash; from care costs to the paperwork that surrounds
              them. Drify is a practical answer to a problem I lived through.
            </p>
          </div>
        </section>

        <section className="flex flex-col gap-4 py-14 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-sm text-muted-foreground">
            If your family is going through something similar, I hope this makes one part of it
            easier.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/')}>Back to home</Button>
            <Button onClick={() => navigate('/sign-in')}>Create an account</Button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default About;
