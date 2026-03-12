import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateRangeFilterComponent } from './date-range-filter.component';
import { FormsModule } from '@angular/forms';

describe('DateRangeFilterComponent', () => {
  let component: DateRangeFilterComponent;
  let fixture: ComponentFixture<DateRangeFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateRangeFilterComponent, FormsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(DateRangeFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with null dates', () => {
    expect(component.startDate()).toBeNull();
    expect(component.endDate()).toBeNull();
  });

  it('should emit dateRangeChanged when start date changes', () => {
    spyOn(component.dateRangeChanged, 'emit');
    
    component.startDate.set('2024-01-01');
    component.onDateChange();

    expect(component.dateRangeChanged.emit).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: undefined,
    });
  });

  it('should emit dateRangeChanged when end date changes', () => {
    spyOn(component.dateRangeChanged, 'emit');
    
    component.endDate.set('2024-12-31');
    component.onDateChange();

    expect(component.dateRangeChanged.emit).toHaveBeenCalledWith({
      startDate: undefined,
      endDate: '2024-12-31',
    });
  });

  it('should auto-adjust end date if it is before start date', () => {
    component.startDate.set('2024-06-01');
    component.endDate.set('2024-01-01');
    component.onDateChange();

    expect(component.endDate()).toBe('2024-06-01');
  });

  it('should emit dateRangeCleared when clear button is clicked', () => {
    spyOn(component.dateRangeCleared, 'emit');
    
    component.startDate.set('2024-01-01');
    component.endDate.set('2024-12-31');
    component.clearDates();

    expect(component.startDate()).toBeNull();
    expect(component.endDate()).toBeNull();
    expect(component.dateRangeCleared.emit).toHaveBeenCalled();
  });

  it('should emit both dates when both are set', () => {
    spyOn(component.dateRangeChanged, 'emit');
    
    component.startDate.set('2024-01-01');
    component.endDate.set('2024-12-31');
    component.onDateChange();

    expect(component.dateRangeChanged.emit).toHaveBeenCalledWith({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });
});
