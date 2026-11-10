import { useMemo, useState } from "react";
import axios from "axios";
import "./style.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const platforms = [
  "Instagram", "Facebook", "LinkedIn", "YouTube",
  "TikTok", "X", "Threads", "Pinterest", "Reddit",
  "WhatsApp Channels", "Telegram", "Bluesky"
];

const goals = [
  "Increase brand awareness",
  "Generate leads",
  "Drive sales",
  "Increase engagement",
  "Launch a product",
  "Educate the audience",
  "Build a community"
];

const tones = [
  "Friendly and informative",
  "Professional",
  "Bold and energetic",
  "Educational",
  "Witty and playful",
  "Inspirational",
  "Minimal and premium"
];

const formats = ["Any format", "Post", "Carousel", "Reel", "Story"];
const languages = ["English", "Telugu", "Hindi"];

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function getPostDate(post) {
  if (!post.date) return "Date not provided";

  const date = new Date(`${post.date}T00:00:00`);

  if (Number.isNaN(date.getTime())) return post.date;

  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function App() {
  // Campaign form
  const [business, setBusiness] = useState("");
  const [product, setProduct] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productFeatures, setProductFeatures] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [audience, setAudience] = useState("");

  const [goal, setGoal] = useState(goals[0]);
  const [tone, setTone] = useState(tones[0]);
  const [format, setFormat] = useState("Any format");
  const [language, setLanguage] = useState("English");

  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState(3);

  // Application states
  const [posts, setPosts] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [reviewingId, setReviewingId] = useState(null);
  const [copied, setCopied] = useState("");
  const [activePage, setActivePage] = useState("planner");

  // AI Review results
  const [reviewResults, setReviewResults] = useState({});

  // Group posts by date
  const groupedPosts = useMemo(() => {
    const groups = {};

    [...posts]
      .sort((a, b) =>
        String(a.date || "").localeCompare(String(b.date || ""))
      )
      .forEach((post) => {
        const date = post.date || "Date not provided";

        if (!groups[date]) groups[date] = [];

        groups[date].push(post);
      });

    return Object.entries(groups);
  }, [posts]);

  // Campaign details
  function campaignDetails() {
    return {
      business,
      product,
      product_name: productName,
      product_description: productDescription,
      product_features: productFeatures,
      product_category: productCategory,
      audience,
      goal,
      tone,
      format,
      language
    };
  }

  // Select platforms
  function togglePlatform(platform) {
    setSelected((previous) =>
      previous.includes(platform)
        ? previous.filter((item) => item !== platform)
        : [...previous, platform]
    );
  }

  // Generate content
  async function generate() {
    setError("");

    if (!business.trim() || !product.trim() || !audience.trim()) {
      setError(
        "Please fill in the business, product or service, and audience fields."
      );
      return;
    }

    if (selected.length === 0) {
      setError("Please select at least one social media platform.");
      return;
    }

    setBusy(true);

    try {
      const response = await axios.post(
        `${API_URL}/api/generate`,
        {
          ...campaignDetails(),
          platforms: selected,
          posts_per_platform: Number(count)
        }
      );

      const generatedPosts = response.data.posts || [];

      setPosts(generatedPosts);
      setReviewResults({});
      setActivePage("planner");

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Content generation failed. Check your backend."
      );
    } finally {
      setBusy(false);
    }
  }

  // Regenerate individual post
  async function regenerate(post) {
    setError("");
    setRegeneratingId(post.id);

    try {
      const response = await axios.post(
        `${API_URL}/api/regenerate`,
        {
          ...campaignDetails(),
          platform: post.platform,
          previous_caption: post.caption
        }
      );

      const updatedPost = response.data.post;

      setPosts((previous) =>
        previous.map((item) =>
          item.id === post.id
            ? { ...item, ...updatedPost, id: item.id }
            : item
        )
      );

      setReviewResults((previous) => {
        const updated = { ...previous };
        delete updated[post.id];
        return updated;
      });

    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Regeneration failed. Please try again."
      );
    } finally {
      setRegeneratingId(null);
    }
  }

  // AI REVIEW FUNCTION
  async function reviewPost(post) {
    setError("");
    setReviewingId(post.id);

    try {
      const response = await axios.post(
        `${API_URL}/api/review`,
        {
          platform: post.platform || "",
          content_type: post.content_type || "",
          language: language,
          product: productName || product,
          audience: audience,
          caption: post.caption || "",
          hashtags: Array.isArray(post.hashtags)
            ? post.hashtags
            : [],
          call_to_action: post.call_to_action || "",
          creative_idea: post.creative_idea || ""
        }
      );

      setReviewResults((previous) => ({
        ...previous,
        [post.id]: response.data.review
      }));

      setActivePage("review");

    } catch (err) {
      console.error("AI Review error:", err);

      setError(
        err.response?.data?.detail ||
        err.message ||
        "AI Review failed. Please check your backend connection."
      );
    } finally {
      setReviewingId(null);
    }
  }

  // Copy content
  async function copyPost(post) {
    try {
      const script = post.reel_script;

      const sceneText = script?.scenes
        ?.map((scene) => [
          `Time: ${scene.time || ""}`,
          `Visual: ${scene.visual || ""}`,
          `Voice-over: ${scene.voiceover || ""}`,
          `On-screen text: ${scene.on_screen_text || ""}`
        ].join("\n"))
        .join("\n\n");

      const content = [
        post.caption || "",
        (post.hashtags || []).join(" "),
        post.call_to_action
          ? `CTA: ${post.call_to_action}`
          : "",
        script
          ? [
              "REEL SCRIPT",
              `Hook: ${script.hook || ""}`,
              `Duration: ${script.duration || ""}`,
              sceneText || "",
              `Music: ${script.music_suggestion || ""}`,
              `Ending: ${script.ending || ""}`
            ].join("\n\n")
          : ""
      ]
        .filter(Boolean)
        .join("\n\n");

      await navigator.clipboard.writeText(content);

      setCopied(post.id);
      window.setTimeout(() => setCopied(""), 1800);

    } catch {
      setError("Unable to copy content. Please try again.");
    }
  }

  // Export CSV
  function exportCsv() {
    if (posts.length === 0) {
      setError("Generate content before exporting.");
      return;
    }

    const headings = [
      "Date",
      "Platform",
      "Content Type",
      "Language",
      "Caption",
      "Hashtags",
      "CTA",
      "Creative Idea",
      "Reel Script"
    ];

    const rows = posts.map((post) => [
      post.date,
      post.platform,
      post.content_type,
      language,
      post.caption,
      (post.hashtags || []).join(" "),
      post.call_to_action,
      post.creative_idea,
      post.reel_script
        ? JSON.stringify(post.reel_script)
        : ""
    ]);

    const csvContent = [headings, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "social-media-content-plan.csv";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
    setError("");
  }

  // Reel script display
  function renderReelScript(script) {
    if (!script) return null;

    return (
      <div className="reel-script">
        <h4>Reel production script</h4>

        {script.hook && (
          <div className="reel-section">
            <strong>Opening hook</strong>
            <p>{script.hook}</p>
          </div>
        )}

        {script.duration && (
          <div className="reel-section">
            <strong>Suggested duration</strong>
            <p>{script.duration}</p>
          </div>
        )}

        {script.scenes?.map((scene, index) => (
          <div className="reel-scene" key={index}>
            <h5>
              Scene {index + 1} {scene.time ? `· ${scene.time}` : ""}
            </h5>

            {scene.visual && (
              <p><strong>Visual:</strong> {scene.visual}</p>
            )}

            {scene.voiceover && (
              <p><strong>Voice-over:</strong> {scene.voiceover}</p>
            )}

            {scene.on_screen_text && (
              <p><strong>On-screen text:</strong> {scene.on_screen_text}</p>
            )}
          </div>
        ))}

        {script.music_suggestion && (
          <div className="reel-section">
            <strong>Music suggestion</strong>
            <p>{script.music_suggestion}</p>
          </div>
        )}

        {script.ending && (
          <div className="reel-section">
            <strong>Ending</strong>
            <p>{script.ending}</p>
          </div>
        )}

        <small>
          This is a production script. Create and edit the actual video separately.
        </small>
      </div>
    );
  }

  // AI Review result display
  function renderReviewResult(review) {
    if (!review) return null;

    const scores = [
      ["Overall", review.overall_score],
      ["Caption", review.caption_score],
      ["Hashtags", review.hashtag_score],
      ["CTA", review.cta_score],
      ["Readability", review.readability_score]
    ];

    const isApproved = String(review.status || "")
      .toLowerCase()
      .includes("approved");

    const sections = [
      ["Strengths", review.strengths],
      ["Issues", review.issues],
      ["Suggestions", review.suggestions]
    ];

    return (
      <div className="review-result">
        <div className="review-result-heading">
          <h3>AI Review Results</h3>
          <span
            className={`review-status ${
              isApproved ? "approved" : "improvement"
            }`}
          >
            {review.status || "Review completed"}
          </span>
        </div>

        <div className="review-scores">
          {scores.map(([label, score]) => (
            <div className="review-score" key={label}>
              <strong>
                {score !== null && score !== undefined
                  ? `${score}/100`
                  : "—"}
              </strong>
              <span>{label}</span>
            </div>
          ))}
        </div>

        {sections.map(([heading, items]) => (
          <div className="review-section" key={heading}>
            <h4>{heading}</h4>

            {Array.isArray(items) && items.length > 0 ? (
              <ul>
                {items.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            ) : (
              <p>No information available.</p>
            )}
          </div>
        ))}

        <div className="review-improved">
          <h4>Improved caption</h4>
          <p>{review.improved_caption || "Not available"}</p>

          <h4>Improved hashtags</h4>
          <p>
            {Array.isArray(review.improved_hashtags)
              ? review.improved_hashtags.join(" ")
              : review.improved_hashtags || "Not available"}
          </p>

          <h4>Improved call to action</h4>
          <p>{review.improved_cta || "Not available"}</p>
        </div>
      </div>
    );
  }

  // Post card
  function renderPost(post, index) {
    const postId = post.id ?? `${post.platform}-${post.date}-${index}`;

    return (
      <article key={postId}>
        <div className="posthead">
          <b>{post.platform || "Social platform"}</b>
          <span>{post.content_type || "CONTENT"}</span>
        </div>

        <small>{getPostDate(post)}</small>

        <p>{post.caption}</p>

        {post.hashtags?.length > 0 && (
          <p className="tags">{post.hashtags.join(" ")}</p>
        )}

        {post.call_to_action && (
          <p>
            <strong>Call to action:</strong> {post.call_to_action}
          </p>
        )}

        {post.creative_idea && (
          <p>
            <strong>Creative idea:</strong> {post.creative_idea}
          </p>
        )}

        {renderReelScript(post.reel_script)}

        <div className="actions">
          <button onClick={() => copyPost(post)}>
            {copied === post.id ? "Copied!" : "Copy"}
          </button>

          <button
            onClick={() => regenerate(post)}
            disabled={regeneratingId === post.id}
          >
            {regeneratingId === post.id
              ? "Regenerating..."
              : "Regenerate"}
          </button>

          <button
            className="review-button"
            onClick={() => reviewPost(post)}
            disabled={reviewingId === post.id}
          >
            {reviewingId === post.id
              ? "Reviewing..."
              : "Review with AI"}
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside>
        <h2>SocialPilot AI</h2>
        <p>AI CONTENT PLANNER</p>

        <button
          className={`nav ${activePage === "planner" ? "active" : ""}`}
          onClick={() => setActivePage("planner")}
        >
          Content Planner
        </button>

        <button
          className={`nav ${activePage === "calendar" ? "active" : ""}`}
          onClick={() => setActivePage("calendar")}
        >
          Weekly Calendar
        </button>

        <button
          className={`nav ${activePage === "review" ? "active" : ""}`}
          onClick={() => setActivePage("review")}
        >
          AI Review
        </button>

        <small>Generative AI · Agentic workflow</small>
      </aside>

      {/* MAIN CONTENT */}
      <main>
        <header>
          <span>AI Social-Media Content Planner</span>
          <span>Plan · Generate · Review · Export</span>
        </header>

        {/* CONTENT PLANNER */}
        {activePage === "planner" && (
          <>
            <section className="hero">
              <div>
                <small>CONTENT WORKSPACE</small>
                <h1>Plan your next campaign</h1>
                <p>
                  Create platform-specific social media content with AI.
                </p>
              </div>

              <b>● AI generation ready</b>
            </section>

            <div className="layout">
              <section className="panel">
                <h3>Campaign details</h3>

                <label>
                  Business name *
                  <input
                    value={business}
                    onChange={(e) => setBusiness(e.target.value)}
                    placeholder="e.g. Clayverse"
                  />
                </label>

                <label>
                  Product or service *
                  <input
                    value={product}
                    onChange={(e) => setProduct(e.target.value)}
                    placeholder="e.g. Handmade gifts"
                  />
                </label>

                <label>
                  Product name
                  <input
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="Enter product name"
                  />
                </label>

                <label>
                  Product description
                  <input
                    value={productDescription}
                    onChange={(e) =>
                      setProductDescription(e.target.value)
                    }
                    placeholder="Describe your product"
                  />
                </label>

                <div className="two">
                  <label>
                    Product features
                    <input
                      value={productFeatures}
                      onChange={(e) =>
                        setProductFeatures(e.target.value)
                      }
                      placeholder="Separate features with commas"
                    />
                  </label>

                  <label>
                    Product category
                    <input
                      value={productCategory}
                      onChange={(e) =>
                        setProductCategory(e.target.value)
                      }
                      placeholder="e.g. Personalized gifts"
                    />
                  </label>
                </div>

                <label>
                  Target audience *
                  <input
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Describe your target audience"
                  />
                </label>

                <div className="two">
                  <label>
                    Campaign goal
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                    >
                      {goals.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Brand tone
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                    >
                      {tones.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="two">
                  <label>
                    Content format
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                    >
                      {formats.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Language
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      {languages.map((item) => (
                        <option key={item}>{item}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>Social media platforms *</label>

                <div className="platforms">
                  {platforms.map((platform) => (
                    <button
                      type="button"
                      key={platform}
                      className={
                        selected.includes(platform) ? "picked" : ""
                      }
                      onClick={() => togglePlatform(platform)}
                    >
                      {platform}
                    </button>
                  ))}
                </div>

                <label>
                  Posts per platform
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((number) => (
                      <option key={number} value={number}>
                        {number}
                      </option>
                    ))}
                  </select>
                </label>

                {error && (
                  <p className="error" role="alert">{error}</p>
                )}

                <button
                  className="generate"
                  onClick={generate}
                  disabled={busy}
                >
                  {busy ? "Generating content..." : "Generate content"}
                </button>
              </section>

              <section>
                <div className="resulthead">
                  <div>
                    <h3>Generated content</h3>
                    <small>
                      {posts.length
                        ? `${posts.length} content items generated`
                        : "Your generated posts will appear here"}
                    </small>
                  </div>

                  <button
                    onClick={exportCsv}
                    disabled={posts.length === 0}
                  >
                    Export CSV
                  </button>
                </div>

                {posts.length > 0 ? (
                  <div className="cards">
                    {posts.map(renderPost)}
                  </div>
                ) : (
                  <div className="empty">
                    <div>✦</div>
                    <h3>Your content workspace is ready</h3>
                    <p>
                      Enter your campaign details, choose social platforms,
                      and generate content to see your posts here.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </>
        )}

        {/* WEEKLY CALENDAR */}
        {activePage === "calendar" && (
          <section className="calendar-page">
            <div className="calendar-heading">
              <div>
                <small>YOUR CONTENT SCHEDULE</small>
                <h1>Weekly Content Calendar</h1>
                <p>
                  View generated posts grouped by their scheduled dates.
                </p>
              </div>

              <div className="calendar-total">
                <strong>{posts.length}</strong>
                <span>Planned posts</span>
              </div>
            </div>

            <div className="calendar-toolbar">
              <span>{groupedPosts.length} scheduled date(s)</span>

              <button
                onClick={exportCsv}
                disabled={posts.length === 0}
              >
                Export calendar CSV
              </button>
            </div>

            {error && (
              <p className="error" role="alert">{error}</p>
            )}

            {groupedPosts.length > 0 ? (
              <div className="weekly-posts">
                {groupedPosts.map(([date, dayPosts]) => (
                  <section className="calendar-day" key={date}>
                    <div className="calendar-day-heading">
                      <div>
                        <h3>{getPostDate({ date })}</h3>
                        <small>Scheduled content</small>
                      </div>

                      <span>{dayPosts.length} post(s)</span>
                    </div>

                    <div className="calendar-day-posts">
                      {dayPosts.map(renderPost)}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="empty calendar-empty">
                <div>▦</div>
                <h3>No scheduled posts yet</h3>
                <p>
                  Generate content in the Content Planner to populate
                  your weekly calendar.
                </p>

                <button onClick={() => setActivePage("planner")}>
                  Go to Content Planner
                </button>
              </div>
            )}
          </section>
        )}

        {/* AI REVIEW PAGE */}
        {activePage === "review" && (
          <section className="review-page">
            <div className="review-heading">
              <small>AI CONTENT QUALITY CHECK</small>
              <h1>AI Content Review</h1>
              <p>
                Analyse generated posts and get suggestions to improve
                captions, hashtags and calls to action.
              </p>
            </div>

            {error && (
              <p className="error" role="alert">{error}</p>
            )}

            {posts.length > 0 ? (
              <div className="review-post-list">
                {posts.map((post, index) => {
                  const postId =
                    post.id ?? `${post.platform}-${post.date}-${index}`;

                  return (
                    <article className="review-card" key={postId}>
                      <div className="posthead">
                        <b>{post.platform || "Social platform"}</b>
                        <span>{post.content_type || "CONTENT"}</span>
                      </div>

                      <small>{getPostDate(post)}</small>

                      <div className="review-original">
                        <h4>Original caption</h4>
                        <p>{post.caption}</p>

                        {post.hashtags?.length > 0 && (
                          <p className="tags">
                            {post.hashtags.join(" ")}
                          </p>
                        )}

                        {post.call_to_action && (
                          <p>
                            <strong>CTA:</strong> {post.call_to_action}
                          </p>
                        )}
                      </div>

                      <button
                        className="review-button"
                        onClick={() => reviewPost(post)}
                        disabled={reviewingId === post.id}
                      >
                        {reviewingId === post.id
                          ? "Analysing content..."
                          : reviewResults[post.id]
                            ? "Review again"
                            : "Review with AI"}
                      </button>

                      {reviewResults[post.id] &&
                        renderReviewResult(reviewResults[post.id])}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <div>✦</div>
                <h3>No content available for review</h3>
                <p>
                  Generate social media posts first. Your posts will
                  appear here for AI quality checking.
                </p>

                <button onClick={() => setActivePage("planner")}>
                  Go to Content Planner
                </button>
              </div>
            )}
          </section>
        )}

        <footer>
          SocialPilot AI · AI-assisted content planning
        </footer>
      </main>
    </div>
  );
}