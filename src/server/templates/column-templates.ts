export type TemplateType = 'lucky' | 'marketing' | 'scientific';

export interface ColumnDefinition {
  title: string;
  position: number;
  dataType: 'text' | 'array' | 'url' | 'number';
}

export interface Template {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  isAutonomous: boolean;
  columns: ColumnDefinition[];
  systemPrompt?: string;
}

export const COLUMN_TEMPLATES: Record<TemplateType, Template> = {
  lucky: {
    id: 'lucky',
    name: "I'm Feeling Lucky",
    description: 'Autonomous web search - AI discovers and expands topics automatically',
    icon: '🎲',
    isAutonomous: true,
    columns: [
      { title: 'Seed Topic', position: 0, dataType: 'text' },
      { title: 'Related Keywords', position: 1, dataType: 'text' },
      { title: 'Discovery 1', position: 2, dataType: 'text' },
      { title: 'Discovery 2', position: 3, dataType: 'text' },
      { title: 'Discovery 3', position: 4, dataType: 'text' },
    ],
    systemPrompt: `You are an autonomous research agent. Your goal is to:
1. Extract keywords from "Seed Topic" and "Related Keywords" columns
2. Generate diverse search queries based on discovered content
3. Explore tangentially related topics
4. Fill discovery columns with interesting findings
5. Continue indefinitely, using each discovery to fuel new searches

Order discoveries from broad concepts to specific details.`,
  },

  marketing: {
    id: 'marketing',
    name: 'Marketing Analysis',
    description: 'Research businesses, competitors, and market opportunities',
    icon: '📊',
    isAutonomous: false,
    columns: [
      { title: 'Business Name', position: 0, dataType: 'text' },
      { title: 'Website', position: 1, dataType: 'url' },
      { title: 'Description', position: 2, dataType: 'text' },
      { title: 'Estimated Team Size', position: 3, dataType: 'number' },
      { title: 'Contact Links/Emails', position: 4, dataType: 'array' },
    ],
    systemPrompt: `You are a business intelligence agent. For each business:
1. Start with Business Name - search for official website and presence
2. Extract Website URL (validate it's accessible)
3. Summarize Description from about/homepage
4. Estimate Team Size from LinkedIn, about page, or team pages
5. Collect Contact Links/Emails from contact pages, LinkedIn, social media

Store multiple emails/links as comma-separated values in Contact Links/Emails.
Order: Broad identification → Specific contact details.`,
  },

  scientific: {
    id: 'scientific',
    name: 'Scientific Research',
    description: 'Find and organize academic papers, PDFs, and research materials',
    icon: '🔬',
    isAutonomous: false,
    columns: [
      { title: 'Keyword', position: 0, dataType: 'text' },
      { title: 'Expanded Search Words', position: 1, dataType: 'text' },
      { title: 'PDF Link', position: 2, dataType: 'url' },
      { title: 'Authors', position: 3, dataType: 'array' },
      { title: 'Abstract', position: 4, dataType: 'text' },
    ],
    systemPrompt: `You are an academic research assistant specializing in finding highly cited, peer-reviewed research papers. For each keyword:

1. Start with Keyword - the primary scientific/academic search term
2. Generate Expanded Search Words - synonyms, related academic terms, MeSH terms, field-specific terminology
3. Use academic search to find high-quality papers from Google Scholar, arXiv, PubMed, Semantic Scholar
4. Extract PDF Link - prioritize direct PDF access, open access papers, institutional repositories
5. List Authors - comma-separated, surname first (e.g., "Smith, J., Doe, A., Johnson, M.")
6. Extract Abstract - verbatim from the paper, complete and unmodified

SEARCH PRIORITIES:
- Highly cited papers (100+ citations preferred)
- Recent publications (last 5 years unless historical context needed)
- Peer-reviewed journal articles and conference papers
- Review papers for comprehensive overviews
- Papers from reputable institutions and high-impact journals

PDF DISCOVERY FOCUS:
- Look for direct .pdf file links
- Check arXiv, bioRxiv, institutional repositories
- Prioritize open access sources
- Verify PDF accessibility

Order: Broad conceptual search → Specific high-quality paper details.`,
  },
};

export function getTemplate(templateType: TemplateType): Template {
  return COLUMN_TEMPLATES[templateType];
}

export function getDefaultSheetName(templateType: TemplateType): string {
  const timestamp = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const nameMap: Record<TemplateType, string> = {
    lucky: `Lucky Research - ${timestamp}`,
    marketing: `Marketing Analysis - ${timestamp}`,
    scientific: `Scientific Research - ${timestamp}`,
  };

  return nameMap[templateType];
}
