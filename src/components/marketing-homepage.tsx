'use client'

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignInModal } from "./sign-in-modal";

export function MarketingHomepage() {
  const router = useRouter();
  const [activeExample, setActiveExample] = useState<'search' | 'url' | 'structured'>('search');
  const [showSignIn, setShowSignIn] = useState(false);

  const examples = {
    search: {
      title: "Google Search Grounding",
      input: `A1: "search: best coffee shops in SF"`,
      output: `B1: Blue Bottle Coffee - 4.5★ (Mission District)
C1: Sightglass Coffee - 4.6★ (SOMA)  
D1: Ritual Coffee Roasters - 4.4★ (Hayes Valley)`,
      description: "Real-time web search flows directly into your workflow"
    },
    url: {
      title: "URL Context Extraction",
      input: `A1: "https://stripe.com/docs/api"
A2: "extract all payment endpoints"`,
      output: `B1: Stripe API Documentation Summary
B2: {
  "endpoints": [
    "/v1/charges",
    "/v1/refunds", 
    "/v1/payment_intents"
  ]
}`,
      description: "Extract and compare data from multiple sources instantly"
    },
    structured: {
      title: "Structured Output",
      input: `A1: "John Doe, john@example.com, (555) 123-4567"`,
      output: `B1: {
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "(555) 123-4567"
}`,
      description: "Turn chaos into clean, type-safe data automatically"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Animated background grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]"></div>
        
        <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/vibesurfers-logo-circle.svg"
              alt="VibeSurfing"
              width={40}
              height={40}
              className="rounded-lg"
            />
            <span className="text-2xl font-bold text-white">vibesurfing</span>
          </div>
          <button
            onClick={() => setShowSignIn(true)}
            className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/40"
            data-testid="nav-launch-btn"
          >
            Launch App →
          </button>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Built for the Google Vibe Coding Hackathon 2025
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight">
              <span className="text-white">Web Surfing.</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Redefined.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
              AI-powered spreadsheets that <span className="text-cyan-400 font-semibold">actually surf the web</span> for you.
              <br />
              Every cell is an agent. Every update cascades. Built for hackers.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
              <button
                onClick={() => setShowSignIn(true)}
                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-400/60 text-lg"
                data-testid="hero-start-surfing-btn"
              >
                Start Surfing →
              </button>
              <button
                onClick={() => window.open('https://github.com/vibesurfers/vibesheets', '_blank')}
                className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all border border-slate-700 hover:border-slate-600 text-lg"
                data-testid="hero-github-btn"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                  View on GitHub
                </span>
              </button>
            </div>

            {/* Demo Screenshot Placeholder */}
            <div className="pt-12">
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur-3xl opacity-20"></div>
                <div className="relative bg-slate-900/50 backdrop-blur border border-slate-800 rounded-2xl p-2 shadow-2xl">
                  <Image
                    src="/demo-screenshot.png"
                    alt="VibeSurfing Demo"
                    width={1200}
                    height={675}
                    className="rounded-xl"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problem/Solution Section */}
      <div className="relative bg-slate-900/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            The <span className="text-red-400">Old Way</span> vs The <span className="text-cyan-400">New Way</span>
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Old Way */}
            <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-8 space-y-4">
              <div className="text-red-400 font-mono text-sm">// Current Workflow</div>
              <h3 className="text-2xl font-bold text-white mb-4">10+ Tabs. Manual Copy-Paste. Hours Wasted.</h3>
              <div className="space-y-3 text-slate-400">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Open Google, search, copy results to spreadsheet</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Switch tabs, open URLs, manually extract data</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Parse messy text, structure it, validate formats</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-red-500 mt-1">✗</span>
                  <span>Write API scripts, debug, maintain</span>
                </div>
              </div>
            </div>

            {/* New Way */}
            <div className="bg-cyan-950/30 border border-cyan-900/50 rounded-2xl p-8 space-y-4">
              <div className="text-cyan-400 font-mono text-sm">// VibeSurfing Workflow</div>
              <h3 className="text-2xl font-bold text-white mb-4">One Cell. Natural Language. Instant Results.</h3>
              <div className="space-y-3 text-slate-400">
                <div className="flex items-start gap-3">
                  <span className="text-cyan-500 mt-1">✓</span>
                  <span>Type <code className="text-cyan-400 bg-cyan-950/50 px-2 py-0.5 rounded">search: best CRMs</code> → AI searches & populates</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-500 mt-1">✓</span>
                  <span>Paste URLs → AI extracts & summarizes content</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-500 mt-1">✓</span>
                  <span>Drop raw data → AI structures to JSON schema</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-cyan-500 mt-1">✓</span>
                  <span>Natural language → AI calls APIs automatically</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section - 4 Superpowers */}
      <div className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              4 Superpowers. Powered by <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">Gemini 2.5 Flash</span>
            </h2>
            <p className="text-xl text-slate-400">Every cell can be an AI agent with specialized capabilities</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Google Search */}
            <div className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-cyan-500/50 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-cyan-500/10">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-2xl font-bold text-white mb-3">Google Search Grounding</h3>
              <p className="text-slate-400 mb-4">
                Real-time web search with citations. Type a question, get instant answers with sources.
              </p>
              <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-sm">
                <div className="text-cyan-400">Cell A1:</div>
                <div className="text-white pl-4">"who won euro cup 2024?"</div>
                <div className="text-slate-600 my-2">↓</div>
                <div className="text-green-400">Cell B1:</div>
                <div className="text-white pl-4">Spain won + [sources]</div>
              </div>
            </div>

            {/* URL Context */}
            <div className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-blue-500/10">
              <div className="text-5xl mb-4">🌐</div>
              <h3 className="text-2xl font-bold text-white mb-3">URL Context Extraction</h3>
              <p className="text-slate-400 mb-4">
                Multi-URL content extraction and comparison. Paste links, get structured insights.
              </p>
              <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-sm">
                <div className="text-cyan-400">Cell A1:</div>
                <div className="text-white pl-4">https://docs.api.com</div>
                <div className="text-slate-600 my-2">↓</div>
                <div className="text-green-400">Cell B1:</div>
                <div className="text-white pl-4">Structured API docs</div>
              </div>
            </div>

            {/* Structured Output */}
            <div className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-purple-500/50 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-purple-500/10">
              <div className="text-5xl mb-4">📊</div>
              <h3 className="text-2xl font-bold text-white mb-3">Structured Output</h3>
              <p className="text-slate-400 mb-4">
                Type-safe JSON generation with Zod schemas. Turn chaos into clean data.
              </p>
              <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-sm">
                <div className="text-cyan-400">Cell A1:</div>
                <div className="text-white pl-4">Messy customer data</div>
                <div className="text-slate-600 my-2">↓</div>
                <div className="text-green-400">Cell B1:</div>
                <div className="text-white pl-4">{`{name, email, phone}`}</div>
              </div>
            </div>

            {/* Function Calling */}
            <div className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-pink-500/50 rounded-2xl p-8 transition-all hover:shadow-xl hover:shadow-pink-500/10">
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-2xl font-bold text-white mb-3">Function Calling</h3>
              <p className="text-slate-400 mb-4">
                Natural language becomes executable code. AI understands and calls APIs.
              </p>
              <div className="bg-slate-950/50 rounded-lg p-4 font-mono text-sm">
                <div className="text-cyan-400">Cell A1:</div>
                <div className="text-white pl-4">"schedule meeting tomorrow 2pm"</div>
                <div className="text-slate-600 my-2">↓</div>
                <div className="text-green-400">AI calls:</div>
                <div className="text-white pl-4">scheduleMeeting(...)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Examples */}
      <div className="relative bg-slate-900/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              See It In Action
            </h2>
            <p className="text-xl text-slate-400">Click to explore different operators</p>
          </div>

          <div className="flex justify-center gap-4 mb-8 flex-wrap">
            {(Object.keys(examples) as Array<keyof typeof examples>).map((key) => (
              <button
                key={key}
                onClick={() => setActiveExample(key)}
                className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                  activeExample === key
                    ? 'bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-500/30'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {examples[key].title}
              </button>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="text-cyan-400 font-mono text-sm mb-2">INPUT</div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white font-mono text-sm overflow-x-auto">
                  {examples[activeExample].input}
                </pre>
              </div>
              <div>
                <div className="text-green-400 font-mono text-sm mb-2">OUTPUT</div>
                <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-white font-mono text-sm overflow-x-auto">
                  {examples[activeExample].output}
                </pre>
              </div>
            </div>
            <p className="text-slate-400 text-center mt-6">
              {examples[activeExample].description}
            </p>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="relative py-24">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white text-center mb-16">
            Built for <span className="text-cyan-400">Real Workflows</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="text-xl font-bold text-white mb-3">Competitive Analysis</h3>
              <div className="space-y-2 text-sm font-mono text-slate-400">
                <div>→ Search "top CRM tools"</div>
                <div>→ Extract pricing from URLs</div>
                <div>→ Compare features</div>
                <div className="text-cyan-400">✓ Complete market research in minutes</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="text-xl font-bold text-white mb-3">Data Enrichment</h3>
              <div className="space-y-2 text-sm font-mono text-slate-400">
                <div>→ Paste email list</div>
                <div>→ Search LinkedIn profiles</div>
                <div>→ Extract work history</div>
                <div className="text-cyan-400">✓ Enrich 100s of leads automatically</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-8">
              <div className="text-4xl mb-4">📚</div>
              <h3 className="text-xl font-bold text-white mb-3">API Documentation</h3>
              <div className="space-y-2 text-sm font-mono text-slate-400">
                <div>→ Paste API docs URL</div>
                <div>→ Extract endpoints</div>
                <div>→ Generate curl examples</div>
                <div className="text-cyan-400">✓ Understand APIs instantly</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Architecture */}
      <div className="relative bg-slate-900/50 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Built for <span className="text-purple-400">Hackers</span>
            </h2>
            <p className="text-xl text-slate-400">Modern stack. Production-ready architecture.</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-bold text-cyan-400 mb-4">Frontend</h3>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500">▹</span>
                    Next.js 15 + React 19
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500">▹</span>
                    Tiptap (rich text tables)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500">▹</span>
                    tRPC for type-safe APIs
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-cyan-500">▹</span>
                    Tailwind CSS
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-purple-400 mb-4">Backend</h3>
                <ul className="space-y-2 text-slate-400">
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">▹</span>
                    Vertex AI Gemini 2.5 Flash
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">▹</span>
                    PostgreSQL + Drizzle ORM
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">▹</span>
                    NextAuth.js (Google OAuth)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-purple-500">▹</span>
                    Event-driven architecture
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-950/50 rounded-lg border border-slate-800">
              <div className="font-mono text-sm text-slate-400 space-y-2">
                <div className="text-cyan-400">// Cell-as-Agent Paradigm</div>
                <div>User edits cell → Event Queue (PostgreSQL)</div>
                <div className="pl-6">↓</div>
                <div>OperatorController dispatches to Gemini</div>
                <div className="pl-6">↓</div>
                <div>Gemini 2.5 Flash processes with tools</div>
                <div className="pl-6">↓</div>
                <div>SheetUpdater writes results back</div>
                <div className="pl-6">↓</div>
                <div>Real-time UI updates (tRPC)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Surf the Web</span>?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join Team Vibesurfers. Ride the waves of information.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => router.push('/welcome')}
              className="px-10 py-5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-400/60 text-xl"
              data-testid="cta-start-surfing-btn"
            >
              Start Surfing Now →
            </button>
            <button
              onClick={() => window.open('https://github.com/vibesurfers/vibesheets', '_blank')}
              className="px-10 py-5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg transition-all border border-slate-700 hover:border-slate-600 text-xl"
              data-testid="cta-github-btn"
            >
              Star on GitHub ⭐
            </button>
          </div>

          <p className="text-slate-500 mt-12 text-sm">
            Built with ❤️ and Gemini 2.5 Flash at the 2025 Google Vibe Coding Hackathon
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/vibesurfers-logo-circle.svg"
                alt="VibeSurfing"
                width={32}
                height={32}
              />
              <span className="text-slate-400">© 2025 Team Vibesurfers</span>
            </div>
            <div className="flex gap-6 text-slate-400">
              <a href="#" className="hover:text-cyan-400 transition-colors">Docs</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">GitHub</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Twitter</a>
              <a href="#" className="hover:text-cyan-400 transition-colors">Discord</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
