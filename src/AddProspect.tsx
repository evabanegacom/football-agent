import { useState, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── CONFIG ────────────────────────────────────────────────────────────────────
const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzDJsDhzek_eDWzhIrdjCyBXQpO6nnd4Na2j6m3lAEGWM4-v5s6xcdNpzeCSCLxAkgA/exec";

// Replace with your Cloudinary cloud name + an UNSIGNED upload preset
const CLOUDINARY_CLOUD_NAME = "spetsnaz";
const CLOUDINARY_UPLOAD_PRESET = "football-registration";
// ───────────────────────────────────────────────────────────────────────────────

type Step = "personal" | "family" | "football" | "media" | "done";

interface FormState {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  height: string;
  gender: string;
  nationality: string;
  stateOfOrigin: string;
  lga: string;
  phone: string;
  email: string;
  parentName: string;
  parentPhone: string;
  locationCountry: string;
  locationState: string;
  houseAddress: string;
  position: string;
  duration: string;
  hasContract: string;
  contractDetails: string;
  photoUrl: string;
  videoLink: string;
}

type FormErrors = Partial<Record<keyof FormState, string>>;

const STEPS: Step[] = ["personal", "family", "football", "media", "done"];

const POSITIONS = [
  "Goalkeeper",
  "Right Back",
  "Left Back",
  "Centre Back",
  "Defensive Midfielder",
  "Central Midfielder",
  "Attacking Midfielder",
  "Right Winger",
  "Left Winger",
  "Striker / Centre Forward",
];

const COUNTRIES = [
  "Nigeria","Ghana","Senegal","Ivory Coast","Cameroon","South Africa",
  "England","France","Brazil","Germany","Spain","United States","Other",
];

const DURATIONS = [
  "Less than 1 year","1 – 2 years","2 – 4 years",
  "4 – 6 years","6 – 10 years","10+ years",
];

const INIT_FORM: FormState = {
  firstName: "", middleName: "", lastName: "",
  dob: "", height: "", gender: "",
  nationality: "", stateOfOrigin: "", lga: "",
  phone: "", email: "",
  parentName: "", parentPhone: "",
  locationCountry: "", locationState: "", houseAddress: "",
  position: "", duration: "", hasContract: "",
  contractDetails: "",
  photoUrl: "", videoLink: "",
};

// ─── ATOMS ─────────────────────────────────────────────────────────────────────
interface LabelProps { children: React.ReactNode; required?: boolean }
const Label = ({ children, required }: LabelProps) => (
  <label className="block text-xs font-semibold text-emerald-400 mb-1.5 tracking-widest uppercase">
    {children}{required && <span className="text-red-400 ml-1">*</span>}
  </label>
);

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
const Input = (props: InputProps) => (
  <input
    {...props}
    className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/20 text-white
      placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:bg-white/10
      transition-all text-sm"
  />
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}
const Select = ({ children, ...props }: SelectProps) => (
  <select
    {...props}
    style={{ background: "#071624" }}
    className="w-full px-4 py-3 rounded-xl border border-white/20 text-white
      focus:outline-none focus:border-emerald-400 transition-all text-sm appearance-none cursor-pointer"
  >
    {children}
  </select>
);

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
const Textarea = (props: TextareaProps) => (
  <textarea
    {...props}
    rows={3}
    className="w-full px-4 py-3 rounded-xl bg-white/[0.07] border border-white/20 text-white
      placeholder-white/30 focus:outline-none focus:border-emerald-400 focus:bg-white/10
      transition-all text-sm resize-none"
  />
);

const FieldError = ({ msg }: { msg?: string }) =>
  msg ? <p className="text-red-400 text-xs mt-1">{msg}</p> : null;

// ─── PROGRESS ──────────────────────────────────────────────────────────────────
const ProgressBar = ({ current }: { current: Step }) => {
  const labels = ["Personal", "Family", "Football", "Media"];
  const idx = STEPS.indexOf(current);
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
            ${i < idx ? "bg-emerald-500 text-white" : i === idx ? "bg-emerald-400 text-[#071624] ring-4 ring-emerald-400/25 scale-110" : "bg-white/10 text-white/30"}`}>
            {i < idx ? "✓" : i + 1}
          </div>
          <span className={`text-[11px] hidden sm:block transition-all ${i === idx ? "text-emerald-300 font-semibold" : "text-white/30"}`}>
            {label}
          </span>
          {i < labels.length - 1 && (
            <div className={`w-6 h-px transition-all duration-500 ${i < idx ? "bg-emerald-500" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
};

// ─── CLOUDINARY UPLOAD COMPONENT ───────────────────────────────────────────────
interface PhotoUploadProps {
  photoUrl: string;
  onUploaded: (url: string) => void;
  error?: string;
}

const PhotoUpload = ({ photoUrl, onUploaded, error }: PhotoUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [preview, setPreview] = useState<string>("");

  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size before doing anything else
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(
        `Image is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max allowed is 2MB.`
      );
      e.target.value = ""; // reset the input so the same file can be reselected after compressing
      return;
    }

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setUploading(true);
    setUploadError("");
    try {
      const data = new FormData();
      data.append("file", file);
      data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: data }
      );

      const responseText = await res.clone().text();
      console.log("Cloudinary response:", res.status, responseText);
      if (!res.ok) throw new Error(`Upload failed: ${res.status} ${responseText}`);
      const json = await res.json();
      onUploaded(json.secure_url as string);
    } catch (err) {
      setUploadError((err as Error).message || "Upload failed. Please try again.");
      setPreview("");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
          ${error ? "border-red-500/60 bg-red-500/5" : "border-white/20 hover:border-emerald-400/60 bg-white/[0.04] hover:bg-white/[0.07]"}`}
        style={{ minHeight: 180 }}
      >
        {/* Preview */}
        {(preview || photoUrl) && !uploading && (
          <div className="relative w-full h-48">
            <img
              src={preview || photoUrl}
              alt="Preview"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
              <p className="text-white text-sm font-semibold">Click to change photo</p>
            </div>
            {photoUrl && (
              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                ✓ Uploaded
              </div>
            )}
          </div>
        )}

        {/* Uploading state */}
        {uploading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-10 h-10 border-4 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-emerald-300 text-sm font-medium">Uploading to Cloudinary...</p>
          </div>
        )}

        {/* Empty state */}
        {!preview && !photoUrl && !uploading && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-2xl">📸</div>
            <div>
              <p className="text-white/70 text-sm font-medium">Click to upload your photo</p>
              <p className="text-white/30 text-xs mt-1">JPG, PNG or WEBP · Max 2MB · Full-body, clear background preferred</p>
            </div>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />

      {uploadError && <p className="text-red-400 text-xs mt-2">{uploadError}</p>}
      {error && !uploadError && <FieldError msg={error} />}
    </div>
  );
};

// ─── TOGGLE BUTTONS ─────────────────────────────────────────────────────────────
interface ToggleGroupProps {
  options: string[];
  value: string;
  onChange: (val: string) => void;
}
const ToggleGroup = ({ options, value, onChange }: ToggleGroupProps) => (
  <div className="flex gap-3 mt-1">
    {options.map((opt) => (
      <button
        key={opt}
        type="button"
        onClick={() => onChange(opt)}
        className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-all text-sm
          ${value === opt
            ? "border-emerald-400 bg-emerald-400/15 text-emerald-300"
            : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/60"}`}
      >
        {opt}
      </button>
    ))}
  </div>
);

