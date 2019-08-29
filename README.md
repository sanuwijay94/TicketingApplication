# TicketingApplication


1. Technologies used
  1.	Express (Framework)
  2.	MongoDB(Database)
  3.	Angular 6 (Client Application)
  4.	Node.js(Server)
  5.	JSON Web Tokens (Authentication)

2. Configure the API
  The API can be configured through the default.json file in the config folder.

3. How to run and install
  Before running the API for the first time install the node modules and set up the database.

4. To install the node modules
  npm install

5. To set up the database and populate database with dummy data
  Set up MongoDB
  run the populateDB.js script in the TicketingApplication/server with the code below
    node populateDB mongodb://127.0.0.1:27017/ticketingApplication

6. To Start the Server
  npm start
  To stop the server ctrl+C

7. To Start the Client
  ng serve --watch
  To stop the client ctrl+C

8. How to use the routes for API
  The routes directory has route files for each Model. Add the route to the end of the base URL which is "http://localhost:3000" such as     "http://localhost:3000/project".
  The "POST /login" route will return a JSON Web Token which is needed to access the routes with the authentication middleware function.     Once the token is returned by that route, the token should be passed in the request with a header called "x-access-token".

