import { Component, OnInit } from '@angular/core';
import {AuthService} from "../auth.service";
import {HttpErrorResponse} from '@angular/common/http';
import {Router} from '@angular/router';

@Component({
  selector: 'app-my-tickets',
  templateUrl: './my-tickets.component.html',
  styleUrls: ['./my-tickets.component.css']
})
export class MyTicketsComponent implements OnInit {
  myTickets = [];
  loggedInUser ={};
  withClosedTickets = [];

  constructor(private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this.loggedInUser =  localStorage.getItem('auth-user').substring(42,47);
      console.log(this.loggedInUser);
      this._auth.myTickets()
          .subscribe(
              res => {
                  if(this.loggedInUser=="Agent"){
                      this.withClosedTickets =res;
                      for(let i=0;i<this.withClosedTickets.length ;i++){
                          if(this.withClosedTickets[i].ticket_state != "Closed"){
                              this.myTickets.push(this.withClosedTickets[i]);
                          }
                      }
                  }
                  else {
                      this.myTickets = res;
                  }
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

}
