import { useState, useCallback, useEffect, type ReactNode } from "react";
import { BASELINE_CASES, CASE_POOL, TOTAL_BLOCKS, LATIN_SQUARES, generateCaseOrder, ATTENTION_CHECK_CASE, type CaseData } from "@/data/mockData";
import { studyDataService } from "@/services/studyDataService";
import { toast } from "sonner";
import { StudyContext } from "./study-context";
import type { BlockSurvey, CaseResponse, Language, Screen, StudyState, UserProfile } from "./study-types";

const translations: Record<string, Record<Language, string>> = {
  // Landing
  "app.title": { en: "CheXStudy", de: "CheXStudy" },
  "app.subtitle": { en: "AI-Assisted Chest X-Ray Study", de: "KI-unterstützte Röntgen-Thorax-Studie" },
  "landing.headline": { en: "How does AI change the way we read chest X-rays?", de: "Wie verändert KI die Befundung von Röntgen-Thorax-Aufnahmen?" },
  "landing.description": { en: "Participate in a scientific study exploring how AI-generated predictions and visual explanations influence diagnostic decisions in radiology.", de: "Nimm an einer wissenschaftlichen Studie teil, die untersucht, wie KI-generierte Vorhersagen und visuelle Erklärungen diagnostische Entscheidungen in der Radiologie beeinflussen." },
  "landing.start": { en: "Start the Study", de: "Studie starten" },
  "landing.duration": { en: "10–30 min", de: "10–30 Min." },
  "landing.anonymous": { en: "Fully anonymous", de: "Vollständig anonym" },
  "landing.noAccount": { en: "No account needed", de: "Kein Konto nötig" },
  "landing.thesis": { en: "Bachelor's Thesis Research", de: "Forschung im Rahmen einer Bachelorarbeit" },
  "landing.feature1.title": { en: "Analyze X-Rays", de: "Röntgenbilder analysieren" },
  "landing.feature1.desc": { en: "Review real chest X-ray cases and identify clinical findings", de: "Echte Röntgen-Thorax-Fälle untersuchen und klinische Befunde identifizieren" },
  "landing.feature2.title": { en: "AI Assistance", de: "KI-Unterstützung" },
  "landing.feature2.desc": { en: "See how an AI model interprets the same images with confidence scores", de: "Schau, wie ein KI-Modell dieselben Bilder mit Wahrscheinlichkeitswerten interpretiert" },
  "landing.feature3.title": { en: "Visual Explanations", de: "Visuelle Erklärungen" },
  "landing.feature3.desc": { en: "Explore Grad-CAM heatmaps showing where the AI focuses its attention", de: "Erkunde Grad-CAM-Heatmaps, die zeigen, worauf die KI ihre Aufmerksamkeit richtet" },
  // Welcome
  "welcome.time": { en: "How much time do you have?", de: "Wie viel Zeit hast du?" },
  "welcome.background": { en: "Your Background", de: "Dein Hintergrund" },
  "welcome.experience": { en: "Medical experience", de: "Medizinische Erfahrung" },
  "welcome.ageRange": { en: "Age range", de: "Altersgruppe" },
  "age.under25": { en: "Under 25", de: "Unter 25" },
  "age.25-34": { en: "25–34", de: "25–34" },
  "age.35-44": { en: "35–44", de: "35–44" },
  "age.45-54": { en: "45–54", de: "45–54" },
  "age.55plus": { en: "55 or older", de: "55 oder älter" },
  "age.preferNot": { en: "Prefer not to say", de: "Keine Angabe" },
  "welcome.sex": { en: "Sex", de: "Geschlecht" },
  "sex.male": { en: "Male", de: "Männlich" },
  "sex.female": { en: "Female", de: "Weiblich" },
  "sex.other": { en: "Other / Non-binary", de: "Divers / Nicht-binär" },
  "sex.preferNot": { en: "Prefer not to say", de: "Keine Angabe" },
  "welcome.semester": { en: "Current semester", de: "Aktuelles Semester" },
  "welcome.yearsExp": { en: "Years of experience", de: "Berufserfahrung" },
  "welcome.xrayExp": { en: "Experience with chest X-rays", de: "Erfahrung mit Röntgen-Thorax-Bildern" },
  "welcome.aiGeneral": { en: "General AI tool usage", de: "Allgemeine KI-Tool-Nutzung" },
  "welcome.aiMedicine": { en: "AI tool usage in medicine", de: "KI-Tool-Nutzung in der Medizin" },
  "welcome.aiCurrentUse": { en: "What do you currently use AI for?", de: "Wofür nutzt du KI derzeit?" },
  "welcome.consent": { en: "I consent to participate in this study. My anonymized responses will be used for research purposes only.", de: "Ich stimme der Teilnahme an dieser Studie zu. Meine anonymisierten Antworten werden ausschließlich für Forschungszwecke verwendet." },
  "welcome.begin": { en: "Begin Study", de: "Studie starten" },
  // Experience options
  "exp.none": { en: "No medical background", de: "Kein medizinischer Hintergrund" },
  "exp.student": { en: "Medical student", de: "Medizinstudent/in" },
  "exp.resident": { en: "Resident/Attending", de: "Assistenzarzt/Facharzt" },
  "exp.other": { en: "Other healthcare", de: "Anderer Gesundheitsberuf" },
  // Country
  "welcome.country": { en: "Country", de: "Land" },
  "country.austria": { en: "Austria", de: "Österreich" },
  "country.germany": { en: "Germany", de: "Deutschland" },
  "country.switzerland": { en: "Switzerland", de: "Schweiz" },
  "country.other": { en: "Other country…", de: "Anderes Land…" },
  // Semester – Austria (Diplomstudium Humanmedizin, 3 Abschnitte)
  "sem.at.1abschnitt": { en: "1st section (Sem. 1–2)", de: "1. Abschnitt (1.–2. Semester)" },
  "sem.at.2abschnitt.early": { en: "2nd section, early (Sem. 3–5)", de: "2. Abschnitt, früh (3.–5. Semester)" },
  "sem.at.2abschnitt.late": { en: "2nd section, late (Sem. 6–8)", de: "2. Abschnitt, spät (6.–8. Semester)" },
  "sem.at.3abschnitt": { en: "3rd section / KPJ (Sem. 9–12)", de: "3. Abschnitt / KPJ (9.–12. Semester)" },
  // Semester – Germany
  "sem.de.preclinical": { en: "Preclinical (Sem. 1–4)", de: "Vorklinik (1.–4. Sem.)" },
  "sem.de.clinical": { en: "Clinical (Sem. 5–10)", de: "Klinik (5.–10. Sem.)" },
  "sem.de.pj": { en: "Practical year (PJ)", de: "Praktisches Jahr (PJ)" },
  // Semester – Switzerland
  "sem.ch.bachelor": { en: "Bachelor (Year 1–3)", de: "Bachelor (Jahr 1–3)" },
  "sem.ch.master": { en: "Master (Year 4–6)", de: "Master (Jahr 4–6)" },
  // Semester – Other
  "sem.other.early": { en: "Early (Year 1–3)", de: "Früh (Jahr 1–3)" },
  "sem.other.late": { en: "Late (Year 4+)", de: "Spät (Jahr 4+)" },
  "sem.0-2y": { en: "0–2 years", de: "0–2 Jahre" },
  "sem.3-5y": { en: "3–5 years", de: "3–5 Jahre" },
  "sem.5y+": { en: "5+ years", de: "5+ Jahre" },
  "sem.na": { en: "N/A", de: "Nicht zutreffend" },
  // Specialty
  "welcome.specialty": { en: "Specialty / Department (select all that apply)", de: "Fachrichtung / Abteilung (Mehrfachauswahl möglich)" },
  "spec.radiology": { en: "Radiology", de: "Radiologie" },
  "spec.internal": { en: "Internal Medicine", de: "Innere Medizin" },
  "spec.surgery": { en: "Surgery", de: "Chirurgie" },
  "spec.emergency": { en: "Emergency Medicine", de: "Notfallmedizin" },
  "spec.pulmonology": { en: "Pulmonology", de: "Pneumologie" },
  "spec.cardiology": { en: "Cardiology", de: "Kardiologie" },
  "spec.anesthesia": { en: "Anesthesiology", de: "Anästhesiologie" },
  "spec.pediatrics": { en: "Pediatrics", de: "Pädiatrie" },
  "spec.orthopedics": { en: "Orthopedics", de: "Orthopädie" },
  "spec.neurology": { en: "Neurology", de: "Neurologie" },
  "spec.oncology": { en: "Oncology", de: "Onkologie" },
  "spec.generalPractice": { en: "General Practice / Family Medicine", de: "Allgemeinmedizin" },
  "spec.intensiveCare": { en: "Intensive Care", de: "Intensivmedizin" },
  "spec.pathology": { en: "Pathology", de: "Pathologie" },
  "spec.other": { en: "Other", de: "Andere" },
  "spec.na": { en: "N/A", de: "Nicht zutreffend" },
  // X-ray experience
  "xray.none": { en: "None", de: "Keine" },
  "xray.few": { en: "Seen a few (<20)", de: "Wenige gesehen (<20)" },
  "xray.moderate": { en: "Moderate (20–100)", de: "Mittel (20–100)" },
  "xray.experienced": { en: "Experienced (100+)", de: "Erfahren (100+)" },
  // X-ray volume
  "welcome.xrayVolume": { en: "Chest X-rays reviewed per month (approx.)", de: "Röntgen-Thorax-Bilder pro Monat (ca.)" },
  "xrayVol.0": { en: "0", de: "0" },
  "xrayVol.1-5": { en: "1–5", de: "1–5" },
  "xrayVol.6-20": { en: "6–20", de: "6–20" },
  "xrayVol.21-50": { en: "21–50", de: "21–50" },
  "xrayVol.51-200": { en: "51–200", de: "51–200" },
  "xrayVol.200+": { en: "200+", de: "200+" },
  // AI usage general
  "ai.never": { en: "Never", de: "Nie" },
  "ai.rarely": { en: "Rarely", de: "Selten" },
  "ai.weekly": { en: "Weekly", de: "Wöchentlich" },
  "ai.daily": { en: "Daily", de: "Täglich" },
  // AI usage medicine
  "aiMed.never": { en: "Never", de: "Nie" },
  "aiMed.tried": { en: "Tried once or twice", de: "Ein-/zweimal ausprobiert" },
  "aiMed.occasionally": { en: "Occasionally", de: "Gelegentlich" },
  "aiMed.regularly": { en: "Regularly", de: "Regelmäßig" },
  // AI current use
  "aiUse.research": { en: "Literature research", de: "Literaturrecherche" },
  "aiUse.writing": { en: "Writing / summarizing", de: "Schreiben / Zusammenfassen" },
  "aiUse.diagnostics": { en: "Diagnostic support", de: "Diagnostische Unterstützung" },
  "aiUse.learning": { en: "Learning / studying", de: "Lernen / Studium" },
  "aiUse.coding": { en: "Programming / data", de: "Programmieren / Daten" },
  "aiUse.none": { en: "I don't use AI", de: "Ich nutze keine KI" },
  // AI knowledge level
  "welcome.aiKnowledge": { en: "How well do you understand how AI/ML works?", de: "Wie gut verstehst du die Funktionsweise von KI/ML?" },
  "aiKnow.none": { en: "No understanding", de: "Kein Verständnis" },
  "aiKnow.basic": { en: "Basic concepts", de: "Grundkonzepte" },
  "aiKnow.good": { en: "Good understanding", de: "Gutes Verständnis" },
  "aiKnow.expert": { en: "Expert-level", de: "Expertenniveau" },
  // CDSS experience
  "welcome.cdss": { en: "Experience with clinical decision support systems", de: "Erfahrung mit Systemen zur klinischen Entscheidungsunterstützung" },
  "cdss.never": { en: "Never heard of", de: "Nie davon gehört" },
  "cdss.heard": { en: "Heard of, never used", de: "Davon gehört, nie genutzt" },
  "cdss.tried": { en: "Used once or twice", de: "Ein-/zweimal genutzt" },
  "cdss.regular": { en: "Use regularly", de: "Nutze regelmäßig" },
  // AI attitude
  "welcome.aiAttitude": { en: "Your attitude toward AI in clinical practice", de: "Deine Einstellung zu KI in der klinischen Praxis" },
  "aiAtt.verySkeptical": { en: "Very skeptical", de: "Sehr skeptisch" },
  "aiAtt.skeptical": { en: "Somewhat skeptical", de: "Eher skeptisch" },
  "aiAtt.neutral": { en: "Neutral", de: "Neutral" },
  "aiAtt.positive": { en: "Somewhat positive", de: "Eher positiv" },
  "aiAtt.veryPositive": { en: "Very positive", de: "Sehr positiv" },
  // AI training
  "welcome.aiTraining": { en: "Formal AI/ML training", de: "Formale KI/ML-Ausbildung" },
  "aiTrain.none": { en: "No formal training", de: "Keine formale Ausbildung" },
  "aiTrain.self": { en: "Self-taught (online)", de: "Autodidaktisch (online)" },
  "aiTrain.workshop": { en: "Workshop / seminar", de: "Workshop / Seminar" },
  "aiTrain.course": { en: "University course", de: "Universitätskurs" },
  // Baseline
  "baseline.title": { en: "Getting Familiar with the Viewer", de: "Den Viewer kennenlernen" },
  "baseline.subtitle": { en: "Look at these 4 X-rays and select the findings you observe. There is no AI assistance.", de: "Schau dir diese 4 Röntgenbilder an und wähle die Befunde aus. Es gibt keine KI-Unterstützung." },
  "baseline.case": { en: "Practice Case", de: "Übungsfall" },
  "baseline.submit": { en: "Submit", de: "Absenden" },
  "baseline.next": { en: "Next Case", de: "Nächster Fall" },
  "baseline.finish": { en: "Continue to Survey", de: "Weiter zur Befragung" },
  // Pre-survey
  "presurvey.title": { en: "Attitudes Toward AI in Diagnosis", de: "Einstellung zu KI in der Diagnostik" },
  "presurvey.subtitle": { en: "Before you begin, please rate how much you agree with the following statements about AI-based diagnostic tools in general.", de: "Bevor du beginnst, bewerte bitte, inwieweit du den folgenden Aussagen über KI-basierte Diagnosewerkzeuge im Allgemeinen zustimmst." },
  "presurvey.continue": { en: "Continue to Cases", de: "Weiter zu den Fällen" },
  "presurvey.scale.1": { en: "Strongly disagree", de: "Stimme gar nicht zu" },
  "presurvey.scale.7": { en: "Strongly agree", de: "Stimme voll zu" },
  // Jian et al. (2000) trust/distrust scale — adapted for AI diagnostic tools
  // Items 1–5: distrust (negatively worded); Items 6–9: trust (positively worded)
  "jian.1": { en: "AI diagnostic tools can be deceptive", de: "KI-basierte Diagnosewerkzeuge können irreführend sein" },
  "jian.2": { en: "AI diagnostic tools may behave in underhanded ways", de: "KI-basierte Diagnosewerkzeuge können sich auf hinterhältige Weise verhalten" },
  "jian.3": { en: "I am suspicious of the intent behind AI diagnostic tools", de: "Ich bin misstrauisch gegenüber der Absicht hinter KI-basierten Diagnosewerkzeugen" },
  "jian.4": { en: "I am wary of AI diagnostic tools", de: "Ich stehe KI-basierten Diagnosewerkzeugen skeptisch gegenüber" },
  "jian.5": { en: "AI diagnostic tools could lead to harmful outcomes", de: "KI-basierte Diagnosewerkzeuge könnten zu schädlichen Ergebnissen führen" },
  "jian.6": { en: "I am confident in AI diagnostic tools", de: "Ich habe Vertrauen in KI-basierte Diagnosewerkzeuge" },
  "jian.7": { en: "AI diagnostic tools are reliable", de: "KI-basierte Diagnosewerkzeuge sind zuverlässig" },
  "jian.8": { en: "AI diagnostic tools are dependable", de: "KI-basierte Diagnosewerkzeuge sind verlässlich" },
  "jian.9": { en: "AI diagnostic tools have integrity", de: "KI-basierte Diagnosewerkzeuge handeln verantwortungsvoll" },
  // Post-study Jian items (system-specific, same structure)
  "jian.post.1": { en: "The system I just used was deceptive", de: "Das System, das ich gerade benutzt habe, war irreführend" },
  "jian.post.2": { en: "The system behaved in an underhanded manner", de: "Das System hat sich hinterhältig verhalten" },
  "jian.post.3": { en: "I am suspicious of the system's intent", de: "Ich bin misstrauisch gegenüber den Absichten des Systems" },
  "jian.post.4": { en: "I am wary of the system", de: "Ich bin dem System gegenüber skeptisch" },
  "jian.post.5": { en: "The system's actions could lead to harmful outcomes", de: "Die Aktionen des Systems könnten zu schädlichen Ergebnissen führen" },
  "jian.post.6": { en: "I am confident in the system", de: "Ich vertraue dem System" },
  "jian.post.7": { en: "The system is reliable", de: "Das System ist zuverlässig" },
  "jian.post.8": { en: "The system is dependable", de: "Das System ist verlässlich" },
  "jian.post.9": { en: "The system has integrity", de: "Das System handelt verantwortungsvoll" },
  // Interface Tutorial (pre-baseline)
  "ifTutorial.breadcrumb": { en: "Study Preparation", de: "Studienvorbereitung" },
  "ifTutorial.step1.title": { en: "Selecting Findings", de: "Befunde auswählen" },
  "ifTutorial.step1.body": { en: "For each X-ray, tick the findings you think are present. If the image looks normal, select \"No Finding\" at the bottom of the list.", de: "Markiere für jedes Röntgenbild die Befunde, die du für vorhanden hältst. Sieht das Bild unauffällig aus, wähle unten in der Liste \"Kein Befund\"." },
  "ifTutorial.step1.noFinding": { en: "No Finding", de: "Kein Befund" },
  "ifTutorial.step2.title": { en: "Rating Your Confidence", de: "Sicherheit einschätzen" },
  "ifTutorial.step2.body": { en: "After selecting findings, use the slider to rate how confident you are — 0 means completely uncertain, 100 means completely certain.", de: "Nachdem du Befunde ausgewählt hast, gib mit dem Schieberegler an, wie sicher du dir bist – 0 bedeutet völlig unsicher, 100 bedeutet völlig sicher." },
  "ifTutorial.step2.label": { en: "Confidence", de: "Sicherheit" },
  "ifTutorial.cta": { en: "Start Practice Cases", de: "Übungsfälle starten" },
  "ifTutorial.hint": { en: "These 4 practice cases have no AI assistance — they capture your baseline performance.", de: "Diese 4 Übungsfälle enthalten keine KI-Unterstützung – sie erfassen deine Ausgangsleistung." },
  // Tutorial
  "tutorial.next": { en: "Next", de: "Weiter" },
  "tutorial.back": { en: "Back", de: "Zurück" },
  "tutorial.start": { en: "Start Study", de: "Studie beginnen" },
  "tutorial.step1.title": { en: "Reading a Chest X-Ray", de: "Röntgen-Thorax lesen" },
  "tutorial.step1.intro": { en: "A chest X-ray shows the structures inside your chest. Here's what to look for (but you should probably know this better than me 😉):", de: "Ein Röntgen-Thorax zeigt die Strukturen in deinem Brustkorb. Achte auf (aber das weißt du wahrscheinlich besser als ich 😉):" },
  "tutorial.step1.heart": { en: "Heart", de: "Herz" },
  "tutorial.step1.heart.desc": { en: "Center-left, should be less than half the chest width", de: "Mittig-links, sollte weniger als die Hälfte der Thoraxbreite einnehmen" },
  "tutorial.step1.lungs": { en: "Lungs", de: "Lunge" },
  "tutorial.step1.lungs.desc": { en: "Should appear dark (air-filled) and clear", de: "Sollte dunkel (luftgefüllt) und klar erscheinen" },
  "tutorial.step1.diaphragm": { en: "Diaphragm", de: "Zwerchfell" },
  "tutorial.step1.diaphragm.desc": { en: "Dome-shaped borders at the base", de: "Kuppelförmige Begrenzung am unteren Rand" },
  "tutorial.step1.costo": { en: "Costophrenic Angles", de: "Kostodiaphragmalwinkel" },
  "tutorial.step1.costo.desc": { en: "Sharp angles where diaphragm meets chest wall", de: "Spitze Winkel, wo Zwerchfell auf Brustwand trifft" },
  "tutorial.step2.title": { en: "The Six Findings", de: "Die sechs Befunde" },
  "tutorial.step3.title": { en: "AI Predictions", de: "KI-Vorhersagen" },
  "tutorial.step3.intro": { en: "In some cases, you'll see the AI model's predictions displayed as confidence bars:", de: "In einigen Fällen werden die Vorhersagen des KI-Modells als Balken mit Wahrscheinlichkeitswerten angezeigt:" },
  "tutorial.step3.hint": { en: "Higher values mean the AI is more confident that finding is present.", de: "Je höher der Wert, desto wahrscheinlicher hält die KI das Vorliegen dieses Befunds." },
  "tutorial.step4.title": { en: "Heatmaps & Warnings", de: "Heatmaps & Warnungen" },
  "tutorial.step4.heatmap.title": { en: "Visual Explanations (Heatmaps)", de: "Visuelle Erklärungen (Heatmaps)" },
  "tutorial.step4.heatmap.desc": { en: "Colored overlays showing where the AI model focuses its attention; they show where it looks, not what it predicts. These are", de: "Farbige Überlagerungen, die zeigen, worauf das KI-Modell seine Aufmerksamkeit richtet; sie zeigen, wo es hinschaut, nicht was es vorhersagt. Diese sind" },
  "tutorial.step4.approx": { en: "approximations", de: "Annäherungen" },
  "tutorial.step4.bias.title": { en: "Bias Warnings", de: "Verzerrungswarnungen" },
  "tutorial.step4.bias.desc": { en: "Amber banners may inform you about potential AI limitations for a specific case.", de: "Gelbe Banner können dich über mögliche KI-Einschränkungen für einen bestimmten Fall informieren." },
  // Condition info modals
  "conditionInfo.A.title": { en: "No AI Assistance", de: "Ohne KI-Unterstützung" },
  "conditionInfo.A.desc": { en: "In the following cases, you will assess chest X-rays entirely on your own. No AI predictions or visual aids will be shown. Each case includes a brief clinical context to help you better understand the patient's situation.", de: "In den folgenden Fällen beurteilst du Röntgen-Thorax-Bilder vollständig eigenständig. Es werden keine KI-Vorhersagen oder visuelle Hilfen angezeigt. Jeder Fall enthält einen kurzen klinischen Kontext, der dir hilft, die Situation des Patienten besser zu verstehen." },
  "conditionInfo.B.title": { en: "AI Predictions", de: "KI-Vorhersagen" },
  "conditionInfo.B.desc": { en: "In the following cases, after locking in your initial assessment, you will see the AI model's predictions with confidence scores. You may then revise your answer. Each case includes a brief clinical context to help you better understand the patient's situation.", de: "In den folgenden Fällen siehst du nach deiner ersten Beurteilung die KI-Vorhersagen mit Wahrscheinlichkeitswerten. Du kannst deine Antwort dann überarbeiten. Jeder Fall enthält einen kurzen klinischen Kontext, der dir hilft, die Situation des Patienten besser zu verstehen." },
  "conditionInfo.C.title": { en: "AI Predictions + Heatmaps", de: "KI-Vorhersagen + Heatmaps" },
  "conditionInfo.C.desc": { en: "In the following cases, you will see AI predictions plus visual heatmaps (Grad-CAM) showing where the model focuses. You may switch between overlay views. Each case includes a brief clinical context to help you better understand the patient's situation.", de: "In den folgenden Fällen siehst du KI-Vorhersagen sowie visuelle Heatmaps (Grad-CAM), die zeigen, worauf das Modell achtet. Du kannst zwischen Overlay-Ansichten wechseln. Jeder Fall enthält einen kurzen klinischen Kontext, der dir hilft, die Situation des Patienten besser zu verstehen." },
  "conditionInfo.D.title": { en: "AI + Heatmaps + Bias Warnings", de: "KI + Heatmaps + Verzerrungswarnungen" },
  "conditionInfo.D.desc": { en: "In the following cases, you will see AI predictions, heatmaps, and (where applicable) a warning banner about potential AI limitations for the specific case. Each case includes a brief clinical context to help you better understand the patient's situation.", de: "In den folgenden Fällen siehst du KI-Vorhersagen, Heatmaps und (falls zutreffend) eine Warnung zu möglichen KI-Einschränkungen für den jeweiligen Fall. Jeder Fall enthält einen kurzen klinischen Kontext, der dir hilft, die Situation des Patienten besser zu verstehen." },
  "conditionInfo.E.title": { en: "Heatmaps Only", de: "Nur Heatmaps" },
  "conditionInfo.E.desc": { en: "In the following cases, you will see visual explanation heatmaps showing where the AI focuses, but no numeric predictions. You may then revise your answer. Each case includes a brief clinical context to help you better understand the patient's situation.", de: "In den folgenden Fällen siehst du visuelle Heatmaps, die zeigen, worauf die KI achtet, jedoch keine numerischen Vorhersagen. Du kannst deine Antwort dann überarbeiten. Jeder Fall enthält einen kurzen klinischen Kontext, der dir hilft, die Situation des Patienten besser zu verstehen." },
  "conditionInfo.dismiss": { en: "Got it", de: "Verstanden" },
  // Trial
  "trial.case": { en: "Case", de: "Fall" },
  "trial.of": { en: "of", de: "von" },
  "trial.block": { en: "Block", de: "Block" },
  "trial.phase1": { en: "Your Assessment", de: "Deine Beurteilung" },
  "trial.phase2": { en: "AI-Assisted Review", de: "KI-unterstützte Überprüfung" },
  "trial.selectFindings": { en: "Select findings you observe:", de: "Wähle beobachtete Befunde:" },
  "trial.confidence": { en: "Your confidence:", de: "Deine Sicherheit:" },
  "trial.notConfident": { en: "Not confident", de: "Unsicher" },
  "trial.veryConfident": { en: "Very confident", de: "Sehr sicher" },
  "trial.lockIn": { en: "Lock In My Answer", de: "Antwort festlegen" },
  "trial.submitAnswer": { en: "Submit Answer", de: "Antwort absenden" },
  "trial.aiPredictions": { en: "AI Model Predictions", de: "KI-Modell-Vorhersagen" },
  "trial.revise": { en: "Revise your findings:", de: "Befunde überarbeiten:" },
  "trial.revisedConfidence": { en: "Revised confidence:", de: "Überarbeitete Sicherheit:" },
  "trial.aiHelpful": { en: "Was the AI helpful?", de: "War die KI hilfreich?" },
  "trial.notAtAll": { en: "Not at all", de: "Überhaupt nicht" },
  "trial.veryHelpful": { en: "Very helpful", de: "Sehr hilfreich" },
  "trial.submitNext": { en: "Submit & Next", de: "Absenden & Weiter" },
  "trial.showHeatmap": { en: "Show AI Heatmap", de: "KI-Heatmap anzeigen" },
  "trial.hideHeatmap": { en: "Hide AI Heatmap", de: "KI-Heatmap ausblenden" },
  "trial.overlay.original": { en: "Original", de: "Original" },
  "trial.overlay.gradcam": { en: "Grad-CAM", de: "Grad-CAM" },
  "trial.overlay.intgrad": { en: "Int. Gradients", de: "Int. Gradients" },
  "trial.overlayHint": { en: "Try switching views to see where the AI focuses", de: "Wechsle die Ansicht, um zu sehen, worauf die KI achtet" },
  "trial.xaiFaithful": { en: "Was the highlighted region in the right area?", de: "War die hervorgehobene Region im richtigen Bereich?" },
  "trial.xaiFaithful.yes": { en: "Yes", de: "Ja" },
  "trial.xaiFaithful.partially": { en: "Partially", de: "Teilweise" },
  "trial.xaiFaithful.no": { en: "No", de: "Nein" },
  "trial.xaiFaithful.unsure": { en: "Not sure", de: "Unsicher" },
  "trial.xaiHelpful": { en: "Did the heatmap help?", de: "Hat die Heatmap geholfen?" },
  "trial.xaiHelpful.helped": { en: "Helped", de: "Geholfen" },
  "trial.xaiHelpful.neutral": { en: "Neutral", de: "Neutral" },
  "trial.xaiHelpful.misleading": { en: "Misleading", de: "Irreführend" },
  "trial.changedMind": { en: "Did you change your answer after seeing the AI?", de: "Hast du deine Antwort nach der KI-Ansicht geändert?" },
  "trial.yes": { en: "Yes", de: "Ja" },
  "trial.no": { en: "No", de: "Nein" },
  // Block break
  "break.title": { en: "End of Block", de: "Blockende" },
  "break.subtitle": { en: "Take a short break before continuing.", de: "Mach eine kurze Pause." },
  "break.mentalEffort": { en: "Mental demand:", de: "Geistige Beanspruchung:" },
  "break.timePressure": { en: "Time pressure:", de: "Zeitdruck:" },
  "break.frustration": { en: "Frustration:", de: "Frustration:" },
  "break.trustPulse": { en: "\"The AI system is reliable\"", de: "\"Das KI-System ist zuverlässig\"" },
  "break.continue": { en: "Continue", de: "Weiter" },
  "break.veryLow": { en: "Very low", de: "Sehr gering" },
  "break.veryHigh": { en: "Very high", de: "Sehr hoch" },
  "break.noTrust": { en: "Strongly disagree", de: "Stimme gar nicht zu" },
  "break.completeTrust": { en: "Strongly agree", de: "Stimme voll zu" },
  // Debrief
  "debrief.title": { en: "Study Complete: Final Survey", de: "Studie abgeschlossen: Abschlussbefragung" },
  "debrief.subtitle": { en: "Please rate these statements about the AI system you just used.", de: "Bitte bewerte diese Aussagen über das KI-System, das du gerade verwendet hast." },
  "debrief.comments": { en: "Additional comments", de: "Weitere Kommentare" },
  "debrief.optional": { en: "(optional)", de: "(optional)" },
  "debrief.placeholder": { en: "Share any thoughts about your experience...", de: "Teile deine Gedanken mit..." },
  "debrief.submit": { en: "Submit & Finish", de: "Absenden & Beenden" },
  "debrief.thanks": { en: "Thank You!", de: "Vielen Dank!" },
  "debrief.thanksMessage": { en: "Your responses have been recorded. Thank you for participating in this study.", de: "Deine Antworten wurden aufgezeichnet. Vielen Dank für die Teilnahme an dieser Studie." },
  // Findings
  "finding.cardiomegaly": { en: "Cardiomegaly", de: "Kardiomegalie" },
  "finding.cardiomegaly.desc": { en: "Enlarged heart silhouette", de: "Vergrößerte Herzsilhouette" },
  "finding.edema": { en: "Pulmonary Edema", de: "Lungenödem" },
  "finding.edema.desc": { en: "Fluid in the lungs", de: "Flüssigkeit in der Lunge" },
  "finding.consolidation": { en: "Consolidation", de: "Konsolidierung" },
  "finding.consolidation.desc": { en: "Dense opacity in lung tissue", de: "Dichte Verschattung im Lungengewebe" },
  "finding.atelectasis": { en: "Atelectasis", de: "Atelektase" },
  "finding.atelectasis.desc": { en: "Partial lung collapse", de: "Teilweiser Lungenkollaps" },
  "finding.pleural_effusion": { en: "Pleural Effusion", de: "Pleuraerguss" },
  "finding.pleural_effusion.desc": { en: "Fluid around the lungs", de: "Flüssigkeit um die Lunge" },
  "finding.pneumothorax": { en: "Pneumothorax", de: "Pneumothorax" },
  "finding.pneumothorax.desc": { en: "Air in the pleural space", de: "Luft im Pleuraspalt" },
  "trial.clinicalContext": { en: "Clinical Context", de: "Klinischer Kontext" },

  // Clinical context vignettes (case-specific)
  "context.attention": { en: "81M, routine pre-operative cardiac evaluation", de: "81M, kardiologische Routineuntersuchung vor Operation" },
  "context.baseline01": { en: "81M, progressive dyspnoea on exertion, known cardiac history", de: "81M, zunehmende Belastungsdyspnoe, bekannte Herzerkrankung" },
  "context.baseline02": { en: "48M, acute shortness of breath, bilateral crackles", de: "48M, akute Atemnot, bilaterale Rasselgeräusche" },
  "context.baseline03": { en: "81M, worsening breathlessness, dull right base on percussion", de: "81M, zunehmende Atemnot, gedämpfter Klopfschall rechts basal" },
  "context.baseline04": { en: "20F, routine pre-employment chest X-ray, no symptoms", de: "20W, Routine-Röntgen-Thorax vor Arbeitsantritt, keine Symptome" },
  "context.case01": { en: "81M, follow-up for known dilated cardiomyopathy", de: "81M, Verlaufskontrolle bei bekannter dilatativer Kardiomyopathie" },
  "context.case02": { en: "48M, acute dyspnoea, bilateral crackles on auscultation", de: "48M, akute Dyspnoe, bilaterale Rasselgeräusche bei Auskultation" },
  "context.case03": { en: "81M, right-sided pleuritic chest pain, reduced breath sounds at base", de: "81M, rechtsseitiger pleuritischer Brustschmerz, abgeschwächtes Atemgeräusch basal" },
  "context.case04": { en: "72M, high fever and productive cough for 5 days, suspected pneumonia", de: "72M, hohes Fieber und produktiver Husten seit 5 Tagen, Pneumonieverdacht" },
  "context.case05": { en: "67M, acute decompensated heart failure, worsening orthopnoea", de: "67M, akut dekompensierte Herzinsuffizienz, zunehmende Orthopnoe" },
  "context.case06": { en: "67M, high fever, rigors, productive cough for 4 days", de: "67M, hohes Fieber, Schüttelfrost, produktiver Husten seit 4 Tagen" },
  "context.case07": { en: "78F, progressive dyspnoea, known congestive heart failure, bilateral leg oedema", de: "78W, zunehmende Dyspnoe, bekannte Herzinsuffizienz, bilaterale Beinödeme" },
  "context.case08": { en: "78F, post-operative day 3, fever and oxygen desaturation", de: "78W, 3. postoperativer Tag, Fieber und Sauerstoffabfall" },
  "context.case09": { en: "68F, worsening leg oedema, known valvular heart disease", de: "68W, zunehmende Beinödeme, bekannter Herzklappenfehler" },
  "context.case10": { en: "68F, acute respiratory distress, suspected aspiration event", de: "68W, akute Atemnot, Aspirationsverdacht" },
  "context.case11": { en: "72M, worsening cough, haemoptysis, weight loss over 3 months", de: "72M, zunehmender Husten, Hämoptyse, Gewichtsverlust über 3 Monate" },
  "context.case12": { en: "81M, increasing breathlessness over 2 weeks, known malignancy", de: "81M, zunehmende Atemnot seit 2 Wochen, bekannte Tumorerkrankung" },
  "context.case13": { en: "61M, high fever, worsening cough, suspected hospital-acquired pneumonia", de: "61M, hohes Fieber, zunehmender Husten, Verdacht auf nosokomiale Pneumonie" },
  "context.case14": { en: "61M, acute decompensated heart failure, transferred from cardiology ward", de: "61M, akut dekompensierte Herzinsuffizienz, Verlegung von kardiologischer Station" },
  "context.case15": { en: "44F, acute heart failure exacerbation, worsening dyspnoea over 2 days", de: "44W, akute Herzinsuffizienz-Exazerbation, zunehmende Dyspnoe seit 2 Tagen" },
  "context.case16": { en: "44F, post-operative day 1 after abdominal surgery, reduced breath sounds on left", de: "44W, 1. postoperativer Tag nach Bauch-OP, abgeschwächtes Atemgeräusch links" },
  "context.case17": { en: "35F, acute respiratory distress, bilateral crackles, SpO2 88%", de: "35W, akute Atemnot, bilaterale Rasselgeräusche, SpO2 88%" },
  "context.case18": { en: "35F, routine cardiac follow-up for peripartum cardiomyopathy", de: "35W, kardiologische Verlaufskontrolle bei peripartaler Kardiomyopathie" },
  "context.case19": { en: "57M, acute pulmonary oedema, transferred from ICU", de: "57M, akutes Lungenödem, Verlegung von Intensivstation" },
  "context.case20": { en: "57M, post-intubation check, reduced breath sounds bilaterally", de: "57M, Kontrolle nach Intubation, abgeschwächtes Atemgeräusch beidseits" },
  "context.case21": { en: "68F, routine pre-operative assessment, no respiratory symptoms", de: "68W, präoperative Routineuntersuchung, keine Atemwegssymptome" },
  "context.case22": { en: "68F, chest pain evaluation, ECG unremarkable", de: "68W, Abklärung Brustschmerz, EKG unauffällig" },
  "context.case23": { en: "20F, persistent dry cough for 2 weeks, no fever", de: "20W, anhaltender trockener Husten seit 2 Wochen, kein Fieber" },
  "context.case24": { en: "20F, screening chest X-ray for international travel clearance", de: "20W, Röntgen-Thorax-Screening für Reisefreigabe" },
  // New cases for FIXED_15 / FIXED_20
  "context.fx13": { en: "79F, known chronic heart failure, routine outpatient follow-up", de: "79W, bekannte chronische Herzinsuffizienz, ambulante Routinekontrolle" },
  "context.fx14": { en: "71M, productive cough and fever, suspected community-acquired pneumonia", de: "71M, produktiver Husten und Fieber, Verdacht auf ambulant erworbene Pneumonie" },
  "context.fx15": { en: "35F, sudden onset dyspnoea, post-partum day 5", de: "35W, plötzliche Dyspnoe, 5. Tag post partum" },
  "context.fx16": { en: "25M, dilated cardiomyopathy follow-up, worsening exercise intolerance", de: "25M, dilatative Kardiomyopathie, Verlaufskontrolle, zunehmende Belastungseinschränkung" },
  "context.fx17": { en: "53F, acute decompensation, known congestive heart failure", de: "53W, akute Dekompensation bei bekannter kongestiver Herzinsuffizienz" },
  "context.fx18": { en: "57M, haemoptysis and night sweats, weight loss over 6 weeks", de: "57M, Hämoptyse und Nachtschweiß, Gewichtsverlust über 6 Wochen" },
  "context.fx19": { en: "33M, chest pain after minor trauma, SpO2 94% on room air", de: "33M, Brustschmerz nach Bagatelltrauma, SpO2 94% bei Raumluft" },
  "context.fx20": { en: "33M, pre-employment medical screening, no symptoms", de: "33M, Einstellungsuntersuchung, keine Beschwerden" },

  "finding.none": { en: "No finding present", de: "Keiner der Befunde liegt vor" },
};

