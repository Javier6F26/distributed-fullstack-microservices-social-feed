import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { RegistrationFormComponent } from './components/registration-form/registration-form.component';
import { LoginFormComponent } from './components/login-form/login-form.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModule,
    AuthModalComponent,
    RegistrationFormComponent,
    LoginFormComponent,
  ],
  exports: [
    AuthModalComponent,
    RegistrationFormComponent,
    LoginFormComponent,
  ],
})
export class AuthModule {}
