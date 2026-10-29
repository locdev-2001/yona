package main

import (
	"sync"
	"time"

	waBinary "go.mau.fi/whatsmeow/binary"
	waTypes "go.mau.fi/whatsmeow/types"
	"go.mau.fi/whatsmeow/types/events"
)

// Kết cục và chiều theo hợp đồng nhật ký cuộc gọi chung của Laravel (content_attributes.call).
const (
	callDirectionInbound  = "inbound"
	callDirectionOutbound = "outbound"

	callOutcomeCompleted = "completed"
	callOutcomeMissed    = "missed"
	callOutcomeDeclined  = "declined"

	callMediaAudio = "audio"

	trackedCallMemory = 6 * time.Hour
)

type callInfo struct {
	Direction       string  `json:"direction"`
	Media           string  `json:"media"`
	Outcome         *string `json:"outcome"`
	DurationSeconds *int64  `json:"duration_seconds"`
}

// trackedCall gom các sự kiện của một cuộc gọi (đổ chuông, nghe máy, kết thúc) để báo một dòng
// lúc đổ chuông rồi cập nhật kết cục vào chính dòng đó.
type trackedCall struct {
	sourceID   string
	peerID     int64
	fromMe     bool
	media      string
	startedAt  time.Time
	answeredAt time.Time
	reported   bool
	finished   bool
	seenAt     time.Time
}

type callTracker struct {
	mu    sync.Mutex
	calls map[string]*trackedCall
}

func newCallTracker() *callTracker {
	return &callTracker{calls: make(map[string]*trackedCall)}
}

// lookup trả cuộc gọi đã biết, hoặc dựng mới từ meta khi đây là sự kiện đầu tiên bridge thấy
// của cuộc gọi đó (bridge khởi động lại giữa chừng, hoặc không nhận lời mời của chính chủ).
func (tracker *callTracker) lookup(meta waTypes.BasicCallMeta, selfID int64, data *waBinary.Node) (*trackedCall, bool) {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	now := time.Now()
	for id, call := range tracker.calls {
		if now.Sub(call.seenAt) > trackedCallMemory {
			delete(tracker.calls, id)
		}
	}
	if call, known := tracker.calls[meta.CallID]; known {
		call.seenAt = now
		return call, true
	}
	creatorID := jidFBID(meta.CallCreator)
	call := &trackedCall{
		sourceID:  encryptedSourceID("call-" + meta.CallID),
		fromMe:    creatorID == selfID,
		peerID:    creatorID,
		media:     callMediaAudio,
		startedAt: meta.Timestamp,
		seenAt:    now,
	}
	if call.fromMe {
		call.peerID = callPeer(meta, selfID, data)
	}
	if call.startedAt.IsZero() {
		call.startedAt = now
	}
	if call.peerID == 0 {
		return call, false
	}
	tracker.calls[meta.CallID] = call
	return call, true
}

// callPeer tìm người kia của cuộc gọi do chính chủ gọi đi: thiết bị gửi sự kiện (khi người kia
// nghe/từ chối/gác máy), không thì một JID khác chính chủ trong nội dung sự kiện.
func callPeer(meta waTypes.BasicCallMeta, selfID int64, data *waBinary.Node) int64 {
	candidates := []waTypes.JID{meta.From}
	if data != nil {
		candidates = append(candidates, nodeJIDs(*data)...)
	}
	for _, jid := range candidates {
		if jid.Server != waTypes.MessengerServer && jid.Server != waTypes.DefaultUserServer {
			continue
		}
		if id := jidFBID(jid); id != 0 && id != selfID {
			return id
		}
	}
	return 0
}

func nodeJIDs(node waBinary.Node) []waTypes.JID {
	var found []waTypes.JID
	for _, value := range node.Attrs {
		if jid, ok := value.(waTypes.JID); ok {
			found = append(found, jid)
		}
	}
	for _, child := range node.GetChildren() {
		found = append(found, nodeJIDs(child)...)
	}
	return found
}

func callMediaFromOffer(offer *events.CallOffer) string {
	if offer.Data != nil && offer.Data.GetChildByTag("video").Tag != "" {
		return callMediaVideo
	}
	return callMediaAudio
}

// handleCallEvent ghi cuộc gọi 1-1 (gọi đến lẫn chính chủ gọi đi từ app) thành một dòng trong
// hội thoại: báo lúc đổ chuông, cập nhật kết cục khi cuộc gọi kết thúc. Nghe máy diễn ra ở app gốc.
// Trả false khi không lưu được, để whatsmeow không xác nhận và Meta gửi lại.
func (slot *Slot) handleCallEvent(event any) bool {
	switch typed := event.(type) {
	case *events.CallOffer:
		return slot.trackCallStart(typed.BasicCallMeta, callMediaFromOffer(typed), typed.Data)
	case *events.CallOfferNotice:
		return slot.trackCallStart(typed.BasicCallMeta, typed.Media, typed.Data)
	case *events.CallAccept:
		slot.trackCallAnswer(typed.BasicCallMeta, typed.Data)
	case *events.CallReject:
		return slot.finishCall(typed.BasicCallMeta, typed.Data, callOutcomeDeclined)
	case *events.CallTerminate:
		slot.log.Info().Str("event", "call_terminate").Str("call_id", typed.CallID).Str("reason", typed.Reason).Send()
		return slot.finishCall(typed.BasicCallMeta, typed.Data, "")
	}
	return true
}

