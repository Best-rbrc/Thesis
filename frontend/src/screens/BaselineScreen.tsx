import { useState, useRef } from "react";
import { Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStudy } from "@/context/useStudy";
import { FINDINGS } from "@/data/mockData";
import StudyCheckbox from "@/components/StudyCheckbox";
import SystemHeader from "@/components/SystemHeader";
import { Slider } from "@/components/ui/slider";

const NO_FINDING_ID = "__no_finding__";

const BaselineScreen = () => {
  const { baselineCases, addBaselineResponse, setBaselineAccuracy, setScreen, t } = useStudy();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedFindings, setSelectedFindings] = useState<string[]>([]);
  const [confidence, setConfidence] = useState(50);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const startTime = useRef(Date.now());
  const correctCounts = useRef(0);
  const totalLabels = useRef(0);

  const currentCase = baselineCases[currentIdx];
  const isLast = currentIdx === baselineCases.length - 1;
  const progress = ((currentIdx + (submitted ? 1 : 0)) / baselineCases.length) * 100;

  const toggleFinding = (id: string) => {
    setSelectedFindings(prev => {
      if (id === NO_FINDING_ID) return prev.includes(NO_FINDING_ID) ? [] : [NO_FINDING_ID];
      const withoutNone = prev.filter(f => f !== NO_FINDING_ID);
      return withoutNone.includes(id) ? withoutNone.filter(f => f !== id) : [...withoutNone, id];
    });
  };

  const normalizedFindings = selectedFindings.filter(id => id !== NO_FINDING_ID);

  const handleSubmit = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    addBaselineResponse({
      caseId: currentCase.id, condition: "A", category: "baseline",
      groundTruth: currentCase.groundTruth, aiPredictions: currentCase.aiPredictions,
      initialFindings: normalizedFindings, initialConfidence: confidence,
      responseTimePreMs: Date.now() - startTime.current,
    });
    let correct = 0;
    FINDINGS.forEach(f => {
      if (normalizedFindings.includes(f.id) === currentCase.groundTruth.includes(f.id)) correct++;
    });
    correctCounts.current += correct;
    totalLabels.current += FINDINGS.length;
    setSubmitted(true);
    setIsSubmitting(false);
  };

  const handleNext = () => {
    if (isLast) {
      const accuracy = totalLabels.current > 0 ? correctCounts.current / totalLabels.current : 0;
      setBaselineAccuracy(Math.round(accuracy * 100) / 100);
      setScreen("pre-survey");
    } else {
      setCurrentIdx(prev => prev + 1);
      setSelectedFindings([]);
      setConfidence(50);
      setSubmitted(false);
      startTime.current = Date.now();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SystemHeader
        breadcrumb={`${t("baseline.case")} ${currentIdx + 1} / ${baselineCases.length}`}
        progress={progress}
      />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:flex-1 bg-black/20 flex flex-col items-center justify-center p-4 sm:p-6 relative">
          <p className="text-xs text-muted-foreground mb-3">{t("baseline.subtitle")}</p>
          <div className="relative w-full max-w-lg aspect-square bg-black rounded overflow-hidden border border-border/50">
            <img src={currentCase.imageUrl} alt={`Baseline X-ray ${currentIdx + 1}`} className="w-full h-full object-contain" />
            <div className="absolute top-2 left-2 text-[10px] text-muted-foreground/40 font-mono leading-tight">
              <div>CASE {String(currentIdx + 1).padStart(3, "0")}</div>
              <div>BASELINE</div>
            </div>
          </div>
        </div>

        <div className="lg:w-[400px] border-l border-border bg-card/30 p-4 sm:p-5 space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t("trial.selectFindings")}</h3>
            <div className="space-y-2">
              {FINDINGS.map(f => (
                <StudyCheckbox
                  key={f.id}
                  checked={selectedFindings.includes(f.id)}
                  onChange={() => !submitted && toggleFinding(f.id)}
                  label={t(`finding.${f.id}`)}
                  description={t(`finding.${f.id}.desc`)}
                />
              ))}
              <div className="border-t border-border/50 pt-2">
                <StudyCheckbox
                  checked={selectedFindings.includes(NO_FINDING_ID)}
                  onChange={() => !submitted && toggleFinding(NO_FINDING_ID)}
                  label={t("finding.none")}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("trial.confidence")}</label>
              <span className="text-sm text-primary font-mono font-medium">{confidence}%</span>
            </div>
            <Slider
              value={[confidence]}
              min={0}
              max={100}
              step={1}
              disabled={submitted}
              onValueChange={(vals) => !submitted && setConfidence(vals[0] ?? 0)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60">
              <span>{t("trial.notConfident")}</span>
              <span>{t("trial.veryConfident")}</span>
            </div>
          </div>

          {!submitted ? (
            <Button onClick={handleSubmit} disabled={selectedFindings.length === 0 || isSubmitting} className="w-full h-10 rounded text-sm">
              <Send className="w-4 h-4 mr-2" /> {t("baseline.submit")}
            </Button>
          ) : (
            <Button onClick={handleNext} className="w-full h-10 rounded text-sm">
              {isLast ? t("baseline.finish") : t("baseline.next")} <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BaselineScreen;
