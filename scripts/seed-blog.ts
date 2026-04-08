/**
 * Seed script — creates 5 SEO-targeted blog posts for Thryve Growth Co.
 * Run with:  npx tsx --env-file=.env.local scripts/seed-blog.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── TipTap JSON helpers ────────────────────────────────────────────────────────

type Node = Record<string, unknown>;

const p = (...texts: (string | Node)[]): Node => ({
  type: "paragraph",
  content: texts.map((t) =>
    typeof t === "string" ? { type: "text", text: t } : t
  ),
});

const bold = (text: string): Node => ({
  type: "text",
  text,
  marks: [{ type: "bold" }],
});

const h2 = (text: string): Node => ({
  type: "heading",
  attrs: { level: 2 },
  content: [{ type: "text", text }],
});

const h3 = (text: string): Node => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
});

const ul = (...items: string[]): Node => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [p(item)],
  })),
});

const doc = (...nodes: Node[]): Node => ({ type: "doc", content: nodes });

// ── Posts ──────────────────────────────────────────────────────────────────────

const posts = [
  // ── 1. Behavioral Interview ────────────────────────────────────────────────
  {
    slug: "how-to-prepare-for-a-behavioral-interview",
    title: "How to Prepare for a Behavioral Interview: The STAR Method Explained",
    excerpt:
      "Behavioral interviews are now standard at nearly every company. Here's exactly how to use the STAR method to turn your real experience into confident, compelling answers.",
    content: doc(
      h2("Why Behavioral Interviews Are the New Standard"),
      p(
        "If you've interviewed recently, you've heard questions like \"Tell me about a time you handled a difficult situation\" or \"Describe a project where you had to lead through uncertainty.\" These aren't small talk — they're behavioral interview questions, and they're now the primary way hiring managers evaluate candidates."
      ),
      p(
        "The reason is straightforward: past behavior is the best predictor of future performance. When an interviewer asks you to describe a real situation, they're evaluating your judgment, communication, resilience, and leadership — not your ability to give polished textbook answers. The problem is that most people answer these questions poorly. They're either too vague or too rambling. The STAR method fixes both."
      ),
      h2("What Is the STAR Method?"),
      p(
        "STAR stands for Situation, Task, Action, and Result. It's a framework for structuring behavioral answers in a way that's clear, specific, and memorable."
      ),
      p(bold("Situation"), " — Set the context briefly. What was happening? When did this take place? Keep this to one or two sentences."),
      p(bold("Task"), " — What was your specific responsibility or challenge? What were you asked to do, and why did it matter?"),
      p(bold("Action"), " — This is the most important part. Walk through the specific steps you took. Use \"I\" not \"we\" — interviewers want to know what you personally did, not what the team did."),
      p(bold("Result"), " — What was the outcome? Quantify it wherever possible: \"increased response time by 30%\", \"closed 3 enterprise accounts in 60 days\", \"reduced turnover by 18%\". Numbers make stories credible and memorable."),
      h2("The Questions You're Almost Guaranteed to Face"),
      p("Prepare a specific story for each of these before any interview:"),
      ul(
        "Tell me about a time you had to deal with a difficult coworker or client",
        "Describe a situation where you failed and what you learned from it",
        "Tell me about a time you had to lead without formal authority",
        "Give an example of when you had to meet a tight deadline under pressure",
        "Describe a time you had to persuade someone to change their mind",
        "Tell me about a time you took initiative beyond your job description",
        "Give an example of when you had to adapt quickly to a significant change"
      ),
      h2("How to Build Your Story Inventory"),
      p(
        "Start with a story inventory. Think back over the last three to five years and list eight to ten situations where you made a real impact, solved a problem, navigated conflict, or led through difficulty. Write each one out using the STAR structure."
      ),
      p("Strong stories typically come from:"),
      ul(
        "Projects where you drove a measurable business outcome",
        "Moments where something went wrong and you course-corrected",
        "Times you influenced people outside your direct team or authority",
        "Situations where you had competing priorities and made a judgment call",
        "Experiences where you coached, mentored, or developed someone else"
      ),
      p(
        "Once you have your stories written, practice telling them out loud — not in your head. You'll quickly discover where you're losing the thread, where you need more specificity, and where you're accidentally burying the most impressive parts."
      ),
      h2("The Three Mistakes That Cost Candidates the Role"),
      p(
        "The most common mistake is answering with \"we\" instead of \"I.\" Interviewers understand you didn't do everything alone — but they're evaluating your individual contribution. If every sentence is \"we decided\" and \"we implemented,\" they can't assess what you actually did."
      ),
      p(
        "The second mistake is no clear result. Candidates often describe the situation and their actions, then trail off without stating the outcome. If the result was positive, say it clearly and quantify it. If the outcome was mixed, own that — and explain what you'd do differently."
      ),
      p(
        "The third mistake is choosing the wrong story. Don't reach back ten years for an example if you have something recent. Don't choose situations where you had a minor role. Pick stories where you had real ownership and real stakes."
      ),
      h2("Preparation Is the Competitive Advantage"),
      p(
        "Behavioral interviews reward preparation. A candidate with slightly less experience but well-structured, specific stories will consistently outperform someone who's winging it. The investment of two or three hours building and practicing your story bank will pay off in almost every interview you take."
      ),
      p(
        "If you're preparing for a high-stakes interview and want to go deeper — working through your stories, identifying gaps, and doing live practice — that's exactly what interview coaching is designed for. The goal is to walk into that room feeling genuinely ready."
      )
    ),
  },

  // ── 2. Resume Mistakes ─────────────────────────────────────────────────────
  {
    slug: "resume-mistakes-costing-you-job-offers",
    title: "7 Resume Mistakes That Are Costing You Job Offers",
    excerpt:
      "Most resumes are eliminated before a human ever reads them. Here are the seven most common mistakes — and exactly what to do instead.",
    content: doc(
      h2("The 10-Second Reality"),
      p(
        "Recruiters spend an average of seven to ten seconds on a first pass of your resume. Before they've read a single bullet point, they've already made a judgment about the layout, density, and clarity of the page. If anything feels off, the resume goes in the pile."
      ),
      p(
        "This isn't about being superficial — it's about signal processing. A recruiter reviewing 200 applications in a week needs to quickly identify the candidates most likely to fit the role. Your resume is your first communication, and if it's hard to read, unclear, or missing the right signals, the conversation ends before it starts."
      ),
      h3("Mistake 1: Listing Duties Instead of Accomplishments"),
      p(
        "The most common resume mistake is describing what your job was instead of what you achieved. \"Managed a team of four\" tells a hiring manager nothing. \"Led a team of four that delivered a platform migration three weeks ahead of schedule and under budget\" tells them you deliver."
      ),
      p(
        "For every bullet point, ask yourself: so what? What did this result in? Can I add a number, a timeframe, or a comparative improvement? Even qualitative wins can be made concrete: \"Redesigned the onboarding process, cutting time-to-productivity for new hires from six weeks to three.\""
      ),
      h3("Mistake 2: A Generic Summary Statement"),
      p(
        "The \"Highly motivated professional with 10+ years of experience seeking a challenging role\" summary needs to go. It says nothing, differentiates you from no one, and wastes your most valuable real estate."
      ),
      p(
        "Replace it with two to three specific sentences: your area of expertise, the type of impact you create, and what kind of environment you thrive in. Think of it as your professional positioning statement — clear, confident, and directed at your target role."
      ),
      h3("Mistake 3: Ignoring ATS Optimization"),
      p(
        "Most mid-to-large companies use Applicant Tracking Systems to screen resumes before a human sees them. If your resume doesn't include keywords from the job posting, you'll be filtered out automatically — before anyone reads a word you've written."
      ),
      p(
        "Read each job description carefully and mirror the language intentionally. If they say \"cross-functional stakeholder management,\" use that phrase — not \"working with different teams.\" Don't stuff keywords randomly; integrate them naturally into your accomplishments."
      ),
      h3("Mistake 4: Formatting That Breaks ATS Parsing"),
      p(
        "Fancy graphics, two-column layouts, embedded tables, and unusual fonts look impressive in design software — and all break when parsed by ATS software. Stick to a clean single-column layout, standard fonts (Calibri, Garamond, Georgia), and consistent, simple formatting."
      ),
      p(
        "White space is your friend. Bullet points should be scannable in seconds. Headers should be clear and standard. If your resume is hard to read in ten seconds, it won't get read for longer."
      ),
      h3("Mistake 5: Including Irrelevant Experience"),
      p(
        "A 20-year career does not require a four-page resume. Hiring managers for your target role don't need to read about jobs from 15 years ago that are unrelated to where you're heading. Lead with relevance."
      ),
      p(
        "If you're making a career transition, be strategic: highlight transferable skills and accomplishments, even if the titles were in a different field. A retail manager moving into operations has real logistics, team leadership, and performance management experience — the resume should frame it exactly that way."
      ),
      h3("Mistake 6: Sending One Resume Everywhere"),
      p(
        "Sending the same resume to 100 jobs is almost always less effective than sending tailored versions to 20 roles that genuinely fit your background. Each application should adjust the summary, the most prominent accomplishments, and the keywords to reflect the specific job description."
      ),
      p(
        "This doesn't mean rewriting from scratch each time. Keep a master resume with all your accomplishments and context. For each application, select and reorder the most relevant pieces."
      ),
      h3("Mistake 7: Typos and Inconsistencies"),
      p(
        "Nothing undermines a strong professional brand faster than a misspelled company name, an inconsistent date format, or a sentence that cuts off mid-thought. Proofread carefully — read the resume backwards, sentence by sentence, to catch errors your eye would otherwise skip."
      ),
      p(
        "Have at least one other person review it before you send it anywhere. Fresh eyes catch what yours have stopped seeing."
      ),
      h2("The Resume Gets You the Conversation"),
      p(
        "A strong resume doesn't get you the job — it gets you the interview. Once you're in the room, your preparation and ability to articulate your impact are what close the deal. But the resume has to open the door first."
      ),
      p(
        "If your resume isn't generating responses, a professional review can identify exactly what's holding it back — whether it needs a targeted refresh or a full rewrite. Getting outside eyes on it is one of the highest-return investments in a job search."
      )
    ),
  },

  // ── 3. Career Change ──────────────────────────────────────────────────────
  {
    slug: "how-to-change-careers-without-starting-over",
    title: "How to Change Careers Without Starting Over",
    excerpt:
      "A career change doesn't mean erasing everything you've built. Here's how to identify your transferable skills, position your experience for a new field, and make a strategic transition.",
    content: doc(
      h2("The Career Change Paradox"),
      p(
        "Most people who want to change careers talk themselves out of it for one reason: they feel like they'd be starting over. They've spent years building expertise, seniority, and salary — and the idea of walking into a new field as a beginner feels like losing everything."
      ),
      p(
        "But that framing is almost always wrong. A true \"starting over\" scenario is rare. What most career changers actually have is a highly portable set of skills, experiences, and judgment that translate directly — if they learn how to position them correctly. The challenge isn't starting over. It's learning a new language to describe what you already know."
      ),
      h2("Start With a Transferable Skills Audit"),
      p(
        "Before you do anything else, take stock of what you actually bring to the table. Transferable skills are capabilities that hold value across industries and roles: communication, analytical thinking, project management, leadership, client relationship management, problem-solving, and the ability to influence without authority."
      ),
      p("Ask yourself:"),
      ul(
        "What do people consistently come to me for, regardless of my job title?",
        "Which of my accomplishments would still be impressive in a completely different context?",
        "What have I learned about how organizations work, how people behave, or how decisions get made?",
        "What specific problems have I solved, and how replicable is that capability?"
      ),
      p(
        "The answers reveal your true professional asset base — which is almost always richer than the job description on your resume suggests."
      ),
      h2("Research the Target Field Before You Commit"),
      p(
        "One of the most common career change mistakes is making a decision based on how a field looks from the outside. A role can seem appealing in the abstract and exhausting in practice, or vice versa. Before you invest serious time and money into a transition, do the research."
      ),
      p(
        "Informational interviews are the most efficient tool here. Find people doing the work you're interested in — through LinkedIn, alumni networks, or professional associations — and ask for 20 minutes to ask questions. Not for a job; for perspective. Most people are generous with their time when the ask is genuine and specific."
      ),
      p("What you're trying to learn:"),
      ul(
        "What does a typical week actually look like in this role?",
        "What backgrounds do people come from who are successful here?",
        "What's hard about this work that isn't obvious from the outside?",
        "What credentials or experiences would make a career changer stand out?"
      ),
      h2("Build a Bridge, Not a Leap"),
      p(
        "The most successful career changes aren't dramatic leaps — they're strategic bridges. Instead of quitting your current role and starting from scratch, look for ways to build credibility in your target field while you're still employed."
      ),
      p("This might look like:"),
      ul(
        "Volunteering for cross-functional projects that expose you to the target area",
        "Taking on adjacent responsibilities in your current role that build relevant skills",
        "Getting a certification or completing relevant coursework (selectively — not everything needs a credential)",
        "Freelancing, consulting, or advising in the new space before committing full-time",
        "Joining professional associations or communities in the target field to build your network and credibility before you need it"
      ),
      h2("Reframe Your Resume Around the New Direction"),
      p(
        "Your resume for a career change needs to do something different than a traditional resume: it needs to make your previous experience legible in a new context. That means leading with a strong summary that positions you for the target role, not the one you're leaving."
      ),
      p(
        "It also means being selective about what you feature. You don't need to include everything you've ever done — you need to include the things that are most relevant to where you're going. A strong career change resume tells a coherent story about why your background, despite being in a different field, makes you a compelling candidate for this specific role."
      ),
      h2("Manage the Timeline Honestly"),
      p(
        "Career transitions take longer than most people expect. The research phase, the networking, the skill-building, the resume repositioning, and the job search itself all take time — and they overlap. A realistic timeline for a significant career change is often 6 to 18 months."
      ),
      p(
        "That's not a reason to delay — it's a reason to start. The biggest cost of a career change is usually not the transition itself but the years people spend in the wrong role before deciding to move."
      ),
      h2("You Don't Have to Figure It Out Alone"),
      p(
        "Career transitions are complex enough that having a thinking partner makes a meaningful difference. A career coach can help you clarify what you actually want, identify the most strategic path given your specific background, and hold you accountable to moving forward — even when the process gets discouraging."
      ),
      p(
        "If you're at the point where you know something needs to change but aren't sure exactly what or how, a coaching conversation is often the fastest way to cut through the noise and build a real plan."
      )
    ),
  },

  // ── 4. Company Culture ────────────────────────────────────────────────────
  {
    slug: "what-strong-company-culture-actually-looks-like",
    title: "What Strong Company Culture Actually Looks Like (And Why It Matters More Than You Think)",
    excerpt:
      "Culture isn't a ping-pong table or a free lunch. It's how decisions get made when no one's watching. Here's what distinguishes high-performing cultures — and how leaders build them intentionally.",
    content: doc(
      h2("The Misunderstanding About Culture"),
      p(
        "Most conversations about company culture focus on the wrong things: office perks, team events, mission statements on the wall. These aren't meaningless, but they're not culture — they're decoration. Culture is what actually happens when a manager has to choose between hitting a number and treating an employee fairly. It's how conflict gets handled, who gets credit, and what behaviors are rewarded versus tolerated."
      ),
      p(
        "Culture is the operating system of your organization. It runs in the background, shaping every decision, interaction, and outcome — whether you've defined it intentionally or not. The question isn't whether your organization has a culture. It's whether the culture you have is the one you want."
      ),
      h2("What High-Performing Cultures Have in Common"),
      p(
        "After years of working with organizations across industries, a few patterns emerge consistently in teams and companies with strong cultures."
      ),
      h3("Psychological Safety"),
      p(
        "In high-performing cultures, people feel safe raising concerns, challenging decisions, and admitting mistakes without fear of retaliation. This doesn't mean everyone agrees on everything — it means disagreement happens openly and respectfully, rather than in hallway conversations after the meeting."
      ),
      p(
        "Google's Project Aristotle, which studied hundreds of internal teams, found that psychological safety was the single strongest predictor of team performance. It matters more than the individual talent of team members."
      ),
      h3("Clarity Over Comfort"),
      p(
        "Strong cultures prioritize clarity: clear expectations, clear feedback, clear accountability. Leaders in these organizations say hard things directly rather than letting performance issues linger or letting ambiguity fester. People know where they stand, what's expected, and what success looks like."
      ),
      h3("Consistent Recognition"),
      p(
        "In cultures where people feel valued, recognition isn't reserved for big wins. Managers notice and acknowledge effort, progress, and everyday contributions — not just outcomes. This is more than a morale booster: consistent recognition reinforces the specific behaviors and values the organization wants more of."
      ),
      h3("Leaders Who Model the Culture"),
      p(
        "Culture travels from the top down, whether intentionally or not. If leadership espouses one set of values but behaves differently under pressure, employees read the behavior — not the poster. The most powerful thing a leader can do for culture is to visibly live it, especially in difficult moments."
      ),
      h2("Signs Your Culture May Be Eroding"),
      p("Culture problems rarely announce themselves. They show up as symptoms:"),
      ul(
        "High turnover, especially among high performers",
        "Managers who avoid giving direct feedback",
        "Decisions made by a small inner circle with low transparency",
        "Consistent miscommunication across teams",
        "Employees who \"quiet quit\" — showing up but checking out",
        "A gap between what's said in all-hands meetings and what people say in private"
      ),
      p(
        "These signals are worth taking seriously early. Culture problems compound over time — and they're significantly harder and more expensive to fix after they've become embedded."
      ),
      h2("Building Culture Intentionally"),
      p(
        "Culture change doesn't happen through a new set of values on a slide deck. It happens through sustained behavioral change by leaders, reinforced by systems and processes that reward the right things."
      ),
      p("The levers that actually move culture:"),
      ul(
        "Hiring and onboarding — the values and behaviors you select for determine what the culture becomes",
        "Performance management — what you measure, reward, and tolerate",
        "Manager training — most culture lives at the manager level, not the executive level",
        "Communication norms — how information flows, who's included, and how decisions are explained",
        "How failure is handled — organizations that punish failure become risk-averse and stagnant"
      ),
      h2("Culture Is a Business Strategy"),
      p(
        "Organizations with strong cultures outperform their peers on nearly every metric that matters: retention, productivity, innovation, customer satisfaction, and financial performance. This isn't correlation — it's the result of environments where people can do their best work."
      ),
      p(
        "Building that environment is leadership work. It requires honesty about where the gaps are, clarity about what you're trying to build, and the willingness to hold yourself and others accountable to it over time."
      ),
      p(
        "If you're working through culture or engagement challenges in your organization and want a structured, outside perspective, that's the kind of work we do at Thryve Growth Co. — from diagnostics to implementation support."
      )
    ),
  },

  // ── 5. Job Search ─────────────────────────────────────────────────────────
  {
    slug: "job-search-strategies-that-actually-work",
    title: "The Job Search Has Changed — Here's What Actually Works",
    excerpt:
      "Cold-applying to job boards has roughly a 2% success rate. Here's the strategy experienced professionals use to find roles that aren't always posted — and land them faster.",
    content: doc(
      h2("Why the Old Job Search Playbook Doesn't Work Anymore"),
      p(
        "The job search most people learned — find a posting, submit a resume, wait for a callback — has always been inefficient. But in today's market, it's become almost irrelevant. A single corporate job posting can receive 200 to 500 applications within 72 hours. Applicant tracking systems filter out 75% before a human sees them. The candidates who get interviews are rarely the most qualified; they're the ones who got there through a different channel."
      ),
      p(
        "This isn't a reason to despair. It's a reason to change your approach. The professionals who find great roles — often faster than expected — are doing something fundamentally different from what most job seekers do."
      ),
      h2("The Hidden Job Market Is Real"),
      p(
        "Studies consistently find that 70-80% of jobs are filled without ever being publicly posted. They're filled through referrals, internal promotions, recruiter outreach, or direct approaches — before a company ever decides to open a public requisition. If your entire search is on job boards, you're fishing in 20% of the pond."
      ),
      p(
        "The hidden job market isn't a conspiracy. It's simply how companies prefer to hire when they can: through trusted networks, warm introductions, and people who come recommended. Your strategy needs to account for this."
      ),
      h2("Build Your Network Before You Need It"),
      p(
        "The most important principle in job searching: the best time to build your network is before you're looking. Relationships built under the pressure of a job search feel transactional because they are. Relationships built over time, without an ask attached, are what actually open doors."
      ),
      p("Practically, this means:"),
      ul(
        "Staying in touch with former colleagues and managers — even a brief message once a year maintains the connection",
        "Engaging genuinely with your LinkedIn network, not just posting or liking, but commenting and reaching out",
        "Attending industry events or professional associations not to collect business cards but to have real conversations",
        "Being a resource for others: sharing useful information, making introductions, offering your perspective when someone asks"
      ),
      p(
        "When you do need to search, these relationships become the infrastructure that makes everything else work."
      ),
      h2("Use LinkedIn Like a Professional, Not Like a Job Seeker"),
      p(
        "Your LinkedIn profile is often the first thing a recruiter or hiring manager sees. It needs to do two things: clearly communicate who you are and what value you bring, and signal that you're worth a conversation."
      ),
      p("High-impact LinkedIn actions:"),
      ul(
        "Optimize your headline beyond your job title — describe the impact you create, not just the role you hold",
        "Write an About section that tells a story about your professional direction and strengths",
        "List specific accomplishments under each role, not just responsibilities",
        "Turn on the Open to Work setting privately (visible to recruiters only) if you're actively looking",
        "Post or share content in your area of expertise — visibility signals credibility"
      ),
      h2("Informational Interviews Are the Highest-Leverage Activity"),
      p(
        "An informational interview is a conversation with someone in a role, company, or industry you're interested in — not to ask for a job, but to learn and build a connection. When done well, these conversations often lead directly to referrals, opportunities, or insider knowledge that changes how you approach your search."
      ),
      p(
        "The ask is simple: \"I'm exploring my next move in [area], and your background in [specific thing] seems really relevant. Would you be open to a 20-minute conversation? I have some specific questions and I promise to respect your time.\""
      ),
      p(
        "Most people say yes. After the call, follow up with a thank-you, stay in touch, and look for ways to be genuinely useful to them. You're building a relationship, not mining a contact."
      ),
      h2("Be Strategic About Where You Apply"),
      p(
        "When you do apply to posted roles, be strategic. Don't spray and pray. Identify 15 to 25 companies you genuinely want to work for, research them deeply, and pursue them with tailored materials and warm approaches wherever possible."
      ),
      p("For each target company:"),
      ul(
        "Find a connection at the company — even a second-degree LinkedIn connection — who can provide context or a referral",
        "Tailor your resume and cover letter specifically to the role and company, not from a template",
        "Apply promptly — applications submitted within the first 48 hours of a posting have significantly higher callback rates",
        "Follow up once, professionally, five to seven days after applying if you haven't heard anything"
      ),
      h2("Track Everything"),
      p(
        "A serious job search generates a lot of moving pieces: companies you've researched, people you've contacted, applications submitted, conversations scheduled, follow-ups owed. Without a tracking system, things fall through the cracks and momentum dies."
      ),
      p(
        "A simple spreadsheet works. Track the company, role, date applied, contact name, current status, and next action. Review it weekly. A job search is a project — treat it like one."
      ),
      h2("Getting Support for the Search"),
      p(
        "A job search is one of the most stressful professional experiences there is. The uncertainty, the rejection, the self-doubt — it's genuinely hard, even for accomplished professionals. Having support makes a measurable difference."
      ),
      p(
        "Whether that's a career coach helping you clarify your direction and positioning, a professional to review and strengthen your materials, or simply accountability and a thinking partner for the process — investing in your search infrastructure pays dividends in both speed and outcomes."
      )
    ),
  },
];

// ── Seed ───────────────────────────────────────────────────────────────────────

async function getAdminUserId(): Promise<string> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .single();
  if (error || !data) throw new Error(`Admin user not found: ${error?.message}`);
  return data.id;
}

async function main() {
  console.log("Connecting to Supabase…");
  const authorId = await getAdminUserId();
  console.log(`Found admin user: ${authorId}\n`);

  for (const post of posts) {
    // Skip if slug already exists
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("slug", post.slug)
      .maybeSingle();

    if (existing) {
      console.log(`⚠  Skipped (already exists): ${post.title}`);
      continue;
    }

    const { error } = await supabase.from("blog_posts").insert({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      published: true,
      published_at: new Date().toISOString(),
      author_id: authorId,
    });

    if (error) {
      console.error(`✗  Failed: ${post.title}\n   ${error.message}`);
    } else {
      console.log(`✓  Created: ${post.title}`);
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
