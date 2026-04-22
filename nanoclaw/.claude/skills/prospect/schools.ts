/**
 * Prospect skill - Target school directory
 *
 * Each entry points to an institution's admissions staff or directory page.
 * The school crawler visits these pages directly to find prospects who may
 * not appear in LinkedIn searches or whose profiles are out of date.
 *
 * Add/remove entries freely — the scraper handles missing pages gracefully.
 */

export type SchoolVertical =
  | 'healthcare'
  | 'nursing'
  | 'pharmacy'
  | 'dentistry'
  | 'veterinary'
  | 'business'
  | 'law'
  | 'physical_therapy'
  | 'occupational_therapy'
  | 'pa_program'
  | 'public_health';

export interface TargetSchool {
  name: string;
  directoryUrl: string;    // Admissions staff / directory page to scrape
  vertical: SchoolVertical;
}

export const TARGET_SCHOOLS: TargetSchool[] = [

  // ── Healthcare / Medical ──────────────────────────────────────────────────
  { name: 'UCSF School of Medicine',             vertical: 'healthcare',        directoryUrl: 'https://medschool.ucsf.edu/admissions/contact-us' },
  { name: 'Mayo Clinic Alix School of Medicine', vertical: 'healthcare',        directoryUrl: 'https://college.mayo.edu/academics/medical-school-md-program/contact-us/' },
  { name: 'Icahn School of Medicine at Mount Sinai', vertical: 'healthcare',    directoryUrl: 'https://icahn.mssm.edu/education/medical/contact' },
  { name: 'Georgetown University Medical School', vertical: 'healthcare',       directoryUrl: 'https://som.georgetown.edu/admissions/contact/' },
  { name: 'Tufts University School of Medicine',  vertical: 'healthcare',       directoryUrl: 'https://medicine.tufts.edu/admissions-programs/md-program/contact-us' },

  // ── Nursing ───────────────────────────────────────────────────────────────
  { name: 'Johns Hopkins School of Nursing',     vertical: 'nursing',           directoryUrl: 'https://nursing.jhu.edu/about/contact/' },
  { name: 'Duke University School of Nursing',   vertical: 'nursing',           directoryUrl: 'https://nursing.duke.edu/admissions/contact-admissions' },
  { name: 'University of Pennsylvania Nursing',  vertical: 'nursing',           directoryUrl: 'https://www.nursing.upenn.edu/admissions/contact/' },
  { name: 'Vanderbilt School of Nursing',        vertical: 'nursing',           directoryUrl: 'https://nursing.vanderbilt.edu/about/directory/' },
  { name: 'NYU Rory Meyers College of Nursing',  vertical: 'nursing',           directoryUrl: 'https://nursing.nyu.edu/admissions/contact-us.html' },

  // ── Pharmacy ─────────────────────────────────────────────────────────────
  { name: 'UNC Eshelman School of Pharmacy',     vertical: 'pharmacy',          directoryUrl: 'https://pharmacy.unc.edu/admissions/contact/' },
  { name: 'USC School of Pharmacy',              vertical: 'pharmacy',          directoryUrl: 'https://pharmacyschool.usc.edu/contact/' },
  { name: 'University of Minnesota Pharmacy',    vertical: 'pharmacy',          directoryUrl: 'https://www.pharmacy.umn.edu/about/contact-us' },
  { name: 'Purdue College of Pharmacy',          vertical: 'pharmacy',          directoryUrl: 'https://www.pharmacy.purdue.edu/directory' },

  // ── Dentistry ─────────────────────────────────────────────────────────────
  { name: 'University of Michigan School of Dentistry', vertical: 'dentistry', directoryUrl: 'https://dent.umich.edu/about-school/contact-us' },
  { name: 'NYU College of Dentistry',            vertical: 'dentistry',         directoryUrl: 'https://dental.nyu.edu/aboutus/officeofadmissions.html' },
  { name: 'UCLA School of Dentistry',            vertical: 'dentistry',         directoryUrl: 'https://www.dentistry.ucla.edu/admissions/contact' },

  // ── Veterinary ────────────────────────────────────────────────────────────
  { name: 'Cornell College of Veterinary Medicine', vertical: 'veterinary',     directoryUrl: 'https://www.vet.cornell.edu/education/doctor-veterinary-medicine/admissions/contact-admissions' },
  { name: 'Colorado State University Vet Med',   vertical: 'veterinary',        directoryUrl: 'https://cvmbs.colostate.edu/dvm-admissions/contact-us/' },
  { name: 'University of Minnesota Vet Med',     vertical: 'veterinary',        directoryUrl: 'https://vetmed.umn.edu/admissions/contact-us' },

  // ── Business ──────────────────────────────────────────────────────────────
  { name: 'Wharton School of Business',          vertical: 'business',          directoryUrl: 'https://mba.wharton.upenn.edu/mba-admissions/contact-admissions/' },
  { name: 'Kellogg School of Management',        vertical: 'business',          directoryUrl: 'https://www.kellogg.northwestern.edu/programs/full-time-mba/admissions/contact.aspx' },
  { name: 'Tuck School of Business',             vertical: 'business',          directoryUrl: 'https://www.tuck.dartmouth.edu/admissions/contact-us' },
  { name: 'Darden School of Business',           vertical: 'business',          directoryUrl: 'https://www.darden.virginia.edu/mba/admissions/contact-us' },

  // ── Law ───────────────────────────────────────────────────────────────────
  { name: 'Georgetown Law',                      vertical: 'law',               directoryUrl: 'https://www.law.georgetown.edu/admissions-financial-aid/jd-admissions/contact-us/' },
  { name: 'Fordham Law School',                  vertical: 'law',               directoryUrl: 'https://law.fordham.edu/admissions/jd-admissions/contact-us/' },
  { name: 'George Washington University Law',    vertical: 'law',               directoryUrl: 'https://www.law.gwu.edu/contact-jd-admissions' },
  { name: 'Boston University School of Law',     vertical: 'law',               directoryUrl: 'https://www.bu.edu/law/admissions/contact/' },

  // ── Physical Therapy ──────────────────────────────────────────────────────
  { name: 'Northwestern DPT Program',            vertical: 'physical_therapy',  directoryUrl: 'https://www.northwestern.edu/academics/graduate/physical-therapy.html' },
  { name: 'University of Pittsburgh DPT',        vertical: 'physical_therapy',  directoryUrl: 'https://www.shrs.pitt.edu/pt/contact' },
  { name: 'Emory University DPT',                vertical: 'physical_therapy',  directoryUrl: 'https://pt.emory.edu/admissions/contact.html' },

  // ── Occupational Therapy ──────────────────────────────────────────────────
  { name: 'USC Chan Division of Occupational Science & OT', vertical: 'occupational_therapy', directoryUrl: 'https://chan.usc.edu/about/contact-us' },
  { name: 'Boston University OT Program',        vertical: 'occupational_therapy', directoryUrl: 'https://www.bu.edu/sargent/contact/occupational-therapy/' },

  // ── PA Programs ───────────────────────────────────────────────────────────
  { name: 'George Washington University PA Program', vertical: 'pa_program',   directoryUrl: 'https://smhs.gwu.edu/programs/physician-assistant/contact' },
  { name: 'Yale PA Program',                     vertical: 'pa_program',        directoryUrl: 'https://medicine.yale.edu/pa/admissions/contact/' },
  { name: 'Stanford PA Program',                 vertical: 'pa_program',        directoryUrl: 'https://med.stanford.edu/pa-program/admissions/contact.html' },

  // ── Public Health ─────────────────────────────────────────────────────────
  { name: 'Johns Hopkins Bloomberg SPH',         vertical: 'public_health',     directoryUrl: 'https://publichealth.jhu.edu/offices-and-services/admissions/contact-us' },
  { name: 'Harvard T.H. Chan School of Public Health', vertical: 'public_health', directoryUrl: 'https://www.hsph.harvard.edu/admissions/contact/' },
  { name: 'Columbia Mailman School of Public Health', vertical: 'public_health', directoryUrl: 'https://www.publichealth.columbia.edu/become-student/admissions/contact-us' },

  // ── Healthcare / Medical (additional) ────────────────────────────────────
  { name: 'Drexel University College of Medicine',   vertical: 'healthcare',     directoryUrl: 'https://drexel.edu/medicine/admissions/contact/' },
  { name: 'Thomas Jefferson University Medicine',    vertical: 'healthcare',     directoryUrl: 'https://www.jefferson.edu/academics/colleges-schools-institutes/skmc/admissions/contact-us.html' },
  { name: 'Tulane University School of Medicine',    vertical: 'healthcare',     directoryUrl: 'https://medicine.tulane.edu/admissions/contact-admissions' },
  { name: 'Loyola University Chicago Medicine',      vertical: 'healthcare',     directoryUrl: 'https://ssom.luc.edu/admissions/contactus/' },
  { name: 'Creighton University School of Medicine', vertical: 'healthcare',     directoryUrl: 'https://medicine.creighton.edu/admissions/contact' },

  // ── Nursing (additional) ─────────────────────────────────────────────────
  { name: 'Emory University Nell Hodgson Woodruff School of Nursing', vertical: 'nursing', directoryUrl: 'https://nursing.emory.edu/about/contact' },
  { name: 'University of Michigan School of Nursing', vertical: 'nursing',       directoryUrl: 'https://nursing.umich.edu/about/contact-us' },
  { name: 'Georgetown University School of Nursing', vertical: 'nursing',        directoryUrl: 'https://nursing.georgetown.edu/contact/' },
  { name: 'Rush University College of Nursing',      vertical: 'nursing',        directoryUrl: 'https://www.rushu.rush.edu/college-nursing/contact-us' },
  { name: 'Villanova University College of Nursing', vertical: 'nursing',        directoryUrl: 'https://www1.villanova.edu/villanova/nursing/contact.html' },

  // ── Business (additional) ─────────────────────────────────────────────────
  { name: 'Mendoza College of Business Notre Dame',  vertical: 'business',       directoryUrl: 'https://mendoza.nd.edu/admissions/contact/' },
  { name: 'Babson College Graduate Programs',        vertical: 'business',       directoryUrl: 'https://www.babson.edu/academics/graduate-programs/contact-us/' },
  { name: 'Boston College Carroll School of Management', vertical: 'business',   directoryUrl: 'https://www.bc.edu/bc-web/schools/carroll-school/graduate/mba/contact.html' },
  { name: 'Villanova School of Business',            vertical: 'business',       directoryUrl: 'https://www1.villanova.edu/villanova/business/graduate/contact.html' },
  { name: 'Loyola Quinlan School of Business',       vertical: 'business',       directoryUrl: 'https://www.luc.edu/quinlan/graduate/mba/contactus/' },

  // ── Law (additional) ─────────────────────────────────────────────────────
  { name: 'Loyola University Chicago School of Law', vertical: 'law',            directoryUrl: 'https://www.luc.edu/law/admissions/contact/' },
  { name: 'DePaul University College of Law',        vertical: 'law',            directoryUrl: 'https://law.depaul.edu/about/contact-us/Pages/default.aspx' },
  { name: 'University of Cincinnati College of Law', vertical: 'law',            directoryUrl: 'https://www.law.uc.edu/admissions/contact.html' },
  { name: 'Seton Hall University School of Law',     vertical: 'law',            directoryUrl: 'https://law.shu.edu/admissions/contact-us.cfm' },

  // ── Pharmacy (additional) ─────────────────────────────────────────────────
  { name: 'Duquesne University School of Pharmacy',  vertical: 'pharmacy',       directoryUrl: 'https://www.duq.edu/academics/schools/pharmacy/contact' },
  { name: 'Butler University College of Pharmacy',   vertical: 'pharmacy',       directoryUrl: 'https://www.butler.edu/pharmacy/admissions/contact/' },
  { name: 'Creighton University School of Pharmacy', vertical: 'pharmacy',       directoryUrl: 'https://spahp.creighton.edu/pharmacy/contact' },

  // ── PA Programs (additional) ──────────────────────────────────────────────
  { name: 'Emory University PA Program',             vertical: 'pa_program',     directoryUrl: 'https://pa.emory.edu/admissions/contact.html' },
  { name: 'Marquette University PA Program',         vertical: 'pa_program',     directoryUrl: 'https://www.marquette.edu/physician-assistant-studies/contact-us.php' },
  { name: 'Rosalind Franklin University PA Program', vertical: 'pa_program',     directoryUrl: 'https://www.rosalindfranklin.edu/academics/college-of-health-professions/physician-assistant/contact/' },

  // ── Physical Therapy (additional) ────────────────────────────────────────
  { name: 'Duke University DPT Program',             vertical: 'physical_therapy', directoryUrl: 'https://dpt.duke.edu/admissions/contact' },
  { name: 'Creighton University DPT Program',        vertical: 'physical_therapy', directoryUrl: 'https://spahp.creighton.edu/physical-therapy/contact' },

  // ── Occupational Therapy (additional) ────────────────────────────────────
  { name: 'Creighton University OT Program',         vertical: 'occupational_therapy', directoryUrl: 'https://spahp.creighton.edu/occupational-therapy/contact' },
  { name: 'Colorado State University OT Program',    vertical: 'occupational_therapy', directoryUrl: 'https://www.chhs.colostate.edu/ot/contact/' },

  // ── Public Health (additional) ────────────────────────────────────────────
  { name: 'Drexel Dornsife School of Public Health', vertical: 'public_health',  directoryUrl: 'https://drexel.edu/dornsife/about/contact/' },
  { name: 'Tulane School of Public Health',          vertical: 'public_health',  directoryUrl: 'https://sph.tulane.edu/contact-us' },
];
