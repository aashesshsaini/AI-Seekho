import mongoose, { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const isInt = { validator: Number.isSafeInteger, message: "{PATH} must be an integer (paise)" };

/* ------------------------------------------------------------------ Product */

const productSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9-]+$/ },
    name: { type: String, required: true, trim: true, maxlength: 140 },
    subtitle: { type: String, trim: true, maxlength: 240, default: "" },
    shortDescription: { type: String, trim: true, maxlength: 600, default: "" },
    /** Integer paise. The server is the only source of truth for price. */
    pricePaise: { type: Number, required: true, min: 100, max: 10_000_000, validate: isInt },
    currency: { type: String, enum: ["INR"], default: "INR" },
    active: { type: Boolean, default: false, index: true },
    kind: { type: String, enum: ["digital"], default: "digital" },
    coverImage: { type: String, default: "" },
    previewImages: {
      type: [{ src: { type: String, required: true }, alt: { type: String, required: true }, _id: false }],
      default: [],
    },
    highlights: { type: [String], default: [] },
    seoTitle: { type: String, maxlength: 80, default: "" },
    seoDescription: { type: String, maxlength: 200, default: "" },
  },
  { timestamps: true },
);
export type ProductDoc = InferSchemaType<typeof productSchema> & { _id: mongoose.Types.ObjectId };
export const Product: Model<ProductDoc> = (models.Product as Model<ProductDoc>) || model<ProductDoc>("Product", productSchema);

/* ------------------------------------------------------------- ProductAsset */

const productAssetSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    /** Key inside private storage. Never a public URL. */
    storageKey: { type: String, required: true, unique: true, match: /^[A-Za-z0-9._/-]+$/ },
    filename: { type: String, required: true, match: /^[A-Za-z0-9._-]+$/ },
    label: { type: String, required: true },
    contentType: { type: String, required: true, enum: ["application/pdf", "application/zip"] },
    sizeBytes: { type: Number, required: true, validate: isInt },
    sha256: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    sortOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);
export type ProductAssetDoc = InferSchemaType<typeof productAssetSchema> & { _id: mongoose.Types.ObjectId };
export const ProductAsset: Model<ProductAssetDoc> =
  (models.ProductAsset as Model<ProductAssetDoc>) || model<ProductAssetDoc>("ProductAsset", productAssetSchema);

/* ----------------------------------------------------------------- Customer */

const customerSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
    name: { type: String, trim: true, maxlength: 120, default: "" },
    phone: { type: String, trim: true, maxlength: 20, default: "" },
    paidOrders: { type: Number, default: 0 },
  },
  { timestamps: true },
);
export type CustomerDoc = InferSchemaType<typeof customerSchema> & { _id: mongoose.Types.ObjectId };
export const Customer: Model<CustomerDoc> =
  (models.Customer as Model<CustomerDoc>) || model<CustomerDoc>("Customer", customerSchema);

/* -------------------------------------------------------------------- Order */

