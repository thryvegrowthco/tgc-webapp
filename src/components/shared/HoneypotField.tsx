/**
 * Honeypot field for public forms. Real users never see or focus it (the wrapper
 * is screen-reader hidden via `aria-hidden` and positioned off-screen with
 * `sr-only`, and the input is removed from the tab order), but bots that
 * auto-fill every input will set it. Each form must send this field's value in
 * the JSON body as `company_website`; the server silently drops any submission
 * where it is non-empty (see `isHoneypotTripped`).
 *
 * Off-screen positioning is deliberate instead of `display:none` /
 * `visibility:hidden`, which many bots skip.
 */
export function HoneypotField() {
  return (
    <div className="sr-only" aria-hidden="true">
      <label htmlFor="company_website">Leave this field empty</label>
      <input
        id="company_website"
        name="company_website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
      />
    </div>
  );
}
