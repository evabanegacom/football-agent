import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Sheet ID from your URL
const SHEET_ID = "1oL5h6B4QgLTSNJDFJ3A3sr3lwAlQZx4ffrlkZ8Lcnf8";
// Tab name — update if your sheet tab is named differently
const SHEET_TAB = "Registrations";
// Public JSON endpoint (no API key needed if sheet is shared publicly)
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(SHEET_TAB)}`;
// ─────────────────────────────────────────────────────────────────────────────

interface Prospect {
  id: string;
  timestamp: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  dob: string;
  age: number;
  height: string;
  gender: string;
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  currentCountry: string;
  currentState: string;
  houseAddress: string;
  position: string;
  duration: string;
  hasContract: string;
  contractDetails: string;
  photoUrl: string;
  videoLink: string;
}

type SortKey = "fullName" | "age" | "position" | "nationality" | "timestamp";
type ViewMode = "grid" | "list";

const POSITION_COLORS: Record<string, string> = {
  "Goalkeeper":             "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Right Back":             "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Left Back":              "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Centre Back":            "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "Defensive Midfielder":   "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Central Midfielder":     "bg-violet-500/20 text-violet-300 border-violet-500/30",
  "Attacking Midfielder":   "bg-orange-500/20 text-orange-300 border-orange-500/30",
  "Right Winger":           "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Left Winger":            "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Striker / Centre Forward": "bg-red-500/20 text-red-300 border-red-500/30",
};

const POSITION_SHORT: Record<string, string> = {
  "Goalkeeper": "GK", "Right Back": "RB", "Left Back": "LB",
  "Centre Back": "CB", "Defensive Midfielder": "DM", "Central Midfielder": "CM",
  "Attacking Midfielder": "AM", "Right Winger": "RW", "Left Winger": "LW",
  "Striker / Centre Forward": "ST",
};

function calcAge(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

function parseSheetData(raw: string): Prospect[] {
  // Google's gviz JSON wraps in google.visualization.Query.setResponse(...)
  const json = JSON.parse(raw.replace(/^[^(]+\(/, "").replace(/\);?$/, ""));
  const rows = json.table?.rows ?? [];

  return rows
    .filter((r: any) => r.c?.[1]?.v) // must have first name
    .map((r: any, i: number) => {
      const c = (idx: number) => r.c?.[idx]?.v ?? "";
      const firstName  = String(c(1));
      const middleName = String(c(2));
      const lastName   = String(c(3));
      const dob        = String(c(4));
      return {
        id:             String(i),
        timestamp:      String(c(0)),
        firstName,
        middleName,
        lastName,
        fullName:       [firstName, middleName, lastName].filter(Boolean).join(" "),
        dob,
        age:            calcAge(dob),
        height:         String(c(5)),
        gender:         String(c(6)),
        nationality:    String(c(7)),
        stateOfOrigin:  String(c(8)),
        lga:            String(c(9)),
        phone:          String(c(10)),
        email:          String(c(11)),
        parentName:     String(c(12)),
        parentPhone:    String(c(13)),
        currentCountry: String(c(14)),
        currentState:   String(c(15)),
        houseAddress:   String(c(16)),
        position:       String(c(17)),
        duration:       String(c(18)),
        hasContract:    String(c(19)),
        contractDetails:String(c(20)),
        photoUrl:       String(c(21)),
        videoLink:      String(c(22)),
      } as Prospect;
    });
}

// ─── AVATAR ──────────────────────────────────────────────────────────────────
const Avatar = ({ prospect, size = "md" }: { prospect: Prospect; size?: "sm" | "md" | "lg" }) => {
  const [imgErr, setImgErr] = useState(false);
  const dim = size === "lg" ? "w-24 h-24" : size === "md" ? "w-14 h-14" : "w-10 h-10";
  const txt = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sm";
  const initials = [prospect.firstName[0], prospect.lastName[0]].filter(Boolean).join("").toUpperCase();
  const posColor = POSITION_COLORS[prospect.position] ?? "bg-emerald-500/20 text-emerald-300";

  if (prospect.photoUrl && !imgErr) {
    return (
      <img
        src={prospect.photoUrl}
        alt={prospect.fullName}
        onError={() => setImgErr(true)}
        className={`${dim} rounded-2xl object-cover flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${dim} rounded-2xl flex items-center justify-center flex-shrink-0 font-black ${txt} ${posColor} border`}>
      {initials || "?"}
    </div>
  );
};

// ─── POSITION BADGE ──────────────────────────────────────────────────────────
const PositionBadge = ({ position }: { position: string }) => {
  const cls = POSITION_COLORS[position] ?? "bg-white/10 text-white/60 border-white/20";
  const short = POSITION_SHORT[position] ?? position.slice(0, 2).toUpperCase();
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${cls}`}>
      {short} <span className="hidden sm:inline font-normal opacity-80">· {position}</span>
    </span>
  );
};