func (slot *Slot) trackedCall(meta waTypes.BasicCallMeta, data *waBinary.Node, eventName string) (*trackedCall, bool) {
	if !meta.GroupJID.IsEmpty() || meta.CallID == "" {
		return nil, false
	}
	call, ok := slot.calls.lookup(meta, slot.selfID(), data)
	logEvent := slot.log.Info().Str("event", eventName).Str("call_id", meta.CallID).Bool("from_me", call.fromMe).Int64("peer_id", call.peerID)
	if !ok {
		raw := ""
		if data != nil {
			raw = data.String()
		}
		logEvent.Str("from", meta.From.String()).Str("data", raw).Msg("call_peer_unknown")
		return nil, false
	}
	logEvent.Send()
	return call, true
}

func (slot *Slot) trackCallStart(meta waTypes.BasicCallMeta, media string, data *waBinary.Node) bool {
	call, ok := slot.trackedCall(meta, data, "call_offer")
	if !ok {
		return true
	}
	slot.calls.mu.Lock()
	if media == callMediaVideo {
		call.media = callMediaVideo
	}
	alreadyReported := call.reported || call.finished
	call.reported = true
	slot.calls.mu.Unlock()
	if alreadyReported {
		return true
	}
	if !slot.emitCall(call, nil, nil) {
		slot.calls.mu.Lock()
		call.reported = false
		slot.calls.mu.Unlock()
		return false
	}
	return true
}

func (slot *Slot) trackCallAnswer(meta waTypes.BasicCallMeta, data *waBinary.Node) {
	call, ok := slot.trackedCall(meta, data, "call_accept")
	if !ok {
		return
	}
	slot.calls.mu.Lock()
	if call.answeredAt.IsZero() {
		call.answeredAt = meta.Timestamp
		if call.answeredAt.IsZero() {
			call.answeredAt = time.Now()
		}
	}
	slot.calls.mu.Unlock()
}

// finishCall chốt kết cục một lần cho mỗi cuộc gọi (mỗi thiết bị có thể báo kết thúc riêng): đã
// nghe thì kèm thời lượng, chưa ai nghe thì là nhỡ (phía chính chủ gọi đi hiện "không trả lời").
func (slot *Slot) finishCall(meta waTypes.BasicCallMeta, data *waBinary.Node, outcome string) bool {
	call, ok := slot.trackedCall(meta, data, "call_finish")
	if !ok {
		return true
	}
	slot.calls.mu.Lock()
	if call.finished {
		slot.calls.mu.Unlock()
		return true
	}
	call.finished = true
	wasReported := call.reported
	call.reported = true
	var duration *int64
	if outcome == "" {
		outcome = callOutcomeMissed
		if !call.answeredAt.IsZero() {
			outcome = callOutcomeCompleted
			endedAt := meta.Timestamp
			if endedAt.IsZero() {
				endedAt = time.Now()
			}
			duration = new(max(int64(endedAt.Sub(call.answeredAt).Seconds()), 0))
		}
	}
	slot.calls.mu.Unlock()

	if !wasReported && !slot.emitCall(call, &outcome, duration) {
		slot.calls.mu.Lock()
		call.finished, call.reported = false, false
		slot.calls.mu.Unlock()
		return false
	}
	slot.emitCardUpdate(directChat(call.peerID), call.sourceID, call.fromMe, slot.callContent(call, &outcome, duration))
	return true
}

func (slot *Slot) callContent(call *trackedCall, outcome *string, duration *int64) *messageContent {
	direction, description := callDirectionInbound, "incoming_"+call.media+"_call"
	if call.fromMe {
		direction, description = callDirectionOutbound, "outgoing_"+call.media+"_call"
	}
	if outcome != nil && *outcome == callOutcomeMissed {
		description = "missed_" + description
	}
	content := newContent()
	content.Kind = contentKindCall
	content.Text = &description
	content.Call = &callInfo{Direction: direction, Media: call.media, Outcome: outcome, DurationSeconds: duration}
	return content
}

func (slot *Slot) emitCall(call *trackedCall, outcome *string, duration *int64) bool {
	if !slot.reportedEvents.addIfAbsent(call.sourceID) {
		return true
	}
	senderID := call.peerID
	if call.fromMe {
		senderID = slot.selfID()
	}
	err := slot.emitInbound(inboundMessage{
		sourceID: call.sourceID, chat: directChat(call.peerID), senderID: senderID, fromMe: call.fromMe,
		timestamp: call.startedAt, content: slot.callContent(call, outcome, duration), backfill: !slot.offlineSyncDone.Load(),
	})
	if err != nil {
		slot.reportedEvents.forget(call.sourceID)
		return false
	}
	return true
}
