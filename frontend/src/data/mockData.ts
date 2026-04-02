export interface Finding {
  id: string;
  name: string;
  description: string;
}

export const FINDINGS: Finding[] = [
  { id: "cardiomegaly", name: "Cardiomegaly", description: "Enlarged heart silhouette" },
  { id: "edema", name: "Pulmonary Edema", description: "Fluid in the lungs" },
  { id: "consolidation", name: "Consolidation", description: "Dense opacity in lung tissue" },
  { id: "atelectasis", name: "Atelectasis", description: "Partial lung collapse" },
  { id: "pleural_effusion", name: "Pleural Effusion", description: "Fluid around the lungs" },
];

export type StudyCondition = "A" | "B" | "C" | "D" | "E";
export type CaseCategory = "easy" | "hard" | "incidental" | "ai_wrong" | "baseline" | "attention_check";

export interface AIPrediction {
  findingId: string;
  confidence: number;
}

export interface CaseMetadata {
  age?: number;
  sex?: string;
  view?: "AP" | "PA";
}

export interface CaseOverlays {
  gradcam: Record<string, string>; // finding_id → transparent RGBA PNG url
  intgrad: Record<string, string>;
}

export interface CaseData {
  id: string;
  imageUrl: string;
  condition: StudyCondition;
  aiPredictions: AIPrediction[];
  biasWarning?: string;
  groundTruth: string[];
  category: CaseCategory;
  metadata?: CaseMetadata;
  overlays?: CaseOverlays;
  isAttentionCheck?: boolean;
}

// Real CheXpert cases with per-finding DenseNet-121 explainability overlays.
// All study cases currently cycle through these 3 patients; swap per-case when
// real per-case assets are generated.
const STUDY_FINDINGS = ["cardiomegaly", "edema", "consolidation", "atelectasis", "pleural_effusion"] as const;

const makeOverlays = (prefix: string): CaseOverlays => ({
  gradcam: Object.fromEntries(STUDY_FINDINGS.map(f => [f, `/cases/${prefix}_gradcam_${f}.png`])),
  intgrad: Object.fromEntries(STUDY_FINDINGS.map(f => [f, `/cases/${prefix}_intgrad_${f}.png`])),
});

const CASES = [
  { imageUrl: "/cases/patient00082_xray.jpg", overlays: makeOverlays("patient00082_study1_view1_frontal") },
  { imageUrl: "/cases/patient35759_xray.jpg", overlays: makeOverlays("patient35759_study9_view1_frontal") },
  { imageUrl: "/cases/patient38491_xray.jpg", overlays: makeOverlays("patient38491_study5_view1_frontal") },
];

const img = (n: number) => CASES[n % CASES.length];

// Attention check case - obvious cardiomegaly with very high AI confidence
export const ATTENTION_CHECK_CASE: CaseData = {
  id: "attention-check-01",
  ...img(0),
  condition: "B",
  category: "attention_check",
  isAttentionCheck: true,
  aiPredictions: [
    { findingId: "cardiomegaly", confidence: 97 },
    { findingId: "edema", confidence: 3 },
    { findingId: "consolidation", confidence: 2 },
    { findingId: "atelectasis", confidence: 1 },
    { findingId: "pleural_effusion", confidence: 5 },
  ],
  groundTruth: ["cardiomegaly"],
  metadata: { age: 65, sex: "M", view: "PA" },
};

// 4 baseline cases (unassisted mini-test)
export const BASELINE_CASES: CaseData[] = [
  {
    id: "baseline-01", imageUrl: img(0).imageUrl, condition: "A", category: "baseline",
    aiPredictions: [], groundTruth: ["cardiomegaly"],
    metadata: { age: 55, sex: "M", view: "PA" },
  },
  {
    id: "baseline-02", imageUrl: img(1).imageUrl, condition: "A", category: "baseline",
    aiPredictions: [], groundTruth: ["edema", "pleural_effusion"],
    metadata: { age: 72, sex: "F", view: "AP" },
  },
  {
    id: "baseline-03", imageUrl: img(2).imageUrl, condition: "A", category: "baseline",
    aiPredictions: [], groundTruth: ["consolidation"],
    metadata: { age: 34, sex: "M", view: "PA" },
  },
  {
    id: "baseline-04", imageUrl: img(0).imageUrl, condition: "A", category: "baseline",
    aiPredictions: [], groundTruth: ["atelectasis", "cardiomegaly"],
    metadata: { age: 68, sex: "F", view: "PA" },
  },
];

