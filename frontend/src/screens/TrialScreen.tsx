import { useState, useRef, useEffect } from "react";
import { Lock, Send, AlertTriangle, X, Info, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/context/useStudy";
import { FINDINGS } from "@/data/mockData";
import StudyCheckbox from "@/components/StudyCheckbox";
import SystemHeader from "@/components/SystemHeader";
import { Slider } from "@/components/ui/slider";

type OverlayView = "original" | "gradcam" | "intgrad";
const NO_FINDING_ID = "__no_finding__";

const TrialScreen = () => {
  const { currentCase, phase, setPhase, addResponse, nextCase, currentCaseIndex, totalCases, progress, currentBlock, t } = useStudy();
  const [selectedFindings, setSelectedFindings] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [revisedFindings, setRevisedFindings] = useState<string[]>([]);
  const [revisedConfidence, setRevisedConfidence] = useState(50);
  const [aiHelpful, setAiHelpful] = useState(50);
  const [overlayView, setOverlayView] = useState<OverlayView>("original");
  const [selectedOverlayFinding, setSelectedOverlayFinding] = useState<string>("cardiomegaly");
  const [biasAcknowledged, setBiasAcknowledged] = useState(false);
  const [xaiFaithful, setXaiFaithful] = useState<string | null>(null);
  const [xaiHelpful, setXaiHelpful] = useState<string | null>(null);
  const [changedMind, setChangedMind] = useState<boolean | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTime = useRef(Date.now());
  const phase2StartTime = useRef<number | null>(null);
  const bannerShowTime = useRef<number | null>(null);
  const [showConditionInfo, setShowConditionInfo] = useState(false);
  const seenConditions = useRef<Set<string>>(new Set());

  const isControl = currentCase?.condition === "A";
  const showAIPredictions = currentCase?.condition === "B" || currentCase?.condition === "C" || currentCase?.condition === "D";
  const showAI = currentCase?.condition !== "A"; // any non-control has phase 2
  const showExplanations = currentCase?.condition === "C" || currentCase?.condition === "D" || currentCase?.condition === "E";
  const showBias = currentCase?.condition === "D" && currentCase?.biasWarning;

  // Show condition info modal only the first time each condition is encountered
  useEffect(() => {
    if (currentCase && !seenConditions.current.has(currentCase.condition)) {
      seenConditions.current.add(currentCase.condition);
      setShowConditionInfo(true);
    }
  }, [currentCase]);


  if (!currentCase) return null;

  const toggleFinding = (id: string, isPhase2: boolean) => {
    const setter = isPhase2 ? setRevisedFindings : setSelectedFindings;
    setter(prev => {
      if (id === NO_FINDING_ID) return prev.includes(NO_FINDING_ID) ? [] : [NO_FINDING_ID];
      const withoutNone = prev.filter(f => f !== NO_FINDING_ID);
      return withoutNone.includes(id) ? withoutNone.filter(f => f !== id) : [...withoutNone, id];
    });
  };

  const normalizedInitialFindings = selectedFindings.filter(id => id !== NO_FINDING_ID);
  const normalizedRevisedFindings = revisedFindings.filter(id => id !== NO_FINDING_ID);

  const handleLockIn = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (isControl) {
      addResponse({
        caseId: currentCase.id, condition: currentCase.condition, category: currentCase.category,
        groundTruth: currentCase.groundTruth, aiPredictions: currentCase.aiPredictions,
        initialFindings: normalizedInitialFindings, initialConfidence: confidence,
        responseTimePreMs: Date.now() - startTime.current,
      });
      resetAndNext();
    } else {
      setRevisedFindings([...selectedFindings]);
      setRevisedConfidence(confidence);
      phase2StartTime.current = Date.now();
      if (showBias) bannerShowTime.current = Date.now();
      // Default overlay finding to highest AI confidence prediction
      const topPred = [...currentCase.aiPredictions].sort((a, b) => b.confidence - a.confidence)[0];
      if (topPred) setSelectedOverlayFinding(topPred.findingId);
      setPhase(2);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const responseTimePostMs = phase2StartTime.current ? Date.now() - phase2StartTime.current : undefined;
    const timeOnBannerMs = showBias && bannerShowTime.current && biasAcknowledged ? Date.now() - bannerShowTime.current : undefined;
    addResponse({
      caseId: currentCase.id, condition: currentCase.condition, category: currentCase.category,
      groundTruth: currentCase.groundTruth, aiPredictions: currentCase.aiPredictions,
      initialFindings: normalizedInitialFindings, initialConfidence: confidence,
      revisedFindings: normalizedRevisedFindings, revisedConfidence, aiHelpful,
      xaiHelpful: showExplanations ? (xaiHelpful as any) : undefined,
      xaiFaithful: showExplanations ? (xaiFaithful as any) : undefined,
      xaiViewSelected: showExplanations ? overlayView : undefined,
      xaiOverlayFinding: showExplanations && overlayView !== "original" ? selectedOverlayFinding : undefined,
      changedMindSelfReport: changedMind ?? undefined,
      responseTimePreMs: phase2StartTime.current ? phase2StartTime.current - startTime.current : Date.now() - startTime.current,
      responseTimePostMs, biasBannerDismissed: showBias ? biasAcknowledged : undefined, timeOnBannerMs,
    });
    resetAndNext();
  };

  const resetAndNext = () => {
    setSelectedFindings([]); setConfidence(50); setRevisedFindings([]); setRevisedConfidence(50);
    setAiHelpful(50); setOverlayView("original"); setSelectedOverlayFinding("cardiomegaly"); setBiasAcknowledged(false);
    setXaiFaithful(null); setXaiHelpful(null); setChangedMind(null);
    startTime.current = Date.now(); phase2StartTime.current = null; bannerShowTime.current = null;
    setIsSubmitting(false);
    nextCase();
  };

  const showOverlay = overlayView !== "original" && phase === 2;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Condition info overlay */}
      {showConditionInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full mx-4 p-6 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Info className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-lg font-semibold text-foreground">
                {t(`conditionInfo.${currentCase.condition}.title`)}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t(`conditionInfo.${currentCase.condition}.desc`)}
            </p>
            <Button onClick={() => setShowConditionInfo(false)} className="w-full h-10 rounded text-sm">
              {t("conditionInfo.dismiss")}
            </Button>
          </div>
        </div>
      )}

      <SystemHeader
        breadcrumb={`${t("trial.case")} ${currentCaseIndex + 1} / ${totalCases}`}
        progress={progress}
        phaseLabel={phase === 1 ? t("trial.phase1") : t("trial.phase2")}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Image viewer */}
        <div className="lg:flex-1 bg-black/20 flex flex-col items-center justify-center p-4 sm:p-6 relative">
          {showBias && !biasAcknowledged && phase === 2 && (
            <div className="absolute top-3 left-3 right-3 bg-card border border-warning/30 rounded p-3 flex items-start gap-2 z-10 animate-fade-in">
              <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-xs text-warning/90 flex-1 leading-snug">{currentCase.biasWarning}</p>
              <button onClick={() => setBiasAcknowledged(true)} className="text-warning/60 hover:text-warning">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="relative w-full max-w-lg aspect-square bg-black rounded overflow-hidden border border-border/50">
            <img src={currentCase.imageUrl} alt={`Case ${currentCase.id}`} className="w-full h-full object-contain" />
            {showOverlay && (() => {
              const overlayUrl = currentCase.overlays?.[overlayView as "gradcam" | "intgrad"]?.[selectedOverlayFinding];
              return overlayUrl ? (
                <img
                  src={overlayUrl}
                  alt={`${overlayView} overlay for ${selectedOverlayFinding}`}
                  className="absolute inset-0 w-full h-full object-contain"
                  style={{ mixBlendMode: "screen", opacity: 0.85 }}
                />
              ) : null;
            })()}
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/40 font-mono leading-tight">
              <div>CASE {String(currentCaseIndex + 1).padStart(3, "0")}</div>
              <div>BLOCK {currentBlock}</div>
            </div>
          </div>

          {showExplanations && phase === 2 && (
            <div className="mt-3 space-y-2">
              {/* XAI method toggle */}
              <div className="flex gap-px bg-border rounded overflow-hidden">
                {(["original", "gradcam", "intgrad"] as OverlayView[]).map(view => (
                  <button
                    key={view}
                    onClick={() => setOverlayView(view)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      overlayView === view
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t(`trial.overlay.${view}`)}
                  </button>
                ))}
              </div>

              {/* Per-finding selector — always reserves space to prevent layout jump */}
              <div className={`flex gap-1 overflow-x-auto pb-0.5 transition-opacity duration-150 ${overlayView === "original" ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
                {currentCase.aiPredictions
                  .slice()
                  .sort((a, b) => b.confidence - a.confidence)
                  .map(pred => (
                    <button
                      key={pred.findingId}
                      onClick={() => setSelectedOverlayFinding(pred.findingId)}
                      className={`shrink-0 px-2.5 py-1 rounded text-[11px] font-medium transition-colors border ${
                        selectedOverlayFinding === pred.findingId
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-secondary/50 text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {t(`finding.${pred.findingId}`)}
                      <span className="ml-1 opacity-60 font-mono">{pred.confidence}%</span>
                    </button>
                  ))}
              </div>

              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MousePointerClick className="w-3.5 h-3.5 shrink-0 text-primary" />
                {t("trial.overlayHint")}
              </p>
            </div>
          )}
        </div>

        {/* Panel */}
        <div className="lg:w-[400px] border-l border-border bg-card/30 p-4 sm:p-5 space-y-4 overflow-y-auto">
          {phase === 1 ? (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("trial.selectFindings")}</h3>
                <div className="space-y-2">
                  {FINDINGS.map(f => (
                    <StudyCheckbox key={f.id} checked={selectedFindings.includes(f.id)} onChange={() => toggleFinding(f.id, false)} label={t(`finding.${f.id}`)} description={t(`finding.${f.id}.desc`)} />
                  ))}
                  <div className="border-t border-border/50 pt-2">
                    <StudyCheckbox checked={selectedFindings.includes(NO_FINDING_ID)} onChange={() => toggleFinding(NO_FINDING_ID, false)} label={t("finding.none")} />
                  </div>
                </div>
              </div>
              <SliderField label={t("trial.confidence")} value={confidence} onChange={setConfidence} minLabel={t("trial.notConfident")} maxLabel={t("trial.veryConfident")} />
              <Button onClick={handleLockIn} disabled={selectedFindings.length === 0 || isSubmitting} className="w-full h-10 rounded text-sm">
                <Lock className="w-4 h-4 mr-2" />
                {isControl ? t("trial.submitAnswer") : t("trial.lockIn")}
              </Button>
            </>
          ) : (
            <>
              {showAIPredictions && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("trial.aiPredictions")}</h3>
                  <div className="space-y-2.5">
                    {currentCase.aiPredictions.map(pred => (
                      <div key={pred.findingId} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{t(`finding.${pred.findingId}`)}</span>
                          <span className="text-primary font-mono text-xs">{pred.confidence}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-700 ease-out" style={{ width: `${pred.confidence}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t("trial.revise")}</h3>
                <div className="space-y-2">
                  {FINDINGS.map(f => (
                    <StudyCheckbox key={f.id} checked={revisedFindings.includes(f.id)} onChange={() => toggleFinding(f.id, true)} label={t(`finding.${f.id}`)} />
                  ))}
                  <div className="border-t border-border/50 pt-2">
                    <StudyCheckbox checked={revisedFindings.includes(NO_FINDING_ID)} onChange={() => toggleFinding(NO_FINDING_ID, true)} label={t("finding.none")} />
                  </div>
                </div>
              </div>

              <SliderField label={t("trial.revisedConfidence")} value={revisedConfidence} onChange={setRevisedConfidence} />
              <SliderField label={t("trial.aiHelpful")} value={aiHelpful} onChange={setAiHelpful} minLabel={t("trial.notAtAll")} maxLabel={t("trial.veryHelpful")} />

              {showExplanations && (
                <>
                  <ToggleGroup label={t("trial.xaiFaithful")} value={xaiFaithful} options={["yes", "partially", "no", "unsure"]} labelFn={o => t(`trial.xaiFaithful.${o}`)} onChange={setXaiFaithful} />
                  <ToggleGroup label={t("trial.xaiHelpful")} value={xaiHelpful} options={["helped", "neutral", "misleading"]} labelFn={o => t(`trial.xaiHelpful.${o}`)} onChange={setXaiHelpful} />
                </>
              )}

              {showAI && (
                <ToggleGroup label={t("trial.changedMind")} value={changedMind === null ? null : String(changedMind)} options={["true", "false"]} labelFn={o => o === "true" ? t("trial.yes") : t("trial.no")} onChange={v => setChangedMind(v === "true")} />
              )}

              <Button onClick={handleSubmit} disabled={revisedFindings.length === 0 || isSubmitting} className="w-full h-10 rounded text-sm">
                <Send className="w-4 h-4 mr-2" /> {t("trial.submitNext")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const SliderField = ({ label, value, onChange, minLabel, maxLabel }: { label: string; value: number; onChange: (v: number) => void; minLabel?: string; maxLabel?: string }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
      <span className="text-sm text-primary font-mono font-medium">{value}%</span>
    </div>
      <Slider
        value={[value]}
        min={0}
        max={100}
        step={1}
        onValueChange={(vals) => onChange(vals[0] ?? 0)}
        className="w-full"
      />
    {(minLabel || maxLabel) && (
      <div className="flex justify-between text-xs text-muted-foreground/60">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    )}
  </div>
);

const ToggleGroup = ({ label, value, options, labelFn, onChange }: { label: string; value: string | null; options: string[]; labelFn: (o: string) => string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
    <div className="flex gap-px bg-border rounded overflow-hidden">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex-1 h-8 text-xs font-medium transition-all ${
            value === opt ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-accent"
          }`}
        >
          {labelFn(opt)}
        </button>
      ))}
    </div>
  </div>
);

export default TrialScreen;
