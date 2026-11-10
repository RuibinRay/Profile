/*
 * data/journey.js — "The Journey So Far": your life as a path of stars.
 *
 * One object per entry, in any order (the site sorts by `at`).
 *   id        unique, lowercase, no spaces — used in links like #journey/hjat
 *   at        'YYYY-MM' used only to place the star on the path; for year-only facts pick any month
 *   when      the date exactly as you want it shown ('2024', 'Jun – Aug 2026', ...)
 *   type      work | education | achievement | certification | project | milestone
 *   short     a 1–3 word label drawn next to the star
 *   title     title;  org: organization;  place: city/country text;  country: ISO alpha-3 (links to the map)
 *   summary   one or two sentences;  details: list of bullet points (only real, documented facts)
 *   story     a longer personal note ('' hides it);  photo: { src, alt } ('' hides it)
 *   photos    several images: list of { src, w, h, caption } (opened in the photo viewer)
 *   evidence  a link to a certificate, verification page or announcement
 *   related   ids of connected stars: 'w:<project id>', 'c:<country code>', 's:<skill id>', 'j:<journey id>'
 *   upcoming  true for something that hasn't happened yet (drawn as an unlit star)
 */
window.SITE = window.SITE || {};

SITE.journey = [
  {
    id: 'ccecc', short: 'CCECC Costa Rica', at: '2020-01', when: 'Jan 2020 – Jul 2022', type: 'work',
    title: 'Student Consultant', org: 'CCECC Costa Rica', place: 'Costa Rica', country: 'CRI',
    summary: 'Worked between Chinese and Costa Rican partners.',
    details: ['Coordinated between Chinese and Costa Rican partners', 'Translated proposals', 'Planned events and followed up with stakeholders'],
    story: '', photo: { src: '', alt: '' },
    photos: [
      { src: 'assets/media/journey/ccecc/ccecc-teaching-01.webp', w: 1702, h: 1276, caption: 'Teaching at CCECC Costa Rica' },
      { src: 'assets/media/journey/ccecc/ccecc-teaching-02.webp', w: 1702, h: 1276, caption: 'A Chinese character lesson' },
      { src: 'assets/media/journey/ccecc/ccecc-teaching-03.webp', w: 1702, h: 1276, caption: 'With my students' },
      { src: 'assets/media/journey/ccecc/ccecc-teaching-04.webp', w: 2048, h: 1076, caption: 'Class points chart' }
    ],
    related: ['c:CRI', 's:intl-bd', 's:communication']
  },
  {
    id: 'mandarin-host', short: 'Mandarin competition host', at: '2021-06', when: '2021', type: 'milestone',
    title: 'Host, National Mandarin Competition', org: '', place: 'Costa Rica', country: 'CRI',
    summary: 'Hosted Costa Rica’s National Mandarin Competition.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['c:CRI', 's:communication']
  },
  {
    id: 'hsk', short: 'HSK 7–9', at: '2022-03', when: '2022', type: 'certification',
    title: 'HSK Level 7–9', org: 'Chinese Proficiency Test', place: '', country: '',
    summary: 'Passed HSK at Level 7–9, the advanced band of the Chinese proficiency test.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['s:communication']
  },
  {
    id: 'hflc', short: '3rd of 115 teams', at: '2022-08', when: '2022', type: 'achievement',
    title: 'Third of 115 teams worldwide', org: 'Hult Future Leaders Challenge', place: '', country: '',
    summary: 'My team placed third globally among 115 teams in the Hult Future Leaders Challenge.',
    details: [], story: '', photo: { src: '', alt: '' },
    evidence: '',   // link to a certificate or announcement
    related: ['s:strategy']
  },
  {
    id: 'ib', short: 'IB Diploma', at: '2023-06', when: 'June 2023', type: 'education',
    title: 'IB Diploma', org: 'Lincoln School', place: 'Heredia, Costa Rica', country: 'CRI',
    summary: 'Completed the International Baccalaureate Diploma at Lincoln School in Heredia.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['c:CRI']
  },
  {
    id: 'translator', short: 'Translator', at: '2024-03', when: '2024', type: 'work',
    title: 'Environmental & Governmental Translator', org: '', place: 'Costa Rica', country: 'CRI',
    summary: 'Translated official documents between Mandarin, English and Spanish.',
    details: ['Translated official documents between Mandarin, English and Spanish'],
    story: '', photo: { src: '', alt: '' },
    related: ['c:CRI', 's:communication']
  },
  {
    id: 'koch', short: 'Koch × Forage', at: '2024-06', when: '2024', type: 'certification',
    title: 'Accounting Job Simulation', org: 'Koch Industries via Forage', place: '', country: '',
    summary: 'Completed Koch Industries’ accounting job simulation on Forage.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['s:finance']
  },
  {
    id: 'deans-list', short: 'Dean’s List', at: '2024-11', when: 'Fall 2024', type: 'achievement',
    title: 'Dean’s List', org: 'Hult International Business School', place: 'Boston, MA', country: 'USA',
    summary: 'Named to the Dean’s List at Hult for Fall 2024.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['c:USA']
  },
  {
    id: 'mundo', short: 'Mundo Bonito', at: '2024-12', when: 'Dec 2024 – Jun 2025', type: 'work',
    title: 'Business Consultant', org: 'Mundo Bonito E-Commerce Store', place: 'Costa Rica', country: 'CRI',
    summary: 'Strategy work for a Costa Rican online store.',
    details: ['Go-to-market and pricing strategy', 'Customer segmentation', 'Storefront redesign', 'Promotional testing'],
    story: '', photo: { src: '', alt: '' },
    related: ['w:mundo-bonito', 'c:CRI', 's:strategy', 's:marketing']
  },
  {
    id: 'google-dm', short: 'Google Digital Marketing', at: '2025-04', when: '2025', type: 'certification',
    title: 'Foundations of Digital Marketing & E-commerce', org: 'Google', place: '', country: '',
    summary: 'Completed Google’s Foundations of Digital Marketing & E-commerce.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['s:marketing']
  },
  {
    id: 'layers', short: 'Layers analytics', at: '2025-09', when: 'Sep – Dec 2025', type: 'project',
    title: 'AI-driven marketing analytics', org: 'With Layers App', place: '', country: '',
    summary: 'A marketing analytics project built around the Layers app.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['w:layers', 's:marketing', 's:ai']
  },
  {
    id: 'upenn', short: 'UPenn Accounting', at: '2026-01', when: '2026', type: 'certification',
    title: 'Introduction to Financial Accounting', org: 'University of Pennsylvania', place: '', country: '',
    summary: 'Completed the University of Pennsylvania’s Introduction to Financial Accounting.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['s:finance']
  },
  {
    id: 'educba', short: 'Corporate Governance', at: '2026-03', when: 'Mar 2026', type: 'certification',
    title: 'Corporate Governance in US & UK', org: 'EDUCBA', place: '', country: '',
    summary: 'Completed EDUCBA’s Corporate Governance in US & UK: Principles & Compliance, on Coursera.',
    details: [], story: '', photo: { src: '', alt: '' },
    photos: [{ src: 'assets/media/certificates/educba-corporate-governance.webp', w: 2048, h: 1583, caption: 'Corporate Governance in US & UK, EDUCBA on Coursera' }],
    evidence: 'https://coursera.org/verify/LQPJ73PQQLV0',
    related: ['s:finance']
  },
  {
    id: 'google-ai', short: 'Google AI', at: '2026-08', when: 'Aug 2026', type: 'certification',
    title: 'AI Fundamentals', org: 'Google', place: '', country: '',
    summary: 'Completed Google’s AI Fundamentals on Coursera, followed by four more Google courses: AI for Brainstorming and Planning, AI for Research and Insights, AI for Writing and Communicating, and AI for Content Creation.',
    details: [], story: '', photo: { src: '', alt: '' },
    photos: [{ src: 'assets/media/certificates/google-ai-fundamentals.webp', w: 2048, h: 1583, caption: 'AI Fundamentals, Google on Coursera' }],
    evidence: 'https://coursera.org/verify/GUF526HZ7R46',
    related: ['s:ai']
  },
  {
    id: 'hjat', short: 'HJAT, Shenyang', at: '2026-06', when: 'Jun – Aug 2026', type: 'work',
    title: 'Overseas Sales / Business Development Intern',
    org: 'HJAT (恒久安泰) — Shenyang Hengjiu Antai Environmental Protection and Energy Saving Technology Co., Ltd.',
    place: 'Shenyang, China', country: 'CHN',
    summary: 'Overseas business development and research on vanadium redox flow batteries and long-duration energy storage.',
    details: [
      'Market research: market maps for Australia (34 companies) and Saudi Arabia (18 entities), a 17-company Chinese VRFB industry report, and a global long-duration energy storage market report, covering the Middle East, Australia, Europe, Southeast Asia and Latin America',
      'Proposals: partnership proposals in English, Spanish and Mandarin, plus a reusable template',
      'Tender evaluation: Kalgoorlie VBESS in Western Australia and the PNG Kainantu solar + BESS microgrid',
      'Cost analysis: VRFB vs. lithium (LFP) lifecycle cost comparison',
      'Study guides: 30 energy storage guides (10 technologies × 3 languages) produced through an automated Node.js pipeline',
      'LinkedIn outreach: ranked 1st in the department, with 200+ connections across 6+ countries',
      'Training: taught colleagues to use LinkedIn, VPN and AI tools, and wrote a Mandarin AI tools guide',
      'Quality control: caught a misattributed product and inflated market data before they went into deliverables',
      '1st place in the VRFB knowledge competition'
    ],
    story: '', photo: { src: '', alt: '' },
    photos: [
      { src: 'assets/media/journey/hjat/vrfb-knowledge-competition.webp', w: 1706, h: 1279, caption: '1st place in the VRFB knowledge competition' },
      { src: 'assets/media/journey/hjat/hjat-certificate.webp', w: 2048, h: 1502, caption: 'Certificate of Achievement' },
      { src: 'assets/media/journey/hjat/hjat-completion-letter.webp', w: 1381, h: 2048, caption: 'Internship completion letter' }
    ],
    related: ['c:CHN', 'j:vrfb-competition', 'w:market-maps', 'w:tenders', 'w:lifecycle', 'w:proposals', 'w:study-guides', 'w:outreach', 's:intl-bd', 's:market-research']
  },
  {
    id: 'vrfb-competition', short: '1st place, VRFB', at: '2026-07', when: '2026', type: 'achievement',
    title: '1st place in the VRFB knowledge competition', org: 'HJAT (恒久安泰)', place: 'Shenyang, China', country: 'CHN',
    summary: 'Won first place in the VRFB knowledge competition during my internship at HJAT in Shenyang.',
    details: [], story: '', photo: { src: '', alt: '' },
    photos: [
      { src: 'assets/media/journey/hjat/vrfb-knowledge-competition.webp', w: 1706, h: 1279, caption: '1st place in the VRFB knowledge competition' }
    ],
    related: ['j:hjat', 'c:CHN', 's:intl-bd']
  },
  {
    id: 'graduation', short: 'Graduation', at: '2026-12', when: 'December 2026', type: 'education', upcoming: true,
    title: 'BBA, Finance & Business Analytics', org: 'Hult International Business School', place: 'Boston, MA', country: 'USA',
    summary: 'Graduating with a BBA in Finance & Business Analytics.',
    details: [], story: '', photo: { src: '', alt: '' },
    related: ['c:USA', 's:finance', 's:analytics']
  }
];

SITE.journeyTypes = {
  work: 'Work',
  education: 'Education',
  achievement: 'Achievements',
  certification: 'Certifications',
  project: 'Projects',
  milestone: 'Milestones'
};
