import { Route } from '@angular/router';
import { AccountSettingsComponent } from './features/settings/account-settings/account-settings.component';
import { authGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'settings/account',
    component: AccountSettingsComponent,
    canActivate: [authGuard],
  },
];
