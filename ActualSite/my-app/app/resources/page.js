import Link from "next/link";
import resources from "@/data/resourcesData";

export const metadata = {
  title: "Resources — Neumont Coding Club",
  description: "Downloads and guides for running parts of this site yourself.",
};

export default function Resources() {
  return (
    <div className="container">
      <section className="hero">
        <span className="eyebrow">Resources</span>

        <h1>
          Downloads &amp; <span className="accent">Guides</span>
        </h1>

        <p>
          Extra tools and setup guides for running parts of this site on
          your own machine.
        </p>
      </section>

      <div className="resources-grid">
        {resources.map((resource) => (
          <Link
            key={resource.slug}
            href={`/resources/${resource.slug}`}
            className="resource-tile"
          >
            {resource.tag && (
              <span className="resource-tile-tag">{resource.tag}</span>
            )}
            <h2>{resource.title}</h2>
            <p>{resource.summary}</p>
            <span className="resource-tile-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
