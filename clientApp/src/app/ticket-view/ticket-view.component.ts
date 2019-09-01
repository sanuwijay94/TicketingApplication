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
    loggedInUser = {};
    states = [];
    validateMessage ={
        error:''
    };

  constructor(private route: ActivatedRoute,
              private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this.states = ['Open', 'Progressing', 'Done', 'Closed'];
      this.loggedInUser =  localStorage.getItem('auth-user').substring(42,47);
      this.route
          .queryParams
          .subscribe(params => {
              this._auth.ticketView(params['selectedTicket'])
                  .subscribe(
                      res => {
                          console.log(params['selectedTicket']);
                          this.ticket = res;
                          if(this.loggedInUser=="Agent"){
                              this.states = ['Open', 'Progressing', 'Done'];
                          }
                          console.log(params['selectedTicket']);
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
                      if(res.message == "Successfully Updated"){
                          this.validateMessage.error = res.message;
                          this.ngOnInit();
                      }
                      else{
                          this.validateMessage.error = res[0].message;
                      }
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
