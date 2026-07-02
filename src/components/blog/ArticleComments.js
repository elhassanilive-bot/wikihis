"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BlogImage from "@/components/blog/BlogImage";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

function formatCommentTimestamp(value) {
  if (!value) return "";

  try {
    return new Intl.DateTimeFormat("ar-MA", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function Avatar({ avatarUrl, name, size = 52 }) {
  if (avatarUrl) {
    return (
      <div className="relative overflow-hidden rounded-full border-4 border-red-100 bg-white shadow-[0_12px_30px_-18px_rgba(220,38,38,0.6)]" style={{ width: size, height: size }}>
        <BlogImage src={avatarUrl} alt={name} fill sizes={`${size}px`} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full border-4 border-red-100 bg-[radial-gradient(circle_at_30%_30%,#ef4444_0%,#b91c1c_60%,#7f1d1d_100%)] font-black text-white shadow-[0_12px_30px_-18px_rgba(220,38,38,0.6)]"
      style={{ width: size, height: size, fontSize: Math.max(16, Math.round(size * 0.34)) }}
    >
      {String(name || "مستخدم").trim().charAt(0)}
    </div>
  );
}

function ThumbsUpIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M2 21h4V9H2v12Zm20-11.5c0-.83-.67-1.5-1.5-1.5h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.67 1 7.59 7.09C7.22 7.46 7 7.97 7 8.5V19c0 1.1.9 2 2 2h7c.82 0 1.52-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73V9.5Z" />
    </svg>
  );
}

function ThumbsDownIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M22 3h-4v12h4V3ZM2 14.5C2 15.33 2.67 16 3.5 16h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L10.33 23l6.08-6.09c.37-.37.59-.88.59-1.41V5c0-1.1-.9-2-2-2H8c-.82 0-1.52.5-1.84 1.22L3.14 11.27c-.09.23-.14.47-.14.73v2.5Z" />
    </svg>
  );
}

function buildCommentTree(comments, reactions, currentUserId) {
  const reactionMap = reactions.reduce((accumulator, reaction) => {
    const key = reaction.comment_id;
    if (!accumulator[key]) {
      accumulator[key] = { likes: 0, dislikes: 0, currentReaction: null };
    }

    if (reaction.reaction_type === "like") accumulator[key].likes += 1;
    if (reaction.reaction_type === "dislike") accumulator[key].dislikes += 1;
    if (reaction.user_id === currentUserId) accumulator[key].currentReaction = reaction.reaction_type;

    return accumulator;
  }, {});

  const byId = new Map(
    comments.map((comment) => [
      comment.id,
      {
        ...comment,
        reactions: reactionMap[comment.id] || { likes: 0, dislikes: 0, currentReaction: null },
        replies: [],
      },
    ])
  );

  const roots = [];

  comments.forEach((comment) => {
    const current = byId.get(comment.id);
    if (comment.parent_comment_id && byId.has(comment.parent_comment_id)) {
      byId.get(comment.parent_comment_id).replies.push(current);
    } else {
      roots.push(current);
    }
  });

  return roots;
}

function ReactionButton({ active, count, onClick, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition",
        active ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
      ].join(" ")}
    >
      <span>{count}</span>
      {icon}
    </button>
  );
}

function ActionLink({ children, onClick, tone = "default" }) {
  const toneClass =
    tone === "danger"
      ? "text-rose-700 hover:text-rose-800"
      : tone === "primary"
        ? "text-slate-950 hover:text-red-700"
        : "text-slate-600 hover:text-slate-950";

  return (
    <button type="button" onClick={onClick} className={`text-sm font-bold transition ${toneClass}`}>
      {children}
    </button>
  );
}

function CommentActions({
  comment,
  isOwner,
  onReactionToggle,
  onReplyToggle,
  onEditToggle,
  onDelete,
}) {
  return (
    <div dir="rtl" className="mt-4 flex w-full flex-wrap items-center justify-start gap-3 text-right">
      <div className="order-2 flex flex-wrap items-center justify-start gap-3">
        <ActionLink tone="primary" onClick={() => onReplyToggle(comment.id)}>
          رد
        </ActionLink>
        {isOwner ? (
          <>
            <ActionLink onClick={() => onEditToggle(comment.id, comment.content)}>تعديل</ActionLink>
            <ActionLink tone="danger" onClick={() => onDelete(comment.id)}>حذف</ActionLink>
          </>
        ) : null}
      </div>

      <div className="order-1 flex items-center justify-start gap-2">
        <ReactionButton
          active={comment.reactions.currentReaction === "like"}
          count={comment.reactions.likes || 0}
          onClick={() => onReactionToggle(comment.id, "like")}
          icon={<ThumbsUpIcon />}
        />
        <ReactionButton
          active={comment.reactions.currentReaction === "dislike"}
          count={comment.reactions.dislikes || 0}
          onClick={() => onReactionToggle(comment.id, "dislike")}
          icon={<ThumbsDownIcon />}
        />
      </div>
    </div>
  );
}

