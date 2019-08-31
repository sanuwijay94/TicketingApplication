import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Router} from "@angular/router";

@Injectable()
export class AuthService {

    private _loginUrl = 'http://127.0.0.1:3000/login';
    private _registerUrl = 'http://127.0.0.1:3000/user/create';
    private _creatTicketUrl = 'http://127.0.0.1:3000/ticket/create';
    private _ticketsUrl = 'http://127.0.0.1:3000/ticket/';
    private _usersUrl = 'http://127.0.0.1:3000/user/';
    private _myTicketsUrl;
    private userId: String;
    constructor(private http: HttpClient,
                private _router: Router) {
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

    createTicket(ticket) {
        return this.http.post<any>(this._creatTicketUrl, ticket);
    }

    allTickets() {
        return this.http.get<any>(this._ticketsUrl);
    }

    allUsers() {
        return this.http.get<any>(this._usersUrl);
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

    logoutUser(){
        localStorage.removeItem('token');
        this._router.navigate(['/login']);
    }

    getToken() {
        return localStorage.getItem('token');
    }
}
