/**
 * Seed data. Product facts come from the approved v4 release; tool facts come
 * from the book's own B27 "Verified tools snapshot" (5 Nov 2026), which links
 * every claim to an official source. Nothing here is a testimonial, rating or
 * sales figure.
 */

export const PRODUCT_SLUG = "ai-se-smart-kaam";

export const seedProduct = {
  slug: PRODUCT_SLUG,
  name: "AI SE SMART KAAM",
  subtitle: "The Practical AI Playbook — roz ke kaam ke liye AI, seedhi Hinglish mein",
  shortDescription:
    "Creators, small business owners, students, job seekers aur working professionals ke liye ek practical Hinglish playbook: 25 real use cases, RASTA prompting method, 100 ready-to-use prompts, 10 workflows, 27 bonus resources aur ek 30-day challenge.",
  pricePaise: 19900,
  currency: "INR" as const,
  active: true,
  coverImage: "/images/product/cover.webp",
  previewImages: [
    { src: "/images/product/preview-contents.webp", alt: "Book ka Contents page — Section 1 se Section 4 tak ke chapters" },
    { src: "/images/product/preview-tracks.webp", alt: "'Apna track chunein' page — Creator, Business owner, Student aur Professional tracks" },
    { src: "/images/product/preview-rasta.webp", alt: "RASTA prompting method page — Role, Aim, Situation, Type, Add-ons" },
    { src: "/images/product/preview-challenge.webp", alt: "30-day challenge roadmap page" },
    { src: "/images/product/preview-prompts.webp", alt: "Bonus B1 — 100 ready-to-use prompts ka pehla page" },
  ],
  highlights: [
    "8 learning sections",
    "25 practical use cases",
    "RASTA prompting method",
    "100 ready-to-use prompts",
    "10 complete AI workflows",
    "27 bonus resources",
    "30-day challenge",
  ],
  seoTitle: "AI SE SMART KAAM — The Practical AI Playbook (Hinglish e-book)",
  seoDescription:
    "Practical Hinglish AI playbook: 25 use cases, RASTA prompting method, 100 prompts, 10 workflows, 27 bonuses aur 30-day challenge. Instant digital download.",
};

/** The approved v4 customer package. Checksums verified against the release audit addendum. */
export const seedAssets = [
  {
    storageKey: "ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip",
    filename: "AI_SE_SMART_KAAM_v4_CUSTOMER_DOWNLOAD.zip",
    label: "Complete package (ZIP — sabhi 4 PDFs)",
    contentType: "application/zip" as const,
    sizeBytes: 10696797,
    sha256: "adc89b4e7202c77333997e294ee8bdc30e30d4eccbd8cd01fc6458e5e9769027",
    sortOrder: 0,
  },
  {
    storageKey: "ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_READER_EDITION_A4.pdf",
    filename: "AI_SE_SMART_KAAM_v4_READER_EDITION_A4.pdf",
    label: "Reader Edition — A4 (laptop / print)",
    contentType: "application/pdf" as const,
    sizeBytes: 3983127,
    sha256: "d04d99c228ab6e624039a947105fd2719e521d1bab7ecf9aab1718ed4d6b583a",
    sortOrder: 1,
  },
  {
    storageKey: "ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_READER_EDITION_PHONE.pdf",
    filename: "AI_SE_SMART_KAAM_v4_READER_EDITION_PHONE.pdf",
    label: "Reader Edition — Phone",
    contentType: "application/pdf" as const,
    sizeBytes: 4396603,
    sha256: "e5ba1284e8811137365eb1d817ccbf9d321230d273d61fe59b046005495ad350",
    sortOrder: 2,
  },
  {
    storageKey: "ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_BONUS_TOOLKIT_A4.pdf",
    filename: "AI_SE_SMART_KAAM_v4_BONUS_TOOLKIT_A4.pdf",
    label: "Bonus Toolkit — A4",
    contentType: "application/pdf" as const,
    sizeBytes: 1642171,
    sha256: "9eabeece70c17cc79f339dfbbc97d585c2588c081a54d5f1c0ce97582c41e213",
    sortOrder: 3,
  },
  {
    storageKey: "ai-se-smart-kaam/v4/AI_SE_SMART_KAAM_v4_BONUS_TOOLKIT_PHONE.pdf",
    filename: "AI_SE_SMART_KAAM_v4_BONUS_TOOLKIT_PHONE.pdf",
    label: "Bonus Toolkit — Phone",
    contentType: "application/pdf" as const,
    sizeBytes: 1947263,
    sha256: "8be4a328c9d4ccd8d4ca686e2325f2cf329f03f0406e29eb8e0e564c146f1810",
    sortOrder: 4,
  },
];

