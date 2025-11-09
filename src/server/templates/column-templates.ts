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
    description: 'Find and organize academic papers, PDFs, and research materials with AI-powered analysis',
    icon: '🔬',
    isAutonomous: false,
    columns: [
      { title: 'Research Topic', position: 0, dataType: 'text' },
      { title: 'Paper Title', position: 1, dataType: 'text' },
      { title: 'PDF Link', position: 2, dataType: 'url' },
      { title: 'Authors', position: 3, dataType: 'array' },
      { title: 'Publication Year', position: 4, dataType: 'number' },
      { title: 'Citations Count', position: 5, dataType: 'number' },
      { title: 'Abstract', position: 6, dataType: 'text' },
      { title: 'Key Findings', position: 7, dataType: 'text' },
      { title: 'Methodology', position: 8, dataType: 'text' },
      { title: 'Research Field', position: 9, dataType: 'text' },
    ],
    systemPrompt: `You are an academic research assistant specializing in finding and analyzing highly cited, peer-reviewed research papers. For each research topic:

1. **Research Topic** - the primary scientific/academic search term or question
2. **Paper Title** - exact title of the discovered research paper
3. **PDF Link** - direct PDF access, prioritize open access papers, institutional repositories
4. **Authors** - comma-separated author list, surname first (e.g., "Smith, J., Doe, A., Johnson, M.")
5. **Publication Year** - year the paper was published
6. **Citations Count** - number of times the paper has been cited (use academic search tools)
7. **Abstract** - complete, unmodified abstract from the paper
8. **Key Findings** - main experimental results, discoveries, and contributions extracted from the paper
9. **Methodology** - research approach, experimental design, data collection methods, tools used
10. **Research Field** - specific academic discipline or subdiscipline

SEARCH PRIORITIES:
- Highly cited papers (100+ citations strongly preferred)
- Recent publications (last 5 years unless historical context needed)
- Peer-reviewed journal articles and conference papers
- Review papers for comprehensive field overviews
- Papers from reputable institutions and high-impact journals

PDF ANALYSIS WORKFLOW:
1. Find papers using academic search engines (Scholar, arXiv, PubMed, Semantic Scholar)
2. Verify PDF accessibility and download capability
3. Use PDF analysis tools to extract structured content
4. Fill methodology and key findings from paper content analysis
5. Cross-reference citation counts from multiple sources when possible

QUALITY STANDARDS:
- Verify paper authenticity and peer-review status
- Ensure methodology descriptions are technically accurate
- Extract verbatim abstracts without modification
- Note research limitations and future work when available
- Maintain academic integrity and proper attribution

Order: Broad literature search → Specific paper analysis → Detailed content extraction.`,
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
