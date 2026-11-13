import {
  Archive,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  FileText,
  Filter,
  Folder,
  FolderPlus,
  Grid2X2,
  Home,
  Library,
  List,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Settings,
  Sparkles,
  Star,
  Sun,
  Tag as TagIcon,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { collections, sampleItems, tags as tagDefinitions } from "./data";
import type { KnowledgeItem, KnowledgeType, ViewId } from "./types";

const STORE_KEY = "atlas-knowledge-items-v1";

const typeMeta: Record<
  KnowledgeType,
  { label: string; icon: typeof FileText }
> = {
  note: { label: "Note", icon: MessageSquareText },
  document: { label: "Document", icon: FileText },
  meeting: { label: "Meeting", icon: CalendarDays },
  transcript: { label: "Transcript", icon: BookOpen },
};

const primaryNavigation: {
  id: ViewId;
  label: string;
  icon: typeof Home;
}[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "all", label: "All Knowledge", icon: Library },
  { id: "notes", label: "Notes", icon: MessageSquareText },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "transcripts", label: "Transcripts", icon: BookOpen },
  { id: "favorites", label: "Favorites", icon: Star },
  { id: "recent", label: "Recently Viewed", icon: Clock3 },
];

const viewCopy: Partial<Record<ViewId, { title: string; description: string }>> = {
  all: {
    title: "All Knowledge",
    description: "Everything you have captured, collected, and connected.",
  },
  notes: {
    title: "Notes",
    description: "Working thoughts, ideas, and learnings.",
  },
  documents: {
    title: "Documents",
    description: "Longer-form reference and project documentation.",
  },
  meetings: {
    title: "Meetings",
    description: "Summaries, decisions, action items, and transcripts.",
  },
  transcripts: {
    title: "Transcripts",
    description: "Searchable records of conversations and interviews.",
  },
  favorites: {
    title: "Favorites",
    description: "Knowledge you want to keep close at hand.",
  },
  recent: {
    title: "Recently Viewed",
    description: "Continue where you left off.",
  },
};

function readStoredItems(): KnowledgeItem[] {
  try {
    const stored = localStorage.getItem(STORE_KEY);
    return stored ? JSON.parse(stored) : sampleItems;
  } catch {
    return sampleItems;
  }
}

function formatDate(date: string, includeYear = false) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" } : {}),
  }).format(new Date(date));
}

