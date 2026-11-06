import mongoose, { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/* ---------------------------------------------------------------- AdminUser */

export const ADMIN_ROLES = ["owner", "editor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const adminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ADMIN_ROLES, required: true },
    active: { type: Boolean, default: true },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);
export type AdminUserDoc = InferSchemaType<typeof adminUserSchema> & { _id: mongoose.Types.ObjectId };
export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) || model<AdminUserDoc>("AdminUser", adminUserSchema);

/* ------------------------------------------------------------- AdminSession */

const adminSessionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true, index: true },
    expiresAt: { type: Date, required: true },
    lastSeenAt: { type: Date },
  },
  { timestamps: true },
);
adminSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type AdminSessionDoc = InferSchemaType<typeof adminSessionSchema> & { _id: mongoose.Types.ObjectId };
export const AdminSession: Model<AdminSessionDoc> =
  (models.AdminSession as Model<AdminSessionDoc>) || model<AdminSessionDoc>("AdminSession", adminSessionSchema);

/* ----------------------------------------------------------------- AuditLog */

const auditLogSchema = new Schema(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    actorEmail: { type: String, default: "system" },
    action: { type: String, required: true },
    target: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
auditLogSchema.index({ createdAt: -1 });
export type AuditLogDoc = InferSchemaType<typeof auditLogSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date };
export const AuditLog: Model<AuditLogDoc> =
  (models.AuditLog as Model<AuditLogDoc>) || model<AuditLogDoc>("AuditLog", auditLogSchema);

/* ------------------------------------------------------------- SiteSettings */

export const LEGAL_PAGES = [
  { slug: "privacy-policy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms and Conditions" },
  { slug: "refund-policy", title: "Refund and Cancellation Policy" },
  { slug: "delivery-policy", title: "Digital Product Delivery Policy" },
  { slug: "support", title: "Contact and Support Information" },
] as const;
export type LegalSlug = (typeof LEGAL_PAGES)[number]["slug"];

const legalPageSchema = new Schema(
  {
    slug: { type: String, enum: LEGAL_PAGES.map((p) => p.slug), required: true },
    body: { type: String, default: "" },
    approved: { type: Boolean, default: false },
    updatedAt: { type: Date },
  },
  { _id: false },
);

const siteSettingsSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: "site" },
    brandName: { type: String, default: "AI SEEKHO" },
    tagline: { type: String, default: "Learn. Create. Automate." },
    supportEmail: { type: String, default: "" },
    supportHours: { type: String, default: "" },
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    socialLinks: { type: [{ label: String, url: String, _id: false }], default: [] },
    business: {
      legalName: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },
    legalPages: { type: [legalPageSchema], default: [] },
  },
  { timestamps: true },
);
export type SiteSettingsDoc = InferSchemaType<typeof siteSettingsSchema> & { _id: mongoose.Types.ObjectId };
export const SiteSettings: Model<SiteSettingsDoc> =
  (models.SiteSettings as Model<SiteSettingsDoc>) || model<SiteSettingsDoc>("SiteSettings", siteSettingsSchema);

/* ---------------------------------------------------------------- RateLimit */

const rateLimitSchema = new Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, required: true, default: 0 },
  expiresAt: { type: Date, required: true },
});
rateLimitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export type RateLimitDoc = InferSchemaType<typeof rateLimitSchema>;
export const RateLimit: Model<RateLimitDoc> =
  (models.RateLimit as Model<RateLimitDoc>) || model<RateLimitDoc>("RateLimit", rateLimitSchema);
