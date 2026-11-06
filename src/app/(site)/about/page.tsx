import type { Metadata } from "next";
import { ButtonLink, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "About AI SEEKHO",
  description: "AI SEEKHO ka mission: har Indian ko AI samajhne aur roz ke kaam mein practically use karne mein madad karna — seedhi Hinglish mein.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES = [
  ["Kaam pehle, theory baad mein", "Har lesson ek real task se shuru hota hai — ek caption, ek study plan, ek offer, ek report. Concepts tab aate hain jab unki zaroorat ho."],
  ["Apni bhasha mein", "Hum Roman Hinglish mein sikhate hain, kyunki zyadatar Indian log isi tarah sochte aur likhte hain. Technical terms English mein rehte hain, taaki aap tools mein unhe pehchaan sakein."],
  ["Honest by default", "AI tools badalte rehte hain. Hum features aur free limits ko official sources se verify karke date ke saath likhte hain — aur jo verify nahi ho saka, use clearly 'unverified' kehte hain."],
  ["Responsible use", "Fact-checking, privacy aur integrity har workflow ka hissa hain. AI aapka assistant hai — final judgement aapka."],
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="container-page max-w-4xl pb-16 pt-14 md:pt-20">
          <p className="eyebrow">About</p>
          <h1 className="display-xl mt-4 text-fg">AI sabke liye. Seedhi bhasha mein.</h1>
          <p className="mt-8 text-xl leading-relaxed text-fg-muted">
            AI SEEKHO ka mission simple hai: Indian students, content creators, freelancers, working professionals aur small business owners ko AI
            samajhne aur use apne roz ke kaam mein practically lagane mein madad karna.
          </p>
          <p className="mt-6 text-lg leading-relaxed text-fg-muted">
            Bahut saare log AI tools explore karte hain, kuch prompts try karte hain, aur phir ruk jaate hain — kyunki unhe pata nahi hota ki in
            tools ko apne asli kaam mein kaise lagaya jaaye. AI SEEKHO isi gap ko bharne ke liye hai: tutorials, verified tools directory, practical
            playbooks aur services ke through.
          </p>
        </div>
      </section>
      <Section labelledBy="philosophy">
        <h2 id="philosophy" className="display-md text-fg">Hamari teaching philosophy</h2>
        <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
          {PRINCIPLES.map(([t, b]) => (
            <div key={t} className="border-t border-line pt-6">
              <h3 className="text-lg font-semibold text-fg">{t}</h3>
              <p className="mt-3 leading-relaxed text-fg-muted">{b}</p>
            </div>
          ))}
        </div>
        <div className="mt-16 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/learn">Explore AI Learning</ButtonLink>
          <ButtonLink href="/contact" variant="secondary">Contact us</ButtonLink>
        </div>
      </Section>
    </>
  );
}
