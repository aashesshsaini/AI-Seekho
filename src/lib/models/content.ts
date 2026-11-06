import mongoose, { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const TUTORIAL_CATEGORIES = [
  { slug: "ai-basics", label: "AI Basics" },
  { slug: "prompt-engineering", label: "Prompt Engineering" },
  { slug: "content-creation", label: "Content Creation" },
  { slug: "students", label: "AI for Students" },
  { slug: "business", label: "AI for Business" },
  { slug: "productivity", label: "Productivity" },
  { slug: "automation", label: "Automation" },
] as const;
export type TutorialCategory = (typeof TUTORIAL_CATEGORIES)[number]["slug"];

const slug = { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ };

/* ----------------------------------------------------------------- Tutorial */

const tutorialSchema = new Schema(
  {
    slug,
    title: { type: String, required: true, trim: true, maxlength: 160 },
    excerpt: { type: String, trim: true, maxlength: 300, default: "" },
    category: { type: String, enum: TUTORIAL_CATEGORIES.map((c) => c.slug), required: true, index: true },
    level: { type: String, enum: ["beginner", "intermediate"], default: "beginner" },
    /** Lightweight markdown (headings, lists, paragraphs, code, links). */
    body: { type: String, default: "" },
    readingMinutes: { type: Number, default: 4 },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    publishedAt: { type: Date },
    sources: { type: [{ label: String, url: String, _id: false }], default: [] },
  },
  { timestamps: true },
);
export type TutorialDoc = InferSchemaType<typeof tutorialSchema> & { _id: mongoose.Types.ObjectId; updatedAt: Date };
export const Tutorial: Model<TutorialDoc> =
  (models.Tutorial as Model<TutorialDoc>) || model<TutorialDoc>("Tutorial", tutorialSchema);

/* --------------------------------------------------------------------- Tool */

export const TOOL_CATEGORIES = [
  { slug: "chatbots", label: "Chatbots" },
  { slug: "study-research", label: "Study & Research" },
  { slug: "design-video", label: "Design & Video" },
  { slug: "stock-media", label: "Stock Media" },
  { slug: "automation", label: "Automation" },
] as const;
export type ToolCategory = (typeof TOOL_CATEGORIES)[number]["slug"];

export const PRICING_CLASSES = ["free", "free-plan-with-limits", "paid", "unverified"] as const;
export type PricingClass = (typeof PRICING_CLASSES)[number];

const toolSchema = new Schema(
  {
    slug,
    name: { type: String, required: true, trim: true, maxlength: 80 },
    website: { type: String, required: true, match: /^https:\/\// },
    description: { type: String, trim: true, maxlength: 500, default: "" },
    category: { type: String, enum: TOOL_CATEGORIES.map((c) => c.slug), required: true, index: true },
    useCases: { type: [String], default: [] },
    pricingClass: { type: String, enum: PRICING_CLASSES, default: "unverified" },
    pricingNote: { type: String, maxlength: 400, default: "" },
    limitations: { type: [String], default: [] },
    verification: {
      status: { type: String, enum: ["verified", "partly-verified", "unverified"], default: "unverified" },
      lastVerifiedAt: { type: Date },
      sourceUrl: { type: String, default: "" },
    },
    status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
  },
  { timestamps: true },
);
export type ToolDoc = InferSchemaType<typeof toolSchema> & { _id: mongoose.Types.ObjectId; updatedAt: Date };
export const Tool: Model<ToolDoc> = (models.Tool as Model<ToolDoc>) || model<ToolDoc>("Tool", toolSchema);

/* ------------------------------------------------------------------ Service */

const serviceSchema = new Schema(
  {
    slug,
    title: { type: String, required: true, maxlength: 100 },
    summary: { type: String, maxlength: 400, default: "" },
    deliverables: { type: [String], default: [] },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true },
);
export type ServiceDoc = InferSchemaType<typeof serviceSchema> & { _id: mongoose.Types.ObjectId };
export const Service: Model<ServiceDoc> =
  (models.Service as Model<ServiceDoc>) || model<ServiceDoc>("Service", serviceSchema);

/* ----------------------------------------------------------------- Enquiry */

const enquirySchema = new Schema(
  {
    kind: { type: String, enum: ["service", "contact"], required: true, index: true },
    name: { type: String, required: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, maxlength: 254 },
    phone: { type: String, maxlength: 20, default: "" },
    service: { type: String, maxlength: 80, default: "" },
    budget: { type: String, maxlength: 40, default: "" },
    subject: { type: String, maxlength: 160, default: "" },
    message: { type: String, required: true, maxlength: 4000 },
    status: { type: String, enum: ["new", "in_progress", "closed", "spam"], default: "new", index: true },
  },
  { timestamps: true },
);
enquirySchema.index({ createdAt: -1 });
export type EnquiryDoc = InferSchemaType<typeof enquirySchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };
export const Enquiry: Model<EnquiryDoc> =
  (models.Enquiry as Model<EnquiryDoc>) || model<EnquiryDoc>("Enquiry", enquirySchema);