const TIME_TO_CASES: Record<number, number> = { 20: 10, 30: 15, 40: 20 };
const BONUS_CASE_COUNT = 5;
const STORAGE_PREFIX = "chexstudy_";

function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// Seeded shuffle for consistent randomization per session
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const result = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function generateJianOrder(sessionCode: string): number[] {
  const indices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return seededShuffle(indices, sessionCode);
}

function saveToStorage(code: string, state: StudyState) {
  try {
    const serializable = { ...state };
    localStorage.setItem(STORAGE_PREFIX + code, JSON.stringify(serializable));
  } catch { /* quota exceeded - silent fail */ }
}

function loadFromStorage(code: string): StudyState | null {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + code);
    if (!raw) return null;
    return JSON.parse(raw) as StudyState;
  } catch { return null; }
}

function insertAttentionCheck(cases: CaseData[]): CaseData[] {
  if (cases.length < 4) return cases;
  const result = [...cases];
  // Insert in middle 60%
  const start = Math.floor(cases.length * 0.2);
  const end = Math.floor(cases.length * 0.8);
  const pos = start + Math.floor(Math.random() * (end - start));
  result.splice(pos, 0, { ...ATTENTION_CHECK_CASE });
  return result;
}

export const StudyProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<StudyState>({
    screen: "landing",
    language: "en",
    sessionCode: "",
    userProfile: null,
    currentCaseIndex: 0,
    currentBlock: 1,
    phase: 1,
    responses: [],
    baselineResponses: [],
    baselineAccuracy: 0,
    preTrustItems: [],
    postTrustItems: [],
    blockSurveys: [],
    debriefData: null,
    activeCases: [],
    bonusCases: [],
    casesPerBlock: 2,
    sessionIndex: Date.now() % 5,
    jianItemOrder: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  });

  const currentCase = state.currentCaseIndex < state.activeCases.length ? state.activeCases[state.currentCaseIndex] : null;
  const totalCases = state.activeCases.length;
  const progress = totalCases > 0 ? ((state.currentCaseIndex) / totalCases) * 100 : 0;

  // Auto-save to localStorage whenever state changes (if we have a code)
  useEffect(() => {
    if (state.sessionCode && state.screen !== "landing") {
      saveToStorage(state.sessionCode, state);
    }
  }, [state]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [state.screen]);

  // Browser back button handling
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      window.history.pushState(null, "", window.location.href);
      toast.info(state.language === "en"
        ? "Use the study controls to navigate"
        : "Verwende die Studien-Steuerung zur Navigation");
    };

    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [state.language]);

  const t = useCallback((key: string): string => {
    return translations[key]?.[state.language] ?? key;
  }, [state.language]);

  const generateSessionCode = useCallback((): string => {
    const code = makeCode();
    const jianOrder = generateJianOrder(code);
    setState(s => ({ ...s, sessionCode: code, jianItemOrder: jianOrder }));
    studyDataService.createSession(code, state.sessionIndex);
    studyDataService.saveJianItemOrder(code, jianOrder);
    return code;
  }, [state.sessionIndex]);

  const resumeSession = useCallback(async (code: string): Promise<boolean> => {
    const upperCode = code.toUpperCase();
    
    // Try database first
    try {
      const dbSession = await studyDataService.loadSession(upperCode);
      if (dbSession) {
        const dbTrials = await studyDataService.loadTrials(dbSession.id);
        
        const nCases = dbSession.n_cases || 8;
        const sessionIdx = dbSession.session_index ?? (Date.now() % 5);
        const cases = generateCaseOrder(sessionIdx, nCases);
        const casesWithAttention = insertAttentionCheck(cases);
        const cpb = Math.floor(nCases / TOTAL_BLOCKS);
        const jianOrder = generateJianOrder(upperCode);

        const responses: CaseResponse[] = dbTrials
          .filter(t => t.trial_type === "main" || t.trial_type === "bonus")
          .map(t => ({
            caseId: t.case_id,
            condition: t.condition || "A",
            category: t.category || "easy",
            groundTruth: ((t as any).ground_truth as string[]) || [],
            aiPredictions: Object.entries((t as any).ai_preds || {}).map(([findingId, confidence]) => ({ findingId, confidence: Number(confidence) * 100 })),
            initialFindings: t.initial_findings || [],
            initialConfidence: t.initial_confidence || 50,
            revisedFindings: t.revised_findings ?? undefined,
            revisedConfidence: t.revised_confidence ?? undefined,
            aiHelpful: t.ai_helpful ?? undefined,
            responseTimePreMs: t.response_time_pre_ms || 0,
            responseTimePostMs: t.response_time_post_ms ?? undefined,
          }));

        const baselineResponses: CaseResponse[] = dbTrials
          .filter(t => t.trial_type === "baseline")
          .map(t => ({
            caseId: t.case_id,
            condition: "A",
            category: "baseline",
            groundTruth: ((t as any).ground_truth as string[]) || [],
            aiPredictions: [],
            initialFindings: t.initial_findings || [],
            initialConfidence: t.initial_confidence || 50,
            responseTimePreMs: t.response_time_pre_ms || 0,
          }));

        // Never resume to "landing" - fall back to "welcome" so the participant
        // is re-oriented rather than stuck in an infinite resume loop.
        const rawScreen = (dbSession.current_screen as Screen) || "welcome";
        const screen: Screen = rawScreen === "landing" ? "welcome" : rawScreen;
        
        setState({
          screen,
          language: "en",
          sessionCode: upperCode,
          userProfile: dbSession.experience_level ? {
            timeAvailable: dbSession.time_budget_min || 30,
            experienceLevel: dbSession.experience_level || "",
            semester: dbSession.semester || "",
            specialty: [],
            xrayExperience: dbSession.xray_experience || "",
            xrayVolume: "",
            aiUsageGeneral: dbSession.ai_usage_general || "",
            aiUsageMedicine: dbSession.ai_usage_medicine || "",
            aiCurrentUse: dbSession.ai_current_use || [],
            aiKnowledge: "",
            aiCdssExperience: "",
            aiAttitude: "",
            aiTraining: "",
            consented: dbSession.consent || false,
          } : null,
          currentCaseIndex: dbSession.current_case_index || 0,
          currentBlock: dbSession.current_block || 1,
          phase: 1,
          responses,
          baselineResponses,
          baselineAccuracy: Number(dbSession.baseline_accuracy) || 0,
          preTrustItems: dbSession.pre_trust_items || [],
          postTrustItems: dbSession.post_trust_items || [],
          blockSurveys: [],
          debriefData: null,
          activeCases: casesWithAttention,
          bonusCases: [],
          casesPerBlock: cpb,
          sessionIndex: sessionIdx,
          jianItemOrder: jianOrder,
        });
        return true;
      }
    } catch (err) {
      console.error("[StudyContext] DB resume failed, trying localStorage", err);
    }

    // Fall back to localStorage
    const saved = loadFromStorage(upperCode);
    if (!saved) return false;
    setState({ ...saved, sessionCode: upperCode });
    return true;
  }, []);

  const setScreen = useCallback((screen: Screen) => {
    setState(s => {
      // Don't persist "landing" - it's not a resumable position.
      // Leaving the study keeps the last real screen saved in DB.
      if (s.sessionCode && screen !== "landing") {
        studyDataService.updateSessionScreen(s.sessionCode, screen, s.currentCaseIndex, s.currentBlock);
      }
      return { ...s, screen };
    });
  }, []);

  const setLanguage = useCallback((language: Language) => setState(s => ({ ...s, language })), []);
  
  const setUserProfile = useCallback((userProfile: UserProfile) => {
    setState(s => {
      if (s.sessionCode) {
        const nCases = TIME_TO_CASES[userProfile.timeAvailable] || 8;
        studyDataService.updateSessionProfile(s.sessionCode, userProfile, nCases, s.language);
      }
      return { ...s, userProfile };
    });
  }, []);

  const setPhase = useCallback((phase: 1 | 2) => setState(s => ({ ...s, phase })), []);

  const initializeCases = useCallback((timeBudget: number) => {
    const nCases = TIME_TO_CASES[timeBudget] || 8;
    const cases = generateCaseOrder(state.sessionIndex, nCases);
    const casesWithAttention = insertAttentionCheck(cases);
    const cpb = Math.floor(nCases / TOTAL_BLOCKS);
    setState(s => ({ ...s, activeCases: casesWithAttention, casesPerBlock: cpb }));
  }, [state.sessionIndex]);

  const initializeBonusCases = useCallback(() => {
    const bonus = generateCaseOrder((state.sessionIndex + 1) % 5, BONUS_CASE_COUNT);
    setState(s => ({ ...s, bonusCases: bonus }));
  }, [state.sessionIndex]);

  const addResponse = useCallback((r: CaseResponse) => {
    setState(s => {
      const trialType = r.category === "attention_check" ? "attention_check" : "main";
      if (s.sessionCode) studyDataService.saveTrial(s.sessionCode, r, trialType);
      return { ...s, responses: [...s.responses, r] };
    });
  }, []);

  const addBaselineResponse = useCallback((r: CaseResponse) => {
    setState(s => {
      if (s.sessionCode) studyDataService.saveTrial(s.sessionCode, r, "baseline");
      return { ...s, baselineResponses: [...s.baselineResponses, r] };
    });
  }, []);

  const setBaselineAccuracy = useCallback((baselineAccuracy: number) => {
    setState(s => {
      if (s.sessionCode) studyDataService.saveBaselineAccuracy(s.sessionCode, baselineAccuracy);
      return { ...s, baselineAccuracy };
    });
  }, []);

  const setPreTrustItems = useCallback((preTrustItems: number[]) => {
    setState(s => {
      if (s.sessionCode) studyDataService.savePreTrustItems(s.sessionCode, preTrustItems);
      return { ...s, preTrustItems };
    });
  }, []);

  const addBlockSurvey = useCallback((survey: BlockSurvey) => {
    setState(s => {
      // Derive condition from the Latin square: currentBlock is already the NEXT block,
      // so the block just completed is currentBlock - 1 (1-indexed), i.e. index currentBlock - 2.
      const blockIdx = s.currentBlock - 2;
      const condition = LATIN_SQUARES[s.sessionIndex % 5]?.[blockIdx] ?? "";
      const surveyWithCondition = { ...survey, condition };
      if (s.sessionCode) studyDataService.saveBlockSurvey(s.sessionCode, surveyWithCondition);
      return { ...s, blockSurveys: [...s.blockSurveys, surveyWithCondition] };
    });
  }, []);

  const setDebriefData = useCallback((debriefData: { postTrustItems: number[]; comments: string }) =>
    setState(s => ({ ...s, debriefData })), []);

  const nextCase = useCallback(() => {
    setState(s => {
      const nextIndex = s.currentCaseIndex + 1;
      const caseInBlock = nextIndex % s.casesPerBlock;
      const newBlock = Math.floor(nextIndex / s.casesPerBlock) + 1;

      if (nextIndex >= s.activeCases.length) {
        return { ...s, currentCaseIndex: nextIndex, screen: "bonus-offer" as Screen, phase: 1 as const };
      }

      if (caseInBlock === 0 && nextIndex > 0) {
        return { ...s, currentCaseIndex: nextIndex, currentBlock: newBlock, screen: "block-break" as Screen, phase: 1 as const };
      }

      return { ...s, currentCaseIndex: nextIndex, currentBlock: newBlock, phase: 1 as const };
    });
  }, []);

  return (
    <StudyContext.Provider value={{
      ...state,
      currentCase,
      totalCases,
      progress,
      t,
      setScreen,
      setLanguage,
      setUserProfile,
      setPhase,
      addResponse,
      addBaselineResponse,
      setBaselineAccuracy,
      setPreTrustItems,
      addBlockSurvey,
      setDebriefData,
      nextCase,
      initializeCases,
      initializeBonusCases,
      generateSessionCode,
      resumeSession,
      baselineCases: BASELINE_CASES,
    }}>
      {children}
    </StudyContext.Provider>
  );
};
