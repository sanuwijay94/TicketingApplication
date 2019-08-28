import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {AuthService} from "../auth.service";

@Component({
  selector: 'app-ticket-view',
  templateUrl: './ticket-view.component.html',
  styleUrls: ['./ticket-view.component.css']
})
export class TicketViewComponent implements OnInit {
  ticket ={};
  constructor(private route: ActivatedRoute,
              private _auth: AuthService) { }

  ngOnInit() {
      this.route
          .queryParams
          .subscribe(params => {
              this._auth.ticketView(params['selectedTicket'])
                  .subscribe(
                      res => {
                          console.log(params['selectedTicket']);
                          this.ticket = res
                      },
                      err => console.log(err)
                  );
          });
  }


  /*updateTicket(ticket){
      this._auth.updateTicket(ticket);
  }*/


  deleteTicket(id){
      this._auth.deleteTicket(id)
          .subscribe(
              res => {
                  console.log(res);
              },
              err => console.log(err)
          );
  }

}
