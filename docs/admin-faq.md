# FAQ & Status Glossary

Quick answers and what each status means. For step-by-step instructions, see the **Admin Guide**; for the booking workflow visually, see **Booking Flow Diagrams**.

## Session Status Glossary

A session moves through these stages. You'll see them on the **Sessions** page and on each client's record.

| Status | What it means |
|---|---|
| **Intake needed** | The client booked but hasn't filled out their intake form yet. |
| **Intake complete** | The intake is in — ready for you to review before the session. |
| **Session scheduled** | Reviewed and on the calendar. Sessions booked from an invitation start here. |
| **Completed** | The session happened. A follow-up email goes out automatically a day later. |
| **Follow-up sent** | Fully wrapped up — the follow-up email has gone out. |
| **No show** | The client didn't attend. You set this from the **Manage** panel. |
| **Rescheduled** | The session was moved to a new time. |
| **Cancelled** | The session was called off (the calendar event is removed). |

## Booking Invitation Statuses

When you send booking options, the invitation itself has a status:

| Status | What it means |
|---|---|
| **Pending** | Created but not sent yet. |
| **Sent** | Emailed to the client; waiting for them to pick a time. |
| **Accepted** | The client picked a time — a session was created. |
| **Expired** | Passed its expiration date without being used. |
| **Cancelled** | You cancelled it; the booking link no longer works. |

## Payment Statuses

| Status | What it means |
|---|---|
| **Not required** | No payment is expected for this session (you'll bill separately or it's included). |
| **Pending** | Payment is expected but hasn't been received. |
| **Paid** | Payment received. |
| **Refunded** | The payment was refunded. |
| **Waived** | You chose not to charge for this session. |

## Frequently Asked Questions

### Can I add a client without a credit card?
Yes. Go to **Clients → New client** (`/admin/clients/new`). Enter their name and email and you're done — nothing is charged, no card is asked for, and they can buy a service later whenever they're ready. You choose whether to email them the invite right away or create the account quietly and send it later.

### How do I give a friend free Job Alerts?
Open their client page and use the **Job Alerts access** panel → **Grant free access**. They get the full Job Alerts & Watchlist experience — curated matches and the weekly digest — at no cost. You can add a private note about why, and optionally an end date so it doesn't run forever. To take it back, press **Revoke free access**. This works even for someone who has never had Job Alerts before.

### Can I set free access to expire?
Yes — set an **Ends on** date when you grant it. Access switches off automatically that day and you get an email telling you who lapsed, so you can decide whether to extend it or point them at the paid plan. Leave the date blank if you want it open-ended.

### I got an email from cron-job.org saying a cronjob failed. What is that?
cron-job.org is the outside scheduler that nudges the site every day to run the automated job search (and a few other routine jobs). If its email says **Timeout**, it gave up waiting for a reply after 30 seconds. The automated job search used to reply only after it had finished searching every job board, which sometimes took longer than that — so you could get a timeout email even though the search itself finished fine. It now replies right away and does the searching in the background, so those timeout emails should stop. If one still arrives, forward it to your developer.

### I got an email saying the automated job search hit a problem. What do I do?
Nothing breaks — the search runs again the next morning. Open **Integrations → Automated Job Sources** and check that the job boards you expect are switched on. If the same email arrives two or three days in a row, a job board key or connection probably needs attention: forward the email to your developer.

### What if they never click the invite email?
Invite links stop working after 24 hours. Their client page shows an amber **"Account not activated yet"** banner with a **Resend invite** button — press it for a fresh link, as often as you need. The account already exists either way, so they show up in your Clients list and you can set up their Job Alerts before they've ever logged in.

### What happens when someone pays and has no account?
An account is created for them automatically. This covers a client who pays a booking invitation by card, or who accepts and pays a proposal, when they do not already have a login. They get one warm welcome email with their receipt and a secure link to set a password, so they can see their booking and everything else in their dashboard. You do not need to do anything, and they show up in your Clients list like any other client.

