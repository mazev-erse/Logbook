import type { WorkoutMood } from '../types/database';

export interface WorkoutShareData {
  name: string;
  date: string;
  durationMinutes: number;
  totalVolumeKg: number;
  totalSets: number;
  mood?: WorkoutMood | null;
  sessionRpe?: number | null;
  notes?: string | null;
  exercises: {
    name: string;
    bestWeight: number;
    bestReps: number;
    completedSetsCount: number;
  }[];
  prsHitCount?: number;
}

export type CardAspectRatio = 'story' | 'square'; // 'story' = 1080x1920 (9:16), 'square' = 1080x1080 (1:1)

export type CardTheme = 'emerald' | 'cyan' | 'flame' | 'stealth';

export interface CardThemeConfig {
  id: CardTheme;
  name: string;
  emoji: string;
  badgeBg: string;
  badgeTextColor: string;
  accentColor: string;
  bgGradStart: string;
  bgGradMid: string;
  bgGradEnd: string;
  orb1Color: string;
  orb2Color: string;
  borderStroke: string;
  cardFill: string;
  cardStroke: string;
  setSummaryColor: string;
}

export const CARD_THEMES: Record<CardTheme, CardThemeConfig> = {
  emerald: {
    id: 'emerald',
    name: 'Cyber Emerald',
    emoji: '🟢',
    badgeBg: '#10b981',
    badgeTextColor: '#000000',
    accentColor: '#10b981',
    bgGradStart: '#090d16',
    bgGradMid: '#05070c',
    bgGradEnd: '#020306',
    orb1Color: 'rgba(16, 185, 129, 0.25)',
    orb2Color: 'rgba(20, 184, 166, 0.20)',
    borderStroke: 'rgba(255, 255, 255, 0.08)',
    cardFill: 'rgba(255, 255, 255, 0.04)',
    cardStroke: 'rgba(255, 255, 255, 0.07)',
    setSummaryColor: '#34d399',
  },
  cyan: {
    id: 'cyan',
    name: 'Electric Cyan',
    emoji: '💎',
    badgeBg: '#06b6d4',
    badgeTextColor: '#000000',
    accentColor: '#22d3ee',
    bgGradStart: '#081c24',
    bgGradMid: '#041017',
    bgGradEnd: '#02060a',
    orb1Color: 'rgba(6, 182, 212, 0.32)',
    orb2Color: 'rgba(56, 189, 248, 0.22)',
    borderStroke: 'rgba(34, 211, 238, 0.15)',
    cardFill: 'rgba(6, 182, 212, 0.06)',
    cardStroke: 'rgba(34, 211, 238, 0.12)',
    setSummaryColor: '#38bdf8',
  },
  flame: {
    id: 'flame',
    name: 'Sunset Flame',


















    emoji: '🔥',
    badgeBg: '#f97316',
    badgeTextColor: '#000000',
    accentColor: '#f97316',
    bgGradStart: '#1c0c05',
    bgGradMid: '#0f0402',
    bgGradEnd: '#050201',
    orb1Color: 'rgba(249, 115, 22, 0.28)',
    orb2Color: 'rgba(239, 68, 68, 0.22)',
    borderStroke: 'rgba(249, 115, 22, 0.15)',
    cardFill: 'rgba(249, 115, 22, 0.06)',
    cardStroke: 'rgba(249, 115, 22, 0.12)',
    setSummaryColor: '#fb923c',
  },
  stealth: {
    id: 'stealth',
    name: 'Stealth OLED',
    emoji: '⚪',
    badgeBg: '#ffffff',
    badgeTextColor: '#000000',
    accentColor: '#ffffff',
    bgGradStart: '#000000',
    bgGradMid: '#000000',
    bgGradEnd: '#000000',
    orb1Color: 'rgba(255, 255, 255, 0.10)',
    orb2Color: 'rgba(148, 163, 184, 0.06)',
    borderStroke: 'rgba(255, 255, 255, 0.18)',
    cardFill: 'rgba(255, 255, 255, 0.04)',
    cardStroke: 'rgba(255, 255, 255, 0.08)',
    setSummaryColor: '#ffffff',
  },
};

