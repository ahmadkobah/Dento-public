# Support Session Implementation Plan

**Last Updated:** February 9, 2026  
**Status:** Core Implementation Complete (Phases 1-5)

## Current State Analysis

### What's Working vs Missing

| Component | Status | Notes |
|-----------|--------|-------|
| **Admin Submit Request** | ✅ Working | `admin-support-request` edge function (POST) |
| **Developer See Requests** | ✅ Working | `SupportSessions.jsx` with real-time updates |
| **Real-time Notifications** | ✅ Working | Polling every 3s (RLS blocks Supabase realtime) |
| **Chat UI** | ✅ Working | Chat interface in `SupportSessionWidget.jsx` |
| **Session State Sync** | ✅ Working | Admin sees when developer joins/ends |
| **Persistent Support Widget** | ✅ Working | Floating widget shows active session |
| **Screen Share (LiveKit)** | ✅ Working | `livekit-token` edge function + `useLiveKit.jsx` |
| **Session History** | ✅ Working | `SupportHistoryModal.jsx` for admin |
| **Session Rating** | ✅ Working | 1-5 stars after completion |
| **Developer-Initiated Sessions** | ✅ Working | Dev can reach out to tenant admins |
| **Session Recording** | ⏳ Partial | Database ready, LiveKit Cloud config needed |
| **Knowledge Base** | ❌ Not Started | Phase 11 |
| **Screen Annotations** | ❌ Not Started | Phase 12 |

---

## Implementation Complete (Feb 9, 2026)

### Admin → Developer Flow ✅
```
Admin clicks "Request Support"
  ↓
admin-support-request POST → Creates session (status: 'waiting')
  ↓
Developer portal polls/subscribes → Sees new session
  ↓
Developer clicks "Accept" → Session becomes 'active'
  ↓
Admin's SupportSessionWidget updates → Chat opens
  ↓
Messages exchanged via edge function PUT
  ↓
Session ends → Status: 'completed' → Rating prompt
```

### Developer → Admin Flow ✅
```
Developer initiates session for tenant
  ↓
tenant-impersonate creates session (developer_id set, requester_id null)
  ↓
Admin's useAdminSupport polls → Detects dev-initiated session
  ↓
Admin sees SupportSessionWidget with incoming session
  ↓
Chat/screen share proceeds
  ↓
Either party can end session
```

---

## Original Implementation Plan (Reference)

### Phase 1: Connect Admin Support Request to API
- Create new edge function `admin-support-request` that admin users can call
- Admin users insert session with `status: 'waiting'` (unauthenticated as developer)
- Alternative: Direct Supabase insert with RLS policy for admin users

### Phase 2: Real-time Notifications
- Add Supabase realtime subscription in Developer portal for new `waiting` sessions
- Add notification toast/badge when new support request arrives
- Add sound notification option

### Phase 3: Admin Session Widget
- Persistent floating widget showing active/waiting session status
- Chat interface for `chat` type sessions
- Screen share invitation for `screen_share` type sessions