// Pool of 24 main study cases
const makePreds = (c: number, e: number, co: number, a: number, p: number): AIPrediction[] => [
  { findingId: "cardiomegaly", confidence: c },
  { findingId: "edema", confidence: e },
  { findingId: "consolidation", confidence: co },
  { findingId: "atelectasis", confidence: a },
  { findingId: "pleural_effusion", confidence: p },
];

export const CASE_POOL: CaseData[] = [
  // --- Easy cases (4) ---
  { id: "case-01", ...img(0), condition: "A", category: "easy", aiPredictions: makePreds(92, 8, 5, 10, 12), groundTruth: ["cardiomegaly"], metadata: { age: 60, sex: "M", view: "PA" } },
  { id: "case-02", ...img(1), condition: "A", category: "easy", aiPredictions: makePreds(10, 88, 15, 8, 20), groundTruth: ["edema"], metadata: { age: 45, sex: "F", view: "PA" } },
  { id: "case-03", ...img(2), condition: "B", category: "easy", aiPredictions: makePreds(5, 12, 90, 8, 10), groundTruth: ["consolidation"], metadata: { age: 38, sex: "M", view: "PA" } },
  { id: "case-04", ...img(0), condition: "B", category: "easy", aiPredictions: makePreds(8, 10, 6, 5, 91), groundTruth: ["pleural_effusion"], metadata: { age: 52, sex: "F", view: "PA" } },

  // --- Hard cases (8) ---
  { id: "case-05", ...img(1), condition: "A", category: "hard", aiPredictions: makePreds(62, 28, 15, 55, 20), groundTruth: ["cardiomegaly", "atelectasis"], metadata: { age: 70, sex: "M", view: "PA" } },
  { id: "case-06", ...img(2), condition: "A", category: "hard", aiPredictions: makePreds(18, 65, 58, 12, 30), groundTruth: ["edema", "consolidation"], metadata: { age: 55, sex: "F", view: "AP" } },
  { id: "case-07", ...img(0), condition: "B", category: "hard", aiPredictions: makePreds(55, 20, 60, 68, 25), groundTruth: ["consolidation", "atelectasis"], metadata: { age: 48, sex: "M", view: "PA" } },
  { id: "case-08", ...img(1), condition: "B", category: "hard", aiPredictions: makePreds(25, 58, 15, 10, 65), groundTruth: ["edema", "pleural_effusion"], metadata: { age: 62, sex: "F", view: "PA" } },
  { id: "case-09", ...img(2), condition: "C", category: "hard", aiPredictions: makePreds(68, 22, 12, 60, 55), groundTruth: ["cardiomegaly", "pleural_effusion"], metadata: { age: 74, sex: "M", view: "AP" } },
  { id: "case-10", ...img(0), condition: "C", category: "hard", aiPredictions: makePreds(15, 62, 70, 18, 25), groundTruth: ["edema", "consolidation"], metadata: { age: 42, sex: "F", view: "PA" } },
  { id: "case-11", ...img(1), condition: "D", category: "hard", aiPredictions: makePreds(58, 20, 55, 65, 18), groundTruth: ["atelectasis", "consolidation"], metadata: { age: 82, sex: "M", view: "AP" }, biasWarning: "⚠ AP image · Patient age: 82 · Model performance is ~8% lower for elderly bedside patients" },
  { id: "case-12", ...img(2), condition: "D", category: "hard", aiPredictions: makePreds(22, 60, 18, 12, 68), groundTruth: ["edema", "pleural_effusion"], metadata: { age: 78, sex: "F", view: "PA" } },

  // --- Incidental cases (8) ---
  { id: "case-13", ...img(0), condition: "A", category: "incidental", aiPredictions: makePreds(85, 10, 8, 45, 72), groundTruth: ["cardiomegaly", "pleural_effusion"], metadata: { age: 66, sex: "M", view: "PA" } },
  { id: "case-14", ...img(1), condition: "A", category: "incidental", aiPredictions: makePreds(20, 78, 65, 10, 30), groundTruth: ["edema", "consolidation"], metadata: { age: 50, sex: "F", view: "PA" } },
  { id: "case-15", ...img(2), condition: "B", category: "incidental", aiPredictions: makePreds(70, 55, 15, 60, 25), groundTruth: ["cardiomegaly", "edema", "atelectasis"], metadata: { age: 58, sex: "M", view: "PA" } },
  { id: "case-16", ...img(0), condition: "B", category: "incidental", aiPredictions: makePreds(12, 30, 82, 5, 90), groundTruth: ["consolidation", "pleural_effusion"], metadata: { age: 44, sex: "F", view: "AP" } },
  { id: "case-17", ...img(1), condition: "C", category: "incidental", aiPredictions: makePreds(45, 10, 92, 78, 55), groundTruth: ["consolidation", "atelectasis", "pleural_effusion"], metadata: { age: 71, sex: "M", view: "PA" } },
  { id: "case-18", ...img(2), condition: "C", category: "incidental", aiPredictions: makePreds(80, 65, 25, 60, 15), groundTruth: ["cardiomegaly", "edema", "atelectasis"], metadata: { age: 63, sex: "F", view: "PA" } },
  { id: "case-19", ...img(0), condition: "D", category: "incidental", aiPredictions: makePreds(35, 90, 70, 50, 25), groundTruth: ["edema", "consolidation"], metadata: { age: 85, sex: "M", view: "AP" }, biasWarning: "⚠ AP image · Patient age: 85 · Model performance is ~8% lower for elderly bedside patients" },
  { id: "case-20", ...img(1), condition: "D", category: "incidental", aiPredictions: makePreds(75, 20, 15, 88, 60), groundTruth: ["cardiomegaly", "atelectasis", "pleural_effusion"], metadata: { age: 40, sex: "F", view: "PA" } },

  // --- AI-wrong cases (4) ---
  { id: "case-21", ...img(2), condition: "B", category: "ai_wrong", aiPredictions: makePreds(88, 82, 10, 15, 20), groundTruth: ["consolidation"], metadata: { age: 56, sex: "M", view: "PA" } },
  { id: "case-22", ...img(0), condition: "C", category: "ai_wrong", aiPredictions: makePreds(12, 85, 80, 8, 10), groundTruth: ["pleural_effusion", "atelectasis"], metadata: { age: 65, sex: "F", view: "PA" } },
  { id: "case-23", ...img(1), condition: "D", category: "ai_wrong", aiPredictions: makePreds(90, 10, 8, 78, 15), groundTruth: ["edema"], metadata: { age: 76, sex: "M", view: "AP" }, biasWarning: "⚠ AP (bedside) image · Model performance is ~4% lower for AP vs. PA images" },
  { id: "case-24", ...img(2), condition: "C", category: "ai_wrong", aiPredictions: makePreds(15, 12, 88, 85, 20), groundTruth: ["cardiomegaly"], metadata: { age: 33, sex: "F", view: "PA" } },
];

// Latin-square condition orderings (5 conditions)
const LATIN_SQUARES: StudyCondition[][] = [
  ["A", "B", "C", "D", "E"],
  ["B", "C", "D", "E", "A"],
  ["C", "D", "E", "A", "B"],
  ["D", "E", "A", "B", "C"],
  ["E", "A", "B", "C", "D"],
];

export function generateCaseOrder(sessionIndex: number, nCases: number): CaseData[] {
  const conditionOrder = LATIN_SQUARES[sessionIndex % 5];
  const casesPerCondition = Math.floor(nCases / 5);
  const result: CaseData[] = [];

  for (const condition of conditionOrder) {
    const available = [...CASE_POOL];
    const selected: CaseData[] = [];
    let idx = 0;

    while (selected.length < casesPerCondition && idx < available.length) {
      selected.push({ ...available[idx], condition });
      idx++;
    }

    while (selected.length < casesPerCondition) {
      selected.push({ ...available[selected.length % available.length], condition, id: `${available[selected.length % available.length].id}-dup-${selected.length}` });
    }

    result.push(...selected.slice(0, casesPerCondition));
  }

  return result;
}

export const TOTAL_BLOCKS = 4;
