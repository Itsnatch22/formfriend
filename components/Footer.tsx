import { FileText, LockKeyhole } from "lucide-react";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <a className="footer-brand" href="#top">
          <FileText size={15} />
          formfriend
        </a>
        <span>Make forms make sense.</span>
        <span className="footer-privacy">
          <LockKeyhole size={12} />
          No account needed to get started
        </span>
      </div>
    </footer>
  );
}