### Phase 4: Two-way State Sync
- Admin subscribes to their session changes
- When developer joins, admin sees real-time update
- Chat messages if chat session

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/admin-support-request/index.ts` | Create | API for admin to request support |
| `src/admin/layouts/AdminLayout.jsx` | Modify | Call API + add session widget |
| `src/admin/components/SupportSessionWidget.jsx` | Create | Floating active session UI |
| `src/admin/components/SupportChat.jsx` | Create | Chat interface |
| `src/developer/pages/support/SupportSessions.jsx` | Modify | Add realtime subscription |
| `src/developer/hooks/useSupportNotifications.js` | Create | Real-time notification hook |
| `supabase/migrations/059_support_rls_admin.sql` | Create | RLS for admin support requests |

---

## Technical Details

### Database Schema (Already Exists)
- `support_sessions` table with columns:
  - `id`, `tenant_id`, `developer_id`, `impersonated_user_id`
  - `session_type` (screen_share, view_only, chat)
  - `status` (waiting, active, completed, expired)
  - `reason`, `resolution`, `notes`
  - `started_at`, `ended_at`, `expires_at`
  - `agent_name`, `tenant_name`, `user_name`

### Edge Function: `tenant-impersonate`
- Already handles GET, POST, PUT, DELETE for sessions
- POST creates session with `status: 'active'` (developer-initiated)
- Need separate flow for admin-initiated `waiting` sessions

### RLS Considerations
- Admin users need INSERT permission on `support_sessions`
- Admins should only see their own tenant's sessions
- Developers can see all sessions (for support dashboard)

---

## Phase 5: LiveKit Integration (Screen Share / View Only)

### Why LiveKit?
- Open-source WebRTC platform
- Self-hostable or use LiveKit Cloud
- Built-in screen sharing, recording, and room management
- SDKs for React (`@livekit/components-react`)

### LiveKit Architecture
```
Admin App                    LiveKit Server                Developer App
    │                             │                             │
    ├─── Request Room Token ──────┤                             │
    │◄── JWT Token ───────────────┤                             │
    │                             │                             │
    ├─── Join Room ───────────────┤◄── Join Room ───────────────┤
    │                             │                             │
    ├─── Share Screen ────────────┼─── Receive Stream ──────────┤
    │                             │                             │
    │◄── Remote Control ──────────┼─── Send Control ────────────┤
    │    (screen_share only)      │                             │
```

### LiveKit Components Needed

| Component | Purpose |
|-----------|---------|
| `LiveKitRoom` | Room connection wrapper |
| `VideoTrack` | Display screen share stream |
| `useLocalParticipant` | Access local user's tracks |
| `useRemoteParticipants` | Access remote participants |
| `ScreenShareButton` | Start/stop screen sharing |

### LiveKit Setup Steps
1. Create LiveKit Cloud account OR deploy self-hosted server
2. Add environment variables: `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
3. Create edge function to generate room tokens
4. Install `@livekit/components-react` and `livekit-client`

### Mode Differences

| Feature | Screen Share | View Only |
|---------|--------------|-----------|
| Admin shares screen | ✅ | ✅ |
| Developer can see | ✅ | ✅ |
| Remote control input | ✅ | ❌ |
| Developer annotations | ✅ | ❌ |
| Recording enabled | ✅ | ✅ |

---

## Phase 6: UI Improvements

### Session Type Selection Enhancements

| Improvement | Description | Implementation |
|-------------|-------------|----------------|
| **Type Tooltips** | Explain what each mode does on hover | Add `title` or Tooltip component |
| **Coming Soon State** | Disable unavailable modes with badge | `disabled` prop + "Coming Soon" label |
| **Chat Fallback** | Auto-select Chat if screen share unavailable | Check `navigator.mediaDevices` support |
| **Browser Check** | Warn if browser doesn't support screen capture | Show alert before selecting screen_share |
| **Connection Quality** | Show network status indicator | Use `navigator.connection` API |

### Tooltip Content
```
Screen Share: "Share your screen with our support team who can guide you remotely"
View Only: "Share your screen for observation only - no remote control"
Chat: "Text-based support conversation with our team"
```

### Browser Compatibility Check
```javascript
const supportsScreenShare = () => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
};
```

### Connection Quality Indicator
```javascript
const connection = navigator.connection || navigator.mozConnection;
const quality = connection?.effectiveType; // '4g', '3g', '2g', 'slow-2g'
```

---

## Phase 7: Session Recording & History

### Recording Requirements

| Session Type | What to Record | Storage |
|--------------|----------------|---------|
| **Chat** | All messages with timestamps | Database (`support_chat_messages` table) |
| **Screen Share** | Video recording of session | LiveKit Cloud Recording → Supabase Storage |
| **View Only** | Video recording of session | LiveKit Cloud Recording → Supabase Storage |

