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

### How do I send someone a few times to choose from?
The quickest way: on your **Overview** (admin home) page, click the **"Invite a client to book"** button in the "Book a client in" box at the top. You can also get there from **Invite to Book → New invitation** in the sidebar, or the **Create booking invitation** button on a client's page. Pick the dates and times, choose the meeting type, and send. The client gets an email, picks one, and the session is created automatically — added to your Google Calendar and confirmed by email. See **Booking Flow Diagrams** for the full picture. (If a yellow "Google Calendar isn't connected" note appears on the Invite to Book page, connect it under Integrations so sessions land on your calendar.)

### How do I reschedule or cancel a session?
Open the client's record, find the booking, and click **Manage**. From there you can **Reschedule** (this moves the calendar event and re-sends the client a confirmation) or **Cancel session** (this removes the calendar event).

### Can clients reschedule or cancel their own sessions?
Yes — but only when the session is **more than 24 hours away**. On their dashboard, a client can open one of their sessions and reschedule it to another time or cancel it. Inside 24 hours the buttons stop working and they're told to reply to your email so you can help. Either way, you get a notification (email and bell) when a client changes a session. If the cancelled session was part of a package, the credit goes back automatically so they can rebook it.

### What are session packages and credits?
Two services are sold as multi-session bundles: the **4-Session Coaching Plan** and the **3-Session Interview Prep Package**. When a client buys one, they're given that many **credits** instead of being asked to schedule everything up front. They redeem one credit at a time from their dashboard to book each session — no extra payment, because the package already covers it. You'll see those sessions appear like any other booking.

### A client cancelled a package session — did they lose that credit?
No. When a session that came from a package is cancelled, the credit is automatically returned to the package so the client can book another time. If their package had been used up, it becomes active again.

### A client paid but there's no session — what happened?
This is rare and handled for you. If the time a client chose got taken in the moments between paying and confirming, the system **automatically refunds the payment** and sends you an alert so you can offer new times. No client is ever charged without getting a session.

### What does "Meet link needed" mean?
It means the system couldn't automatically create the Google Meet link for that session — usually because the Google Calendar connection needs attention. Reconnect it under **Integrations**, or add a meeting link manually. The session itself is fine; only the auto-generated link is missing.

### How do reminders work? Can I send one manually?
Clients automatically get a reminder **24 hours** and **1 hour** before each session, and you get a prep summary about **2 hours** before. To send a reminder right now, use **Send reminder** on the session (in the **Manage** panel or the **Upcoming sessions** widget on your dashboard).

### How do I change what an automated email says?
Edit it in **Templates**. The **Email Reference** page lists every email and which template to edit.

### How do I take time off so clients can't book me?
Use **blackout dates** in your availability settings (see the Admin Guide, "Managing Your Availability"). Booked times stay; new bookings are blocked on those dates.

### What's the difference between a "booking invitation" and the public Book page?
The public **Book** page is where anyone can buy and self-schedule. A **booking invitation** is you personally offering a specific client a few hand-picked times — perfect for returning clients or anyone you're scheduling directly.

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

### I added a featured image before and it kept disappearing. Is that fixed?
Yes. Featured images previously looked like they'd been added but weren't actually being saved with the post, so they'd vanish when the page reloaded. They now save properly. If you have older posts where you tried to add a header image, open each one and pick the image again — it'll stick this time.

### I added a link to my newsletter but the email arrived without it. Why?
The text was carrying link *styling* but no actual web address, so it went out as plain, unclickable words. This usually happens when content is pasted in from a Google Doc or another email, which brings the underline along without the address behind it.

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
| See business insights and download CSVs | **Analytics** |
| Edit an automated email | **Templates** |
| Turn an email on/off | **Settings** |
| Reconnect Google Calendar | **Integrations** |
| Set my weekly availability / time off | **Bookings** (availability) |
| Read these guides | **Help** |
