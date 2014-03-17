# Chatlogs Viewer

A simple [AngularJS](http://angularjs.org/) app for viewing and searching chatlogs based on [angular-seed](https://github.com/angular/angular-seed).


## Installation

Clone the repository.
The chat logs must be stored in MongoDB.
Each log must contain the following fields:

    {
        "nick" : "user or nickname",
        "message" : "Chat log message.",
        "timestamp" : ISODate("2014-01-01T00:00:00.000Z")
    }

Install node.js, and run `npm install` to install the required node.js modules.

Configure the MongoDB connection details by editting `dbname` and `mdbServer` in `server/search.js`.
The list of available chatrooms should be configured by editting `rooms` in `app/js/controllers.js`.
Each room must correspond to a MongoDB collection.


## Running the app

Start the server by running `node server/webandapi-server.js [port]` (default port: 8000).
The application will be available at `http://localhost:<port>/app/index.html`, and the API under `http://localhost:<port>/api/`.


## API

In additional to the listed parameters all methods accept the following parameters:

- pretty `0|1`: Optional, if `1` return formatted JSON, default `0`
- callback `function-name`: Optional support for JSONP, if provided wrap the returned JSON object in a function with the given name

All methods return a JSON object.
If an error occurs the returned JSON will include an `error` field, for example:

    {"error":"Invalid room"}

### /api/page

Fetch a consecutive set of messages.
Parameters:

- room `string`: The chatroom name
- dt `ISODate`: An ISO 8601 timestamp in the form `YYYY-MM-DDThh:mm:ss.sssZ`
- nextn `integer`: The number of following messages to fetch, with timestamp greater or equal to `dt`
- prevn `integer`: The number of previous messages to fetch, with timestamp less than `dt`

Return:

- `prevlogs`: If `prevn > 0` a list of preceding chat messages ordered by timestamp
- `nextlogs`: If `nextn > 0` a list of following chat messages ordered by timestamp

Example:

    http://localhost:<port>/api/page?room=chatroom-name&dt=2014-01-01T13:25:00.000Z&nextn=10&prevn=10&pretty=1

    {
       "prevlogs": [
          {
             "nick": "Alice",
             "message": "Hello",
             "timestamp": "2014-01-01T13:23:05.142Z"
          },
          ....
       ],
       "nextlogs": [
          {
             "nick": "Bob",
             "message": "Goodbye",
             "timestamp": "2014-01-01T13:27:11.912Z"
          },
          ....
       ]
    }

### /api/search

Search messages within a datetime range using a regular expression.
Parameters:

- room `string`: The chatroom name
- startdt `ISODate`: An ISO 8601 timestamp in the form `YYYY-MM-DDThh:mm:ss.sssZ`
- enddt `ISODate`: An ISO 8601 timestamp in the form `YYYY-MM-DDThh:mm:ss.sssZ`
- regexp `re`: A regular expression
- regexpopts `string`: A set of regular expression flags, default `i` (case insensitive matching)

Return:

- `chatlogs`: A list of matching chat messages ordered by timestamp
- `lastdt`: The timestamp of the most recent log message from the room

Example:

    http://localhost:<port>/api/search?room=chatroom-name&startdt=2014-01-01T00:00:00.000Z&enddt=2014-01-02T00:00:00.000Z&regexp=hello&regexpopts=i&pretty=1

    {
       "chatlogs": [
          {
             "nick": "Alice",
             "message": "Hello",
             "timestamp": "2014-01-01T13:23:05.142Z"
          },
          ....
       ],
       "lastdt": "2014-01-31T11:26:58.071Z"
    }

