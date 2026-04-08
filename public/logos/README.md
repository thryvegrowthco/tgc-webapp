# Thryve Growth Co. — Logo Files

Add the logo files to this folder. The logo is reused from thryvegrowth.co.

## Required Files

| Filename           | Usage                                              | Format |
|--------------------|----------------------------------------------------|--------|
| `logo.svg`         | Primary logo — used in header on white background  | SVG    |
| `logo-dark.svg`    | Logo variant for dark/green backgrounds (footer)   | SVG    |
| `logo-mark.svg`    | Icon/mark only — used for favicon and small spots  | SVG    |

## Optional
| Filename           | Usage                          |
|--------------------|--------------------------------|
| `logo.png`         | PNG fallback (2x resolution)   |
| `logo-dark.png`    | PNG fallback dark variant      |

## Notes
- SVG is strongly preferred for sharpness at all sizes
- `favicon.ico` lives at the root of `/public/` — replace the placeholder
- The `<Logo>` component reads from this folder and falls back to text
  "Thryve Growth Co." if the SVG is not present
