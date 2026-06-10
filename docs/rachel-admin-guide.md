# Admin Guide — Thryve Growth Co.

This guide covers everything you need to use the admin panel day-to-day. It is written for you, Rachel — no technical knowledge assumed.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [The Dashboard Overview](#2-the-dashboard-overview)
3. [Managing Your Availability](#3-managing-your-availability)
3b. [Sending a Booking Invitation](#3b-sending-a-booking-invitation)
3c. [Sending a Proposal](#3c-sending-a-proposal)
4. [Managing Clients](#4-managing-clients)
5. [Writing Blog Posts](#5-writing-blog-posts)
6. [Managing Job Watchlists](#6-managing-job-watchlists)
7. [What Happens When Someone Books](#7-what-happens-when-someone-books)
8. [Analytics](#8-analytics)
9. [The Weekly Newsletter](#9-the-weekly-newsletter)
10. [Notifications and Tasks](#10-notifications-and-tasks)
11. [Resources](#11-resources)
11b. [Testimonials](#11b-testimonials)
11c. [Client Goals & Progress](#11c-client-goals--progress)
11d. [Draft with ChatGPT](#11d-draft-with-chatgpt)
12. [Visitor Tracking (Pixels and Consent)](#12-visitor-tracking-pixels-and-consent)
13. [Known Limitations](#13-known-limitations)
14. [Troubleshooting](#14-troubleshooting)
15. [Help Center](#15-help-center)

---

## 1. Logging In

**URL:** `https://thryvegrowth.co/admin`

Log in with your admin email and password. If you forget your password, go to `https://thryvegrowth.co/reset-password` and follow the email link.

**Getting admin access for the first time:** Sign up at `/signup` with your designated admin email address. Your account will automatically be set to admin on signup (the system is pre-configured to recognize your email). You do not need to do anything extra.

**If your login keeps failing:** Your account has a special "admin" role that must be attached to your specific email address. If you are being redirected away from the admin panel after logging in, contact your developer — they can verify your role is correctly set in the database.

Once logged in, you will always land at `/admin` unless you bookmarked a specific section.

---

## 2. The Dashboard Overview

The `/admin` page shows booking stat cards, a row of Job Alerts metrics, a Pending review list, a Top Tasks panel, a recent bookings table, and a recent activity feed.

**Booking stat cards:**

| Card | What it means |
|---|---|
| Total Clients | Everyone who has created an account on the site (excluding you) |
| Total Bookings | Every booking ever recorded, in any status |
| Confirmed | Bookings that have been paid and are scheduled |
| Pending | Bookings that exist but haven't been fully confirmed — this should usually be 0; if it's not, check the bookings section |

**Job Alerts metrics:** Active Clients (active subscriptions), Pending Review (new watchlist submissions waiting for you — highlighted when above zero), Inactive, New Matches this week, Applications being tracked, and Unread Messages. Click any card to jump to the relevant section.

**Pending review list:** Clients who just set up a watchlist and haven't been reviewed yet. Click one to open their watchlist page, add some starter jobs, and click "Mark reviewed" to clear them.

**Recent activity:** The latest events (new bookings, intake submissions, messages, etc.), newest first.

**Top tasks panel:** Your next 5 open items, sorted by due date. Overdue items show in red. You can check a task off here without leaving the home page, or click "Add task" to jot down something you don't want to forget. The full list lives at the Tasks page in the left nav.

**The bell at the top right:** New bookings, intake submissions, document uploads, overdue intakes, and upcoming sessions all show up here. The red number is how many you haven't read. Click the bell to see the latest 20, or "View all" to see the full inbox.

**Booking status definitions** (used throughout the admin panel):

| Status | Meaning |
|---|---|
| Pending | Created but not yet confirmed — edge case, rarely seen |
| Confirmed | Client paid, slot is locked, session is scheduled |
| Completed | Session has taken place — mark it completed using the status dropdown on the client detail page |
| Cancelled | Booking was cancelled — slot may or may not be re-opened depending on circumstances |

---

## 3. Managing Your Availability

**URL:** `/admin/bookings`

This is where you control what dates and times clients can book. The page has four sections, top to bottom:

1. **My weekly schedule** — your recurring availability (the main one)
2. **Blackout dates** — vacations and days off
3. **Next 4 weeks — what clients see** — a glanceable preview
4. **Add one-off slots** (collapsed) — for irregular blocks that don't fit the weekly pattern

### Setting Your Weekly Schedule (the main thing)

The **My weekly schedule** section is built to be set up once and then mostly left alone. Each day of the week has its own card. Click **+ Add time block** on a day to add a new row, then fill in:

- **Start / End** — the hours that day is bookable (in your Central time)
- **Service** — pick "Any service" or a specific service. When you pick a service, the *Each slot* column auto-fills with a sensible default (Coaching → 60 min, Consultation → 30 min). You can always override.
- **Each slot** — controls how the block is split into bookable slots. Pick "Whole block" if the whole block is one session, or 30 / 60 / 90 min to chop it up.

Click **Save** on the row. You'll see a green toast telling you how many slots were created.

**The big difference from before:** these schedules are *recurring forever*. The system generates 8 weeks of slots from your schedule, and every morning at 5am Central a daily job extends the window by another day so you always have 8 weeks of openings live. You do not have to come back here every few months to re-create slots.

**Quick wins:**
- Set up Monday once, then click **Copy Monday to weekdays** above the schedule to clone it to Tue–Fri. Adjust whatever's different, then save each row.
- If you change a time block on a day that already has clients booked into the old times, **booked sessions stay** on the calendar exactly as they were. Only unbooked future slots get rebuilt to match.

### Taking Time Off (Blackout Dates)

The **Blackout dates** section is for vacations, holidays, conferences, sick days — any date range you don't want any slots generated for.

Click **+ Add blackout dates**, pick a start and end date (or use the **This Friday / This week / Next week** quick chips), add an optional reason, and **Add blackout**.

What happens immediately:
- Any unbooked future slots inside that date range get removed
- If any sessions are already booked inside that range, the toast warns you — those bookings stay on the calendar and you should reach out to those clients to reschedule
- New slots stop being generated for those days

To go back to normal, click the trash icon next to a blackout. Slots that were suppressed get re-generated automatically.

### Previewing What Clients See

The **Next 4 weeks** card shows a Mon–Sun grid of every slot in your calendar for the next four weeks. **Green** = open, ready to book. **Gray with strikethrough** = already booked. This is exactly what a client sees when they open `/book`. Use it as a sanity check after editing your schedule.

### Adding One-Off Slots

The **Add one-off slots** section at the bottom (click to expand) is the older bulk-add form. Use it for irregular blocks that don't fit your recurring schedule — e.g., "I happen to be free for two extra sessions next Saturday afternoon." Slots created this way are *not* tied to your recurring schedule and will stay until you delete them.

### Deleting Slots (Single or Bulk)

Slots in the **Open Slots** list are click-to-select. Click any slot pill — it highlights and a bar appears at the top of the list showing "**N slots selected — Clear selection · Delete**".

- **Delete one:** Click the slot, then click **Delete** in the bar.
- **Delete a whole day:** Click **Select day** in the date header — every slot on that day highlights — then **Delete**.
- **Delete everything:** Click **Select all** at the top of the list, then **Delete**.
- **Change your mind:** Click any selected slot to deselect, or click **Clear selection** to start over.

A confirmation popup shows the count ("Delete 12 slots") before anything is removed. Booked slots are never shown in this list — they're locked and can't be deleted from here. If a slot you selected gets booked the instant before you confirm, it's skipped automatically and you'll see a message like "Deleted 11 slots (1 already booked — skipped)".

### What Happens When a Client Books

When a client books and pays:
1. The slot you created is automatically locked (no one else can book it)
2. The client receives a confirmation email
3. You receive an alert email with the client's name and service
4. The client is synced to your GoHighLevel CRM
5. The booking appears in your Upcoming Sessions list

You do not need to do anything manually when a booking comes in.

### Recruitment & Candidate Screening leads

Recruitment is your one service that runs on a **custom quote** rather than a fixed price, so it does not appear on the Book page. The "Get a quote" buttons on the recruitment marketing pages route to the free consultation form at `/consultation` instead. New recruitment leads will arrive in your inbox the same way any consultation request does — reply, scope the engagement together, and invoice however you and the client agree. When you're ready to move recruitment onto fixed pricing or hourly billing, the developer can wire up a Stripe product without any rework on the marketing side.

---

## 3b. Sending a Booking Invitation

Use this when you want to hand-pick a few times for a specific person and let them choose — instead of waiting for them to find an open slot on the Book page. It's perfect for clients you already know, returning clients, or anyone you're scheduling personally.

**Where:** click **Invitations** in the sidebar, then **New invitation**. You can also start one from a client's detail page with the **Create booking invitation** button (it fills in their name and email for you).

**What you fill in:**
- **Client email and name** — who it's for. They do not need an account.
- **Service and session type** — picking a service fills in the name shown to the client; you can edit it.
- **Session length** — how long the meeting runs.
- **Meeting type** — Google Meet (a link is created automatically), Phone Call, In Person, or Custom. For anything other than Google Meet, add the location details (phone number, address, or instructions).
- **Require payment** — leave this **off** to create the session immediately and bill however you like. Turn it **on** and set an amount to have the client pay by card before the session is booked.
- **Available date & time options** — add as many choices as you want. The client picks one. Times are Central.
- **Expires (optional), custom message, internal notes** — the message shows in the email; internal notes are only for you.

Click **Send Booking Options** and the client gets a branded email with a "Choose My Session Time" button.

**What happens when they pick a time:**
- The session is created and shows up under **Sessions**.
- A Google Calendar event is added (with a Meet link if you chose Google Meet).
- You get an email and a bell notification.
- The client gets a confirmation email.
- If they have an account, the session also appears in their dashboard.

The time they chose is locked in, and the booking link stops working so it can't be used twice. On the Invitations page you can copy the link, re-send the email, or cancel an invitation that hasn't been used yet.

---

## 3c. Sending a Proposal

Use a proposal when the work is quote-based — recruitment, HR projects, culture consulting, or any custom engagement where you scope the work and agree on a price rather than selling a fixed session. You write up the scope and terms, set a price, and send the client a link. They review it, accept it by typing their name, and pay online — all in one place.

**Where:** click **Proposals** in the sidebar, then **New proposal**. You can also start one straight from a **lead's page** (the "Create proposal" button) or from a **client's page** (the "+ New proposal" link in their Proposals panel) — either way it fills in the name and email for you.

**What you fill in:**
- **Who it's for** — the client's name and email. They do not need an account.
- **Title** — a short name for the proposal, like "Recruitment Support — Q3."
- **Scope & terms** — the main body. Write out what you'll do, what's included, and any conditions, using the same editor you use for blog posts (headings, bold, lists, links, images).
- **Price** — enter a single total, or list out individual line items that add up to a breakdown the client can see. Set the price to **$0** if this is a no-charge agreement you just want signed.
- **Require a signature** — leave this on so the client has to type their name to accept (recommended). You can turn it off for an informal proposal.
- **Expiry date (optional)** — after this date the link stops working, so you can keep offers time-limited.
- **Internal notes (optional)** — only for you; the client never sees these.

You can **Save draft** to keep working on it later, or **Send** to email it right away. When you send, the client gets a branded email with a "Review & Accept Proposal" button.

**What the client does:**
- They open the link and read the full proposal.
- To accept, they type their name (their signature) and click to accept.
- If there's a price, they're taken straight to a secure card payment to pay for it. If it's a $0 proposal, accepting is all they need to do.
- They can also **decline** if it's not right for them.

**What you get back:**
- A notification (email and bell) the moment they **accept**.
- A second notification when the **payment goes through**, along with a receipt sent to the client automatically.
- A notification if they **decline**, so you can follow up with adjusted terms.

On the Proposals page you can copy the link, edit a draft, send it, or cancel one that hasn't been acted on yet.

**Important:** once a client accepts a proposal, it's locked — you can no longer edit it, because the accepted version is a signed record. If you need to change something after that, create a new proposal. And a proposal that's already been paid can't be cancelled here — if you need to refund it, do that in Stripe.

**Tip:** when someone fills out your free consultation form, they're now automatically saved as a **lead**. That means you can open their lead, talk it through, and turn it into a proposal in a couple of clicks without retyping their details.

---

## 4. Managing Clients

**URL:** `/admin/clients`

This page shows everyone who has created a client account. Click any client's name to open their detail page.

### The Client Detail Page

The detail page has three sections:

**Bookings** — A history of the client's bookings with date, service, amount, and a status dropdown. To change a booking's status, click the dropdown on that row and select the new status — it saves immediately. Use this to mark sessions as Completed after they occur, or Cancelled if they were not held.

Each booking also has a **Manage** link. Click it to open a panel where you can:
- Set the session status (including **No show**) and the **payment status** (Paid, Pending, Refunded, Waived, or Not required).
- Write a **Session summary** and **Next steps** — these are shared with the client in their dashboard after the session.
- Flag **Follow-up needed** for yourself.
- **Reschedule** to a new date and time — this moves the Google Calendar event and re-sends the client a confirmation automatically.
- **Send reminder** to email the client the session details right now.
- **Cancel session**, which also removes the calendar event.

Your dashboard home now also has an **Upcoming sessions** panel showing everything in the next 7 days, with quick buttons to send a reminder or mark a session complete. Clients are automatically reminded 24 hours and 1 hour before each session.

**Session packages.** When a client buys a multi-session package (the 4-session coaching plan or the 3-session interview prep package), the first session is booked at checkout and the rest become **credits** they can schedule themselves from their **My Packages** page in their dashboard — no extra payment, they just pick a time. The client's record shows a **Session packages** panel with "X of N used." If you cancel a session that came from a package, the credit goes back automatically. Credits can have a use-by date; if a package expires with credits unused, those show up as "expired unused" in your Analytics (Package utilization).

**Clients can now reschedule or cancel themselves** — but only **more than 24 hours** before the session. When they do, you get a notification and an email, the calendar updates, and they get a new confirmation. Within 24 hours, they're told to reply to your email instead, so last-minute changes still come through you.

**Session Notes** — Private notes only you can see. Clients cannot see these.

To add a note:
1. Type your note in the text box
2. Optionally fill in the Session Date field (leave it blank to use today's date automatically)
3. Click "Add Note"

Notes are listed below the form, newest first. There is no way to edit a note after saving — if you need to correct something, add a new note.

**Documents** — Files you have uploaded for this client. The client can see and download these from their dashboard.

To upload a document:
1. Click "Upload Document"
2. Choose your file (PDF, Word, Excel, images — max 25 MB)
3. Select a Category:
   - **Resume** — A resume you've written or edited for them
   - **Cover Letter** — A cover letter
   - **Session Notes** — A written summary you want to share with the client
   - **Worksheet** — A template or exercise they should fill out
   - **Template** — A blank template
   - **Other** — Anything that doesn't fit above
4. Add an optional Description (a short note about what the file is)
5. Click Upload

To delete a document, click the trash icon. Deletion is permanent and cannot be undone. The file is removed from both the system and the client's view immediately.

---

## 5. Writing Blog Posts

**URL:** `/admin/content`

The posts list shows all your blog posts. A green eye icon means the post is published and live on the website. A grey crossed-eye icon means it's a draft — invisible to the public.

### Creating a New Post

Click "New Post."

**Fields:**

- **Title** — The post's headline. Required.
- **Slug** — The URL for this post, e.g. `how-to-prepare-for-interviews` becomes `https://thryvegrowth.co/blog/how-to-prepare-for-interviews`. The slug is auto-generated from the title, but you can edit it. Once a post is published and shared, avoid changing the slug — it will break any existing links.
- **Excerpt** — A 1–2 sentence summary shown on the blog index page. Not required, but recommended.
- **Featured Image** — An optional header image for the post. Upload a JPG or PNG. It appears at the top of the post and as the preview image when shared on social media.
- **Content** — The main body of the post, written in the editor.

### Using the Editor

The toolbar above the text area has these tools:

| Button | What it does |
|---|---|
| H2 / H3 | Section headings (H2 is larger, H3 is smaller) |
| B | Bold text |
| I | Italic text |
| `code` | Inline code (for technical terms) |
| Bullet list | Unordered list |
| Numbered list | Ordered list |
| Blockquote | Indented quote or callout |
| --- | Horizontal dividing line |
| Link | Add a hyperlink — you'll be prompted to enter a URL |
| Image | Insert an image by URL |
| Undo / Redo | Undo or redo your last action |

### Saving and Publishing

- **Save Draft** — Saves the post but keeps it invisible to the public. Use this while you're still writing.
- **Publish** — Makes the post live immediately on the website. The publish date is set to right now.
- **Update & Publish** — (appears when editing an existing published post) Saves your changes and keeps the post live. The original publish date is preserved.

### Editing an Existing Post

Click the post title in the content list. Make your changes and click "Update & Publish" (or "Save Draft" if you want to take it offline temporarily).

### Deleting a Post

On the edit page, there is a "Delete" button in the top-right corner. You'll be asked to confirm. Deletion is permanent — the post is removed from the website immediately.

### Slug Errors

If you see an error saying the slug already exists, it means another post already uses that URL. Change the slug slightly (e.g., add `-2` at the end) and try again.

---

## 6. Managing Job Watchlists

**URL:** `/admin/watchlists`

### What the Watchlist Subscription Is

When a client pays for the "Job Alerts & Watchlists" monthly plan ($50/month via Stripe), their account gets activated in the watchlist system. Your job is to curate job listings for them based on their preferences.

### The Watchlists Index

This page shows all clients who have an active watchlist subscription. You can see:
- Their name and email
- The roles they're targeting
- Their subscription status (Active)
- When their preferences were last updated

Click "Manage" next to any client to open their watchlist page.

### The Client Watchlist Page

**Subscription & review controls (top of the page)** — A row of buttons lets you:
- **Mark reviewed / Mark pending** — When a client first fills out their watchlist, they show as "Pending review" (and appear in the Pending review list on your Overview). After you've looked over their criteria and added some starter jobs, click "Mark reviewed" to clear them from the queue. This is just a checklist for you — it never affects the client's access.
- **Pause / Reactivate** — Pause temporarily stops their subscription billing and hides their watchlist; Reactivate turns it back on.
- **Cancel service** — Cancels their subscription billing and locks their watchlist. Use with care; it asks you to confirm.

**Client Preferences panel** — Shows everything the client filled in on their setup form: target roles, locations, industries, salary range, remote preference, experience level, employment type, keywords, skills, certifications, education, employers of interest, employers to exclude, work environment, travel, work authorization, must-haves, nice-to-haves, and notes. Use this as your guide when finding jobs. Click **"Edit criteria"** to change any of it yourself on the client's behalf — handy after a coaching call.

**A note on must-haves and excluded employers:** When the automatic matcher runs, any job missing one of the client's must-haves, or at an employer they asked to exclude, is filtered out entirely. Employers they're interested in get a small boost.

**Adding Jobs — Two Methods:**

**Method 1: Fetch from JSearch (Automatic)**

Click "Fetch from JSearch." The system will:
1. Use the client's target roles and location to search live job listings
2. Filter out jobs you've already added before (no duplicates)
3. Automatically add all new matches to the client's list

The button will show how many jobs were fetched and how many were actually new. If a client has very specific preferences, you may get 0 new results — in that case, use the manual method.

**Method 2: Add Manually**

Click "Add Manually" to open a form. Fill in:
- Job Title and Company (required)
- Location (e.g., "Chicago, IL")
- Salary Range (e.g., "$80k–$100k")
- Application URL (the link to apply)
- Description (optional — a short summary)
- Remote checkbox — check if it's a remote position

The manual form also has a **"Your curation"** section that the client sees:
- **Why it matches** — a sentence on why this is a strong fit.
- **Priority** — High / Medium / Low.
- **Recommended action** — e.g., "Apply this week; mention referral."
- **Private notes** — only you see these; never shown to the client.

Click "Add Job." The job is saved, assigned, tagged **"Curated by Rachel,"** and the client immediately gets an in-app notification and an email about your pick. (The automatic matcher also notifies clients when it adds new matches.)

### Job Match Status Meanings

Each job shows a status badge. **Clients update their own statuses** from their dashboard — you do not change these. Clients move applications through a full pipeline, and can track interview dates, salary offered, next steps, and which resume + cover letter they used on their Application Tracker. The statuses are:

| Status | Meaning |
|---|---|
| New | Just added, client hasn't interacted yet |
| Saved | Client bookmarked it (shows in their Saved & Favorites tab) |
| Interested | Client is actively interested |
| Applied | Client submitted an application |
| Interviewing | Client has interviews scheduled |
| Final Interview | Client reached a final round |
| Offer Received | Client received an offer |
| Accepted | Client accepted an offer |
| Declined | Client turned down an offer |
| Rejected | Employer passed |
| Withdrawn | Client withdrew |
| Not a Fit | Client decided to pass |
| Archived | Client dismissed it |

### Automated Job Sources

On the Integrations page there's an **Automated Job Sources** section. Each toggle turns a job board on or off for the automated weekly search. JSearch (which already covers LinkedIn, Indeed, ZipRecruiter, and Google listings) is on by default. USAJOBS.gov (federal jobs) can be turned on once its access key is set up.

Every Monday the system automatically searches every enabled source against each active client's watchlist, scores the results, removes duplicates, and adds new matches to their list — then emails each client about their new matches. You don't have to do anything; your manual picks and the automated matches live side by side.

### The Weekly Job Alert Email

Every Monday morning, the system also emails every active subscriber a digest of jobs added to their list in the past 7 days.

You do not need to do anything to trigger this. If you want a client's new matches to be included in that week's digest, add them before Sunday night.

Clients with no new matches that week do not receive an email.

### Application Reminders

When a client marks a job "Applied," the system automatically nudges them 7, 14, and 30 days later to update their tracker — so applications don't go stale. Fully automatic.

### Sending a File in Messages

In any message thread, click the paperclip to attach a file (resume, job posting, etc.) along with — or instead of — a written message. The client can download it from their dashboard, and you can download anything they send you.

---

## 7. What Happens When Someone Books

When a client completes a booking and payment on the website, the following happens automatically — no action needed from you:

1. The client's chosen time slot is locked so no one else can book it
2. The client receives a booking confirmation email with the service, date, and time
3. You receive an alert email: "New Booking: [Service] — [Client Name]"
4. The client's contact is created or updated in your GoHighLevel CRM with the booking details
5. The booking appears in your admin bookings list and in the client's dashboard

If the booking is for a service that doesn't require a time slot (Resume Review, HR Consulting, Job Alerts), step 1 is skipped — no slot is locked.

---

## 8. Analytics

**URL:** `/admin/analytics`

The Analytics page shows a live snapshot of your business performance, pulled directly from your database.

**Deeper Insights (the new section at the top):**

At the very top of the page is an **Insights** area with five richer views of your business, plus charts. Above them on the right is a **date-range selector** with four buttons: **This month**, **Last 90 days**, **This year**, and **All-time**. Pick one and the whole Insights area updates to that window — so you can ask "how did last quarter look?" without doing any math. (The selector only changes the Insights area; the older cards further down the page always show their own fixed time windows, described below.)

The five insights are:

- **Revenue by service** — A bar chart showing how much money each service brought in for the selected window, with the total and number of payments. Click **CSV** to download these figures as a spreadsheet for the same window.
- **Lead → client funnel** — A chart that follows your leads through each stage: how many came in, how many you engaged, how many got a proposal (sent, then accepted, then paid), and how many actually became clients. The heading shows the share of leads that became clients. Great for spotting where people drop off.
- **No-show rate** — The share of sessions where the client did not show up, out of all sessions that either happened or were missed (other statuses like cancelled don't count). Shown overall and broken down by service so you can see if one service has more no-shows.
- **Package utilization** — For clients on multi-session packages, a donut chart showing how many of their purchased sessions have actually been used, overall and by service. It also flags **expired unused credits** — sessions a client paid for in a package that expired before they were used. Click **CSV** to export the by-service breakdown.
- **Top clients by value** — Your most valuable clients for the selected window: revenue, number of payments, and completed sessions, with summary cards for paying clients, average client value, and repeat-booking rate. The table shows your top 20; click **CSV** to download the full list.

The three **CSV** buttons (revenue, top clients, and package utilization) always download data for whichever date range is currently selected, so the file matches what you see on screen.

The older cards below stay on their own fixed time windows regardless of the selector:

**Revenue section:**
- **All-Time Revenue** — Total money collected since the site launched
- **This Month** — Revenue collected since the first of the current month
- **This Week** — Revenue collected since this Monday

**Bookings by Status:**
Four cards showing how many bookings are currently in each status (Confirmed, Completed, Cancelled, Pending).

**Subscribers & Clients:**
- **Active Job Alerts subscribers** — Clients with a currently active $50/month subscription
- **New clients this month** — Accounts created since the first of the current month

**Most Popular Services:**
A ranked list showing which services have the most bookings overall.

**Monthly Revenue — Last 6 Months:**
A table showing your total revenue for each of the past six months.

**Job Alerts Report:**
A dedicated set of cards for the watchlist service: Total Clients, Active Clients, Placement Rate (the share of applications that became accepted offers), and totals for Applications, Interviews, Offers, and Accepted. Below them, **Top Industries** (what your clients are looking for) and **Most Successful Searches** (which target roles produce the most applications). Click **Export CSV** to download a per-client breakdown — one row per client with their counts and target roles — for your own records or a spreadsheet.

All figures update automatically as bookings, payments, and client activity come in. There is no need to refresh or recalculate anything.

---

## 9. The Weekly Newsletter

The newsletter system lives at `/admin/newsletter`. It handles three things: collecting subscribers, writing your weekly email, and tracking how it performs.

### How people subscribe

The footer of every page has a quick email-only signup. The page at `thryvegrowth.co/newsletter` has a longer form where they also pick interests like "Leadership" or "Job Searching". The blog page has the quick form too.

When someone subscribes, two things happen automatically:
1. They get a warm welcome email from you (it explains what to expect, and reminds them they can hit reply anytime).
2. Their contact is added to GoHighLevel with the tag `thryve-newsletter`.

### The dashboard

`/admin/newsletter` shows you:
- **Active subscribers** — how many people are on the list right now.
- **New (30 days)** — how many joined in the last month.
- **Scheduled** — emails you've already written and queued to send.
- **Total sent** — running count of emails delivered.
- **Recently sent** — open and click rate for each of your last five issues.
- **Idea inbox** — a free-form notepad. Jot down a headline or a half-thought; nothing is sent automatically. Use it as a parking lot.

### Writing a new issue

Click **New issue**. The editor opens pre-filled with a seven-section template:

1. Opening Note from Rachel
2. Weekly Motivation
3. Featured Blog or Article
4. Career or Leadership Tip
5. Resource Spotlight
6. Service or Offering Highlight
7. Closing Thought

You don't have to keep all seven — delete the ones you skip this week. The template is there so you never face a blank page.

Fill in:
- **Internal title** — just for you (e.g., "Week of June 2"). Subscribers never see it.
- **Email subject** — what shows up in inboxes. Aim for under 60 characters.
- **Inbox preview** — the line readers see in their inbox before they open. Treat it as a second chance at a headline.
- **Body** — your content. The toolbar has H2 (section heading), H3 (subheading), bold, italic, bullet list, numbered list, quote, divider, link, and image.

### The sidebar (right column)

- **Status** — where the draft is in the workflow (Draft → Pending approval → Scheduled → Sent).
- **Audience** — leave all boxes unchecked to send to everyone. Check specific interests to send only to people who picked those when they signed up.
- **Featured blog** — pick one of your published posts to highlight. This is just a hint to you — you still need to mention it in the body.
- **Send test to yourself** — type your email, hit "Send test", and a copy lands in your inbox. Always do this before scheduling.
- **Schedule** — defaults to next Tuesday at 9 AM Central. Change it if you want a different day. The system checks for due newsletters every hour, so a 9:15 AM schedule will actually go out at 10 AM.
- **Actions:**
  - **Save draft** — saves your work, doesn't send anything.
  - **Submit for approval** — moves the draft to a holding state for your own review (optional step).
  - **Approve & schedule** — locks in the schedule. The send will happen automatically.
  - **Send now** — sends immediately to everyone matching your audience filter. Use sparingly.

### Preview

Click **Open preview** in the sidebar to see how the email will look in an inbox. The header shows the fake "from", subject, and preview line; the body is the real rendered email.

### Duplicate

When you find a structure that works, hit **Duplicate** in the sidebar of any past issue. It creates a fresh draft with the same content, so you can edit instead of starting over.

### Subscribers list

`/admin/newsletter/subscribers` shows everyone on your list. Filter by interest (Leadership, Career Growth, etc.) or by Active/Unsubscribed. Search for a specific email. Click "Unsubscribe" next to a row to manually take someone off the list — useful if they reply asking you to remove them.

### Tracking and re-engagement

Once an email goes out, the system tracks opens, clicks, bounces, and complaints automatically. You see these on the issue's detail page and as percentages in the dashboard.

Two automatic emails go out on a regular basis without you doing anything:

- **"We missed you"** — once a week, sent to subscribers who haven't opened anything in 60 days. Gives them a friendly nudge to update preferences or unsubscribe. Capped at 50 per week so it never feels like a blast.
- **Milestone thank-you** — on the 6-month and 1-year anniversary of someone subscribing, a short note from you thanking them.

You don't need to write or schedule any of these.

### Templates

`/admin/newsletter/templates` lets you create alternate section layouts (e.g., a "monthly roundup" structure that's different from the weekly default). Mark one as "default" — that's the one that pre-fills every new issue. Most weeks you won't need to touch this.

### Tips

- Save the draft first, then send a test to yourself. Send tests don't count toward sent_count and don't trigger tracking.
- The "Submit for approval" step is optional. If it's just you, go straight from Draft → Approve & schedule.
- Once an issue is in `Sent` status, you can't edit it. Use Duplicate to start a new draft from it.
- Tuesday 9 AM Central is the recommended default. You can override it per issue.

---

## 10. Notifications and Tasks

**Notifications (the bell):**
Look up at the top right of any admin page. The bell shows you everything that's happened recently that you might want to act on:

- New bookings
- A client submitted their intake form
- A client uploaded a document
- An intake form is overdue
- A session is coming up in 24 hours
- A new newsletter subscriber (or someone unsubscribed / changed their preferences)
- A new Job Alerts subscription — or a subscription problem (cancelled, paused, or a failed payment)
- A client edited their job watchlist preferences
- A client moved an application forward (applied, interviewing, offer, etc.)
- A client sent you a message

The red number is how many you haven't read yet. Click the bell to see the latest 20 in a quick dropdown. Click any row to jump to that client or booking. Use "Mark all read" to clear the number. To see everything that ever came in, click the Notifications page in the left nav — it groups them by Today / Yesterday / This week / Older.

**Email, too.** Every one of the events above also lands in your inbox (`hello@thryvegrowth.co`) in real time — so you're notified even when you're not in the admin panel. For subscriber and message emails you can reply directly to reach the person. Contact-form, consultation, and lead emails work the same way as before.

**Turning notifications on or off (Settings page).** The **Settings** item in the left nav lets you control every notification. There are two sections:
- **Admin notifications** — what gets sent to *you*. Each one has an **Email** switch and a **Bell** switch, so you can (for example) keep the bell but stop the emails for a chatty event like application status changes.
- **Client & lead notifications** — what gets sent to *leads, subscribers, and clients* (auto-replies, the newsletter welcome, job-match alerts, reminders, etc.).

Each section also has a **master switch** at the top to pause everything in that section at once. Flip a switch and it takes effect right away (within a minute for the automated daily/weekly emails).

A few **essential messages can't be turned off** — payment receipts, the booking/subscription welcome, intake confirmations, "your deliverable is ready," client session reminders, and login emails (sign-up confirmation, password reset). Those always send so billing, onboarding, and login never break. They simply don't appear on the Settings page.

**Tasks (your to-do list):**
The Tasks page in the left nav is where you keep track of what you need to do next. Some tasks get added automatically:

- When a client books, you get a task to "Review intake when submitted."
- When a client submits their intake, you get a task to "Prepare deliverable / session." It's due 12 hours before the session if there's one scheduled, or 3 days out if it's a resume / HR project.

You can also add your own tasks anytime — from the home page, from the Tasks page, or from a specific client's page (a task added there is automatically linked to that client).

Each task has a checkbox. Click it to mark the task done. Done tasks move to the Completed tab. You can also click the small trash icon to delete a task that's no longer relevant.

The three tabs across the top are how you filter what you see:

- **Upcoming** — everything that's not done yet
- **Overdue** — anything past its due date that's not done yet (these also show in red on the home page)
- **Completed** — what you've already finished

**Documents that notify the client automatically:**
When you upload a document on a client's page, the category dropdown has three options labeled "(notifies client)":

- **Deliverable** — for anything you want to call generic finished work
- **Resume Rewrite** — for a finished rewrite
- **HR Document** — for HR consulting deliverables

If you pick one of those, the client gets the "Your deliverable is ready" email automatically — you don't have to send anything separately. The other categories (Resume, Cover Letter, Notes, Worksheet, Template, Other) don't trigger an email.

---

## 11. Resources

**URL:** `/admin/resources`

The Resources page in your left nav is where you control what shows up on your public `/resources` page (the "Templates and Tools" section of your site).

Every template or worksheet in the catalog has a row here. On the right side of each row you'll see a small switch. Flip the switch ON to make that resource visible on your public page; OFF to hide it.

When **nothing** is switched on, the public `/resources` page replaces the templates section with a "More resources coming soon" panel. That's the state you're in today — none of the templates are built yet, so everything is hidden.

**Editing a resource:**
Click "Edit" on any row to change the title, description, category, price (use "Free" or "$19" style), CTA type (Buy Now vs Download), or the sort order. Save and the public page updates instantly.

**A note on the Buy / Download button:**
Right now, when you flip a resource ON, the public card shows a muted "Coming soon" badge where the Buy or Download button used to be. That's intentional — none of the resources have a real download URL or purchase link wired up yet. When you actually finish building one (a real PDF, a Stripe price for a paid template, a Gumroad link, etc.), ping your developer to swap the badge for a working button. The Edit form already remembers whether the resource is supposed to be a "Buy Now" or a "Download" so the developer knows what to wire up.

---

## 11b. Testimonials

**URL:** `/admin/testimonials`

This is where you collect and manage the kind words clients say about working with you, and decide which ones appear on your public site.

**How clients leave one:**
The day after a session is marked complete, the client gets a follow-up email that includes a friendly invitation to share their experience. They click the link, write a short note, add their name (and optionally a title and a star rating), and submit. There's nothing they need to log in for, and each session can leave one testimonial.

**Where they land:**
Every testimonial a client submits shows up on your Testimonials page as **Pending**. Pending ones are waiting for you — they are **not** on your public site yet. The page groups everything by status (Pending first, then Approved, then Hidden) and shows a count for each, so you can see at a glance what needs your attention.

**What you can do with each one:**
- **Approve** — this is what makes it appear on your public Testimonials page.
- **Hide** — takes an approved one back off the public page without deleting it (you can un-hide it later).
- **Edit** — fix a typo, tidy the wording, adjust the name or title, or change the star rating.
- **Delete** — remove it for good.

**Adding one yourself:**
Sometimes a client emails you a lovely note instead of using the link. Click **New** (or "Add testimonial") to type it in yourself — the quote, their name, and an optional title, service, and rating. Ones you add this way are set to **Approved** right away, so they go straight to your public page (you can still hide or edit them).

**A note on your public page:**
Your public Testimonials page **starts empty** — none of the old sample quotes were carried over. It will stay that way (showing a friendly "stories are on the way" message) until you approve a few. Once you've approved a handful, ask your developer to make the page show up in search results.

---

## 11c. Client Goals & Progress

This is a shared space for tracking what a client is working toward and looking back on what each session covered.

**Adding goals for a client:**
Open any client's page and you'll find a **Goals** panel. Add a goal with a title, an optional description, a status (Active, In progress, Completed, or Paused), and an optional target date. You can edit, mark complete, or delete a goal at any time.

**Clients can add their own, too:**
Clients have a **Progress** area in their own dashboard where they can add and update goals themselves. You and the client are looking at the **same list** — anything you add shows up for them, and anything they add shows up for you. It's a shared, two-way picture of what they're working on.

**The session history:**
On their Progress page, clients also see a tidy timeline of their past sessions — the **summary** and **next steps** you wrote for each one (in the Manage panel on their booking) — newest first. This gives them an easy place to look back on everything you've covered together. You don't do anything extra for this; it simply gathers up the session notes you're already writing.

---

## 11d. Draft with ChatGPT

In several places around the admin, you'll see a little **Draft with ChatGPT** helper — a collapsible box with a sparkle icon. It's there to give you a head start on the writing you do all the time: session summaries, a quick prep brief before a call, a resume review, a job's "why it matches you" note, a cover letter, a proposal's scope and terms, a reply to a client message, and a follow-up to a new lead.

**The most important thing to know:** this uses **your own ChatGPT** — the one you already sign into at `chatgpt.com`. Nothing is ever sent anywhere automatically, and there's no extra cost beyond whatever ChatGPT plan you already have. The helper simply writes a detailed, ready-to-use prompt for you (already filled in with the relevant details, like the client's role, goals, and what they shared), so you don't have to explain the situation to ChatGPT from scratch. **You stay in control the whole way:** nothing is saved or sent until you read it, edit it, and decide it's good.

**How it works (the same four steps everywhere):**

1. Click the **Draft with ChatGPT** box to open it. Inside you'll see the prompt already written for you.
2. Click **Copy prompt**. Then click **Open ChatGPT** — it opens `chatgpt.com` in a new tab.
3. In ChatGPT, paste the prompt and press enter. ChatGPT writes a draft.
4. Copy ChatGPT's answer and bring it back to the admin. What happens next depends on the helper:
   - **Some helpers fill the boxes for you.** Paste ChatGPT's answer into the "Paste ChatGPT's reply here" box and click the button (e.g. **Apply to fields**). The helper drops the text into the right places for you to review and tidy.
   - **Some helpers are copy-only.** There's no paste-back box — you just copy ChatGPT's answer and put it where you need it yourself (for example, into the proposal editor, or into an email you send from your own inbox).

Either way, **always read and edit the draft before you save or send it.** Think of ChatGPT as a fast first draft, not the final word — it's writing in your voice, but it's your name on it.

**Where you'll find it, and what each one does:**

- **On a client's session (in the Manage panel of a booking):**
  - **A session prep brief** — a short briefing *for you* before the call: who this person is, what they likely want, and a few questions to open with. Copy-only.
  - **A session summary and next steps** — a warm recap written *to the client* plus a few concrete next steps. This one fills the **Summary** and **Next steps** boxes for you when you paste the reply back.
- **On a client's page, in the Documents area:**
  - **A resume review** — feedback you can refine before sharing. **You upload the client's resume into ChatGPT yourself** (the prompt reminds you to), then paste ChatGPT's review back and it's saved as a **private note** on the client for you to polish.
- **On a client's job watchlist (when adding a job):**
  - **A "why it matches" + recommended action** — fills the "Why it matches" and "Recommended action" boxes for that job before you send it to the client.
  - **A cover letter** — a tailored draft for the client applying to that job. Copy-only.
- **On a new proposal:**
  - **A proposal's scope & terms** — a clean draft of deliverables, timeline, and terms. Copy-only — you paste it into the proposal editor yourself and refine it there.
- **On a client message thread:**
  - **A reply** — drafts a response to the client's latest message and drops it into your reply box for you to edit and send.
- **On a new lead's page:**
  - **A follow-up email** — a warm, personal note to someone who reached out. Copy-only — you copy it and send it from your own inbox.

**A note on what ChatGPT sees:** the prompt only includes the details that are already in your admin (the client's role, goals, notes, the message thread, the job details, and so on) — and only you can see it. For the resume review, ChatGPT only sees the resume if *you* upload it into your ChatGPT.

---

## 12. Visitor Tracking (Pixels and Consent)

**URL:** `/admin/integrations`

Scroll past the Google Calendar card on your Integrations page and you'll find a section called **Visitor Tracking**. This is where you turn on Google Analytics, Meta Pixel (Facebook/Instagram ads), Google Ads, LinkedIn Insight, Microsoft Clarity, and Google Tag Manager.

**To turn on a tracker:**
1. Sign in to the tracker's own dashboard (e.g. `analytics.google.com` for GA4) and grab the ID.
2. Paste the ID into the matching card on `/admin/integrations`.
3. Flip the toggle to On.
4. Click **Save changes**.

That's it — within a few seconds the tracker is running on your public site.

**To turn one off:** flip the toggle to Off and Save. The script stops loading on the next page view.

**Cookie consent banner:**
Visitors to your public site see a small banner at the bottom-left asking them to accept or decline cookies. The trackers above only fire after a visitor clicks **Accept**. If they click **Reject** (or dismiss the banner), no tracking scripts load for them. This is what keeps the site compliant with privacy regulations like GDPR/CCPA. You don't have to do anything — the banner handles itself.

**Privacy policy stays accurate automatically:**
Your `/privacy` page lists exactly which trackers are running, with a per-tracker opt-out link for visitors who want to opt out at the source. When you flip a tracker on or off in admin, the privacy page updates on the next visit. No manual edits.

**Where to find each tracker's ID** (cheat sheet):

| Tracker | Where to find the ID |
|---|---|
| Google Analytics 4 | `analytics.google.com` → Admin → Data Streams → your stream → "Measurement ID" (starts with `G-`) |
| Google Tag Manager | Top-right corner next to the container name at `tagmanager.google.com` (starts with `GTM-`) |
| Meta Pixel | `business.facebook.com` → Events Manager → your pixel → top of page (15–16 digit number) |
| Google Ads | `ads.google.com` → Tools → Measurement → Conversions (starts with `AW-`) |
| LinkedIn Insight | `linkedin.com/campaignmanager` → Analyze → Insight Tag → "Partner ID" |
| Microsoft Clarity | `clarity.microsoft.com` → your project → Settings → Setup → "Project ID" |

If you want to add a tracker that isn't on this list, ping the developer — adding a new provider is a small code change.

---

## 13. Known Limitations

**User roles:**
There is no button to make someone an admin or to downgrade an admin to a client. Any role changes require a developer to update the database directly.

---

## 14. Troubleshooting

**"A client says they didn't get a confirmation email"**
Check your Resend dashboard for delivery status. Also ask the client to check their spam or junk folder. The email comes from `noreply@thryvegrowth.co`.

**"A client can't see their document in their dashboard"**
Make sure the document was uploaded on that specific client's detail page (`/admin/clients/[their ID]`). Documents are only visible to the client they were uploaded for. If you uploaded it under the wrong client, delete it and re-upload.

**"The JSearch fetch came back with 0 new jobs"**
This usually means all the jobs the API found have already been added before (they were deduplicated). Try the manual method to add specific listings you've found. You can also try again in a few days when new postings appear.

**"I deleted a slot but the booking still shows"**
Correct — booked slots cannot be deleted. The booking remains in the system. Only open (un-booked) slots can be removed. To address a specific booking situation, contact your developer.

**"The slug error won't go away when writing a post"**
Each blog post must have a unique slug. Try adding a word or number to make it unique (e.g., change `resume-tips` to `resume-tips-2024`).

---

## 15. Help Center

**URL:** `/admin/help` (the **Help** item at the bottom of the sidebar)

This is your built-in library of guides — including this one. It's the fastest way to look something up without leaving the admin.

**What's in it:**
- **Admin Guide** — this complete walkthrough of every admin feature.
- **Email Reference** — every automated email: when it sends, what it says, and how to edit it.
- **FAQ & Status Glossary** — what each status means and answers to common questions.
- **Booking Flow Diagrams** — visual maps of the booking-invitation workflow.

**Searching:** type in the search box at the top of the Help Center. Results jump you straight to the right guide — and often the exact section.

**Saving or printing a guide:** open any guide and click **Print / Save as PDF**. Your browser's print window opens; choose "Save as PDF" to keep a copy or print it on paper. The sidebar and buttons are automatically hidden so only the guide content prints.

**Staying current:** these guides update automatically whenever the app is updated, so they always match how the admin actually works. You don't maintain them — they're read-only.