Two things can occasionally need a hand, and each sends you an "action needed" alert (email and bell):

- **The welcome email could not be sent.** The account was still created. Open the client in **Clients**, and send them a password reset (or press **Resend invite**) so they get a fresh link to set a password and sign in.
- **The account could not be created at all.** Their payment is still recorded, so nothing is lost. Reach out to the client about getting them set up. If it was a scheduled session, you can open it under **Sessions** and use **Reassign** to attach it to their client account once one exists. Note that simply adding a brand-new account from **Clients → New client** does not, on its own, pull in a payment they already made.

Public signup stays closed, so this only ever happens as part of a real, completed payment.

### Do comped clients show up in my revenue numbers?
No. The dashboard tile counts **Paying Clients** only and shows free ones separately as a small "+ 2 comped" line. Analytics and the subscriber count exclude them too. In the Clients list they carry a **Comped** badge rather than the green **Active** badge, and there's a **Comped** filter chip.

### What happens when a comped client starts paying?
Nothing for you to do. They buy the Job Alerts subscription the normal way and the account switches from comped to paying by itself. Your note about the original comp stays on file as history.

### Why can't I Pause or Cancel a comped client?
Those two buttons change billing in Stripe, and a comped client has no billing to change — so they're hidden. Use **Revoke free access** instead, which removes their access without touching payments. For the same reason you can't comp someone who already has a Job Alerts subscription; cancel the subscription first.

### Could someone give themselves free Job Alerts?
No. Access is only ever granted by you or by a real payment. (This used to be possible by filling in the watchlist questionnaire; that hole is closed — filling in criteria no longer grants access.)

### How do I send someone a few times to choose from?
The quickest way: on your **Overview** (admin home) page, click the **"Invite a client to book"** button in the "Book a client in" box at the top. You can also get there from **Invite to Book → New invitation** in the sidebar, or the **Create booking invitation** button on a client's page. Pick the dates and times, choose the meeting type, and send. The client gets an email, picks one, and the session is created automatically — added to your Google Calendar and confirmed by email. See **Booking Flow Diagrams** for the full picture. (If a yellow "Google Calendar isn't connected" note appears on the Invite to Book page, connect it under Integrations so sessions land on your calendar.)

### How do I add a session myself?
Go to the **Sessions** page and click **New session**. Choose an existing client (or pick "No account" and type a name and email for someone without a login), the service, the date and time, the length, the meeting type, the payment status and amount, and any private notes. There is an **"Email the client a confirmation"** box that is **off by default**, so you can add a session quietly and only email the client if you tick it.

### Will a session I add without an account show who it's for?
Yes. When you choose "No account" and type a name and email, the session shows that name (or the email, if you left the name blank) on the Sessions page and in the Edit panel, with a small **"No account"** tag so you can tell it apart from clients who have a portal login. These used to show as "Unknown client."

