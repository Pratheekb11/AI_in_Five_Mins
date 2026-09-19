/**
 * Structured data, rendered where a crawler reads it and a person does not.
 *
 * `JSON.stringify` is the whole sanitiser: the only sequence that can break
 * out of a script element is `</`, and a forward slash cannot survive a JSON
 * string literal without being escaped here first.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
