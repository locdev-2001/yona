import { calendarWeeks } from '../helpers/datePickerHelper';

// Port từ DatePicker/components/CalendarWeekLabel.vue
export default function CalendarWeekLabel() {
    return (
        <div className="max-w-md mx-auto grid grid-cols-7 gap-2">
            {calendarWeeks.map(day => (
                <div key={day.id} className="flex items-center justify-center font-medium text-sm w-9 h-7 py-1.5 px-2">
                    {day.label}
                </div>
            ))}
        </div>
    );
}
