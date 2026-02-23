const fs = require('fs');

let css = fs.readFileSync('frontend/src/index.css', 'utf8');

// 1. Replace CSS variables in :root
const rootRegex = /:root\s*\{[\s\S]*?\}/;
const newRoot = `:root {
  /* Professional Clinical Palette (Light) - Premium Glassmorphism */
  --bg-base: #f8fafc;          /* Slate 50 */
  --bg-surface: #ffffff;       /* Pure white */
  --bg-card: #ffffff;          /* White cards */
  --bg-card2: #f1f5f9;         /* Slate 100 */
  --bg-hover: #e2e8f0;         /* Slate 200 */
  --bg-input: #f8fafc;         /* Light slate */

  /* Borders */
  --border: #e2e8f0;           /* Slate 200 */
  --border-bright: #cbd5e1;    /* Slate 300 */
  --border-glow: transparent;

  /* Accent Colors */
  --cyan: #0284c7;             /* Clinical Blue */
  --cyan2: #0369a1;            
  --blue: #2563eb;             /* Trust Blue */
  --violet: #7c3aed;           /* For ML/AI features */
  --green: #059669;            /* Success */
  --green2: #047857;
  --amber: #d97706;            /* Warning */
  --orange: #ea580c;
  --red: #dc2626;              /* Danger / Tumor core */
  --pink: #db2777;
  --teal: #0d9488;

  /* Text Hierarchy */
  --text-primary: #0f172a;     /* Slate 900 */
  --text-secondary: #475569;   /* Slate 600 */
  --text-muted: #64748b;       /* Slate 500 */
  --text-bright: #020617;      /* Nearly black */

  /* Gradients */
  --grad-brand: linear-gradient(135deg, #0284c7, #2563eb);
  --grad-green: linear-gradient(135deg, #059669, #10b981);
  --grad-danger: linear-gradient(135deg, #dc2626, #ef4444);
  --grad-amber: linear-gradient(135deg, #d97706, #f59e0b);
  --grad-violet: linear-gradient(135deg, #6d28d9, #8b5cf6);
  --grad-card: linear-gradient(180deg, #ffffff, #f8fafc);

  /* Fonts */
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;

  /* Layout */
  --topbar-h: 68px;
  --sidebar-w: 250px;
  --sidebar-col: 72px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows - Premium Soft Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.04);
  --shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.05), 0 2px 4px -1px rgba(15, 23, 42, 0.03);
  --shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04);
  --glow-cyan: 0 4px 12px rgba(2, 132, 199, 0.2);
  --glow-green: 0 4px 12px rgba(5, 150, 105, 0.2);
  --glow-red: 0 4px 12px rgba(220, 38, 38, 0.2);
  --glow-violet: 0 4px 12px rgba(124, 58, 237, 0.2);
}`;

css = css.replace(rootRegex, newRoot);

// 2. Replace hardcoded dark background values
css = css.replace(/rgba\(10, 22, 40, 0\.95\)/g, 'rgba(255, 255, 255, 0.85)');
css = css.replace(/rgba\(8, 16, 30, 0\.96\)/g, 'rgba(255, 255, 255, 0.90)');

// 3. Replace text on button hovers etc.
css = css.replace(/rgba\(255, 255, 255, 0\.04\)/g, 'rgba(15, 23, 42, 0.04)');
css = css.replace(/rgba\(255, 255, 255, 0\.08\)/g, 'rgba(15, 23, 42, 0.08)');
css = css.replace(/rgba\(255, 255, 255, 0\.025\)/g, 'rgba(15, 23, 42, 0.02)');
css = css.replace(/rgba\(255, 255, 255, 0\.02\)/g, 'rgba(15, 23, 42, 0.02)');

// 4. Invert dark explicit text/bg in app layout
css = css.replace(/rgba\(0, 100, 200, 0\.08\)/g, 'rgba(2, 132, 199, 0.05)');
css = css.replace(/rgba\(0, 60, 120, 0\.06\)/g, 'rgba(37, 99, 235, 0.03)');
css = css.replace(/rgba\(0, 80, 160, 0\.04\)/g, 'rgba(15, 23, 42, 0.02)');

// Fix text colors of hardcoded white text in buttons / logo / etc.
css = css.replace(/color:\s*#fff;/g, 'color: #ffffff;');

fs.writeFileSync('frontend/src/index.css', css);
console.log('CSS updated successfully!');
