/*
 * data/site.js — who you are, in one place.
 *
 * Everything shown on the site comes from the files in /data. Edit the text here and refresh.
 * Rules this file follows:
 *  - Only facts you supplied are filled in.
 *  - Empty strings ('') and empty lists ([]) are hidden on the public site.
 *  - Open the site with ?draft at the end of the address (e.g. ruibinray.github.io/?draft)
 *    to see every empty field as a marked placeholder, so you know what is left to fill in.
 */
window.SITE = window.SITE || {};

SITE.profile = {
  name: 'Ruibin Jin Yao',
  legalName: 'Edwin Ruibin Jin Yao',
  goesBy: 'Ray',
  heroName: ['RUIBIN', 'JIN YAO'],          // the two lines of the name on the homepage
  tagline: 'Building Beyond the Horizon.',
  intro: 'Exploring the intersection of finance, business, analytics, and technology.',
  basedIn: 'Boston, MA',                    // used in the contact section
  relocation: 'Open to relocating anywhere.',
  // the Languages list under My Palette (level = how well, note = a certificate or detail; '' hides it)
  languages: [
    { name: 'Mandarin Chinese', native: '中文', level: 'Primary language', note: 'HSK Level 7–9' },
    { name: 'Spanish', native: 'Español', level: 'Native · fluent', note: '' },
    { name: 'English', native: 'English', level: 'Fluent', note: '' }
  ],
  // the line under "Under the Same Sky" in the contact section
  contactLine: 'If you’re interested in energy, international business, or finance, I’d love to connect, exchange ideas, and build meaningful professional relationships.'
};

SITE.links = {
  email: 'ruibinjinyao@gmail.com',
  phones: [                                    // shown beside the email; leave a number empty to hide it
    { number: '+1 617 256 4136', label: 'United States' },
    { number: '+506 7297 1174', label: 'Costa Rica' }
  ],
  // The five stars in the contact sky (on the painted stars on desktop, drawn under the text on phones)
  instagram: 'https://www.instagram.com/ruibin.jin/',
  x: 'https://x.com/RuibinJin',
  facebook: 'https://www.facebook.com/ruibin.jin.9',
  github: 'https://github.com/RuibinRay',
  linkedin: 'https://www.linkedin.com/in/edwin-ruibin-jin-yao-a6b050239',
  resume: 'assets/docs/Edwin_Ruibin_Jin_Yao_Resume.pdf',   // downloadable from About, under At a Glance (replace the file to update it)
  resumeNote: 'PDF, one page',                 // the small line under the button
  other: [                                     // more profiles: { label: 'Medium', url: 'https://…' }
  ]
};

SITE.meta = {
  siteUrl: 'https://ruibinray.github.io/Profile/',
  repo: 'RuibinRay/Profile',                  // where photos uploaded to assets/photos/ are found
  branch: 'main',
  year: 2026,
  paintingCredit: ''                           // who painted the homepage artwork, e.g. 'Painting by …' — leave empty to hide
};

