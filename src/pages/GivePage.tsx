import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Globe, Heart, HandCoins, Sprout, Wheat } from "lucide-react";
import { ListGroup, Page, PageHeader, SectionLabel } from "@/components/page/PageKit";
import { useAuth } from "@/contexts/AuthContext";
import { appAlert } from "@/lib/appAlert";
import { cn } from "@/lib/utils";

const BANK = {
  bankName: "Allied Irish Banks",
  accountName: "The Power House International",
  iban: "IE85AIBK93745222068064",
  bic: "AIBKIE2D",
};

const TYPES = [
  { id: "TITHE", title: "Tithe", desc: "10% of our increase", icon: Wheat },
  { id: "OFFERING", title: "Offering", desc: "Voluntary giving", icon: Heart },
  { id: "MISSIONS", title: "Missions", desc: "Global impact", icon: Globe },
  { id: "SEED", title: "Seed", desc: "Investing in faith", icon: Sprout },
] as const;

type GivingType = (typeof TYPES)[number]["id"];

const NAME_KEY = "give_reference_name";
const groupIban = (iban: string) => iban.replace(/(.{4})/g, "$1 ").trim();

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older iOS: fall back to a hidden textarea
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

const GivePage = () => {
  const { user } = useAuth();
  const [type, setType] = useState<GivingType>("TITHE");
  const [copied, setCopied] = useState<string | null>(null);
  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch {
      return "";
    }
  });

  // Default the reference name to the signed-in person's first name
  useEffect(() => {
    if (name) return;
    const first = String((user?.user_metadata as any)?.full_name || "").trim().split(/\s+/)[0];
    if (first) setName(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const updateName = (value: string) => {
    setName(value);
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch {
      /* private mode */
    }
  };

  // Many banking apps cap the reference at 18 characters
  const refName = name.trim().toUpperCase().replace(/\s+/g, " ").slice(0, 17 - type.length).trim();
  const reference = refName ? `${refName} ${type}` : type;

  const copy = async (label: string, value: string) => {
    if (await copyText(value)) {
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1800);
    } else {
      appAlert("Couldn't copy", "Please copy the details manually.", "error");
    }
  };

  const copyAll = () =>
    copy(
      "all",
      [
        BANK.accountName,
        `IBAN: ${groupIban(BANK.iban)}`,
        `BIC: ${BANK.bic}`,
        `Bank: ${BANK.bankName}`,
        name.trim() ? `Reference: ${reference}` : `Reference: your name + ${type}`,
      ].join("\n"),
    );

  const Row = ({ label, value, copyValue, mono, highlight }: { label: string; value: ReactNode; copyValue: string; mono?: boolean; highlight?: boolean }) => (
    <div className={cn("flex items-center gap-3 px-4 py-3", highlight && "bg-blue-50/60 dark:bg-blue-950/30")}>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-muted-foreground">{label}</p>
        <div className={cn("mt-0.5 break-words text-[15.5px] font-semibold text-foreground", mono && "font-mono text-[14px] tracking-tight", highlight && "text-blue-700 dark:text-blue-300")}>
          {value}
        </div>
      </div>
      <button
        onClick={() => copy(label, copyValue)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold transition active:scale-95",
          copied === label ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300",
        )}
      >
        {copied === label ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied === label ? "Copied" : "Copy"}
      </button>
    </div>
  );

  return (
    <Page>
      <PageHeader title="Give" />

      {/* Hero keeps the church's giving photo */}
      <div className="relative h-36 overflow-hidden rounded-3xl text-white shadow-lg shadow-blue-900/20 md:h-44">
        <img src="/give_hero_bg.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/95 via-blue-800/75 to-blue-600/10" />
        <div className="relative max-w-[75%] p-5 md:p-7">
          <h2 className="font-outfit text-2xl font-extrabold md:text-3xl">Giving generously</h2>
          <p className="mt-1 text-sm leading-snug text-white/90 md:text-base">Your support builds God's kingdom and impacts lives globally.</p>
        </div>
      </div>

      <SectionLabel>What are you giving?</SectionLabel>
      <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Giving type">
        {TYPES.map((t) => {
          const on = t.id === type;
          return (
            <button
              key={t.id}
              role="radio"
              aria-checked={on}
              onClick={() => setType(t.id)}
              className={cn(
                "flex flex-col items-center rounded-[18px] border-[1.5px] bg-card px-1 pb-2.5 pt-3 text-center transition active:scale-95",
                on ? "border-blue-600 bg-blue-50 ring-[3px] ring-blue-600/15 dark:bg-blue-950/40" : "border-slate-200 dark:border-slate-800",
              )}
            >
              <t.icon className={cn("h-6 w-6", on ? "text-blue-600 dark:text-blue-300" : "text-slate-500")} />
              <span className={cn("mt-1.5 text-[13px] font-bold", on ? "text-blue-700 dark:text-blue-300" : "text-foreground")}>{t.title}</span>
              <span className="mt-0.5 text-[10.5px] leading-tight text-muted-foreground">{t.desc}</span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Bank transfer · AIB</SectionLabel>
      <ListGroup>
        <Row label="Account name" value={BANK.accountName} copyValue={BANK.accountName} />
        <Row label="IBAN" value={groupIban(BANK.iban)} copyValue={BANK.iban} mono />
        <Row label="BIC" value={BANK.bic} copyValue={BANK.bic} mono />
        <Row
          label="Your reference"
          value={name.trim() ? reference : <span className="text-muted-foreground">Add your name below</span>}
          copyValue={reference}
          highlight
        />
      </ListGroup>

      <label className="mt-3 flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-card px-4 py-2.5 dark:border-slate-800">
        <span className="shrink-0 text-sm text-muted-foreground">Name on reference</span>
        <input
          value={name}
          onChange={(e) => updateName(e.target.value.slice(0, 14))}
          placeholder="Your name"
          autoComplete="given-name"
          className="min-w-0 flex-1 bg-transparent text-right text-[15px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
      </label>

      <button
        onClick={copyAll}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 text-[15.5px] font-bold text-white shadow-lg shadow-blue-600/30 transition active:scale-[0.98]"
      >
        {copied === "all" ? <Check className="h-5 w-5" /> : <HandCoins className="h-5 w-5" />}
        {copied === "all" ? "Copied — paste into your banking app" : "Copy all details"}
      </button>

      <p className="mt-6 px-4 text-center font-serif text-[15px] italic leading-relaxed text-muted-foreground">
        “Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.”
        <span className="mt-1 block font-sans text-xs font-bold not-italic uppercase tracking-wider text-blue-600 dark:text-blue-400">2 Corinthians 9:7</span>
      </p>
    </Page>
  );
};

export default GivePage;
