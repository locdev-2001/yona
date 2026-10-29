package main

import (
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"go.mau.fi/whatsmeow/proto/waConsumerApplication"

	"go.mau.fi/mautrix-meta/pkg/messagix/table"
)

const (
	contentKindPoll   = "poll"
	trackedPollMemory = 7 * 24 * time.Hour
)

type pollOptionInfo struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Votes *int64 `json:"votes"`
}

// pollInfo là thẻ thăm dò theo hợp đồng trung tính; Votes/TotalVotes null khi kênh không cho biết
// số phiếu (thăm dò trong chat mã hoá đầu cuối, phiếu bầu cũng được mã hoá).
type pollInfo struct {
	ID         string           `json:"id"`
	Question   *string          `json:"question"`
	Options    []pollOptionInfo `json:"options"`
	TotalVotes *int64           `json:"total_votes"`
}

type trackedPollOption struct {
	text      string
	sortKey   int64
	voters    map[int64]bool
	voteCount int64
}

type trackedPoll struct {
	id           int64
	question     string
	options      map[int64]*trackedPollOption
	cardSourceID string
	cardFromMe   bool
	chat         Chat
	seenAt       time.Time
}

// pollTracker ghép các bảng thăm dò của Lightspeed (thăm dò, lựa chọn, phiếu) với tin nhắn báo
// tạo/bình chọn, để thẻ thăm dò nằm ở tin tạo và được cập nhật khi có người bình chọn.
type pollTracker struct {
	mu           sync.Mutex
	polls        map[int64]*trackedPoll
	pollByMsg    map[string]int64
	voteMessages map[string]bool
}

func newPollTracker() *pollTracker {
	return &pollTracker{polls: make(map[int64]*trackedPoll), pollByMsg: make(map[string]int64), voteMessages: make(map[string]bool)}
}

func (tracker *pollTracker) pollLocked(id int64) *trackedPoll {
	poll, known := tracker.polls[id]
	if !known {
		poll = &trackedPoll{id: id, options: make(map[int64]*trackedPollOption)}
		tracker.polls[id] = poll
	}
	poll.seenAt = time.Now()
	return poll
}

func (poll *trackedPoll) optionLocked(id int64) *trackedPollOption {
	option, known := poll.options[id]
	if !known {
		option = &trackedPollOption{voters: make(map[int64]bool)}
		poll.options[id] = option
	}
	return option
}

func (tracker *pollTracker) absorb(tbl *table.LSTable) {
	if len(tbl.LSAddPollForThread)+len(tbl.LSAddPollOption)+len(tbl.LSAddPollOptionV2)+len(tbl.LSAddPollVote)+len(tbl.LSAddPollVoteV2) == 0 {
		return
	}
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	tracker.forgetStaleLocked()
	for _, poll := range tbl.LSAddPollForThread {
		tracker.pollLocked(poll.PollID)
		if poll.LastUpdateMessageID != "" {
			tracker.pollByMsg[poll.LastUpdateMessageID] = poll.PollID
		}
	}
	for _, option := range append(append([]*table.LSAddPollOption(nil), tbl.LSAddPollOption...), tbl.LSAddPollOptionV2...) {
		known := tracker.pollLocked(option.PollID).optionLocked(option.OptionID)
		known.text = option.OptionText
		known.sortKey = option.SortKeyCreationTimestamp
	}
	for _, vote := range append(append([]*table.LSAddPollVote(nil), tbl.LSAddPollVote...), tbl.LSAddPollVoteV2...) {
		option := tracker.pollLocked(vote.PollID).optionLocked(vote.OptionID)
		if vote.ContactID != 0 {
			option.voters[vote.ContactID] = true
		}
		option.voteCount = max(option.voteCount, vote.VoteCount)
		if vote.MessageID != "" {
			tracker.pollByMsg[vote.MessageID] = vote.PollID
			tracker.voteMessages[vote.MessageID] = true
		}
	}
}

func (tracker *pollTracker) forgetStaleLocked() {
	now := time.Now()
	for id, poll := range tracker.polls {
		if now.Sub(poll.seenAt) > trackedPollMemory {
			delete(tracker.polls, id)
		}
	}
	if len(tracker.pollByMsg) > 4096 {
		tracker.pollByMsg = make(map[string]int64)
		tracker.voteMessages = make(map[string]bool)
	}
}

// pollMessage là việc phải làm với một tin Lightspeed thuộc về thăm dò.
type pollMessage struct {
	isCreation   bool
	poll         *trackedPoll
	cardSourceID string
	cardChat     Chat
	cardFromMe   bool
}

