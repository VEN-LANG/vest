import { Event } from "@vest-ts/events";

/*
|--------------------------------------------------------------------------
| User Registered Event
|--------------------------------------------------------------------------
|
| This event is fired when a new user registers.
|
*/

export class UserRegistered extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public name: string,
  ) {
    super();
  }

  eventName(): string {
    return "user.registered";
  }
}

/*
|--------------------------------------------------------------------------
| User Logged In Event
|--------------------------------------------------------------------------
*/

export class UserLoggedIn extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public ipAddress?: string,
  ) {
    super();
  }

  eventName(): string {
    return "user.logged_in";
  }
}

/*
|--------------------------------------------------------------------------
| User Logged Out Event
|--------------------------------------------------------------------------
*/

export class UserLoggedOut extends Event {
  constructor(public userId: string | number) {
    super();
  }

  eventName(): string {
    return "user.logged_out";
  }
}

/*
|--------------------------------------------------------------------------
| Password Reset Requested Event
|--------------------------------------------------------------------------
*/

export class PasswordResetRequested extends Event {
  constructor(
    public userId: string | number,
    public email: string,
    public token: string,
  ) {
    super();
  }

  eventName(): string {
    return "password.reset_requested";
  }
}

/*
|--------------------------------------------------------------------------
| Password Changed Event
|--------------------------------------------------------------------------
*/

export class PasswordChanged extends Event {
  constructor(public userId: string | number) {
    super();
  }

  eventName(): string {
    return "password.changed";
  }
}
