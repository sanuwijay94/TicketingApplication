import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';

@Injectable()
export class AuthService {

    private _loginUrl = 'http://127.0.0.1:3000/login';
    private _registerUrl = 'http://127.0.0.1:3000/user/create';
    private _ticketsUrl = 'http://127.0.0.1:3000/ticket/';
    private _ticketViewUrl = 'http://127.0.0.1:3000/ticket/';
    private _myTicketsUrl;
    private userId: String;
    constructor(private http: HttpClient) {
    }
    setUrl() {
        this.userId =  localStorage.getItem('auth-user').substring(8,32);
        return 'http://127.0.0.1:3000/user/'+this.userId+'/tickets';
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

    myTickets() {
        this._myTicketsUrl =this.setUrl()
        return this.http.get<any>(this._myTicketsUrl);
    }

    ticketView(id){
        return this.http.get<any>('http://127.0.0.1:3000/ticket/'+id);
    }

    updateTicket(ticket) {
        return this.http.patch<any>('http://127.0.0.1:3000/ticket/'+ticket._id+'/update',ticket);
    }

    deleteTicket(id){
        return this.http.delete<any>('http://127.0.0.1:3000/ticket/'+id+'/delete');
    }
    LoggedIn() {
        return !!localStorage.getItem('token');
    }

    getToken() {
        return localStorage.getItem('token');
    }
}
