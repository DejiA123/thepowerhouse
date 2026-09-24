import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, HandHeart, MoreHorizontal, PartyPopper, Plus, Trash2 } from "lucide-react";
import PrayerRequestForm from "@/components/PrayerRequestForm";
import UserAvatar from "@/components/common/UserAvatar";
import { EmptyState, Page, PageHeader, Pill, Segmented } from "@/components/page/PageKit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { appAlert } from "@/lib/appAlert";
import { sendPush } from "@/lib/push";
import { uniqueTopic } from "@/lib/realtime";
import { cn } from "@/lib/utils";

type Tab = "wall" | "mine" | "answered";

interface PrayerRequest {
  id: string;
  user_id: string;
  title: string;
  content: string;
  created_at: string | null;
  is_private: boolean | null;
  is_anonymous?: boolean;
  answered_at?: string | null;
  testimony?: string | null;
  profiles?: { full_name?: string | null } | null;
}

const when = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h`;
  if (mins < 60 * 48) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
};

const sameText = (a: string, b: string) => b.trim().toLowerCase().startsWith(a.trim().toLowerCase().replace(/…$/, ""));

const PrayerCard = ({
  request,
  name,
  isMine,
  canDelete,
  praying,
  prayedByMe,
  prayingSupported,
  answeredSupported,
  onPray,
  onAnswered,
  onDelete,
}: {
  request: PrayerRequest;
  name: string;
  isMine: boolean;
  canDelete: boolean;
  praying: number;
  prayedByMe: boolean;
  prayingSupported: boolean;
  answeredSupported: boolean;
  onPray: () => void;
  onAnswered: () => void;
  onDelete: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const anonymous = !!request.is_anonymous;
  const long = request.content.length > 280;
  const showTitle = request.title && !sameText(request.title, request.content);

  return (
    <article className="rounded-[22px] border border-slate-200/70 bg-card p-4 shadow-sm dark:border-slate-800">
      <div className="flex items-center gap-3">
        {anonymous ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300">
            <HandHeart className="h-[18px] w-[18px]" />
          </span>
        ) : (
          <UserAvatar name={name} seed={request.user_id} className="h-9 w-9 text-xs" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{when(request.created_at)}</p>
        </div>
        {request.answered_at && (
          <Pill className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Answered
          </Pill>
        )}
        {(isMine || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="-mr-1 rounded-full p-1.5 text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Request options">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isMine && answeredSupported && !request.answered_at && (
                <DropdownMenuItem onClick={onAnswered}>
                  <PartyPopper className="mr-2 h-4 w-4" /> Mark as answered
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {showTitle && <h3 className="mt-3 text-[16px] font-bold leading-snug text-foreground">{request.title}</h3>}
      <p className={cn("whitespace-pre-wrap text-[15.5px] leading-relaxed text-slate-700 dark:text-slate-200", showTitle ? "mt-1" : "mt-3", long && !expanded && "line-clamp-6")}>
        {request.content}
      </p>
      {long && (
        <button onClick={() => setExpanded((v) => !v)} className="mt-1 text-sm font-semibold text-blue-600 dark:text-blue-400">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}

      {request.answered_at && request.testimony && (
        <div className="mt-3 rounded-2xl bg-emerald-50 px-3.5 py-3 dark:bg-emerald-950/40">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">What God did</p>
          <p className="mt-1 font-serif text-[15.5px] leading-relaxed text-emerald-900 dark:text-emerald-100">{request.testimony}</p>
        </div>
      )}

      {prayingSupported && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={onPray}
            disabled={isMine}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13.5px] font-bold transition active:scale-95 disabled:active:scale-100",
              prayedByMe
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/25"
                : "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
              isMine && "cursor-default",
            )}
            aria-pressed={prayedByMe}
          >
            <span aria-hidden>🙏</span>
            {isMine ? "Praying" : prayedByMe ? "Praying" : "Pray"}
            {praying > 0 && <span className={cn("tabular-nums", prayedByMe ? "text-white/85" : "opacity-70")}>· {praying}</span>}
          </button>
          <span className="text-xs text-muted-foreground">
            {isMine
              ? praying > 0
                ? `${praying} ${praying === 1 ? "person is" : "people are"} praying for you`
                : "People can tap Pray to let you know"
              : prayedByMe
                ? "They'll know you're praying"
                : ""}
          </span>
        </div>
      )}
    </article>
  );
};

const PrayerWallPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "mine" ? "mine" : params.get("tab") === "answered" ? "answered" : "wall";
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [prayingSupported, setPrayingSupported] = useState(false);
  const [answering, setAnswering] = useState<PrayerRequest | null>(null);
  const [testimony, setTestimony] = useState("");
  const [deleting, setDeleting] = useState<PrayerRequest | null>(null);
  const refreshTimer = useRef<number>();

  const answeredSupported = requests.some((r) => "answered_at" in r);

  const fetchPrayers = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const { data, error } = await supabase
        .from("prayer_request_prayers" as any)
        .select("prayer_request_id, user_id")
        .in("prayer_request_id", ids);
      if (error) {
        // Table not created yet: keep the wall working without the Pray button
        setPrayingSupported(false);
        return;
      }
      const next: Record<string, number> = {};
      const byMe = new Set<string>();
      for (const row of (data || []) as any[]) {
        next[row.prayer_request_id] = (next[row.prayer_request_id] || 0) + 1;
        if (row.user_id === user?.id) byMe.add(row.prayer_request_id);
      }
      setCounts(next);
      setMine(byMe);
      setPrayingSupported(true);
    },
    [user?.id],
  );

  const fetchRequests = useCallback(async () => {
    const { data, error } = await supabase
      .from("prayer_requests")
      .select("*")
      .or(user ? `is_private.eq.false,user_id.eq.${user.id}` : "is_private.eq.false")
      .order("created_at", { ascending: false });
    if (error) {
      appAlert("Couldn't load the Prayer Wall", error.message, "error");
      setLoading(false);
      return;
    }
    const rows = (data || []) as PrayerRequest[];
    const userIds = [...new Set(rows.filter((r) => !r.is_anonymous).map((r) => r.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
    setRequests(rows.map((r) => ({ ...r, profiles: byId.get(r.user_id) || null })));
    setLoading(false);
    fetchPrayers(rows.map((r) => r.id));
  }, [user, fetchPrayers]);

  useEffect(() => {
    fetchRequests();
    const refresh = () => {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = window.setTimeout(fetchRequests, 300);
    };
    const channel = supabase
      .channel(uniqueTopic("prayer-wall"))
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_requests" }, refresh)
      .subscribe();
    return () => {
      window.clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  // Live "praying" counts, once the table exists (a missing table would break the channel)
  useEffect(() => {
    if (!prayingSupported) return;
    const channel = supabase
      .channel(uniqueTopic("prayer-wall-prayers"))
      .on("postgres_changes", { event: "*", schema: "public", table: "prayer_request_prayers" }, () => {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = window.setTimeout(fetchRequests, 300);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [prayingSupported, fetchRequests]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("role", ["administrator", "pastor"])
      .then(({ data }) => setIsAdmin(!!data?.length));
  }, [user]);

  const displayName = (r: PrayerRequest) => {
    const own = r.user_id === user?.id;
    if (r.is_anonymous) return own ? "You · name hidden" : "Someone from the church";
    const full = r.profiles?.full_name?.trim();
    return own ? "You" : full || "Church member";
  };

  const togglePray = async (r: PrayerRequest) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const was = mine.has(r.id);
    // Optimistic: the button responds instantly
    setMine((prev) => {
      const next = new Set(prev);
      if (was) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
    setCounts((prev) => ({ ...prev, [r.id]: Math.max(0, (prev[r.id] || 0) + (was ? -1 : 1)) }));
    const table = supabase.from("prayer_request_prayers" as any);
    const { error } = was
      ? await table.delete().eq("prayer_request_id", r.id).eq("user_id", user.id)
      : await table.insert({ prayer_request_id: r.id, user_id: user.id } as any);
    if (error && error.code !== "23505") {
      appAlert("Couldn't update", error.message, "error");
      fetchPrayers(requests.map((x) => x.id));
      return;
    }
    if (!was) sendPush({ type: "prayer-prayed", prayerRequestId: r.id });
  };

  const markAnswered = async () => {
    if (!answering) return;
    const { error } = await supabase
      .from("prayer_requests")
      .update({ answered_at: new Date().toISOString(), testimony: testimony.trim() || null } as any)
      .eq("id", answering.id);
    if (error) {
      appAlert("Couldn't mark as answered", error.message, "error");
      return;
    }
    appAlert("Praise God! 🎉", "Your request now shows as answered.", "success");
    setAnswering(null);
    setTestimony("");
    fetchRequests();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("prayer_requests").delete().eq("id", deleting.id);
    if (error) {
      appAlert("Couldn't delete the request", error.message, "error");
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== deleting.id));
    setDeleting(null);
  };

  const visible = useMemo(() => {
    if (tab === "mine") return requests.filter((r) => r.user_id === user?.id);
    if (tab === "answered") return requests.filter((r) => r.answered_at);
    return requests.filter((r) => !r.is_private);
  }, [requests, tab, user?.id]);

  const latestAnswered = tab === "wall" ? requests.find((r) => r.answered_at && !r.is_private && r.testimony) : undefined;

  return (
    <Page>
      <PageHeader
        title="Prayer Wall"
        action={
          <Button
            onClick={() => (user ? setShowForm(true) : navigate("/auth"))}
            className="h-10 rounded-full bg-blue-600 px-4 font-semibold shadow-md shadow-blue-600/25 hover:bg-blue-700"
          >
            <Plus className="mr-1 h-4 w-4" /> Request
          </Button>
        }
      />

      <Segmented<Tab>
        value={tab}
        onChange={(t) => setParams(t === "wall" ? {} : { tab: t }, { replace: true })}
        options={[
          { value: "wall", label: "Wall" },
          { value: "mine", label: "Mine" },
          { value: "answered", label: "Answered" },
        ]}
      />

      {latestAnswered && (
        <div className="mb-3 rounded-[22px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/70 p-4 dark:border-emerald-900 dark:from-emerald-950/50 dark:to-emerald-900/30">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">🎉 Answered prayer</p>
          <p className="mt-1.5 font-serif text-[16.5px] leading-relaxed text-emerald-950 dark:text-emerald-50">“{latestAnswered.testimony}”</p>
          <p className="mt-1 text-sm font-semibold text-emerald-700 dark:text-emerald-300">— {displayName(latestAnswered)}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-[22px] bg-slate-100 dark:bg-slate-800/60" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        tab === "mine" ? (
          <EmptyState icon={HandHeart} title={user ? "You haven't shared a request yet" : "Sign in to see your requests"}>
            {user ? "Tap Request to ask the church family to pray with you." : ""}
          </EmptyState>
        ) : tab === "answered" ? (
          <EmptyState icon={PartyPopper} title="No answered prayers yet">
            When God answers, open your request's menu and choose “Mark as answered” to share what He did.
          </EmptyState>
        ) : (
          <EmptyState icon={HandHeart} title="No prayer requests yet">
            Be the first to share one.
          </EmptyState>
        )
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <PrayerCard
              key={r.id}
              request={r}
              name={displayName(r)}
              isMine={r.user_id === user?.id}
              canDelete={isAdmin}
              praying={counts[r.id] || 0}
              prayedByMe={mine.has(r.id)}
              prayingSupported={prayingSupported}
              answeredSupported={answeredSupported}
              onPray={() => togglePray(r)}
              onAnswered={() => {
                setTestimony("");
                setAnswering(r);
              }}
              onDelete={() => setDeleting(r)}
            />
          ))}
        </div>
      )}

      {/* New request */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle>New prayer request</DialogTitle>
            <DialogDescription>The church family will see it on the wall and can pray with you.</DialogDescription>
          </DialogHeader>
          <PrayerRequestForm
            onSuccess={() => {
              setShowForm(false);
              fetchRequests();
              appAlert("Request posted 🙏", "We're praying with you.", "success");
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Mark answered */}
      <Dialog open={!!answering} onOpenChange={(open) => !open && setAnswering(null)}>
        <DialogContent className="max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>Praise God! 🎉</DialogTitle>
            <DialogDescription>Share what God did (optional). It encourages everyone who prayed.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={testimony}
            onChange={(e) => setTestimony(e.target.value)}
            placeholder="e.g. The surgery went perfectly and Mum is home!"
            className="min-h-[110px] resize-none rounded-2xl text-base"
          />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setAnswering(null)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={markAnswered} className="rounded-full bg-emerald-600 px-6 font-semibold hover:bg-emerald-700">
              Mark answered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle>Delete this request?</DialogTitle>
            <DialogDescription>It will be removed from the wall for everyone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} className="flex-1 rounded-full">
              Cancel
            </Button>
            <Button variant="destructive" onClick={remove} className="flex-1 rounded-full">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default PrayerWallPage;
