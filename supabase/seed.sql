-- ─────────────────────────────────────────────────────────────────────────────
-- Bloom CRM — Personalized Seed Data for Ella Webster
-- Run this in Supabase SQL Editor after running schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Contacts ────────────────────────────────────────────────────────────────

INSERT INTO contacts (id, name, email, phone, company, tags, notes, avatar_color, created_at, updated_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Reed Webster', 'reed@example.com', NULL, NULL, ARRAY['family', 'personal'], 'My husband. Supportive, always helping me with tech things.', '#e8829a', now() - interval '90 days', now() - interval '90 days'),
  ('c1000000-0000-0000-0000-000000000002', 'Dr. Sarah Kim', 'skim@uvsc.edu', NULL, 'UVU', ARRAY['professor', 'academics', 'psychology'], 'Research Methods professor. Very approachable — good to email with questions about Pearson correlation and frequency claims.', '#9b59b6', now() - interval '60 days', now() - interval '60 days'),
  ('c1000000-0000-0000-0000-000000000003', 'Li Wei', NULL, NULL, NULL, ARRAY['language', 'chinese', 'study-buddy'], 'Chinese conversation partner. We meet via Zoom on Thursdays. Native Mandarin speaker.', '#3498db', now() - interval '45 days', now() - interval '45 days'),
  ('c1000000-0000-0000-0000-000000000004', 'Coach Davis', NULL, NULL, 'Orem Youth Soccer League', ARRAY['coaching', 'sports', 'soccer'], 'Head coordinator for the youth soccer league. Good contact for ebook research and field time.', '#27ae60', now() - interval '30 days', now() - interval '30 days'),
  ('c1000000-0000-0000-0000-000000000005', 'Mom', NULL, NULL, NULL, ARRAY['family', 'personal'], 'Call on Sundays. She loves hearing about school.', '#f39c12', now() - interval '90 days', now() - interval '90 days');

-- ─── Habits ──────────────────────────────────────────────────────────────────

INSERT INTO habits (id, name, description, color, icon, order_index, created_at) VALUES
  ('h1000000-0000-0000-0000-000000000001', 'Daily Studying', 'At least 45 min of coursework or reading each day', '#e8829a', 'GraduationCap', 1, now() - interval '60 days'),
  ('h1000000-0000-0000-0000-000000000002', 'Chinese Practice', '15 min of Mandarin — vocab, characters, or conversation', '#3498db', 'Languages', 2, now() - interval '60 days'),
  ('h1000000-0000-0000-0000-000000000003', 'Writing Practice', 'Work on the youth coaching ebook series or freewrite', '#9b59b6', 'PenLine', 3, now() - interval '60 days'),
  ('h1000000-0000-0000-0000-000000000004', 'Exercise', 'Walk, stretch, or any intentional movement', '#27ae60', 'Activity', 4, now() - interval '60 days'),
  ('h1000000-0000-0000-0000-000000000005', 'Read for Pleasure', 'Fiction, poetry, or anything non-academic', '#f39c12', 'BookOpen', 5, now() - interval '60 days');

-- Habit completions — last 14 days of realistic streaks
-- Daily Studying (strong streak)
INSERT INTO habit_completions (id, habit_id, completed_date) VALUES
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 13)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 12)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 11)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 10)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 9)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 7)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 6)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 5)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 4)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 3)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 2)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000001', (current_date - 1)::text);

-- Chinese Practice (good but misses weekends sometimes)
INSERT INTO habit_completions (id, habit_id, completed_date) VALUES
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 12)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 11)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 10)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 8)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 7)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 5)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 4)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 3)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000002', (current_date - 2)::text);

-- Writing Practice (a few times a week)
INSERT INTO habit_completions (id, habit_id, completed_date) VALUES
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 11)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 9)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 8)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 6)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 4)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 2)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000003', (current_date - 1)::text);

-- Exercise (sporadic but improving)
INSERT INTO habit_completions (id, habit_id, completed_date) VALUES
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 12)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 9)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 6)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 5)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 3)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000004', (current_date - 1)::text);

-- Read for Pleasure (weekends + occasional evening)
INSERT INTO habit_completions (id, habit_id, completed_date) VALUES
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000005', (current_date - 13)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000005', (current_date - 10)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000005', (current_date - 8)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000005', (current_date - 5)::text),
  (gen_random_uuid(), 'h1000000-0000-0000-0000-000000000005', (current_date - 3)::text);

