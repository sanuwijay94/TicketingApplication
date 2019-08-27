import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class AuthService {

    private _loginUrl = 'http://127.0.0.1:3000/login';
    private _registerUrl = 'http://127.0.0.1:3000/user/create';
    private _ticketsUrl = 'http://127.0.0.1:3000/ticket/';
    private userId: String;
    constructor(private http: HttpClient) {
    }
    setUrl() {
        this.userId =  localStorage.getItem('auth-user').substring(8,32);
        return 'http://127.0.0.1:3000/employee/' + this.userId + '/projects';
    }

    loginUser(user) {
        return this.http.post<any>(this._loginUrl, user);
    }

    registerUser(user) {
        return this.http.post<any>(this._registerUrl, user);
    }

    allTickets() {
        return this.http.get<any>(this._ticketsUrl);
    }

    LoggedIn() {
        return !!localStorage.getItem('token');
    }

    getToken() {
        return localStorage.getItem('token');
    }
}