### New Database Tables

#### `support_chat_messages`
```sql
CREATE TABLE support_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES support_sessions(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  sender_type TEXT CHECK (sender_type IN ('admin', 'developer')),
  sender_name TEXT,
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_session ON support_chat_messages(session_id);
```

#### `support_session_recordings`
```sql
CREATE TABLE support_session_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES support_sessions(id) ON DELETE CASCADE,
  recording_type TEXT CHECK (recording_type IN ('video', 'audio', 'chat_export')),
  storage_path TEXT NOT NULL,
  storage_bucket TEXT DEFAULT 'support-recordings',
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Session History Features

| Feature | Description |
|---------|-------------|
| **Chat Transcript** | Searchable history of all chat messages |
| **Video Playback** | Play back screen share recordings |
| **Timeline View** | Show session actions + messages on timeline |
| **Export** | Download chat transcript as PDF/TXT |
| **Search** | Search past sessions by keyword, date, tenant |
| **Resolution Tracking** | Link sessions to issue tickets/fixes |

### Developer Portal - Session Detail View
```
Session #abc123 - Dento Clinic
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type: Screen Share | Status: Completed
Started: Feb 9, 2026 10:30 AM
Ended: Feb 9, 2026 11:15 AM
Duration: 45 minutes

📝 Reason: "Help with appointment scheduling setup"
✅ Resolution: "Fixed calendar integration settings"

[▶️ Watch Recording] [📄 View Chat Log] [📋 Export Report]

Timeline:
─────────
10:30 - Session started
10:32 - Screen share began
10:35 - [Chat] Admin: "Can you see my calendar page?"
10:35 - [Chat] Agent: "Yes, I see the issue..."
10:40 - Action logged: "Updated calendar settings"
11:15 - Session ended
```

---

## Updated Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/admin-support-request/index.ts` | Create | API for admin to request support |
| `supabase/functions/livekit-token/index.ts` | Create | Generate LiveKit room tokens |
| `src/admin/layouts/AdminLayout.jsx` | Modify | Call API + add session widget + tooltips |
| `src/admin/components/SupportSessionWidget.jsx` | Create | Floating active session UI |
| `src/admin/components/SupportChat.jsx` | Create | Chat interface |
| `src/admin/components/ScreenShareRoom.jsx` | Create | LiveKit screen share component |
| `src/developer/pages/support/SupportSessions.jsx` | Modify | Add realtime subscription |
| `src/developer/pages/support/SessionDetail.jsx` | Create | Session history detail view |
| `src/developer/components/SessionRecordingPlayer.jsx` | Create | Video playback component |
| `src/developer/hooks/useSupportNotifications.js` | Create | Real-time notification hook |
| `supabase/migrations/059_support_rls_admin.sql` | Create | RLS for admin support requests |
| `supabase/migrations/060_support_chat_messages.sql` | Create | Chat messages table |
| `supabase/migrations/061_support_recordings.sql` | Create | Recordings table |

---

## Progress Tracking

**Last Updated:** February 9, 2026

- [x] Phase 1: Admin API connection ✅ (Feb 9, 2026)
  - `admin-support-request/index.ts` edge function (GET/POST/PUT)
  - `useAdminSupport.js` hook for session management
  - Session creation with waiting status
- [x] Phase 2: Real-time notifications ✅ (Feb 9, 2026)
  - `useSupportNotifications.js` hook in Developer portal
  - Polling fallback every 3 seconds (RLS blocks real-time)
  - New session detection in admin portal
- [x] Phase 3: Admin session widget ✅ (Feb 9, 2026)
  - `SupportSessionWidget.jsx` - floating widget
  - Waiting/active/completed states
  - Chat interface for messages
- [x] Phase 4: Two-way state sync ✅ (Feb 9, 2026)
  - Admin sees when developer joins
  - Messages sync both directions
  - Session auto-clears when ended
