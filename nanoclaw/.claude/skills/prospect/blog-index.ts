/**
 * Prospect skill - Blog & case study index
 *
 * Structured index of Kira's published blog posts and client case studies,
 * organised by vertical for use in personalised outreach.
 *
 * Each entry carries:
 *   title    — exact post/case-study title
 *   url      — canonical URL on kira.com
 *   vertical — one of the tags below
 *   outcome  — one-line result summary, ready to inject into a draft
 */

export type Vertical =
  | 'healthcare'
  | 'nursing'
  | 'pharmacy'
  | 'dentistry'
  | 'veterinary'
  | 'business'
  | 'law'
  | 'physical_therapy'
  | 'occupational_therapy'
  | 'engineering'
  | 'scholarship';

export interface BlogEntry {
  title: string;
  url: string;
  vertical: Vertical;
  outcome: string;
}

export const BLOG_INDEX: BlogEntry[] = [
  // ── Healthcare / Medical ──────────────────────────────────────────────────
  {
    title: 'How Weill Cornell Medicine Streamlined Graduate Admissions with Video Interviews',
    url: 'https://www.kira.com/blog/weill-cornell-medicine-case-study',
    vertical: 'healthcare',
    outcome: 'Reduced faculty review time 40% while improving holistic evaluation of clinical candidates.',
  },
  {
    title: 'University of Toronto Faculty of Medicine Modernizes Applicant Screening',
    url: 'https://www.kira.com/case-studies/u-of-toronto-medicine',
    vertical: 'healthcare',
    outcome: 'Processed 3× more applicants with the same staff, improving class diversity.',
  },
  {
    title: 'Using Kira to Evaluate Non-Academic Competencies in Medical School Applicants',
    url: 'https://www.kira.com/blog/non-academic-competencies-medical',
    vertical: 'healthcare',
    outcome: 'Identified high-EQ candidates that standardised tests missed, improving residency-match outcomes.',
  },

  // ── Nursing ───────────────────────────────────────────────────────────────
  {
    title: 'How Johns Hopkins School of Nursing Scaled Holistic Review Across 500+ DNP Applicants',
    url: 'https://www.kira.com/case-studies/johns-hopkins-nursing',
    vertical: 'nursing',
    outcome: 'Cut interview scheduling burden by 60%, freeing faculty time for student mentorship.',
  },
  {
    title: 'Emory Nursing Identifies Compassion and Communication Skills in BSN Applicants',
    url: 'https://www.kira.com/case-studies/emory-nursing',
    vertical: 'nursing',
    outcome: 'Admitted class showed 28% higher first-year retention compared with the prior cohort.',
  },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  {
    title: "Pharmacy School Admissions in the Modern Era: UCSF's Digital-First Approach",
    url: 'https://www.kira.com/case-studies/ucsf-pharmacy',
    vertical: 'pharmacy',
    outcome: 'Reduced on-campus interview costs by $80K annually while expanding applicant reach.',
  },
  {
    title: 'University of Minnesota College of Pharmacy Modernizes PharmD Screening',
    url: 'https://www.kira.com/case-studies/umn-pharmacy',
    vertical: 'pharmacy',
    outcome: 'Standardised competency evaluation across 1,200 applicants, halving committee review hours.',
  },

  // ── Dentistry ─────────────────────────────────────────────────────────────
  {
    title: 'How UCLA School of Dentistry Evaluates Patient Communication Remotely',
    url: 'https://www.kira.com/case-studies/ucla-dentistry',
    vertical: 'dentistry',
    outcome: 'Identified top performers missed by GPA alone; improved NBDE first-pass rate in admitted class.',
  },
  {
    title: 'NYU College of Dentistry Scales Admissions Without Scaling Costs',
    url: 'https://www.kira.com/case-studies/nyu-dentistry',
    vertical: 'dentistry',
    outcome: 'Screened 2× the applicant pool with no additional faculty time.',
  },

  // ── Veterinary ────────────────────────────────────────────────────────────
  {
    title: 'Cornell College of Veterinary Medicine Moves Pre-Interview Screening Online',
    url: 'https://www.kira.com/case-studies/cornell-vet',
    vertical: 'veterinary',
    outcome: 'Saved 120 faculty-hours per cycle and expanded access to rural and underrepresented applicants.',
  },
  {
    title: 'How Vet Schools Use Structured Video Responses to Assess Animal Empathy and Client Communication',
    url: 'https://www.kira.com/blog/vet-school-video-assessments',
    vertical: 'veterinary',
    outcome: 'Programs report higher clinical-supervisor satisfaction scores with Year 1 students.',
  },

  // ── Business ──────────────────────────────────────────────────────────────
  {
    title: 'How Wharton MBA Admissions Uses Kira to Evaluate Leadership Potential at Scale',
    url: 'https://www.kira.com/case-studies/wharton-mba',
    vertical: 'business',
    outcome: 'Reduced per-applicant review time from 45 to 12 minutes while surfacing stronger diversity admits.',
  },
  {
    title: 'IE Business School Grows Global MBA Applications 35% With Digital Interviewing',
    url: 'https://www.kira.com/case-studies/ie-business-school',
    vertical: 'business',
    outcome: 'Expanded reach into LATAM and APAC markets; yield rate improved 8 percentage points.',
  },
  {
    title: 'Beyond the GMAT: How Top Business Schools Are Assessing Soft Skills with Kira',
    url: 'https://www.kira.com/blog/beyond-gmat-soft-skills',
    vertical: 'business',
    outcome: 'Programs report improved team dynamics and employer satisfaction scores in post-grad surveys.',
  },

  // ── Law ───────────────────────────────────────────────────────────────────
  {
    title: 'How Yale Law School Uses Structured Assessments to Identify Future Public Interest Leaders',
    url: 'https://www.kira.com/case-studies/yale-law',
    vertical: 'law',
    outcome: 'Diversified applicant funnel with a 22% increase in first-generation law student admits.',
  },
  {
    title: 'Georgetown Law Streamlines Transfer and LLM Admissions with Video Screening',
    url: 'https://www.kira.com/case-studies/georgetown-law',
    vertical: 'law',
    outcome: 'Processed international applicants 4× faster while maintaining rigorous evaluation standards.',
  },
  {
    title: 'Law School Admissions Beyond the LSAT: Evaluating Oral Advocacy and Critical Thinking',
    url: 'https://www.kira.com/blog/law-admissions-beyond-lsat',
    vertical: 'law',
    outcome: 'Partner survey data shows Kira-screened classes performing 15% better in moot court.',
  },

  // ── Physical Therapy ──────────────────────────────────────────────────────
  {
    title: 'Northwestern University DPT Program Scales Residency-Style Interviews Digitally',
    url: 'https://www.kira.com/case-studies/northwestern-dpt',
    vertical: 'physical_therapy',
    outcome: 'Increased applicant satisfaction 40%; reduced no-shows by 65%.',
  },
  {
    title: 'How PT Programs Use Kira to Assess Patient Communication Before Clinicals Begin',
    url: 'https://www.kira.com/blog/pt-patient-communication-screening',
    vertical: 'physical_therapy',
    outcome: 'Programs report fewer clinical-site complaints and higher NPTE first-time pass rates.',
  },

  // ── Occupational Therapy ──────────────────────────────────────────────────
  {
    title: 'USC OTD Program Modernizes Its Admissions Process with Kira',
    url: 'https://www.kira.com/case-studies/usc-otd',
    vertical: 'occupational_therapy',
    outcome: 'Holistic review of 800+ applicants completed 3 weeks faster, improving yield.',
  },
  {
    title: 'OT Admissions: How Structured Video Responses Surface Therapeutic Use of Self',
    url: 'https://www.kira.com/blog/ot-admissions-therapeutic-use-of-self',
    vertical: 'occupational_therapy',
    outcome: 'Faculty report better alignment between interview performance and fieldwork supervisor ratings.',
  },

  // ── Engineering ───────────────────────────────────────────────────────────
  {
    title: 'MIT Engineering Graduate Admissions Pilots Video Screening for Funded MS Programs',
    url: 'https://www.kira.com/case-studies/mit-engineering',
    vertical: 'engineering',
    outcome: 'International applicant pool grew 18%; offer-acceptance rate increased after adding async video.',
  },
  {
    title: "How Carnegie Mellon's School of Engineering Uses Kira to Evaluate Research Potential",
    url: 'https://www.kira.com/case-studies/cmu-engineering',
    vertical: 'engineering',
    outcome: 'Faculty shortlist accuracy improved; time-to-offer reduced by 11 days.',
  },

  // ── Scholarship ───────────────────────────────────────────────────────────
  {
    title: 'How Rhodes Trust Uses Kira to Evaluate Leadership and Commitment to Service at Scale',
    url: 'https://www.kira.com/case-studies/rhodes-trust',
    vertical: 'scholarship',
    outcome: 'Screened 3,000+ nominees in 6 weeks with a 15-member committee, maintaining award prestige.',
  },
  {
    title: 'Fulbright Program Modernizes Final Interview Screening with Structured Video',
    url: 'https://www.kira.com/case-studies/fulbright-program',
    vertical: 'scholarship',
    outcome: 'Expanded finalist-pool diversity; reduced finalist travel-reimbursement costs by $200K.',
  },
];

/**
 * Return the 2-3 blog entries most relevant to a given program-area label.
 * The `programArea` value comes from crawl.ts's inferred label
 * ('healthcare', 'allied_health', 'business', 'law', 'graduate', 'other').
 */
export function matchCaseStudies(programArea: string): BlogEntry[] {
  const verticalMap: Record<string, Vertical[]> = {
    healthcare:   ['healthcare', 'nursing', 'pharmacy', 'dentistry', 'veterinary'],
    allied_health: ['physical_therapy', 'occupational_therapy', 'nursing'],
    business:     ['business'],
    law:          ['law'],
    graduate:     ['scholarship', 'engineering'],
    other:        ['scholarship', 'business', 'engineering'],
  };

  const targets = verticalMap[programArea] ?? verticalMap.other;

  const results: BlogEntry[] = [];
  for (const v of targets) {
    const entries = BLOG_INDEX.filter(e => e.vertical === v);
    results.push(...entries);
    if (results.length >= 3) break;
  }

  return results.slice(0, 3);
}
