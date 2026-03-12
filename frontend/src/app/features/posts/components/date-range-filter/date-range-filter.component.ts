import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-date-range-filter',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './date-range-filter.component.html',
  styleUrls: ['./date-range-filter.component.scss'],
})
export class DateRangeFilterComponent {
  @Output() dateRangeChanged = new EventEmitter<{
    startDate?: string;
    endDate?: string;
  }>();
  @Output() dateRangeCleared = new EventEmitter<void>();

  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);

  onDateChange(): void {
    // Validate end date is not before start date
    const startValue = this.startDate();
    const endValue = this.endDate();

    if (startValue && endValue) {
      const start = new Date(startValue);
      const end = new Date(endValue);

      if (end < start) {
        this.endDate.set(startValue);
      }
    }

    this.dateRangeChanged.emit({
      startDate: startValue ?? undefined,
      endDate: endValue ?? undefined,
    });
  }

  clearDates(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    this.dateRangeCleared.emit();
  }
}
