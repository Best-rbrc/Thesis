import { useState } from "react";
import { ArrowRight, Clock, ShieldCheck, UserX, RotateCcw, KeyRound } from "lucide-react";
import { useStudy } from "@/context/useStudy";
import SystemHeader from "@/components/SystemHeader";

// Change this to update the access code given to participants.
// Case-insensitive — participants can type it in any case.
const STUDY_ACCESS_CODE = "CHEX2025";

const LandingScreen = () => {
  const { setScreen, generateSessionCode, resumeSession, language, t } = useStudy();
  const [showResume, setShowResume] = useState(false);
  const [resumeCode, setResumeCode] = useState("");
  const [resumeError, setResumeError] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState(false);

  const handleStart = () => {
    if (accessCode.trim().toUpperCase() !== STUDY_ACCESS_CODE) {
      setAccessError(true);
      return;
    }
    generateSessionCode();
    setScreen("consent");
  };

  const handleResume = async () => {
    const code = resumeCode.trim().toUpperCase();
    if (code.length < 4) { setResumeError(true); return; }
    setResumeLoading(true);
    const ok = await resumeSession(code);
    setResumeLoading(false);
    if (!ok) { setResumeError(true); return; }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SystemHeader />

      <main className="flex-1 flex items-center justify-center px-5">
        <div className="max-w-md w-full py-12">
          <p className="text-xs font-medium text-primary tracking-[0.15em] uppercase mb-3">{t("app.subtitle")}</p>

          <h1 className="text-2xl sm:text-3xl font-semibold text-foreground leading-tight tracking-tight mb-4">
            {t("landing.headline")}
          </h1>

          <p className="text-sm text-muted-foreground leading-relaxed mb-8 max-w-sm">
            {t("landing.description")}
          </p>

          <div className="flex flex-col gap-3 mb-8">
            {/* Access code gate */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className={`flex flex-1 items-center gap-2 h-10 px-3 rounded border bg-secondary transition-shadow ${
                  accessError ? "border-destructive ring-1 ring-destructive" : "border-border focus-within:ring-1 focus-within:ring-primary"
                }`}>
                  <KeyRound className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={accessCode}
                    onChange={e => { setAccessCode(e.target.value); setAccessError(false); }}
                    onKeyDown={e => e.key === "Enter" && handleStart()}
                    placeholder={language === "en" ? "Access code" : "Zugangscode"}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                    autoComplete="off"
                  />
                </div>
                <button
                  onClick={handleStart}
                  className="group inline-flex items-center justify-center gap-2 h-10 px-5 rounded bg-primary text-primary-foreground text-sm font-medium hover:brightness-110 transition-all shrink-0"
                >
                  {t("landing.start")}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
              {accessError && (
                <p className="text-xs text-destructive pl-1">
                  {language === "en"
                    ? "Invalid access code. Please check and try again."
                    : "Ungültiger Zugangscode. Bitte prüfen und erneut versuchen."}
                </p>
              )}
            </div>

            {!showResume ? (
              <button
                onClick={() => setShowResume(true)}
                className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {language === "en" ? "I have a session code" : "Ich habe einen Sitzungscode"}
              </button>
            ) : (
              <div className="glass-panel p-4 space-y-3 animate-fade-in">
                <p className="text-xs text-muted-foreground">
                  {language === "en"
                    ? "Enter your 6-character session code to continue where you left off."
                    : "Geben Sie Ihren 6-stelligen Sitzungscode ein, um dort fortzufahren, wo Sie aufgehört haben."}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resumeCode}
                    onChange={e => { setResumeCode(e.target.value.toUpperCase()); setResumeError(false); }}
                    placeholder="Z.B. X4K9M2"
                    maxLength={6}
                    className={`flex-1 h-9 px-3 rounded bg-secondary border text-sm font-mono tracking-widest text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary transition-shadow uppercase ${
                      resumeError ? "border-destructive" : "border-border"
                    }`}
                  />
                  <button
                    onClick={handleResume}
                    disabled={resumeCode.length < 4 || resumeLoading}
                    className="h-9 px-4 rounded bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all disabled:opacity-30"
                  >
                    {resumeLoading ? (
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {resumeError && (
                  <p className="text-xs text-destructive">
                    {language === "en"
                      ? "No session found. Please check your code and try again."
                      : "Keine Sitzung gefunden. Bitte überprüfen Sie Ihren Code."}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 opacity-50" />
              {t("landing.duration")}
            </span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 opacity-50" />
              {t("landing.anonymous")}
            </span>
            <span className="w-px h-3 bg-border hidden sm:block" />
            <span className="flex items-center gap-1.5">
              <UserX className="w-3.5 h-3.5 opacity-50" />
              {t("landing.noAccount")}
            </span>
          </div>
        </div>
      </main>

      <footer className="h-10 border-t border-border px-4 flex items-center">
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Benjamin Stieger, Universität St. Gallen</p>
      </footer>
    </div>
  );
};

export default LandingScreen;
