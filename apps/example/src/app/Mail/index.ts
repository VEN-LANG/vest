/*
|--------------------------------------------------------------------------
| App Mail Index
|--------------------------------------------------------------------------
|
| Export all application mailables from this directory.
|
*/

export { WelcomeEmail } from "./WelcomeEmail";
export { PasswordResetEmail } from "./PasswordResetEmail";

// Re-export base classes for convenience
export { Mailable, TextMailable, HtmlMailable } from "@vest/mail";
