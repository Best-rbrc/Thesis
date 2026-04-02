import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useStudy } from "@/context/useStudy";
import SystemHeader from "@/components/SystemHeader";

const JIAN_ITEMS = ["jian.1", "jian.2", "jian.3", "jian.4", "jian.5", "jian.6"];

const PreSurveyScreen = () => {
  const { setScreen, setPreTrustItems, t, jianItemOrder, sessionCode } = useStudy();
  const [ratings, setRatings] = useState<number[]>(new Array(6).fill(4));

  // Randomized display order
  const displayOrder = useMemo(() => jianItemOrder, [jianItemOrder]);

  const setRating = (displayIndex: number, value: number) => {
    const originalIndex = displayOrder[displayIndex];
    setRatings(prev => { const next = [...prev]; next[originalIndex] = value; return next; });
  };

  const getRating = (displayIndex: number) => {
    return ratings[displayOrder[displayIndex]];
  };

  const handleContinue = () => {
    setPreTrustItems(ratings);
    setScreen("tutorial");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SystemHeader breadcrumb="Pre-Survey" />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-5 py-6 space-y-5 animate-fade-in">
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("presurvey.title")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("presurvey.subtitle")}</p>
          </div>

          <div className="glass-panel p-4 sm:p-5 space-y-5">
            {displayOrder.map((originalIdx, displayIdx) => (
              <div key={JIAN_ITEMS[originalIdx]} className="space-y-2">
                <p className="text-sm text-foreground font-medium">{t(JIAN_ITEMS[originalIdx])}</p>
                <div className="flex gap-px bg-border rounded overflow-hidden">
                  {[1, 2, 3, 4, 5, 6, 7].map(val => (
                    <button
                      key={val}
                      onClick={() => setRating(displayIdx, val)}
                      className={`flex-1 h-8 text-xs font-medium transition-all ${
                        getRating(displayIdx) === val
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground hover:bg-accent"
                      }`}
                    >
                      {val}
                    </button>
                  ))}
                </div>
                {displayIdx === 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground/60">
                    <span>{t("presurvey.scale.1")}</span>
                    <span>{t("presurvey.scale.7")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <button onClick={handleContinue} className="w-full h-10 rounded text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all flex items-center justify-center gap-1">
            {t("presurvey.continue")} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreSurveyScreen;
