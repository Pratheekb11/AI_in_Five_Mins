const CONTACT = [
  {
    label: "Email",
    handle: "bpratheek122@gmail.com",
    href: "mailto:bpratheek122@gmail.com",
  },
  {
    label: "LinkedIn",
    handle: "bpratheek",
    href: "https://www.linkedin.com/in/bpratheek/",
  },
  {
    label: "Twitter",
    handle: "@BPratheek_11",
    href: "https://x.com/BPratheek_11",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-ink/25 border-t">
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-8 sm:grid-cols-[1fr_auto]">
          <div>
            <p className="font-display text-lg font-extrabold tracking-tight">
              AI in <span className="text-pink-text">Five</span>
            </p>
            <p className="prose-measure text-ink-soft mt-2 text-sm">
              Every token, vector and probability here is computed from a real
              model or a published dataset. If a number cannot be traced, it
              does not ship.
            </p>
          </div>

          <div>
            <p className="label text-ink-faint mb-3">Get in touch</p>
            <ul className="space-y-2">
              {CONTACT.map((item) => (
                <li key={item.label} className="flex items-baseline gap-3">
                  <span className="label text-ink-faint w-16 shrink-0">
                    {item.label}
                  </span>
                  <a
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    className="font-data decoration-ink/30 hover:decoration-ink text-sm underline underline-offset-4"
                  >
                    {item.handle}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="border-ink/20 text-ink-faint mt-8 flex flex-wrap items-center gap-x-1.5 border-t pt-5 text-sm">
          Made with <span aria-label="love">❤️</span> by Pratheek B
        </p>
      </div>
    </footer>
  );
}
