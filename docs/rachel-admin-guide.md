# Admin Guide — Thryve Growth Co.

This guide covers everything you need to use the admin panel day-to-day. It is written for you, Rachel — no technical knowledge assumed.

---

## Table of Contents

1. [Logging In](#1-logging-in)
2. [The Dashboard Overview](#2-the-dashboard-overview)
3. [Managing Your Availability](#3-managing-your-availability)
4. [Managing Clients](#4-managing-clients)
5. [Writing Blog Posts](#5-writing-blog-posts)
6. [Managing Job Watchlists](#6-managing-job-watchlists)
7. [What Happens When Someone Books](#7-what-happens-when-someone-books)
8. [Analytics](#8-analytics)
9. [The Weekly Newsletter](#9-the-weekly-newsletter)
10. [Notifications and Tasks](#10-notifications-and-tasks)
11. [Known Limitations](#11-known-limitations)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Logging In

**URL:** `https://thryvegrowth.co/admin`

Log in with your admin email and password. If you forget your password, go to `https://thryvegrowth.co/reset-password` and follow the email link.

**Getting admin access for the first time:** Sign up at `/signup` with your designated admin email address. Your account will automatically be set to admin on signup (the system is pre-configured to recognize your email). You do not need to do anything extra.

**If your login keeps failing:** Your account has a special "admin" role that must be attached to your specific email address. If you are being redirected away from the admin panel after logging in, contact your developer — they can verify your role is correctly set in the database.

Once logged in, you will always land at `/admin` unless you bookmarked a specific section.

---

## 2. The Dashboard Overview

The `/admin` page shows four stat cards at the top, a Top Tasks panel, and a recent bookings table below.

**Stat cards:**

| Card | What it means |
|---|---|
| Total Clients | Everyone who has created an account on the site (excluding you) |
| Total Bookings | Every booking ever recorded, in any status |
| Confirmed | Bookings that have been paid and are scheduled |
| Pending | Bookings that exist but haven't been fully confirmed — this should usually be 0; if it's not, check the bookings section |

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

## 4. Managing Clients

**URL:** `/admin/clients`

This page shows everyone who has created a client account. Click any client's name to open their detail page.

### The Client Detail Page

The detail page has three sections:

**Bookings** — A history of the client's bookings with date, service, amount, and a status dropdown. To change a booking's status, click the dropdown on that row and select the new status — it saves immediately. Use this to mark sessions as Completed after they occur, or Cancelled if they were not held.

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

**Client Preferences panel** — Shows everything the client filled in on their setup form: target roles, preferred locations, industries, salary range, remote preference, experience level, and any notes they left for you. Use this as your guide when finding jobs for them.

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

Click "Add Job." The job is saved and immediately assigned to this client.

### Job Match Status Meanings

Each job in the client's list shows a status badge. **Clients update their own statuses** from their dashboard — you do not change these. The statuses are:

| Status | Meaning |
|---|---|
| New | Just added, client hasn't interacted yet |
| Saved | Client bookmarked it |
| Interested | Client is actively interested |
| Applied | Client submitted an application |
| Interviewing | Client has interviews scheduled |
| Offer | Client received an offer |
| Not a Fit | Client decided to pass |
| Archived | Client dismissed it |

### The Weekly Job Alert Email

Every Monday at approximately 3 AM Central, the system automatically emails every active subscriber a digest of jobs added to their list in the past 7 days.

You do not need to do anything to trigger this. If you want a client's new matches to be included in that week's digest, add them before Sunday night.

Clients with no new matches that week do not receive an email.

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

All figures update automatically as bookings and payments come in. There is no need to refresh or recalculate anything.

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

The red number is how many you haven't read yet. Click the bell to see the latest 20 in a quick dropdown. Click any row to jump to that client or booking. Use "Mark all read" to clear the number. To see everything that ever came in, click the Notifications page in the left nav — it groups them by Today / Yesterday / This week / Older.

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

## 11. Known Limitations

**User roles:**
There is no button to make someone an admin or to downgrade an admin to a client. Any role changes require a developer to update the database directly.

---

## 12. Troubleshooting

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
