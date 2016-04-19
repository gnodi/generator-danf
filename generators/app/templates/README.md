<%= repository.name %>
======================

<%= app.description %>

Use as a danf module
--------------------

Install as a new dependency and save it in the list of your dependencies of your `package.json`:
```sh
$ npm install <%= repository.name %> --save
```

Use as an application
---------------------

Start the server and build the client files with the command:
```sh
$ node danf serve
```

You should have a welcome message at `http://localhost:3080`.

> Use `node danf serve --env prod` to start the server in prod environment.

> You do not have to restart the server manually each time you modify a file: a daemon is watching at the modifications and restarts the server or rebuilds the specific client files if needed.

Execute tests
-------------

```sh
$ make test
```