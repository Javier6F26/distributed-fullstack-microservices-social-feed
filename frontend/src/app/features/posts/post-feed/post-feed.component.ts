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
import { PendingWritesNotifyService } from '../../../services/pending-writes-notify.service';
import { interval, Observable, Subscription } from 'rxjs';
import { SearchBarComponent } from '../components/search-bar/search-bar.component';
import { DateRangeFilterComponent } from '../components/date-range-filter/date-range-filter.component';
import { AuthModalComponent } from '../../auth/components/auth-modal/auth-modal.component';
import { CreatePostModalComponent } from '../create-post-modal/create-post-modal.component';
import { EditPostModalComponent } from '../edit-post-modal/edit-post-modal.component';
import { CommentInputComponent } from '../../comments/comment-input/comment-input.component';
import { CommentCardComponent } from '../../comments/comment-card/comment-card.component';

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
    EditPostModalComponent,
    CommentInputComponent,
    CommentCardComponent,
  ],
  templateUrl: './post-feed.component.html',
  styleUrls: [],
})
export class PostFeedComponent implements OnInit, OnDestroy {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  @ViewChild(SearchBarComponent) searchBar!: SearchBarComponent;
  public authService = inject(AuthService);
  // Max posts to load (prevents performance issues with large datasets)
  private readonly MAX_POSTS = 100;
  // State signals
  posts = signal<Post[]>([]);
  isLoading = signal(false);
  isFetchingMore = signal(false);
  nextCursor = signal<string | null | undefined>(undefined);
  error = signal<string | null>(null);
  hasNewPosts = signal(false);
  // Relative time cache for posts (prevents ExpressionChangedAfterItHasBeenCheckedError)
  postRelativeTimes = signal<Record<string, string>>({});
  // Auth modal state
  showAuthModal = signal(false);
  pendingAction = signal<{
    type: 'comment';
    postId: string;
    commentText: string;
  } | null>(null);
  // Create post modal state
  showCreatePostModal = signal(false);
  // Edit post modal state
  showEditPostModal = signal(false);
  postToEdit = signal<Post | null>(null);
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
  failedWrites = signal<Set<string>>(new Set()); // Track failed tempIds/postIds for retry state
  private commentTempIds = new Set<string>(); // Track which tempIds are comments (vs posts)
  private postTempIds = new Set<string>(); // Track which tempIds are posts (vs comments)
  // Inject services
  private postService = inject(PostService);
  private notificationService = inject(NotificationService);
  private pendingWritesService = inject(PendingWritesNotifyService);
  private pollingSubscription?: Subscription;
  private relativeTimeSubscription?: Subscription;
  private errorsSubscription?: Subscription;
  private confirmedSubscription?: Subscription;

  ngOnInit(): void {
    this.loadPosts();
    this.startIntelligentPolling();
    // Subscribe to pending write errors
    this.errorsSubscription = this.pendingWritesService.errors$.subscribe((errors) => {
      this.failedWrites.set(new Set(errors.map(e => e.tempId)));
    });
    // Subscribe to confirmations to clear pending flag and show success toast
    this.confirmedSubscription = this.pendingWritesService.confirmed$.subscribe(({ tempId, postId }) => {
      this.clearPendingFlag(tempId, postId);
      // Show success toast only when write is confirmed (no error)
      const hasError = this.pendingWritesService.hasError(tempId);
      if (!hasError) {
        // Determine if this was a comment or a post
        const isComment = this.commentTempIds.has(tempId);
        const isPost = this.postTempIds.has(tempId);
        if (isComment) {
          this.notificationService.success('Comment posted successfully', 2000);
          this.commentTempIds.delete(tempId); // Clean up
        } else if (isPost) {
          this.notificationService.success('Post published successfully', 2000);
          this.postTempIds.delete(tempId); // Clean up
        }
      }
    });
    // Update relative times every minute
    this.relativeTimeSubscription = interval(60000).subscribe(() => {
      this.updatePostRelativeTimes();
    });
    // Initial update
    this.updatePostRelativeTimes();
  }

