import { useState } from "react";
import { Check, Clock, Zap, BookOpen, Copy, CheckCircle2, KeyRound } from "lucide-react";
import { useStudy } from "@/context/useStudy";
import SystemHeader from "@/components/SystemHeader";

const TIME_OPTIONS = [
  { mins: 10, cases: 8, icon: Zap, label: { en: "Quick", de: "Kurz" }, desc: { en: "8 cases · ~2 blocks", de: "8 Fälle · ~2 Blöcke" } },
  { mins: 20, cases: 16, icon: BookOpen, label: { en: "Standard", de: "Standard" }, desc: { en: "16 cases · ~4 blocks", de: "16 Fälle · ~4 Blöcke" } },
  { mins: 30, cases: 24, icon: Clock, label: { en: "Full", de: "Vollständig" }, desc: { en: "24 cases · ~4 blocks", de: "24 Fälle · ~4 Blöcke" } },
];

const WelcomeScreen = () => {
  const { setScreen, setUserProfile, initializeCases, sessionCode, language, t } = useStudy();
  const [codeCopied, setCodeCopied] = useState(false);

  const copyCode = () => {
    if (!sessionCode) return;
    navigator.clipboard.writeText(sessionCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const [time, setTime] = useState<number | null>(20);
  const [experience, setExperience] = useState("");
  const [country, setCountry] = useState("");
  const [semester, setSemester] = useState("");
  const [specialty, setSpecialty] = useState<string[]>([]);
  const [xrayExp, setXrayExp] = useState("");
  const [xrayVolume, setXrayVolume] = useState("");
  const [aiGeneral, setAiGeneral] = useState("");
  const [aiMedicine, setAiMedicine] = useState("");
  const [aiCurrentUse, setAiCurrentUse] = useState<string[]>([]);
  const [aiKnowledge, setAiKnowledge] = useState("");
  const [aiCdss, setAiCdss] = useState("");
  const [aiAttitude, setAiAttitude] = useState("");
  const [aiTraining, setAiTraining] = useState("");
  const [consented, setConsented] = useState(false);

  const expOptions = [t("exp.none"), t("exp.student"), t("exp.resident"), t("exp.other")];
  
  const countryOptions = [t("country.austria"), t("country.germany"), t("country.switzerland"), t("country.other")];

  const semesterOptions = (() => {
    if (experience === t("exp.student")) {
      if (country === t("country.austria")) return [t("sem.at.preclinical"), t("sem.at.clinical"), t("sem.at.kpj")];
      if (country === t("country.germany")) return [t("sem.de.preclinical"), t("sem.de.clinical"), t("sem.de.pj")];
      if (country === t("country.switzerland")) return [t("sem.ch.bachelor"), t("sem.ch.master")];
      if (country === t("country.other")) return [t("sem.other.early"), t("sem.other.late")];
      return [];
    }
    if (experience === t("exp.resident")) return [t("sem.0-2y"), t("sem.3-5y"), t("sem.5y+")];
    return [t("sem.na")];
  })();

  const showSpecialty = experience === t("exp.resident") || experience === t("exp.other");
  const specialtyOptions = [
    { key: "radiology", label: t("spec.radiology") },
    { key: "internal", label: t("spec.internal") },
    { key: "surgery", label: t("spec.surgery") },
    { key: "emergency", label: t("spec.emergency") },
    { key: "pulmonology", label: t("spec.pulmonology") },
    { key: "cardiology", label: t("spec.cardiology") },
    { key: "anesthesia", label: t("spec.anesthesia") },
    { key: "pediatrics", label: t("spec.pediatrics") },
    { key: "orthopedics", label: t("spec.orthopedics") },
    { key: "neurology", label: t("spec.neurology") },
    { key: "oncology", label: t("spec.oncology") },
    { key: "generalPractice", label: t("spec.generalPractice") },
    { key: "intensiveCare", label: t("spec.intensiveCare") },
    { key: "pathology", label: t("spec.pathology") },
    { key: "other", label: t("spec.other") },
  ];

  const toggleSpecialty = (key: string) => {
    setSpecialty(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const xrayOptions = [t("xray.none"), t("xray.few"), t("xray.moderate"), t("xray.experienced")];
  const xrayVolOptions = [t("xrayVol.0"), t("xrayVol.1-5"), t("xrayVol.6-20"), t("xrayVol.20+")];

  const aiGeneralOptions = [t("ai.never"), t("ai.rarely"), t("ai.weekly"), t("ai.daily")];
  const aiMedOptions = [t("aiMed.never"), t("aiMed.tried"), t("aiMed.occasionally"), t("aiMed.regularly")];
  const aiKnowledgeOptions = [t("aiKnow.none"), t("aiKnow.basic"), t("aiKnow.good"), t("aiKnow.expert")];
  const aiCdssOptions = [t("cdss.never"), t("cdss.heard"), t("cdss.tried"), t("cdss.regular")];
  const aiAttitudeOptions = [t("aiAtt.verySkeptical"), t("aiAtt.skeptical"), t("aiAtt.neutral"), t("aiAtt.positive"), t("aiAtt.veryPositive")];
  const aiTrainingOptions = [t("aiTrain.none"), t("aiTrain.self"), t("aiTrain.workshop"), t("aiTrain.course")];

  const aiUseOptions = [
    { key: "research", label: t("aiUse.research") },
    { key: "writing", label: t("aiUse.writing") },
    { key: "diagnostics", label: t("aiUse.diagnostics") },
    { key: "learning", label: t("aiUse.learning") },
    { key: "coding", label: t("aiUse.coding") },
    { key: "none", label: t("aiUse.none") },
  ];

  const toggleAiUse = (key: string) => {
    if (key === "none") {
      setAiCurrentUse(["none"]);
    } else {
      setAiCurrentUse(prev => {
        const without = prev.filter(k => k !== "none");
        return without.includes(key) ? without.filter(k => k !== key) : [...without, key];
      });
    }
  };

  // Auto-set N/A for specialty and semester when not applicable
  const effectiveSpecialty = showSpecialty ? specialty : [];
  const effectiveSemester = (() => {
    if (experience === t("exp.none") || experience === t("exp.other")) return t("sem.na");
    return semester;
  })();
  const effectiveXrayVolume = xrayExp === t("xray.none") ? t("xrayVol.0") : xrayVolume;

  const isComplete = time !== null && experience && effectiveSemester && xrayExp
    && (xrayExp === t("xray.none") || effectiveXrayVolume)
    && (showSpecialty ? specialty.length > 0 : true)
    && aiGeneral && aiMedicine && aiCurrentUse.length > 0
    && aiKnowledge && aiCdss && aiAttitude && aiTraining && consented;

  const handleBegin = () => {
    if (!isComplete) return;
    setUserProfile({
      timeAvailable: time!,
      experienceLevel: experience,
      semester: effectiveSemester,
      specialty: effectiveSpecialty,
      xrayExperience: xrayExp,
      xrayVolume: effectiveXrayVolume,
      aiUsageGeneral: aiGeneral,
      aiUsageMedicine: aiMedicine,
      aiCurrentUse,
      aiKnowledge,
      aiCdssExperience: aiCdss,
      aiAttitude,
      aiTraining,
      consented,
    });
    initializeCases(time!);
    setScreen("interface-tutorial");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SystemHeader breadcrumb={t("welcome.background")} />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-5 py-6 space-y-6">
          {/* Session code banner */}
          {sessionCode && (
            <div className="glass-panel p-4 border-primary/20 bg-primary/5 space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  {language === "en" ? "Your Session Code" : "Ihr Sitzungscode"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {language === "en"
                  ? "Please write down this code. You can use it to resume your session if you need to take a break or if anything goes wrong."
                  : "Bitte notieren Sie sich diesen Code. Sie können ihn verwenden, um Ihre Sitzung fortzusetzen, falls Sie eine Pause machen müssen oder etwas schiefgeht."}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-mono font-bold text-primary tracking-[0.2em]">{sessionCode}</span>
                <button
                  onClick={copyCode}
                  className="flex items-center gap-1 px-2.5 h-7 rounded bg-secondary text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {codeCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                  {codeCopied ? (language === "en" ? "Copied!" : "Kopiert!") : (language === "en" ? "Copy" : "Kopieren")}
                </button>
              </div>
            </div>
          )}

          {/* Time selection */}
          <Field title={t("welcome.time")}>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map(opt => {
                const Icon = opt.icon;
                const selected = time === opt.mins;
                return (
                  <button
                    key={opt.mins}
                    onClick={() => setTime(opt.mins)}
                    className={`relative flex flex-col items-center gap-1.5 p-4 rounded transition-all duration-200 border ${
                      selected
                        ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20"
                        : "bg-secondary/60 border-transparent hover:border-border hover:bg-secondary"
                    }`}
                  >
                    <Icon className={`w-5 h-5 transition-colors ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-lg font-semibold font-mono transition-colors ${selected ? "text-primary" : "text-foreground"}`}>
                      {opt.mins}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {language === "en" ? "minutes" : "Minuten"}
                    </span>
                    <span className={`text-[10px] font-medium mt-0.5 ${selected ? "text-primary" : "text-muted-foreground"}`}>
                      {opt.label[language]}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">{opt.desc[language]}</span>
                    {selected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2 text-center italic">
              {language === "en"
                ? "This is an estimate; actual duration may vary depending on your pace."
                : "Dies ist eine Schätzung; die tatsächliche Dauer kann je nach Ihrem Tempo variieren."}
            </p>
          </Field>

          {/* Medical Background */}
          <Field title={t("welcome.background")}>
            <div className="space-y-4">
              <OptionRow label={t("welcome.experience")} value={experience} options={expOptions} onChange={v => { setExperience(v); setCountry(""); setSemester(""); setSpecialty([]); }} />
              {experience === t("exp.student") && (
                <OptionRow label={t("welcome.country")} value={country} options={countryOptions} onChange={v => { setCountry(v); setSemester(""); }} />
              )}
              {experience && experience !== t("exp.none") && experience !== t("exp.other") && (experience !== t("exp.student") || country) && semesterOptions.length > 0 && (
                <OptionRow label={t("welcome.semester")} value={semester} options={semesterOptions} onChange={setSemester} />
              )}
              {showSpecialty && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("welcome.specialty")}</label>
                  <div className="flex flex-wrap gap-2">
                    {specialtyOptions.map(opt => (
                      <Chip key={opt.key} selected={specialty.includes(opt.key)} onClick={() => toggleSpecialty(opt.key)}>
                        {specialty.includes(opt.key) && <Check className="w-3 h-3" />}
                        {opt.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <OptionRow label={t("welcome.xrayExp")} value={xrayExp} options={xrayOptions} onChange={v => { setXrayExp(v); if (v === t("xray.none")) setXrayVolume(t("xrayVol.0")); else setXrayVolume(""); }} />
              {xrayExp && xrayExp !== t("xray.none") && (
                <OptionRow label={t("welcome.xrayVolume")} value={xrayVolume} options={xrayVolOptions} onChange={setXrayVolume} />
              )}
            </div>
          </Field>

          {/* AI Experience - expanded */}
          <Field title="AI Experience">
            <div className="space-y-4">
              <OptionRow label={t("welcome.aiKnowledge")} value={aiKnowledge} options={aiKnowledgeOptions} onChange={setAiKnowledge} />
              <OptionRow label={t("welcome.aiGeneral")} value={aiGeneral} options={aiGeneralOptions} onChange={setAiGeneral} />
              <OptionRow label={t("welcome.aiMedicine")} value={aiMedicine} options={aiMedOptions} onChange={setAiMedicine} />
              <OptionRow label={t("welcome.cdss")} value={aiCdss} options={aiCdssOptions} onChange={setAiCdss} />
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("welcome.aiCurrentUse")}</label>
                <div className="flex flex-wrap gap-2">
                  {aiUseOptions.map(opt => (
                    <Chip key={opt.key} selected={aiCurrentUse.includes(opt.key)} onClick={() => toggleAiUse(opt.key)}>
                      {aiCurrentUse.includes(opt.key) && <Check className="w-3 h-3" />}
                      {opt.label}
                    </Chip>
                  ))}
                </div>
              </div>
              <OptionRow label={t("welcome.aiTraining")} value={aiTraining} options={aiTrainingOptions} onChange={setAiTraining} />
              <OptionRow label={t("welcome.aiAttitude")} value={aiAttitude} options={aiAttitudeOptions} onChange={setAiAttitude} />
            </div>
          </Field>

          {/* Consent */}
          <div className="border-t border-border pt-5">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className={`mt-0.5 w-5 h-5 rounded-sm flex items-center justify-center shrink-0 transition-all ${
                consented ? "bg-primary" : "border border-muted-foreground/30 group-hover:border-muted-foreground/50"
              }`}>
                {consented && <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />}
              </div>
              <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)} className="sr-only" />
              <span className="text-sm text-muted-foreground leading-relaxed">{t("welcome.consent")}</span>
            </label>
          </div>

          <button
            onClick={handleBegin}
            disabled={!isComplete}
            className="w-full h-10 rounded text-sm font-medium transition-all bg-primary text-primary-foreground hover:brightness-110 disabled:opacity-20 disabled:pointer-events-none"
          >
            {t("welcome.begin")}
          </button>
        </div>
      </div>
    </div>
  );
};

const Field = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">{title}</h2>
    <div className="glass-panel p-4">{children}</div>
  </div>
);

const OptionRow = ({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
    <div className="flex flex-wrap gap-2">
      {options.map(opt => (
        <Chip key={opt} selected={value === opt} onClick={() => onChange(opt)}>{opt}</Chip>
      ))}
    </div>
  </div>
);

const Chip = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`px-3 h-8 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
      selected
        ? "bg-primary text-primary-foreground"
        : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
    }`}
  >
    {children}
  </button>
);

export default WelcomeScreen;
