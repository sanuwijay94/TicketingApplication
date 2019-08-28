import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import {LoginComponent} from './login/login.component';
import {RegisterComponent} from './register/register.component';
import {AuthGuard} from './auth.guard';
import {TicketsComponent} from "./tickets/tickets.component";
import {MyTicketsComponent} from "./my-tickets/my-tickets.component";
import {TicketViewComponent} from "./ticket-view/ticket-view.component";

const routes: Routes = [
    {
        path: '',
        redirectTo: '/login',
        pathMatch: 'full'
    },
    {
        path: 'tickets',
        component: TicketsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'myTickets',
        component: MyTicketsComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'ticketView',
        component: TicketViewComponent,
        canActivate: [AuthGuard]
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'register',
        component: RegisterComponent
    }
];


@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