function CommentComposer({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  placeholder,
}) {
  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={2}
        rows={3}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-slate-950 outline-none transition focus:border-red-300"
        placeholder={placeholder}
      />
      <div className="mt-3 flex flex-row-reverse flex-wrap justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300"
          >
            إلغاء
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending || !value.trim()}
          className="rounded-full bg-red-700 px-4 py-2 text-xs font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function CommentCard({
  comment,
  depth = 0,
  session,
  replyingTo,
  replyDraft,
  onReplyDraftChange,
  editingId,
  editDraft,
  onEditDraftChange,
  onReplyToggle,
  onReplySubmit,
  onEditToggle,
  onEditSubmit,
  onDelete,
  onReactionToggle,
  pending,
}) {
  const isReplying = replyingTo === comment.id;
  const isEditing = editingId === comment.id;
  const isOwner = session?.user?.id && comment.user_id === session.user.id;

  return (
    <article dir="rtl" className={["rounded-[1.75rem] border border-slate-200 bg-white p-5 text-right shadow-sm", depth ? "mr-8 mt-4 bg-slate-50" : ""].join(" ")}>
      <div className="flex items-start justify-start gap-4 text-right">
        <Avatar avatarUrl={comment.user_profiles?.avatar_url} name={comment.user_profiles?.display_name} size={depth ? 46 : 54} />
        <div className="min-w-0 flex-1 text-right">
          <div className="flex flex-col items-start gap-1 text-right">
            <div className="text-lg font-black text-slate-950">{comment.user_profiles?.display_name || "مستخدم"}</div>
            <div className="text-sm text-slate-600">{depth ? "رد على التعليق" : "تعليق عند الإدارة"}</div>
            <div className="text-xs font-semibold text-slate-500">{formatCommentTimestamp(comment.created_at)}</div>
          </div>
        </div>
      </div>

      {isEditing ? (
        <CommentComposer
          value={editDraft}
          onChange={onEditDraftChange}
          onSubmit={(event) => onEditSubmit(event, comment.id)}
          onCancel={() => onEditToggle(null, "")}
          submitLabel={pending ? "جارٍ الحفظ..." : "حفظ التعديل"}
          pending={pending}
          placeholder="عدّل تعليقك هنا..."
        />
      ) : (
        <div className="mt-4 whitespace-pre-wrap text-base leading-7 text-slate-800">{comment.content}</div>
      )}

          {!isEditing ? (
            <CommentActions
              comment={comment}
              isOwner={isOwner}
              onReactionToggle={onReactionToggle}
              onReplyToggle={onReplyToggle}
              onEditToggle={onEditToggle}
              onDelete={onDelete}
            />
          ) : null}

          {isReplying ? (
            <CommentComposer
              value={replyDraft}
              onChange={onReplyDraftChange}
              onSubmit={(event) => onReplySubmit(event, comment.id)}
              onCancel={() => onReplyToggle(null)}
              submitLabel={pending ? "جارٍ النشر..." : "نشر الرد"}
              pending={pending}
              placeholder="اكتب ردك هنا..."
            />
          ) : null}

          {comment.replies?.length ? (
            <div className="mt-5 border-r-2 border-slate-200 pr-4">
              {comment.replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  depth={depth + 1}
                  session={session}
                  replyingTo={replyingTo}
                  replyDraft={replyDraft}
                  onReplyDraftChange={onReplyDraftChange}
                  editingId={editingId}
                  editDraft={editDraft}
                  onEditDraftChange={onEditDraftChange}
                  onReplyToggle={onReplyToggle}
                  onReplySubmit={onReplySubmit}
                  onEditToggle={onEditToggle}
                  onEditSubmit={onEditSubmit}
                  onDelete={onDelete}
                  onReactionToggle={onReactionToggle}
                  pending={pending}
                />
              ))}
            </div>
          ) : null}
    </article>
  );
}

