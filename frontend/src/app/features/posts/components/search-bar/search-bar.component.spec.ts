import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchBarComponent } from './search-bar.component';
import { FormsModule } from '@angular/forms';

describe('SearchBarComponent', () => {
  let component: SearchBarComponent;
  let fixture: ComponentFixture<SearchBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBarComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty search query', () => {
    expect(component.searchQuery()).toBe('');
  });

  it('should emit searchChanged event with debouncing', (done) => {
    component.searchChanged.subscribe((query) => {
      expect(query).toBe('test');
      done();
    });

    component.onSearchChange('test');
  });

  it('should emit searchCleared event when clear button is clicked', () => {
    spyOn(component.searchCleared, 'emit');
    
    component.searchQuery.set('test');
    component.clearSearch();

    expect(component.searchQuery()).toBe('');
    expect(component.searchCleared.emit).toHaveBeenCalled();
  });

  it('should update search query on input change', () => {
    component.onSearchChange('hello');
    expect(component.searchQuery()).toBe('hello');
  });

  it('should not emit searchChanged for same consecutive values', (done) => {
    const emitSpy = jasmine.createSpy('emit');
    component.searchChanged.subscribe(emitSpy);

    component.onSearchChange('test');
    component.onSearchChange('test');

    setTimeout(() => {
      expect(emitSpy).toHaveBeenCalledTimes(1);
      done();
    }, 400);
  });
});
