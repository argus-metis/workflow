import Link from 'next/link';

const testimonials = [
  {
    name: 'Michael Carter',
    handle: 'michaelcaaarter',
    text: 'We just migrated to \u0060use workflow\u0060 and it\u2019s beautiful. Production app here, VC backed and many real fortune 100 customers using our app daily\u2026 not sure why you wouldn\u2019t \u0060use workflow\u0060 to move fast and focus on building a great experience.',
  },
  {
    name: 'Nick Tikhonov',
    handle: 'nick_tikhonov',
    text: 'fully migrated to workflows - our use case are AI agents that execute over a multiple-day time frame, making multiple outbound voice calls and processing the results\n\nbefore: scheduling service, queues, workers, cron jobs\nnow: 5 functions in one file',
  },
  {
    name: 'Karthik Kalyan',
    handle: 'karthikkalyan90',
    text: 'Behind the elegant and seemingly simple looking \u0060use workflow\u0060 and \u0060use step\u0060 directives of the new workflow development kit from @vercel lies a bunch of compiler engineering\u2026',
  },
  {
    name: 'Ryan Carson',
    handle: 'ryancarson',
    text: 'What a time to be a content marketer. Sheesh this is mind-blowing. Built a complete end-to-end workflow with @ampcode using @WorkflowDevKit and @vercel AI Gateway with Custom DurableAgent tools, Opus 4.5, Gemini 3 Pro, and Nano Banana for images. AEO locked in.',
  },
  {
    name: 'Ale Vigano',
    handle: 'ale__vigano',
    text: 'During my time at @mercadopago we struggled a lot with concurrency issues handling millions of payments. Hard to believe that almost all the complexity I remember from back then is now solved with just a \u0060use workflow\u0060',
  },
];

export const Testimonials = () => (
  <section className="px-4 py-8 sm:py-12 sm:px-12 grid gap-8">
    <h2 className="font-semibold text-xl tracking-tight sm:text-2xl md:text-3xl lg:text-[40px] text-center">
      What builders say about Workflow DevKit
    </h2>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {testimonials.map((t) => (
        <Link
          key={t.handle}
          href={`https://x.com/${t.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="border rounded-lg p-5 flex flex-col gap-3 hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground">
              {t.name
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{t.name}</p>
              <p className="text-xs text-muted-foreground">@{t.handle}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {t.text}
          </p>
        </Link>
      ))}
    </div>
  </section>
);
