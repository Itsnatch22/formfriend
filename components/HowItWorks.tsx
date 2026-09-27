import { ArrowDown, ArrowUpRight, FileText, ListChecks, MessageCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: FileText,
    title: "Bring your form",
    description: "Upload a PDF or a clear photo. No account required to get started.",
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Get the plain-language version",
    description: "See what it’s for, what to prepare, and which details matter.",
  },
  {
    number: "03",
    icon: MessageCircle,
    title: "Ask what’s unclear",
    description: "Ask questions and follow answers back to the source page.",
  },
];

export function HowItWorks() {
  return (
    <section className="story-section how-section" id="how-it-works" aria-labelledby="how-heading">
      <div className="story-container">
        <div className="how-heading-row">
          <div>
            <span className="story-eyebrow">A LITTLE HELP, STEP BY STEP</span>
            <h2 id="how-heading">From “what does this mean?” to “I’ve got this.”</h2>
          </div>
          <span className="how-heading-note">
            <ArrowDown size={15} />
            Your form stays at the center
          </span>
        </div>
        <div className="how-steps">
          {steps.map(({ number, icon: Icon, title, description }) => (
            <article className="how-step" key={number}>
              <div className="how-step-top">
                <span className="how-step-icon">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="how-step-number">{number}</span>
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <a className="how-upload-link" href="#upload">
          Start with a form
          <ArrowUpRight size={15} />
        </a>
      </div>
    </section>
  );
}
