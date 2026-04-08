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
9. [Known Limitations](#9-known-limitations)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Logging In

**URL:** `https://thryvegrowth.co/admin`

Log in with your admin email and password. If you forget your password, go to `https://thryvegrowth.co/reset-password` and follow the email link.

**Getting admin access for the first time:** Sign up at `/signup` with your designated admin email address. Your account will automatically be set to admin on signup (the system is pre-configured to recognize your email). You do not need to do anything extra.

**If your login keeps failing:** Your account has a special "admin" role that must be attached to your specific email address. If you are being redirected away from the admin panel after logging in, contact your developer — they can verify your role is correctly set in the database.

Once logged in, you will always land at `/admin` unless you bookmarked a specific section.

---

## 2. The Dashboard Overview

The `/admin` page shows four stat cards at the top and a recent bookings table below.

**Stat cards:**

| Card | What it means |
|---|---|
| Total Clients | Everyone who has created an account on the site (excluding you) |
| Total Bookings | Every booking ever recorded, in any status |
| Confirmed | Bookings that have been paid and are scheduled |
| Pending | Bookings that exist but haven't been fully confirmed — this should usually be 0; if it's not, check the bookings section |

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

This is where you control what dates and times clients can book.

### Adding a Slot

Click "Add Slot" and fill in:

- **Date** — The date of the appointment
- **Start Time** — When the session starts (e.g., 10:00 AM)
- **End Time** — When it ends (e.g., 11:00 AM)
- **Service Type** — Optional. If you leave this blank, any service type can be booked into it. If you set it to a specific service (e.g., "Career & Leadership Coaching"), only clients booking that service will see it.

Click Save. The slot will appear immediately in the "Open Slots" list.

**Best practice:** Add slots at least one week in advance so clients can see and book them. The booking calendar only shows future dates that have open slots.

### Deleting a Slot

Click the delete (trash) icon next to any open slot. You can only delete slots that have **not yet been booked**. If a client has already claimed a slot, the slot is locked and cannot be deleted — the booking must be handled separately.

### What Happens When a Client Books

When a client books and pays:
1. The slot you created is automatically locked (no one else can book it)
2. The client receives a confirmation email
3. You receive an alert email with the client's name and service
4. The client is synced to your GoHighLevel CRM
5. The booking appears in your Upcoming Sessions list

You do not need to do anything manually when a booking comes in.

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

Every Monday at approximately 4 AM Eastern / 3 AM Central, the system automatically emails every active subscriber a digest of jobs added to their list in the past 7 days.

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

## 9. Known Limitations

**User roles:**
There is no button to make someone an admin or to downgrade an admin to a client. Any role changes require a developer to update the database directly.

---

## 10. Troubleshooting

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
