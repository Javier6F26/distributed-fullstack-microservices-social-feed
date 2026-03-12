import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [FormsModule, NgClass],
  templateUrl: './search-bar.component.html',
  styleUrls: ['./search-bar.component.scss'],
})
export class SearchBarComponent {
  @Output() searchChanged = new EventEmitter<string>();
  @Output() searchCleared = new EventEmitter<void>();

  searchQuery = signal<string>('');
  private searchSubject = new Subject<string>();

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.searchChanged.emit(query);
      });
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
    this.searchCleared.emit();
  }

  /**
   * Reset the search query (called from parent component)
   */
  reset(): void {
    this.searchQuery.set('');
    this.searchSubject.next('');
  }
}
