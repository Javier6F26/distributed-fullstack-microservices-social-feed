import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { UserMenuComponent } from './user-menu.component';
import { AuthService } from '../../services/auth.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('UserMenuComponent', () => {
  let component: UserMenuComponent;
  let fixture: ComponentFixture<UserMenuComponent>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockUser = {
    _id: '123',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const spy = jasmine.createSpyObj('AuthService', ['logout', 'user', 'isAuthenticated']);
    spy.user.and.returnValue(mockUser);
    spy.isAuthenticated.and.returnValue(true);
    spy.logout.and.returnValue({} as unknown as ReturnType<typeof authServiceSpy.logout>);

    await TestBed.configureTestingModule({
      imports: [UserMenuComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthService, useValue: spy },
      ],
    }).compileComponents();

    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display user username when authenticated', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.username')?.textContent).toContain('testuser');
  });

  it('should display user initials', () => {
    const initials = component.getUserInitials();
    expect(initials).toBe('TE'); // testuser -> TE (first and last)
  });

  it('should toggle menu on trigger click', () => {
    expect(component.isMenuOpen()).toBe(false);
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(true);
    component.toggleMenu();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should close menu', () => {
    component.isMenuOpen.set(true);
    component.closeMenu();
    expect(component.isMenuOpen()).toBe(false);
  });

  it('should call logout on logout button click', () => {
    component.onLogout();
    expect(authServiceSpy.logout).toHaveBeenCalled();
  });

  it('should set logging out state during logout', () => {
    expect(component.isLoggingOut()).toBe(false);
    component.onLogout();
    expect(component.isLoggingOut()).toBe(true);
  });
});
