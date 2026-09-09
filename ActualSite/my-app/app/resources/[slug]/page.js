import Link from "next/link";
import { notFound } from "next/navigation";
import resources from "@/data/resourcesData";
import InlineText from "@/components/InlineText";

export function generateStaticParams() {
  return resources.map((resource) => ({ slug: resource.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const resource = resources.find((r) => r.slug === slug);
  if (!resource) return {};
  return {
    title: `${resource.title} — Neumont Coding Club`,
    description: resource.summary,
  };
}

export default async function ResourceDetail({ params }) {
  const { slug } = await params;
  const resource = resources.find((r) => r.slug === slug);
  if (!resource) notFound();

  return (
    <div className="container">
      <Link href="/resources" className="back-link">
        ← Back to Resources
      </Link>

      <section className="hero">
        {resource.tag && <span className="eyebrow">{resource.tag}</span>}
        <h1>{resource.title}</h1>
        {resource.intro && (
          <p>
            <InlineText text={resource.intro} />
          </p>
        )}
      </section>

      {resource.beginnerNote && (
        <div className="beginner-callout">
          <span className="beginner-callout-label">New here?</span>
          <p>
            <InlineText text={resource.beginnerNote} />
          </p>
        </div>
      )}

      <div className="resource-card">
        <div className="resource-card-text">
          {resource.meta && <p className="resource-meta">{resource.meta}</p>}
        </div>

        <a
          href={resource.cta.href}
          className="btn-primary"
          {...(resource.cta.download ? { download: true } : {})}
          {...(resource.cta.external ? { target: "_blank", rel: "noreferrer" } : {})}
        >
          {resource.cta.label}
        </a>
      </div>

      {resource.context && (
        <section className="info-block">
          <h2>Why would I want this?</h2>
          <p>
            <InlineText text={resource.context} />
          </p>
        </section>
      )}

      {resource.instructions && (
        <section className="info-block">
          <h2>Setup</h2>
          <ol>
            {resource.instructions.map((step, index) => (
              <li key={index}>
                <InlineText text={step} />
              </li>
            ))}
          </ol>
        </section>
      )}

      {resource.note && (
        <div className="resources-note">
          <InlineText text={resource.note} />
        </div>
      )}
    </div>
  );
}