- [x] Phase 5: LiveKit integration ✅ (Feb 9, 2026)
  - `livekit-token/index.ts` edge function
  - `useLiveKit.jsx` hook with full integration
  - `ScreenShareSession.jsx` for admin
  - `ScreenShareViewer.jsx` for developer
  - Screen share and view-only modes
- [ ] Phase 6: UI improvements (tooltips, browser check, connection quality)
- [ ] Phase 7: Session recording & history
  - Partial: `SupportHistoryModal.jsx` for admin history
  - Partial: Session rating implemented (1-5 stars)
- [ ] Phase 8: Security & consent
- [ ] Phase 9: Queue management & priority
  - Partial: Priority field exists in database
- [ ] Phase 10: Analytics & reporting
- [ ] Phase 11: Self-service & knowledge base (Admin)
- [ ] Phase 12: Session transfer & screen annotations (Developer)
- [ ] Phase 13: Tenant context panel (Developer)

---

## MISSING ITEMS IDENTIFIED

### Phase 8: Security & Consent

| Item | Description | Priority |
|------|-------------|----------|
| **Consent Modal** | Admin must accept privacy terms before screen share | High |
| **Session Timeout** | Auto-expire inactive sessions after X minutes | High |
| **Force Disconnect** | Developer can disconnect admin if needed | Medium |
| **Rate Limiting** | Limit support requests per tenant/day | Medium |
| **Data Retention Policy** | Auto-delete recordings after X days | Medium |
| **Screen Share Indicator** | Visible red banner when sharing screen | High |
| **Sensitive Data Warning** | Warn admin before sharing (passwords, PII) | High |

### Phase 9: Queue Management & Priority

| Item | Description | Priority |
|------|-------------|----------|
| **Priority Levels** | Urgent / Normal / Low request priority | High |
| **Queue Position** | "You are #3 in queue" indicator for admin | Medium |
| **Estimated Wait Time** | Based on average session duration | Low |
| **Developer Claiming** | Developer "claims" a session from queue | High |
| **Auto-Assignment** | Round-robin assign to available developers | Low |
| **Multiple Sessions** | Developer can handle multiple chat sessions | Medium |
| **Status Toggle** | Developer can set "Available" / "Busy" / "Offline" | Medium |

### Phase 10: Analytics & Reporting

| Metric | Description |
|--------|-------------|
| **Avg Response Time** | Time from request to developer joining |
| **Avg Session Duration** | Average time per session type |
| **Resolution Rate** | % of sessions marked "resolved" |
| **Sessions per Tenant** | Track heavy support users |
| **Sessions per Developer** | Agent workload distribution |
| **Peak Hours** | When most requests come in |
| **Satisfaction Score** | Post-session rating (1-5 stars) |

### Phase 11: Self-Service & Knowledge Base (Admin)

**Goal:** Reduce unnecessary support requests by helping admins solve common issues themselves.

| Component | Description | Priority |
|-----------|-------------|----------|
| **KB Search Before Request** | Show relevant articles when admin types issue | High |
| **Common Issues Panel** | "Try these first" suggestions in support modal | High |
| **Screenshot Attachment** | Admin can attach screenshot to explain issue | High |
| **Video Recording** | Admin can record short clip of issue | Medium |
| **Self-Solved Tracking** | Track when admin solves via KB (no session needed) | Medium |

#### UI Flow
```
Admin clicks "Request Support"
        ↓
┌─────────────────────────────────────┐
│ What do you need help with?         │
│ [Search for your issue...        ]  │
│                                     │
│ 📚 Suggested Articles:              │
│ • How to fix calendar sync          │
│ • Invoice printing troubleshoot     │
│ • Patient import guide              │
│                                     │
│ [None of these help - Request Live Support] │
└─────────────────────────────────────┘
```

#### Screenshot Attachment
```javascript
// Use browser's native clipboard or file input
const attachScreenshot = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read();
    const imageBlob = await clipboardItems[0].getType('image/png');
    // Upload to Supabase Storage
  } catch {
    // Fallback to file input
  }
};
```

