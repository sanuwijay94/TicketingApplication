import {Injectable, Injector} from '@angular/core';
import {HttpEvent, HttpHandler, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {AuthService} from './auth.service';
import {Observable} from 'rxjs';

@Injectable()
export class TokenInterceptorService implements HttpInterceptor {

    constructor(private auth: AuthService) {
    }

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Read the token per request; it changes on login/logout after this service is created.
        const token = this.auth.getToken();
        req = req.clone({
            setHeaders: {
                'x-access-token': token === null ? '' : token
            }
        });
        return next.handle(req);
    }
}
