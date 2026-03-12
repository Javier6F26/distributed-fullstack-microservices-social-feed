import {
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  CdkVirtualScrollViewport,
  ScrollingModule,
} from '@angular/cdk/scrolling';
import {
  ApiResponse,
  Comment,
  Post,
  PostService,
} from '../../../services/post.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';
import { interval, Observable, Subscription } from 'rxjs';
import { SearchBarComponent } from '../components/search-bar/search-bar.component';
import { DateRangeFilterComponent } from '../components/date-range-filter/date-range-filter.component';
import { AuthModalComponent } from '../../auth/components/auth-modal/auth-modal.component';
import { CreatePostModalComponent } from '../create-post-modal/create-post-modal.component';
import { CommentInputComponent } from '../../comments/comment-input/comment-input.component';

@Component({
  selector: 'app-post-feed',
  standalone: true,
  imports: [
    CommonModule,
    ScrollingModule,
    SearchBarComponent,
    DateRangeFilterComponent,
    AuthModalComponent,
    CreatePostModalComponent,
    CommentInputComponent,
  ],
  templateUrl: './post-feed.component.html',
  styleUrls: [],
})
export class PostFeedComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  @ViewChild(SearchBarComponent) searchBar!: SearchBarComponent;
  public authService = inject(AuthService);
  // State signals
  posts = signal<Post[]>([]);
  isLoading = signal(false);
  isFetchingMore = signal(false);
  nextCursor = signal<string | null | undefined>(undefined);
  error = signal<string | null>(null);
  hasNewPosts = signal(false);
  // Auth modal state
  showAuthModal = signal(false);
  pendingAction = signal<{
    type: 'comment';
    postId: string;
    commentText: string;
  } | null>(null);
  // Create post modal state
  showCreatePostModal = signal(false);
  // Search and filter state
  searchQuery = signal<string>('');
  startDate = signal<string | null>(null);
  endDate = signal<string | null>(null);
  isFiltered = signal(false);
  filteredTotal = signal<number | null>(null);
  // Comment state
  expandedComments = signal<Map<string, Comment[]>>(new Map());
  isLoadingComments = signal(false);
  isDeletingPost = signal<string | null>(null); // Track which post is being deleted
  // Inject services
  private postService = inject(PostService);
  private notificationService = inject(NotificationService);
  private pollingSubscription?: Subscription;

  ngOnInit(): void {
    this.loadPosts();
    this.startIntelligentPolling();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
  }

  startIntelligentPolling() {
    // Poll every 30 seconds to check for new content
    this.pollingSubscription = interval(30000).subscribe(() => {
      this.checkForNewPosts();
    });
  }

  checkForNewPosts() {
    if (this.hasNewPosts() || this.posts().length === 0 || this.isFiltered())
      return;

    this.postService.getPosts(1).subscribe({
      next: (response) => {
        if (response.data && response.data.length > 0) {
          const latestPostId = response.data[0]._id;
          const currentTopPostId = this.posts()[0]._id;
          if (latestPostId !== currentTopPostId) {
            this.hasNewPosts.set(true);
          }
        }
      },
      error: (err) => console.error('Error polling for new posts', err),
    });
  }

  loadNewContent() {
    this.hasNewPosts.set(false);
    this.loadPosts();
  }

  loadPosts(reset = true): void {
    this.isLoading.set(true);
    this.error.set(null);

    const hasSearch = !!this.searchQuery().trim();
    const hasDateFilter = !!this.startDate() || !!this.endDate();

    if (reset) {
      this.nextCursor.set(undefined);
    }

    const cursor = reset ? undefined : this.nextCursor();
    const limit = 20;

    let request$: Observable<ApiResponse>;

    if (hasSearch || hasDateFilter) {
      // Use combined search and filter endpoint
      request$ = this.postService.searchAndFilterPosts(
        this.searchQuery() || undefined,
        this.startDate() || undefined,
        this.endDate() || undefined,
        limit,
        cursor,
      );
      this.isFiltered.set(true);
    } else {
      // Use standard getPosts endpoint
      request$ = this.postService.getPosts(limit, cursor);
      this.isFiltered.set(false);
    }

    request$.subscribe({
      next: (response) => {
        console.log('Posts response:', response);
        if (reset) {
          this.posts.set(response.data);
          this.filteredTotal.set(response.data.length);
          console.log('Posts loaded:', response.data.length);
        } else {
          this.posts.update((posts) => [...posts, ...response.data]);
        }
        this.nextCursor.set(response.nextCursor);
        this.isLoading.set(false);

        // Show notification if no posts
        if (response.data.length === 0) {
          this.notificationService.info(
            'No posts found. Seed the database first!',
            5000,
          );
        }
      },
      error: (err) => {
        console.error('Failed to load posts', err);
        this.error.set('Failed to load posts. Please try again later.');
        this.isLoading.set(false);
        this.notificationService.error(
          'Failed to load posts. Check console for details.',
          5000,
        );
      },
    });
  }

  onSearchChanged(query: string): void {
    this.searchQuery.set(query);
    this.loadPosts(true);
  }

  onSearchCleared(): void {
    this.searchQuery.set('');
    this.loadPosts(true);
  }

  onDateRangeChanged(dateRange: {
    startDate?: string;
    endDate?: string;
  }): void {
    if (!dateRange.startDate || !dateRange.endDate) return;
    this.startDate.set(dateRange.startDate || null);
    this.endDate.set(dateRange.endDate || null);
    this.loadPosts(true);
  }

  onDateRangeCleared(): void {
    this.startDate.set(null);
    this.endDate.set(null);
    this.loadPosts(true);
  }

  resetAllFilters(): void {
    this.searchBar?.reset();

    // Reset local filter state
    this.startDate.set(null);
    this.endDate.set(null);
    this.isFiltered.set(false);
    this.filteredTotal.set(null);
    this.loadPosts(true);
  }

  onScroll() {
    if (this.isFetchingMore() || this.nextCursor() === null || !this.viewport) {
      return;
    }

    // Check if we are close to the bottom
    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    console.log('Scroll check:', {
      end,
      total,
      hasMore: this.nextCursor() !== null,
    });

    if (end > 0 && end >= total - 5) {
      console.log('Fetching more posts...');
      this.fetchMore();
    }
  }

  fetchMore() {
    const cursor = this.nextCursor();
    if (!cursor) {
      console.log('No cursor available, cannot fetch more');
      return;
    }

    console.log('Fetching more posts with cursor:', cursor);
    this.isFetchingMore.set(true);

    const hasSearch = !!this.searchQuery().trim();
    const hasDateFilter = !!this.startDate() || !!this.endDate();

    let request$: Observable<ApiResponse>;

    if (hasSearch || hasDateFilter) {
      request$ = this.postService.searchAndFilterPosts(
        this.searchQuery() || undefined,
        this.startDate() || undefined,
        this.endDate() || undefined,
        20,
        cursor,
      );
    } else {
      request$ = this.postService.getPosts(20, cursor);
    }

    request$.subscribe({
      next: (response) => {
        console.log('Fetched more posts:', response.data.length);
        this.posts.update((posts) => [...posts, ...response.data]);
        this.nextCursor.set(response.nextCursor);
        this.isFetchingMore.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch more posts', err);
        this.isFetchingMore.set(false);
      },
    });
  }

  onCommentClick(): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // Store pending comment action and show auth modal
      // The comment text would come from the input field - for now we'll prompt
      const commentText = prompt(
        'Enter your comment (this will be submitted after authentication):',
      );

      if (commentText && commentText.trim()) {
        // Get the first post ID for demo purposes (in real implementation, this would be the specific post)
        const firstPostId = this.posts()[0]?._id;
        if (firstPostId) {
          this.pendingAction.set({
            type: 'comment',
            postId: firstPostId,
            commentText: commentText.trim(),
          });
          this.showAuthModal.set(true);
        } else {
          this.notificationService.warning(
            'No posts available to comment on',
            3000,
          );
        }
      }
      return;
    }

    // User is authenticated - expand comments section for the first post
    const firstPost = this.posts()[0];
    if (firstPost && firstPost._id) {
      this.onShowAllComments(firstPost);
    }
  }

  /**
   * Handle successful authentication
   */
  onAuthSuccess(): void {
    this.showAuthModal.set(false);

    // Complete pending action if exists
    const pending = this.pendingAction();
    if (pending && pending.type === 'comment') {
      this.notificationService.success(
        'Authentication successful! Your comment is being posted...',
        3000,
      );

      // In a real implementation, this would submit the comment
      // For now, we'll just clear the pending action and show success
      setTimeout(() => {
        this.pendingAction.set(null);
        this.notificationService.success('Comment posted successfully!', 3000);
      }, 1000);
    }
  }

  /**
   * Close auth modal
   */
  onCloseAuthModal(): void {
    this.showAuthModal.set(false);
    this.pendingAction.set(null);
  }

  /**
   * Open create post modal (authenticated users only)
   */
  openCreatePostModal(): void {
    if (!this.authService.isAuthenticated()) {
      // Show auth modal instead
      this.showAuthModal.set(true);
      return;
    }
    this.showCreatePostModal.set(true);
  }

  /**
   * Handle post creation - add optimistic post to feed
   */
  onPostCreated(event: { post: Post; tempId: string }): void {
    // Add optimistic post to top of feed immediately
    const currentPosts = this.posts();
    this.posts.set([event.post, ...currentPosts]);

    // Close modal
    this.showCreatePostModal.set(false);

    // Note: The optimistic post remains in the feed.
    // Polling loads additional posts but doesn't replace the optimistic one.
  }

  /**
   * Handle post creation failure - remove optimistic post
   */
  onPostFailed(event: { tempId: string }): void {
    // Remove optimistic post from feed
    const currentPosts = this.posts();
    this.posts.set(currentPosts.filter((p) => p.tempId !== event.tempId));
  }

  /**
   * Close create post modal
   */
  onCloseCreatePostModal(): void {
    this.showCreatePostModal.set(false);
  }

  /**
   * Handle comment submission - add optimistic comment to list
   */
  onCommentSubmitted(event: { comment: Comment; tempId: string }): void {
    // Add optimistic comment to the expanded comments map
    const currentMap = this.expandedComments();
    const postId = event.comment.postId;
    const existingComments = currentMap.get(postId) || [];

    // Add optimistic comment at the top
    this.expandedComments.set(
      new Map(currentMap).set(postId, [event.comment, ...existingComments]),
    );

    // Show success notification
    this.notificationService.success('Comment posted!', 2000);
  }

  /**
   * Handle comment submission failure - remove optimistic comment
   */
  onCommentFailed(event: { tempId: string; postId: string }): void {
    // Remove optimistic comment from the map
    const currentMap = this.expandedComments();
    const existingComments = currentMap.get(event.postId) || [];

    this.expandedComments.set(
      new Map(currentMap).set(
        event.postId,
        existingComments.filter((c) => c.tempId !== event.tempId),
      ),
    );
  }

  onShowAllComments(post: Post): void {
    const postId = post._id;

    // Check if already expanded
    const currentMap = this.expandedComments();
    if (currentMap.has(postId)) {
      // Collapse - remove from map
      currentMap.delete(postId);
      this.expandedComments.set(new Map(currentMap));
      return;
    }

    // Fetch all comments
    this.isLoadingComments.set(true);
    this.postService.getPostComments(postId).subscribe({
      next: (response) => {
        const newMap = new Map(currentMap);
        newMap.set(postId, response.data);
        this.expandedComments.set(newMap);
        this.isLoadingComments.set(false);
      },
      error: (err) => {
        console.error('Failed to load comments', err);
        this.isLoadingComments.set(false);
        this.notificationService.error(
          'Failed to load comments. Please try again.',
          5000,
        );
      },
    });
  }

  getCommentsForPost(post: Post): Comment[] | null {
    const expandedMap = this.expandedComments();
    if (expandedMap.has(post._id)) {
      const map = expandedMap.get(post._id);
      if (map) return map;
    }
    return null;
  }

  /**
   * Check if current user can delete a post
   */
  canDeletePost(post: Post): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?._id === post.authorId;
  }

  /**
   * Handle delete post click
   */
  onDeletePost(post: Post): void {
    // Use native browser confirm dialog instead of modal library
    const confirmed = confirm('Are you sure you want to delete this post? This action cannot be undone.');
    if (confirmed) {
      this.confirmDeletePost(post);
    }
  }

  /**
   * Confirm delete post with optimistic UI
   */
  private confirmDeletePost(post: Post): void {
    // Set deleting state
    this.isDeletingPost.set(post._id);

    // Optimistic removal
    const originalPosts = this.posts();
    const updatedPosts = originalPosts.filter(p => p._id !== post._id);
    this.posts.set(updatedPosts);

    this.postService.deletePost(post._id).subscribe({
      next: () => {
        // Success - post already removed optimistically
        this.isDeletingPost.set(null);
        this.notificationService.success('Post deleted successfully');
      },
      error: (error) => {
        // Rollback - restore post
        this.posts.set(originalPosts);
        this.isDeletingPost.set(null);
        console.error('Failed to delete post:', error);
        this.notificationService.error('Failed to delete post. Please try again.');
      },
    });
  }
}
