import { Component, OnInit } from '@angular/core';
import {AuthService} from "../auth.service";
import {HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.css']
})
export class TicketsComponent implements OnInit {

  tickets = [];
  withClosedTickets = [];
  users = [];
  createdTicket = {ticket_state: 'Open'};
  loggedInUser ={};
  states = [];
  constructor(private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this.states = ['Open', 'Progressing', 'Done', 'Closed'];
      this.loggedInUser =  localStorage.getItem('auth-user').substring(42,47);
      console.log(this.loggedInUser);
      this._auth.allTickets()
          .subscribe(
              res => {
                  if(this.loggedInUser=="Agent"){
                      this.states = ['Open', 'Progressing', 'Done'];
                      this.withClosedTickets =res;
                      for(let i=0;i<this.withClosedTickets.length ;i++){
                          if(this.withClosedTickets[i].ticket_state != "Closed"){
                              this.tickets.push(this.withClosedTickets[i]);
                          }
                      }
                  }
                  else {
                      this.tickets = res;
                  }

                  console.log(this.tickets);
                  this._auth.allUsers()
                      .subscribe(
                          res => this.users =res,
                          err => {
                              if (err instanceof HttpErrorResponse) {
                                  if (err.status === 401 || err.status === 403 ) {
                                      console.log(err);
                                  }
                              }
                          }
                      );
              },
              err => {
                  if (err instanceof HttpErrorResponse) {
                      if (err.status === 401 || err.status === 403 ) {
                          this. _router.navigate(['/login']);
                      }
                  }
              }
          );
  }

  viewTicket(id){
      console.log(id);
      this._router.navigate(['/ticketView'],{ queryParams: { selectedTicket: id } } );
  }

  createTicket(createdTicket){
      createdTicket.submitter =  localStorage.getItem('auth-user').substring(8,32);
      console.log(createdTicket);
      this._auth.createTicket(createdTicket)
          .subscribe(
              res => {
                  console.log(res);
                  this.ngOnInit();
              },
              err => console.log(err)
          )
  }


}
