import institutions from '@/content/institutions.json'

/*
  The partner marks, in the footer, unlabelled.

  Unlabelled is deliberate. Four of the five external partners named in section
  nine have supplied a mark; the Civil Service and Government Development Bureau
  has not. A row under a Partners heading would assert a complete set and be
  wrong by one. With no heading it asserts nothing, and the fifth drops in by
  adding a line to content/institutions.json.

  Every mark is desaturated through one token, the same argument DESIGN.md makes
  for the headshots: these arrive in maroon, blue, purple and the SDG palette,
  and the page holds one accent.

  Each mark keeps its own aspect. The box constrains both sides, so wide marks
  are limited by width and upright ones by height, and none is stretched.

  Names are the alt text and are lifted verbatim from the leading sentence of
  each partner's role in content/home.json. No copy is drafted here.
*/

/* The common height every mark is set at, matching h-12 on the box. */
const ROW_HEIGHT = 48

export default function InstitutionLogos() {
  return (
    <ul data-institution-logos className="flex flex-wrap items-center gap-x-6 gap-y-8 sm:gap-x-10">
      {institutions.partners.map((partner) => (
        <li
          key={partner.name}
          /* Every mark sits at one height, so each box is as wide as that mark
             naturally is at that height, capped so an extreme aspect cannot run
             away with the row. Shrink wrapping keeps the gaps between marks even
             rather than leaving dead space inside a rigid cell. */
          style={{ width: `${Math.round((partner.width / partner.height) * ROW_HEIGHT)}px` }}
          className="flex h-12 max-w-32 shrink-0 items-center justify-start sm:max-w-40"
        >
          <img
            src={partner.file}
            alt={partner.name}
            width={partner.width}
            height={partner.height}
            loading="lazy"
            decoding="async"
            className="max-h-full max-w-full object-contain object-left [filter:var(--ag-logo-filter)]"
          />
        </li>
      ))}
    </ul>
  )
}
