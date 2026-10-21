import { Component } from '@angular/core';
import { NavigationEnd, NavigationError, Router } from '@angular/router';
import {AuthService} from './auth.service';

// Which top bar to draw. 'pending' is the state before the first navigation settles: it shows no
// items, so nothing that should be hidden is ever inserted on a first load.
type TopBarMode = 'pending' | 'login' | 'register' | 'other';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  title = 'app';

  // Only the screen is stored here, never sign-in state: the template asks
  // _authService.LoggedIn() each time it is evaluated, so it cannot go stale.
  public topBar: TopBarMode = 'pending';

  constructor(public _authService: AuthService, private _router: Router) {
    // Root component: lives as long as the app, so this subscription is never torn down.
    // The callback must stay trivial and must never throw: in rxjs 6.4 a throw unsubscribes it
    // for good and the bar would silently freeze. React only when a screen has settled:
    // NavigationStart and NavigationCancel are ignored, because the old screen is still showing.
    this._router.events.subscribe(event => {
      if (event instanceof NavigationEnd || event instanceof NavigationError) {
        this.topBar = this.settledTopBar();
      }
    });
  }

  // Reads the `topBar` route data of the deepest route in the router state.
  private settledTopBar(): TopBarMode {
    let route = this._router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    // Route `data` is `any` in Angular's typing: take it as `unknown` and accept only the two
    // exact strings, so a missing key or a misspelling falls back to the normal bar.
    const topBar: unknown = route.data.topBar;
    if (topBar === 'login') {
      return 'login';
    }
    if (topBar === 'register') {
      return 'register';
    }
    return 'other';
  }
}