### How do I reschedule or cancel a session?
On the **Sessions** page (or on the client's record), click **Edit** on the session. Change the date and time and click **Save changes** to reschedule, or click **Cancel session**. Both show a checkbox to email the client, and both are **off by default** so the client is only contacted when you choose. Rescheduling moves the calendar hold; cancelling removes it and returns any package credit.

### Where do cancelled sessions go?
They are not deleted. The default Sessions view hides them so your active list stays clean, but you can still find any cancelled session by setting the status filter at the top to **"Cancelled"** (or **"All statuses"**). They appear with a red **"Cancelled"** tag. You can still open one to edit it; the Cancel button is hidden, but the Danger zone stays available if you need to delete a test entry.

### Can I move a session to a different client?
Yes, as long as the session is still in the future. Open **Edit** on the session and use the **"Reassign to another client"** option.

### Can I permanently delete a session?
Yes, but only for test entries or accidental duplicates, not for real sessions you want to call off (cancel those instead, which keeps the record). In the **Danger zone** at the bottom of the Edit panel, type DELETE and click **Delete session**. If a payment is attached, it will refuse and ask you to cancel instead. Deleting cannot be undone.

### When does a client get an email about a session?
Only when you ask for it. Creating, rescheduling, and cancelling each have their own "email the client" checkbox, and all three start **unchecked**. If you leave them unchecked, the client is not emailed, so you are always in control of what they hear and when.

### Where do clients see their sessions?
In their own portal, under **"My Sessions"** in the sidebar (this used to be labelled "Bookings"). It lists their sessions split into Upcoming and Past, with the date and time in Central time and a status label, and each one opens that session's page with prep steps, the meeting link, and messages. Old links and emails that pointed at the former "Bookings" page still work; they send the client to the same place.

### I clicked a client's session link and expected a "page not found." What happens now?
Nothing bad. If you follow one of a client's session links (for example from a confirmation email) while you are signed in as the admin, you are taken to that client's record on your side, or to the Sessions page if the session has no account, instead of a "page not found." So those links are safe to click.

### Can clients reschedule or cancel their own sessions?
Yes — but only when the session is **more than 24 hours away**. On their dashboard, a client can open one of their sessions and reschedule it to another time or cancel it. Inside 24 hours the buttons stop working and they're told to reply to your email so you can help. Either way, you get a notification (email and bell) when a client changes a session. If the cancelled session was part of a package, the credit goes back automatically so they can rebook it.

### What are session packages and credits?
Two services are sold as multi-session bundles: the **4-Session Coaching Plan** and the **3-Session Interview Prep Package**. When a client buys one, they're given that many **credits** instead of being asked to schedule everything up front. They redeem one credit at a time from their dashboard to book each session — no extra payment, because the package already covers it. You'll see those sessions appear like any other booking.

### A client cancelled a package session — did they lose that credit?
No. When a session that came from a package is cancelled, the credit is automatically returned to the package so the client can book another time. If their package had been used up, it becomes active again.

### A client paid but there's no session — what happened?
This is rare and handled for you. If the time a client chose got taken in the moments between paying and confirming, the system **automatically refunds the payment** and sends you an alert so you can offer new times. No client is ever charged without getting a session.

### What does "Meet link needed" mean?
It means the system couldn't automatically create the Google Meet link for that session, usually because the Google Calendar connection needs attention. The session itself is fine; only the auto-generated link is missing. You have two ways to fix it: reconnect Google Calendar under **Integrations** and then click **Create calendar event** on the session (on the Sessions page row, or in the session's Edit panel) to create the event and link in one click, or just paste a meeting link into the session yourself.

### Why didn't my session get a Meet link (or land on my Google Calendar)?
Almost always because Google Calendar is disconnected. The most common cause: the Google sign-in access quietly expired. When that happens you'll see a red **"Reconnect needed"** box on the **Integrations** page, and the system sends you a "Calendar issue" alert (at most once a day) saying "Google Calendar is disconnected." A brief Google hiccup (a timeout or a short outage) no longer raises this alert, and the warning clears on its own once the connection is working again, so the box only sticks around when a real reconnect is needed. This "Calendar issue" alert is separate from your subscription alerts, so turning those off won't hide it. To fix a real one: open **Integrations**, click **Reconnect Google Calendar**, and finish the Google sign-in. Then open any session still marked **"Meet link needed"** and click **Create calendar event** to create its event and Meet link. New sessions after reconnecting get their event and link automatically. (If this keeps happening every week, the Google project behind the connection is probably still in "Testing." Ask your developer to publish it so access stops expiring.)

### How do reminders work? Can I send one manually?
Clients automatically get a reminder **24 hours** and **1 hour** before each session, and you get a prep summary about **2 hours** before. To send a reminder right now, use **Send reminder** on the session (in the **Manage** panel or the **Upcoming sessions** widget on your dashboard).

### How do I change what an automated email says?
Edit it in **Templates**. The **Email Reference** page lists every email and which template to edit.