export default function ArticleComments({ postId }) {
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [content, setContent] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [editDraft, setEditDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const commentTree = useMemo(() => buildCommentTree(comments, reactions, session?.user?.id || null), [comments, reactions, session?.user?.id]);
  const commentsCount = comments.length;

  const loadCurrentSession = useCallback(async (supabase) => {
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();

    setSession(currentSession);

    if (!currentSession?.user) {
      setProfile(null);
      return null;
    }

    const { data: profileData } = await supabase
      .from("user_profiles")
      .select("id, display_name, avatar_url, email")
      .eq("id", currentSession.user.id)
      .maybeSingle();

    setProfile(profileData);
    return currentSession;
  }, []);

  const loadCommentsData = useCallback(async (supabase) => {
    const { data: commentsData, error: commentsError } = await supabase
      .from("blog_comments")
      .select("id, post_id, user_id, parent_comment_id, content, created_at, status, user_profiles(display_name, avatar_url)")
      .eq("post_id", postId)
      .eq("status", "published")
      .order("created_at", { ascending: true });

    if (commentsError) throw commentsError;

    setComments(commentsData || []);

    const commentIds = (commentsData || []).map((comment) => comment.id);
    if (!commentIds.length) {
      setReactions([]);
      return;
    }

    const { data: reactionsData, error: reactionsError } = await supabase
      .from("blog_comment_reactions")
      .select("id, comment_id, user_id, reaction_type")
      .in("comment_id", commentIds);

    if (reactionsError) throw reactionsError;
    setReactions(reactionsData || []);
  }, [postId]);

  useEffect(() => {
    let active = true;

    async function loadAll() {
      try {
        const supabase = await getSupabaseClient();
        if (!supabase || !active) return;
        await loadCurrentSession(supabase);
        if (!active) return;
        await loadCommentsData(supabase);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "تعذر تحميل التعليقات.");
        }
      }
    }

    loadAll();
    return () => {
      active = false;
    };
  }, [loadCommentsData, loadCurrentSession, postId]);

  async function ensureProfile(supabase, user) {
    const displayName = profile?.display_name || user.user_metadata?.display_name || user.email?.split("@")[0] || "مستخدم";
    const avatarUrl = profile?.avatar_url || "";

    const { error: upsertError } = await supabase.from("user_profiles").upsert(
      {
        id: user.id,
        email: user.email,
        display_name: displayName,
        avatar_url: avatarUrl,
      },
      { onConflict: "id" }
    );

    if (upsertError) throw upsertError;
  }

  async function submitComment(event, parentCommentId = null) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح.");
      if (!session?.user) throw new Error("يجب تسجيل الدخول أولًا.");

      const draft = parentCommentId ? replyDraft : content;
      if (!draft.trim()) throw new Error("اكتب محتوى التعليق أولًا.");

      await ensureProfile(supabase, session.user);

      const { error: insertError } = await supabase.from("blog_comments").insert({
        post_id: postId,
        user_id: session.user.id,
        parent_comment_id: parentCommentId,
        content: draft.trim(),
        status: "published",
      });

      if (insertError) throw insertError;

      await loadCommentsData(supabase);
      setContent("");
      setReplyDraft("");
      setReplyingTo(null);
      setMessage(parentCommentId ? "تم نشر الرد بنجاح." : "تم نشر تعليقك بنجاح.");
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "تعذر نشر التعليق.");
    } finally {
      setPending(false);
    }
  }

  async function submitEdit(event, commentId) {
    event.preventDefault();
    setPending(true);
    setError("");
    setMessage("");

    try {
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح.");
      if (!session?.user) throw new Error("يجب تسجيل الدخول أولًا.");
      if (!editDraft.trim()) throw new Error("اكتب نص التعليق أولًا.");

      const { error: updateError } = await supabase
        .from("blog_comments")
        .update({ content: editDraft.trim() })
        .eq("id", commentId)
        .eq("user_id", session.user.id);

      if (updateError) throw updateError;

      await loadCommentsData(supabase);
      setEditingId(null);
      setEditDraft("");
      setMessage("تم تعديل التعليق بنجاح.");
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "تعذر تعديل التعليق.");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteComment(commentId) {
    try {
      setPending(true);
      setError("");
      setMessage("");

      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح.");
      if (!session?.user) throw new Error("يجب تسجيل الدخول أولًا.");

      const { error: deleteError } = await supabase.from("blog_comments").delete().eq("id", commentId).eq("user_id", session.user.id);
      if (deleteError) throw deleteError;

      await loadCommentsData(supabase);
      setReplyingTo(null);
      setReplyDraft("");
      setEditingId(null);
      setEditDraft("");
      setMessage("تم حذف التعليق بنجاح.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف التعليق.");
    } finally {
      setPending(false);
    }
  }

  async function handleReactionToggle(commentId, reactionType) {
    try {
      setError("");
      const supabase = await getSupabaseClient();
      if (!supabase) throw new Error("ربط Supabase غير متاح.");
      if (!session?.user) throw new Error("يجب تسجيل الدخول أولًا حتى تتفاعل مع التعليقات.");

      await ensureProfile(supabase, session.user);

      const existingReaction = reactions.find((reaction) => reaction.comment_id === commentId && reaction.user_id === session.user.id);

      if (existingReaction?.reaction_type === reactionType) {
        const { error: deleteError } = await supabase.from("blog_comment_reactions").delete().eq("id", existingReaction.id);
        if (deleteError) throw deleteError;
      } else if (existingReaction) {
        const { error: updateError } = await supabase
          .from("blog_comment_reactions")
          .update({ reaction_type: reactionType })
          .eq("id", existingReaction.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("blog_comment_reactions").insert({
          comment_id: commentId,
          user_id: session.user.id,
          reaction_type: reactionType,
        });
        if (insertError) throw insertError;
      }

      await loadCommentsData(supabase);
    } catch (reactionError) {
      setError(reactionError instanceof Error ? reactionError.message : "تعذر تحديث التفاعل.");
    }
  }

  if (!isSupabaseConfigured()) {
    return null;
  }

  return (
    <section dir="rtl" className="border border-slate-200 bg-white px-6 py-8 shadow-[0_25px_60px_-45px_rgba(15,23,42,0.45)] sm:px-8">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="text-right">
          <div className="text-xs font-extrabold tracking-[0.18em] text-red-700">ARTICLE COMMENTS</div>
          <h2 className="mt-2 text-3xl font-black text-slate-950">التعليقات والنقاش</h2>
        </div>
        <div className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700">{commentsCount} مشاركة</div>
      </div>

      {message ? <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">{message}</div> : null}
      {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">{error}</div> : null}

      <div className="mt-6">
        {session?.user ? (
          <form onSubmit={(event) => submitComment(event, null)} className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-4 text-right">
              <Avatar avatarUrl={profile?.avatar_url} name={profile?.display_name || session.user.email} size={54} />
              <div className="text-right">
                <div className="text-lg font-black text-slate-950">{profile?.display_name || session.user.user_metadata?.display_name || session.user.email}</div>
                <div className="text-sm text-slate-500">شارك رأيك في هذا المقال</div>
              </div>
            </div>

            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
              minLength={2}
              rows={4}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-slate-950 outline-none transition focus:border-red-300"
              placeholder="اكتب تعليقك هنا..."
            />

            <div className="mt-4 flex justify-start">
              <button
                type="submit"
                disabled={pending || !content.trim()}
                className="rounded-full bg-red-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? "جارٍ النشر..." : "نشر التعليق"}
              </button>
            </div>
          </form>
        ) : (
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-6 text-right">
            <div className="text-base font-semibold text-slate-900">يجب إنشاء حساب أو تسجيل الدخول قبل التعليق أو التفاعل.</div>
            <div className="mt-4 flex flex-wrap justify-end gap-3">
              <Link href="/auth" className="wikihat-red-secondary rounded-full border px-5 py-3 text-sm font-bold transition">
                تسجيل الدخول
              </Link>
              <Link href="/auth?mode=signup" className="wikihat-red-primary rounded-full border px-5 py-3 text-sm font-bold transition">
                إنشاء حساب
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-4">
        {commentTree.length ? (
          commentTree.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              session={session}
              replyingTo={replyingTo}
              replyDraft={replyDraft}
              onReplyDraftChange={setReplyDraft}
              editingId={editingId}
              editDraft={editDraft}
              onEditDraftChange={setEditDraft}
              onReplyToggle={(commentId) => {
                setReplyingTo(commentId);
                if (!commentId) setReplyDraft("");
              }}
              onReplySubmit={submitComment}
              onEditToggle={(commentId, draft = "") => {
                setEditingId(commentId);
                setEditDraft(draft);
              }}
              onEditSubmit={submitEdit}
              onDelete={handleDeleteComment}
              onReactionToggle={handleReactionToggle}
              pending={pending}
            />
          ))
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-slate-500">
            لا توجد تعليقات بعد. كن أول من يبدأ النقاش.
          </div>
        )}
      </div>
    </section>
  );
}
