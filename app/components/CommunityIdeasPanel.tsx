'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

type IdeaComment = {
  id: string
  authorName: string
  text: string
  createdAt: string
}

type CommunityIdea = {
  id: string
  title: string
  body: string
  authorName: string
  imageData: string | null
  createdAt: string
  comments: IdeaComment[]
}

function formatDt(iso: string) {
  try {
    return new Date(iso).toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function CommunityIdeasPanel() {
  const { data: session, status } = useSession()
  const isAdmin = Boolean(session?.user && (session.user as { isAdmin?: boolean }).isAdmin)

  const [ideas, setIdeas] = useState<CommunityIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageData, setImageData] = useState<string | null>(null)
  const [imageName, setImageName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formMsg, setFormMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({})
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({})
  const [commentBusy, setCommentBusy] = useState<Record<string, boolean>>({})

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')
  const [editImageData, setEditImageData] = useState<string | null>(null)
  const [editImageName, setEditImageName] = useState('')
  const [editReplaceImage, setEditReplaceImage] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const editFileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/community-ideas', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Yuklash xatosi')
      setIdeas(data.ideas || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Xatolik')
      setIdeas([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function readImageFile(file: File | null): Promise<{ data: string | null; name: string; error?: string }> {
    if (!file) return { data: null, name: '' }
    if (!file.type.startsWith('image/')) return { data: null, name: '', error: 'Faqat rasm fayli tanlang.' }
    if (file.size > 1024 * 1024) return { data: null, name: '', error: 'Rasm hajmi 1 MB dan oshmasin.' }
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ data: String(reader.result || ''), name: file.name })
      reader.onerror = () => resolve({ data: null, name: '', error: 'Rasmni o‘qib bo‘lmadi.' })
      reader.readAsDataURL(file)
    })
  }

  async function onFileChange(file: File | null) {
    setFormMsg(null)
    const result = await readImageFile(file)
    if (result.error) {
      setFormMsg(result.error)
      setImageData(null)
      setImageName('')
      return
    }
    setImageData(result.data)
    setImageName(result.name)
  }

  async function submitIdea(e: React.FormEvent) {
    e.preventDefault()
    setFormMsg(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/community-ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, imageData }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Saqlash xatosi')
      setTitle('')
      setBody('')
      setImageData(null)
      setImageName('')
      if (fileRef.current) fileRef.current.value = ''
      setFormMsg('G‘oya e’lon qilindi.')
      await load()
    } catch (err: unknown) {
      setFormMsg(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setSubmitting(false)
    }
  }

  async function submitComment(ideaId: string) {
    const text = (commentDraft[ideaId] || '').trim()
    if (!text) return
    setCommentBusy((s) => ({ ...s, [ideaId]: true }))
    try {
      const res = await fetch(`/api/community-ideas/${ideaId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Izoh xatosi')
      setCommentDraft((s) => ({ ...s, [ideaId]: '' }))
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? data.idea : i)))
      setOpenComments((s) => ({ ...s, [ideaId]: true }))
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setCommentBusy((s) => ({ ...s, [ideaId]: false }))
    }
  }

  function startEdit(idea: CommunityIdea) {
    setEditingId(idea.id)
    setEditTitle(idea.title)
    setEditBody(idea.body)
    setEditImageData(idea.imageData)
    setEditImageName(idea.imageData ? 'Joriy rasm' : '')
    setEditReplaceImage(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditBody('')
    setEditImageData(null)
    setEditImageName('')
    setEditReplaceImage(false)
  }

  async function saveEdit(ideaId: string) {
    setEditBusy(true)
    try {
      const res = await fetch(`/api/community-ideas/${ideaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle,
          body: editBody,
          replaceImage: editReplaceImage,
          imageData: editReplaceImage ? editImageData : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Saqlash xatosi')
      setIdeas((prev) => prev.map((i) => (i.id === ideaId ? data.idea : i)))
      cancelEdit()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik')
    } finally {
      setEditBusy(false)
    }
  }

  async function deleteIdea(ideaId: string) {
    if (!confirm('Bu g‘oyani o‘chirishni tasdiqlaysizmi?')) return
    try {
      const res = await fetch(`/api/community-ideas/${ideaId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'O‘chirish xatosi')
      setIdeas((prev) => prev.filter((i) => i.id !== ideaId))
      if (editingId === ideaId) cancelEdit()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xatolik')
    }
  }

  const loggedIn = status === 'authenticated' && Boolean(session?.user)

  const ideasBlock = loading ? (
    <div className="ciEmpty">Yuklanmoqda…</div>
  ) : error ? (
    <div className="ciEmpty">{error}</div>
  ) : !ideas.length ? (
    <div className="ciEmpty">Hali e’lon qilingan g‘oyalar yo‘q. Birinchi bo‘lib yozing!</div>
  ) : (
    ideas.map((idea) => {
      const comments = idea.comments || []
      const opened = openComments[idea.id]
      const isEditing = editingId === idea.id

      return (
        <article key={idea.id} className="ciCard">
          {isEditing ? (
            <div className="ciEditBox">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={120}
                className="ciEditInput"
              />
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={5000}
                className="ciEditTextarea"
              />
              <div className="ciFileRow">
                <input
                  ref={editFileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="ciFileNative"
                  onChange={async (e) => {
                    const result = await readImageFile(e.target.files?.[0] || null)
                    if (result.error) {
                      alert(result.error)
                      return
                    }
                    setEditImageData(result.data)
                    setEditImageName(result.name || '')
                    setEditReplaceImage(true)
                  }}
                />
                <button
                  type="button"
                  className="ciFileBtn"
                  onClick={() => editFileRef.current?.click()}
                >
                  Fayl tanlang
                </button>
                <span className="ciFileName">{editImageName || 'Fayl tanlanmagan'}</span>
                {editImageData ? (
                  <button
                    type="button"
                    className="ciAdminBtn"
                    onClick={() => {
                      setEditImageData(null)
                      setEditImageName('')
                      setEditReplaceImage(true)
                      if (editFileRef.current) editFileRef.current.value = ''
                    }}
                  >
                    Rasmni olib tashlash
                  </button>
                ) : null}
              </div>
              <div className="ciAdminRow">
                <button type="button" className="ciBtn" disabled={editBusy} onClick={() => saveEdit(idea.id)}>
                  {editBusy ? 'Saqlanmoqda…' : 'Saqlash'}
                </button>
                <button type="button" className="ciAdminBtn" onClick={cancelEdit}>
                  Bekor qilish
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="ciCardHead">
                <h3>{idea.title}</h3>
                {isAdmin ? (
                  <div className="ciAdminRow">
                    <button type="button" className="ciAdminBtn" onClick={() => startEdit(idea)}>
                      O‘zgartirish
                    </button>
                    <button type="button" className="ciAdminBtn danger" onClick={() => deleteIdea(idea.id)}>
                      O‘chirish
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="ciMeta">
                {idea.authorName} · {formatDt(idea.createdAt)}
              </div>
              {idea.imageData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="ciImg" src={idea.imageData} alt={idea.title} />
              ) : null}
              <p className="ciBody">{idea.body}</p>
            </>
          )}

          <button
            type="button"
            className="ciCommentsToggle"
            onClick={() => setOpenComments((s) => ({ ...s, [idea.id]: !s[idea.id] }))}
          >
            Fikrlar ({comments.length}) {opened ? '▲' : '▼'}
          </button>

          {opened ? (
            <div className="ciCommentList">
              {comments.length === 0 ? (
                <div className="ciFormMeta">Hali fikr yo‘q.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="ciComment">
                    <strong>{c.authorName}</strong>
                    <span>{formatDt(c.createdAt)}</span>
                    <p>{c.text}</p>
                  </div>
                ))
              )}

              {loggedIn ? (
                <div className="ciCommentForm">
                  <input
                    type="text"
                    placeholder="Fikringizni yozing…"
                    value={commentDraft[idea.id] || ''}
                    onChange={(e) =>
                      setCommentDraft((s) => ({ ...s, [idea.id]: e.target.value }))
                    }
                    maxLength={1000}
                  />
                  <button
                    type="button"
                    disabled={commentBusy[idea.id]}
                    onClick={() => submitComment(idea.id)}
                  >
                    Yuborish
                  </button>
                </div>
              ) : (
                <div className="ciFormMeta">
                  Fikr yozish uchun <Link href="/sign-in?callbackUrl=/savdo-goyalari">kiring</Link>.
                </div>
              )}
            </div>
          ) : null}
        </article>
      )
    })
  )

  const formBlock =
    status === 'loading' ? null : loggedIn ? (
      <form className="ciForm" onSubmit={submitIdea}>
        <div className="ciFormMeta">
          Muallif: <b>{session?.user?.name || session?.user?.email}</b>
        </div>
        <div>
          <label htmlFor="ci-title">Mavzu</label>
          <input
            id="ci-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="Masalan: BTC D1 long setup"
          />
        </div>
        <div>
          <label htmlFor="ci-body">Asosiy matn</label>
          <textarea
            id="ci-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={5000}
            required
            placeholder="Tahlil, entry/SL/TP, sabablar…"
          />
        </div>
        <div>
          <label>Rasm (ixtiyoriy, max 1 MB)</label>
          <div className="ciFileRow">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="ciFileNative"
              onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            />
            <button type="button" className="ciFileBtn" onClick={() => fileRef.current?.click()}>
              Fayl tanlang
            </button>
            <span className="ciFileName">{imageName || 'Fayl tanlanmagan'}</span>
          </div>
        </div>
        {formMsg ? (
          <div className={`ciMsg${formMsg.includes('qilindi') ? '' : ' err'}`}>{formMsg}</div>
        ) : null}
        <button type="submit" className="ciBtn" disabled={submitting}>
          {submitting ? 'Yuborilmoqda…' : "G'oyani e'lon qilish"}
        </button>
      </form>
    ) : (
      <div className="ciLoginHint">
        G‘oya qo‘shish uchun{' '}
        <Link href="/sign-in?callbackUrl=/savdo-goyalari">tizimga kiring</Link> yoki{' '}
        <Link href="/sign-up">ro‘yxatdan o‘ting</Link>.
      </div>
    )

  return (
    <section className="ciPanel">
      <style>{`
        .ciPanel {
          background: #0d1117;
          border: 1px solid #252d38;
          border-radius: 16px;
          padding: 20px;
          color: #e6edf3;
        }
        .ciTitle { margin: 0; font-size: 1.35rem; font-weight: 800; }
        .ciSub { margin: 8px 0 16px; color: #8b949e; font-size: 0.86rem; line-height: 1.5; }
        .ciSectionLabel {
          margin: 0 0 12px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #8b949e;
        }
        .ciForm {
          border: 1px solid #2b3139;
          border-radius: 12px;
          padding: 14px;
          background: #111820;
          margin-top: 8px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ciForm label { font-size: 0.8rem; color: #9aa7b8; font-weight: 600; display: block; margin-bottom: 4px; }
        .ciForm input[type="text"],
        .ciForm textarea,
        .ciEditInput,
        .ciEditTextarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #303846;
          background: #0d1117;
          color: #e6edf3;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 0.9rem;
          font-family: inherit;
        }
        .ciForm textarea, .ciEditTextarea { min-height: 110px; resize: vertical; }
        .ciFormMeta { font-size: 0.78rem; color: #8b949e; }
        .ciFileNative { display: none; }
        .ciFileRow { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .ciFileBtn {
          border: 1px solid #303846;
          background: #0d1117;
          color: #e6edf3;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ciFileBtn:hover { border-color: #f0b90b; color: #f0b90b; }
        .ciFileName { font-size: 0.8rem; color: #8b949e; }
        .ciBtn {
          align-self: flex-start;
          border: none;
          background: #f0b90b;
          color: #0b0f14;
          font-weight: 800;
          border-radius: 8px;
          padding: 10px 16px;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .ciBtn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ciMsg { font-size: 0.84rem; color: #f0b90b; }
        .ciMsg.err { color: #ff7b87; }
        .ciLoginHint {
          border: 1px dashed #303846;
          border-radius: 12px;
          padding: 14px;
          margin-top: 8px;
          color: #9aa7b8;
          font-size: 0.88rem;
        }
        .ciLoginHint a { color: #f0b90b; }
        .ciList { margin-bottom: 20px; }
        .ciCard {
          border: 1px solid #252d38;
          border-radius: 12px;
          padding: 14px 16px;
          background: #111820;
          margin-bottom: 12px;
        }
        .ciCardHead {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          flex-wrap: wrap;
        }
        .ciCard h3 { margin: 0 0 6px; font-size: 1.05rem; }
        .ciMeta { color: #8b949e; font-size: 0.78rem; margin-bottom: 10px; }
        .ciBody {
          white-space: pre-wrap;
          color: #c8d1dc;
          font-size: 0.9rem;
          line-height: 1.55;
          margin: 0 0 12px;
        }
        .ciImg {
          max-width: 100%;
          max-height: 360px;
          border-radius: 10px;
          margin-bottom: 12px;
          border: 1px solid #252d38;
        }
        .ciAdminRow { display: flex; gap: 8px; flex-wrap: wrap; }
        .ciAdminBtn {
          border: 1px solid #303846;
          background: #0d1117;
          color: #aeb9c7;
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
        }
        .ciAdminBtn:hover { border-color: #f0b90b; color: #f0b90b; }
        .ciAdminBtn.danger:hover { border-color: #ff5360; color: #ff5360; }
        .ciEditBox { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
        .ciCommentsToggle {
          background: transparent;
          border: none;
          color: #f0b90b;
          cursor: pointer;
          font-size: 0.82rem;
          font-weight: 700;
          padding: 0;
        }
        .ciCommentList { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
        .ciComment {
          border-left: 2px solid #303846;
          padding: 6px 0 6px 10px;
          font-size: 0.84rem;
        }
        .ciComment strong { color: #e6edf3; }
        .ciComment span { color: #8b949e; font-size: 0.72rem; margin-left: 6px; }
        .ciComment p { margin: 4px 0 0; color: #c8d1dc; white-space: pre-wrap; }
        .ciCommentForm { display: flex; gap: 8px; margin-top: 10px; }
        .ciCommentForm input {
          flex: 1;
          border: 1px solid #303846;
          background: #0d1117;
          color: #e6edf3;
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.84rem;
        }
        .ciCommentForm button {
          border: 1px solid #303846;
          background: #0d1117;
          color: #f0b90b;
          border-radius: 8px;
          padding: 8px 12px;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.8rem;
        }
        .ciEmpty { text-align: center; padding: 24px; color: #8b949e; }
      `}</style>

      <h1 className="ciTitle">Savdo g&apos;oyalari</h1>
      <p className="ciSub">
        Saytda ro&apos;yxatdan o&apos;ting va o&apos;z savdo g&apos;oyalaringiz bilan o&apos;rtoqlashing.
      </p>

      <div className="ciList">
        <div className="ciSectionLabel">E&apos;lon qilingan g&apos;oyalar</div>
        {ideasBlock}
      </div>

      <div className="ciSectionLabel">Yangi g&apos;oya qo&apos;shish</div>
      {formBlock}
    </section>
  )
}
