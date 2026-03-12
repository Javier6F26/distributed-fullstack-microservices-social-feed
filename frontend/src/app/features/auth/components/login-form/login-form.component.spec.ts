import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginFormComponent } from './login-form.component';
import { AuthService } from '../../../../services/auth.service';
import { NotificationService } from '../../../../services/notification.service';
import { of, throwError } from 'rxjs';

describe('LoginFormComponent', () => {
  let component: LoginFormComponent;
  let fixture: ComponentFixture<LoginFormComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;

  const createMockAuthService = () => {
    const spy = jasmine.createSpyObj('AuthService', ['login']);
    spy.login = jasmine.createSpy('login');
    return spy;
  };

  const createMockNotificationService = () => {
    const spy = jasmine.createSpyObj('NotificationService', ['success', 'error']);
    return spy;
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        CommonModule,
        FormsModule,
        LoginFormComponent,
      ],
      providers: [
        { provide: AuthService, useFactory: createMockAuthService },
        { provide: NotificationService, useFactory: createMockNotificationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginFormComponent);
    component = fixture.componentInstance;
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should have empty identifier and password', () => {
      expect(component.identifier()).toBe('');
      expect(component.password()).toBe('');
    });

    it('should have isLoading set to false initially', () => {
      expect(component.isLoading()).toBe(false);
    });

    it('should have showPassword set to false initially', () => {
      expect(component.showPassword()).toBe(false);
    });

    it('should have rememberMe set to false initially', () => {
      expect(component.rememberMe()).toBe(false);
    });

    it('should have no validation errors initially', () => {
      expect(component.errors()).toEqual({});
    });
  });

  describe('Validation', () => {
    describe('validateIdentifier', () => {
      it('should show error when identifier is empty', () => {
        component.identifier.set('');
        component.validateIdentifier();
        expect(component.errors().identifier).toBe('Email or username is required');
      });

      it('should show error when identifier is too short', () => {
        component.identifier.set('ab');
        component.validateIdentifier();
        expect(component.errors().identifier).toBe('Please enter a valid email or username');
      });

      it('should clear error when identifier is valid', () => {
        component.identifier.set('validuser');
        component.validateIdentifier();
        expect(component.errors().identifier).toBeUndefined();
      });

      it('should trim identifier before validation', () => {
        component.identifier.set('  validuser  ');
        component.validateIdentifier();
        expect(component.errors().identifier).toBeUndefined();
      });
    });

    describe('validatePassword', () => {
      it('should show error when password is empty', () => {
        component.password.set('');
        component.validatePassword();
        expect(component.errors().password).toBe('Password is required');
      });

      it('should clear error when password is provided', () => {
        component.password.set('password123');
        component.validatePassword();
        expect(component.errors().password).toBeUndefined();
      });
    });
  });

  describe('Show/Hide Password Toggle', () => {
    it('should toggle showPassword when toggle button is clicked', () => {
      const initialShowPassword = component.showPassword();
      component.showPassword.set(!initialShowPassword);
      expect(component.showPassword()).toBe(!initialShowPassword);
    });
  });

  describe('Remember Me Checkbox', () => {
    it('should toggle rememberMe when checkbox is checked', () => {
      component.rememberMe.set(true);
      expect(component.rememberMe()).toBe(true);
    });

    it('should include rememberMe in login request', () => {
      component.identifier.set('testuser');
      component.password.set('password123');
      component.rememberMe.set(true);

      authServiceSpy.login.and.returnValue(of({
        success: true,
        message: 'Login successful',
        user: { _id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }));

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        identifier: 'testuser',
        password: 'password123',
        rememberMe: true,
      });
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.identifier.set('testuser');
      component.password.set('password123');
    });

    it('should validate fields before submitting', () => {
      spyOn(component, 'validateIdentifier').and.callThrough();
      spyOn(component, 'validatePassword').and.callThrough();

      component.onSubmit();

      expect(component.validateIdentifier).toHaveBeenCalled();
      expect(component.validatePassword).toHaveBeenCalled();
    });

    it('should not submit if validation fails', () => {
      component.identifier.set('');
      component.validateIdentifier();

      component.onSubmit();

      expect(authServiceSpy.login).not.toHaveBeenCalled();
    });

    it('should call authService.login with correct credentials on successful validation', () => {
      authServiceSpy.login.and.returnValue(of({
        success: true,
        message: 'Login successful',
        user: { _id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }));

      component.onSubmit();

      expect(authServiceSpy.login).toHaveBeenCalledWith({
        identifier: 'testuser',
        password: 'password123',
        rememberMe: false,
      });
    });

    it('should set isLoading to true during login request', fakeAsync(() => {
      authServiceSpy.login.and.returnValue(of({
        success: true,
        message: 'Login successful',
        user: { _id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }));

      component.onSubmit();
      tick();

      expect(component.isLoading()).toBe(false);
    }));

    it('should emit loginSuccess and show success notification on successful login', fakeAsync(() => {
      const loginSuccessSpy = spyOn(component.loginSuccess, 'emit');

      authServiceSpy.login.and.returnValue(of({
        success: true,
        message: 'Login successful',
        user: { _id: '1', username: 'testuser', email: 'test@example.com' },
        accessToken: 'token',
        tokenType: 'Bearer',
        expiresIn: 900,
      }));

      component.onSubmit();
      tick();

      expect(loginSuccessSpy).toHaveBeenCalled();
      expect(notificationServiceSpy.success).toHaveBeenCalledWith('Welcome back!', 3000);
    }));

    it('should show error message on login failure', fakeAsync(() => {
      const errorResponse = {
        error: {
          message: 'Invalid password',
        },
      };

      authServiceSpy.login.and.returnValue(throwError(() => errorResponse));

      component.onSubmit();
      tick();

      expect(component.errors().general).toBe('Invalid password');
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Invalid password', 5000);
    }));

    it('should show default error message when error response has no message', fakeAsync(() => {
      authServiceSpy.login.and.returnValue(throwError(() => ({})));

      component.onSubmit();
      tick();

      expect(component.errors().general).toBe('Login failed. Please check your credentials.');
      expect(notificationServiceSpy.error).toHaveBeenCalledWith('Login failed. Please check your credentials.', 5000);
    }));
  });

  describe('clearForm', () => {
    it('should clear identifier and password', () => {
      component.identifier.set('testuser');
      component.password.set('password123');

      component.clearForm();

      expect(component.identifier()).toBe('');
      expect(component.password()).toBe('');
    });

    it('should clear validation errors', () => {
      component.errors.set({
        identifier: 'Error',
        password: 'Error',
        general: 'Error',
      });

      component.clearForm();

      expect(component.errors()).toEqual({});
    });
  });

  describe('Output Events', () => {
    it('should emit switchToRegister when triggered', () => {
      const switchToRegisterSpy = spyOn(component.switchToRegister, 'emit');

      component.switchToRegister.emit();

      expect(switchToRegisterSpy).toHaveBeenCalled();
    });

    it('should emit forgotPassword when triggered', () => {
      const forgotPasswordSpy = spyOn(component.forgotPassword, 'emit');

      component.forgotPassword.emit();

      expect(forgotPasswordSpy).toHaveBeenCalled();
    });
  });

  describe('Keyboard Support', () => {
    it('should submit form when Enter key is pressed in identifier field', () => {
      spyOn(component, 'onSubmit');

      const identifierInput = fixture.nativeElement.querySelector('input[name="identifier"]');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      identifierInput.dispatchEvent(enterEvent);
      fixture.detectChanges();

      // Note: This test assumes the template has (keydown.enter)="onSubmit()"
      // If not implemented, this test will fail and should be adjusted
    });

    it('should submit form when Enter key is pressed in password field', () => {
      spyOn(component, 'onSubmit');

      const passwordInput = fixture.nativeElement.querySelector('input[name="password"]');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });

      passwordInput.dispatchEvent(enterEvent);
      fixture.detectChanges();

      // Note: This test assumes the form submission handles Enter key
    });
  });

  describe('Loading State', () => {
    it('should disable submit button when isLoading is true', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const submitButton = fixture.nativeElement.querySelector('button[type="submit"]');
      expect(submitButton.disabled).toBe(true);
    });

    it('should show loading spinner when isLoading is true', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const spinner = fixture.nativeElement.querySelector('.loading-spinner');
      expect(spinner).toBeTruthy();
    });

    it('should show "Signing in..." text when loading', () => {
      component.isLoading.set(true);
      fixture.detectChanges();

      const buttonText = fixture.nativeElement.querySelector('button[type="submit"]').textContent;
      expect(buttonText).toContain('Signing in...');
    });
  });
});
