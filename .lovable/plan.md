
Yes, this is very feasible. Lovable has a built-in **Lovable AI Gateway** which is the best option here — no OpenAI API key required, billed via your existing Lovable Cloud workspace, and supports streaming. I'll use `google/gemini-3-flash-preview` (fast + cheap, ideal for support chat).

## Plan: Floating AI Support Chat

### 1. Backend — Edge Function (`supabase/functions/support-chat/index.ts`)
- Streams responses from Lovable AI Gateway (SSE)
- System prompt restricts answers to WishWave topics (GIF creation, pricing, credits, uploads, performance, troubleshooting)
- Accepts conversation history + lightweight user context (credit balance, signed-in state) injected server-side from JWT
- Smart context: if `credits === 0`, system prompt nudges toward buying more
- Handles 429 (rate limit) and 402 (out of credits) with friendly messages
- Model: `google/gemini-3-flash-preview` (fast)

### 2. Frontend Components
- **`SupportChatButton.tsx`** — floating button bottom-right (z-50), pulse animation, MessageCircle icon, unread dot when closed mid-conversation
- **`SupportChatPanel.tsx`** — expandable panel (mobile: full-screen sheet; desktop: 380×560 floating card), header with close button, scrollable message list, input + send
- **`SupportMessage.tsx`** — renders user/assistant bubbles with `react-markdown` for formatting
- **Quick suggestion chips** shown when conversation is empty:
  - "How do I create a GIF?"
  - "How much does it cost?"
  - "Why is generation slow?"
  - "What photos work best?"
- **Typing indicator** — animated 3-dot bubble while streaming begins
- **"Contact support" fallback** — link in panel footer (mailto or external)

### 3. Streaming UX
- Token-by-token rendering (per Lovable AI streaming guidelines)
- Auto-scroll to bottom on new tokens
- Disabled send button while streaming
- AbortController to cancel mid-stream if panel closes

### 4. Integration into App
- Mount `<SupportChatButton />` in `src/pages/Index.tsx` (and result view) — single global mount near root
- Hidden during full-screen progress overlay to avoid clutter
- Reads `useAuth` + `useCredits` to pass context to backend

### 5. Smart Behaviors
- If `credits === 0` and user asks about generation/cost → assistant suggests buying credits and surfaces a "Buy credits" action chip in the message that opens `PricingModal`
- If user not signed in → assistant explains sign-in is required for generation

### 6. Files to Create/Edit
**Create:**
- `supabase/functions/support-chat/index.ts`
- `src/components/support/SupportChatButton.tsx`
- `src/components/support/SupportChatPanel.tsx`
- `src/components/support/SupportMessage.tsx`
- `src/hooks/useSupportChat.ts` (manages messages, streaming, abort)

**Edit:**
- `src/pages/Index.tsx` — mount the floating button
- `package.json` — add `react-markdown` dependency

### 7. Why Lovable AI over OpenAI direct
| Factor | Lovable AI | OpenAI direct |
|---|---|---|
| API key setup | None — auto-provisioned | User must create + add key |
| Billing | Existing workspace credits | Separate billing |
| Streaming | Supported | Supported |
| Model quality | Gemini 3 Flash / GPT-5 available | GPT-5 only |

Recommendation: **use Lovable AI**. Same OpenAI-compatible API, zero setup friction.

### Out of scope (can add later)
- Persisting chat history across sessions (currently in-memory per session)
- Admin-readable conversation logs
- Multi-language support
