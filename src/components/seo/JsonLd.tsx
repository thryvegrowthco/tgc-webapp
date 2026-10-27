// Renders a JSON-LD <script>. The `<` escape prevents a stray "</script>" in any
// string value from breaking out of the script element (XSS-safe serialization).
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
