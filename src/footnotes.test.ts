import { describe, expect, test } from "bun:test";
import { renderHtml } from "./renderer";

describe("footnote rendering", () => {
  test("renders linked references and a footnotes section", async () => {
    const { html } = await renderHtml(`A statement with a source.[^source]

[^source]: The source text.`);

    expect(html).toContain('<a id="footnote-reference-source" href="#footnote-note-source" data-footnote-ref');
    expect(html).toContain(">[1]</a></sup>");
    expect(html).toContain("<hr data-footnotes>");
    expect(html).toContain('<section class="footnotes" data-footnotes>');
    expect(html).toContain('<h2 id="footnotes-label" class="sr-only">Footnotes</h2>');
    expect(html).toContain('<li id="footnote-note-source">');
    expect(html).toContain('href="#footnote-reference-source" data-footnote-backref');
  });

  test("renders rich multiline note content", async () => {
    const { html } = await renderHtml(`Rich note.[^details]

[^details]: The first paragraph has **emphasis**.

    The second paragraph has \`code\`, a [local link](chapter.md#note), and a list:

    - First
    - Second`);

    expect(html).toContain("<strong>emphasis</strong>");
    expect(html).toContain("The second paragraph");
    expect(html).toContain("<code>code</code>");
    expect(html).toContain('href="chapter#note"');
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>First</li>");
  });

  test("numbers and orders notes by their first reference", async () => {
    const { html } = await renderHtml(`Second definition first.[^second] First definition second.[^first]

[^first]: Defined first.
[^second]: Defined second.`);

    expect(html).toContain('href="#footnote-note-second" data-footnote-ref aria-describedby="footnotes-label">[1]</a>');
    expect(html).toContain('href="#footnote-note-first" data-footnote-ref aria-describedby="footnotes-label">[2]</a>');
    expect(html.indexOf('id="footnote-note-second"')).toBeLessThan(html.indexOf('id="footnote-note-first"'));
  });

  test("adds a backlink for every repeated reference", async () => {
    const { html } = await renderHtml(`First.[^repeat] Second.[^repeat]

[^repeat]: Used twice.`);

    expect(html).toContain('id="footnote-reference-repeat"');
    expect(html).toContain('id="footnote-reference-repeat-2"');
    expect(html).toContain('href="#footnote-reference-repeat" data-footnote-backref');
    expect(html).toContain('href="#footnote-reference-repeat-2" data-footnote-backref');
    expect(html).toContain('aria-label="Back to footnote reference 1"');
    expect(html).toContain('aria-label="Back to footnote reference 2"');
    expect(html).toContain("↩<sup>2</sup>");
  });

  test("leaves undefined references literal and omits unreferenced definitions", async () => {
    const { html } = await renderHtml(`Missing note.[^missing]

[^unused]: This definition is never referenced.`);

    expect(html).toContain("Missing note.[^missing]");
    expect(html).not.toContain("This definition is never referenced.");
    expect(html).not.toContain("data-footnotes");
  });

  test("does not parse footnotes inside fenced code", async () => {
    const { html } = await renderHtml(`\`\`\`markdown
Text.[^code]

[^code]: Not a rendered note.
\`\`\``);

    expect(html).toContain("<pre><code");
    expect(html).not.toContain("data-footnotes");
  });

  test("encodes labels and uses a fixed safe backlink label", async () => {
    const { html } = await renderHtml(`Safe reference.[^bad" onmouseover="alert(1)]

[^bad" onmouseover="alert(1)]: Safe note text.`);

    expect(html).toContain("footnote-note-bad%22%20onmouseover%3D%22alert(1)");
    expect(html).toContain('aria-label="Back to footnote reference 1"');
    expect(html).not.toContain('onmouseover="alert(1)"');
  });

  test("uses distinct IDs for labels that overlap generated names", async () => {
    const { html } = await renderHtml(`Heading collision.[^label] Reference collision.[^ref-label]

[^label]: First note.
[^ref-label]: Second note.`);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
    const targets = [...html.matchAll(/href="#(footnote[^"]+)"/g)].map((match) => match[1]);

    expect(new Set(ids).size).toBe(ids.length);
    expect(targets.every((target) => ids.includes(target))).toBe(true);
    expect(html).toContain('id="footnotes-label"');
    expect(html).toContain('id="footnote-note-label"');
    expect(html).toContain('id="footnote-reference-label"');
    expect(html).toContain('id="footnote-note-ref-label"');
  });

  test("does not leak notes between render calls", async () => {
    const [first, second] = await Promise.all([
      renderHtml(`First.[^one]\n\n[^one]: First note.`),
      renderHtml(`Second.[^two]\n\n[^two]: Second note.`),
    ]);

    expect(first.html).toContain("First note.");
    expect(first.html).not.toContain("Second note.");
    expect(second.html).toContain("Second note.");
    expect(second.html).not.toContain("First note.");
  });

  test("collects footnotes after a works cited block", async () => {
    const { html } = await renderHtml(`Cited statement.[^note]

[^note]: Supporting detail.

<workscited>
- id: example
  type: book
  title: Example Book
</workscited>`);

    expect(html).toContain('<section class="works-cited">');
    expect(html).toContain('<section class="footnotes" data-footnotes>');
    expect(html.indexOf('class="works-cited"')).toBeLessThan(html.indexOf('class="footnotes"'));
  });
});
