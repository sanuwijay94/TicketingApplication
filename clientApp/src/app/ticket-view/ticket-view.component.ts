import { Component, OnInit } from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {AuthService} from "../auth.service";
import {$} from "protractor";

@Component({
  selector: 'app-ticket-view',
  templateUrl: './ticket-view.component.html',
  styleUrls: ['./ticket-view.component.css']
})
export class TicketViewComponent implements OnInit {
    ticket ={};
    prevTicket = {};
  constructor(private route: ActivatedRoute,
              private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this.route
          .queryParams
          .subscribe(params => {
              this._auth.ticketView(params['selectedTicket'])
                  .subscribe(
                      res => {
                          console.log(params['selectedTicket']);
                          //this.ticket = this.prevTicket;
                          this.ticket = res
                      },
                      err => console.log(err)
                  );
          });
  }


  updateTicket(ticket){
      ticket.assignee = ticket.assignee._id;
      ticket.submitter = ticket.submitter._id;
      console.log(ticket);
      this._auth.updateTicket(ticket)
          .subscribe(
                  res => {
                      console.log(res);
                      this.ngOnInit();
                  },
                  err => console.log(err)
              );

  }


  deleteTicket(id){
      console.log(id);
      console.log(localStorage.getItem('token'));
      this._auth.deleteTicket(id)
          .subscribe(
              res => {
                  console.log(res);
                  this._router.navigate(['/tickets']);
              },
              err => console.log(err)
          );
  }

}
