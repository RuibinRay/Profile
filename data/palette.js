/*
 * data/palette.js — "My Palette": skills grouped by the painting's colours.
 *
 * No percentages or self-ratings. Each group says what the skill is for, which tools you have
 * confirmed, and where it shows up in your work (`seenIn` links to projects / journey entries).
 *   pigment: gold | ember | cobalt | cornflower | periwinkle | foam | moon | umber | teal | emerald
 */
window.SITE = window.SITE || {};

SITE.palette = [
  {
    id: 'finance', name: 'Finance & financial analysis', pigment: 'gold',
    text: 'Valuation, accounting and cost analysis — from an M&A model to a lifecycle cost comparison for energy storage.',
    tools: ['Excel'],
    seenIn: ['w:ma-model', 'w:bbby', 'w:lifecycle', 'j:upenn', 'j:koch']
  },
  {
    id: 'strategy', name: 'Business strategy', pigment: 'cobalt',
    text: 'Go-to-market and pricing strategy, segmentation, and case challenges built around real companies.',
    tools: [],
    seenIn: ['w:mundo-bonito', 'w:cambridgeside', 'j:hflc']
  },
  {
    id: 'analytics', name: 'Business analytics', pigment: 'cornflower',
    text: 'Structuring data so a decision can be made from it.',
    tools: ['Excel', 'SQL'],
    seenIn: ['w:layers', 'w:lifecycle', 'w:ml-cases']
  },
  {
    id: 'data-science', name: 'Data science & visualization', pigment: 'teal',
    text: 'Supervised and unsupervised machine learning, from exploration to model.',
    tools: ['Python (Pandas, Seaborn, ML)', 'Google Colab', 'SQL'],
    seenIn: ['w:ml-cases']
  },
  {
    id: 'market-research', name: 'Market research', pigment: 'periwinkle',
    text: 'Mapping who matters in a market: companies, entities and industry reports across five regions.',
    tools: [],
    seenIn: ['w:market-maps', 'j:hjat']
  },
  {
    id: 'marketing', name: 'Digital marketing', pigment: 'foam',
    text: 'Segmentation, storefronts, promotions and marketing analytics.',
    tools: ['Canva', 'Hootsuite'],
    seenIn: ['w:layers', 'w:mundo-bonito', 'j:google-dm']
  },
  {
    id: 'intl-bd', name: 'International business development', pigment: 'ember',
    text: 'Proposals, tenders and outreach across countries and languages.',
    tools: ['LinkedIn'],
    seenIn: ['w:proposals', 'w:tenders', 'w:outreach', 'j:ccecc', 'j:hjat']
  },
  {
    id: 'ai', name: 'AI & automation', pigment: 'moon',
    text: 'Automating document production, and teaching teams to work with AI tools.',
    tools: ['Node.js document automation', 'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'DeepSeek', 'Qwen', 'Doubao', 'Cursor', 'Lovable'],
    seenIn: ['w:study-guides', 'w:outreach', 'w:ledger-lift', 'j:google-ai']
  },
  {
    id: 'communication', name: 'Communication & collaboration', pigment: 'umber',
    text: 'Working across English, Spanish and Mandarin: translating, presenting and coordinating partners.',
    tools: ['PowerPoint', 'Word', 'Notion', 'Lucidchart'],
    seenIn: ['j:translator', 'j:mandarin-host', 'j:ccecc', 'w:proposals']
  },
  {
    // tools and projects are the ones listed on the Digital Creations case studies in data/work.js
    id: 'web', name: 'Web & creative development', pigment: 'emerald',
    text: 'Designing and building interactive websites end to end: living WebGL paintings, scroll-driven 3D journeys, data dashboards and the pipelines behind them.',
    tools: ['JavaScript (ES modules)', 'HTML & CSS', 'Three.js', 'WebGL (GLSL)', 'GSAP ScrollTrigger', 'TypeScript', 'React', 'D3', 'GitHub Pages'],
    seenIn: ['w:sunflower-intelligence', 'w:pura-vida', 'w:vrfb-info', 'w:courtvision-ai', 'w:goalvision-ai']
  }
];

// Every tool you have confirmed, for the full list under the palette.
SITE.tools = [
  { group: 'Office', items: ['Excel', 'PowerPoint', 'Word'] },
  { group: 'Data', items: ['SQL', 'Python (Pandas, Seaborn, ML)', 'Google Colab'] },
  { group: 'Automation', items: ['Node.js document automation'] },
  { group: 'Web', items: ['JavaScript (ES modules)', 'HTML & CSS', 'Three.js', 'WebGL (GLSL)', 'GSAP ScrollTrigger', 'TypeScript', 'React', 'D3', 'GitHub Pages'] },
  { group: 'Design & planning', items: ['Canva', 'Hootsuite', 'Notion', 'Lucidchart', 'Lovable'] },
  { group: 'AI tools', items: ['ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'DeepSeek', 'Qwen', 'Doubao', 'Cursor'] }
];
