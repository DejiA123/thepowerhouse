import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, LayoutGrid, List, MapPin, RotateCcw, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState, IconBadge, ListGroup, ListRow, Page, PageHeader, SectionLabel, Segmented } from "@/components/page/PageKit";
import { DragHandle, SortableList, type DragHandleProps } from "@/components/resources/SortableList";
import { useNotifications } from "@/contexts/NotificationContext";
import { useCampus } from "@/data/campuses";
import { DEFAULT_SECTIONS, itemById, type ResourceItem } from "@/data/resourceCatalog";
import { useResourcesLayout, type ResourcesLayout } from "@/hooks/useResourcesLayout";
import { cn } from "@/lib/utils";
import { ResourceService } from "@/services/resourceService";

const Badge = ({ count }: { count: number }) => (
  <span className="min-w-[22px] shrink-0 rounded-full bg-red-500 px-1.5 text-center text-xs font-bold leading-[22px] text-white">{count > 99 ? "99+" : count}</span>
);

const StarButton = ({ on, onClick, title }: { on: boolean; onClick: () => void; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    aria-label={on ? `Remove ${title} from Favourites` : `Add ${title} to Favourites`}
    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90"
  >
    <Star className={cn("h-[21px] w-[21px]", on ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-600")} />
  </button>
);

const EyeButton = ({ shown, onClick, title }: { shown: boolean; onClick: () => void; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={!shown}
    aria-label={shown ? `Hide ${title}` : `Show ${title}`}
    className={cn(
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-90",
      shown ? "text-slate-500 dark:text-slate-400" : "bg-slate-100 text-slate-400 dark:bg-slate-800",
    )}
  >
    {shown ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
  </button>
);

/** A resource in a list: tap to open, star to add to Favourites. */
const ResourceRow = ({
  item,
  favourite,
  badge,
  value,
  onOpen,
  onStar,
}: {
  item: ResourceItem;
  favourite: boolean;
  badge?: number;
  value?: string;
  onOpen: () => void;
  onStar: () => void;
}) => (
  <div className="flex min-h-[62px] items-center">
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5 pl-4 pr-1 text-left transition-colors hover:bg-slate-50 active:bg-slate-100 dark:hover:bg-slate-800/60 dark:active:bg-slate-800"
    >
      <IconBadge icon={item.icon} className={item.tint} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{item.title}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{item.subtitle}</span>
      </span>
      {value && <span className="shrink-0 text-xs text-muted-foreground">{value}</span>}
      {!!badge && <Badge count={badge} />}
    </button>
    <div className="pr-1.5">
      <StarButton on={favourite} onClick={onStar} title={item.title} />
    </div>
  </div>
);

/** A favourite as a big tile. */
const FavouriteTile = ({ item, badge, onOpen }: { item: ResourceItem; badge?: number; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    className="relative flex min-h-[118px] flex-col items-start rounded-[20px] border border-slate-200/70 bg-card p-3.5 text-left shadow-sm transition active:scale-[0.97] dark:border-slate-800"
  >
    <IconBadge icon={item.icon} className={cn("h-10 w-10 rounded-xl", item.tint)} />
    {!!badge && (
      <span className="absolute right-3 top-3">
        <Badge count={badge} />
      </span>
    )}
    <span className="mt-auto block w-full pt-3">
      <span className="block truncate text-[15px] font-semibold leading-tight text-foreground">{item.title}</span>
      <span className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">{item.subtitle}</span>
    </span>
  </button>
);

/** A resource while customising: drag to reorder, star for Favourites, eye to show or hide. */
const EditRow = ({
  item,
  handle,
  favourite,
  shown,
  onStar,
  onToggleShown,
}: {
  item: ResourceItem;
  handle: DragHandleProps;
  favourite: boolean;
  shown: boolean;
  onStar: () => void;
  onToggleShown: () => void;
}) => (
  <div className="flex min-h-[58px] items-center gap-2 bg-card py-1.5 pl-3 pr-1.5">
    <DragHandle {...handle} label={`Move ${item.title}`} />
    <span className={cn("flex min-w-0 flex-1 items-center gap-3", !shown && "opacity-45")}>
      <IconBadge icon={item.icon} className={item.tint} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-foreground">{item.title}</span>
        <span className="block truncate text-[12px] text-muted-foreground">{shown ? item.subtitle : "Hidden"}</span>
      </span>
    </span>
    <StarButton on={favourite} onClick={onStar} title={item.title} />
    <EyeButton shown={shown} onClick={onToggleShown} title={item.title} />
  </div>
);

const sectionTitle = (s: ResourcesLayout["sections"][number]) => s.title || DEFAULT_SECTIONS.find((d) => d.id === s.id)?.title || "";

const ResourcesPage = () => {
  const navigate = useNavigate();
  const { campus } = useCampus();
  const { unreadChats } = useNotifications();
  const { layout, update, reset } = useResourcesLayout();
  const [editing, setEditing] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [query, setQuery] = useState("");
  const [views, setViews] = useState<Record<string, number>>({});
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    ResourceService.getResourceDownloadCounts()
      .then((counts) => setViews(counts["Interactive Session"] || {}))
      .catch(() => undefined);
  }, []);

  const openSession = (name: string) => {
    setViewing(name);
    setViews((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
    ResourceService.recordDownload(name, "Interactive Session", ResourceService.getClientIP(), ResourceService.getUserAgent()).catch(() => undefined);
  };

  const open = (item: ResourceItem) => {
    if (item.session) openSession(item.session);
    else if (item.to) navigate(item.to);
  };

  const favourites = new Set(layout.favourites);
  const hidden = new Set(layout.hidden);
  const badgeFor = (item: ResourceItem) => (item.id === "chats" ? unreadChats : 0);
  const valueFor = (item: ResourceItem) => (item.session && views[item.session] ? `${views[item.session]} views` : undefined);

  const toggleFavourite = (id: string) =>
    update((l) => ({ ...l, favourites: l.favourites.includes(id) ? l.favourites.filter((x) => x !== id) : [...l.favourites, id] }));
  const toggleHidden = (id: string) =>
    update((l) => ({ ...l, hidden: l.hidden.includes(id) ? l.hidden.filter((x) => x !== id) : [...l.hidden, id] }));
  const updateSection = (id: string, patch: Partial<ResourcesLayout["sections"][number]>) =>
    update((l) => ({ ...l, sections: l.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)) }));

  const row = (item: ResourceItem) => (
    <ResourceRow
      key={item.id}
      item={item}
      favourite={favourites.has(item.id)}
      badge={badgeFor(item)}
      value={valueFor(item)}
      onOpen={() => open(item)}
      onStar={() => toggleFavourite(item.id)}
    />
  );

  // Search looks through everything, hidden items too
  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      q
        ? layout.sections
            .flatMap((s) => s.items)
            .map((id) => itemById.get(id)!)
            .filter((item) => item && `${item.title} ${item.subtitle} ${item.keywords ?? ""}`.toLowerCase().includes(q))
        : [],
    [q, layout.sections],
  );

  const favouriteItems = layout.favourites.map((id) => itemById.get(id)).filter(Boolean) as ResourceItem[];

  return (
    <Page grouped>
      <PageHeader
        title={editing ? "Customise" : "Resources"}
        action={
          editing ? (
            <Button onClick={() => setEditing(false)} className="h-9 rounded-full bg-blue-600 px-4 font-semibold text-white hover:bg-blue-700">
              <Check className="mr-1.5 h-4 w-4" /> Done
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setEditing(true);
              }}
              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200/70 transition active:scale-95 dark:bg-slate-800 dark:text-blue-400 dark:ring-slate-700"
            >
              <SlidersHorizontal className="h-4 w-4" /> Customise
            </button>
          )
        }
      />

      {editing ? (
        <>
          <p className="rounded-2xl bg-blue-50 px-4 py-3 text-[13.5px] leading-relaxed text-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
            Drag <span className="font-semibold">⋮⋮</span> to reorder. Tap ☆ to add to Favourites and the eye to hide what you don’t use. Tap a
            section’s name to rename it.
          </p>

          <SectionLabel>Page</SectionLabel>
          <ListGroup>
            <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
              <span className="flex-1 text-[15px] font-semibold text-foreground">Favourites look</span>
              <Segmented
                className="mb-0 w-[170px]"
                value={layout.favouriteStyle}
                onChange={(favouriteStyle) => update((l) => ({ ...l, favouriteStyle }))}
                options={[
                  { value: "tiles", label: <><LayoutGrid className="h-4 w-4" /> Tiles</> },
                  { value: "list", label: <><List className="h-4 w-4" /> List</> },
                ]}
              />
            </div>
            <label className="flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-2.5">
              <span className="flex-1">
                <span className="block text-[15px] font-semibold text-foreground">Show my church</span>
                <span className="block text-[12.5px] text-muted-foreground">Service times and address at the top</span>
              </span>
              <Switch checked={layout.showChurch} onCheckedChange={(showChurch) => update((l) => ({ ...l, showChurch }))} />
            </label>
          </ListGroup>

          <SectionLabel>Favourites</SectionLabel>
          {favouriteItems.length ? (
            <ListGroup>
              <SortableList ids={favouriteItems.map((i) => i.id)} onReorder={(ids) => update((l) => ({ ...l, favourites: ids }))} className="divide-y divide-slate-100 dark:divide-slate-800">
                {(id, handle) => {
                  const item = itemById.get(id)!;
                  return (
                    <div className="flex min-h-[58px] items-center gap-2 bg-card py-1.5 pl-3 pr-1.5">
                      <DragHandle {...handle} label={`Move ${item.title} in Favourites`} />
                      <IconBadge icon={item.icon} className={item.tint} />
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => toggleFavourite(id)}
                        aria-label={`Remove ${item.title} from Favourites`}
                        className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition active:scale-90"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  );
                }}
              </SortableList>
            </ListGroup>
          ) : (
            <p className="rounded-[20px] border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-muted-foreground dark:border-slate-700">
              Nothing here yet. Tap ☆ on anything below to add it.
            </p>
          )}

          <SectionLabel>Sections</SectionLabel>
          <SortableList ids={layout.sections.map((s) => s.id)} onReorder={(ids) => update((l) => ({ ...l, sections: ids.map((id) => l.sections.find((s) => s.id === id)!) }))} className="space-y-3">
            {(sectionId, handle) => {
              const section = layout.sections.find((s) => s.id === sectionId)!;
              const title = sectionTitle(section);
              return (
                <div className="overflow-hidden rounded-[20px] border border-slate-200/70 bg-card shadow-sm dark:border-slate-800">
                  <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 py-1.5 pl-3 pr-1.5 dark:border-slate-800 dark:bg-slate-900/60">
                    <DragHandle {...handle} label={`Move the ${title} section`} />
                    <input
                      value={section.title ?? title}
                      onChange={(e) => updateSection(section.id, { title: e.target.value.slice(0, 40) })}
                      onBlur={(e) => !e.target.value.trim() && updateSection(section.id, { title: undefined })}
                      aria-label="Section name"
                      className={cn(
                        "min-w-0 flex-1 rounded-lg bg-transparent px-1.5 py-1.5 text-[13px] font-bold uppercase tracking-[0.06em] text-foreground outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/30 dark:focus:bg-slate-800",
                        section.hidden && "opacity-50",
                      )}
                    />
                    <EyeButton shown={!section.hidden} onClick={() => updateSection(section.id, { hidden: !section.hidden })} title={`the ${title} section`} />
                  </div>
                  {section.hidden ? (
                    <p className="px-4 py-3.5 text-[13px] text-muted-foreground">Hidden from your page. Tap the eye to show it again.</p>
                  ) : (
                    <SortableList ids={section.items} onReorder={(items) => updateSection(section.id, { items })} className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(id, itemHandle) => {
                        const item = itemById.get(id)!;
                        return (
                          <EditRow
                            item={item}
                            handle={itemHandle}
                            favourite={favourites.has(id)}
                            shown={!hidden.has(id)}
                            onStar={() => toggleFavourite(id)}
                            onToggleShown={() => toggleHidden(id)}
                          />
                        );
                      }}
                    </SortableList>
                  )}
                </div>
              );
            }}
          </SortableList>

          <div className="mt-6">
            <ListGroup>
              <ListRow icon={RotateCcw} iconClassName="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" title="Reset to default" subtitle="The original order, nothing hidden" onClick={() => setConfirmReset(true)} chevron={false} />
            </ListGroup>
          </div>
        </>
      ) : (
        <>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plans, groups, teams…"
              className="h-11 w-full rounded-[13px] bg-slate-200/70 pl-10 pr-3 text-[16px] text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-blue-500/40 dark:bg-slate-800"
              type="search"
              enterKeyHint="search"
            />
          </div>

          {q ? (
            results.length ? (
              <>
                <SectionLabel>Results</SectionLabel>
                <ListGroup>{results.map(row)}</ListGroup>
              </>
            ) : (
              <div className="mt-6">
                <EmptyState icon={Search} title={`Nothing found for “${query.trim()}”`}>
                  Try “prayer”, “choir” or “Bible”.
                </EmptyState>
              </div>
            )
          ) : (
            <>
              {layout.showChurch && (
                <div className="mt-4">
                  <ListGroup>
                    <ListRow
                      icon={MapPin}
                      iconClassName="bg-blue-600 text-white"
                      title={campus ? `Your church: ${campus.name}` : "Find your church"}
                      subtitle={campus ? `Sunday ${campus.times.sunday} · ${campus.street}` : "Galway · Dublin · Kildare · Athlone"}
                      onClick={() => navigate("/services")}
                    />
                  </ListGroup>
                </div>
              )}

              <SectionLabel>
                <span className="inline-flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Favourites
                </span>
              </SectionLabel>
              {favouriteItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-slate-300 bg-white/60 px-4 py-4 dark:border-slate-700 dark:bg-slate-900/40">
                  <Star className="h-6 w-6 shrink-0 text-amber-400" />
                  <p className="text-[13.5px] leading-snug text-muted-foreground">
                    Tap ☆ next to anything below to keep it here, at the top of your page.
                  </p>
                </div>
              ) : layout.favouriteStyle === "tiles" ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {favouriteItems.map((item) => (
                    <FavouriteTile key={item.id} item={item} badge={badgeFor(item)} onOpen={() => open(item)} />
                  ))}
                </div>
              ) : (
                <ListGroup>{favouriteItems.map(row)}</ListGroup>
              )}

              {layout.sections.map((section) => {
                if (section.hidden) return null;
                const items = section.items.filter((id) => !hidden.has(id)).map((id) => itemById.get(id)!).filter(Boolean);
                if (!items.length) return null;
                return (
                  <div key={section.id}>
                    <SectionLabel>{sectionTitle(section)}</SectionLabel>
                    <ListGroup>{items.map(row)}</ListGroup>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setEditing(true)}
                className="mx-auto mt-6 flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold text-blue-600 transition active:scale-95 dark:text-blue-400"
              >
                <SlidersHorizontal className="h-4 w-4" /> Customise this page
              </button>
            </>
          )}
        </>
      )}

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Resources?</AlertDialogTitle>
            <AlertDialogDescription>
              Your favourites, order, hidden items and section names go back to how they were at the start.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={reset} className="rounded-full">
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Interactive session reader */}
      <Dialog open={!!viewing} onOpenChange={(isOpen) => !isOpen && setViewing(null)}>
        <DialogContent className="flex h-[100dvh] w-screen max-w-none flex-col rounded-none border-none p-0 sm:h-auto sm:max-h-[85vh] sm:max-w-2xl sm:rounded-3xl">
          <DialogHeader className="border-b px-5 pb-4 text-left" style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Interactive session</p>
            <DialogTitle className="font-outfit text-2xl font-extrabold">{viewing}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto whitespace-pre-wrap p-5 text-lg leading-relaxed text-slate-700 dark:text-slate-300">
            {`Interactive Session: ${viewing}\n\nThis is a sample interactive session document from The Power House International Church.\n\nHere you would find the full content of the session, including scripture references, prayer points, and discussion questions.`}
          </div>
          <div className="border-t p-4" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}>
            <Button onClick={() => setViewing(null)} className="h-11 w-full rounded-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Page>
  );
};

export default ResourcesPage;