### How do I take time off so clients can't book me?
Use **blackout dates** in your availability settings (see the Admin Guide, "Managing Your Availability"). Booked times stay; new bookings are blocked on those dates.

### What's the difference between a "booking invitation" and the public Book page?
The public **Book** page is where anyone can buy and self-schedule. A **booking invitation** is you personally offering a specific client a few hand-picked times — perfect for returning clients or anyone you're scheduling directly.

### Where does the QR code on my business card go?
It opens **thryvegrowth.co/card**, a page made for people who scan your card. It shows your logo, photo, name and title, a **Book a free consultation** button, a **Save to contacts** button (it adds your name, title, email, website and photo to their phone's contacts), your email address, and links to your HR consulting and coaching pages. The page is hidden from Google on purpose, so it only reaches people who have your card or the link. Because cards are printed with this address, the **/card** page must always stay on the website, but what it says can change at any time without reprinting. Visits show up as **/card** in your website analytics, which tells you how many people opened the page. What happens next is tracked too: if someone taps **Book a free consultation** there, or the booking link in the contact they saved from it, the request is saved as a lead marked **Business card**, and your email alert says **Came from: Business card**. That covers requests that start on the card page itself, not someone who scans, browses around the site and comes back later.

### How do I send a proposal and get paid for custom work?
Use a **proposal** for quote-based work — recruitment, HR projects, anything you scope and price rather than sell as a fixed session. Go to **Proposals → New proposal** (or start one from a lead's or client's page so the name and email fill in for you). Write the scope and terms, set a price (a single total or line items, or **$0** for a no-charge agreement you just want signed), and **Send**. The client gets a "Review & Accept Proposal" email, accepts by typing their name, and — if there's a price — pays online right then. You get a notification when they accept and a second one when payment goes through; a receipt is sent to them automatically. See the Admin Guide, "Sending a Proposal," for the full walkthrough.

### Can I edit or cancel a proposal after I send it?
You can edit, send, copy the link, or cancel a proposal **while it's still a draft or just sent**. Once a client **accepts** it, it's locked — the accepted version is a signed record, so to change anything you create a new proposal. A proposal that's already been **paid** can't be cancelled here; if you need to refund it, do that in Stripe.

### Where do testimonials come from, and how do I get them on my site?
The day after a session is marked complete, the client's follow-up email invites them to share a few words (no login needed). Whatever they submit lands on your **Testimonials** page as **Pending** — it is **not** public yet. Open the page, then **Approve** the ones you want to show, **Hide** an approved one to take it down without deleting, **Edit** to fix wording or the rating, or **Delete** it for good. Your public Testimonials page only ever shows ones you've approved.

### Can I add a testimonial a client emailed me directly?
Yes. On the **Testimonials** page click **New** and type in the quote, the client's name, and an optional title, service, and star rating. Ones you add yourself are set to **Approved** right away, so they go straight to your public page (you can still hide or edit them).

### What are client goals and the Progress page?
Each client has a shared **Goals** list and a **Progress** view. You can add goals on the client's page (a title, optional description, a status of Active / In progress / Completed / Paused, and an optional target date), and the client can add and update goals from their own dashboard — you're both looking at the **same list**. The client's Progress page also shows a timeline of their past sessions with the **summary** and **next steps** you wrote for each one, so it gathers up the notes you're already writing with nothing extra to do.

### What is "Draft with ChatGPT" and is it safe to use?
It's a little helper box (with a sparkle icon) that appears in several places around the admin to give you a head start on writing — session summaries, a prep brief, a resume review, a job's "why it matches" note, a cover letter, a proposal's scope, a reply to a client message, and a follow-up to a new lead. It uses **your own ChatGPT** (the one you sign into at chatgpt.com): nothing is sent anywhere automatically and there's no extra cost. You click **Copy prompt**, paste it into ChatGPT, then bring the answer back — some helpers drop it into the right boxes for you, others are copy-only. Always read and edit the draft before you save or send it. See the Admin Guide, "Draft with ChatGPT," for where each one lives.

### How do I read the new analytics, and can I download the numbers?
The top of the **Analytics** page has an **Insights** area with five richer views — **Revenue by service**, **Lead → client funnel**, **No-show rate**, **Package utilization**, and **Top clients by value** — shown as charts. Use the **date-range buttons** in the corner (This month, Last 90 days, This year, All-time) to change the window for the whole Insights area at once. Three of those views have a **CSV** button (revenue, top clients, and package utilization) that downloads the figures for whichever date range is currently selected, so the spreadsheet matches what's on screen. The older cards further down the page keep their own fixed time windows and don't change with the selector.

### Where do the free blog photos come from, and am I allowed to use them?
They come from Unsplash, a large library of free professional photography. The photos are free to use commercially, including on your website and in your newsletter — no purchase and no separate licence needed. In return the photographers ask to be credited, and that happens automatically: when you pick a photo, its name is added to the **Alt text** box for you, so as long as you leave that part in place you're covered.

### Why doesn't the Featured Image picker have a GIFs tab?
Because a featured image is also the preview picture that Facebook, LinkedIn, and other sites show when someone shares your post — and animated GIFs either don't show up properly there or show a single frozen frame. The GIFs tab is still available inside the post itself, using the image button in the editor toolbar.

### What picture shows up when someone shares a link to my site?
By default, a Thryve card with your logo and "Clarity. Accountability. Real Growth." A blog post shows its own featured image instead, and a post without one falls back to that default. Your business card page shows a picture of the printed card. One thing to expect: Facebook and LinkedIn remember the first preview they ever saw for a web address, so a link you shared before today may keep showing the old blank preview until it is re-checked in their own preview tools. New shares are fine.

### I added a featured image before and it kept disappearing. Is that fixed?
Yes. Featured images previously looked like they'd been added but weren't actually being saved with the post, so they'd vanish when the page reloaded. They now save properly. If you have older posts where you tried to add a header image, open each one and pick the image again — it'll stick this time.

### I added a link to my newsletter but the email arrived without it. Why?
This was a genuine bug, now fixed: the web address was being lost while the page saved your draft. The link looked correct in the editor — it just never made it into storage, so the email went out with plain, unclickable words. It affected links, and it could also have dropped images and heading sizes the same way.

You'll now be warned before it can happen again: an **amber box appears in the sidebar** of the issue, listing exactly which words have no address, and you'll get a confirmation prompt if you try to send a test, schedule, or send while it's showing. Fix each one by selecting the words, clicking the **🔗 button**, and entering the address — you'll see a green "Link added" when it works.

If you had the newsletter page open in your browser for a long time before this change, refresh the page first (hold Shift and click reload) so you're using the current version.

### Do links work in every kind of email?
Yes. Every email goes out in two versions — a designed one and a plain-text one for readers whose email program can't show formatting. The plain-text version used to drop web addresses entirely; it now writes them out in full after the link text, like *Download the workbook (https://www.thryvegrowth.co/career-reset-workbook)*, and includes the unsubscribe link.

## Where to Find Things

| I want to… | Go to |
|---|---|
| See upcoming sessions | **Sessions** (or the dashboard widget) |
| Offer someone times to book | **Invitations → New invitation** |
| Send a quote-based proposal and collect payment | **Proposals → New proposal** |
| Approve or manage testimonials | **Testimonials** |
| Manage one client / their sessions / their goals | **Clients → (the client)** |
| Add a client without taking payment | **Clients → New client** |
| Give someone free Job Alerts (or take it back) | **Clients → (the client) → Job Alerts access** |
| See who has free access | **Clients → Comped** filter |
| See business insights and download CSVs | **Analytics** |
| Edit an automated email | **Templates** |
| Turn an email on/off | **Settings** |
| Reconnect Google Calendar | **Integrations** |
| Set my weekly availability / time off | **Bookings** (availability) |
| Read these guides | **Help** |