export const ORDER_STATUSES = ["created", "authorized", "paid", "failed", "review", "refunded"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const statusChangeSchema = new Schema(
  {
    from: { type: String, enum: [...ORDER_STATUSES, null] },
    to: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, required: true },
    source: { type: String, enum: ["checkout", "verify", "webhook", "admin", "system"], required: true },
    note: { type: String, maxlength: 300, default: "" },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    publicId: { type: String, required: true, unique: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    productSlug: { type: String, required: true },
    productName: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 100, validate: isInt },
    currency: { type: String, enum: ["INR"], default: "INR" },
    mode: { type: String, enum: ["test", "live"], required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    customerName: { type: String, default: "" },
    status: { type: String, enum: ORDER_STATUSES, required: true, default: "created", index: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    paymentMethod: { type: String, default: "" },
    /** SHA-256 of the checkout access secret held in the buyer's httpOnly cookie. */
    accessHash: { type: String, required: true },
    paidAt: { type: Date },
    failureReason: { type: String, maxlength: 300, default: "" },
    reviewReason: { type: String, maxlength: 300, default: "" },
    delivery: {
      entitlementId: { type: Schema.Types.ObjectId, ref: "Entitlement" },
      emailStatus: {
        type: String,
        enum: ["not_applicable", "not_configured", "pending", "sent", "failed"],
        default: "not_applicable",
      },
      emailSentAt: { type: Date },
      emailError: { type: String, default: "" },
    },
    purchaseTrackedAt: { type: Date },
  },
  { timestamps: true },
);
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
export type OrderDoc = InferSchemaType<typeof orderSchema> & { _id: mongoose.Types.ObjectId; createdAt: Date; updatedAt: Date };
export const Order: Model<OrderDoc> = (models.Order as Model<OrderDoc>) || model<OrderDoc>("Order", orderSchema);

/* ------------------------------------------------------------- PaymentEvent */

const paymentEventSchema = new Schema(
  {
    /** Razorpay x-razorpay-event-id for webhooks; "verify:<payment_id>" for checkout callbacks. */
    eventId: { type: String, required: true, unique: true },
    source: { type: String, enum: ["webhook", "verify"], required: true },
    type: { type: String, required: true },
    razorpayOrderId: { type: String, index: true },
    razorpayPaymentId: { type: String },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    amountPaise: { type: Number },
    currency: { type: String },
    paymentStatus: { type: String },
    outcome: { type: String, default: "received" },
    processedAt: { type: Date },
  },
  { timestamps: true },
);
export type PaymentEventDoc = InferSchemaType<typeof paymentEventSchema> & { _id: mongoose.Types.ObjectId };
export const PaymentEvent: Model<PaymentEventDoc> =
  (models.PaymentEvent as Model<PaymentEventDoc>) || model<PaymentEventDoc>("PaymentEvent", paymentEventSchema);

/* -------------------------------------------------------------- Entitlement */

const entitlementSchema = new Schema(
  {
    /** One entitlement per order — the unique index makes creation idempotent. */
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    /** SHA-256 of the bearer download token. The raw token is never stored. */
    tokenHash: { type: String, required: true, unique: true },
    /** AES-GCM encrypted copy so the link can be re-shown to the verified buyer/admin. */
    tokenCiphertext: { type: String, required: true },
    tokenIssuedAt: { type: Date, required: true },
    tokenExpiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
    revokedReason: { type: String, default: "" },
    downloadCount: { type: Number, default: 0 },
    maxDownloads: { type: Number, default: 30 },
    lastDownloadAt: { type: Date },
  },
  { timestamps: true },
);
export type EntitlementDoc = InferSchemaType<typeof entitlementSchema> & { _id: mongoose.Types.ObjectId };
export const Entitlement: Model<EntitlementDoc> =
  (models.Entitlement as Model<EntitlementDoc>) || model<EntitlementDoc>("Entitlement", entitlementSchema);

/* ------------------------------------------------------------ DownloadAudit */

const downloadAuditSchema = new Schema(
  {
    entitlementId: { type: Schema.Types.ObjectId, ref: "Entitlement", index: true },
    assetId: { type: Schema.Types.ObjectId, ref: "ProductAsset" },
    outcome: {
      type: String,
      enum: ["served", "denied_signature", "denied_expired", "denied_revoked", "denied_limit", "denied_missing", "error"],
      required: true,
    },
    ipHash: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
downloadAuditSchema.index({ createdAt: -1 });
export type DownloadAuditDoc = InferSchemaType<typeof downloadAuditSchema> & { _id: mongoose.Types.ObjectId };
export const DownloadAudit: Model<DownloadAuditDoc> =
  (models.DownloadAudit as Model<DownloadAuditDoc>) || model<DownloadAuditDoc>("DownloadAudit", downloadAuditSchema);

/* ---------------------------------------------------------- RecoveryRequest */

const recoveryRequestSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    orderRef: { type: String, required: true, trim: true },
    matchedOrderId: { type: Schema.Types.ObjectId, ref: "Order" },
    outcome: { type: String, enum: ["emailed", "no_match", "email_not_configured", "pending_admin", "resolved"], required: true },
  },
  { timestamps: true },
);
recoveryRequestSchema.index({ createdAt: -1 });
export type RecoveryRequestDoc = InferSchemaType<typeof recoveryRequestSchema> & { _id: mongoose.Types.ObjectId };
export const RecoveryRequest: Model<RecoveryRequestDoc> =
  (models.RecoveryRequest as Model<RecoveryRequestDoc>) ||
  model<RecoveryRequestDoc>("RecoveryRequest", recoveryRequestSchema);
