# Bug Analysis Website Group 13

Pull this repository and run the following commands to set it up in development environment

## Frontend
```
cd frontend
npm install
npm run dev
```

## Backend
```
cd backend
npm install
node server.js
```

Currently the website fetches all issues from Github Issues on every load of the frontend through Github API.
This does not work for long as there is a upper limit for Github API use.
The database must be implemented next to prevent calling the Github API on every load.
