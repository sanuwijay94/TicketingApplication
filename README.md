# TicketingApplication


1. Technologies used
  Express (Framework),
  MongoDB(Database),
  Angular 6 (Client Application),
  Node.js(Server) &
  JSON Web Tokens (Authentication)

2. The API can be configured through the default.json file in the config folder.

3. Before running the API for the first time install the node modules and set up the database.

4. To install the node modules
  			
			npm install

5. Set up MongoDB & Run the populateDB.js script in the TicketingApplication/server with the code below
    		
			node populateDB mongodb://127.0.0.1:27017/ticketingApplication

6. To Start the Server
  			
			npm start

7. To Start the Client Application
  			
			ng serve --watch

8. The routes directory has route files for each Model. Add the route to the end of the base URL which is "http://localhost:3000" such as     "http://localhost:3000/project".
   The "POST /login" route will return a JSON Web Token which is needed to access the routes with the authentication middleware function.     Once the token is returned by that route, the token should be passed in the request with a header called "x-access-token".

