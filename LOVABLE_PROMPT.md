# Lovable Build Prompt: Professional Medical AI Study Web App

Build a professional, modern, and fully responsive web app called **CheXStudy**. This app will be used for my bachelor's thesis to conduct a user study on AI-assisted chest X-ray interpretation. The app should work flawlessly on both desktop/laptop and mobile devices.

The core idea is to present users with chest X-ray images and measure how an AI assistant influences their diagnostic decisions under different conditions.

---

## 1. Overall Design & Feel

- **Aesthetic:** Create a clean, professional, and modern "medical-tech" look. The interface should feel trustworthy and serious, but also be intuitive and easy to use. Use a dark theme as specified below.
- **Responsiveness:** All screens must be fully responsive. On mobile, the two-column layouts should stack vertically in a logical order (e.g., image first, then response panel). Ensure touch targets are large enough and layouts don't feel cramped on smaller screens.
- **Clarity:** Use clear typography, good contrast, and logical visual hierarchy to guide the user through the study.

---

## 2. Visual Design System (Dark Theme)

Please apply this design system globally.

- **Background:** `#0A0E1A`
- **Cards/Panels:** `#111827`
- **Borders:** `1px solid #1F2937`
- **Primary Accent (Buttons, Highlights):** `#3B82F6`
- **Positive/Success:** `#10B981`
- **Warning/Attention:** `#F59E0B`
- **Text (Primary):** `#F9FAFB`
- **Text (Secondary/Subtle):** `#9CA3AF`
- **Font:** Inter (from Google Fonts), weights 400, 500, 600.
- **Buttons:** `border-radius: 8px`, flat design, 40px height.
- **Icons:** Use a clean, monochrome icon set like Lucide React.

---

## 3. App Flow & Screens

The app guides a user through a sequence of screens.

### Screen 1: Welcome & Setup

A single, centered card for user onboarding.

- **Header:** "CheXStudy: AI-Assisted Chest X-Ray Study" with a stethoscope icon.
- **Time Selection:** Ask "How much time do you have?" with segmented buttons: `10 min`, `20 min`, `30 min`.
- **Experience Questionnaire:** A section titled "Your Background" with simple, clean radio buttons or dropdowns for:
    - Medical experience level (e.g., "No medical background", "Medical student", "Resident/Attending").
    - Frequency of AI tool usage (e.g., "Never", "Weekly", "Daily").
    - Self-rated understanding of AI.
- **Consent:** A standard consent checkbox.
- **Action:** A "Begin Study" button that becomes active only when all fields are filled.

### Screen 2: Tutorial

A brief, multi-step tutorial to orient the user. On mobile, this could be a series of cards the user swipes through.

- **Step 1 (For Novices):** A quick visual guide to reading a chest X-ray (e.g., location of heart, lungs).
- **Step 2:** Explain the five medical findings they will be looking for (e.g., "Cardiomegaly", "Edema").
- **Step 3:** Show how the AI's predictions will be displayed (e.g., confidence bars).
- **Step 4:** If applicable, show how visual explanations (heatmaps) will look, with a clear warning that they are approximations.
- **Action:** A "Start Study" button.

### Screen 3: The Main Trial Screen

This is the core of the app where users analyze X-rays. It needs a clear, two-column layout on desktop that stacks cleanly on mobile.

**Layout (Desktop):**
- **Left (60%):** A large, focused X-ray image viewer against a black background.
- **Right (40%):** A response panel for user input.

**Functionality:**

1.  **Initial Diagnosis (Phase 1):**
    - The user sees the X-ray **without any AI input**.
    - They use checkboxes to select which of the five findings they see.
    - They rate their confidence using a slider.
    - They click a "Lock In My Answer" button.

2.  **AI-Assisted Diagnosis (Phase 2):**
    - The AI's predictions (e.g., confidence bars) are now revealed in the response panel.
    - The user's initial checkbox selections are still visible but are now editable.
    - The user can now change their diagnosis based on the AI's input.
    - They answer a few simple questions like "Was the AI helpful?" using sliders or buttons.
    - **Action:** A "Submit & Next" button to proceed to the next case.

**Study Conditions (The app should handle these variations automatically):**

- **Condition A (Control):** The user never sees the AI. They just perform the initial diagnosis and submit.
- **Condition B (AI Predictions):** The user sees the AI's confidence bars in Phase 2.
- **Condition C (AI + Explanations):** In addition to confidence bars, the user can toggle visual heatmaps (like Grad-CAM) on the X-ray image.
- **Condition D (AI + Explanations + Bias Info):** Same as C, but sometimes a small, amber-colored "warning" banner will appear above the image with information like "Model performance is lower for this type of scan." This banner must be manually dismissed by the user.

### Screen 4: Block Breaks

After a set number of cases, show a simple, centered screen.

- **Content:** "End of Block [X] of 4. Take a short break."
- **Short Survey:** Include a few quick questions with sliders to gauge mental effort and trust in the AI during that block.
- **Action:** A "Continue" button.

### Screen 5: Debrief & Finish

The final screen after all cases are complete.

- **Content:** A final survey asking about their overall experience and trust in the AI system. Include a free-text box for optional comments.
- **Action:** A "Submit & Finish" button.
- **Confirmation:** A simple "Thank you!" message to confirm completion.

---

## 4. What NOT to Build

- No user login or authentication system.
- No admin dashboard or results viewer.
- The app does not need to show the user their score or performance.
- The case data (images, AI predictions) will be provided as a static JSON file. The app just needs to load and display it.