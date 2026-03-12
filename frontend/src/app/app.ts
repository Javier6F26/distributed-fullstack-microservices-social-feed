import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PostFeedComponent } from './features/posts/post-feed/post-feed.component';
import { NotificationContainerComponent } from './components/notification-container/notification-container.component';
import { NavbarComponent } from './components/navbar/navbar.component';
import { AuthModalComponent } from './features/auth/components/auth-modal/auth-modal.component';

@Component({
  standalone: true,
  imports: [PostFeedComponent, RouterModule, NotificationContainerComponent, NavbarComponent, AuthModalComponent],
  selector: 'app-root',
  styleUrls: ['./app.scss'],
  templateUrl: './app.html',
})
export class App {
  showAuthModal = signal(false);

  onLoginClicked(): void {
    this.showAuthModal.set(true);
  }

  onCloseAuthModal(): void {
    this.showAuthModal.set(false);
  }

  onAuthSuccess(): void {
    this.showAuthModal.set(false);
  }
}