// About — "Beyond the Horizon". Paragraphs are lists of strings; add, remove or reorder freely.
SITE.about = {
  tagline: 'Three cultures. Three languages. One global perspective.',
  intro: [
    'Born in Costa Rica with Chinese roots, and now building my future in Boston. I’m Ray — Edwin Ruibin Jin Yao — a Finance and Business Analytics student passionate about connecting people, ideas, and opportunities across borders.',
    'My journey has taken me from Costa Rica to the United States and China, shaping how I approach business, technology, and international collaboration.'
  ],
  // each chapter: a title, its paragraphs (text), and optionally a list of { title, text }, more
  // paragraphs after the list (after) and a closing line set larger (closing)
  chapters: [
    {
      title: 'Where I’m From',
      text: [
        'I grew up between Costa Rican and Chinese cultures, learning early on how different perspectives can create new opportunities.',
        'Today, I’m completing my Bachelor of Business Administration at Hult International Business School in Boston, double majoring in Finance and Business Analytics, with graduation expected in December 2026.',
        'Living, studying, and working across different cultures has taught me to adapt quickly, communicate effectively, and see opportunities from a global perspective.'
      ]
    },
    {
      title: 'Three Languages, One Global Mindset',
      text: [
        'I speak English, Spanish, and Mandarin Chinese, and I’ve had the opportunity to use all three professionally.',
        'In Costa Rica, I supported cross-cultural communication, interpretation, and document translation involving Chinese and Costa Rican partners.',
        'In Shenyang, China, I worked in international business development at Hengjiu Antai, a company specializing in vanadium redox flow batteries and long-duration energy storage.',
        'There, I researched international energy markets, identified potential partners, and supported business outreach across Latin America, Australia, the Middle East, and other regions.',
        'These experiences taught me that international business is about more than language. It’s about understanding people, building trust, and connecting opportunities.'
      ]
    },
    {
      title: 'What Drives Me',
      text: [
        'I’m curious about how businesses grow, how markets evolve, and how technology changes the way we live and work.',
        'My main interests include:'
      ],
      // pigment: the colour of the brushstroke beside each one (see data/palette.js for the names)
      list: [
        { title: 'Finance & Investment', text: 'Understanding financial markets, business performance, and investment decisions.', pigment: 'gold' },
        { title: 'Business Analytics', text: 'Turning data into meaningful insights and better decisions.', pigment: 'cornflower' },
        { title: 'Energy & Technology', text: 'Exploring energy storage, emerging technologies, and the global energy transition.', pigment: 'teal' },
        { title: 'International Business', text: 'Connecting companies, people, and opportunities across borders.', pigment: 'ember' },
        { title: 'Entrepreneurship & Strategy', text: 'Building ideas, solving problems, and finding new ways to create value.', pigment: 'periwinkle' }
      ],
      after: ['I enjoy combining analytical thinking with creativity and a global perspective.']
    },
    {
      title: 'Looking Beyond',
      text: [
        'I believe some of the best opportunities begin with a conversation.',
        'I’m always interested in meeting people who share a passion for finance, technology, energy, entrepreneurship, and international business.',
        'Whether it’s exchanging ideas, learning from different experiences, or exploring potential collaborations, I’m open to connecting with people around the world.'
      ],
      closing: 'The world is full of opportunities. I’m here to explore them, connect the dots, and keep learning along the way.'
    }
  ],
  // At a Glance. flags: country codes drawn as small flags after the text (CRI, CHN and USA are drawn)
  glance: [
    { label: 'Born in', value: 'Costa Rica', flags: ['CRI'] },
    { label: 'Cultural roots', value: 'Costa Rica & China', flags: ['CRI', 'CHN'] },
    { label: 'Currently based in', value: 'Boston, Massachusetts', flags: ['USA'] },
    { label: 'Education', value: 'BBA, Finance & Business Analytics — Hult International Business School' },
    { label: 'Graduation', value: 'December 2026' },
    { label: 'Languages', value: 'English · Español · 中文' },
    { label: 'International experience', value: 'Costa Rica · United States · China' },
    { label: 'Professional interests', value: 'Finance · Analytics · Energy · Technology · International Business · Entrepreneurship' },
    { label: 'Global outlook', value: 'Open to international connections, collaborations, and opportunities.' }
  ],
  photo: { src: '', alt: '' },                  // e.g. { src: 'assets/img/ray.jpg', alt: 'Ray in Boston' }
  offTheClock: ['Basketball', 'Video games', 'Music production', 'Songwriting', 'Cooking', 'Movies']
};

SITE.education = [
  {
    id: 'hult',
    school: 'Hult International Business School',
    place: 'Boston, MA',
    degree: 'BBA, Finance & Business Analytics',
    when: 'Graduating December 2026',
    notes: ['Dean’s List, Fall 2024']
  },
  {
    id: 'lincoln',
    school: 'Lincoln School',
    place: 'Heredia, Costa Rica',
    degree: 'International Baccalaureate Diploma',
    when: 'June 2023',
    notes: []
  }
];