const B27 = new Date("2026-11-05T00:00:00+05:30");

type SeedTool = {
  slug: string;
  name: string;
  website: string;
  description: string;
  category: "chatbots" | "study-research" | "design-video" | "stock-media" | "automation";
  useCases: string[];
  pricingClass: "free" | "free-plan-with-limits" | "paid" | "unverified";
  pricingNote: string;
  limitations: string[];
  verification: { status: "verified" | "partly-verified" | "unverified"; lastVerifiedAt: Date; sourceUrl: string };
  status: "draft" | "published";
};

const chatbotPricing =
  "Bina paid plan ke shuru kiya ja sakta hai, par usage limits ke saath. Kaunse features free hain yeh account, desh aur samay ke saath badalta hai — exact message limits officially confirm nahi ho saki.";

export const seedTools: SeedTool[] = [
  {
    slug: "chatgpt",
    name: "ChatGPT",
    website: "https://chatgpt.com",
    description: "OpenAI ka general-purpose AI chatbot — likhna, samjhna, brainstorm karna aur roz ke sawaal.",
    category: "chatbots",
    useCases: ["Drafts aur messages likhna", "Concepts seedhi bhasha mein samajhna", "Ideas brainstorm karna"],
    pricingClass: "free-plan-with-limits",
    pricingNote: chatbotPricing,
    limitations: [
      "Settings mein 'Improve the model for everyone' control hota hai — privacy ke liye check kariye.",
      "Personal accounts (Free, Go, Plus, Pro) par naya GPT banana aur publish karna abhi available nahi (5 Nov 2026).",
      "Free users ko voice ka 'limited access'; limits badal sakti hain.",
    ],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://help.openai.com/en/articles/7730893-data-controls-faq" },
    status: "published",
  },
  {
    slug: "gemini",
    name: "Google Gemini",
    website: "https://gemini.google.com",
    description: "Google ka AI assistant — Google account ke saath chat, research aur roz ke kaam.",
    category: "chatbots",
    useCases: ["Sawaal-jawaab aur explanations", "Drafts likhna", "Activity manage karna aur auto-delete set karna"],
    pricingClass: "free-plan-with-limits",
    pricingNote: chatbotPricing,
    limitations: [
      "Gemini Live: Android phone/tablet ke Gemini app mein; free access officially confirm nahi.",
      "Personal 18+ accounts par Gems 17 Nov 2026 se read-only aur 17 Dec 2026 ko hata diye jaayenge.",
      "Gemini in Google Sheets ke liye eligible Workspace ya Google AI plan chahiye.",
    ],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://support.google.com/gemini/answer/13278892?hl=en" },
    status: "published",
  },
  {
    slug: "claude",
    name: "Claude",
    website: "https://claude.ai",
    description: "Anthropic ka AI assistant — lambe documents, writing aur structured kaam ke liye useful.",
    category: "chatbots",
    useCases: ["Lambe documents samajhna", "Writing aur editing", "Projects mein apni instructions save karna"],
    pricingClass: "free-plan-with-limits",
    pricingNote: chatbotPricing,
    limitations: ["Account-wide instructions, projects aur skills se personalization hoti hai — features plan ke hisaab se alag ho sakte hain."],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://support.claude.com/en/articles/10185728-understanding-claude-s-personalization-features" },
    status: "published",
  },
  {
    slug: "perplexity",
    name: "Perplexity",
    website: "https://www.perplexity.ai",
    description: "Source links ke saath jawab dene wala AI search tool — research aur fact-finding ke liye.",
    category: "chatbots",
    useCases: ["Sources ke saath research", "Topic ka quick overview", "Facts verify karne ki shuruaat"],
    pricingClass: "free-plan-with-limits",
    pricingNote: chatbotPricing,
    limitations: ["Free, Pro aur Max users Account settings → Preferences mein 'AI data retention' band kar sakte hain.", "Diye gaye sources khud khol kar check kariye."],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://intercom.help/perplexity-ai/en/articles/11564572-data-collection-at-perplexity" },
    status: "published",
  },
  {
    slug: "microsoft-copilot",
    name: "Microsoft Copilot",
    website: "https://copilot.microsoft.com",
    description: "Microsoft ka AI assistant — 170+ markets mein available; Hindi personal Microsoft accounts ke liye listed.",
    category: "chatbots",
    useCases: ["Roz ke sawaal", "Drafts aur summaries", "Hindi mein baat-cheet"],
    pricingClass: "free-plan-with-limits",
    pricingNote: chatbotPricing,
    limitations: ["Privacy page purane Copilot app version par laagu likhta hai — latest settings app mein check kariye."],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://support.microsoft.com/en-us/Microsoft-Copilot/supported-regions-and-languages-in-microsoft-copilot" },
    status: "published",
  },
  {
    slug: "gemini-notebook",
    name: "Gemini Notebook (pehle NotebookLM)",
    website: "https://notebooklm.google.com",
    description: "Apne sources (PDF, notes, links) par based notebook — summaries, Q&A aur Audio Overview.",
    category: "study-research",
    useCases: ["Chapter se notes aur quiz", "Audio Overview se revision", "Documents par sawaal poochna"],
    pricingClass: "free-plan-with-limits",
    pricingNote: "Standard (free, Gmail account): 100 notebooks, har notebook mein 50 sources; daily quota 24 ghante mein reset.",
    limitations: ["Audio Overview ka interactive mode sirf English mein.", "Viewers 'chat view' link se bhi sources tak pahunch sakte hain — share karte waqt dhyan rakhiye."],
    verification: { status: "verified", lastVerifiedAt: B27, sourceUrl: "https://blog.google/innovation-and-ai/products/gemini-notebook/notebooklm-gemini-notebook/" },
    // Website URL after the July 2026 rename not independently confirmed — admin should verify before publishing.
    status: "draft",
  },
  {
    slug: "canva",
    name: "Canva",
    website: "https://www.canva.com",
    description: "Design tool — thumbnails, posts, Reel covers aur presentations templates ke saath.",
    category: "design-video",
    useCases: ["YouTube thumbnail aur Reel cover", "Social media posts", "Simple business creatives"],
    pricingClass: "free-plan-with-limits",
    pricingNote: "Free plan par AI tools: Standard ya Premium AI ke up to 20 uses/month; har mahine 1 tareekh ko 00:00 UTC (5:30 AM IST) reset.",
    limitations: ["Templates aur sharing ki free-plan details officially confirm nahi ho saki."],
    verification: { status: "verified", lastVerifiedAt: B27, sourceUrl: "https://www.canva.com/help/ai-access/" },
    status: "published",
  },
  {
    slug: "google-flow",
    name: "Google Flow",
    website: "https://support.google.com/flow/answer/16353333",
    description: "Google ka AI video generation tool — B-roll clips ke liye optional.",
    category: "design-video",
    useCases: ["AI B-roll clips"],
    pricingClass: "free-plan-with-limits",
    pricingNote:
      "Official pages ke anusaar (6 Nov 2026): bina subscription basic video generation aur 50 Flow credits per day; peak hours mein bina subscription generation ruk sakti hai. 50 credits ko sabke liye free allowance mat samjhiye.",
    limitations: ["18+ aur supported region zaroori.", "India mein visible watermark (Ultra 20x plan chhodkar)."],
    verification: { status: "verified", lastVerifiedAt: new Date("2026-11-06T00:00:00+05:30"), sourceUrl: "https://support.google.com/flow/answer/16353333" },
    status: "draft",
  },
  {
    slug: "pexels",
    name: "Pexels",
    website: "https://www.pexels.com",
    description: "Free stock photos aur videos — creators aur businesses ke liye.",
    category: "stock-media",
    useCases: ["Video B-roll", "Blog aur social images"],
    pricingClass: "free",
    pricingNote: "Photos/videos commercial use mein bhi free (Pexels license ke anusaar).",
    limitations: ["Logos, brands aur pehchane ja sakne wale logon ke alag adhikaar ho sakte hain — unse endorsement ka bhram mat banaiye."],
    verification: { status: "verified", lastVerifiedAt: B27, sourceUrl: "https://help.pexels.com/hc/en-us/articles/360042295214" },
    status: "published",
  },
  {
    slug: "pixabay",
    name: "Pixabay",
    website: "https://pixabay.com",
    description: "Free images, videos aur music — attribution zaroori nahi.",
    category: "stock-media",
    useCases: ["Background visuals", "Simple illustrations"],
    pricingClass: "free",
    pricingNote: "Content free, attribution zaroori nahi (Pixabay license ke anusaar).",
    limitations: ["Content ko jaisa ka taisa bechna, logo/brand wale content ka galat use, ya bhramak use mana hai."],
    verification: { status: "verified", lastVerifiedAt: B27, sourceUrl: "https://pixabay.com/service/license/" },
    status: "published",
  },
  {
    slug: "zapier",
    name: "Zapier",
    website: "https://zapier.com",
    description: "No-code automation — ek app ka event doosre app mein action trigger karta hai.",
    category: "automation",
    useCases: ["Form enquiry ka alert", "Simple 2-step automations"],
    pricingClass: "free-plan-with-limits",
    pricingNote: "Free plan: 100 tasks/month; sirf two-step Zaps (1 trigger + 1 action); polling triggers har 15 minute mein check.",
    limitations: ["Multi-step Zaps aur premium apps paid plans mein."],
    verification: { status: "verified", lastVerifiedAt: B27, sourceUrl: "https://help.zapier.com/hc/en-us/articles/32337438839565-What-s-included-in-Zapier-s-Free-plan" },
    status: "published",
  },
  {
    slug: "make",
    name: "Make",
    website: "https://www.make.com",
    description: "Visual no-code automation platform — multi-step scenarios ke liye.",
    category: "automation",
    useCases: ["Content repurpose pipeline", "Multi-step workflows"],
    pricingClass: "free-plan-with-limits",
    pricingNote: "Free plan: 1,000 credits/month (1 MB data storage, 1 data store); AI wale features zyada credits le sakte hain.",
    limitations: ["Active scenarios aur free-plan scheduling interval ki ginti official pages par confirm nahi ho saki."],
    verification: { status: "partly-verified", lastVerifiedAt: B27, sourceUrl: "https://www.make.com/en/pricing" },
    status: "published",
  },
];