// ─── PROSPECT MODAL ──────────────────────────────────────────────────────────
const ProspectModal = ({ prospect, onClose }: { prospect: Prospect; onClose: () => void }) => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const Field = ({ label, value }: { label: string; value: string }) =>
    value && value !== "undefined" ? (
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">{label}</p>
        <p className="text-white/80 text-sm">{value}</p>
      </div>
    ) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,13,24,0.92)", backdropFilter: "blur(12px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl"
        style={{ background: "rgba(4,30,48,0.98)" }}
      >
        {/* Header */}
        <div className="relative h-36 rounded-t-3xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, #1a4731 0%, #041e30 100%)" }}>
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 20px,#22c55e 20px,#22c55e 21px)" }} />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 transition-all">
            ✕
          </button>
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
            <Avatar prospect={prospect} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="text-emerald-400 text-xs font-semibold tracking-widest uppercase mb-1">
                #{String(Number(prospect.id) + 1).padStart(3, "0")} · Registered {prospect.timestamp ? new Date(prospect.timestamp).toLocaleDateString() : "—"}
              </p>
              <h2 className="text-white font-black text-2xl leading-tight truncate">{prospect.fullName}</h2>
              <div className="mt-1"><PositionBadge position={prospect.position} /></div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Age", value: prospect.age ? `${prospect.age} yrs` : "—" },
              { label: "Height", value: prospect.height ? `${prospect.height} cm` : "—" },
              { label: "Experience", value: prospect.duration || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-2xl border border-white/10 p-3 text-center"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-white font-bold text-lg">{value}</p>
                <p className="text-white/30 text-[10px] uppercase tracking-widest mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          {/* Personal */}
          <div>
            <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold mb-3 border-b border-white/10 pb-2">
              Personal
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Date of Birth" value={prospect.dob} />
              <Field label="Gender" value={prospect.gender} />
              <Field label="Nationality" value={prospect.nationality} />
              <Field label="State of Origin" value={prospect.stateOfOrigin} />
              <Field label="LGA" value={prospect.lga} />
              <Field label="Under Contract" value={prospect.hasContract} />
              {prospect.hasContract === "Yes" && (
                <Field label="Contract Details" value={prospect.contractDetails} />
              )}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold mb-3 border-b border-white/10 pb-2">
              Contact
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Phone" value={prospect.phone} />
              <Field label="Email" value={prospect.email} />
              <Field label="Current Location" value={[prospect.currentState, prospect.currentCountry].filter(Boolean).join(", ")} />
              <Field label="Address" value={prospect.houseAddress} />
            </div>
          </div>

          {/* Guardian */}
          <div>
            <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold mb-3 border-b border-white/10 pb-2">
              Parent / Guardian
            </p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <Field label="Name" value={prospect.parentName} />
              <Field label="Phone" value={prospect.parentPhone} />
            </div>
          </div>

          {/* Media */}
          {(prospect.photoUrl || prospect.videoLink) && (
            <div>
              <p className="text-emerald-400 text-[10px] uppercase tracking-widest font-semibold mb-3 border-b border-white/10 pb-2">
                Media
              </p>
              <div className="flex gap-3 flex-wrap">
                {prospect.photoUrl && (
                  <a href={prospect.photoUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10
                      text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 transition-all">
                    📸 View Photo
                  </a>
                )}
                {prospect.videoLink && prospect.videoLink !== "undefined" && (
                  <a href={prospect.videoLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-blue-500/30 bg-blue-500/10
                      text-blue-300 text-sm font-semibold hover:bg-blue-500/20 transition-all">
                    🎥 Watch Video
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── PROSPECT CARD (grid) ────────────────────────────────────────────────────
const ProspectCard = ({ prospect, onClick }: { prospect: Prospect; onClick: () => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    whileHover={{ y: -4 }}
    onClick={onClick}
    className="rounded-2xl border border-white/[0.08] cursor-pointer overflow-hidden group transition-all
      hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-500/10"
    style={{ background: "rgba(4,30,48,0.95)" }}
  >
    {/* Photo strip */}
    <div className="relative h-40 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0d2818 0%, #071624 100%)" }}>
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: "repeating-linear-gradient(45deg,transparent,transparent 8px,#22c55e 8px,#22c55e 9px)" }} />
      {prospect.photoUrl ? (
        <img src={prospect.photoUrl} alt={prospect.fullName}
          className="w-full h-full object-cover object-top opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 rounded-2xl border-2 border-white/20 flex items-center justify-center
            text-3xl font-black text-white/30">
            {[prospect.firstName[0], prospect.lastName[0]].filter(Boolean).join("")}
          </div>
        </div>
      )}
      {/* Position badge overlay */}
      <div className="absolute top-3 left-3">
        <span className={`px-2 py-1 rounded-lg border text-[10px] font-black tracking-wider backdrop-blur-sm
          ${POSITION_COLORS[prospect.position] ?? "bg-white/10 text-white/60 border-white/20"}`}>
          {POSITION_SHORT[prospect.position] ?? "—"}
        </span>
      </div>
      {/* Contract indicator */}
      {prospect.hasContract === "Yes" && (
        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400" title="Under contract" />
      )}
    </div>

    {/* Info */}
    <div className="p-4">
      <h3 className="font-bold text-white text-sm leading-tight truncate">{prospect.fullName}</h3>
      <p className="text-white/40 text-xs mt-0.5 truncate">{prospect.position || "Position TBC"}</p>
      <div className="flex items-center gap-3 mt-3">
        {prospect.age > 0 && (
          <div className="text-center">
            <p className="text-white font-bold text-sm">{prospect.age}</p>
            <p className="text-white/30 text-[9px] uppercase tracking-wider">Age</p>
          </div>
        )}
        {prospect.height && (
          <div className="text-center">
            <p className="text-white font-bold text-sm">{prospect.height}</p>
            <p className="text-white/30 text-[9px] uppercase tracking-wider">cm</p>
          </div>
        )}
        {prospect.nationality && (
          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-xs truncate">{prospect.nationality}</p>
            <p className="text-white/30 text-[9px] uppercase tracking-wider">Nation</p>
          </div>
        )}
      </div>
      {prospect.videoLink && prospect.videoLink !== "undefined" && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <span className="text-blue-400 text-[10px] font-semibold">🎥 Video available</span>
        </div>
      )}
    </div>
  </motion.div>
);

// ─── PROSPECT ROW (list) ─────────────────────────────────────────────────────
const ProspectRow = ({ prospect, onClick }: { prospect: Prospect; onClick: () => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: -8 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0 }}
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-2xl border border-white/[0.06] cursor-pointer
      hover:border-emerald-500/30 hover:bg-white/[0.03] transition-all group"
  >
    <Avatar prospect={prospect} size="sm" />
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-white text-sm truncate">{prospect.fullName}</p>
      <p className="text-white/40 text-xs truncate">{prospect.nationality} · {prospect.currentState || prospect.currentCountry}</p>
    </div>
    <PositionBadge position={prospect.position} />
    <div className="hidden sm:flex items-center gap-6 text-right">
      {prospect.age > 0 && (
        <div>
          <p className="text-white text-sm font-semibold">{prospect.age}</p>
          <p className="text-white/30 text-[9px] uppercase">Age</p>
        </div>
      )}
      <div>
        <p className="text-white text-sm font-semibold">{prospect.duration || "—"}</p>
        <p className="text-white/30 text-[9px] uppercase">Experience</p>
      </div>
    </div>
    <span className="text-white/20 group-hover:text-emerald-400 transition-all text-xs">→</span>
  </motion.div>
);

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function ProspectsDashboard() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterNationality, setFilterNationality] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterContract, setFilterContract] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("timestamp");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    fetch(SHEET_URL)
      .then((r) => r.text())
      .then((raw) => {
        setProspects(parseSheetData(raw));
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load prospects. Make sure the sheet is shared publicly (Anyone with the link → Viewer).");
        setLoading(false);
      });
  }, []);

  const positions    = useMemo(() => [...new Set(prospects.map((p) => p.position).filter(Boolean))].sort(), [prospects]);
  const nationalities = useMemo(() => [...new Set(prospects.map((p) => p.nationality).filter(Boolean))].sort(), [prospects]);

  const filtered = useMemo(() => {
    let list = [...prospects];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q) ||
        p.nationality.toLowerCase().includes(q) ||
        p.currentState.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
      );
    }
    if (filterPosition)    list = list.filter((p) => p.position === filterPosition);
    if (filterNationality) list = list.filter((p) => p.nationality === filterNationality);
    if (filterGender)      list = list.filter((p) => p.gender === filterGender);
    if (filterContract)    list = list.filter((p) => p.hasContract === filterContract);

    list.sort((a, b) => {
      if (sortBy === "age")       return a.age - b.age;
      if (sortBy === "fullName")  return a.fullName.localeCompare(b.fullName);
      if (sortBy === "position")  return a.position.localeCompare(b.position);
      if (sortBy === "nationality") return a.nationality.localeCompare(b.nationality);
      return 0; // timestamp: keep insertion order
    });
    return list;
  }, [prospects, search, filterPosition, filterNationality, filterGender, filterContract, sortBy]);

  const stats = useMemo(() => ({
    total: prospects.length,
    withVideo: prospects.filter((p) => p.videoLink && p.videoLink !== "undefined").length,
    contracted: prospects.filter((p) => p.hasContract === "Yes").length,
    avgAge: prospects.length
      ? Math.round(prospects.reduce((s, p) => s + p.age, 0) / prospects.filter(p => p.age > 0).length)
      : 0,
  }), [prospects]);

  const SelectFilter = ({ value, onChange, children }: {
    value: string; onChange: (v: string) => void; children: React.ReactNode
  }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{ background: "#071624" }}
      className="px-3 py-2 rounded-xl border border-white/15 text-white/70 text-xs
        focus:outline-none focus:border-emerald-400 transition-all appearance-none cursor-pointer">
      {children}
    </select>
  );

  return (
    <div className="min-h-screen text-white"
      style={{ background: "linear-gradient(150deg, #020d18 0%, #041e30 55%, #061a0e 100%)" }}>

      {/* Pitch lines */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 58px,#22c55e 58px,#22c55e 60px)" }} />

      {/* ── Header ── */}
      <div className="relative border-b border-white/[0.06]" style={{ background: "rgba(4,30,48,0.8)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-emerald-400 uppercase tracking-[0.3em] text-[10px] font-semibold mb-1">
                Scouting Portal
              </p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                PROSPECTS <span style={{ color: "#4ade80" }}>DATABASE</span>
              </h1>
            </div>
            {/* Stat pills */}
            {!loading && (
              <div className="hidden sm:flex items-center gap-3 flex-wrap justify-end">
                {[
                  { label: "Total", value: stats.total },
                  { label: "Avg Age", value: stats.avgAge || "—" },
                  { label: "With Video", value: stats.withVideo },
                  { label: "Contracted", value: stats.contracted },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center px-4 py-2 rounded-xl border border-white/10"
                    style={{ background: "rgba(255,255,255,0.04)" }}>
                    <p className="text-white font-bold text-lg leading-none">{value}</p>
                    <p className="text-white/30 text-[9px] uppercase tracking-wider mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Search + Filters ── */}
        <div className="mb-6 space-y-3">
          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by name, position, nationality, location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/15 text-white text-sm
                placeholder-white/25 focus:outline-none focus:border-emerald-400 transition-all"
              style={{ background: "rgba(4,30,48,0.9)" }}
            />
            {search && (
              <button onClick={() => setSearch("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-all">
                ✕
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 flex-wrap">
            <SelectFilter value={filterPosition} onChange={setFilterPosition}>
              <option value="">All Positions</option>
              {positions.map((p) => <option key={p}>{p}</option>)}
            </SelectFilter>

            <SelectFilter value={filterNationality} onChange={setFilterNationality}>
              <option value="">All Nationalities</option>
              {nationalities.map((n) => <option key={n}>{n}</option>)}
            </SelectFilter>

            <SelectFilter value={filterGender} onChange={setFilterGender}>
              <option value="">All Genders</option>
              <option>Male</option>
              <option>Female</option>
            </SelectFilter>

            <SelectFilter value={filterContract} onChange={setFilterContract}>
              <option value="">Contract Status</option>
              <option value="Yes">Under Contract</option>
              <option value="No">Free Agent</option>
            </SelectFilter>

            <SelectFilter value={sortBy} onChange={(v) => setSortBy(v as SortKey)}>
              <option value="timestamp">Newest First</option>
              <option value="fullName">Name A–Z</option>
              <option value="age">Age</option>
              <option value="position">Position</option>
              <option value="nationality">Nationality</option>
            </SelectFilter>

            {/* Clear filters */}
            {(filterPosition || filterNationality || filterGender || filterContract) && (
              <button
                onClick={() => { setFilterPosition(""); setFilterNationality(""); setFilterGender(""); setFilterContract(""); }}
                className="px-3 py-2 rounded-xl text-xs text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-all">
                Clear filters
              </button>
            )}

            {/* Spacer + view toggle */}
            <div className="ml-auto flex items-center gap-1 border border-white/15 rounded-xl overflow-hidden">
              {(["grid", "list"] as ViewMode[]).map((mode) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className={`px-3 py-2 text-xs font-semibold transition-all
                    ${viewMode === mode ? "bg-emerald-500 text-white" : "text-white/40 hover:text-white/70"}`}>
                  {mode === "grid" ? "⊞" : "☰"}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <p className="text-white/30 text-xs">
            {filtered.length} prospect{filtered.length !== 1 ? "s" : ""} found
            {(search || filterPosition || filterNationality || filterGender || filterContract) && (
              <span className="text-emerald-400/70"> (filtered)</span>
            )}
          </p>
        </div>

        {/* ── States ── */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-12 h-12 border-4 border-emerald-400/20 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-white/40 text-sm">Loading prospects...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-24 px-6">
            <p className="text-4xl mb-4">⚠️</p>
            <p className="text-white/60 text-sm max-w-md mx-auto">{error}</p>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">⚽</p>
            <p className="text-white/50 text-sm">No prospects match your search.</p>
            <button onClick={() => { setSearch(""); setFilterPosition(""); setFilterNationality(""); setFilterGender(""); setFilterContract(""); }}
              className="mt-4 px-4 py-2 rounded-xl border border-white/15 text-white/50 text-xs hover:border-white/30 hover:text-white/70 transition-all">
              Clear all filters
            </button>
          </div>
        )}

        {/* ── Grid view ── */}
        {!loading && !error && viewMode === "grid" && (
          <motion.div layout className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <ProspectCard key={p.id} prospect={p} onClick={() => setSelected(p)} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── List view ── */}
        {!loading && !error && viewMode === "list" && (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filtered.map((p) => (
                <ProspectRow key={p.id} prospect={p} onClick={() => setSelected(p)} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Prospect detail modal ── */}
      <AnimatePresence>
        {selected && (
          <ProspectModal prospect={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}