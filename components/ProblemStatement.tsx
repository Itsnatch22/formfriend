import { ArrowRight, FileQuestion, SearchCheck, ShieldAlert } from "lucide-react";

const problems = [
  {
    icon: FileQuestion,
    title: "Unfamiliar language",
    description: "Official wording can make simple questions feel hard to answer.",
  },
  {
    icon: SearchCheck,
    title: "Hidden requirements",
    description: "It’s not always obvious what information or documents to prepare.",
  },
  {
    icon: ShieldAlert,
    title: "Too much uncertainty",
    description: "A missed detail can make the next step feel intimidating.",
  },
];

export function ProblemStatement() {
  return (
    <section className="story-section problem-section" aria-labelledby="problem-heading">
      <div className="story-container problem-layout">
        <div className="story-intro">
          <span className="story-eyebrow">THE PAPERWORK PROBLEM</span>
          <h2 id="problem-heading">
            The hard part isn’t
            <br />
            finding the form.
          </h2>
          <p>
            It’s understanding what it asks, what applies to you, and what to
            gather before you begin.
          </p>
          <a className="story-text-link" href="#how-it-works">
            A clearer way through
            <ArrowRight size={14} />
          </a>
        </div>
        <div className="problem-list">
          {problems.map(({ icon: Icon, title, description }, index) => (
            <article className="problem-item" key={title}>
              <span className="problem-index">0{index + 1}</span>
              <span className="problem-icon">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