function relativeDate(date: string) {
  const days = Math.round(
    (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}

function stripHtml(html: string) {
  const element = document.createElement("div");
  element.innerHTML = html;
  return element.textContent ?? "";
}

function Tag({ children }: { children: ReactNode }) {
  const definition = tagDefinitions.find((tag) => tag.name === children);
  return (
    <span
      className={`tag tag--${definition?.color ?? "default"} tag--outline`}
    >
      {children}
    </span>
  );
}

function IconButton({
  label,
  children,
  className = "",
  pressed,
  onClick,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  pressed?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      className={`icon-button ${className}`}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function App() {
  const [items, setItems] = useState<KnowledgeItem[]>(readStoredItems);
  const [view, setView] = useState<ViewId>("home");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">(
    () =>
      (localStorage.getItem("atlas-theme") as "light" | "dark") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newType, setNewType] = useState<KnowledgeType>("note");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [typeFilter, setTypeFilter] = useState<KnowledgeType | "all">("all");
  const [sort, setSort] = useState<"updated" | "created" | "title">("updated");
  const [toast, setToast] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => {
    localStorage.setItem(STORE_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("atlas-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setNewType("note");
        setCreateOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setCreateOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function openItem(id: string) {
    setSelectedId(id);
    setRecentIds((current) => [id, ...current.filter((item) => item !== id)]);
    setSearchOpen(false);
    setDetailsOpen(true);
  }

  function updateItem(id: string, patch: Partial<KnowledgeItem>) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item,
      ),
    );
  }

  function toggleFavorite(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    updateItem(id, { isFavorite: !item.isFavorite });
    notify(item.isFavorite ? "Removed from favorites" : "Added to favorites");
  }

  function deleteItem(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (!item || !window.confirm(`Delete “${item.title}”? This cannot be undone.`))
      return;
    setItems((current) => current.filter((entry) => entry.id !== id));
    setSelectedId(null);
    notify("Knowledge item deleted");
  }

  function createItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "Untitled");
    const now = new Date().toISOString();
    const item: KnowledgeItem = {
      id: `${Date.now()}`,
      title,
      type: newType,
      summary:
        newType === "meeting"
          ? "A new meeting record ready for summary, decisions, and action items."
          : "A new knowledge item ready for your ideas.",
      content:
        newType === "meeting"
          ? "<h2>Summary</h2><p>Start writing your meeting summary…</p><h2>Decisions</h2><ul><li>Add a decision</li></ul><h2>Action items</h2><ul><li>Add an action item</li></ul>"
          : "<p>Start writing…</p>",
      collectionId: "atlas",
      tags: [],
      isFavorite: false,
      createdAt: now,
      updatedAt: now,
      participants: newType === "meeting" ? [] : undefined,
      relatedKnowledgeIds: [],
    };
    setItems((current) => [item, ...current]);
    setCreateOpen(false);
    setSelectedId(item.id);
    notify(`${typeMeta[newType].label} created`);
  }

  const visibleItems = useMemo(() => {
    let result = [...items];
    if (view === "notes") result = result.filter((item) => item.type === "note");
    if (view === "documents")
      result = result.filter((item) => item.type === "document");
    if (view === "meetings")
      result = result.filter((item) => item.type === "meeting");
    if (view === "transcripts")
      result = result.filter((item) => item.type === "transcript");
    if (view === "favorites")
      result = result.filter((item) => item.isFavorite);
    if (view === "recent") {
      result = recentIds
        .map((id) => result.find((item) => item.id === id))
        .filter(Boolean) as KnowledgeItem[];
    }
    if (view.startsWith("collection:")) {
      result = result.filter(
        (item) => item.collectionId === view.replace("collection:", ""),
      );
    }
    if (typeFilter !== "all")
      result = result.filter((item) => item.type === typeFilter);
    if (query.trim()) {
      const normalized = query.toLowerCase();
      result = result.filter((item) =>
        [item.title, item.summary, stripHtml(item.content), ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      );
    }
    return result.sort((a, b) => {
      if (sort === "title") return a.title.localeCompare(b.title);
      const key = sort === "created" ? "createdAt" : "updatedAt";
      return new Date(b[key]).getTime() - new Date(a[key]).getTime();
    });
  }, [items, view, typeFilter, query, sort, recentIds]);

  const currentCollection = view.startsWith("collection:")
    ? collections.find((item) => item.id === view.replace("collection:", ""))
    : null;

  return (
    <div className="atlas-app">
      <aside className={`sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="brand">
          <button
            className="brand__mark"
            type="button"
            onClick={() => setView("home")}
            aria-label="Go to Atlas home"
          >
            <span>✣</span>
          </button>
          {!sidebarCollapsed && (
            <div className="brand__text">
              <span className="text-body-large-strong">Atlas</span>
              <span className="text-body-small">Personal library</span>
            </div>
          )}
          <IconButton
            label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="sidebar__collapse"
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
          </IconButton>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          <div className="nav-list">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-item ${view === item.id ? "is-active" : ""}`}
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setView(item.id);
                    setSelectedId(null);
                  }}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className="icon" />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </div>

          {!sidebarCollapsed && (
            <div className="nav-section">
              <div className="nav-section__header">
                <span className="text-body-small-strong">Collections</span>
                <IconButton
                  label="Create collection"
                  onClick={() => notify("Collection creation is ready for setup")}
                >
                  <FolderPlus />
                </IconButton>
              </div>
              <div className="nav-list">
                {collections
                  .filter((collection) => !collection.parentId)
                  .map((collection) => (
                    <div key={collection.id}>
                      <button
                        className={`nav-item ${
                          view === `collection:${collection.id}`
                            ? "is-active"
                            : ""
                        }`}
                        type="button"
                        onClick={() => {
                          setView(`collection:${collection.id}`);
                          setSelectedId(null);
                        }}
                      >
                        <Folder className="icon" />
                        <span>{collection.name}</span>
                        <span className="nav-item__count">
                          {
                            items.filter(
                              (entry) =>
                                entry.collectionId === collection.id ||
                                collections.find(
                                  (child) =>
                                    child.id === entry.collectionId &&
                                    child.parentId === collection.id,
                                ),
                            ).length
                          }
                        </span>
                      </button>
                      {collections
                        .filter((child) => child.parentId === collection.id)
                        .map((child) => (
                          <button
                            className={`nav-item nav-item--nested ${
                              view === `collection:${child.id}`
                                ? "is-active"
                                : ""
                            }`}
                            type="button"
                            key={child.id}
                            onClick={() => {
                              setView(`collection:${child.id}`);
                              setSelectedId(null);
                            }}
                          >
                            <ChevronRight className="icon" />
                            <span>{child.name}</span>
                          </button>
                        ))}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </nav>

        <div className="sidebar__bottom">
          <button className="nav-item" type="button">
            <Settings className="icon" />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <div className="theme-row">
            {!sidebarCollapsed && (
              <span className="text-body-medium">Dark theme</span>
            )}
            {sidebarCollapsed ? (
              <IconButton
                label="Toggle theme"
                onClick={() =>
                  setTheme((value) => (value === "light" ? "dark" : "light"))
                }
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </IconButton>
            ) : (
              <button
                className="switch"
                type="button"
                role="switch"
                aria-label="Dark theme"
                aria-checked={theme === "dark"}
                onClick={() =>
                  setTheme((value) => (value === "light" ? "dark" : "light"))
                }
              >
                <span className="switch__knob" />
              </button>
            )}
          </div>
          <button className="profile" type="button">
            <span className="profile__avatar">AW</span>
            {!sidebarCollapsed && (
              <span className="profile__copy">
                <span className="text-body-medium-strong">Adam Weber</span>
                <span className="text-body-small">Personal workspace</span>
              </span>
            )}
            {!sidebarCollapsed && <MoreHorizontal className="icon" />}
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <button
            className="search-trigger"
            type="button"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="icon" />
            <span>Search your knowledge…</span>
            <kbd>
              <Command /> K
            </kbd>
          </button>
          <div className="topbar__actions">
            <button
              className="button button--primary"
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="icon" />
              New
              <ChevronDown className="icon" />
            </button>
            <IconButton
              label={detailsOpen ? "Hide details" : "Show details"}
              pressed={detailsOpen}
              onClick={() => setDetailsOpen((value) => !value)}
            >
              {detailsOpen ? <PanelRightClose /> : <PanelRightOpen />}
            </IconButton>
          </div>
        </header>

        <div className="workspace__body">
          <section className="content-panel">
            {selectedItem ? (
              <DetailView
                item={selectedItem}
                onBack={() => setSelectedId(null)}
                onUpdate={(patch) => updateItem(selectedItem.id, patch)}
                onFavorite={() => toggleFavorite(selectedItem.id)}
                onDelete={() => deleteItem(selectedItem.id)}
              />
            ) : view === "home" ? (
              <HomeView
                items={items}
                onOpen={openItem}
                onSearch={() => setSearchOpen(true)}
                onCreate={() => setCreateOpen(true)}
                onCollection={(id) => setView(`collection:${id}`)}
              />
            ) : (
              <LibraryView
                title={currentCollection?.name ?? viewCopy[view]?.title ?? ""}
                description={
                  currentCollection?.description ??
                  viewCopy[view]?.description ??
                  ""
                }
                items={visibleItems}
                query={query}
                setQuery={setQuery}
                typeFilter={typeFilter}
                setTypeFilter={setTypeFilter}
                sort={sort}
                setSort={setSort}
                viewMode={viewMode}
                setViewMode={setViewMode}
                onOpen={openItem}
                onFavorite={toggleFavorite}
                onCreate={() => setCreateOpen(true)}
              />
            )}
          </section>

          {detailsOpen && selectedItem && (
            <ContextPanel
              item={selectedItem}
              items={items}
              onClose={() => setDetailsOpen(false)}
              onOpen={openItem}
            />
          )}
        </div>
      </main>

      {searchOpen && (
        <SearchDialog
          query={query}
          setQuery={setQuery}
          items={items}
          onClose={() => setSearchOpen(false)}
          onOpen={openItem}
        />
      )}
      {createOpen && (
        <CreateDialog
          type={newType}
          setType={setNewType}
          onClose={() => setCreateOpen(false)}
          onSubmit={createItem}
        />
      )}
      {toast && (
        <div className="toast text-body-medium-strong" role="status">
          <Check className="icon" />
          {toast}
        </div>
      )}
    </div>
  );
}

function HomeView({
  items,
  onOpen,
  onSearch,
  onCreate,
  onCollection,
}: {
  items: KnowledgeItem[];
  onOpen: (id: string) => void;
  onSearch: () => void;
  onCreate: () => void;
  onCollection: (id: string) => void;
}) {
  const recent = [...items]
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, 4);
  const favorites = items.filter((item) => item.isFavorite).slice(0, 3);
  return (
    <div className="page home-page">
      <header className="home-hero">
        <p className="eyebrow text-body-medium-strong">
          Friday, November 13
        </p>
        <h1 className="text-heading-display">Good afternoon, Adam.</h1>
        <p className="home-hero__description text-body-large">
          What would you like to remember?
        </p>
        <button className="hero-search" type="button" onClick={onSearch}>
          <Search className="icon" />
          <span>Search notes, documents, meetings, and transcripts</span>
          <kbd>
            <Command /> K
          </kbd>
        </button>
        <button className="quick-capture" type="button" onClick={onCreate}>
          <Plus className="icon" />
          <span>
            <strong>Quick capture</strong>
            <small>Start with a thought. Organize it later.</small>
          </span>
          <ChevronRight className="icon" />
        </button>
      </header>

      <HomeSection
        title="Recently opened"
        action="View all"
        onAction={() => undefined}
      >
        <div className="recent-grid">
          {recent.map((item) => (
            <KnowledgeCard item={item} key={item.id} onOpen={onOpen} />
          ))}
        </div>
      </HomeSection>

      <div className="home-columns">
        <HomeSection title="Pinned">
          <div className="compact-list">
            {favorites.map((item) => (
              <CompactItem item={item} key={item.id} onOpen={onOpen} />
            ))}
          </div>
        </HomeSection>
        <HomeSection title="Collections" action="Manage">
          <div className="collection-list">
            {collections
              .filter((collection) => !collection.parentId)
              .slice(0, 4)
              .map((collection) => (
                <button
                  className="collection-row"
                  key={collection.id}
                  type="button"
                  onClick={() => onCollection(collection.id)}
                >
                  <span className="collection-row__icon">
                    <Folder className="icon" />
                  </span>
                  <span>
                    <strong>{collection.name}</strong>
                    <small>
                      {
                        items.filter(
                          (item) => item.collectionId === collection.id,
                        ).length
                      }{" "}
                      items
                    </small>
                  </span>
                  <ChevronRight className="icon" />
                </button>
              ))}
          </div>
        </HomeSection>
      </div>
    </div>
  );
}

function HomeSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="home-section">
      <div className="section-heading">
        <h2 className="text-heading-medium">{title}</h2>
        {action && (
          <button
            className="button button--tertiary"
            type="button"
            onClick={onAction}
          >
            {action}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function KnowledgeCard({
  item,
  onOpen,
}: {
  item: KnowledgeItem;
  onOpen: (id: string) => void;
}) {
  const Icon = typeMeta[item.type].icon;
  return (
    <button
      className="knowledge-card"
      type="button"
      onClick={() => onOpen(item.id)}
    >
      <span className="knowledge-card__meta text-body-small">
        <Icon className="icon" />
        {typeMeta[item.type].label}
      </span>
      <strong className="text-heading-small">{item.title}</strong>
      <span className="knowledge-card__summary text-body-medium">
        {item.summary}
      </span>
      <span className="knowledge-card__footer text-body-small">
        Updated {relativeDate(item.updatedAt)}
      </span>
    </button>
  );
}

function CompactItem({
  item,
  onOpen,
}: {
  item: KnowledgeItem;
  onOpen: (id: string) => void;
}) {
  const Icon = typeMeta[item.type].icon;
  return (
    <button
      className="compact-item"
      type="button"
      onClick={() => onOpen(item.id)}
    >
      <span className="compact-item__icon">
        <Icon className="icon" />
      </span>
      <span>
        <strong>{item.title}</strong>
        <small>{typeMeta[item.type].label}</small>
      </span>
      <Star className="icon is-filled" />
    </button>
  );
}

function LibraryView({
  title,
  description,
  items,
  query,
  setQuery,
  typeFilter,
  setTypeFilter,
  sort,
  setSort,
  viewMode,
  setViewMode,
  onOpen,
  onFavorite,
  onCreate,
}: {
  title: string;
  description: string;
  items: KnowledgeItem[];
  query: string;
  setQuery: (value: string) => void;
  typeFilter: KnowledgeType | "all";
  setTypeFilter: (value: KnowledgeType | "all") => void;
  sort: "updated" | "created" | "title";
  setSort: (value: "updated" | "created" | "title") => void;
  viewMode: "list" | "grid";
  setViewMode: (value: "list" | "grid") => void;
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="page library-page">
      <div className="breadcrumb text-body-medium">
        <span>Atlas</span>
        <ChevronRight className="icon" />
        <span>{title}</span>
      </div>
      <header className="page-header">
        <div>
          <h1 className="text-heading-large">{title}</h1>
          <p className="text-body-large">{description}</p>
        </div>
        <button
          className="button button--primary"
          type="button"
          onClick={onCreate}
        >
          <Plus className="icon" />
          New
        </button>
      </header>

      <div className="library-toolbar">
        <label className="inline-search">
          <Search className="icon" />
          <input
            className="text-body-medium"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search this view"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <X className="icon" />
            </button>
          )}
        </label>
        <div className="toolbar-group">
          <Filter className="icon toolbar-label" />
          <div className="dropdown">
            <select
              className="dropdown__select"
              aria-label="Filter by content type"
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as KnowledgeType | "all")
              }
            >
              <option value="all">All types</option>
              <option value="note">Notes</option>
              <option value="document">Documents</option>
              <option value="meeting">Meetings</option>
              <option value="transcript">Transcripts</option>
            </select>
            <ChevronDown className="icon dropdown__chevron" />
          </div>
          <div className="dropdown">
            <select
              className="dropdown__select"
              aria-label="Sort items"
              value={sort}
              onChange={(event) =>
                setSort(event.target.value as "updated" | "created" | "title")
              }
            >
              <option value="updated">Last updated</option>
              <option value="created">Date created</option>
              <option value="title">Title</option>
            </select>
            <ChevronDown className="icon dropdown__chevron" />
          </div>
          <div className="view-toggle" aria-label="View options">
            <IconButton
              label="List view"
              pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <List />
            </IconButton>
            <IconButton
              label="Grid view"
              pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <Grid2X2 />
            </IconButton>
          </div>
        </div>
      </div>

      <div className="results-meta text-body-medium">
        <span>{items.length} items</span>
        <span>Updated across your workspace</span>
      </div>

      {items.length ? (
        <div className={`knowledge-list knowledge-list--${viewMode}`}>
          {items.map((item) => (
            <KnowledgeRow
              item={item}
              key={item.id}
              mode={viewMode}
              onOpen={onOpen}
              onFavorite={onFavorite}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Archive className="icon" />
          <h2 className="text-heading-medium">Nothing found</h2>
          <p className="text-body-large">
            Try changing your search or filters, or create something new.
          </p>
          <button
            className="button button--primary"
            type="button"
            onClick={onCreate}
          >
            <Plus className="icon" /> Create knowledge
          </button>
        </div>
      )}
    </div>
  );
}

function KnowledgeRow({
  item,
  mode,
  onOpen,
  onFavorite,
}: {
  item: KnowledgeItem;
  mode: "list" | "grid";
  onOpen: (id: string) => void;
  onFavorite: (id: string) => void;
}) {
  const Icon = typeMeta[item.type].icon;
  return (
    <article className="knowledge-row">
      <button
        className="knowledge-row__main"
        type="button"
        onClick={() => onOpen(item.id)}
      >
        <span className="knowledge-row__icon">
          <Icon className="icon" />
        </span>
        <span className="knowledge-row__content">
          <span className="knowledge-row__title text-body-large-strong">
            {item.title}
          </span>
          <span className="knowledge-row__preview text-body-medium">
            {item.summary}
          </span>
          <span className="knowledge-row__tags">
            {item.tags.slice(0, mode === "grid" ? 2 : 3).map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </span>
        </span>
        <span className="knowledge-row__type text-body-medium">
          {typeMeta[item.type].label}
        </span>
        <span className="knowledge-row__date text-body-medium">
          {relativeDate(item.updatedAt)}
        </span>
      </button>
      <IconButton
        label={item.isFavorite ? "Remove from favorites" : "Add to favorites"}
        pressed={item.isFavorite}
        onClick={() => onFavorite(item.id)}
      >
        <Star className={item.isFavorite ? "is-filled" : ""} />
      </IconButton>
    </article>
  );
}

function DetailView({
  item,
  onBack,
  onUpdate,
  onFavorite,
  onDelete,
}: {
  item: KnowledgeItem;
  onBack: () => void;
  onUpdate: (patch: Partial<KnowledgeItem>) => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const [saveState, setSaveState] = useState<"saved" | "saving">("saved");
  const saveTimer = useRef<number | undefined>(undefined);

  function autosave(patch: Partial<KnowledgeItem>) {
    setSaveState("saving");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      onUpdate(patch);
      setSaveState("saved");
    }, 600);
  }

  return (
    <div className="detail-view">
      <header className="detail-header">
        <div className="breadcrumb text-body-medium">
          <button type="button" onClick={onBack}>
            All Knowledge
          </button>
          <ChevronRight className="icon" />
          <span>{typeMeta[item.type].label}</span>
        </div>
        <div className="detail-actions">
          <span className="save-state text-body-small">
            {saveState === "saving" ? "Saving…" : "Saved"}
          </span>
          <IconButton
            label={item.isFavorite ? "Remove favorite" : "Add favorite"}
            pressed={item.isFavorite}
            onClick={onFavorite}
          >
            <Star className={item.isFavorite ? "is-filled" : ""} />
          </IconButton>
          <IconButton label="Delete item" onClick={onDelete}>
            <Trash2 />
          </IconButton>
          <IconButton label="More actions">
            <MoreHorizontal />
          </IconButton>
        </div>
      </header>
      <article className="editor">
        <div className="editor__meta">
          <span className="tag tag--default">
            {typeMeta[item.type].label}
          </span>
          <span className="text-body-medium">
            Updated {relativeDate(item.updatedAt)}
          </span>
        </div>
        <input
          className="editor__title text-heading-display"
          value={item.title}
          aria-label="Knowledge item title"
          onChange={(event) => autosave({ title: event.target.value })}
        />
        <div className="editor-toolbar" aria-label="Text formatting">
          <button type="button" title="Heading">
            H
          </button>
          <button type="button" title="Bold">
            <strong>B</strong>
          </button>
          <button type="button" title="Italic">
            <em>I</em>
          </button>
          <button type="button" title="Bulleted list">
            <List className="icon" />
          </button>
          <span />
          <button type="button" title="Add link">
            ⌘K
          </button>
        </div>
        <div
          className="editor__content"
          contentEditable
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{ __html: item.content }}
          onInput={(event) =>
            autosave({ content: event.currentTarget.innerHTML })
          }
        />
      </article>
    </div>
  );
}

function ContextPanel({
  item,
  items,
  onClose,
  onOpen,
}: {
  item: KnowledgeItem;
  items: KnowledgeItem[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const collection = collections.find(
    (entry) => entry.id === item.collectionId,
  );
  const related = (item.relatedKnowledgeIds ?? [])
    .map((id) => items.find((entry) => entry.id === id))
    .filter(Boolean) as KnowledgeItem[];
  return (
    <aside className="context-panel">
      <div className="context-panel__header">
        <h2 className="text-heading-small">Details</h2>
        <IconButton label="Close details" onClick={onClose}>
          <X />
        </IconButton>
      </div>
      <dl className="metadata">
        <div>
          <dt>
            <FileText className="icon" /> Type
          </dt>
          <dd>{typeMeta[item.type].label}</dd>
        </div>
        <div>
          <dt>
            <Folder className="icon" /> Collection
          </dt>
          <dd>{collection?.name ?? "Unfiled"}</dd>
        </div>
        <div>
          <dt>
            <CalendarDays className="icon" /> Created
          </dt>
          <dd>{formatDate(item.createdAt, true)}</dd>
        </div>
        <div>
          <dt>
            <Clock3 className="icon" /> Modified
          </dt>
          <dd>{formatDate(item.updatedAt, true)}</dd>
        </div>
      </dl>
      <section className="context-section">
        <div className="context-section__heading">
          <h3 className="text-body-medium-strong">Tags</h3>
          <IconButton label="Manage tags">
            <Plus />
          </IconButton>
        </div>
        <div className="tag-list">
          {item.tags.length ? (
            item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
          ) : (
            <span className="text-body-medium muted">No tags</span>
          )}
        </div>
      </section>
      {item.participants?.length ? (
        <section className="context-section">
          <h3 className="text-body-medium-strong">Participants</h3>
          <div className="participant-list">
            {item.participants.map((person) => (
              <span key={person}>
                <span className="profile__avatar">
                  {person
                    .split(" ")
                    .map((word) => word[0])
                    .join("")}
                </span>
                {person}
              </span>
            ))}
          </div>
        </section>
      ) : null}
      <section className="context-section">
        <div className="context-section__heading">
          <h3 className="text-body-medium-strong">Related knowledge</h3>
          <IconButton label="Link knowledge">
            <Plus />
          </IconButton>
        </div>
        <div className="related-list">
          {related.length ? (
            related.map((relatedItem) => {
              const Icon = typeMeta[relatedItem.type].icon;
              return (
                <button
                  type="button"
                  key={relatedItem.id}
                  onClick={() => onOpen(relatedItem.id)}
                >
                  <Icon className="icon" />
                  <span>{relatedItem.title}</span>
                  <ChevronRight className="icon" />
                </button>
              );
            })
          ) : (
            <p className="text-body-medium muted">
              No related knowledge linked yet.
            </p>
          )}
        </div>
      </section>
      <div className="prototype-note">
        <Sparkles className="icon" />
        <p className="text-body-small">
          Prototype data is saved locally in this browser.
        </p>
      </div>
    </aside>
  );
}

function SearchDialog({
  query,
  setQuery,
  items,
  onClose,
  onOpen,
}: {
  query: string;
  setQuery: (value: string) => void;
  items: KnowledgeItem[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  const normalized = query.toLowerCase().trim();
  const matches = normalized
    ? items.filter((item) =>
        [item.title, item.summary, stripHtml(item.content), ...item.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalized),
      )
    : items.slice(0, 6);
  const grouped = Object.entries(
    matches.reduce<Record<string, KnowledgeItem[]>>((result, item) => {
      (result[item.type] ??= []).push(item);
      return result;
    }, {}),
  );
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Search Atlas"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="search-dialog__input">
          <Search className="icon" />
          <input
            ref={input}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search everything in Atlas"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="search-dialog__body">
          {!query && (
            <p className="search-hint text-body-small-strong">
              RECENT KNOWLEDGE
            </p>
          )}
          {grouped.length ? (
            grouped.map(([type, entries]) => (
              <div className="search-group" key={type}>
                {query && (
                  <p className="text-body-small-strong">
                    {typeMeta[type as KnowledgeType].label}s
                  </p>
                )}
                {entries.map((item) => {
                  const Icon = typeMeta[item.type].icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onOpen(item.id)}
                    >
                      <span className="search-result__icon">
                        <Icon className="icon" />
                      </span>
                      <span>
                        <strong>{item.title}</strong>
                        <small>{item.summary}</small>
                      </span>
                      <span className="search-result__type">
                        {typeMeta[item.type].label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="empty-state empty-state--compact">
              <Search className="icon" />
              <h2 className="text-heading-small">No matching knowledge</h2>
              <p className="text-body-medium">
                Try another word, title, or tag.
              </p>
            </div>
          )}
        </div>
        <footer className="search-dialog__footer text-body-small">
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
          <span>Searches titles, content, summaries, and tags</span>
        </footer>
      </section>
    </div>
  );
}

function CreateDialog({
  type,
  setType,
  onClose,
  onSubmit,
}: {
  type: KnowledgeType;
  setType: (type: KnowledgeType) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="create-dialog"
        onSubmit={onSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow text-body-small-strong">QUICK CAPTURE</p>
            <h2 className="text-heading-large">Create knowledge</h2>
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X />
          </IconButton>
        </header>
        <div className="creation-types">
          {(Object.keys(typeMeta) as KnowledgeType[]).map((entry) => {
            const Icon = typeMeta[entry].icon;
            return (
              <button
                type="button"
                className={type === entry ? "is-active" : ""}
                key={entry}
                onClick={() => setType(entry)}
              >
                <Icon className="icon" />
                <span>
                  <strong>{typeMeta[entry].label}</strong>
                  <small>
                    {entry === "note" && "Capture a thought"}
                    {entry === "document" && "Write a reference"}
                    {entry === "meeting" && "Record decisions"}
                    {entry === "transcript" && "Import a conversation"}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <label className="form-field">
          <span className="text-body-medium-strong">Title</span>
          <input
            ref={input}
            name="title"
            className="text-body-large"
            placeholder={`Untitled ${typeMeta[type].label.toLowerCase()}`}
          />
        </label>
        <p className="text-body-medium muted">
          You can start immediately and organize this later.
        </p>
        <footer>
          <button
            className="button button--secondary"
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button button--primary" type="submit">
            Create {typeMeta[type].label.toLowerCase()}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default App;
