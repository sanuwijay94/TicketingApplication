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

  constructor(private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {
      this._auth.myTickets()
          .subscribe(
              res => this.myTickets =res,
              err => {
                  if (err instanceof HttpErrorResponse) {
                      if (err.status === 401 || err.status === 403 ) {
                          this. _router.navigate(['/login']);
                      }
                  }
              }
          );
  }

}