export const seedServices = [
  {
    slug: "ai-video-content",
    title: "AI video content creation",
    summary: "Scripts, visuals aur voice ke liye AI tools ko practical workflow mein jod kar short-form aur explainer videos.",
    deliverables: ["Script aur hook drafts", "AI-assisted visuals / B-roll planning", "Platform-wise formats (Reels, Shorts, YouTube)"],
    sortOrder: 1,
  },
  {
    slug: "ai-video-editing",
    title: "AI-assisted video editing",
    summary: "Captions, cuts, repurposing aur cleanup mein AI tools ka use — human review ke saath.",
    deliverables: ["Captions aur subtitles", "Long video → short clips", "Thumbnails aur covers"],
    sortOrder: 2,
  },
  {
    slug: "business-automation",
    title: "Business automation",
    summary: "Enquiry alerts, follow-ups aur repetitive admin kaam ke liye no-code automations — testing aur fallback ke saath.",
    deliverables: ["Process mapping", "No-code automation setup", "Testing, failure handling aur handover notes"],
    sortOrder: 3,
  },
  {
    slug: "custom-ai-workflows",
    title: "Custom AI workflows",
    summary: "Aapki team ke specific kaam ke liye prompt libraries, SOPs aur AI-assisted workflows.",
    deliverables: ["Use-case discovery", "Prompt library aur templates", "Team ke liye simple SOP"],
    sortOrder: 4,
  },
  {
    slug: "ai-content-systems",
    title: "AI content systems",
    summary: "Ideas se publishing tak ek repeatable content system — calendar, templates aur review checklist ke saath.",
    deliverables: ["Content calendar framework", "Repurposing workflow", "Quality aur fact-check checklist"],
    sortOrder: 5,
  },
];