// classify nhận ra tin tạo thăm dò (tin đầu tiên của một thăm dò chưa có thẻ, không phải tin
// bình chọn) và tin bình chọn của thăm dò đã có thẻ.
func (tracker *pollTracker) classify(messageID string, card *table.WrappedXMA) (pollMessage, bool) {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	pollID, known := tracker.pollByMsg[messageID]
	if !known {
		return pollMessage{}, false
	}
	poll := tracker.polls[pollID]
	if poll == nil {
		return pollMessage{}, false
	}
	if card != nil && poll.question == "" {
		poll.question = strings.TrimSpace(card.TitleText)
	}
	return pollMessage{
		poll: poll, isCreation: poll.cardSourceID == "" && !tracker.voteMessages[messageID],
		cardSourceID: poll.cardSourceID, cardChat: poll.chat, cardFromMe: poll.cardFromMe,
	}, true
}

func (tracker *pollTracker) attachCard(poll *trackedPoll, sourceID string, chat Chat, fromMe bool) {
	tracker.mu.Lock()
	poll.cardSourceID, poll.chat, poll.cardFromMe = sourceID, chat, fromMe
	tracker.mu.Unlock()
}

func (tracker *pollTracker) snapshot(poll *trackedPoll) *pollInfo {
	tracker.mu.Lock()
	defer tracker.mu.Unlock()
	ids := make([]int64, 0, len(poll.options))
	for id := range poll.options {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(left, right int) bool {
		a, b := poll.options[ids[left]], poll.options[ids[right]]
		if a.sortKey != b.sortKey {
			return a.sortKey < b.sortKey
		}
		return ids[left] < ids[right]
	})
	info := &pollInfo{ID: strconv.FormatInt(poll.id, 10), Question: optionalString(poll.question), Options: make([]pollOptionInfo, 0, len(ids))}
	var total int64
	for _, id := range ids {
		option := poll.options[id]
		votes := max(int64(len(option.voters)), option.voteCount)
		total += votes
		info.Options = append(info.Options, pollOptionInfo{ID: strconv.FormatInt(id, 10), Text: option.text, Votes: new(votes)})
	}
	info.TotalVotes = &total
	return info
}

func firstPollCard(cards []*table.WrappedXMA) *table.WrappedXMA {
	for _, card := range cards {
		if card.CTA != nil && strings.HasPrefix(card.CTA.Type_, pollCTAPrefix) {
			return card
		}
	}
	return nil
}

// handleRegularPoll lo tin thuộc về thăm dò: tin tạo thành thẻ thăm dò, tin bình chọn giữ dòng
// hoạt động như app gốc và cập nhật số phiếu vào thẻ. false: không phải tin thăm dò đã biết.
func (slot *Slot) handleRegularPoll(message *table.WrappedMessage, sourceID string, chat Chat, fromMe bool) (*messageContent, bool) {
	kind, known := slot.polls.classify(message.MessageId, firstPollCard(message.XMAAttachments))
	if !known {
		return nil, false
	}
	slot.log.Info().Str("event", "regular_poll").Str("source_id", sourceID).Int64("poll_id", kind.poll.id).Bool("creation", kind.isCreation).Send()
	if kind.isCreation {
		slot.polls.attachCard(kind.poll, sourceID, chat, fromMe)
		content := newContent()
		content.Kind = contentKindPoll
		content.Text = optionalString(message.Text)
		content.Poll = slot.polls.snapshot(kind.poll)
		return content, true
	}
	if kind.cardSourceID != "" {
		update := newContent()
		update.Kind = contentKindPoll
		update.Poll = slot.polls.snapshot(kind.poll)
		slot.emitCardUpdate(kind.cardChat, kind.cardSourceID, kind.cardFromMe, update)
	}
	return nil, false
}

// encryptedPoll đọc thăm dò trong chat mã hoá đầu cuối: có câu hỏi và lựa chọn, phiếu bầu bị mã
// hoá riêng nên không có số phiếu.
func encryptedPoll(poll *waConsumerApplication.ConsumerApplication_PollCreationMessage) *pollInfo {
	info := &pollInfo{Question: optionalString(poll.GetName()), Options: make([]pollOptionInfo, 0, len(poll.GetOptions()))}
	for index, option := range poll.GetOptions() {
		info.Options = append(info.Options, pollOptionInfo{ID: strconv.Itoa(index), Text: option.GetOptionName()})
	}
	return info
}