export const MOOD_META: Record<WorkoutMood, { label: string; emoji: string; color: string }> = {
  beast: { label: 'Beast Mode', emoji: '🔥', color: '#10b981' },
  strong: { label: 'Felt Strong', emoji: '💪', color: '#06b6d4' },
  solid: { label: 'Solid Effort', emoji: '👍', color: '#3b82f6' },
  tired: { label: 'Pushed Through', emoji: '🥱', color: '#f59e0b' },
  crushed: { label: 'Completely Crushed', emoji: '💀', color: '#f43f5e' },
};

/**
 * Draws the high-res workout summary card onto an HTML5 Canvas.
 */
export function drawWorkoutCard(
  ctx: CanvasRenderingContext2D,
  data: WorkoutShareData,
  aspectRatio: CardAspectRatio = 'story',
  themeKey: CardTheme = 'emerald'
) {
  const theme = CARD_THEMES[themeKey] || CARD_THEMES.emerald;
  const isStory = aspectRatio === 'story';
  const width = 1080;
  const height = isStory ? 1920 : 1080;

  ctx.clearRect(0, 0, width, height);

  // 1. Deep OLED Themed Background
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, theme.bgGradStart);
  bgGrad.addColorStop(0.5, theme.bgGradMid);
  bgGrad.addColorStop(1, theme.bgGradEnd);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Ambient Neon Lighting Effects
  // Top-right ambient orb
  const orb1 = ctx.createRadialGradient(width - 150, 200, 10, width - 150, 200, 500);
  orb1.addColorStop(0, theme.orb1Color);
  orb1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = orb1;
  ctx.fillRect(0, 0, width, height);

  // Bottom-left ambient orb
  const orb2 = ctx.createRadialGradient(200, height - 200, 10, 200, height - 200, 600);
  orb2.addColorStop(0, theme.orb2Color);
  orb2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = orb2;
  ctx.fillRect(0, 0, width, height);

  // Outer framing border
  ctx.strokeStyle = theme.borderStroke;
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, width - 80, height - 80, 48);
  ctx.stroke();

  // 3. Header Branding
  const topY = 120;

  // Brand Badge
  ctx.fillStyle = theme.badgeBg;
  roundRect(ctx, 80, topY, 48, 48, 16);
  ctx.fill();

  // Lightning/Dumbbell icon inside badge
  ctx.fillStyle = theme.badgeTextColor;
  ctx.font = '900 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('⚡', 104, topY + 24);

  // App Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '2px';
  ctx.fillText('LOGBOOK', 144, topY + 24);

  // Date Tag or PR Badge on the right
  if (data.prsHitCount && data.prsHitCount > 0) {
    // Show Golden PR Badge Pill
    const prW = 230;
    const prH = 44;
    const prX = width - 80 - prW;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    roundRect(ctx, prX, topY + 2, prW, prH, 14);
    ctx.fill();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, prX, topY + 2, prW, prH, 14);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#fde047';
    ctx.font = '900 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`⭐ ${data.prsHitCount} NEW PR${data.prsHitCount > 1 ? 'S' : ''}!`, prX + prW / 2, topY + 25);
  } else {
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(data.date, width - 80, topY + 24);
  }

  // 4. Workout Title
  const titleY = topY + 110;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 58px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

  // Truncate title if extremely long
  let displayTitle = data.name;
  if (ctx.measureText(displayTitle).width > width - 160) {
    while (ctx.measureText(displayTitle + '...').width > width - 160 && displayTitle.length > 5) {
      displayTitle = displayTitle.slice(0, -1);
    }
    displayTitle += '...';
  }
  ctx.fillText(displayTitle, 80, titleY);

  // 5. Hero Stats Grid (4 Large Stat Cards)
  const statsY = titleY + 60;
  const colGap = 24;
  const cardW = (width - 160 - colGap) / 2;
  const cardH = 140;

  // Stat 1: Duration
  drawStatCard(ctx, 80, statsY, cardW, cardH, 'DURATION', `${data.durationMinutes}m`, '⏱️', theme);

  // Stat 2: Total Volume Tonnage
  const formattedVol = Math.round(data.totalVolumeKg).toLocaleString();
  drawStatCard(ctx, 80 + cardW + colGap, statsY, cardW, cardH, 'TOTAL VOLUME', `${formattedVol} kg`, '🔥', theme);

  // Row 2 of stats
  const row2Y = statsY + cardH + 20;

  // Stat 3: Total Sets Completed
  drawStatCard(ctx, 80, row2Y, cardW, cardH, 'SETS COMPLETED', `${data.totalSets} Sets`, '📊', theme);

  // Stat 4: Mood / Intensity / PRs
  let stat4Label = 'SESSION MOOD';
  let stat4Val = 'Crushed It';
  let stat4Icon = '🏆';

  if (data.prsHitCount && data.prsHitCount > 0) {
    stat4Label = 'RECORDS';
    stat4Val = `${data.prsHitCount} PRs Hit!`;
    stat4Icon = '⭐';
  } else if (data.mood && MOOD_META[data.mood]) {
    stat4Label = data.sessionRpe ? `EFFORT (RPE ${data.sessionRpe}/10)` : 'INTENSITY';
    stat4Val = MOOD_META[data.mood].label;
    stat4Icon = MOOD_META[data.mood].emoji;
  }

  drawStatCard(ctx, 80 + cardW + colGap, row2Y, cardW, cardH, stat4Label, stat4Val, stat4Icon, theme);

  // 6. Exercise Breakdown Section
  const exercisesStartY = row2Y + cardH + 60;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '800 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('EXERCISE HIGHLIGHTS', 80, exercisesStartY);

  let currentExY = exercisesStartY + 25;
  const maxExercises = isStory ? 5 : 3;
  const previewExercises = data.exercises.slice(0, maxExercises);

  previewExercises.forEach((ex) => {
    // Card background
    ctx.fillStyle = theme.cardFill;
    roundRect(ctx, 80, currentExY, width - 160, 88, 20);
    ctx.fill();

    ctx.strokeStyle = theme.cardStroke;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 80, currentExY, width - 160, 88, 20);
    ctx.stroke();

    // Exercise Name
    ctx.textAlign = 'left';
    ctx.fillStyle = '#f4f4f5';
    ctx.font = '700 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let exName = ex.name;
    if (ctx.measureText(exName).width > 480) {
      exName = exName.slice(0, 24) + '...';
    }
    ctx.fillText(exName, 110, currentExY + 52);

    // Best Set / Completed Stats Tag
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.setSummaryColor;
    ctx.font = '900 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const setSummary = `${ex.bestWeight}kg × ${ex.bestReps}`;
    ctx.fillText(setSummary, width - 110, currentExY + 45);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '600 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${ex.completedSetsCount} sets completed`, width - 110, currentExY + 70);

    currentExY += 104;
  });

  if (data.exercises.length > maxExercises) {
    const remaining = data.exercises.length - maxExercises;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '600 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`+ ${remaining} more exercises completed in this session`, width / 2, currentExY + 20);
    currentExY += 50;
  }

  // 7. Notes Quote (Story mode only if space permits)
  if (isStory && data.notes && data.notes.trim()) {
    const notesY = Math.max(currentExY + 40, height - 340);
    ctx.fillStyle = theme.cardFill;
    roundRect(ctx, 80, notesY, width - 160, 110, 24);
    ctx.fill();

    ctx.strokeStyle = theme.borderStroke;
    ctx.lineWidth = 1.5;
    roundRect(ctx, 80, notesY, width - 160, 110, 24);
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = 'italic 500 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let noteText = `"${data.notes.trim()}"`;
    if (noteText.length > 70) {
      noteText = noteText.slice(0, 67) + '..."';
    }
    ctx.fillText(noteText, 115, notesY + 62);
  }

  // 8. Footer Watermark & Branding
  const footerY = height - 90;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '1px';
  ctx.fillText('TRACKED WITH LOGBOOK PWA • PUSH FORWARD', width / 2, footerY);
}

function drawStatCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  value: string,
  iconEmoji: string,
  theme: CardThemeConfig
) {
  // Background pill
  ctx.fillStyle = theme.cardFill;
  roundRect(ctx, x, y, w, h, 28);
  ctx.fill();

  ctx.strokeStyle = theme.cardStroke;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 28);
  ctx.stroke();

  // Label
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.font = '800 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.letterSpacing = '1.5px';
  ctx.fillText(label, x + 32, y + 42);

  // Value
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 38px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(value, x + 32, y + 96);

  // Icon
  ctx.textAlign = 'right';
  ctx.font = '36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(iconEmoji, x + w - 30, y + 80);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Converts a Canvas to a Blob
 */
export function getCanvasBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

/**
 * Downloads the workout card as a PNG image to user's device
 */
export async function downloadWorkoutCardImage(
  canvas: HTMLCanvasElement,
  filename = 'workout-summary.png'
) {
  const blob = await getCanvasBlob(canvas);
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies the workout card image directly to system clipboard
 */
export async function copyWorkoutCardImageToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  const blob = await getCanvasBlob(canvas);
  if (!blob) return false;

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      return true;
    } catch (e) {
      console.warn('Clipboard write image error:', e);
    }
  }
  return false;
}

/**
 * Uses Web Share API to share the workout graphic directly to
 * Instagram Stories, WhatsApp, Facebook, Snapchat, or native share sheet.
 */