-- ─── Todos ───────────────────────────────────────────────────────────────────

INSERT INTO todos (id, title, description, priority, due_date, completed, tags, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Finish Research Methods reading (Ch. 5)', 'Read chapter on frequency claims and association claims. Note key vocab.', 'high', (current_date + 2)::text, false, ARRAY['academics', 'research-methods'], now() - interval '2 days', now() - interval '2 days'),
  (gen_random_uuid(), 'Write Soccer Coaching chapter outline', 'Draft the section structure for Book 1: Soccer. Include age-specific drill ideas for 6–8 and 9–12 age groups.', 'high', (current_date + 4)::text, false, ARRAY['ebook', 'writing', 'soccer'], now() - interval '3 days', now() - interval '3 days'),
  (gen_random_uuid(), 'Submit Stats homework', 'Complete the Pearson correlation practice problems from the worksheet.', 'high', (current_date + 1)::text, false, ARRAY['academics', 'stats'], now() - interval '1 day', now() - interval '1 day'),
  (gen_random_uuid(), 'Water and repot Bird of Paradise', 'Check soil moisture. If roots are crowded, repot into 2-inch larger pot.', 'low', (current_date + 5)::text, false, ARRAY['home', 'plants'], now() - interval '4 days', now() - interval '4 days'),
  (gen_random_uuid(), 'Practice Chinese characters (lesson 7)', 'Flashcard review + write each character 5 times in notebook.', 'medium', (current_date + 1)::text, false, ARRAY['chinese', 'language'], now() - interval '1 day', now() - interval '1 day'),
  (gen_random_uuid(), 'Email Dr. Kim about paper topic', 'Ask about whether the Joseph Smith First Vision accounts can serve as a primary source for a philosophy paper.', 'medium', (current_date + 3)::text, false, ARRAY['academics', 'professor', 'email'], now() - interval '2 days', now() - interval '2 days'),
  (gen_random_uuid(), 'Plan ebook visual drill diagrams', 'Sketch out court/field diagrams for basketball and soccer drills. Can use Canva.', 'medium', (current_date + 7)::text, false, ARRAY['ebook', 'design', 'writing'], now() - interval '5 days', now() - interval '5 days'),
  (gen_random_uuid(), 'Try air fryer chicken wings recipe', 'Use the garlic parmesan sauce variation. Check time at 375°F.', 'low', (current_date + 3)::text, false, ARRAY['cooking', 'personal'], now() - interval '3 days', now() - interval '3 days'),
  (gen_random_uuid(), 'Listen to new Noah Kahan album', 'Add favorites to Bloom playlist. Great study background music.', 'low', (current_date + 14)::text, false, ARRAY['music', 'personal'], now() - interval '7 days', now() - interval '7 days'),
  (gen_random_uuid(), 'Research youth sports coaching resources online', 'Find 3 peer-reviewed or reputable sources to cite in the ebook intro.', 'medium', (current_date + 6)::text, false, ARRAY['ebook', 'research'], now() - interval '5 days', now() - interval '5 days');

-- ─── Goals ───────────────────────────────────────────────────────────────────

INSERT INTO goals (id, title, description, category, progress, target_date, color, created_at, milestones) VALUES
  ('g1000000-0000-0000-0000-000000000001', 'Complete Youth Coaching eBook Series', 'Write and publish 4 coaching guides (soccer, basketball, baseball + a general intro) with visual drills and age-appropriate strategies.', 'Writing', 25, (current_date + 90)::text, '#9b59b6', now() - interval '30 days', '[]'::jsonb),
  ('g1000000-0000-0000-0000-000000000002', 'Build Conversational Mandarin', 'Be able to hold a 10-minute conversation in Chinese by the end of the semester.', 'Language', 20, (current_date + 120)::text, '#3498db', now() - interval '60 days', '[]'::jsonb),
  ('g1000000-0000-0000-0000-000000000003', 'Finish Semester with 3.7+ GPA', 'Focus on Research Methods, Stats, and Literature. Stay on top of assignments and reach out to professors early.', 'Academics', 40, (current_date + 75)::text, '#e8829a', now() - interval '45 days', '[]'::jsonb),
  ('g1000000-0000-0000-0000-000000000004', 'Daily Habit Streak of 30 Days', 'Build a consistent 30-day streak for studying and Chinese practice.', 'Health', 45, (current_date + 30)::text, '#27ae60', now() - interval '20 days', '[]'::jsonb),
  ('g1000000-0000-0000-0000-000000000005', 'Improve Written English', 'Practice freewriting 3x/week. Focus on clear, structured paragraphs and academic vocabulary.', 'Writing', 30, (current_date + 60)::text, '#f39c12', now() - interval '30 days', '[]'::jsonb);

-- Milestones for eBook goal
INSERT INTO milestones (id, goal_id, title, completed, order_index) VALUES
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Outline all 4 book structures', false, 1),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Write Soccer coaching book (Book 1)', false, 2),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Write Basketball coaching book (Book 2)', false, 3),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Write Baseball coaching book (Book 3)', false, 4),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Design visual drill diagrams', false, 5),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000001', 'Final edit and format for publishing', false, 6);

