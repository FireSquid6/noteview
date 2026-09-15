import { describe, expect, test } from "bun:test";
import { renderHtml } from "./renderer";
import { parseWorksCited } from "./works-cited";

const validWorksCited = `<workscited>
- id: woolf-room
  type: book
  author:
    - family: Woolf
      given: Virginia
  title: A Room of One's Own
  publisher: Hogarth Press
  issued:
    date-parts:
      - [1929]
- id: morrison-beloved
  type: book
  author:
    - family: Morrison
      given: Toni
  title: Beloved
  publisher: Vintage
  issued:
    date-parts:
      - [2004]
</workscited>`;

describe("works cited rendering", () => {
  test("formats and sorts CSL entries with the MLA style", async () => {
    const { html } = await renderHtml(`Before\n\n${validWorksCited}\n\nAfter`);

    expect(html).toContain('<section class="works-cited">');
    expect(html).toContain('<h2 class="works-cited-title">Works Cited</h2>');
    expect(html).toContain("Morrison, Toni");
    expect(html).toContain("<i>Beloved</i>");
    expect(html.indexOf("Morrison, Toni")).toBeLessThan(html.indexOf("Woolf, Virginia"));
    expect(html).toContain("<p>Before</p>");
    expect(html).toContain("<p>After</p>");
  });

  test("formats journal and organization-authored web sources", async () => {
    const { html } = await renderHtml(`<workscited>
- id: journal
  type: article-journal
  author:
    - family: Goldman
      given: Anne
  title: Questions of Transport
  container-title: The Georgia Review
  volume: "64"
  issue: "1"
  page: 69-88
  issued:
    date-parts:
      - [2010]
- id: web
  type: webpage
  author:
    - literal: Modern Language Association
  title: Works Cited Guide
  URL: https://style.mla.org/guide
  accessed:
    date-parts:
      - [2026, 9, 2]
</workscited>`);

    expect(html).toContain("Goldman, Anne");
    expect(html).toContain("<i>The Georgia Review</i>");
    expect(html).toContain("vol. 64, no. 1");
    expect(html).toContain("pp. 69–88");
    expect(html).toContain("Modern Language Association");
    expect(html).toContain("Accessed 2 Sept. 2026");
  });

  test("does not parse a tag inside a fenced code block", async () => {
    const { html } = await renderHtml(`\`\`\`markdown\n${validWorksCited}\n\`\`\``);

    expect(html).not.toContain('<section class="works-cited">');
    expect(html).toContain("<pre><code");
    expect(html).toContain('hljs-name">workscited');
  });

  test("does not accept inline or attributed tags", async () => {
    const inline = await renderHtml(`Text <workscited>${validWorksCited}</workscited>`);
    const attributed = await renderHtml(`<workscited class="manual">\n[]\n</workscited>`);
    const unmatched = await renderHtml(`<workscited>\n[]`);

    expect(inline.html).not.toContain('<section class="works-cited">');
    expect(attributed.html).not.toContain('<section class="works-cited">');
    expect(unmatched.html).not.toContain('<section class="works-cited">');
  });

  test("renders safe authoring errors for invalid YAML", async () => {
    const { html } = await renderHtml(`<workscited>\n- title: [broken\n</workscited>`);

    expect(html).toContain('<aside class="works-cited-error" role="alert">');
    expect(html).toContain("The YAML could not be parsed.");
    expect(html).not.toContain("title: [broken");
  });

  test("does not allow citation fields to inject HTML", async () => {
    const { html } = await renderHtml(`<workscited>
- id: safe-id
  type: book
  title: '\"><img src=x onerror=alert(1)>'
</workscited>`);

    expect(html).toContain('<section class="works-cited">');
    expect(html).not.toContain("<img");
    expect(html).not.toContain("onerror=");
  });

  test("can render repeatedly without leaking entries", async () => {
    const first = await renderHtml(validWorksCited);
    const second = await renderHtml(`<workscited>
- id: second-book
  type: book
  title: Second Book
</workscited>`);

    expect(first.html).toContain("Beloved");
    expect(second.html).toContain("Second Book");
    expect(second.html).not.toContain("Beloved");
  });
});

describe("works cited validation", () => {
  test("accepts organization authors and literal dates", () => {
    const result = parseWorksCited(`
- id: who-report
  type: report
  title: Global Health Report
  author:
    - literal: World Health Organization
  issued:
    literal: Spring 2024
`);

    expect(result.errors).toEqual([]);
    expect(result.entries).toHaveLength(1);
  });

  test("reports duplicate IDs and malformed fields", () => {
    const result = parseWorksCited(`
- id: duplicate
  type: webpage
  title: First
  URL: javascript:alert(1)
  author:
    - given: Missing Family
  issued:
    date-parts:
      - [2024, 13, 40]
- id: duplicate
  type: unknown
  title: ""
  typo: ignored
`);

    expect(result.errors).toContain("Entry 1.URL must use http or https.");
    expect(result.errors).toContain("Entry 1.author[1] must define literal or family.");
    expect(result.errors).toContain("Entry 1.issued.date-parts[1] month must be between 1 and 12.");
    expect(result.errors).toContain("Entry 1.issued.date-parts[1] day must be between 1 and 31.");
    expect(result.errors).toContain("Entry 2.id must be unique.");
    expect(result.errors).toContain("Entry 2.type is not a supported source type.");
    expect(result.errors).toContain("Entry 2.title must be a non-empty string.");
    expect(result.errors).toContain("Entry 2.typo is not supported.");
  });

  test("rejects nested tags", async () => {
    const { html } = await renderHtml(`<workscited>
<workscited>
[]
</workscited>
</workscited>`);

    expect(html).toContain("Nested workscited tags are not supported.");
  });
});
