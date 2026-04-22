/**
 * Prospect skill - Scoring logic
 *
 * Scores a LinkedIn prospect 0-10 for relevance as an admissions software buyer
 * at a higher education institution running healthcare, business, law, or allied health
 * graduate programs.
 *
 * Scoring breakdown:
 *   Title relevance  (0-5): seniority and admissions/enrollment focus
 *   Program area     (0-3): healthcare > business/law > allied health > other grad
 *   Institution type (0-2): graduate / professional school context
 */

export interface ProspectData {
  title: string;
  institution: string;
  headline: string;
  about: string;
}

export interface ScoreResult {
  score: number;
  reason: string;
}

export const TARGET_TITLES: Array<{ pattern: RegExp; points: number; label: string }> = [
  { pattern: /director\s+of\s+admissions/i,                         points: 5, label: 'Director of Admissions' },
  { pattern: /dean\s+of\s+admissions/i,                             points: 5, label: 'Dean of Admissions' },
  { pattern: /vice\s+provost.*(enrollment|admissions)/i,            points: 5, label: 'VP Enrollment/Admissions' },
  { pattern: /vp.*(enrollment|admissions)/i,                        points: 5, label: 'VP Enrollment/Admissions' },
  { pattern: /enrollment\s+(management\s+)?(director|vp|vice)/i,   points: 5, label: 'Enrollment Director/VP' },
  { pattern: /dean.*(graduate|professional|program)/i,              points: 4, label: 'Dean (Graduate/Professional)' },
  { pattern: /program\s+director/i,                                 points: 4, label: 'Program Director' },
  { pattern: /director.*(enrollment|recruitment)/i,                 points: 4, label: 'Director of Enrollment' },
  { pattern: /associate\s+dean.*(admissions|enrollment)/i,          points: 4, label: 'Associate Dean Admissions' },
  { pattern: /assistant\s+dean.*(admissions|enrollment)/i,          points: 3, label: 'Assistant Dean Admissions' },
  { pattern: /admissions\s+officer/i,                               points: 3, label: 'Admissions Officer' },
  { pattern: /admissions\s+(manager|coordinator)/i,                 points: 2, label: 'Admissions Manager/Coordinator' },
  { pattern: /enrollment\s+(manager|coordinator|specialist)/i,      points: 2, label: 'Enrollment Manager/Coordinator' },
  { pattern: /registrar/i,                                          points: 1, label: 'Registrar' },
];

const PROGRAM_AREAS: Array<{ pattern: RegExp; area: string; points: number }> = [
  { pattern: /nursing|healthcare|health\s*(care|sciences?|admin)|medical|medicine|pharmacy|public\s+health/i, area: 'healthcare',    points: 3 },
  { pattern: /allied\s+health|physical\s+therapy|occupational\s+therapy|physician\s+assistant|pa\s+program|dent(al|istry)/i, area: 'allied_health', points: 3 },
  { pattern: /business|mba|management|finance|accounting|marketing/i,                                          area: 'business',     points: 2 },
  { pattern: /law\s+school|juris|jd|legal/i,                                                                   area: 'law',          points: 2 },
  { pattern: /graduate|professional\s+school|master|mpa|mph|msn|msw|counseling|social\s+work/i,               area: 'other_grad',   points: 1 },
];

const INSTITUTION_SIGNALS: Array<{ pattern: RegExp; points: number }> = [
  { pattern: /graduate\s+school|professional\s+school|college\s+of\s+(medicine|nursing|law|business|health|dentistry|pharmacy|veterinary)/i, points: 2 },
  { pattern: /university|college|school\s+of/i,                                                                 points: 1 },
];

export function scoreProspect(p: ProspectData): ScoreResult {
  const corpus = [p.title, p.institution, p.headline, p.about].join(' ');
  const reasons: string[] = [];
  let total = 0;

  // Title score (max 5)
  let titlePoints = 0;
  let titleLabel = '';
  for (const t of TARGET_TITLES) {
    if (t.pattern.test(p.title) || t.pattern.test(p.headline)) {
      titlePoints = t.points;
      titleLabel = t.label;
      break;
    }
  }
  if (titlePoints > 0) {
    total += titlePoints;
    reasons.push(`${titleLabel} (+${titlePoints})`);
  }

  // Program area score (max 3)
  let areaPoints = 0;
  let areaLabel = '';
  for (const a of PROGRAM_AREAS) {
    if (a.pattern.test(corpus)) {
      areaPoints = a.points;
      areaLabel = a.area;
      break;
    }
  }
  if (areaPoints > 0) {
    total += areaPoints;
    reasons.push(`${areaLabel} program area (+${areaPoints})`);
  }

  // Institution type score (max 2)
  let instPoints = 0;
  for (const s of INSTITUTION_SIGNALS) {
    if (s.pattern.test(p.institution) || s.pattern.test(corpus)) {
      instPoints = s.points;
      break;
    }
  }
  if (instPoints > 0) {
    total += instPoints;
    reasons.push(`institution context (+${instPoints})`);
  }

  const score = Math.min(10, total);
  const reason = reasons.length > 0 ? reasons.join(', ') : 'no strong signals';

  return { score, reason };
}
