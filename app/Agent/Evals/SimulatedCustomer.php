<?php

namespace App\Agent\Evals;

// Khách giả: mô hình đóng vai khách theo hồ sơ của kịch bản, đọc phần công khai của hội
// thoại và viết tin tiếp theo. Không bao giờ thấy tiêu chí chấm.
final class SimulatedCustomer
{
    private const TIMEOUT_SECONDS = 60;

    private const SYSTEM = <<<'TEXT'
        Bạn đóng vai một KHÁCH HÀNG người Việt đang nhắn tin với một shop thời trang online qua khung chat trên website. Bạn không phải trợ lý, bạn là khách. Shop có thể là người hoặc máy, bạn không biết trước.

        Luật đóng vai:
        - Mỗi lần chỉ viết MỘT tin nhắn tiếp theo của khách, ngắn và tự nhiên như nhắn tin thật. Giữ đúng tính cách và cách nhắn trong hồ sơ suốt cuộc trò chuyện (kể cả viết tắt, không dấu, nếu hồ sơ nói vậy).
        - Phản ứng như khách thật với câu trả lời vừa nhận: hỏi tiếp điều còn thiếu cho mục tiêu, thắc mắc khi shop trả lời thiếu hoặc khó hiểu, đồng ý khi thấy hợp lý. Không tự bịa thông tin về shop.
        - Chỉ đưa thông tin cá nhân trong hồ sơ khi shop hỏi hoặc khi bạn quyết định đặt hàng.
        - Không lặp lại y nguyên câu đã hỏi, trừ khi shop chưa trả lời câu đó.
        - Khi mục tiêu đã đạt (đã có đủ thông tin cần, hoặc đã đặt hàng xong, hoặc shop đã nhận chuyển cho nhân viên và bạn chấp nhận chờ): end = "goal_met".
        - Khi shop làm bạn chán, bực hoặc rõ ràng không giúp được và bạn không muốn nhắn nữa: end = "gave_up".
        - Còn lại: end = "continue" và phải có tin nhắn.

        Trả lời đúng một đối tượng JSON, không thêm chữ nào khác:
        {"message": "<tin nhắn tiếp theo gửi shop; để trống nếu end khác continue và bạn không nhắn thêm>", "end": "continue | goal_met | gave_up", "why": "<lý do ngắn cho quyết định, shop không thấy>"}
        TEXT;

    public function __construct(private readonly EvalModel $model) {}

    /**
     * @param  list<TranscriptLine>  $transcript
     *
     * @throws EvalCallFailed
     */
    public function next(Scenario $scenario, array $transcript, bool $shopAnswered, EvalCallScope $scope, EvalSpend $spend): CustomerMove
    {
        return $this->model->askJson(
            EvalModel::CUSTOMER_ALIAS,
            self::SYSTEM."\n\n".$this->profile($scenario),
            $this->conversation($transcript, $shopAnswered),
            new EvalCallScope($scope->accountId, $scope->conversationId, $scope->scenarioId, self::TIMEOUT_SECONDS),
            $spend,
            fn (array $json) => CustomerMove::fromJson($json),
        );
    }

    private function profile(Scenario $scenario): string
    {
        $lines = [
            'Hồ sơ của bạn:',
            "- Tên: {$scenario->customerName}",
            "- Mục tiêu: {$scenario->goal}",
            "- Tính cách: {$scenario->personality}",
            "- Cách nhắn: {$scenario->style}",
        ];

        if ($scenario->customerFacts !== []) {
            $lines[] = '- Thông tin của bạn:';

            foreach ($scenario->customerFacts as $key => $value) {
                $lines[] = "  - {$key}: {$value}";
            }
        }

        return implode("\n", $lines);
    }

    /** @param list<TranscriptLine> $transcript */
    private function conversation(array $transcript, bool $shopAnswered): string
    {
        $lines = ['Cuộc trò chuyện đến giờ (theo thứ tự thời gian):'];

        foreach ($transcript as $line) {
            if ($line->speaker->isPublic()) {
                $who = $line->speaker === Speaker::Customer ? '[Bạn]' : '[Shop]';
                $lines[] = "{$who} {$line->text}";
            }
        }

        if (! $shopAnswered) {
            $lines[] = '(Shop chưa trả lời tin nhắn cuối của bạn.)';
        }

        $lines[] = '';
        $lines[] = 'Viết bước tiếp theo của bạn dưới dạng JSON.';

        return implode("\n", $lines);
    }
}
