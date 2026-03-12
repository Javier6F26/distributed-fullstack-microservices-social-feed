import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommentCardComponent } from './comment-card.component';

describe('CommentCardComponent', () => {
  let component: CommentCardComponent;
  let fixture: ComponentFixture<CommentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommentCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CommentCardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
    };
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should display author username', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.author-name')?.textContent).toContain('testuser');
  });

  it('should display "Anonymous" when no author', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: '',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.author-name')?.textContent).toContain('Anonymous');
  });

  it('should display comment body', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'This is a test comment',
      createdAt: new Date().toISOString(),
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.comment-body')?.textContent).toContain('This is a test comment');
  });

  it('should show pending badge when comment is pending', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
      pending: true,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.pending-badge')).toBeTruthy();
  });

  it('should show edited badge when comment is edited', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
      isEdited: true,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.edited-badge')).toBeTruthy();
  });

  it('should display like count', () => {
    component.comment = {
      _id: '1',
      postId: 'post-123',
      authorUsername: 'testuser',
      body: 'Test comment',
      createdAt: new Date().toISOString(),
      likes: 5,
    };
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.comment-action span')?.textContent).toContain('5');
  });

  describe('getRelativeTime', () => {
    it('should return "Just now" for recent comments', () => {
      const now = new Date().toISOString();
      expect(component.getRelativeTime(now)).toBe('Just now');
    });

    it('should return minutes ago for comments < 1 hour old', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      expect(component.getRelativeTime(fiveMinutesAgo)).toContain('m ago');
    });

    it('should return hours ago for comments < 24 hours old', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60000).toISOString();
      expect(component.getRelativeTime(twoHoursAgo)).toContain('h ago');
    });

    it('should return days ago for comments < 7 days old', () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60000).toISOString();
      expect(component.getRelativeTime(threeDaysAgo)).toContain('d ago');
    });
  });
});
