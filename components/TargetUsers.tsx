import { BriefcaseBusiness, GraduationCap, Store, UserRound } from "lucide-react";

const people = [
  {
    icon: GraduationCap,
    label: "Students",
    description: "Making sense of school, scholarship, and programme applications.",
  },
  {
    icon: UserRound,
    label: "First-time applicants",
    description: "Taking the first step through an unfamiliar process.",
  },
  {
    icon: BriefcaseBusiness,
    label: "Job seekers",
    description: "Getting clear on employment forms and supporting documents.",
  },
  {
    icon: Store,
    label: "Small-business owners",
    description: "Preparing for licences, registrations, and service applications.",
  },
];

export function TargetUsers() {
  return (
    <section className="story-section people-section" id="who-its-for" aria-labelledby="people-heading">
      <div className="story-container">
        <div className="people-heading">
          <span className="story-eyebrow">FOR THE MOMENTS PAPERWORK GETS HEAVY</span>
          <h2 id="people-heading">A guide for wherever you’re starting from.</h2>
          <p>No expertise in forms required. Just bring the document you need to understand.</p>
        </div>
        <div className="people-grid">
          {people.map(({ icon: Icon, label, description }) => (
            <article className="people-card" key={label}>
              <span className="people-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <h3>{label}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