### Phase 12: Session Transfer & Screen Annotations (Developer)

**Goal:** Give developers tools for efficient collaboration and handoffs.

| Component | Description | Priority |
|-----------|-------------|----------|
| **Transfer Session** | Hand off active session to another developer | High |
| **Escalate to Senior** | Mark as escalated, notify senior devs | High |
| **Screen Annotations** | Draw circles, arrows, highlight on shared screen | High |
| **Co-Browsing** | Two developers can join same session | Medium |
| **Session Notes Handoff** | Transfer includes context notes | High |

#### Transfer Flow
```
Developer A (in session)
    │
    ├── Click "Transfer"
    │
    ├── Select Developer B (shows online status)
    │
    ├── Add handoff note: "Customer needs billing help, I don't have access"
    │
    └── Confirm Transfer
            │
            ▼
Developer B receives notification
    │
    ├── "Session transferred from Dev A"
    ├── Shows handoff note + session history
    │
    └── [Accept] [Decline]
```

#### Screen Annotations (LiveKit)
```javascript
// Annotation overlay on top of screen share
const annotationTools = [
  { tool: 'pointer', icon: MousePointer, desc: 'Highlight cursor' },
  { tool: 'circle', icon: Circle, desc: 'Draw circles' },
  { tool: 'arrow', icon: ArrowRight, desc: 'Draw arrows' },
  { tool: 'text', icon: Type, desc: 'Add text label' },
  { tool: 'highlight', icon: Highlighter, desc: 'Yellow highlight' },
  { tool: 'clear', icon: Trash2, desc: 'Clear all' },
];
// Annotations sent via LiveKit data channel
```

### Phase 13: Tenant Context Panel (Developer)

**Goal:** Give developer full context about the tenant during support session.

#### Context Panel Design
```
┌────────────────────────────────────────┐
│ 🏢 TENANT CONTEXT                      │
├────────────────────────────────────────┤
│ Clinic: Dento Clinic                   │
│ Plan: Professional ($99/mo)            │
│ Users: 12 active                       │
│ Status: Active since Jan 2025          │
│ Domain: dentoclinic.dento.ae           │
├────────────────────────────────────────┤
│ 👤 REQUESTING USER                     │
│ Name: Dr. Ahmad                        │
│ Role: Owner                            │
│ Email: ahmad@dentoclinic.com           │
│ Last Login: 2 hours ago                │
├────────────────────────────────────────┤
│ 📋 RECENT SUPPORT HISTORY              │
│ • Feb 5 - Calendar sync issue ✅       │
│ • Jan 28 - Invoice printing ✅         │
│ • Jan 15 - Patient import ✅           │
├────────────────────────────────────────┤
│ 🔧 ENABLED MODULES                     │
│ ✓ Appointments  ✓ Billing              │
│ ✓ Patients      ✗ Tourism              │
│ ✓ Inventory     ✓ Staff                │
├────────────────────────────────────────┤
│ ⚠️ KNOWN ISSUES                        │
│ • Calendar API rate limited (global)   │
│ • SMS gateway maintenance tomorrow     │
├────────────────────────────────────────┤
│ 🔗 QUICK ACTIONS                       │
│ [View Tenant Dashboard]                │
│ [Impersonate Admin]                    │
│ [View Audit Log]                       │
│ [Open Tenant in New Tab]               │
└────────────────────────────────────────┘
```

#### Data Sources
| Section | Source |
|---------|--------|
| Tenant Info | `tenants` table |
| User Info | `users` + `user_profiles` |
| Support History | `support_sessions` WHERE tenant_id |
| Enabled Modules | `tenant_modules` table |
| Known Issues | `system_alerts` or `incident_log` table |

---

## Additional Missing Components

### Error Handling & Recovery

