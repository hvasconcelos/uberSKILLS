import { ChangelogSection } from "@/components/landing/changelog-section";
import { FaqSection } from "@/components/landing/faq-section";
import { FeatureCards } from "@/components/landing/feature-cards";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingNav } from "@/components/landing/landing-nav";
import { SocialProof } from "@/components/landing/social-proof";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uberskills.dev";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      name: "uberSKILLS",
      url: SITE_URL,
      description:
        "Open-source visual workbench for building Agent Skills. Create with AI, test across models, and deploy to Claude Code, GitHub Copilot, Cursor, Windsurf, and more with one click.",
    },
    {
      "@type": "SoftwareApplication",
      name: "uberSKILLS",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Any",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      license: "https://opensource.org/licenses/MIT",
      url: SITE_URL,
      downloadUrl: "https://www.npmjs.com/package/@uberskillsdev/uberskills",
      softwareVersion: "latest",
      screenshot: `${SITE_URL}/uberskills-opengraph.png`,
      sourceOrganization: {
        "@type": "Organization",
        name: "uberSKILLS",
        url: "https://github.com/uberskillsdev",
      },
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "What is uberSKILLS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "uberSKILLS is an open-source web application for designing, testing, and deploying Agent Skills. It provides a visual editor with AI-assisted creation, a multi-model testing sandbox, and one-click deployment to your agent of choice.",
          },
        },
        {
          "@type": "Question",
          name: "What are Agent Skills?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Agent Skills are reusable instruction sets (SKILL.md files) that teach code agents how to perform specific tasks. They contain metadata, structured instructions, and optional file templates that agents can follow to complete complex workflows consistently.",
          },
        },
        {
          "@type": "Question",
          name: "Which code agents does uberSKILLS support?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "uberSKILLS supports deploying skills to Antigravity, Claude Code, Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode, and Windsurf. Skills are exported in standard SKILL.md format, so they can also be adapted for other agents that support markdown-based instructions.",
          },
        },
        {
          "@type": "Question",
          name: "Do I need an API key to use uberSKILLS?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "You need an OpenRouter API key to use AI-assisted skill creation and the testing sandbox. The visual editor and manual skill creation work without an API key. Your key is encrypted with AES-256-GCM and never leaves your machine.",
          },
        },
        {
          "@type": "Question",
          name: "Is uberSKILLS free?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, uberSKILLS is completely free and open-source under the MIT license. You only pay for the AI model usage through your own OpenRouter API key when using AI-assisted features.",
          },
        },
        {
          "@type": "Question",
          name: "How does the AI-assisted skill creation work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Describe what you want your skill to do in natural language, and the AI generates a complete SKILL.md file with metadata, instructions, and file templates. You can iterate on the output through a chat interface until the skill matches your intent.",
          },
        },
        {
          "@type": "Question",
          name: "Can I test skills against different AI models?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. The testing sandbox lets you run your skill against any model available on OpenRouter, including Claude, GPT-4, Gemini, Llama, and more. You get streaming responses with token usage metrics so you can compare results across models.",
          },
        },
        {
          "@type": "Question",
          name: "How does deployment work?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "One-click deployment copies your skill to the appropriate directory for your chosen agent (e.g., ~/.claude/skills/ for Claude Code). You can also export skills as a zip file to share with others or back up your work.",
          },
        },
        {
          "@type": "Question",
          name: "Can I import existing skills?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. You can import skills from zip files or directly from a directory on your filesystem. uberSKILLS parses the SKILL.md format and loads the skill into the editor for further editing, testing, and deployment.",
          },
        },
        {
          "@type": "Question",
          name: "Is my data stored locally?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "All data is stored in a local SQLite database on your machine. Nothing is sent to external servers except AI model requests through OpenRouter when you use AI-assisted features. You have full control over your data.",
          },
        },
      ],
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }],
    },
  ],
};

export default function LandingPage() {
  return (
    <>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data requires dangerouslySetInnerHTML
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      <LandingNav />
      <main id="main">
        <HeroSection />
        <FeatureCards />
        <HowItWorks />
        <FaqSection />
        <ChangelogSection />
        <SocialProof />
        <LandingFooter />
      </main>
    </>
  );
}