  ngOnDestroy(): void {
    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe();
    }
    if (this.relativeTimeSubscription) {
      this.relativeTimeSubscription.unsubscribe();
    }
    if (this.errorsSubscription) {
      this.errorsSubscription.unsubscribe();
    }
    if (this.confirmedSubscription) {
      this.confirmedSubscription.unsubscribe();
    }
  }

  /**
   * Clear pending flag on a post or comment when confirmed
   * Also replaces tempId-based _id with real postId when available
   */
  private clearPendingFlag(tempId: string, postId?: string): void {
    if (!postId) {
      // No real postId provided, just clear pending flag
      this.posts.update(posts =>
        posts.map(post =>
          post.tempId === tempId || post._id === tempId
            ? { ...post, pending: false }
            : post
        )
      );

      // Clear pending flag on comments in expandedComments map
      this.expandedComments.update(commentMap => {
        const updatedMap = new Map(commentMap);
        updatedMap.forEach((comments, mapPostId) => {
          updatedMap.set(
            mapPostId,
            comments.map(comment =>
              comment.tempId === tempId || comment._id === tempId
                ? { ...comment, pending: false }
                : comment
            )
          );
        });
        return updatedMap;
      });
      return;
    }

    // Replace tempId with real postId for both posts and comments
    this.posts.update(posts =>
      posts.map(post =>
        post.tempId === tempId
          ? { ...post, pending: false, _id: postId } // Replace tempId-based post
          : post
      )
    );

    // Update comments: clear pending and update postId references
    this.expandedComments.update(commentMap => {
      const updatedMap = new Map(commentMap);

      // If the postId being confirmed is a POST (not a comment), update all comments referencing it
      if (this.postTempIds.has(tempId)) {
        // This is a post confirmation - update all comments that reference this post's tempId
        updatedMap.forEach((comments, mapPostId) => {
          if (mapPostId === tempId) {
            // Update the map key from tempId to real postId
            updatedMap.delete(tempId);
            updatedMap.set(postId, comments.map(comment => ({
              ...comment,
              postId: postId, // Update comment's postId reference
              pending: false
            })));
          }
        });
      } else {
        // This is a comment confirmation - just clear pending flag
        updatedMap.forEach((comments, mapPostId) => {
          updatedMap.set(
            mapPostId,
            comments.map(comment =>
              comment.tempId === tempId || comment._id === tempId
                ? { ...comment, pending: false, _id: tempId } // Keep comment _id as tempId if no real commentId
                : comment
            )
          );
        });
      }
      return updatedMap;
    });
  }

  /**
   * Update relative times for all posts
   */
  private updatePostRelativeTimes(): void {
    const currentPosts = this.posts();
    const times: Record<string, string> = {};
    currentPosts.forEach(post => {
      times[post._id] = this.getRelativeTime(post.createdAt);
    });
    this.postRelativeTimes.set(times);
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
        if (reset) {
          this.posts.set(response.data);
          this.filteredTotal.set(response.data.length);
        } else {
          this.posts.update((posts) => [...posts, ...response.data]);
        }
        this.nextCursor.set(response.nextCursor);
        this.isLoading.set(false);

        // Update relative times after posts are loaded
        this.updatePostRelativeTimes();

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
    // Don't load more if we've reached the max
    if (this.posts().length >= this.MAX_POSTS) {
      return;
    }

    if (this.isFetchingMore() || this.nextCursor() === null || !this.viewport) {
      return;
    }

    const end = this.viewport.getRenderedRange().end;
    const total = this.viewport.getDataLength();

    // Trigger when user scrolls near the end
    if (end > 0 && end >= total - 3) {
      this.fetchMore();
    }
  }

  fetchMore() {
    // Don't load more if we've reached the max
    if (this.posts().length >= this.MAX_POSTS) {
      return;
    }

    const cursor = this.nextCursor();
    if (!cursor) {
      return;
    }

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

  onCommentClick(postId?: string): void {
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      // Store pending comment action and show auth modal
      if (postId) {
        this.pendingAction.set({
          type: 'comment',
          postId,
          commentText: '',
        });
      }
      this.showAuthModal.set(true);
      return;
    }

    // User is authenticated - expand comments section for the specific post
    const post = this.posts().find(p => p._id === postId);
    if (post) {
      this.onShowAllComments(post);
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
        'Authentication successful! You can now add your comment.',
        3000,
      );

      // Expand comments for the post so user can comment
      const post = this.posts().find(p => p._id === pending.postId);
      if (post) {
        this.onShowAllComments(post);
      }

      // Clear pending action
      this.pendingAction.set(null);
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
   * Handle post creation - add optimistic post to feed or replace with real data
   */
  onPostCreated(event: { post: Post; tempId: string; isUpdate?: boolean }): void {
    // Track this tempId as a post (not a comment)
    this.postTempIds.add(event.tempId);

    const currentPosts = this.posts();

    if (event.isUpdate) {
      // Replace optimistic post with real post data from API
      // Preserve tempId for clearPendingFlag to work correctly
      const updatedPosts = currentPosts.map(post =>
        post.tempId === event.tempId
          ? { ...event.post, pending: true, tempId: event.tempId } // Keep pending: true until confirmed, preserve tempId
          : post
      );
      this.posts.set(updatedPosts);
    } else {
      // Keep pending: true until confirmed by backend
      event.post.pending = true;

      // Add optimistic post to top of feed immediately
      this.posts.set([event.post, ...currentPosts]);

      // Scroll to top to show the new post
      setTimeout(() => {
        if (this.viewport) {
          this.viewport.scrollToIndex(0, 'smooth');
        }
      }, 100);
    }

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
   * Handle comment submission - add optimistic comment to list or replace with real data
   */
  onCommentSubmitted(event: { comment: Comment; tempId: string; isUpdate?: boolean }): void {
    const postId = event.comment.postId;

    // Track this tempId as a comment (not a post)
    this.commentTempIds.add(event.tempId);

    // Find the post to get existing recentComments
    const post = this.posts().find(p => p._id === postId);
    const existingRecentComments = post?.recentComments || [];

    // Check if comments are already expanded for this post
    const currentMap = this.expandedComments();
    const existingExpandedComments = currentMap.get(postId) || [];

    // Use expanded comments if they exist, otherwise use recentComments from the post
    const baseComments = existingExpandedComments.length > 0
      ? existingExpandedComments
      : existingRecentComments;

    if (event.isUpdate) {
      // Replace optimistic comment with real comment data from API
      // Preserve tempId for clearPendingFlag to work correctly
      const updatedComments = baseComments.map(comment =>
        comment.tempId === event.tempId
          ? { ...event.comment, pending: true, tempId: event.tempId } // Keep pending: true until confirmed, preserve tempId
          : comment
      );
      this.expandedComments.set(
        new Map(currentMap).set(postId, updatedComments),
      );
    } else {
      // Add optimistic comment at the top
      this.expandedComments.set(
        new Map(currentMap).set(postId, [event.comment, ...baseComments]),
      );
    }

    // No toast here - will show when write is confirmed via polling
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

  /**
   * Handle comment deleted from comment-card
   */
  onCommentDeleted(commentId: string, post: Post): void {
    const currentMap = this.expandedComments();
    const postId = post._id;
    const existingComments = currentMap.get(postId) || [];

    // Remove comment optimistically
    this.expandedComments.set(
      new Map(currentMap).set(
        postId,
        existingComments.filter((c) => c._id !== commentId),
      ),
    );
  }

  /**
   * Handle comment delete failure - restore the comment
   */
  onCommentDeleteFailed(event: { commentId: string; comment: Comment }): void {
    const currentMap = this.expandedComments();
    const comment = event.comment;
    const postId = comment.postId;
    const existingComments = currentMap.get(postId) || [];

    // Restore the comment
    this.expandedComments.set(
      new Map(currentMap).set(postId, [...existingComments, comment]),
    );
  }

  /**
   * Handle comment updated from comment-card
   */
  onCommentUpdated(event: { commentId: string; body: string }): void {
    // The comment-card handles optimistic update internally,
    // we just need to refresh the post's recentComments via RabbitMQ event
    // This will be handled automatically when the backend emits the event
  }

  /**
   * Handle comment update failure - restore original comment
   */
  onCommentUpdateFailed(event: { commentId: string; originalComment: Comment }): void {
    const currentMap = this.expandedComments();
    const comment = event.originalComment;
    const postId = comment.postId;
    const existingComments = currentMap.get(postId) || [];

    // Find and replace the comment with the original
    const updatedComments = existingComments.map(c => 
      c._id === comment._id ? comment : c
    );

    this.expandedComments.set(
      new Map(currentMap).set(postId, updatedComments),
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
   * Check if a post has been edited
   */
  isEdited(post: Post): boolean {
    if (!post.updatedAt || !post.createdAt) {
      return false;
    }
    return new Date(post.updatedAt) > new Date(post.createdAt);
  }

  /**
   * Get last 3 comments for display (most recent first)
   */
  getLastThreeComments(comments: Comment[] | undefined): Comment[] {
    if (!comments || comments.length === 0) {
      return [];
    }
    // Comments are already in newest-first order, take first 3
    return comments.slice(0, 3);
  }

  /**
   * Get relative time string from ISO date
   */
  getRelativeTime(dateString: string | undefined): string {
    if (!dateString) {
      return '';
    }
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Check if current user can delete a post
   */
  canDeletePost(post: Post): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser?._id === post.authorId;
  }

  /**
   * Check if current user can edit a post
   */
  canEditPost(post: Post): boolean {
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
   * Handle edit post click
   */
  onEditPost(post: Post): void {
    if (!this.authService.isAuthenticated()) {
      this.notificationService.warning('Please login to edit posts', 3000);
      return;
    }
    this.postToEdit.set(post);
    this.showEditPostModal.set(true);
  }

  /**
   * Handle post update - update the post in the list
   */
  onPostUpdated(event: { post: Post; postId: string }): void {
    // Update the post in the list with the updated data
    const currentPosts = this.posts();
    const updatedPosts = currentPosts.map(p => 
      p._id === event.postId ? event.post : p
    );
    this.posts.set(updatedPosts);
    
    // Close modal
    this.showEditPostModal.set(false);
    this.postToEdit.set(null);
  }

  /**
   * Handle post update failure - show error (no rollback needed as content wasn't changed optimistically)
   */
  onPostUpdateFailed(event: { postId: string }): void {
    // Close modal
    this.showEditPostModal.set(false);
    this.postToEdit.set(null);
    // Error notification already shown by the modal component
  }

  /**
   * Close edit post modal
   */
  onCloseEditPostModal(): void {
    this.showEditPostModal.set(false);
    this.postToEdit.set(null);
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

  /**
   * Check if a post has a failed write (shows retry state)
   */
  hasFailedWrite(post: Post): boolean {
    const tempId = post.tempId || post._id;
    return this.failedWrites().has(tempId);
  }

  /**
   * Get error message for a failed post
   */
  getFailedWriteError(post: Post): string | undefined {
    const tempId = post.tempId || post._id;
    return this.pendingWritesService.getError(tempId);
  }

  /**
   * Handle retry for a failed post
   */
  onRetryPost(post: Post): void {
    const tempId = post.tempId || post._id;
    
    // Clear the error state
    this.pendingWritesService.removeError(tempId);
    this.failedWrites.update(set => {
      const newSet = new Set(set);
      newSet.delete(tempId);
      return newSet;
    });

    // Re-open edit modal for retry (for edits) or create modal (for creates)
    if (post.tempId) {
      // This was a create operation - re-submit create
      this.openCreatePostModal();
      // Note: In a full implementation, you'd pre-fill the modal with the post data
      this.notificationService.info('Please re-submit your post', 3000);
    } else {
      // This was an update operation - re-open edit modal
      this.postToEdit.set(post);
      this.showEditPostModal.set(true);
    }
  }
}
