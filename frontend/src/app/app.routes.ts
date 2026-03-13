import { Route } from '@angular/router';
import { AccountSettingsComponent } from './features/settings/account-settings/account-settings.component';
import { authGuard } from './core/guards/auth.guard';
import { pendingWritesGuard } from './guards/pending-writes.guard';

export const appRoutes: Route[] = [
  {
    path: 'settings/account',
    component: AccountSettingsComponent,
    canActivate: [authGuard],
    canDeactivate: [pendingWritesGuard],
  },
];
