import type { Metadata } from "next";
import { RecoverForm } from "@/components/forms/recover-form";

export const metadata: Metadata = {
  title: "Download recover kariye",
  description: "Purchase ka download link kho gaya? Email aur order reference daaliye.",
  robots: { index: false, follow: true },
};

export default function RecoverPage() {
  return (
    <div className="container-page max-w-2xl py-14 md:py-20">
      <p className="eyebrow">Order recovery</p>
      <h1 className="display-lg mt-4 text-fg">Download link kho gaya?</h1>
      <p className="mt-5 text-lg leading-relaxed text-fg-muted">
        Purchase ke waqt diya email aur order reference (jaise <span className="font-mono text-fg">AIS-XXXXX-XXXXX</span>) daaliye. Order
        reference aapke Razorpay receipt / order page par hota hai.
      </p>
      <div className="mt-10">
        <RecoverForm />
      </div>
    </div>
  );
}