// ─── NAV BUTTONS ────────────────────────────────────────────────────────────────
interface NavButtonsProps {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  loading?: boolean;
}
const NavButtons = ({ onBack, onNext, nextLabel = "Continue →", loading = false }: NavButtonsProps) => (
  <div className="flex gap-3 mt-8">
    {onBack && (
      <button
        type="button"
        onClick={onBack}
        className="flex-1 py-4 rounded-2xl font-bold text-sm border border-white/15 text-white/50
          hover:border-white/30 hover:text-white/80 transition-all"
      >
        ← Back
      </button>
    )}
    <button
      type="button"
      onClick={onNext}
      disabled={loading}
      className="flex-[2] py-4 rounded-2xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400
        active:scale-95 text-white transition-all shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Submitting...
        </span>
      ) : nextLabel}
    </button>
  </div>
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────────
export default function FootballAcademyRegistration() {
  const [step, setStep] = useState<Step>("personal");
  const [form, setForm] = useState<FormState>(INIT_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const set =
    (field: keyof FormState) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));

  const setField = (field: keyof FormState, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  // ── Validation per step ──
  const validate = (): boolean => {
    const e: FormErrors = {};

    if (step === "personal") {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
      if (!form.dob) e.dob = "Date of birth is required";
      if (!form.gender) e.gender = "Please select a gender";
      if (!form.nationality) e.nationality = "Please select a nationality";
      if (!form.phone.trim()) e.phone = "Phone number is required";
    }

    if (step === "family") {
      if (!form.parentName.trim()) e.parentName = "Parent / guardian name is required";
      if (!form.parentPhone.trim()) e.parentPhone = "Parent / guardian phone is required";
      if (!form.locationCountry) e.locationCountry = "Please select your current country";
      if (!form.houseAddress.trim()) e.houseAddress = "House address is required";
    }

    if (step === "football") {
      if (!form.position) e.position = "Please select your playing position";
      if (!form.duration) e.duration = "Please select how long you've been playing";
      if (!form.hasContract) e.hasContract = "Please answer this question";
    }

    if (step === "media") {
      if (!form.photoUrl) e.photoUrl = "Please upload a photo of yourself";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goNext = () => {
    if (!validate()) return;
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 2) {
      setStep(STEPS[idx + 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  };

  const goBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = {
      "First Name": form.firstName,
      "Middle Name": form.middleName,
      "Last Name": form.lastName,
      "Date of Birth": form.dob,
      "Height (cm)": form.height,
      "Gender": form.gender,
      "Nationality / Country": form.nationality,
      "State of Origin": form.stateOfOrigin,
      "LGA": form.lga,
      "Phone": form.phone,
      "Email": form.email,
      "Parent / Guardian Name": form.parentName,
      "Parent / Guardian Phone": form.parentPhone,
      "Current Country": form.locationCountry,
      "Current State": form.locationState,
      "House Address": form.houseAddress,
      "Football Position": form.position,
      "Years Playing": form.duration,
      "Under Contract": form.hasContract,
      "Contract Details": form.contractDetails,
      "Photo URL": form.photoUrl,
      "Video Link": form.videoLink,
    };

    try {
      const form = new FormData();
      form.append("data", JSON.stringify(payload));
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        body: form,
        mode: "no-cors",
      });
    } catch {
      console.warn("Google Sheets submission failed — saved locally:", payload);
    } finally {
      setSubmitting(false);
      setStep("done");
    }
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen text-white"
      style={{ background: "linear-gradient(150deg, #020d18 0%, #041e30 55%, #061a0e 100%)" }}
    >
      {/* Pitch line overlay */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 58px, #22c55e 58px, #22c55e 60px)",
        }}
      />

      {/* ── Hero ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 320 }}>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?auto=format&fit=crop&w=1400&q=80')",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(2,13,24,0.55) 0%, rgba(4,30,48,0.88) 65%, #041e30 100%)",
          }}
        />
        {/* Stadium glow — the signature element */}
        <div
          className="absolute -top-16 left-1/2 -translate-x-1/2 w-[500px] h-64 opacity-25 blur-3xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, #bbf7d0 0%, #4ade80 45%, transparent 70%)",
          }}
        />
        <div className="relative flex flex-col items-center justify-end text-center px-6 pt-16 pb-20">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-emerald-400 uppercase tracking-[0.35em] text-xs font-semibold mb-3">
              Open Trials · 2025 Season
            </p>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-none">
              FOOTBALL ACADEMY
              <br />
              <span style={{ color: "#4ade80" }}>REGISTRATION</span>
            </h1>
            <p className="mt-4 text-white/50 text-sm max-w-md mx-auto leading-relaxed">
              Complete all four sections below. Fields marked{" "}
              <span className="text-red-400 font-semibold">*</span> are required.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Card ── */}
      <div className="relative max-w-2xl mx-auto px-4 pb-24 -mt-10 z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08]"
          style={{ background: "rgba(4,30,48,0.96)", backdropFilter: "blur(24px)" }}
        >
          <AnimatePresence mode="wait">

            {/* ── STEP 1: Personal ── */}
            {step === "personal" && (
              <motion.div
                key="personal"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                <ProgressBar current={step} />
                <h2 className="text-xl font-bold mb-1">Personal Information</h2>
                <p className="text-white/40 text-sm mb-7">Basic details about you</p>

                {/* Name row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div>
                    <Label required>First Name</Label>
                    <Input placeholder="John" value={form.firstName} onChange={set("firstName")} />
                    <FieldError msg={errors.firstName} />
                  </div>
                  <div>
                    <Label>Middle Name</Label>
                    <Input placeholder="Michael" value={form.middleName} onChange={set("middleName")} />
                  </div>
                  <div>
                    <Label required>Last Name</Label>
                    <Input placeholder="Okafor" value={form.lastName} onChange={set("lastName")} />
                    <FieldError msg={errors.lastName} />
                  </div>
                </div>

                {/* DOB + Height */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <Label required>Date of Birth</Label>
                    <Input type="date" value={form.dob} onChange={set("dob")} />
                    <FieldError msg={errors.dob} />
                  </div>
                  <div>
                    <Label>Height (cm)</Label>
                    <Input type="number" placeholder="175" value={form.height} onChange={set("height")} />
                  </div>
                </div>

                {/* Gender */}
                <div className="mb-5">
                  <Label required>Gender</Label>
                  <ToggleGroup
                    options={["Male", "Female"]}
                    value={form.gender}
                    onChange={(v) => setField("gender", v)}
                  />
                  <FieldError msg={errors.gender} />
                </div>

                {/* Nationality + State + LGA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                  <div>
                    <Label required>Nationality</Label>
                    <Select value={form.nationality} onChange={set("nationality")}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                    </Select>
                    <FieldError msg={errors.nationality} />
                  </div>
                  <div>
                    <Label>State of Origin</Label>
                    <Input placeholder="Lagos" value={form.stateOfOrigin} onChange={set("stateOfOrigin")} />
                  </div>
                  <div>
                    <Label>LGA</Label>
                    <Input placeholder="Ikeja" value={form.lga} onChange={set("lga")} />
                  </div>
                </div>

                {/* Phone + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
                  <div>
                    <Label required>Phone Number</Label>
                    <Input type="tel" placeholder="+234 801 234 5678" value={form.phone} onChange={set("phone")} />
                    <FieldError msg={errors.phone} />
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <Input type="email" placeholder="john@email.com" value={form.email} onChange={set("email")} />
                  </div>
                </div>

                <NavButtons onNext={goNext} nextLabel="Next: Family & Location →" />
              </motion.div>
            )}

            {/* ── STEP 2: Family ── */}
            {step === "family" && (
              <motion.div
                key="family"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                <ProgressBar current={step} />
                <h2 className="text-xl font-bold mb-1">Family & Location</h2>
                <p className="text-white/40 text-sm mb-7">Parent / guardian details and your current address</p>

                <div className="mb-5">
                  <Label required>Full Name of Parent / Guardian</Label>
                  <Input
                    placeholder="Mrs. Grace Okafor"
                    value={form.parentName}
                    onChange={set("parentName")}
                  />
                  <FieldError msg={errors.parentName} />
                </div>

                <div className="mb-5">
                  <Label required>Parent / Guardian Phone Number</Label>
                  <Input
                    type="tel"
                    placeholder="+234 802 345 6789"
                    value={form.parentPhone}
                    onChange={set("parentPhone")}
                  />
                  <FieldError msg={errors.parentPhone} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <Label required>Current Country</Label>
                    <Select value={form.locationCountry} onChange={set("locationCountry")}>
                      <option value="">Select country</option>
                      {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
                    </Select>
                    <FieldError msg={errors.locationCountry} />
                  </div>
                  <div>
                    <Label>Current State / Province</Label>
                    <Input placeholder="Anambra" value={form.locationState} onChange={set("locationState")} />
                  </div>
                </div>

                <div className="mb-2">
                  <Label required>House Address</Label>
                  <Textarea
                    placeholder="12 Broad Street, GRA, Onitsha..."
                    value={form.houseAddress}
                    onChange={set("houseAddress")}
                  />
                  <FieldError msg={errors.houseAddress} />
                </div>

                <NavButtons onBack={goBack} onNext={goNext} nextLabel="Next: Football Profile →" />
              </motion.div>
            )}

            {/* ── STEP 3: Football ── */}
            {step === "football" && (
              <motion.div
                key="football"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                <ProgressBar current={step} />
                <h2 className="text-xl font-bold mb-1">Football Profile</h2>
                <p className="text-white/40 text-sm mb-7">Tell us about your playing experience</p>

                <div className="mb-5">
                  <Label required>Playing Position</Label>
                  <Select value={form.position} onChange={set("position")}>
                    <option value="">Select your position</option>
                    {POSITIONS.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                  <FieldError msg={errors.position} />
                </div>

                <div className="mb-5">
                  <Label required>How Long Have You Been Playing Football?</Label>
                  <Select value={form.duration} onChange={set("duration")}>
                    <option value="">Select duration</option>
                    {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                  </Select>
                  <FieldError msg={errors.duration} />
                </div>

                <div className="mb-5">
                  <Label required>
                    Are You Currently Under Contract With Any Academy or Club?
                  </Label>
                  <ToggleGroup
                    options={["Yes", "No"]}
                    value={form.hasContract}
                    onChange={(v) => setField("hasContract", v)}
                  />
                  <FieldError msg={errors.hasContract} />
                </div>

                <AnimatePresence>
                  {form.hasContract === "Yes" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 overflow-hidden"
                    >
                      <Label>Provide details of the contract / club</Label>
                      <Textarea
                        placeholder="Club name, contract end date, etc."
                        value={form.contractDetails}
                        onChange={set("contractDetails")}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <NavButtons onBack={goBack} onNext={goNext} nextLabel="Next: Media →" />
              </motion.div>
            )}

            {/* ── STEP 4: Media ── */}
            {step === "media" && (
              <motion.div
                key="media"
                initial={{ opacity: 0, x: 32 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -32 }}
                transition={{ duration: 0.25 }}
                className="p-8"
              >
                <ProgressBar current={step} />
                <h2 className="text-xl font-bold mb-1">Media Submission</h2>
                <p className="text-white/40 text-sm mb-7">Upload your photo and share a video link</p>

                {/* Photo upload */}
                <div className="mb-6">
                  <Label required>Full Photo of Yourself</Label>
                  <PhotoUpload
                    photoUrl={form.photoUrl}
                    onUploaded={(url) => setField("photoUrl", url)}
                    error={errors.photoUrl}
                  />
                </div>

                {/* Video link */}
                <div className="mb-2">
                  <Label>Video of Yourself Playing (Link)</Label>
                  <div
                    className="p-4 rounded-xl border border-blue-400/20 bg-blue-500/[0.07] mb-3"
                  >
                    <p className="text-blue-300 text-xs font-semibold mb-1">🎥 Recording tip</p>
                    <p className="text-white/45 text-xs leading-relaxed">
                      Record a 2–5 minute clip showing your skills. Upload it to{" "}
                      <span className="text-white/70">YouTube (set to Unlisted)</span> or{" "}
                      <span className="text-white/70">Google Drive</span>, then paste the link below.
                    </p>
                  </div>
                  <Input
                    type="url"
                    placeholder="https://youtube.com/watch?v=... or https://drive.google.com/..."
                    value={form.videoLink}
                    onChange={set("videoLink")}
                  />
                </div>

                <NavButtons
                  onBack={goBack}
                  onNext={goNext}
                  nextLabel="Submit Registration ✓"
                  loading={submitting}
                />
              </motion.div>
            )}

            {/* ── STEP 5: Done ── */}
            {step === "done" && (
              <motion.div
                key="done"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 180 }}
                className="p-12 text-center"
                style={{
                  background: "linear-gradient(135deg, #052010 0%, #041e30 100%)",
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 220 }}
                  className="w-24 h-24 mx-auto rounded-full border-4 border-emerald-400 bg-emerald-400/10
                    flex items-center justify-center text-5xl mb-6"
                >
                  ⚽
                </motion.div>

                <h2 className="text-3xl md:text-4xl font-black text-emerald-300 mb-4">
                  Registration Received!
                </h2>
                <p className="text-white/60 text-base mb-6 max-w-sm mx-auto leading-relaxed">
                  Thank you,{" "}
                  <span className="text-white font-semibold">{form.firstName}</span>. Our
                  coaching team will review your profile and be in touch.
                </p>
                <p className="text-emerald-400/70 italic text-sm mb-8">
                  "Champions aren't made in gyms. They are made from something deep inside
                  them." – Muhammad Ali
                </p>

                {/* Summary */}
                <div
                  className="rounded-2xl border border-white/10 p-5 text-left space-y-2 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <p className="text-white/30 uppercase text-[10px] tracking-widest mb-3">
                    Submission summary
                  </p>
                  {[
                    ["Name", [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ")],
                    ["Position", form.position],
                    ["Phone", form.phone],
                    ["Photo", form.photoUrl ? "✓ Uploaded" : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <span className="text-white/40">{label}</span>
                      <span className="text-white/70 text-right truncate max-w-[200px]">{value}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}