-- Milestones for Chinese goal
INSERT INTO milestones (id, goal_id, title, completed, order_index) VALUES
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000002', 'Complete lessons 1–10 (basics)', true, 1),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000002', 'Memorize 150 common characters', false, 2),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000002', 'First 10-min conversation with Li Wei', false, 3),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000002', 'Watch a Chinese show without subtitles for 5 min', false, 4);

-- Milestones for GPA goal
INSERT INTO milestones (id, goal_id, title, completed, order_index) VALUES
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000003', 'Submit all week 1–4 assignments', true, 1),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000003', 'Score 85%+ on midterm exams', false, 2),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000003', 'Submit research paper draft', false, 3),
  (gen_random_uuid(), 'g1000000-0000-0000-0000-000000000003', 'Final exams week', false, 4);

-- ─── Notes ───────────────────────────────────────────────────────────────────

INSERT INTO notes (id, title, content, tags, pinned, created_at, updated_at) VALUES
  (gen_random_uuid(), 'Research Methods — Key Concepts', '# Research Methods Notes

## Types of Claims (Ch. 4–5)
- **Frequency claims**: describe how often something occurs in a population
- **Association claims**: describe a relationship between two variables
- **Causal claims**: argue that one variable *causes* another

## Pearson Correlation (r)
- Measures linear relationship between two variables
- Range: –1.0 to +1.0
- r = 0 → no relationship; r = 1 → perfect positive; r = –1 → perfect negative
- **Comorbidity**: when two conditions appear together more often than chance (common in psychology)

## Empiricism
- Knowledge is derived from observation and experience, not pure reason
- Foundation of all scientific research methods

## Hypotheses
- Null hypothesis (H₀): no effect or relationship
- Alternative hypothesis (H₁): predicted effect exists
- Must be falsifiable to be scientific', ARRAY['academics', 'research-methods', 'psychology', 'stats'], true, now() - interval '14 days', now() - interval '3 days'),

  (gen_random_uuid(), 'Chinese Vocabulary — Lesson 7', '# 中文词汇 — Lesson 7

| Chinese | Pinyin | English |
|---------|--------|---------|
| 学习 | xuéxí | to study / learn |
| 每天 | měitiān | every day |
| 我喜欢 | wǒ xǐhuān | I like |
| 今天 | jīntiān | today |
| 明天 | míngtiān | tomorrow |
| 朋友 | péngyǒu | friend |
| 作业 | zuòyè | homework |
| 书 | shū | book |

## Phrases to practice:
- 我每天学习中文。 (I study Chinese every day.)
- 今天我很忙。 (I am very busy today.)
- 你喜欢什么？ (What do you like?)

**Next: Lesson 8 — directions and locations**', ARRAY['chinese', 'language', 'vocab'], false, now() - interval '7 days', now() - interval '2 days'),

  (gen_random_uuid(), 'Journey to the West — Reading Notes', '# Journey to the West

**Author**: Wu Cheng''en (16th century, Ming Dynasty)
**Genre**: Chinese mythological novel / hero''s journey

## Main Characters
- **Sun Wukong** (Monkey King) — trickster, powerful, prideful, seeks redemption through discipline
- **Tang Sanzang** — the monk; represents purity, moral authority, vulnerability
- **Zhu Bajie** (Pigsy) — comic relief, represents human flaws (gluttony, lust, laziness)
- **Sha Wujing** (Sandy) — loyal, quiet, dependable

## Hero''s Quest Themes
- Transformation through hardship — each trial shapes the pilgrims
- **Catharsis**: readers experience fear/pity and release through the narrative arcs
- Discipline over raw power — Sun Wukong''s arc from chaos to control

## Key Concepts
- **Intentionality**: each character''s actions are purposeful and tied to their inner nature
- **Theoretical frameworks**: Buddhist, Taoist, and Confucian values embedded throughout', ARRAY['academics', 'literature', 'chinese', 'reading'], false, now() - interval '21 days', now() - interval '10 days'),

  (gen_random_uuid(), 'Youth Coaching eBook — Project Notes', '# Youth Coaching eBook Series

## Concept
4 books aimed at volunteer youth sports coaches with little formal training.
Target: coaches of kids aged 6–14.

## Book Structure (each book ~10 pages)
1. **Key Adaptations** — how to adapt adult drills for kids at this age group
2. **Design Strategies** — how to structure a practice session (warm-up, skill work, scrimmage)
3. **Building Tools** — diagrams, drill cards, parent communication tips
4. **Notes Page** — blank template for coaches to add their own notes

## Sports Planned
- Book 1: Soccer
- Book 2: Basketball
- Book 3: Baseball
- Bonus: General intro / philosophy booklet

## Writing Notes
- Keep language simple and visual
- Use bullet points and short paragraphs
- Every drill needs a name, a goal, and a diagram
- Age-group callouts: 🔵 Ages 6–8 | 🟡 Ages 9–12 | 🔴 Ages 13+', ARRAY['ebook', 'writing', 'coaching', 'project'], true, now() - interval '20 days', now() - interval '5 days'),

  (gen_random_uuid(), 'Joseph Smith First Vision — Account Comparisons', '# First Vision Account Comparisons

Research for Religious History / Philosophy paper

| Account | Year | Audience | Key Details |
|---------|------|----------|-------------|
| 1832 Account | 1832 | Personal journal | Earliest. Focuses on forgiveness of sins. One figure (Christ) mentioned. |
| 1835 Account | 1835 | Sherwood memoir | Two personages. Angels also mentioned. |
| 1838 Account | 1838 | Official (D&C 1) | Father and Son clearly distinguished. Asks which church to join. |
| 1842 Account | 1842 | Wentworth Letter | Public audience; briefer, doctrinal focus. |

## Observations
- Earlier accounts emphasize personal spiritual experience; later accounts more institutional
- Differences may reflect audience, purpose, and memory — consistent with oral/written tradition research
- **Joseph Smith Translation of the Bible** (JST): another project showing Smith''s engagement with scripture interpretation', ARRAY['academics', 'religious-history', 'philosophy', 'research'], false, now() - interval '10 days', now() - interval '4 days'),

  (gen_random_uuid(), 'Air Fryer Recipe Notes', '# Favorite Air Fryer Recipes

## Chicken Wings
- **Temp**: 375°F / 15 min, flip, 10 more min
- Dry rub: garlic powder, smoked paprika, salt, pepper, a little baking powder (makes them crispy!)
- Sauce ideas: garlic parmesan, buffalo, honey soy

## Snickerdoodles (Air Fryer version)
- 375°F / 8–9 min
- Don''t overcrowd — max 6 per batch
- Roll in cinnamon sugar right before air frying

## Alfredo Sauce (stovetop, pairs with pasta)
- Heavy cream + butter + parmesan + garlic
- Low heat, stir constantly — don''t let it boil hard
- Add pasta water to thin if needed

## Cucumber Sauce (tzatziki-style)
- Greek yogurt + grated cucumber (squeezed dry!) + garlic + dill + lemon juice
- Great with grilled chicken or as a dip', ARRAY['cooking', 'recipes', 'personal'], false, now() - interval '15 days', now() - interval '8 days');

-- ─── Courses ─────────────────────────────────────────────────────────────────

INSERT INTO courses (id, name, instructor, credits, color, semester, created_at) VALUES
  ('co100000-0000-0000-0000-000000000001', 'Research Methods in Psychology', 'Dr. Sarah Kim', 3, '#e8829a', 'Spring 2026', now() - interval '60 days'),
  ('co100000-0000-0000-0000-000000000002', 'Introduction to Statistics', 'Prof. Martinez', 3, '#3498db', 'Spring 2026', now() - interval '60 days'),
  ('co100000-0000-0000-0000-000000000003', 'World Literature', 'Prof. Chen', 3, '#9b59b6', 'Spring 2026', now() - interval '60 days'),
  ('co100000-0000-0000-0000-000000000004', 'Philosophy of Religion', 'Dr. Hansen', 3, '#f39c12', 'Spring 2026', now() - interval '60 days');

-- ─── Assignments ─────────────────────────────────────────────────────────────

-- Research Methods
INSERT INTO assignments (id, course_id, title, type, due_date, grade, max_grade, completed, notes, created_at) VALUES
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000001', 'Chapter 1–3 Quiz', 'quiz', (current_date - 30)::text, 88, 100, true, 'Felt good about this one. Missed one question on operationalization.', now() - interval '35 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000001', 'Article Critique — Frequency Claims', 'homework', (current_date - 14)::text, 92, 100, true, 'Chose a sleep study article. Feedback: good analysis, watch claim precision.', now() - interval '20 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000001', 'Midterm Exam', 'exam', (current_date + 14)::text, NULL, 100, false, 'Covers Ch. 1–8. Focus on types of claims and validity types.', now() - interval '10 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000001', 'Research Paper Proposal', 'project', (current_date + 28)::text, NULL, 100, false, 'Topic TBD — possibly media consumption and academic performance in teens.', now() - interval '5 days');

-- Statistics
INSERT INTO assignments (id, course_id, title, type, due_date, grade, max_grade, completed, notes, created_at) VALUES
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000002', 'Problem Set 1 — Descriptive Stats', 'homework', (current_date - 21)::text, 95, 100, true, 'Perfect on mean/median/mode. Missed a standard deviation rounding.', now() - interval '28 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000002', 'Problem Set 2 — Pearson Correlation', 'homework', (current_date + 1)::text, NULL, 100, false, 'r values, scatter plots, and interpreting strength of relationship.', now() - interval '3 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000002', 'Stats Quiz — Probability Basics', 'quiz', (current_date - 7)::text, 78, 100, true, 'Conditional probability tripped me up. Review before midterm.', now() - interval '14 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000002', 'Midterm', 'exam', (current_date + 21)::text, NULL, 100, false, NULL, now() - interval '5 days');

-- World Literature
INSERT INTO assignments (id, course_id, title, type, due_date, grade, max_grade, completed, notes, created_at) VALUES
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000003', 'Reading Response — Journey to the West', 'homework', (current_date - 10)::text, 90, 100, true, 'Wrote about Sun Wukong''s character arc and catharsis. Strong response per Prof. Chen.', now() - interval '17 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000003', 'Group Discussion — WWII Literature', 'other', (current_date - 3)::text, 85, 100, true, 'Discussed Night by Wiesel. Led conversation about intentionality in memoir.', now() - interval '10 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000003', 'Essay — Hero''s Quest in World Literature', 'project', (current_date + 18)::text, NULL, 100, false, 'Compare Sun Wukong to another hero (considering Odysseus). 5–7 pages, MLA format.', now() - interval '7 days');

-- Philosophy of Religion
INSERT INTO assignments (id, course_id, title, type, due_date, grade, max_grade, completed, notes, created_at) VALUES
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000004', 'Reading — Empiricism and Religious Experience', 'homework', (current_date - 5)::text, 88, 100, true, 'Hume vs. James on religious experience. Good discussion starter.', now() - interval '12 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000004', 'Short Paper — Primary Sources in Religious History', 'project', (current_date + 10)::text, NULL, 100, false, 'Using the First Vision accounts as a case study in source reliability.', now() - interval '8 days'),
  (gen_random_uuid(), 'co100000-0000-0000-0000-000000000004', 'Final Exam', 'exam', (current_date + 60)::text, NULL, 100, false, NULL, now() - interval '5 days');

-- ─── Time Blocks (Calendar) ───────────────────────────────────────────────────

-- Recurring weekly schedule
INSERT INTO time_blocks (id, title, category, start_time, end_time, color, repeat_until, created_at) VALUES
  -- Monday / Wednesday / Friday — Research Methods class
  (gen_random_uuid(), 'Research Methods', 'School', (current_date + (1 - extract(dow from current_date)::int) % 7 + '09:00:00'::time)::timestamp::text, (current_date + (1 - extract(dow from current_date)::int) % 7 + '10:15:00'::time)::timestamp::text, '#e8829a', (current_date + 90)::text, now()),
  -- Tuesday / Thursday — Stats class
  (gen_random_uuid(), 'Statistics', 'School', (current_date + (2 - extract(dow from current_date)::int) % 7 + '11:00:00'::time)::timestamp::text, (current_date + (2 - extract(dow from current_date)::int) % 7 + '12:15:00'::time)::timestamp::text, '#3498db', (current_date + 90)::text, now()),
  -- Tuesday / Thursday — World Literature
  (gen_random_uuid(), 'World Literature', 'School', (current_date + (2 - extract(dow from current_date)::int) % 7 + '14:00:00'::time)::timestamp::text, (current_date + (2 - extract(dow from current_date)::int) % 7 + '15:15:00'::time)::timestamp::text, '#9b59b6', (current_date + 90)::text, now()),
  -- Monday / Wednesday — Philosophy of Religion
  (gen_random_uuid(), 'Philosophy of Religion', 'School', (current_date + (1 - extract(dow from current_date)::int) % 7 + '13:00:00'::time)::timestamp::text, (current_date + (1 - extract(dow from current_date)::int) % 7 + '14:15:00'::time)::timestamp::text, '#f39c12', (current_date + 90)::text, now()),
  -- Thursday evenings — Chinese with Li Wei (Zoom)
  (gen_random_uuid(), 'Chinese Practice w/ Li Wei', 'Language', (current_date + (4 - extract(dow from current_date)::int) % 7 + '19:00:00'::time)::timestamp::text, (current_date + (4 - extract(dow from current_date)::int) % 7 + '19:45:00'::time)::timestamp::text, '#3498db', (current_date + 90)::text, now()),
  -- Daily morning study block
  (gen_random_uuid(), 'Morning Study Block', 'Study', (current_date + '08:00:00'::time)::timestamp::text, (current_date + '09:00:00'::time)::timestamp::text, '#27ae60', (current_date + 90)::text, now()),
  -- Weekend ebook writing
  (gen_random_uuid(), 'eBook Writing', 'Writing', (current_date + (6 - extract(dow from current_date)::int) % 7 + '10:00:00'::time)::timestamp::text, (current_date + (6 - extract(dow from current_date)::int) % 7 + '12:00:00'::time)::timestamp::text, '#9b59b6', (current_date + 90)::text, now());

-- ─── Documents ───────────────────────────────────────────────────────────────

INSERT INTO documents (id, name, folder, url, file_type, notes, created_at) VALUES
  (gen_random_uuid(), 'Spring 2026 Course Syllabus — Research Methods', 'Academics', NULL, 'pdf', 'Download from Canvas. Has all due dates for the semester.', now() - interval '60 days'),
  (gen_random_uuid(), 'Spring 2026 Course Syllabus — Statistics', 'Academics', NULL, 'pdf', NULL, now() - interval '60 days'),
  (gen_random_uuid(), 'Spring 2026 Course Syllabus — World Literature', 'Academics', NULL, 'pdf', NULL, now() - interval '60 days'),
  (gen_random_uuid(), 'eBook Series — Master Outline', 'Writing Projects', NULL, 'doc', 'Overall plan, audience notes, and chapter breakdown for all 4 books.', now() - interval '20 days'),
  (gen_random_uuid(), 'Soccer Drill Diagrams — Draft', 'Writing Projects', NULL, 'pdf', 'First sketches from Canva. Still need to add age-group callouts.', now() - interval '10 days'),
  (gen_random_uuid(), 'Chinese Lesson Materials — Lessons 1–10', 'Language', NULL, 'pdf', 'Downloaded from the app. Good for offline reference.', now() - interval '30 days'),
  (gen_random_uuid(), 'Bird of Paradise Care Guide', 'Home', NULL, 'pdf', 'Found this on a plant care blog. Covers watering, light, and repotting schedule.', now() - interval '14 days');
