<?php

namespace App\Agent\Evals;

use DateTimeZone;

// Giám khảo: mô hình mạnh hơn đọc toàn bộ hội thoại (cả ghi chú nội bộ), đối chiếu với dữ
// liệu thật của shop và chấm theo Rubric + tiêu chí riêng của kịch bản.
final class Judge
{
    private const TIMEOUT_SECONDS = 180;

    private const TIME_FORMAT = 'd/m H:i';

    private const SYSTEM = <<<'TEXT'
        Bạn là giám khảo khó tính, chấm chất lượng một nhân viên tư vấn AI của shop thời trang online Việt Nam. Chuẩn so sánh: một nhân viên bán hàng online người Việt giỏi, tự làm việc được.

        Bạn nhận: dữ liệu thật của shop (sự thật DUY NHẤT; điều gì không có ở đó là shop không có dữ liệu), chỉ dẫn shop đặt cho AI, hồ sơ khách của kịch bản, các tiêu chí riêng, và bản ghi hội thoại (kể cả ghi chú nội bộ AI để lại cho nhân viên và sự kiện hệ thống). Khách là người đóng vai; bạn chỉ chấm phía AI.

        Cách chấm:
        - Chấm từng tiêu chí chung theo thang 1-5 (số nguyên) theo hướng dẫn kèm theo. Chỉ dùng null khi tiêu chí thật sự không áp dụng cho hội thoại này, và nói rõ vì sao.
        - Chấm từng tiêu chí riêng: passed = true/false. Không đủ bằng chứng trong hội thoại thì là false. Riêng tiêu chí có điều kiện ("Nếu …") mà điều kiện không xảy ra trong hội thoại thì passed = true, lý do ghi rõ là không phát sinh.
        - Đối chiếu từng con số AI nói (giá, phí, thời gian, size, số tài khoản…) với dữ liệu thật. Phép tính đúng từ dữ liệu thật là hợp lệ.
        - Ghi chú nội bộ khi chuyển người là để nhân viên đọc, không phải khách; chấm nó ở tiêu chí chuyển người.
        - Lý do ngắn gọn (tối đa 2 câu), cụ thể, bằng tiếng Việt.
        - weaknesses: tối đa 4 điểm yếu quan trọng nhất của AI trong hội thoại này, mỗi điểm kèm trích NGUYÊN VĂN câu AI liên quan (quote). Không có điểm yếu thì để danh sách rỗng.

        Trả lời đúng một đối tượng JSON, không thêm chữ nào khác:
        {"scores": {"<mã tiêu chí chung>": {"score": 1-5 hoặc null, "reason": "..."}, ...}, "criteria": [{"id": "<mã tiêu chí riêng>", "passed": true/false, "reason": "..."}], "summary": "<nhận xét chung 1-3 câu>", "weaknesses": [{"issue": "...", "quote": "..."}]}
        TEXT;

    public function __construct(private readonly EvalModel $model) {}

    /**
     * @param  list<TranscriptLine>  $transcript
     *
     * @throws EvalCallFailed
     */
    public function judge(Scenario $scenario, ShopFixture $shop, array $transcript, Outcome $outcome, EvalCallScope $scope, EvalSpend $spend): Verdict
    {
        return $this->model->askJson(
            EvalModel::JUDGE_ALIAS,
            self::SYSTEM."\n\n".$this->rubric(),
            $this->dossier($scenario, $shop, $transcript, $outcome),
            new EvalCallScope($scope->accountId, $scope->conversationId, $scope->scenarioId, self::TIMEOUT_SECONDS),
            $spend,
            fn (array $json) => Verdict::fromJudgeJson($json, $scenario),
        );
    }

    private function rubric(): string
    {
        $lines = ['Tiêu chí chung (mã: tên — hướng dẫn):'];

        foreach (Rubric::DIMENSIONS as $id => $dimension) {
            $lines[] = "- {$id}: {$dimension['label']} — {$dimension['guide']}";
        }

        return implode("\n", $lines);
    }

    /** @param list<TranscriptLine> $transcript */
    private function dossier(Scenario $scenario, ShopFixture $shop, array $transcript, Outcome $outcome): string
    {
        $timezone = new DateTimeZone($shop->account['timezone']);
        $sections = [
            "# Dữ liệu thật của shop\n".$shop->groundTruth(),
            "# Chỉ dẫn shop đặt cho AI\nTên AI: {$shop->aiAgent['name']}\nPersona: {$shop->aiAgent['persona']}\nChỉ dẫn: {$shop->aiAgent['instructions']}",
            "# Kịch bản: {$scenario->title}\nKhách: {$scenario->customerName}\nMục tiêu của khách: {$scenario->goal}\nTính cách: {$scenario->personality}\nCách nhắn: {$scenario->style}\nKết thúc: {$outcome->label()}",
            "# Tiêu chí riêng cần chấm\n".implode("\n", array_map(fn (Criterion $criterion) => "- {$criterion->id}: {$criterion->text}", $scenario->criteria)),
            "# Bản ghi hội thoại (giờ địa phương)\n".implode("\n", array_map(
                fn (TranscriptLine $line) => '['.$line->at->setTimezone($timezone)->format(self::TIME_FORMAT).'] '.$line->speaker->judgeLabel().' '.$line->text,
                $transcript,
            )),
        ];

        return implode("\n\n", $sections)."\n\nChấm và trả về JSON.";
    }
}