| Scenario | Handling |
|----------|----------|
| Developer disconnects mid-session | Auto-pause, notify admin, allow rejoin within 2 min |
| Admin closes browser | Session stays "active" for 5 min grace period |
| Network interruption | Show reconnecting indicator, auto-resume |
| LiveKit server down | Fallback to chat-only mode |
| Session expired while active | Send warning 5 min before expiry |

### Notification Channels (Missing)

| Channel | Use Case | Priority |
|---------|----------|----------|
| **Browser Push** | Notify developer of new requests | High |
| **Email** | "Session waiting for 10+ minutes" alert | Medium |
| **In-App Badge** | Red dot on Support icon in sidebar | High |
| **Sound Alert** | Ping when new request arrives | Medium |
| **SMS** | Urgent priority requests only | Low |

### Admin UX (Missing)

| Feature | Description |
|---------|-------------|
| **Cancel Request** | Admin can cancel before developer joins |
| **Session Rating** | 1-5 star rating after session ends |
| **Feedback Form** | "Was your issue resolved?" + comments |
| **Follow-up Request** | "Request follow-up" for unresolved issues |
| **Session History** | Admin can view their past sessions |
| **Estimated Wait** | Show "Avg wait: 5 minutes" |
| **KB Search Pre-Request** | Search knowledge base before requesting support |
| **Screenshot Attachment** | Paste or upload screenshot with request |
| **Video Clip Attachment** | Record short screen clip to explain issue |

### Developer UX (Missing)

| Feature | Description |
|---------|-------------|
| **Quick Responses** | Predefined messages for common issues |
| **Internal Notes** | Private notes not visible to admin |
| **Knowledge Base Link** | Link session to KB article |
| **Escalate** | Transfer to senior developer |
| **Session Tags** | Tag sessions (billing, calendar, bug, etc.) |
| **Bulk Actions** | Close multiple expired sessions |
| **Transfer Session** | Hand off session to another developer |
| **Screen Annotations** | Draw on shared screen (circles, arrows, highlights) |
| **Tenant Context Panel** | See tenant info, modules, history during session |
| **Co-Browsing** | Multiple developers join same session |

### Mobile Considerations

| Item | Status |
|------|--------|
| Responsive chat UI | Required |
| Mobile screen share | Not supported (show warning) |
| Touch-friendly buttons | Required |
| Offline handling | Queue message, send when online |

---

## Integration Points (Missing)

| Integration | Purpose |
|-------------|---------|
| **Audit Trail** | Already logging to `saas_audit_trail` ✅ |
| **Tenant Subscription** | Check if tenant has support access in plan |
| **Issue Tracking** | Link session to GitHub issue / internal ticket |
| **Email System** | Send session summary after completion |
| **Slack/Discord** | Notify team channel of urgent requests |

---

## Testing Strategy (Missing)

### Unit Tests
- `supportApi` functions
- Session state transitions
- Chat message formatting

### Integration Tests
- Admin request → Database insert
- Developer join → Status update
- Real-time subscription triggers

### E2E Tests
- Full flow: Request → Join → Chat → End → Rating
- Screen share permission flow
- Session timeout handling

---

## Updated Files to Create/Modify (Complete List)