SITE.awards = [
  {
    id: 'hflc',
    title: 'Hult Future Leaders Challenge',
    year: '2022',
    text: 'My team placed third globally among 115 teams.',
    evidence: ''      // link to a certificate, article or announcement
  },
  {
    id: 'deans-list',
    title: 'Dean’s List',
    year: 'Fall 2024',
    text: 'Hult International Business School.',
    evidence: ''
  }
];

// Certificates, newest first. img: the certificate as an image (prepared in three sizes in
// assets/media/certificates/); url: where it can be verified. Without an image a certificate is
// listed in text under the gallery. group: the filter it appears under.
SITE.certifications = [
  { title: 'Google AI Professional Certificate (8 courses)', issuer: 'Google, on Coursera', date: 'Oct 26, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-professional-certificate.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/professional-cert/HZZP629M4TO8' },
  { title: 'AI for App Deployment', issuer: 'Google, on Coursera', date: 'Oct 26, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-app-deployment.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/E47LJJHTLEA2' },
  { title: 'AI for App Building', issuer: 'Google, on Coursera', date: 'Oct 26, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-app-building.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/RWZ9L738JVQT' },
  { title: 'AI for Data Analysis', issuer: 'Google, on Coursera', date: 'Oct 26, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-data-analysis.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/NYIGT2U98ECB' },
  { title: 'Relational Database Design', issuer: 'University of Colorado Boulder, on Coursera', date: 'Oct 26, 2026', group: 'Other', img: 'assets/media/certificates/cu-boulder-relational-database-design.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/8Y47V8DAFSX9' },
  { title: 'Certificate of Achievement: Overseas Sales internship', issuer: 'HJAT (恒久安泰), Shenyang', date: 'Aug 2026', group: 'Internship', img: 'assets/media/journey/hjat/hjat-certificate.webp', w: 2048, h: 1502, url: '' },
  { title: 'AI for Content Creation', issuer: 'Google, on Coursera', date: 'Aug 13, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-content-creation.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/Y8SOP20X8PK4' },
  { title: 'AI for Writing and Communicating', issuer: 'Google, on Coursera', date: 'Aug 12, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-writing-communicating.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/0I8ME0XMV00T' },
  { title: 'AI for Research and Insights', issuer: 'Google, on Coursera', date: 'Aug 12, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-research-insights.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/E37EYGLBXA2R' },
  { title: 'AI for Brainstorming and Planning', issuer: 'Google, on Coursera', date: 'Aug 11, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-brainstorming-planning.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/VWG0J0T3195R' },
  { title: 'AI Fundamentals', issuer: 'Google, on Coursera', date: 'Aug 10, 2026', group: 'Google AI', img: 'assets/media/certificates/google-ai-fundamentals.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/GUF526HZ7R46' },
  { title: 'Corporate Governance in US & UK: Principles & Compliance', issuer: 'EDUCBA, on Coursera', date: 'Mar 29, 2026', group: 'Finance', img: 'assets/media/certificates/educba-corporate-governance.webp', w: 2048, h: 1583, url: 'https://coursera.org/verify/LQPJ73PQQLV0' },
  { title: 'Data Analysis with Excel Power Tools', issuer: 'DataCamp · 10 hours', date: 'Dec 16, 2025', group: 'DataCamp', img: 'assets/media/certificates/datacamp-excel-power-tools.webp', w: 2048, h: 1182, url: '' },
  { title: 'Excel Fundamentals', issuer: 'DataCamp · 14 hours', date: 'Dec 15, 2025', group: 'DataCamp', img: 'assets/media/certificates/datacamp-excel-fundamentals.webp', w: 2048, h: 1182, url: '' },
  { title: 'Introduction to Statistics in Python', issuer: 'DataCamp · 4 hours', date: 'Nov 7, 2025', group: 'DataCamp', img: 'assets/media/certificates/datacamp-intro-statistics-python.webp', w: 2048, h: 1182, url: '' },
  { title: 'Data-Driven Decision Making for Business', issuer: 'DataCamp · 2 hours', date: 'Nov 6, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-data-driven-decision-making.webp', w: 2048, h: 1182, url: '' },
  { title: 'Data Analysis in Excel', issuer: 'DataCamp · 3 hours', date: 'Nov 6, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-data-analysis-in-excel.webp', w: 2048, h: 1182, url: '' },
  { title: 'Understanding Data Science', issuer: 'DataCamp · 2 hours', date: 'Nov 5, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-understanding-data-science.webp', w: 2048, h: 1182, url: '' },
  { title: 'Introduction to Shell', issuer: 'DataCamp · 4 hours', date: 'May 9, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-intro-shell.webp', w: 2048, h: 1182, url: '' },
  { title: 'Introduction to SQL', issuer: 'DataCamp · 2 hours', date: 'May 8, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-intro-sql.webp', w: 2048, h: 1182, url: '' },
  { title: 'Intermediate Python', issuer: 'DataCamp · 4 hours', date: 'Apr 29, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-intermediate-python.webp', w: 2048, h: 1182, url: '' },
  { title: 'Introduction to Python', issuer: 'DataCamp · 4 hours', date: 'Mar 4, 2024', group: 'DataCamp', img: 'assets/media/certificates/datacamp-intro-python.webp', w: 2048, h: 1182, url: '' },
  { title: 'Tech on the Go: No-Code for Coders', issuer: 'LinkedIn Learning · 24 minutes', date: 'Feb 10, 2024', group: 'Other', img: 'assets/media/certificates/linkedin-no-code-for-coders.webp', w: 2048, h: 1583, url: '' },
  { title: 'Voices for Change', issuer: 'Get Inclusive', date: 'Sep 5, 2023', group: 'Other', img: 'assets/media/certificates/voices-for-change.webp', w: 2048, h: 1583, url: 'https://app.getinclusive.com/verify/637879340-69' },
  { title: 'Introduction to Financial Accounting', issuer: 'University of Pennsylvania', date: '2026', group: 'Finance', img: '', url: '' },
  { title: 'Foundations of Digital Marketing & E-commerce', issuer: 'Google', date: '2025', group: 'Other', img: '', url: '' },
  { title: 'Accounting Job Simulation', issuer: 'Koch Industries via Forage', date: '2024', group: 'Finance', img: '', url: '' },
  { title: 'International Baccalaureate Diploma', issuer: 'Lincoln School, Costa Rica', date: '2023', group: 'Other', img: '', url: '' },
  { title: 'HSK Level 7–9', issuer: 'Chinese Proficiency Test', date: '2022', group: 'Other', img: '', url: '' }
];

SITE.coursework = [
  {
    group: 'Finance',
    courses: ['Corporate Finance', 'Financial Reporting', 'Corporate Governance (BCCI and Madoff cases)', 'Financial Markets & Institutions', 'Derivatives & Risk Management', 'Finance 1']
  },
  {
    group: 'Analytics & data',
    courses: ['Supervised Machine Learning (Breast Cancer Wisconsin case)', 'Unsupervised Machine Learning (K-Means, PCA)', 'Managing Structured Data with SQL', 'Digital Marketing Analytics', 'Quantitative Decision Making', 'Advanced Excel: Data Modeling & Automation', 'Fundamentals of Business Analytics']
  },
  {
    group: 'Strategy & operations',
    courses: ['Hult Business Challenge (semi-finals, CambridgeSide mall)', 'Operations & Supply Chain Management (Boston Duck Tours project)', 'Business Strategy', 'Marketing']
  }
];
