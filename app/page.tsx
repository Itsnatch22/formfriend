"use client";

import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  HelpCircle,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  Paperclip,
  ScanText,
  Send,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { uploadDocument } from "@/lib/documents/upload";
import { askDocumentQuestion, processDocument } from "@/lib/documents/client";
import type { DocumentAnalysis, DocumentUnderstanding } from "@/lib/documents/types";
import { Footer } from "@/components/Footer";
import { HowItWorks } from "@/components/HowItWorks";
import Orb from "@/components/Orb";
import { Navbar } from "@/components/Navbar";
import { ProblemStatement } from "@/components/ProblemStatement";
import { TargetUsers } from "@/components/TargetUsers";

type AppView = "home" | "uploading" | "uploaded" | "sample";
type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sourcePages?: number[];
  retrievalMode?: "semantic" | "keyword";
};

const allowedExtensions = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "xls",
  "xlsx",
  "docx",
  "pptx",
]);
const suggestedQuestions = [
  "What documents do I need?",
  "Who can fill this out?",
  "Explain section 4",
];
const checklist = [
  "National identification document",
  "Contact information",
  "Business information",
  "Supporting documentation",
];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getSourceLabel(fileName: string) {
  switch (getFileExtension(fileName)) {
    case "xls":
    case "xlsx":
      return "Worksheet";
    case "pptx":
      return "Slide";
    case "docx":
      return "Section";
    default:
      return "Page";
  }
}

