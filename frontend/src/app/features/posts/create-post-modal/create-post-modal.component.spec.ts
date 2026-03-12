import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CreatePostModalComponent } from './create-post-modal.component';
import { PostService } from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { of, throwError } from 'rxjs';

describe('CreatePostModalComponent', () => {
  let component: CreatePostModalComponent;
  let fixture: ComponentFixture<CreatePostModalComponent>;
  let postServiceSpy: jasmine.SpyObj<PostService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const postSpy = jasmine.createSpyObj('PostService', ['createPost']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['showSuccess', 'showError']);
    const authSpy = jasmine.createSpyObj('AuthService', ['isAuthenticated']);

    await TestBed.configureTestingModule({
      imports: [
        ReactiveFormsModule, 
        HttpClientTestingModule,
        CreatePostModalComponent
      ],
      providers: [
        { provide: PostService, useValue: postSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: AuthService, useValue: authSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreatePostModalComponent);
    component = fixture.componentInstance;
    postServiceSpy = TestBed.inject(PostService) as jasmine.SpyObj<PostService>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeDefined();
  });

  it('should initialize form with empty values', () => {
    expect(component.postForm).toBeDefined();
    expect(component.postForm.get('title')?.value).toBe('');
    expect(component.postForm.get('body')?.value).toBe('');
  });

  it('should have invalid form when empty', () => {
    expect(component.postForm.valid).toBeFalse();
    expect(component.title?.valid).toBeFalse();
    expect(component.body?.valid).toBeFalse();
  });

  it('should validate title minimum length (5 chars)', () => {
    const title = component.title;
    
    title?.setValue('abc');
    expect(title?.valid).toBeFalse();
    expect(title?.errors?.['minlength']).toBeTruthy();

    title?.setValue('valid title');
    expect(title?.valid).toBeTrue();
  });

  it('should validate title maximum length (100 chars)', () => {
    const title = component.title;
    
    title?.setValue('a'.repeat(101));
    expect(title?.valid).toBeFalse();
    expect(title?.errors?.['maxlength']).toBeTruthy();

    title?.setValue('a'.repeat(100));
    expect(title?.valid).toBeTrue();
  });

  it('should validate body minimum length (10 chars)', () => {
    const body = component.body;
    
    body?.setValue('short');
    expect(body?.valid).toBeFalse();
    expect(body?.errors?.['minlength']).toBeTruthy();

    body?.setValue('This is a valid body text.');
    expect(body?.valid).toBeTrue();
  });

  it('should validate body maximum length (5000 chars)', () => {
    const body = component.body;
    
    body?.setValue('a'.repeat(5001));
    expect(body?.valid).toBeFalse();
    expect(body?.errors?.['maxlength']).toBeTruthy();

    body?.setValue('a'.repeat(5000));
    expect(body?.valid).toBeTrue();
  });

  it('should require title', () => {
    const title = component.title;
    
    title?.setValue('');
    expect(title?.valid).toBeFalse();
    expect(title?.errors?.['required']).toBeTruthy();
  });

  it('should require body', () => {
    const body = component.body;
    
    body?.setValue('');
    expect(body?.valid).toBeFalse();
    expect(body?.errors?.['required']).toBeTruthy();
  });

  it('should call onSubmit when form is valid and user is authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    postServiceSpy.createPost.and.returnValue(of({ success: true, data: {} }));

    component.postForm.patchValue({
      title: 'Valid Title',
      body: 'This is a valid body with enough characters.',
    });

    component.onSubmit();
    tick();

    expect(postServiceSpy.createPost).toHaveBeenCalledWith('Valid Title', 'This is a valid body with enough characters.');
    expect(notificationServiceSpy.showSuccess).toHaveBeenCalledWith('Post created successfully!');
  }));

  it('should show error notification when post creation fails', fakeAsync(() => {
    authServiceSpy.isAuthenticated.and.returnValue(true);
    postServiceSpy.createPost.and.returnValue(throwError(() => new Error('API Error')));

    component.postForm.patchValue({
      title: 'Valid Title',
      body: 'This is a valid body with enough characters.',
    });

    component.onSubmit();
    tick();

    expect(notificationServiceSpy.showError).toHaveBeenCalled();
  }));

  it('should not submit when form is invalid', () => {
    authServiceSpy.isAuthenticated.and.returnValue(true);

    component.postForm.patchValue({
      title: 'Short', // Too short
      body: 'This is valid',
    });

    component.onSubmit();

    expect(postServiceSpy.createPost).not.toHaveBeenCalled();
  });

  it('should not submit when user is not authenticated', fakeAsync(() => {
    authServiceSpy.isAuthenticated.and.returnValue(false);

    component.postForm.patchValue({
      title: 'Valid Title',
      body: 'This is a valid body with enough characters.',
    });

    component.onSubmit();
    tick();

    expect(postServiceSpy.createPost).not.toHaveBeenCalled();
  }));

  it('should emit modalClosed event when closeModal is called', () => {
    spyOn(component.modalClosed, 'emit');

    component.closeModal();

    expect(component.modalClosed.emit).toHaveBeenCalled();
  });

  it('should auto-resize textarea on input', () => {
    const textarea = document.createElement('textarea');
    textarea.scrollHeight = 200;
    
    const event = { target: textarea } as unknown as Event;
    component.autoResize(event);

    expect(textarea.style.height).toBe('200px');
  });
});
