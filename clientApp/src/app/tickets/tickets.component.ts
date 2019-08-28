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
  constructor(private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this._auth.allTickets()
          .subscribe(
              res => this.tickets =res,
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