export async function shareWorkoutCardImage(
  canvas: HTMLCanvasElement,
  title: string,
  textSummary: string
): Promise<{ shared: boolean; method: 'web-share' | 'download' | 'fallback' }> {
  const blob = await getCanvasBlob(canvas);
  if (!blob) return { shared: false, method: 'fallback' };

  const file = new File([blob], 'workout-summary.png', { type: 'image/png' });

  // Check if navigator.canShare supports files
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title,
        text: textSummary,
        files: [file],
      });
      return { shared: true, method: 'web-share' };
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Navigator share error:', err);
      }
    }
  }

  // Fallback to direct file download
  await downloadWorkoutCardImage(canvas, `${title.toLowerCase().replace(/\s+/g, '-')}-card.png`);
  return { shared: true, method: 'download' };
}

/**
 * Formats a text summary for WhatsApp or messages
 */
export function generateWorkoutTextSummary(data: WorkoutShareData): string {
  const lines = [
    `🏋️ ${data.name} — ${data.date}`,
    `⏱️ Duration: ${data.durationMinutes} mins`,
    `🔥 Total Volume: ${Math.round(data.totalVolumeKg).toLocaleString()} kg`,
    `📊 Sets Completed: ${data.totalSets}`,
  ];

  if (data.prsHitCount && data.prsHitCount > 0) {
    lines.push(`⭐ Personal Records: ${data.prsHitCount} NEW PR${data.prsHitCount > 1 ? 'S' : ''}!`);
  }

  if (data.mood && MOOD_META[data.mood]) {
    lines.push(`${MOOD_META[data.mood].emoji} Mood: ${MOOD_META[data.mood].label}`);
  }

  if (data.sessionRpe) {
    lines.push(`⚡ Effort: RPE ${data.sessionRpe}/10`);
  }

  if (data.exercises.length > 0) {
    lines.push('\nTop Lifts:');
    data.exercises.slice(0, 4).forEach((ex) => {
      lines.push(`• ${ex.name}: ${ex.bestWeight}kg × ${ex.bestReps}`);
    });
  }

  lines.push('\nTracked with Logbook PWA 🔥');
  return lines.join('\n');
}
