import { useNavigate } from "react-router-dom";
import { Check, CircleHelp, Copy, Home, Mail, Search, Sparkles, Undo2 } from "lucide-react";
import { ListGroup, Page, PageTitle, SectionLabel } from "@/components/page/PageKit";
import { PlaceRow } from "@/components/nav/Places";
import { HOW_DO_I, TILE, destination } from "@/data/appDirectory";
import { openSearch, startTour } from "@/lib/appEvents";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { PLATFORM, church, hasFeature } from "@/config/church";
import { useAuth } from "@/contexts/AuthContext";
import { deviceLabel } from "@/lib/activity";
import FeedbackCard from "@/components/feedback/FeedbackCard";

const TIPS = [
  { icon: Home, text: "Lost? Tap Home at the bottom of the screen to start again." },
  { icon: Undo2, text: "The Back button at the top of a page takes you to where you were." },
  { icon: Search, text: `Search finds anything, even inside pages. Try “${hasFeature("choir") ? "choir lessons" : "Psalm 23"}”.` },
];

/** Help: the tour, common questions (each one takes you there) and a few tips. */
const HelpPage = () => {
  const navigate = useNavigate();

  return (
    <Page>
      <PageTitle
        icon={CircleHelp}
        tint={TILE.blue}
        title="Help"
        subtitle="Tap a question and we'll take you there"
        back={{ label: "Back", onClick: () => (window.history.length > 1 ? navigate(-1) : navigate("/")) }}
      />

      {/* The tour */}
      <button
        onClick={startTour}
        className="flex w-full items-center gap-4 rounded-[22px] bg-gradient-to-br from-violet-600 to-indigo-600 p-4 text-left text-white shadow-lg shadow-indigo-600/25 transition active:scale-[0.99]"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
          <Sparkles className="h-6 w-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-outfit text-[19px] font-bold">Show me around</span>
          <span className="block text-[14px] text-white/85">A 1-minute tour of the app</span>
        </span>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 text-[15px] font-bold text-indigo-600">Start</span>
      </button>

      {/* "Is the app helping you?" */}
      <FeedbackCard />

      <SectionLabel>How do I…</SectionLabel>
      <ListGroup>
        {HOW_DO_I.map((q) => (
          <PlaceRow key={q.question} id={q.to} title={q.question} subtitle={destination(q.to)?.crumb} />
        ))}
      </ListGroup>

      <SectionLabel>Good to know</SectionLabel>
      <div className="space-y-2">
        {TIPS.map((tip) => (
          <div key={tip.text} className="flex items-center gap-3 rounded-[18px] bg-blue-50/70 px-4 py-3 text-[15px] text-slate-700 dark:bg-blue-950/30 dark:text-slate-200">
            <tip.icon className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
            {tip.text}
          </div>
        ))}
      </div>

      <button
        onClick={() => openSearch()}
        className={cn("mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[16px] font-semibold text-white shadow-md shadow-blue-600/25", TILE.blue)}
      >
        <Search className="h-5 w-5" /> Still can't find it? Search
      </button>

      <ContactForHelp />
    </Page>
  );
};

/**
 * Contact us for help: an email to the app's support address (PLATFORM.supportEmail),
 * with the church, the phone and the account already filled in, so a reply can help at
 * once. Copy is there for phones with no mail app set up.
 */
const ContactForHelp = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const email = PLATFORM.supportEmail;
  const about = [
    "",
    "",
    "––––",
    `Church: ${church.name}`,
    `Phone: ${deviceLabel()}`,
    user?.email ? `Account: ${user.email}` : "Not signed in",
  ].join("\n");
  // "the Power House app", never "the The Power House app"
  const href = `mailto:${email}?subject=${encodeURIComponent(`Help with the ${church.name.replace(/^the\s+/i, '')} app`)}&body=${encodeURIComponent(`Hi, I need help with:${about}`)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* the address is shown, so it can be typed */
    }
  };
  return (
    <section aria-label="Contact us for help" className="mt-8 rounded-[22px] border border-slate-200/80 bg-card p-4 shadow-sm dark:border-slate-800" data-testid="contact-help">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
          <Mail className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[16px] font-semibold text-foreground">Still need help?</h2>
          <p className="text-[13.5px] leading-snug text-muted-foreground">Email us and we'll get back to you.</p>
        </div>
      </div>
      <a
        href={href}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-[15.5px] font-semibold text-white active:bg-blue-700"
      >
        <Mail className="h-5 w-5" /> Contact us for help
      </a>
      <div className="mt-2 flex items-center justify-center gap-2 text-[13.5px] text-muted-foreground">
        <span className="select-all break-all">{email}</span>
        <button type="button" onClick={copy} aria-label="Copy the email address" className="flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 font-semibold text-blue-600 active:bg-muted dark:text-blue-400">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </section>
  );
};

export default HelpPage;
