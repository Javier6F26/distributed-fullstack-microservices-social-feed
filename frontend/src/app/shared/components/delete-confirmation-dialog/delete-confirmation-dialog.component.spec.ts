import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { DeleteConfirmationDialogComponent } from './delete-confirmation-dialog.component';

describe('DeleteConfirmationDialogComponent', () => {
  let component: DeleteConfirmationDialogComponent;
  let fixture: ComponentFixture<DeleteConfirmationDialogComponent>;
  let activeModalSpy: any;

  beforeEach(async () => {
    activeModalSpy = {
      close: vi.fn(),
      dismiss: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [DeleteConfirmationDialogComponent],
      providers: [
        { provide: NgbActiveModal, useValue: activeModalSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteConfirmationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default message', () => {
    expect(component.message).toBe('Are you sure you want to delete this? This action cannot be undone.');
  });

  it('should have default title', () => {
    expect(component.title).toBe('Confirm Delete');
  });

  it('should accept custom message', () => {
    component.message = 'Custom delete message';
    fixture.detectChanges();

    expect(component.message).toBe('Custom delete message');
  });

  it('should accept custom title', () => {
    component.title = 'Custom Title';
    fixture.detectChanges();

    expect(component.title).toBe('Custom Title');
  });

  it('should call modal close with true on confirm', () => {
    component.confirm();

    expect(activeModalSpy.close).toHaveBeenCalledWith(true);
  });

  it('should call modal dismiss on cancel', () => {
    component.cancel();

    expect(activeModalSpy.dismiss).toHaveBeenCalled();
  });

  describe('Template', () => {
    it('should display title', () => {
      component.title = 'Test Title';
      fixture.detectChanges();

      const title = fixture.nativeElement.querySelector('.modal-title');
      expect(title.textContent).toContain('Test Title');
    });

    it('should display message', () => {
      component.message = 'Test message';
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.modal-body p');
      expect(message.textContent).toContain('Test message');
    });

    it('should have Cancel button', () => {
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const cancelButton = Array.from(buttons).find((b: any) => b.textContent.includes('Cancel'));

      expect(cancelButton).toBeTruthy();
      expect(cancelButton?.classList).toContain('btn-secondary');
    });

    it('should have Delete button', () => {
      fixture.detectChanges();

      const buttons = fixture.nativeElement.querySelectorAll('button');
      const deleteButton = Array.from(buttons).find((b: any) => b.textContent.includes('Delete'));

      expect(deleteButton).toBeTruthy();
      expect(deleteButton?.classList).toContain('btn-danger');
    });

    it('should have close button in header', () => {
      fixture.detectChanges();

      const closeButton = fixture.nativeElement.querySelector('.btn-close');
      expect(closeButton).toBeTruthy();
    });
  });
});
