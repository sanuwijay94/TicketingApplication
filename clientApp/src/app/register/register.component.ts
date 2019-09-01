import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import {Router} from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  registerUserData = {};
    validateMessage ={
        error:''
    };

  constructor(private _auth: AuthService,
              private _router: Router) { }

  ngOnInit() {

  }

  registerUser() {
      this._auth.registerUser(this.registerUserData)
          .subscribe(
              res => {
                  console.log(res);
                  if(res.message == "Created Successfully"){
                      this._router.navigate(['/login']);
                  }
                  this.validateMessage.error = res[0].message;
              },
              err => {
                  console.log(err);
                  if(err.status==304){
                      this.validateMessage.error = "Username already exist"
                  }
              }
          )
  }


}