function getFileSize(size: number) {
  return size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getDemoResponse(question: string) {
  const normalized = question.toLowerCase();

  if (
    normalized.includes("document") ||
    normalized.includes("need") ||
    normalized.includes("before")
  ) {
    return {
      content:
        "For this sample application, gather your national ID, contact details, business information, and any supporting documents before you begin. The form lists supporting documentation as a requirement.",
      sourcePages: [2],
    };
  }

  if (
    normalized.includes("eligible") ||
    normalized.includes("who") ||
    normalized.includes("fill")
  ) {
    return {
      content:
        "This illustrative form is for someone applying for a small-business licence. It doesn’t spell out every eligibility rule, so confirm specific requirements with the issuing office.",
      sourcePages: [1],
    };
  }

  if (normalized.includes("section 4") || normalized.includes("nature of business")) {
    return {
      content:
        "Section 4 asks what your business does. Describe the main activity clearly and specifically—for example, “retail sale of clothing” rather than just “business.”",
      sourcePages: [2],
    };
  }

  return {
    content:
      "I can’t verify that from the sample content in this demo. Try asking about required documents, who the form is for, or section 4.",
  };
}

function UploadZone({
  onFile,
  onSample,
}: {
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");

  function acceptFile(file?: File) {
    if (!file) return;

    const extension = getFileExtension(file.name);
    if (!allowedExtensions.has(extension)) {
      setError("Choose a PDF, JPG, PNG, Excel, Word, or PowerPoint file to continue.");
      return;
    }

    if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
      setError("Choose a file smaller than 20 MB.");
      return;
    }

    setError("");
    onFile(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    acceptFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    acceptFile(event.dataTransfer.files[0]);
  }

  return (
    <div className="upload-wrap" id="upload">
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.docx,.pptx,application/pdf,image/png,image/jpeg,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onChange={handleInputChange}
        aria-label="Choose a PDF, image, Excel, Word, or PowerPoint document"
      />
      <div
        className={`upload-zone${isDragging ? " is-dragging" : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setIsDragging(false);
          }
        }}
        onDrop={handleDrop}
      >
        <span className="upload-icon">
          <Upload size={22} strokeWidth={1.8} />
        </span>
        <p className="upload-title">Drop your form here</p>
        <p className="upload-subtitle">or choose a file from your device</p>
        <button
          className="button button-primary upload-button"
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={16} />
          Upload a form
        </button>
        <div className="upload-meta">
          <span>PDF</span>
          <span className="meta-separator">·</span>
          <span>JPG</span>
          <span className="meta-separator">·</span>
          <span>PNG</span>
          <span className="meta-separator">·</span>
          <span>XLS/XLSX</span>
          <span className="meta-separator">·</span>
          <span>DOCX</span>
          <span className="meta-separator">·</span>
          <span>PPTX</span>
          <span className="upload-meta-divider" />
          <span>No account required</span>
        </div>
      </div>
      {error ? (
        <p className="upload-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="upload-disclosure">
        Your file is stored privately and its content is sent to the configured AI provider
        to prepare your guide.
      </p>
      <button className="sample-link" type="button" onClick={onSample}>
        Take a look around with a sample form
        <ArrowRight size={15} />
      </button>
    </div>
  );
}

function HomeView({
  onFile,
  onSample,
}: {
  onFile: (file: File) => void;
  onSample: () => void;
}) {
  return (
    <>
      <main className="landing-main" id="top">
        <div className="landing-orb" aria-hidden="true">
          <Orb hue={275} hoverIntensity={0.45} backgroundColor="#f8f8f6" />
        </div>
        <div className="landing-content">
          <div className="eyebrow">
            <span className="eyebrow-line" />
            A little help with the paperwork
          </div>
          <h1>
            Make forms
            <br />
            <span>make sense.</span>
          </h1>
          <p className="landing-description">
            Upload a form. Understand what it means.
            <br className="desktop-break" /> Know what you need before you start.
          </p>
          <UploadZone onFile={onFile} onSample={onSample} />
          <div className="capability-row" aria-label="What FormFriend can help with">
            <span>
              <ScanText size={15} />
              Explain confusing fields
            </span>
            <i />
            <span>
              <ListChecks size={15} />
              Find what you’ll need
            </span>
            <i />
            <span>
              <MessageCircle size={15} />
              Ask questions
            </span>
          </div>
        </div>
      </main>
      <ProblemStatement />
      <HowItWorks />
      <TargetUsers />
      <Footer />
    </>
  );
}

function UploadingView({
  file,
  error,
  processing,
  onRetry,
  onHome,
}: {
  file: File;
  error: string;
  processing: boolean;
  onRetry: () => void;
  onHome: () => void;
}) {
  return (
    <main className="upload-state-screen">
      <div className={`upload-state-card${error ? " has-error" : ""}`}>
        <span className={`upload-state-icon${error ? " error" : ""}`}>
          {error ? <X size={21} /> : <FileText size={21} />}
        </span>
        <p className="upload-state-eyebrow">
          {error ? processing ? "UNDERSTANDING DIDN’T FINISH" : "UPLOAD DIDN’T FINISH" : "YOUR DOCUMENT"}
        </p>
        <h1>
          {error
            ? "Let’s try that again."
            : processing
              ? "Reading and understanding your form."
              : "Saving your form securely."}
        </h1>
        <p className="upload-state-description">
          {error
            ? error
            : processing
              ? "We’re extracting readable text, then preparing a plain-language overview and checklist."
              : "Uploading to your private FormFriend storage. This may take a moment."}
        </p>
        <div className="upload-state-file">
          <span className="document-file-icon">
            <FileText size={16} />
          </span>
          <span className="upload-state-filename">{file.name}</span>
          <span className="upload-state-filesize">{getFileSize(file.size)}</span>
        </div>
        {error ? (
          <div className="upload-state-actions">
            <button className="button button-primary" type="button" onClick={onRetry}>
              <Upload size={15} />
              Try again
            </button>
            <button className="button button-outline" type="button" onClick={onHome}>
              Choose another file
            </button>
          </div>
        ) : (
          <div
            className="upload-progress-track"
            role="status"
            aria-label={processing ? "Understanding document" : "Uploading document"}
          >
            <span />
          </div>
        )}
        <p className="upload-state-privacy">
          <LockKeyhole size={13} />
          Your document is private to your guest session
        </p>
      </div>
    </main>
  );
}

function SampleDocumentPage({ page }: { page: number }) {
  if (page === 2) {
    return (
      <div className="paper-content">
        <div className="paper-section-title">
          <span className="section-number">02</span>
          <div>
            <h3>Business information</h3>
            <p>Tell us a little about the business you’re registering.</p>
          </div>
        </div>
        <div className="form-field">
          <label>4. Nature of business</label>
          <div className="paper-input paper-input-highlight">
            <span>e.g. retail, food services, consulting</span>
            <span className="highlight-pin">4</span>
          </div>
          <small>Describe the main activity your business carries out.</small>
        </div>
        <div className="paper-field-grid">
          <div className="form-field">
            <label>5. Business name</label>
            <div className="paper-input" />
          </div>
          <div className="form-field">
            <label>6. Date established</label>
            <div className="paper-input" />
          </div>
        </div>
        <div className="form-field">
          <label>7. Business address</label>
          <div className="paper-input paper-input-tall" />
        </div>
        <div className="form-field">
          <label>8. Supporting documentation</label>
          <div className="paper-checkbox-row">
            <span className="paper-checkbox" />
            <span>Attach any documents that support your application.</span>
          </div>
        </div>
        <div className="paper-note">
          <Sparkles size={14} />
          <p>
            <strong>FormFriend note</strong>
            <br />
            “Nature of business” means what the business actually does.
          </p>
        </div>
      </div>
    );
  }

  if (page === 3) {
    return (
      <div className="paper-content">
        <div className="paper-section-title">
          <span className="section-number">03</span>
          <div>
            <h3>Declaration</h3>
            <p>Review the information before submitting your application.</p>
          </div>
        </div>
        <div className="declaration-box">
          <p>
            I confirm that the information provided in this application is
            complete and accurate to the best of my knowledge.
          </p>
          <p>
            I understand that the application may be returned if required
            information or supporting documents are missing.
          </p>
        </div>
        <div className="paper-field-grid">
          <div className="form-field">
            <label>9. Applicant name</label>
            <div className="paper-input" />
          </div>
          <div className="form-field">
            <label>10. Date</label>
            <div className="paper-input" />
          </div>
        </div>
        <div className="form-field">
          <label>11. Signature</label>
          <div className="paper-input paper-signature" />
        </div>
        <div className="paper-stamp">
          <ShieldCheck size={18} />
          <span>CHECK BEFORE YOU SUBMIT</span>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-content">
      <div className="paper-form-header">
        <span className="paper-seal">
          <ShieldCheck size={19} />
        </span>
        <span>BUSINESS SERVICES · APPLICATION FORM</span>
      </div>
      <div className="paper-title">
        <span>FORM A-01</span>
        <h3>Small business licence</h3>
        <p>Application for a new licence or renewal</p>
      </div>
      <div className="paper-rule" />
      <div className="paper-section-title">
        <span className="section-number">01</span>
        <div>
          <h3>Applicant details</h3>
          <p>Complete this section using the applicant’s legal details.</p>
        </div>
      </div>
      <div className="paper-field-grid">
        <div className="form-field">
          <label>1. Full name</label>
          <div className="paper-input" />
        </div>
        <div className="form-field">
          <label>2. National ID number</label>
          <div className="paper-input" />
        </div>
      </div>
      <div className="form-field">
        <label>3. Contact information</label>
        <div className="paper-field-grid">
          <div className="paper-input" />
          <div className="paper-input" />
        </div>
        <small>Phone number and email address</small>
      </div>
      <div className="paper-info-box">
        <strong>Before you begin</strong>
        <p>
          Have your identification document and business details ready. Check
          page 2 for supporting documents.
        </p>
      </div>
      <div className="paper-form-footer">
        <span>PUBLIC SERVICE · SAMPLE DOCUMENT</span>
        <span>PAGE 1 OF 3</span>
      </div>
    </div>
  );
}

function DocumentPanel({
  file,
  fileUrl,
  onClose,
  page,
  setPage,
  pageCount,
  isSample,
  sourceLabel,
  sourceSections,
}: {
  file: File | null;
  fileUrl: string | null;
  onClose: () => void;
  page: number;
  setPage: (page: number) => void;
  pageCount: number;
  isSample: boolean;
  sourceLabel: string;
  sourceSections: NonNullable<DocumentAnalysis["sourceSections"]>;
}) {
  const extension = getFileExtension(file?.name ?? "");
  const isPdf = isSample || extension === "pdf";
  const isOfficeFile = ["xls", "xlsx", "docx", "pptx"].includes(extension);
  const showPageControls = isSample || ((isPdf || isOfficeFile) && pageCount > 1);

  return (
    <section className="document-panel" aria-label="Document preview">
      <div className="document-toolbar">
        <div className="document-name-wrap">
          <span className="document-file-icon">
            <FileText size={16} />
          </span>
          <div className="document-name-text">
            <strong>{isSample ? "Small business licence" : file?.name}</strong>
            <span>
              {isSample
                ? "Sample document · 3 pages"
                : `${getFileSize(file?.size ?? 0)} · Private upload`}
            </span>
          </div>
          {isSample ? <span className="sample-tag">SAMPLE</span> : null}
        </div>
        <button
          className="icon-button close-document"
          type="button"
          onClick={onClose}
          aria-label="Close document"
        >
          <X size={17} />
        </button>
      </div>
      <div className={`document-canvas${isPdf ? "" : " image-canvas"}`}>
        {isSample ? (
          <article className="sample-paper">
            <SampleDocumentPage page={page} />
          </article>
        ) : getFileExtension(file?.name ?? "") === "pdf" && fileUrl ? (
          <iframe
            className="pdf-frame"
            src={`${fileUrl}#page=${page}`}
            title={`Preview of ${file?.name ?? "uploaded document"}`}
          />
        ) : isOfficeFile ? (
          <div className="office-preview">
            {sourceSections.find((section) => section.sourceNumber === page) ? (
              <pre className="office-source-text">
                {sourceSections.find((section) => section.sourceNumber === page)?.text}
              </pre>
            ) : (
              <>
                <span className="office-preview-icon">
                  <FileText size={28} />
                </span>
                <strong>
                  {extension === "docx"
                    ? "Word document"
                    : extension === "pptx"
                      ? "PowerPoint presentation"
                      : "Excel workbook"}
                </strong>
                <p>
                  FormFriend extracts text for your guide. Download the original file
                  to view its full layout.
                </p>
              </>
            )}
            {fileUrl ? (
              <a className="button button-outline" href={fileUrl} download={file?.name}>
                <Download size={15} />
                Download original
              </a>
            ) : null}
          </div>
        ) : fileUrl ? (
          <Image
            className="uploaded-image"
            src={fileUrl}
            alt={`Preview of ${file?.name ?? "uploaded image"}`}
            width={1200}
            height={1600}
            unoptimized
          />
        ) : (
          <div className="preview-placeholder">Preparing local preview…</div>
        )}
      </div>
      {showPageControls ? (
        <div className="document-controls">
          <span className="page-counter">
            {sourceLabel} <strong>{page}</strong> of {isSample ? 3 : pageCount}
          </span>
          <div className="page-buttons">
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              aria-label="Previous page"
              disabled={page === 1}
            >
              <ChevronLeft size={17} />
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={() => setPage(Math.min(isSample ? 3 : pageCount, page + 1))}
              aria-label="Next page"
              disabled={page === (isSample ? 3 : pageCount)}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      ) : (
        <div className="local-file-note">
          <LockKeyhole size={13} />
          {isOfficeFile
            ? `${sourceLabel} text extracted · ${pageCount} sources`
            : "Previewed locally in your browser"}
        </div>
      )}
    </section>
  );
}

function AssistantPanel({
  isSample,
  analysis,
  provider,
  documentId,
  processing,
  processingError,
  sourceLabel,
  onAsk,
  onRetry,
  onSourceClick,
}: {
  isSample: boolean;
  analysis: DocumentUnderstanding | null;
  provider: DocumentAnalysis["provider"] | null;
  documentId: string | null;
  processing: boolean;
  processingError: string;
  sourceLabel: string;
  onAsk: (question: string) => Promise<ChatMessage>;
  onRetry: () => void;
  onSourceClick: (page: number) => void;
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [chatError, setChatError] = useState("");
  const latestMessageRef = useRef<HTMLDivElement>(null);
  const canAsk = isSample || Boolean(analysis && documentId);

  useEffect(() => {
    if (messages.length > 0) {
      latestMessageRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages.length]);

  async function askQuestion(question: string) {
    if (!question.trim() || !canAsk || isAsking) return;
    const normalized = question.trim();
    setChatError("");
    setIsAsking(true);
    setMessages((current) => [
      ...current,
      {
        id: current.length ? current[current.length - 1].id + 1 : 1,
        role: "user",
        content: normalized,
      },
    ]);

    try {
      const answer = await onAsk(normalized);
      setMessages((current) => [
        ...current,
        {
          ...answer,
          id: current.length ? current[current.length - 1].id + 1 : 1,
          role: "assistant",
        },
      ]);
    } catch (error) {
      setChatError(
        error instanceof Error ? error.message : "Your question could not be answered.",
      );
    } finally {
      setIsAsking(false);
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = draft.trim();
    if (!question || !canAsk) return;
    void askQuestion(question);
    setDraft("");
  }

  return (
    <aside className="assistant-panel" aria-label="FormFriend assistant">
      <div className="assistant-header">
        <div className="assistant-title">
          <span className="assistant-avatar">
            <Sparkles size={16} />
          </span>
          <div>
            <strong>Your form guide</strong>
            <span>
              {processing ? (
                <>
                  <span className="online-dot processing-dot" />
                  Understanding your form
                </>
              ) : processingError ? (
                <>
                  <span className="status-dot error-dot" />
                  Needs another try
                </>
              ) : isSample ? (
                <>
                  <span className="online-dot" />
                  Demo answers
                </>
              ) : analysis ? (
                <>
                  <span className="online-dot" />
                  Ready to help · {provider === "gemini" ? "Gemini" : "AI"}
                </>
              ) : (
                <>
                  <span className="online-dot" />
                  Preparing your guide
                </>
              )}
            </span>
          </div>
        </div>
        <button className="icon-button help-button" type="button" aria-label="About this preview">
          <HelpCircle size={17} />
        </button>
      </div>

      {isSample ? (
        <div className="assistant-scroll">
          <div className="preview-notice">
            <Sparkles size={14} />
            <span>
              You’re exploring an illustrative sample. Answers below are demo
              content, not AI analysis.
            </span>
          </div>
          <section className="overview-card">
            <div className="section-kicker">
              <span className="kicker-icon">
                <ScanText size={14} />
              </span>
              HERE’S WHAT WE FOUND
            </div>
            <h2>What is this form?</h2>
            <p>
              A sample application for a small business licence. It collects
              applicant details, business information, and a declaration.
            </p>
            <button
              className="citation"
              type="button"
              onClick={() => onSourceClick(1)}
            >
              <FileText size={13} />
              Applicant details · page 1
              <ArrowRight size={12} />
            </button>
          </section>

          <section className="requirements-section">
            <div className="section-heading-row">
              <div className="section-kicker">
                <span className="kicker-icon green">
                  <ListChecks size={14} />
                </span>
                BEFORE YOU BEGIN
              </div>
              <span className="checklist-count">3 of 4</span>
            </div>
            <div className="checklist">
              {checklist.map((item, index) => (
                <div className={`checklist-item${index === 3 ? " incomplete" : ""}`} key={item}>
                  <span className="check-box">
                    {index < 3 ? <Check size={12} strokeWidth={2.5} /> : null}
                  </span>
                  <span>{item}</span>
                  {index === 3 ? <span className="required-label">CHECK</span> : null}
                </div>
              ))}
            </div>
            <button
              className="citation checklist-citation"
              type="button"
              onClick={() => onSourceClick(2)}
            >
              <FileText size={13} />
              Requirements · page 2
              <ArrowRight size={12} />
            </button>
          </section>

          <section className="questions-section">
            <div className="section-kicker">
              <span className="kicker-icon violet">
                <MessageCircle size={14} />
              </span>
              ASK THE DOCUMENT
            </div>
            <div className="suggestion-list">
              {suggestedQuestions.map((question) => (
                <button
                  className="suggestion-chip"
                  type="button"
                  onClick={() => void askQuestion(question)}
                  key={question}
                >
                  {question}
                  <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </section>

          {messages.length > 0 ? (
            <section className="chat-thread" aria-live="polite">
              {messages.map((message) => (
                <div className={`chat-message ${message.role}`} key={message.id}>
                  {message.role === "assistant" ? (
                    <span className="message-avatar">
                      <Sparkles size={12} />
                    </span>
                  ) : null}
                  <div className="message-content">
                    <span className="message-role">
                    {message.role === "assistant"
                      ? isSample
                        ? "FormFriend · demo"
                        : "FormFriend"
                      : "You"}
                    </span>
                    <p>{message.content}</p>
                    {message.retrievalMode === "keyword" ? (
                      <span className="retrieval-note">
                        Keyword search fallback · grounded in this document
                      </span>
                    ) : null}
                    {message.sourcePages?.map((sourcePage) => (
                        <button
                          className="citation message-citation"
                          type="button"
                          onClick={() => onSourceClick(sourcePage)}
                          key={`${message.id}-${sourcePage}`}
                        >
                          <FileText size={12} />
                          {sourceLabel} {sourcePage}
                        </button>
                      ))}
                    </div>
                </div>
              ))}
              <div ref={latestMessageRef} />
            </section>
          ) : null}
          {isAsking ? (
            <p className="chat-pending" role="status">
              <span className="pending-dots" />
              Looking through the document…
            </p>
          ) : null}
          {chatError ? (
            <p className="chat-error" role="alert">{chatError}</p>
          ) : null}
        </div>
      ) : analysis ? (
        <div className="assistant-scroll">
          <section className="overview-card">
            <div className="section-kicker">
              <span className="kicker-icon">
                <ScanText size={14} />
              </span>
              HERE’S WHAT WE FOUND
            </div>
            <h2>What is this form?</h2>
            <p>{analysis.summary}</p>
            <div className="understanding-detail">
              <strong>What it’s for</strong>
              <p>{analysis.purpose}</p>
            </div>
            <div className="understanding-detail">
              <strong>Who it’s for</strong>
              <p>{analysis.intended_for}</p>
            </div>
          </section>
          {analysis.before_you_begin.length > 0 ? (
            <section className="requirements-section">
              <div className="section-heading-row">
                <div className="section-kicker">
                    <span className="kicker-icon green">
                      <ListChecks size={14} />
                    </span>
                    BEFORE YOU BEGIN
                </div>
                <span className="checklist-count">
                    {analysis.before_you_begin.length} items
                </span>
              </div>
              <div className="checklist">
                {analysis.before_you_begin.map((item, index) => (
                    <div className="checklist-item" key={`${item.item}-${index}`}>
                      <span className="check-box unchecked" />
                      <span>{item.item}</span>
                      {item.page ? (
                        <button
                          className="requirement-page"
                          type="button"
                          onClick={() => onSourceClick(item.page!)}
                        >
                          {sourceLabel} {item.page}
                        </button>
                      ) : null}
                    </div>
                ))}
              </div>
            </section>
          ) : null}
          {analysis.important_requirements.length > 0 ? (
            <section className="requirements-section">
              <div className="section-kicker">
                <span className="kicker-icon green">
                    <ShieldCheck size={14} />
                </span>
                IMPORTANT REQUIREMENTS
              </div>
              <div className="checklist">
                {analysis.important_requirements.map((item, index) => (
                    <div className="checklist-item" key={`${item.item}-${index}`}>
                      <span className="requirement-bullet" />
                      <span>{item.item}</span>
                      {item.page ? (
                        <button
                          className="requirement-page"
                          type="button"
                          onClick={() => onSourceClick(item.page!)}
                        >
                          {sourceLabel} {item.page}
                        </button>
                      ) : null}
                    </div>
                ))}
              </div>
            </section>
          ) : null}
          <section className="questions-section">
            <div className="section-kicker">
              <span className="kicker-icon violet">
                <MessageCircle size={14} />
              </span>
              ASK THE DOCUMENT
            </div>
            <div className="suggestion-list">
              {suggestedQuestions.map((question) => (
                <button
                    className="suggestion-chip"
                    type="button"
                    onClick={() => void askQuestion(question)}
                    disabled={isAsking}
                    key={question}
                >
                    {question}
                    <ArrowRight size={13} />
                </button>
              ))}
            </div>
          </section>
          {messages.length > 0 ? (
            <section className="chat-thread" aria-live="polite">
              {messages.map((message) => (
                <div className={`chat-message ${message.role}`} key={message.id}>
                    {message.role === "assistant" ? (
                      <span className="message-avatar"><Sparkles size={12} /></span>
                    ) : null}
                    <div className="message-content">
                      <span className="message-role">
                        {message.role === "assistant" ? "FormFriend" : "You"}
                      </span>
                      <p>{message.content}</p>
                      {message.retrievalMode === "keyword" ? (
                        <span className="retrieval-note">
                          Keyword search fallback · grounded in this document
                        </span>
                      ) : null}
                      {message.sourcePages?.map((sourcePage) => (
                        <button
                          className="citation message-citation"
                          type="button"
                          onClick={() => onSourceClick(sourcePage)}
                          key={`${message.id}-${sourcePage}`}
                        >
                          <FileText size={12} />
                          {sourceLabel} {sourcePage}
                        </button>
                      ))}
                    </div>
                </div>
              ))}
              <div ref={latestMessageRef} />
            </section>
          ) : null}
          {isAsking ? (
            <p className="chat-pending" role="status">
              <span className="pending-dots" />
              Looking through the document…
            </p>
          ) : null}
          {chatError ? <p className="chat-error" role="alert">{chatError}</p> : null}
        </div>
      ) : (
        <div className="analysis-empty">
          <span className="empty-icon">
            {processing ? <span className="understanding-spinner" /> : <FileText size={21} />}
          </span>
          <h2>
            {processing
              ? "Reading your form"
              : processingError
                ? "We couldn’t understand this form."
                : "Preparing your form guide"}
          </h2>
          <p>
            {processing
              ? "We’re extracting the document text and preparing a plain-language overview and checklist."
              : processingError || "Your file is saved securely. Your document guide is being prepared."}
          </p>
          {processingError ? (
            <button className="button button-primary explore-button" type="button" onClick={onRetry}>
              <Upload size={14} />
              Try processing again
            </button>
          ) : null}
        </div>
      )}

      <form className="chat-composer" onSubmit={submitMessage}>
        <div className="composer-field">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              canAsk ? "Ask anything about this form…" : "Preparing document understanding…"
            }
            aria-label="Ask a question about this form"
            rows={1}
            disabled={!canAsk || isAsking}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="composer-actions">
            <span>
              <Paperclip size={14} />
              Grounded in this form
            </span>
            <button
              className="send-button"
              type="submit"
              disabled={!canAsk || isAsking || !draft.trim()}
              aria-label="Send question"
            >
              {isAsking ? <span className="send-spinner" /> : <Send size={15} />}
            </button>
          </div>
        </div>
        <p className="composer-footnote">
          {isSample
            ? "Sample answers only · Always confirm with the issuing office"
            : analysis
              ? "Document content is processed by your configured AI provider"
              : "Document analysis uses your private upload"}
        </p>
      </form>
    </aside>
  );
}

function WorkspaceView({
  file,
  fileUrl,
  view,
  documentId,
  analysis,
  processingError,
  onRetry,
  onHome,
}: {
  file: File | null;
  fileUrl: string | null;
  view: "uploaded" | "sample";
  documentId: string | null;
  analysis: DocumentAnalysis | null;
  processingError: string;
  onRetry: () => void;
  onHome: () => void;
}) {
  const [page, setPage] = useState(1);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const isSample = view === "sample";

  async function sendQuestion(question: string): Promise<ChatMessage> {
    if (isSample) {
      return { id: 0, role: "assistant", ...getDemoResponse(question) };
    }
    if (!documentId) throw new Error("This document is not available in your session.");

    const response = await askDocumentQuestion({
      documentId,
      conversationId: conversationId ?? undefined,
      question,
    });
    setConversationId(response.conversationId);
    return {
      id: 0,
      role: "assistant",
      content: response.answer,
      sourcePages: response.sources,
      retrievalMode: response.retrievalMode,
    };
  }

  return (
    <main className="workspace">
      <div className="workspace-breadcrumb">
        <button type="button" onClick={onHome} className="back-link">
          <ArrowLeft size={15} />
          All done? Start over
        </button>
        <div className="breadcrumb-right">
          <span className="breadcrumb-step">
            <span className="step-check">
              <Check size={10} />
            </span>
            Document
          </span>
          <ChevronRight size={13} />
          <span className="breadcrumb-current">Understand</span>
        </div>
      </div>
      <div className="workspace-title-row">
        <div>
          <h1>
            {isSample
              ? "Here’s what we found."
              : analysis
                ? "Here’s what we found."
                : "Your document is ready."}
          </h1>
          <p>
            {isSample
              ? "A clearer picture of what this sample form is asking for."
              : analysis
                ? analysis.understanding.purpose
                : "Your file is saved privately. Document understanding needs another try."}
          </p>
        </div>
        {isSample ? (
          <span className="illustrative-label">
            <Sparkles size={13} />
            Illustrative sample
          </span>
        ) : null}
      </div>
      <div className="workspace-grid">
        <DocumentPanel
          file={file}
          fileUrl={fileUrl}
          onClose={onHome}
          page={page}
          setPage={setPage}
          pageCount={analysis?.pageCount ?? 1}
          isSample={isSample}
          sourceLabel={getSourceLabel(file?.name ?? "")}
          sourceSections={analysis?.sourceSections ?? []}
        />
        <AssistantPanel
          isSample={isSample}
          analysis={analysis?.understanding ?? null}
          provider={analysis?.provider ?? null}
          documentId={documentId}
          processing={false}
          processingError={processingError}
          sourceLabel={getSourceLabel(file?.name ?? "")}
          onAsk={sendQuestion}
          onRetry={onRetry}
          onSourceClick={setPage}
        />
      </div>
    </main>
  );
}

export default function Home() {
  const [view, setView] = useState<AppView>("home");
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null);
  const [processingError, setProcessingError] = useState("");

  useEffect(() => {
    if (!fileUrl) return;
    return () => URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  async function saveFile(selectedFile: File) {
    setUploadError("");
    setDocumentId(null);
    setAnalysis(null);
    setProcessingError("");
    setView("uploading");

    try {
      const uploadedDocument = await uploadDocument(selectedFile);
      setDocumentId(uploadedDocument.id);
      await understandDocument(uploadedDocument.id);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "The upload failed unexpectedly.",
      );
    }
  }

  async function understandDocument(id: string) {
    setProcessingError("");
    setView("uploading");
    try {
      const result = await processDocument(id);
      setAnalysis(result);
      setView("uploaded");
    } catch (error) {
      setProcessingError(
        error instanceof Error ? error.message : "The document could not be understood.",
      );
      setView("uploaded");
    }
  }

  function startWithFile(selectedFile: File) {
    setFileUrl(URL.createObjectURL(selectedFile));
    setFile(selectedFile);
    void saveFile(selectedFile);
  }

  function resetHome() {
    setFile(null);
    setFileUrl(null);
    setUploadError("");
    setDocumentId(null);
    setAnalysis(null);
    setProcessingError("");
    setView("home");
  }

  function openSample() {
    setFile(null);
    setFileUrl(null);
    setUploadError("");
    setDocumentId(null);
    setAnalysis(null);
    setProcessingError("");
    setView("sample");
  }

  return (
    <div className="app-shell">
      <Navbar
        onHome={resetHome}
        workspace={view !== "home"}
        busy={view === "uploading" && !uploadError}
        privateUpload={view === "uploaded"}
      />
      {view === "home" ? (
        <HomeView onFile={startWithFile} onSample={openSample} />
      ) : view === "uploading" ? (
        file ? (
          <UploadingView
            file={file}
            error={uploadError}
            processing={Boolean(documentId)}
            onRetry={() =>
              documentId ? void understandDocument(documentId) : void saveFile(file)
            }
            onHome={resetHome}
          />
        ) : (
          <HomeView onFile={startWithFile} onSample={openSample} />
        )
      ) : (
        <WorkspaceView
          key={view}
          file={file}
          fileUrl={fileUrl}
          documentId={documentId}
          analysis={analysis}
          processingError={processingError}
          view={view}
          onHome={resetHome}
          onRetry={() => documentId && void understandDocument(documentId)}
        />
      )}
    </div>
  );
}