type SeedTutorial = {
  slug: string;
  title: string;
  excerpt: string;
  category: "ai-basics" | "prompt-engineering" | "content-creation" | "students" | "business" | "productivity" | "automation";
  level: "beginner" | "intermediate";
  readingMinutes: number;
  status: "draft" | "published";
  body: string;
  sources?: { label: string; url: string }[];
};

export const seedTutorials: SeedTutorial[] = [
  {
    slug: "ai-chatbot-kya-hai",
    title: "AI chatbot kya hai — aur yeh kabhi-kabhi galat kyun hota hai",
    excerpt: "ChatGPT, Gemini ya Claude jaise chatbots andar se kaise kaam karte hain, aur unke jawab ko blindly trust kyun nahi karna chahiye.",
    category: "ai-basics",
    level: "beginner",
    readingMinutes: 5,
    status: "published",
    body: `AI chatbot ek aisa software hai jo aapke likhe sawaal ko padhkar, insaan jaisi bhasha mein jawab likhta hai. Inke peeche **large language model (LLM)** hota hai — ek model jise bahut saare text par train kiya gaya hai.

## Yeh kaam kaise karta hai?

Seedhi bhasha mein: model yeh andaza lagata hai ki aapke sawaal ke baad **kaunse shabd aane ki sabse zyada sambhavna hai**. Yeh andaza itna achha hota hai ki jawab samajhdaar lagta hai — par model "jaanta" nahi hai jaise insaan jaanta hai.

## Galat jawab kyun aate hain?

Kyunki model sambhavna ke hisaab se likhta hai, kabhi-kabhi woh **confident tone mein galat baat** bhi likh deta hai — jaise ek fake statistic, galat date, ya aisi book jo exist hi nahi karti. Ise aksar *hallucination* kehte hain.

Isliye yeh 3 aadatein rakhiye:

1. **Numbers, dates, kanoon, health aur paise** se judi baat ko hamesha official source se check kariye.
2. Chatbot se poochiye: "Is jawab ke kaunse hisse pakke nahi hain?" — isse weak points saamne aate hain.
3. Pehla jawab draft samjhiye, final nahi.

## Privacy ka dhyan

Chatbot mein jo bhi paste karte hain, woh company ke servers par jaata hai. Passwords, OTP, bank details, Aadhaar/PAN numbers ya kisi ki private jaankari kabhi paste mat kariye. Har tool ki privacy settings ek baar zaroor dekhiye.

## Aage kya?

AI ko ek tez, mehnati assistant samjhiye — jiska kaam aapko check karna hai. Sahi sawaal poochna seekh liya, toh yahi assistant aapka bahut time bacha sakta hai.`,
  },
  {
    slug: "achha-prompt-kaise-likhein",
    title: "Achha prompt kaise likhein: 4 cheezein jo farak laati hain",
    excerpt: "Vague prompt se generic jawab milta hai. Yeh 4 cheezein add kariye — kaam, situation, format aur example — aur output ka farak dekhiye.",
    category: "prompt-engineering",
    level: "beginner",
    readingMinutes: 6,
    status: "published",
    body: `Zyadatar log AI se ek line ka sawaal poochte hain aur generic jawab paakar soch lete hain ki "AI kuch khaas nahi hai". Asal mein problem aksar prompt mein hoti hai.

## 1. Kaam saaf likhiye

"Instagram ke baare mein batao" ke bajaye likhiye: **"Meri bakery ke liye Diwali offer ka Instagram caption likho."** Ek action word (likho, samjhao, compare karo, list banao) se shuru kariye.

## 2. Situation batāiye

AI ko aapka context nahi pata. Kaun hai audience? Kaunsa shehar? Budget? Tone? 2–3 lines ka context jawab ko aapke kaam ke kareeb le aata hai.

> Example: "Meri Jaipur mein chhoti bakery hai. Customers zyadatar college students aur families hain. Offer: 2 cakes par 10% off, sirf weekend."

## 3. Format maangiye

Aapko output kis shakl mein chahiye — 3 options? Table? 50 shabd? Hinglish? Bullet points? Format batane se editing ka time bachta hai.

## 4. Example dijiye (agar ho)

Agar aapke paas pehle ka koi caption ya message hai jo aapko pasand hai, use example ke roop mein dijiye aur kahiye: "Is tone mein likho."

## Pehla jawab draft hai

Jawab pasand nahi aaya? Naya chat shuru karne ke bajaye follow-up kariye: "Isse chhota karo", "Zyada friendly tone", "Option 2 ko 3 versions mein likho." Achha output aksar 2–3 rounds mein aata hai.

## Ek full example

\`\`\`
Meri Jaipur mein chhoti bakery hai. Customers zyadatar college students aur
families hain. Weekend par 2 cakes par 10% off ka offer hai.
Is offer ke liye 3 Instagram captions likho — Hinglish mein, friendly tone,
har caption 40 shabdon se kam, end mein ek simple call-to-action.
\`\`\`

Yeh simple structure roz ke 80% kaam ke liye kaafi hai. Aur gehra, step-by-step method (RASTA) aur 100 ready prompts *AI SE SMART KAAM* playbook mein hain.`,
  },
  {
    slug: "ai-privacy-kya-share-karein",
    title: "AI tools use karte waqt privacy: kya share karein, kya nahi",
    excerpt: "AI chatbot mein kuch bhi paste karne se pehle yeh simple checklist dekhiye — apni aur apne customers ki jaankari surakshit rakhiye.",
    category: "productivity",
    level: "beginner",
    readingMinutes: 4,
    status: "published",
    body: `AI tools bahut kaam aate hain, par jo bhi aap type ya upload karte hain, woh tool banane wali company ke servers tak jaata hai. Thodi si saavdhani se aap zyada tar risk se bach sakte hain.

## Kabhi share mat kariye

- Passwords, OTP, PIN
- Bank account, card ya UPI details
- Aadhaar, PAN ya passport numbers
- Customers ya students ki personal details (naam + phone + address jaisi jaankari)
- Company ki confidential files jinhe share karne ki permission nahi hai

## Share karne se pehle anonymise kariye

Asli naam ki jagah "Customer A", asli number ki jagah "[PHONE]" likhiye. AI ko kaam samajhne ke liye asli details ki zaroorat nahi hoti.

## Settings ek baar check kariye

Zyadatar chatbots mein data aur history se judi settings hoti hain — jaise chat history band karna, ya apni conversations ko model improve karne ke liye use na hone dena. Har tool ki official help ya privacy page par current options dekhiye, kyunki yeh settings samay ke saath badalti rehti hain.

## Account ko surakshit rakhiye

Jis email se AI tools mein login karte hain, us par **2-Step Verification** on rakhiye. Shared computer par kaam ke baad logout kariye.

## Business ke liye ek line ki policy

Team ke liye ek simple niyam likh dijiye: *"Customer ki personal jaankari kisi bhi AI tool mein paste nahi hogi; zaroorat ho toh placeholders use honge."* Yeh ek line kaafi galtiyon se bachati hai.`,
  },
  {
    slug: "students-ai-notes-se-quiz",
    title: "Students ke liye AI: chapter se notes aur quiz (draft)",
    excerpt: "Draft — admin review ke baad publish hoga.",
    category: "students",
    level: "beginner",
    readingMinutes: 5,
    status: "draft",
    body: "Draft content. Publish karne se pehle likhiye aur review kariye.",
  },
  {
    slug: "creators-script-workflow",
    title: "Content creators ke liye AI script workflow (draft)",
    excerpt: "Draft — admin review ke baad publish hoga.",
    category: "content-creation",
    level: "beginner",
    readingMinutes: 5,
    status: "draft",
    body: "Draft content. Publish karne se pehle likhiye aur review kariye.",
  },
  {
    slug: "small-business-pehle-3-kaam",
    title: "Small business ke liye AI: pehle 3 kaam (draft)",
    excerpt: "Draft — admin review ke baad publish hoga.",
    category: "business",
    level: "beginner",
    readingMinutes: 5,
    status: "draft",
    body: "Draft content. Publish karne se pehle likhiye aur review kariye.",
  },
  {
    slug: "automation-bina-code",
    title: "Automation kya hai — bina code ke (draft)",
    excerpt: "Draft — admin review ke baad publish hoga.",
    category: "automation",
    level: "beginner",
    readingMinutes: 5,
    status: "draft",
    body: "Draft content. Publish karne se pehle likhiye aur review kariye.",
  },
];

