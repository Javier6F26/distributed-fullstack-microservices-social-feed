import { Component } from '@angular/core';
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
  showAuthModal = false;

  onLoginClicked(): void {
    console.log('[AppComponent] onLoginClicked called');
    console.log('[AppComponent] Current showAuthModal:', this.showAuthModal);
    this.showAuthModal = true;
    console.log('[AppComponent] showAuthModal set to:', this.showAuthModal);
  }

  onCloseAuthModal(): void {
    console.log('[AppComponent] onCloseAuthModal called');
    this.showAuthModal = false;
  }

  onAuthSuccess(): void {
    console.log('[AppComponent] onAuthSuccess called');
    this.showAuthModal = false;
  }
}