| File | Action | Purpose |
|------|--------|---------|
| **Edge Functions** | | |
| `supabase/functions/admin-support-request/index.ts` | Create | API for admin to request support |
| `supabase/functions/livekit-token/index.ts` | Create | Generate LiveKit room tokens |
| **Admin App** | | |
| `src/admin/layouts/AdminLayout.jsx` | Modify | Call API + add session widget + tooltips |
| `src/admin/components/SupportSessionWidget.jsx` | Create | Floating active session UI |
| `src/admin/components/SupportChat.jsx` | Create | Chat interface |
| `src/admin/components/ScreenShareRoom.jsx` | Create | LiveKit screen share component |
| `src/admin/components/SupportConsentModal.jsx` | Create | Privacy consent before screen share |
| `src/admin/components/SessionRating.jsx` | Create | Post-session rating component |
| `src/admin/pages/SupportHistory.jsx` | Create | Admin view of past sessions |
| **Developer App** | | |
| `src/developer/pages/support/SupportSessions.jsx` | Modify | Add realtime subscription + queue |
| `src/developer/pages/support/SessionDetail.jsx` | Create | Session history detail view |
| `src/developer/pages/support/SupportAnalytics.jsx` | Create | Support metrics dashboard |
| `src/developer/components/SessionRecordingPlayer.jsx` | Create | Video playback component |
| `src/developer/components/QuickResponses.jsx` | Create | Predefined message templates |
| `src/developer/hooks/useSupportNotifications.js` | Create | Real-time notification hook |
| `src/developer/contexts/DeveloperStatusContext.jsx` | Create | Available/Busy/Offline status |
| **Migrations** | | |
| `supabase/migrations/059_support_rls_admin.sql` | Create | RLS for admin support requests |
| `supabase/migrations/060_support_chat_messages.sql` | Create | Chat messages table |
| `supabase/migrations/061_support_recordings.sql` | Create | Recordings table |
| `supabase/migrations/062_support_ratings.sql` | Create | Session ratings table |
| `supabase/migrations/063_developer_status.sql` | Create | Developer availability status |
| `supabase/migrations/064_support_attachments.sql` | Create | Screenshot/video attachments table |
| `supabase/migrations/065_knowledge_base.sql` | Create | KB articles table |
| **Admin App (New)** | | |
| `src/admin/components/KBSearchPanel.jsx` | Create | Knowledge base search before request |
| `src/admin/components/AttachmentUploader.jsx` | Create | Screenshot/video attachment component |
| **Developer App (New)** | | |
| `src/developer/components/TenantContextPanel.jsx` | Create | Tenant info sidebar during session |
| `src/developer/components/ScreenAnnotations.jsx` | Create | Drawing tools overlay |
| `src/developer/components/SessionTransfer.jsx` | Create | Transfer session modal |

---

## Dependency Order

```
Phase 1 (Admin API) ──┬──► Phase 2 (Realtime) ──► Phase 3 (Widget)
                      │                              │
                      │                              ▼
                      │                         Phase 4 (Sync)
                      │                              │
                      ▼                              ▼
              Phase 5 (LiveKit) ◄───────────────────┘
                      │
                      ▼
              Phase 6 (UI Polish)
                      │
                      ▼
              Phase 7 (Recording)
                      │
                      ▼
              Phase 8 (Security)
                      │
                      ▼
              Phase 9 (Queue)
                      │
                      ▼
              Phase 10 (Analytics)
                      │
                      ▼
              Phase 11 (Self-Service/KB) ◄── Can start earlier
                      │
                      ▼
              Phase 12 (Transfer/Annotations) ◄── Needs Phase 5
                      │
                      ▼
              Phase 13 (Tenant Context)
```

---

## Estimated Timeline

| Phase | Effort | Dependencies |
|-------|--------|--------------|
| Phase 1 | 2-3 hours | None |
| Phase 2 | 3-4 hours | Phase 1 |
| Phase 3 | 4-6 hours | Phase 1 |
| Phase 4 | 2-3 hours | Phase 2, 3 |
| Phase 5 | 8-12 hours | LiveKit account, Phase 4 |
| Phase 6 | 2-3 hours | Phase 3 |
| Phase 7 | 6-8 hours | Phase 5 |
| Phase 8 | 4-6 hours | Phase 5 |
| Phase 9 | 4-6 hours | Phase 2 |
| Phase 10 | 4-6 hours | All phases |
| Phase 11 | 6-8 hours | Phase 1 (can parallelize) |
| Phase 12 | 6-8 hours | Phase 5 (LiveKit) |
| Phase 13 | 3-4 hours | Phase 2 |
| **Total** | **55-75 hours** | |