const DRAFT = `> **DRAFT — abhi approve nahi hua.** Yeh template hai. Bracket [ ] wali har jaankari AI SEEKHO owner ko bharni aur approve karni hai. Kisi qualified professional se review karwana recommended hai.`;

export const seedLegal: Record<string, string> = {
  "privacy-policy": `${DRAFT}

## Hum kaun hain

Yeh website [Business / owner ka legal naam] dwara chalayi jaati hai ("AI SEEKHO", "hum").

## Hum kaunsi jaankari lete hain

- **Purchase ke waqt:** naam, email address, aur optional phone number — order process karne aur download access dene ke liye.
- **Payment:** payments Razorpay process karta hai. Card, UPI ya bank details hamare servers par store nahi hoti.
- **Contact / service forms:** jo jaankari aap form mein bharte hain.
- **Technical data:** security aur abuse-prevention ke liye limited technical data (jaise IP address ka one-way hash).
- **Analytics / cookies:** [Sirf tab, jab analytics enable ho aur aap consent dein — owner confirm kare kaunse tools use honge].

## Jaankari ka use

Order complete karna, download access dena, support dena, fraud aur abuse rokna, aur kanooni zimmedariyan poori karna.

## Sharing

Hum aapki jaankari bechte nahi hain. Service providers: Razorpay (payments), MongoDB Atlas (database), Netlify (hosting), [Email provider — agar configure ho].

## Retention

[Owner decide kare: order records kitne samay tak rakhe jaayenge — tax/accounting requirements ke hisaab se].

## Aapke adhikaar

Apni jaankari dekhne, sudharne ya delete karwane ke liye [support email] par likhiye. Applicable Indian data protection kanoon (DPDP Act, 2023 aur Rules) ke anusaar request handle ki jaayegi.

## Contact

[Grievance / support contact — naam aur email]`,
  terms: `${DRAFT}

## Agreement

AI SEEKHO website aur products use karke aap in terms se sahmat hote hain.

## Digital product license

Kharida gaya e-book aur bonus files **sirf aapke personal ya apne business ke internal use** ke liye hain. Files ko dobara bechna, publicly share karna, ya kisi aur ke saath download link share karna mana hai. Prompts aur templates aap apne kaam mein use kar sakte hain.

## Koi guarantee nahi

Content educational hai. Hum kisi income, business growth, exam result ya job ki guarantee nahi dete. AI tools ke features aur limits badalte rehte hain.

## Third-party tools

Book mein jin tools ka zikr hai, woh unke owners ke trademarks hain. AI SEEKHO kisi tool se judi, sponsored ya approved nahi hai.

## Pricing

Price checkout par dikhaya jaata hai aur INR mein hai. [Owner confirm kare: GST applicable hai ya nahi].

## Governing law

[Owner confirm kare: jurisdiction / shehar]

## Contact

[Support email]`,
  "refund-policy": `${DRAFT}

## Digital products

AI SE SMART KAAM ek digital download hai jo payment verify hote hi deliver hota hai.

## Refund policy

[OWNER TO DECIDE — misaal ke taur par options:
(a) Digital product hone ki wajah se refund nahi, sirf technical issue par help;
(b) X din ke andar, Y conditions par refund.
Jo bhi chunein, wahi exact likhiye. Refund kitne business days mein process hoga woh bhi likhiye.]

## Payment fail ya double charge

Agar payment aapke account se kat gaya lekin order confirm nahi hua, toh [support email] par order reference / payment ID ke saath likhiye. [Owner confirm kare: resolution timeline].

## Cancellation

Download access milne ke baad order cancel nahi kiya ja sakta. [Owner confirm kare].

## Contact

[Support email]`,
  "delivery-policy": `${DRAFT}

## Delivery kaise hoti hai

- Payment Razorpay se **verify hone ke baad** hi download access diya jaata hai.
- Successful payment ke baad usi browser mein order page par download links dikhte hain.
- [Email delivery: jab email service configure ho jayegi, tab download link email bhi kiya jayega.]

## Kya milta hai

Ek ZIP file jisme 4 PDFs hain: Reader Edition (A4), Reader Edition (Phone), Bonus Toolkit (A4), Bonus Toolkit (Phone). Har PDF alag se bhi download ki ja sakti hai.

## Download link

- Aapka personal download link **180 din** tak valid rehta hai, aur reasonable retries ke liye limited downloads allow karta hai.
- Har file link sirf kuch minute ke liye valid hota hai — page refresh karke naya link mil jaata hai.
- Link kho gaya? "Download recover kariye" page par email aur order reference daaliye.

## Shipping

Koi physical shipping nahi hoti.

## Contact

[Support email]`,
  support: `${DRAFT}

## Support

- **Email:** [support email]
- **Response time:** [Owner confirm kare, jaise "2 working days ke andar"]
- **Business naam:** [Legal naam]
- **Address:** [Sirf agar owner publish karna chahein / Razorpay ke liye zaroori ho]

## Order help

Email mein apna **order reference** (AIS-XXXXX-XXXXX) aur purchase wala email address zaroor likhiye. Card ya UPI PIN kabhi share mat kariye — hum kabhi nahi maangenge.`,
};

export const seedSettings = {
  key: "site",
  brandName: "AI SEEKHO",
  tagline: "Learn. Create. Automate.",
  supportEmail: "",
  supportHours: "",
  seoTitle: "AI SEEKHO — Learn. Create. Automate.",
  seoDescription:
    "AI SEEKHO: Indian students, creators, freelancers, professionals aur small business owners ke liye practical AI education — Hinglish mein.",
  socialLinks: [] as { label: string; url: string }[],
  business: { legalName: "", address: "", gstin: "" },
};
